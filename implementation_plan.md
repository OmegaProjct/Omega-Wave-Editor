# Implementierungsplan: Lagfreie Waveform über Peak-Pyramide

Stand: 2026-07-11 · Basisversion: 0.13.8 · Zielversion: 0.13.9

---

## 0. Anweisungen für den ausführenden Agenten (WICHTIG, zuerst lesen)

Dieser Plan enthält **fertigen, vollständigen Code**. Deine Aufgabe ist NICHT, eine eigene Lösung zu entwerfen, sondern:

1. Die Schritte **in der angegebenen Reihenfolge** umzusetzen.
2. Code-Blöcke, die als "kompletter Dateiinhalt" markiert sind, **exakt 1:1** zu übernehmen (Datei komplett ersetzen bzw. neu anlegen).
3. Code-Blöcke mit "Anker" an der beschriebenen Stelle einzufügen.
4. Nach Schritt 6: `npm run typecheck` ausführen. Bei Fehlern: nur den minimalen Fix machen (z. B. Tippfehler), **keine Architekturänderungen**.
5. Die Verifikation aus Abschnitt 10 durchführen.

**Verbote:**

- `src/renderer/src/components/Timeline.tsx` wird in diesem Plan **NICHT angefasst**. Dort liegt der `justDraggedRef`-Schutz, der laut `.clinerules` niemals verändert werden darf. Dieser Plan benötigt dort keine Änderung.
- `src/renderer/src/components/timeline/ClipRegion.tsx` wird aktuell nirgends importiert (totes Modul). **Nicht anfassen, nicht löschen.**
- Keine zusätzlichen Pakete installieren. Keine Dateien außerhalb der unten genannten ändern.
- `npm run build` / `npm run check` NICHT ausführen (baut das native VST-Modul, dauert lange). Nur `npm run typecheck`.

**Projektregeln (aus `.clinerules`, hier zusammengefasst):**

- Neue/geänderte Code-Kommentare auf Deutsch.
- Changelog neutral, keine Fremdmarken, keine dramatisierenden Begriffe.
- Pflichtlektüre-Regel: `docs/SANIERUNGSPLAN_MCP_PLUGIN_SUPPORT.md` betrifft MCP/Command-Layer/Plugins. Dieser Plan ändert **keine** MCP- oder Command-Layer-Schnittstellen (reine Darstellungs-/Analyseschicht) und steht damit nicht im Konflikt. Ein tiefes Studium ist für diese Umsetzung nicht nötig.
- Code-Stil: 2 Leerzeichen Einrückung, keine Semikolons in `.ts`/`.tsx` (Ausnahme: `env.d.ts` nutzt Semikolons — Bestandsstil beibehalten).
- Handbuch-Regel geprüft: Es kommt **keine neue Bedienoberfläche** hinzu (keine Buttons, Menüs, Shortcuts), daher ist **keine** Änderung an `ManualModal.tsx` nötig.

**Geänderte/neue Dateien (vollständige Liste):**

| Schritt | Datei | Art |
|---|---|---|
| 1 | `src/main/waveform/peakPyramid.ts` | NEU |
| 2 | `src/main/waveform/waveformAnalysisService.ts` | komplett ersetzen |
| 3 | `src/preload/index.ts` | kleiner Einschub |
| 4 | `src/preload/index.d.ts` | kleiner Einschub |
| 5 | `src/renderer/src/env.d.ts` | kleiner Einschub |
| 6 | `src/renderer/src/components/WaveformRenderer.tsx` | komplett ersetzen |
| 7 | `package.json` + `CHANGELOG.md` | Version + Eintrag |

---

## 1. Problem (Ist-Zustand)

Beim Zoomen/Scrollen der Timeline ruckelt die Waveform und sieht zeitweise falsch aus. Ursachen (verifiziert im Code):

1. **FFmpeg pro Sichtfenster:** Jede Fensteranfrage (`waveform:get-window`) startet im Hauptprozess einen FFmpeg-Prozess (Seek + Decode). Die Cache-Schlüssel enthalten kontinuierliche Fließkommazahlen (Startzeit/Dauer mit 6 Nachkommastellen), die sich beim Zoomen ständig ändern → praktisch nie Cache-Treffer → 100–500 ms Latenz pro Zoomschritt.
2. **Amplitude "pumpt":** Der Renderer normalisiert auf das Maximum des sichtbaren Fensters (`localMaxAbs`). Beim Scrollen ändert sich dadurch laufend die dargestellte Höhe.
3. **Waveform "schwimmt" beim Zoomen:** Alte Daten werden per Array-Index über die neue Fenstergeometrie gestreckt statt zeitlich korrekt positioniert. Erst wenn neue Daten eintreffen, springt das Bild zurecht.
4. **Quadratisch langsames Einsammeln:** `decodePcmWindow` klebt PCM-Chunks per `Buffer.concat` in einer Schleife zusammen (O(n²)).
5. **Große IPC-Pakete:** Peaks gehen als `number[]` (bis 120 000 Punkte × 3 Reihen × 2 Kanäle) über IPC.

## 2. Lösung (Architektur)

Vorgehen wie in professionellen Editoren: **einmal dekodieren, Peak-Pyramide (Mipmap) bauen, danach kein FFmpeg mehr für normale Zoomstufen.**

```text
Erste Fensteranfrage für eine Datei
  └─> ensurePyramid(): startet EINEN streamenden FFmpeg-Decode
        └─> PyramidBuilder: baut Level 0 (256 Samples/Punkt) live mit,
            danach Level 1..n (je Faktor 4 gröber) aus Level 0
        └─> bei Fertigstellung: IPC-Event 'waveform:pyramid-ready' an alle Fenster

Fensteranfrage (samplesPerPixel >= 256  ODER  Fenster > 120 s)
  ├─ Pyramide fertig   → queryPyramid(): Antwort in <1 ms, Float32Arrays
  └─ Pyramide baut noch → bisheriger Overview-Pfad, Antwort mit provisional=true
                          (wird nirgends dauerhaft gecacht; Renderer fragt
                           nach 'pyramid-ready' automatisch neu an)

Fensteranfrage (samplesPerPixel < 256, starker Zoom)
  └─> PCM-Chunk-Cache: 10-Sekunden-Chunks an festem Raster, LRU (max 24),
      dekodiert in nativer Samplerate; Antwort = Peaks oder Samples
      direkt aus den Chunks. Nachbar-Chunks werden vorgeladen.
```

Renderer-Seite:

- Normalisierung auf den **Datei-Peak** (`filePeak` aus der Pyramide) statt aufs Sichtfenster → keine pumpende Amplitude.
- **Zeitbasiertes Zeichnen:** Jeder Datenpunkt wird über seine Quellzeit auf eine X-Position gemappt (`DrawMapping`). Veraltete Daten erscheinen dadurch während des Zoomens an der korrekten Stelle (nur kurz gröber aufgelöst) statt zu schwimmen.
- Debounce von 45 ms auf 16 ms gesenkt (Anfragen sind jetzt billig).
- `provisional`-Antworten werden nicht gecacht; auf das `pyramid-ready`-Event hin wird einmal neu angefragt.

Speicherbudget: Pyramide ≈ 20 MB pro Stunde Stereo-Audio, max. 6 Dateien (LRU). PCM-Chunk-Cache max. 24 × ~4 MB ≈ 100 MB.

---

## 3. Schritt 1: Neue Datei `src/main/waveform/peakPyramid.ts`

Datei neu anlegen, kompletter Inhalt:

```ts
/**
 * peakPyramid.ts
 * Mehrstufige Peak-Pyramide (Mipmap) fuer die Waveform-Darstellung.
 * Level 0 wird waehrend des streamenden Decodes gebaut, hoehere Level
 * werden daraus abgeleitet. Abfragen laufen danach ohne FFmpeg.
 */

// Samples pro Punkt im feinsten Level
export const PYRAMID_BASE_SPP = 256
// Verdichtungsfaktor zwischen zwei Leveln
export const PYRAMID_LEVEL_FACTOR = 4
// Kleinere Level lohnen sich nicht mehr
const MIN_LEVEL_POINTS = 2048

export type PyramidLevel = {
  samplesPerPoint: number
  points: number
  // Jeweils ein Float32Array pro Kanal
  min: Float32Array[]
  max: Float32Array[]
  rms: Float32Array[]
}

export type PeakPyramid = {
  sampleRate: number
  channels: number
  frames: number
  duration: number
  filePeak: number
  // Aufsteigend nach samplesPerPoint sortiert (Level 0 zuerst)
  levels: PyramidLevel[]
}

type ChannelAccu = {
  min: number
  max: number
  sumSquares: number
  count: number
}

/**
 * Nimmt interleaved Float32-PCM chunkweise entgegen und baut Level 0
 * der Pyramide live mit. finish() leitet die groeberen Level ab.
 * Wichtig: push() erwartet ganze Frames (Laenge durch Kanalzahl teilbar);
 * der Decoder liefert das ueber frame-ausgerichtete Chunks.
 */
export class PyramidBuilder {
  private readonly sampleRate: number
  private readonly channels: number
  private readonly accus: ChannelAccu[]
  private readonly level0Min: number[][]
  private readonly level0Max: number[][]
  private readonly level0Rms: number[][]
  private frames = 0
  private filePeak = 0

  constructor(sampleRate: number, channels: number) {
    this.sampleRate = Math.max(1, sampleRate)
    this.channels = Math.max(1, channels)
    this.accus = []
    this.level0Min = []
    this.level0Max = []
    this.level0Rms = []
    for (let ch = 0; ch < this.channels; ch++) {
      this.accus.push({ min: 1, max: -1, sumSquares: 0, count: 0 })
      this.level0Min.push([])
      this.level0Max.push([])
      this.level0Rms.push([])
    }
  }

  push(samples: Float32Array): void {
    const channels = this.channels
    const frameCount = Math.floor(samples.length / channels)
    for (let frame = 0; frame < frameCount; frame++) {
      for (let ch = 0; ch < channels; ch++) {
        let sample = samples[frame * channels + ch] || 0
        if (sample > 1) sample = 1
        if (sample < -1) sample = -1
        const accu = this.accus[ch]
        if (sample < accu.min) accu.min = sample
        if (sample > accu.max) accu.max = sample
        accu.sumSquares += sample * sample
        accu.count++
        const abs = Math.abs(sample)
        if (abs > this.filePeak) this.filePeak = abs
      }
      this.frames++
      if (this.frames % PYRAMID_BASE_SPP === 0) {
        this.flushPoint()
      }
    }
  }

  private flushPoint(): void {
    for (let ch = 0; ch < this.channels; ch++) {
      const accu = this.accus[ch]
      this.level0Min[ch].push(accu.count > 0 ? accu.min : 0)
      this.level0Max[ch].push(accu.count > 0 ? accu.max : 0)
      this.level0Rms[ch].push(accu.count > 0 ? Math.sqrt(accu.sumSquares / accu.count) : 0)
      accu.min = 1
      accu.max = -1
      accu.sumSquares = 0
      accu.count = 0
    }
  }

  finish(): PeakPyramid {
    // Angefangenen Punkt noch abschliessen
    if (this.accus[0] && this.accus[0].count > 0) {
      this.flushPoint()
    }
    const points = this.level0Min[0] ? this.level0Min[0].length : 0
    const level0: PyramidLevel = {
      samplesPerPoint: PYRAMID_BASE_SPP,
      points,
      min: this.level0Min.map((values) => Float32Array.from(values)),
      max: this.level0Max.map((values) => Float32Array.from(values)),
      rms: this.level0Rms.map((values) => Float32Array.from(values))
    }
    const levels = [level0]
    let previous = level0
    while (Math.floor(previous.points / PYRAMID_LEVEL_FACTOR) >= MIN_LEVEL_POINTS) {
      previous = deriveCoarserLevel(previous, this.channels)
      levels.push(previous)
    }
    return {
      sampleRate: this.sampleRate,
      channels: this.channels,
      frames: this.frames,
      duration: this.frames / this.sampleRate,
      filePeak: this.filePeak,
      levels
    }
  }
}

// Leitet ein groeberes Level aus dem vorherigen ab (Faktor PYRAMID_LEVEL_FACTOR)
function deriveCoarserLevel(previous: PyramidLevel, channels: number): PyramidLevel {
  const points = Math.floor(previous.points / PYRAMID_LEVEL_FACTOR)
  const minArrays: Float32Array[] = []
  const maxArrays: Float32Array[] = []
  const rmsArrays: Float32Array[] = []
  for (let ch = 0; ch < channels; ch++) {
    const minOut = new Float32Array(points)
    const maxOut = new Float32Array(points)
    const rmsOut = new Float32Array(points)
    for (let point = 0; point < points; point++) {
      let min = 1
      let max = -1
      let sumSquares = 0
      for (let i = 0; i < PYRAMID_LEVEL_FACTOR; i++) {
        const src = point * PYRAMID_LEVEL_FACTOR + i
        const vMin = previous.min[ch][src]
        const vMax = previous.max[ch][src]
        const vRms = previous.rms[ch][src]
        if (vMin < min) min = vMin
        if (vMax > max) max = vMax
        sumSquares += vRms * vRms
      }
      minOut[point] = min
      maxOut[point] = max
      rmsOut[point] = Math.sqrt(sumSquares / PYRAMID_LEVEL_FACTOR)
    }
    minArrays.push(minOut)
    maxArrays.push(maxOut)
    rmsArrays.push(rmsOut)
  }
  return {
    samplesPerPoint: previous.samplesPerPoint * PYRAMID_LEVEL_FACTOR,
    points,
    min: minArrays,
    max: maxArrays,
    rms: rmsArrays
  }
}

export type PyramidQueryResult = {
  samplesPerPoint: number
  points: number
  channels: { min: Float32Array; max: Float32Array; rms: Float32Array }[]
  windowPeak: number
}

/**
 * Beantwortet eine Fensteranfrage aus der Pyramide.
 * Waehlt das feinste Level, dessen Aufloesung fuer die gewuenschte
 * Pixelzahl ausreicht, und verdichtet dessen Punkte auf outPoints.
 */
export function queryPyramid(
  pyramid: PeakPyramid,
  startTime: number,
  duration: number,
  pixels: number,
  channelIndex?: number
): PyramidQueryResult {
  const windowFrames = Math.max(1, duration * pyramid.sampleRate)
  const targetSpp = windowFrames / Math.max(1, pixels)

  let level = pyramid.levels[0]
  for (const candidate of pyramid.levels) {
    if (candidate.samplesPerPoint <= targetSpp) {
      level = candidate
    } else {
      break
    }
  }

  const startPoint = clampInt(
    Math.floor((startTime * pyramid.sampleRate) / level.samplesPerPoint),
    0,
    Math.max(0, level.points - 1)
  )
  const endPoint = clampInt(
    Math.ceil(((startTime + duration) * pyramid.sampleRate) / level.samplesPerPoint),
    startPoint + 1,
    Math.max(startPoint + 1, level.points)
  )
  const rangePoints = endPoint - startPoint
  const outPoints = Math.max(1, Math.min(pixels, rangePoints))

  const channelIndices = typeof channelIndex === 'number'
    ? [Math.min(Math.max(0, channelIndex), pyramid.channels - 1)]
    : Array.from({ length: pyramid.channels }, (_, i) => i)

  let windowPeak = 0
  const channels = channelIndices.map((ch) => {
    const minOut = new Float32Array(outPoints)
    const maxOut = new Float32Array(outPoints)
    const rmsOut = new Float32Array(outPoints)
    for (let out = 0; out < outPoints; out++) {
      const from = startPoint + Math.floor((out / outPoints) * rangePoints)
      const to = Math.max(from + 1, startPoint + Math.floor(((out + 1) / outPoints) * rangePoints))
      let min = 1
      let max = -1
      let sumSquares = 0
      let count = 0
      for (let p = from; p < to && p < level.points; p++) {
        const vMin = level.min[ch][p]
        const vMax = level.max[ch][p]
        const vRms = level.rms[ch][p]
        if (vMin < min) min = vMin
        if (vMax > max) max = vMax
        sumSquares += vRms * vRms
        count++
      }
      if (count === 0) {
        min = 0
        max = 0
      }
      minOut[out] = min
      maxOut[out] = max
      rmsOut[out] = count > 0 ? Math.sqrt(sumSquares / count) : 0
      const absPeak = Math.max(Math.abs(min), Math.abs(max))
      if (absPeak > windowPeak) windowPeak = absPeak
    }
    return { min: minOut, max: maxOut, rms: rmsOut }
  })

  return {
    samplesPerPoint: level.samplesPerPoint,
    points: outPoints,
    channels,
    windowPeak
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
```

---

## 4. Schritt 2: `src/main/waveform/waveformAnalysisService.ts` komplett ersetzen

Die Datei vollständig durch folgenden Inhalt ersetzen:

```ts
/**
 * waveformAnalysisService.ts
 * Liefert Waveform-Fenster fuer die Timeline.
 *
 * Architektur:
 * - Beim ersten Zugriff auf eine Datei wird sie EINMAL streamend per FFmpeg
 *   dekodiert und daraus eine Peak-Pyramide gebaut (peakPyramid.ts).
 * - Danach werden Fensteranfragen fuer normale Zoomstufen direkt aus der
 *   Pyramide beantwortet — ohne FFmpeg, in Millisekunden.
 * - Fuer sehr starken Zoom (unter PYRAMID_BASE_SPP Samples pro Pixel) werden
 *   kleine, rasterfeste PCM-Chunks dekodiert und im LRU-Cache gehalten.
 * - Solange die Pyramide baut, antwortet der Overview-Pfad als Uebergang;
 *   solche Antworten tragen provisional=true und werden nicht gecacht.
 */

import * as fs from 'fs'
import * as path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import { BrowserWindow } from 'electron'
import { logger } from '../logger'
import {
  PeakPyramid,
  PyramidBuilder,
  PYRAMID_BASE_SPP,
  queryPyramid
} from './peakPyramid'

// Kann als normales Array (Overview-/Sample-Pfad) oder als Float32Array
// (Pyramiden-Pfad) uebertragen werden — Electron-IPC beherrscht beides.
export type WaveformSeries = Float32Array | number[]

export type WaveformChannel = {
  min?: WaveformSeries
  max?: WaveformSeries
  rms?: WaveformSeries
  samples?: WaveformSeries
}

export type WaveformWindowRequest = {
  startTime?: number
  duration?: number
  pixels?: number
  channel?: 'left' | 'right'
}

export type WaveformWindowResponse = {
  mode: 'peaks' | 'samples'
  startTime: number
  duration: number
  sampleRate: number
  sourceSampleRate: number
  sourceChannels: number
  samplesPerPoint: number
  points: number
  peak: number
  // Globaler Peak der gesamten Datei (aus der Pyramide); fuer stabile Skalierung
  filePeak?: number
  // true = Uebergangsantwort, solange die Pyramide noch baut
  provisional?: boolean
  channels: WaveformChannel[]
}

type MediaInfo = {
  duration: number
  sampleRate: number
  channels: number
  fingerprint: string
}

type DecodedPcm = {
  data: Float32Array
  channels: number
  sampleRate: number
}

type PyramidState = {
  status: 'building' | 'ready' | 'error'
  pyramid?: PeakPyramid
  promise: Promise<PeakPyramid>
}

const metadataCache = new Map<string, MediaInfo>()
const windowCache = new Map<string, WaveformWindowResponse>()
const inflightWindowCache = new Map<string, Promise<WaveformWindowResponse>>()
const overviewCache = new Map<string, Promise<DecodedPcm>>()
const pyramidCache = new Map<string, PyramidState>()
const pcmChunkCache = new Map<string, Promise<DecodedPcm>>()

const MAX_WINDOW_CACHE_ENTRIES = 120
const MAX_OVERVIEW_CACHE_ENTRIES = 12
const MAX_POINTS = 120000
const MAX_SAMPLE_MODE_POINTS = 1_200_000
const OVERVIEW_MAX_FRAMES = 900_000
const OVERVIEW_MAX_SAMPLE_RATE = 24000
// Unterhalb dieser Samples-pro-Pixel-Grenze werden echte Samples gezeichnet
const SAMPLE_MODE_MAX_SPP = 192
// Schutz: laengere Fenster werden immer aus der Pyramide beantwortet
const MAX_PCM_WINDOW_SECONDS = 120
// PCM-Chunks liegen an einem festen 10-Sekunden-Raster
const PCM_CHUNK_SECONDS = 10
const MAX_PCM_CHUNKS = 24
const MAX_PYRAMID_ENTRIES = 6

function isSafePath(filePath: unknown): filePath is string {
  if (typeof filePath !== 'string' || filePath.trim() === '') return false
  if (filePath.includes('file://')) return false
  if (filePath.includes('javascript:')) return false
  if (filePath.includes('data:')) return false
  try {
    path.resolve(filePath)
    return true
  } catch {
    return false
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function makeFingerprint(filePath: string): string {
  const stat = fs.statSync(filePath)
  return `${path.resolve(filePath)}|${stat.size}|${Math.floor(stat.mtimeMs)}`
}

function rememberWindow(key: string, response: WaveformWindowResponse): void {
  if (windowCache.has(key)) {
    windowCache.delete(key)
  }
  windowCache.set(key, response)

  while (windowCache.size > MAX_WINDOW_CACHE_ENTRIES) {
    const oldest = windowCache.keys().next().value
    if (!oldest) break
    windowCache.delete(oldest)
  }
}

function rememberOverview(key: string, promise: Promise<DecodedPcm>): void {
  if (overviewCache.has(key)) {
    overviewCache.delete(key)
  }
  overviewCache.set(key, promise)

  while (overviewCache.size > MAX_OVERVIEW_CACHE_ENTRIES) {
    const oldest = overviewCache.keys().next().value
    if (!oldest) break
    overviewCache.delete(oldest)
  }
}

function readMediaInfo(filePath: string): Promise<MediaInfo> {
  const fingerprint = makeFingerprint(filePath)
  const cached = metadataCache.get(fingerprint)
  if (cached) return Promise.resolve(cached)

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata) {
        reject(err || new Error('Keine Medieninformationen gefunden'))
        return
      }

      const audioStream = (metadata.streams || []).find((stream: any) => stream.codec_type === 'audio')
      const format = metadata.format || {}
      const duration = Math.max(0.001, Number(format.duration || audioStream?.duration || 0))
      const sampleRate = Math.max(1000, Number(audioStream?.sample_rate || 48000))
      const channels = Math.max(1, Math.min(2, Number(audioStream?.channels || 1)))
      const info = { duration, sampleRate, channels, fingerprint }

      metadataCache.set(fingerprint, info)
      resolve(info)
    })
  })
}

// Fenster-Decode: sammelt Chunks in einem Array und fuegt sie EINMAL
// zusammen (das alte Buffer.concat pro Chunk war quadratisch langsam).
function decodePcmWindow(
  filePath: string,
  info: MediaInfo,
  startTime: number,
  duration: number,
  channel?: 'left' | 'right',
  targetSampleRate?: number
): Promise<DecodedPcm> {
  const decodeSampleRate = targetSampleRate || info.sampleRate
  const outputChannels = channel ? 1 : info.channels

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const command = ffmpeg(filePath)
      .noVideo()
      .seekInput(Math.max(0, startTime))
      .duration(Math.max(0.001, duration))
      .audioChannels(outputChannels)
      .audioFrequency(decodeSampleRate)
      .format('f32le')

    if (channel === 'left' || (channel === 'right' && info.channels < 2)) {
      command.audioFilters('pan=mono|c0=c0')
    } else if (channel === 'right') {
      command.audioFilters('pan=mono|c0=c1')
    }

    command.on('error', (err) => {
      reject(err)
    })

    command.on('end', () => {
      const pcmBuffer = Buffer.concat(chunks)
      const usableLength = pcmBuffer.length - (pcmBuffer.length % 4)
      const view = new DataView(pcmBuffer.buffer, pcmBuffer.byteOffset, usableLength)
      const copy = new Float32Array(usableLength / 4)
      for (let i = 0; i < copy.length; i++) {
        copy[i] = view.getFloat32(i * 4, true)
      }
      resolve({ data: copy, channels: outputChannels, sampleRate: decodeSampleRate })
    })

    const stdoutStream = command.pipe()
    stdoutStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
  })
}

/**
 * Streaming-Decode der GESAMTEN Datei: reicht PCM frame-ausgerichtet an
 * onChunk weiter, ohne die Datei komplett im Speicher zu halten.
 * Wird ausschliesslich fuer den Pyramidenbau verwendet.
 */
function decodePcmStream(
  filePath: string,
  sampleRate: number,
  channels: number,
  onChunk: (samples: Float32Array) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const bytesPerFrame = 4 * Math.max(1, channels)
    let leftover: Buffer | null = null

    const command = ffmpeg(filePath)
      .noVideo()
      .audioChannels(channels)
      .audioFrequency(sampleRate)
      .format('f32le')

    command.on('error', (err) => reject(err))
    command.on('end', () => resolve())

    const stream = command.pipe()
    stream.on('data', (chunk: Buffer) => {
      const buffer = leftover ? Buffer.concat([leftover, chunk]) : chunk
      // Nur ganze Frames weiterreichen, Rest fuer den naechsten Chunk aufheben
      const usable = buffer.length - (buffer.length % bytesPerFrame)
      leftover = usable < buffer.length ? buffer.subarray(usable) : null
      if (usable === 0) return
      const view = new DataView(buffer.buffer, buffer.byteOffset, usable)
      const samples = new Float32Array(usable / 4)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = view.getFloat32(i * 4, true)
      }
      onChunk(samples)
    })
  })
}

// Meldet allen Fenstern, dass die Pyramide fuer eine Datei fertig ist,
// damit der Renderer die Uebergangsdaten ersetzt.
function broadcastPyramidReady(filePath: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('waveform:pyramid-ready', { filePath })
    }
  }
}

// Startet (einmalig pro Datei) den Pyramidenbau und verwaltet den LRU-Cache
function ensurePyramid(filePath: string, info: MediaInfo): PyramidState {
  const existing = pyramidCache.get(info.fingerprint)
  if (existing) {
    pyramidCache.delete(info.fingerprint)
    pyramidCache.set(info.fingerprint, existing)
    return existing
  }

  const builder = new PyramidBuilder(info.sampleRate, info.channels)
  const state: PyramidState = {
    status: 'building',
    promise: null as unknown as Promise<PeakPyramid>
  }
  state.promise = decodePcmStream(filePath, info.sampleRate, info.channels, (samples) => {
    builder.push(samples)
  }).then(() => {
    const pyramid = builder.finish()
    state.status = 'ready'
    state.pyramid = pyramid
    logger.info('Waveform', 'Peak-Pyramide fertig', {
      filePath,
      frames: pyramid.frames,
      levels: pyramid.levels.length,
      filePeak: Number(pyramid.filePeak.toFixed(4))
    })
    broadcastPyramidReady(filePath)
    return pyramid
  }).catch((err) => {
    state.status = 'error'
    pyramidCache.delete(info.fingerprint)
    logger.error('Waveform', 'Peak-Pyramide fehlgeschlagen', err)
    throw err
  })
  // Verhindert unhandled-rejection-Warnungen, falls niemand wartet
  state.promise.catch(() => {})

  pyramidCache.set(info.fingerprint, state)
  while (pyramidCache.size > MAX_PYRAMID_ENTRIES) {
    // Noch bauende Eintraege nicht rauswerfen
    let evictKey: string | null = null
    pyramidCache.forEach((value, key) => {
      if (evictKey === null && value.status !== 'building') {
        evictKey = key
      }
    })
    if (evictKey === null) break
    pyramidCache.delete(evictKey)
  }
  return state
}

// Liefert einen rasterfesten PCM-Chunk (10 s) aus dem LRU-Cache oder dekodiert ihn
function getPcmChunk(filePath: string, info: MediaInfo, chunkIndex: number): Promise<DecodedPcm> {
  const key = `${info.fingerprint}|chunk|${chunkIndex}`
  const cached = pcmChunkCache.get(key)
  if (cached) {
    pcmChunkCache.delete(key)
    pcmChunkCache.set(key, cached)
    return cached
  }

  const chunkStart = chunkIndex * PCM_CHUNK_SECONDS
  const chunkDuration = Math.min(PCM_CHUNK_SECONDS, Math.max(0.001, info.duration - chunkStart))
  const promise = decodePcmWindow(filePath, info, chunkStart, chunkDuration, undefined, info.sampleRate)
    .catch((err) => {
      pcmChunkCache.delete(key)
      throw err
    })
  pcmChunkCache.set(key, promise)
  while (pcmChunkCache.size > MAX_PCM_CHUNKS) {
    const oldest = pcmChunkCache.keys().next().value
    if (!oldest) break
    pcmChunkCache.delete(oldest)
  }
  return promise
}

// Setzt ein Fenster aus rasterfesten Chunks zusammen und laedt Nachbarn vor
async function getPcmForWindow(
  filePath: string,
  info: MediaInfo,
  startTime: number,
  duration: number
): Promise<DecodedPcm> {
  const firstChunk = Math.max(0, Math.floor(startTime / PCM_CHUNK_SECONDS))
  const lastChunk = Math.max(firstChunk, Math.floor((startTime + duration - 0.0005) / PCM_CHUNK_SECONDS))

  const chunkPromises: Promise<DecodedPcm>[] = []
  for (let index = firstChunk; index <= lastChunk; index++) {
    chunkPromises.push(getPcmChunk(filePath, info, index))
  }

  // Nachbar-Chunks im Hintergrund vorladen, damit Scrollen fluessig bleibt
  if (firstChunk > 0) {
    getPcmChunk(filePath, info, firstChunk - 1).catch(() => {})
  }
  if ((lastChunk + 1) * PCM_CHUNK_SECONDS < info.duration) {
    getPcmChunk(filePath, info, lastChunk + 1).catch(() => {})
  }

  const chunks = await Promise.all(chunkPromises)
  const channels = chunks[0]?.channels || info.channels
  const sampleRate = chunks[0]?.sampleRate || info.sampleRate
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0)
  const merged = new Float32Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk.data, offset)
    offset += chunk.data.length
  }
  const mergedPcm: DecodedPcm = { data: merged, channels, sampleRate }
  // Auf das exakte Fenster zuschneiden (Zeit relativ zum ersten Chunk)
  return sliceDecodedWindow(mergedPcm, startTime - firstChunk * PCM_CHUNK_SECONDS, duration)
}

// Extrahiert einen einzelnen Kanal aus interleaved PCM
function selectChannel(decoded: DecodedPcm, channelIndex: number): DecodedPcm {
  if (decoded.channels <= 1) return decoded
  const ch = Math.min(Math.max(0, channelIndex), decoded.channels - 1)
  const frames = Math.floor(decoded.data.length / decoded.channels)
  const mono = new Float32Array(frames)
  for (let frame = 0; frame < frames; frame++) {
    mono[frame] = decoded.data[frame * decoded.channels + ch]
  }
  return { data: mono, channels: 1, sampleRate: decoded.sampleRate }
}

function getOverviewSampleRate(info: MediaInfo): number {
  return Math.round(clamp(
    Math.ceil(OVERVIEW_MAX_FRAMES / Math.max(0.001, info.duration)),
    4000,
    Math.min(info.sampleRate, OVERVIEW_MAX_SAMPLE_RATE)
  ))
}

function getOverviewPcm(filePath: string, info: MediaInfo, channel?: 'left' | 'right'): Promise<DecodedPcm> {
  const sampleRate = getOverviewSampleRate(info)
  const cacheKey = [info.fingerprint, 'overview', channel || 'stereo', sampleRate].join('|')
  const cached = overviewCache.get(cacheKey)
  if (cached) {
    overviewCache.delete(cacheKey)
    overviewCache.set(cacheKey, cached)
    return cached
  }

  const promise = decodePcmWindow(filePath, info, 0, info.duration, channel, sampleRate).catch((err) => {
    overviewCache.delete(cacheKey)
    throw err
  })
  rememberOverview(cacheKey, promise)
  return promise
}

function sliceDecodedWindow(decoded: DecodedPcm, startTime: number, duration: number): DecodedPcm {
  const totalFrames = Math.floor(decoded.data.length / decoded.channels)
  const startFrame = clamp(Math.floor(startTime * decoded.sampleRate), 0, Math.max(0, totalFrames - 1))
  const endFrame = clamp(Math.ceil((startTime + duration) * decoded.sampleRate), startFrame + 1, Math.max(startFrame + 1, totalFrames))
  const startIndex = startFrame * decoded.channels
  const endIndex = endFrame * decoded.channels
  const data = new Float32Array(Math.max(0, endIndex - startIndex))
  data.set(decoded.data.subarray(startIndex, endIndex))
  return { data, channels: decoded.channels, sampleRate: decoded.sampleRate }
}

function makeEmptyResponse(info: MediaInfo, startTime: number, duration: number): WaveformWindowResponse {
  return {
    mode: 'peaks',
    startTime,
    duration,
    sampleRate: info.sampleRate,
    sourceSampleRate: info.sampleRate,
    sourceChannels: info.channels,
    samplesPerPoint: 1,
    points: 0,
    peak: 0,
    channels: []
  }
}

function buildSampleResponse(
  decoded: DecodedPcm,
  info: MediaInfo,
  startTime: number,
  duration: number
): WaveformWindowResponse {
  const frames = Math.floor(decoded.data.length / decoded.channels)
  const channels: WaveformChannel[] = []
  let peak = 0

  for (let ch = 0; ch < decoded.channels; ch++) {
    const samples: number[] = new Array(frames)
    for (let frame = 0; frame < frames; frame++) {
      const sample = clamp(decoded.data[frame * decoded.channels + ch] || 0, -1, 1)
      samples[frame] = sample
      const abs = Math.abs(sample)
      if (abs > peak) peak = abs
    }
    channels.push({ samples })
  }

  return {
    mode: 'samples',
    startTime,
    duration,
    sampleRate: decoded.sampleRate,
    sourceSampleRate: info.sampleRate,
    sourceChannels: info.channels,
    samplesPerPoint: 1,
    points: frames,
    peak,
    channels
  }
}

function buildPeakResponse(
  decoded: DecodedPcm,
  info: MediaInfo,
  startTime: number,
  duration: number,
  requestedPoints: number
): WaveformWindowResponse {
  const frames = Math.floor(decoded.data.length / decoded.channels)
  if (frames <= 0) return makeEmptyResponse(info, startTime, duration)

  const points = clamp(Math.min(requestedPoints, frames), 1, MAX_POINTS)
  const samplesPerPoint = Math.max(1, frames / points)
  const channels: WaveformChannel[] = []
  let peak = 0

  for (let ch = 0; ch < decoded.channels; ch++) {
    const minValues: number[] = new Array(points)
    const maxValues: number[] = new Array(points)
    const rmsValues: number[] = new Array(points)

    for (let point = 0; point < points; point++) {
      const startFrame = Math.floor((point / points) * frames)
      const endFrame = Math.max(startFrame + 1, Math.floor(((point + 1) / points) * frames))
      let min = 1
      let max = -1
      let sumSquares = 0
      let count = 0

      for (let frame = startFrame; frame < endFrame; frame++) {
        const sample = clamp(decoded.data[frame * decoded.channels + ch] || 0, -1, 1)
        if (sample < min) min = sample
        if (sample > max) max = sample
        sumSquares += sample * sample
        count++
      }

      if (count === 0) {
        min = 0
        max = 0
      }

      const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0
      minValues[point] = min
      maxValues[point] = max
      rmsValues[point] = rms
      peak = Math.max(peak, Math.abs(min), Math.abs(max))
    }

    channels.push({ min: minValues, max: maxValues, rms: rmsValues })
  }

  return {
    mode: 'peaks',
    startTime,
    duration,
    sampleRate: decoded.sampleRate,
    sourceSampleRate: info.sampleRate,
    sourceChannels: info.channels,
    samplesPerPoint,
    points,
    peak,
    channels
  }
}

// Baut eine Antwort direkt aus der Pyramide (kein FFmpeg, kein PCM)
function buildPyramidResponse(
  pyramid: PeakPyramid,
  info: MediaInfo,
  startTime: number,
  duration: number,
  pixels: number,
  channelIndex?: number
): WaveformWindowResponse {
  const result = queryPyramid(pyramid, startTime, duration, pixels, channelIndex)
  return {
    mode: 'peaks',
    startTime,
    duration,
    sampleRate: pyramid.sampleRate,
    sourceSampleRate: info.sampleRate,
    sourceChannels: info.channels,
    samplesPerPoint: result.samplesPerPoint,
    points: result.points,
    peak: result.windowPeak,
    filePeak: pyramid.filePeak,
    channels: result.channels.map((ch) => ({ min: ch.min, max: ch.max, rms: ch.rms }))
  }
}

export async function getWaveformWindow(
  filePath: string,
  request: WaveformWindowRequest = {}
): Promise<WaveformWindowResponse> {
  if (!isSafePath(filePath)) {
    throw new Error('Ungueltiger Pfad fuer Waveform-Analyse')
  }

  const info = await readMediaInfo(filePath)
  const startTime = clamp(Number(request.startTime || 0), 0, Math.max(0, info.duration - 0.001))
  const requestedDuration = Number(request.duration || info.duration)
  const duration = clamp(requestedDuration, 0.001, Math.max(0.001, info.duration - startTime))
  const pixels = Math.round(clamp(Number(request.pixels || 1000), 16, MAX_POINTS))
  const key = [
    info.fingerprint,
    request.channel || 'stereo',
    startTime.toFixed(6),
    duration.toFixed(6),
    pixels
  ].join('|')

  const cached = windowCache.get(key)
  if (cached) {
    windowCache.delete(key)
    windowCache.set(key, cached)
    return cached
  }

  const inflight = inflightWindowCache.get(key)
  if (inflight) {
    return inflight
  }

  const requestPromise = (async () => {
    const samplesPerPixel = (duration * info.sampleRate) / pixels
    const channelIndex = request.channel === 'right'
      ? Math.min(1, info.channels - 1)
      : request.channel === 'left' ? 0 : undefined
    const pyramidState = ensurePyramid(filePath, info)

    let response: WaveformWindowResponse
    let source: 'pyramid' | 'overview-fallback' | 'pcm-chunks'

    if (samplesPerPixel >= PYRAMID_BASE_SPP || duration > MAX_PCM_WINDOW_SECONDS) {
      if (pyramidState.status === 'ready' && pyramidState.pyramid) {
        response = buildPyramidResponse(pyramidState.pyramid, info, startTime, duration, pixels, channelIndex)
        source = 'pyramid'
      } else {
        // Uebergang, bis die Pyramide fertig ist — nicht cachen
        const decoded = sliceDecodedWindow(await getOverviewPcm(filePath, info, request.channel), startTime, duration)
        response = buildPeakResponse(decoded, info, startTime, duration, pixels)
        response.provisional = true
        source = 'overview-fallback'
      }
    } else {
      const decoded = await getPcmForWindow(filePath, info, startTime, duration)
      const selected = typeof channelIndex === 'number' ? selectChannel(decoded, channelIndex) : decoded
      const frames = Math.floor(selected.data.length / Math.max(1, selected.channels))
      response = samplesPerPixel <= SAMPLE_MODE_MAX_SPP && frames <= MAX_SAMPLE_MODE_POINTS
        ? buildSampleResponse(selected, info, startTime, duration)
        : buildPeakResponse(selected, info, startTime, duration, pixels)
      source = 'pcm-chunks'
    }

    // Globalen Datei-Peak mitgeben, sobald die Pyramide ihn kennt
    if (pyramidState.status === 'ready' && pyramidState.pyramid) {
      response.filePeak = pyramidState.pyramid.filePeak
    }

    if (!response.provisional) {
      rememberWindow(key, response)
    }
    logger.debug('Waveform', 'Waveform-Fenster berechnet', {
      filePath,
      startTime,
      duration,
      pixels,
      source,
      mode: response.mode,
      points: response.points,
      channels: response.channels.length
    })
    return response
  })()

  inflightWindowCache.set(key, requestPromise)

  try {
    return await requestPromise
  } finally {
    inflightWindowCache.delete(key)
  }
}

export async function getLegacyPeaks(
  filePath: string,
  samples: number,
  channel?: 'left' | 'right'
): Promise<number[]> {
  const info = await readMediaInfo(filePath)
  const response = await getWaveformWindow(filePath, {
    startTime: 0,
    duration: info.duration,
    pixels: samples,
    channel
  })
  const firstChannel = response.channels[0]
  if (!firstChannel) return []

  if (response.mode === 'samples' && firstChannel.samples) {
    return Array.from(firstChannel.samples, (sample) => Math.abs(sample || 0))
  }

  const minValues = firstChannel.min || []
  const maxValues = firstChannel.max || []
  return Array.from(maxValues, (max, index) => Math.max(Math.abs(max || 0), Math.abs(minValues[index] || 0)))
}
```

---

## 5. Schritt 3: `src/preload/index.ts` — Event-Abo ergänzen

**Anker:** die Zeile

```ts
  getWaveformWindow: (filePath: string, options?: any) => ipcRenderer.invoke('waveform:get-window', filePath, options),
```

**Direkt DANACH** folgenden Block einfügen:

```ts
  onWaveformPyramidReady: (callback: (data: { filePath: string }) => void) => {
    const sub = (_event: any, data: any) => callback(data)
    ipcRenderer.on('waveform:pyramid-ready', sub)
    return () => { ipcRenderer.removeListener('waveform:pyramid-ready', sub) }
  },
```

---

## 6. Schritt 4: `src/preload/index.d.ts` — Typ ergänzen

**Anker:** der Block

```ts
      getWaveformWindow: (filePath: string, options?: {
        startTime?: number
        duration?: number
        pixels?: number
        channel?: 'left' | 'right'
      }) => Promise<any>
```

**Direkt DANACH** folgende Zeile einfügen (gleiche Einrückung wie `getWaveformWindow`):

```ts
      onWaveformPyramidReady: (callback: (data: { filePath: string }) => void) => (() => void)
```

---

## 7. Schritt 5: `src/renderer/src/env.d.ts` — Typ ergänzen

**Anker:** der Block

```ts
    getWaveformWindow: (path: string, options?: {
      startTime?: number;
      duration?: number;
      pixels?: number;
      channel?: 'left' | 'right';
    }) => Promise<any>;
```

**Direkt DANACH** folgende Zeile einfügen (Bestandsstil mit Semikolon beibehalten):

```ts
    onWaveformPyramidReady: (callback: (data: { filePath: string }) => void) => (() => void);
```

---

## 8. Schritt 6: `src/renderer/src/components/WaveformRenderer.tsx` komplett ersetzen

Die Datei vollständig durch folgenden Inhalt ersetzen:

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { writeDiagnosticLog } from '../lib/diagnosticLogging'

// Waveform-Daten koennen als normale Arrays (Uebergangs-/Sample-Pfad) oder
// als Float32Arrays (Pyramiden-Pfad) ankommen.
type WaveformSeries = Float32Array | number[]

type WaveformChannel = {
  min?: WaveformSeries
  max?: WaveformSeries
  rms?: WaveformSeries
  samples?: WaveformSeries
}

type WaveformWindowData = {
  mode: 'peaks' | 'samples'
  startTime: number
  duration: number
  sampleRate: number
  sourceSampleRate: number
  sourceChannels: number
  samplesPerPoint: number
  points: number
  peak: number
  filePeak?: number
  provisional?: boolean
  channels: WaveformChannel[]
}

type WaveformRendererProps = {
  filePath: string
  sourceOffset?: number
  duration?: number
  fileDuration?: number
  displayDuration?: number
  channel?: 'left' | 'right'
  gain?: number
  pixelsPerSecond?: number
  regionStart?: number
  scrollLeft?: number
  viewportWidth?: number
  sourceChannels?: number
}

type RenderWindow = {
  leftPx: number
  widthPx: number
  sourceStart: number
  sourceDuration: number
  requestPixels: number
}

// Beschreibt, wo die gelieferten Datenpunkte im aktuellen Canvas liegen:
// offsetPx = X-Position des ersten Punkts, spanPx = Breite aller Punkte.
// Dadurch bleiben auch veraltete Daten beim Zoomen zeitlich korrekt verortet,
// statt ueber die neue Fensterbreite gestreckt zu werden ("Schwimmen").
type DrawMapping = {
  offsetPx: number
  spanPx: number
}

const TILE_SIZE_PX = 512
const TILE_BUFFER_PX = 768
const MAX_REQUEST_PIXELS = 120000
const MAX_DEVICE_PIXEL_RATIO = 2
const MAX_CANVAS_BITMAP_SIZE = 16384
// Kurze Entprellung reicht: Anfragen sind dank Peak-Pyramide billig
const WAVEFORM_REQUEST_DEBOUNCE_MS = 16
const rendererWaveformCache = new Map<string, WaveformWindowData>()

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getChannelLength(channel: WaveformChannel | undefined, mode: 'peaks' | 'samples'): number {
  if (!channel) return 0
  if (mode === 'samples') return channel.samples?.length || 0
  return Math.min(channel.min?.length || 0, channel.max?.length || 0)
}

function getChannelMaxAbs(channel: WaveformChannel | undefined, mode: 'peaks' | 'samples'): number {
  if (!channel) return 0
  if (mode === 'samples') {
    const samples = channel.samples || []
    let maxAbs = 0
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i] || 0)
      if (abs > maxAbs) maxAbs = abs
    }
    return maxAbs
  }

  const minValues = channel.min || []
  const maxValues = channel.max || []
  const count = Math.min(minValues.length, maxValues.length)
  let maxAbs = 0
  for (let i = 0; i < count; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(minValues[i] || 0), Math.abs(maxValues[i] || 0))
  }
  return maxAbs
}

function getCssPixelRatio(): number {
  return clamp(window.devicePixelRatio || 1, 1, MAX_DEVICE_PIXEL_RATIO)
}

function rememberRendererWaveform(key: string, data: WaveformWindowData): void {
  if (rendererWaveformCache.has(key)) {
    rendererWaveformCache.delete(key)
  }
  rendererWaveformCache.set(key, data)

  while (rendererWaveformCache.size > 160) {
    const oldest = rendererWaveformCache.keys().next().value
    if (!oldest) break
    rendererWaveformCache.delete(oldest)
  }
}

function getSafeCanvasRatio(cssWidth: number, cssHeight: number): number {
  const desired = getCssPixelRatio()
  const maxByWidth = MAX_CANVAS_BITMAP_SIZE / Math.max(1, cssWidth)
  const maxByHeight = MAX_CANVAS_BITMAP_SIZE / Math.max(1, cssHeight)
  const minVisibleRatio = 1 / Math.max(1, cssWidth, cssHeight)
  return Math.max(minVisibleRatio, Math.min(desired, maxByWidth, maxByHeight, MAX_DEVICE_PIXEL_RATIO))
}

function buildRenderWindow({
  sourceOffset,
  duration,
  displayDuration,
  fileDuration,
  pixelsPerSecond,
  regionStart,
  scrollLeft,
  viewportWidth,
  measuredWidth
}: {
  sourceOffset: number
  duration: number
  displayDuration: number
  fileDuration: number
  pixelsPerSecond: number
  regionStart: number
  scrollLeft: number
  viewportWidth: number
  measuredWidth: number
}): RenderWindow | null {
  const safeDisplayDuration = Math.max(0.001, displayDuration)
  const safeAudioDuration = Math.max(0.001, duration || fileDuration || safeDisplayDuration)
  const regionWidthPx = Math.max(1, safeDisplayDuration * pixelsPerSecond)
  const effectiveViewportWidth = Math.max(1, viewportWidth || measuredWidth || regionWidthPx)
  const overscanPx = Math.max(TILE_BUFFER_PX, Math.round(effectiveViewportWidth * 1.5))
  const viewportStartPx = clamp(scrollLeft - regionStart * pixelsPerSecond, 0, regionWidthPx)
  const viewportEndPx = clamp(viewportStartPx + effectiveViewportWidth, 0, regionWidthPx)
  const fallbackAnchorPx = clamp(
    Math.min(viewportStartPx, Math.max(0, regionWidthPx - 1)),
    0,
    Math.max(0, regionWidthPx - 1)
  )
  const safeViewportStartPx = viewportEndPx > viewportStartPx ? viewportStartPx : fallbackAnchorPx
  const safeViewportEndPx = viewportEndPx > viewportStartPx
    ? viewportEndPx
    : clamp(safeViewportStartPx + effectiveViewportWidth, safeViewportStartPx + 1, regionWidthPx)

  // Bei sehr schnellem Scrollen/Zoomen lieber das letzte sinnvolle Fenster halten
  // als den Canvas komplett leer werden zu lassen.
  const leftPx = clamp(Math.floor((safeViewportStartPx - overscanPx) / TILE_SIZE_PX) * TILE_SIZE_PX, 0, regionWidthPx)
  const rightPx = clamp(Math.ceil((safeViewportEndPx + overscanPx) / TILE_SIZE_PX) * TILE_SIZE_PX, leftPx + 1, regionWidthPx)
  const widthPx = Math.max(1, rightPx - leftPx)
  const pitchRate = safeAudioDuration / safeDisplayDuration
  const localDisplayStart = leftPx / pixelsPerSecond
  const localDisplayDuration = widthPx / pixelsPerSecond
  const sourceStart = clamp(sourceOffset + localDisplayStart * pitchRate, 0, Math.max(0, fileDuration || sourceOffset + safeAudioDuration))
  const sourceDuration = clamp(localDisplayDuration * pitchRate, 0.001, Math.max(0.001, sourceOffset + safeAudioDuration - sourceStart))
  const requestPixels = Math.round(clamp(widthPx * getCssPixelRatio(), 16, MAX_REQUEST_PIXELS))

  return {
    leftPx,
    widthPx,
    sourceStart,
    sourceDuration,
    requestPixels
  }
}

// Bildet einen Datenpunkt-Index auf seine X-Position im Canvas ab
function mapX(mapping: DrawMapping, index: number, count: number): number {
  if (count <= 1) return mapping.offsetPx
  return mapping.offsetPx + (index / (count - 1)) * mapping.spanPx
}

function drawZeroLine(ctx: CanvasRenderingContext2D, width: number, y: number): void {
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(width, y)
  ctx.strokeStyle = 'rgba(163, 232, 255, 0.18)'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawChannelLabel(ctx: CanvasRenderingContext2D, label: string, y: number): void {
  ctx.font = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
  ctx.fillStyle = 'rgba(186, 240, 255, 0.52)'
  ctx.fillText(label, 6, y + 12)
}

function drawPeakChannel(
  ctx: CanvasRenderingContext2D,
  channel: WaveformChannel,
  width: number,
  mapping: DrawMapping,
  top: number,
  height: number,
  scale: number,
  gain: number,
  halfWaveform: boolean
): void {
  const minValues = channel.min || []
  const maxValues = channel.max || []
  const count = Math.min(minValues.length, maxValues.length)
  if (count < 2) return

  const fillGradient = ctx.createLinearGradient(0, top, 0, top + height)
  fillGradient.addColorStop(0, 'rgba(0, 229, 255, 0.46)')
  fillGradient.addColorStop(0.5, 'rgba(0, 126, 180, 0.18)')
  fillGradient.addColorStop(1, 'rgba(0, 229, 255, 0.38)')

  const strokeGradient = ctx.createLinearGradient(0, top, 0, top + height)
  strokeGradient.addColorStop(0, 'rgba(163, 244, 255, 0.95)')
  strokeGradient.addColorStop(0.5, 'rgba(0, 168, 232, 0.82)')
  strokeGradient.addColorStop(1, 'rgba(163, 244, 255, 0.95)')

  if (halfWaveform) {
    const baseline = top + height * 0.92
    const amplitudeHeight = height * 0.84
    drawZeroLine(ctx, width, baseline)

    ctx.beginPath()
    ctx.moveTo(mapX(mapping, 0, count), baseline)
    for (let i = 0; i < count; i++) {
      const x = mapX(mapping, i, count)
      const amplitude = Math.max(Math.abs(minValues[i] || 0), Math.abs(maxValues[i] || 0))
      const y = baseline - clamp(amplitude * scale * gain, 0, 1) * amplitudeHeight
      ctx.lineTo(x, y)
    }
    ctx.lineTo(mapX(mapping, count - 1, count), baseline)
    ctx.closePath()
    ctx.fillStyle = fillGradient
    ctx.fill()

    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const x = mapX(mapping, i, count)
      const amplitude = Math.max(Math.abs(minValues[i] || 0), Math.abs(maxValues[i] || 0))
      const y = baseline - clamp(amplitude * scale * gain, 0, 1) * amplitudeHeight
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = strokeGradient
    ctx.lineWidth = 1.35
    ctx.stroke()
    return
  }

  const center = top + height / 2
  const amplitudeHeight = height * 0.43
  drawZeroLine(ctx, width, center)

  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const x = mapX(mapping, i, count)
    const y = center - clamp((maxValues[i] || 0) * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let i = count - 1; i >= 0; i--) {
    const x = mapX(mapping, i, count)
    const y = center - clamp((minValues[i] || 0) * scale * gain, -1, 1) * amplitudeHeight
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fillGradient
  ctx.fill()

  const rmsValues = channel.rms || []
  if (rmsValues.length >= 2) {
    ctx.beginPath()
    for (let i = 0; i < rmsValues.length; i++) {
      const x = mapX(mapping, i, rmsValues.length)
      const y = center - clamp((rmsValues[i] || 0) * scale * gain, 0, 1) * amplitudeHeight
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let i = rmsValues.length - 1; i >= 0; i--) {
      const x = mapX(mapping, i, rmsValues.length)
      const y = center + clamp((rmsValues[i] || 0) * scale * gain, 0, 1) * amplitudeHeight
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(186, 245, 255, 0.18)'
    ctx.fill()
  }

  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const x = mapX(mapping, i, count)
    const y = center - clamp((maxValues[i] || 0) * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = strokeGradient
  ctx.lineWidth = 1.35
  ctx.stroke()

  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const x = mapX(mapping, i, count)
    const y = center - clamp((minValues[i] || 0) * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = strokeGradient
  ctx.lineWidth = 1.35
  ctx.stroke()
}

function drawSampleChannel(
  ctx: CanvasRenderingContext2D,
  channel: WaveformChannel,
  width: number,
  mapping: DrawMapping,
  top: number,
  height: number,
  scale: number,
  gain: number,
  halfWaveform: boolean
): void {
  const samples = channel.samples || []
  if (samples.length < 2) return

  const center = halfWaveform ? top + height * 0.92 : top + height / 2
  const amplitudeHeight = halfWaveform ? height * 0.84 : height * 0.43
  drawZeroLine(ctx, width, center)

  ctx.beginPath()
  for (let i = 0; i < samples.length; i++) {
    const x = mapX(mapping, i, samples.length)
    const sample = halfWaveform ? Math.abs(samples[i] || 0) : (samples[i] || 0)
    const direction = halfWaveform ? 1 : -1
    const y = center - direction * clamp(sample * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = 'rgba(178, 246, 255, 0.96)'
  ctx.lineWidth = 1.35
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()

  const spacing = mapping.spanPx / Math.max(1, samples.length - 1)
  if (spacing >= 5) {
    ctx.fillStyle = 'rgba(220, 252, 255, 0.95)'
    for (let i = 0; i < samples.length; i++) {
      const x = mapX(mapping, i, samples.length)
      const sample = halfWaveform ? Math.abs(samples[i] || 0) : (samples[i] || 0)
      const direction = halfWaveform ? 1 : -1
      const y = center - direction * clamp(sample * scale * gain, -1, 1) * amplitudeHeight
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function WaveformRenderer({
  filePath,
  sourceOffset = 0,
  duration = 0,
  fileDuration = 0,
  displayDuration,
  channel,
  gain = 1.0,
  pixelsPerSecond,
  regionStart = 0,
  scrollLeft = 0,
  viewportWidth = 0,
  sourceChannels = 1
}: WaveformRendererProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastRenderWindowRef = useRef<RenderWindow | null>(null)
  const [waveform, setWaveform] = useState<WaveformWindowData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [halfWaveform, setHalfWaveform] = useState<boolean>(false)
  // Zaehler, um nach Fertigstellung der Peak-Pyramide einmal neu anzufragen
  const [refreshTick, setRefreshTick] = useState(0)
  const lastRendererDiagnosticRef = useRef('')

  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      const nextWidth = Math.max(1, Math.round(rect.width))
      const nextHeight = Math.max(1, Math.round(rect.height))
      setSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) return current
        return {
          width: nextWidth,
          height: nextHeight
        }
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (window.api && typeof window.api.getSettings === 'function') {
      window.api.getSettings().then((settings: any) => {
        if (settings && typeof settings.halfWaveform === 'boolean') {
          setHalfWaveform(settings.halfWaveform)
        }
      })
    }

    const handleSettingsUpdate = (event: any) => {
      if (event.detail && typeof event.detail.halfWaveform === 'boolean') {
        setHalfWaveform(event.detail.halfWaveform)
      }
    }

    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdate as EventListener)
    return () => window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdate as EventListener)
  }, [])

  // Sobald die Peak-Pyramide fuer diese Datei fertig ist, einmal neu anfragen,
  // damit Uebergangsdaten (provisional) durch praezise Daten ersetzt werden.
  useEffect(() => {
    if (!window.api || typeof window.api.onWaveformPyramidReady !== 'function') return
    const unsubscribe = window.api.onWaveformPyramidReady((data: { filePath: string }) => {
      if (data && data.filePath === filePath) {
        setRefreshTick((tick) => tick + 1)
      }
    })
    return unsubscribe
  }, [filePath])

  const renderWindow = useMemo(() => {
    const safeDuration = Math.max(0.001, duration || fileDuration || 1)
    const safeDisplayDuration = Math.max(0.001, displayDuration || safeDuration)
    const measuredWidth = Math.max(1, size.width || safeDisplayDuration * (pixelsPerSecond || 50))
    const effectivePixelsPerSecond = Math.max(1, pixelsPerSecond || measuredWidth / safeDisplayDuration)

    return buildRenderWindow({
      sourceOffset,
      duration: safeDuration,
      displayDuration: safeDisplayDuration,
      fileDuration: Math.max(fileDuration || sourceOffset + safeDuration, sourceOffset + safeDuration),
      pixelsPerSecond: effectivePixelsPerSecond,
      regionStart,
      scrollLeft,
      viewportWidth: viewportWidth || measuredWidth,
      measuredWidth
    })
  }, [displayDuration, duration, fileDuration, pixelsPerSecond, regionStart, scrollLeft, size.width, sourceOffset, viewportWidth])

  const requestKey = renderWindow
    ? [
        filePath,
        channel || 'stereo',
        renderWindow.sourceStart.toFixed(6),
        renderWindow.sourceDuration.toFixed(6),
        renderWindow.requestPixels
      ].join('|')
    : ''

  const effectiveRenderWindow = renderWindow || lastRenderWindowRef.current

  useEffect(() => {
    if (renderWindow) {
      lastRenderWindowRef.current = renderWindow
    }
  }, [renderWindow?.leftPx, renderWindow?.widthPx, renderWindow?.sourceStart, renderWindow?.sourceDuration, renderWindow?.requestPixels])

  useEffect(() => {
    if (!filePath || !renderWindow || renderWindow.sourceDuration <= 0) {
      return
    }

    let active = true
    setError(null)
    const cached = rendererWaveformCache.get(requestKey)
    if (cached) {
      setWaveform(cached)
      return () => {
        active = false
      }
    }

    const timeout = window.setTimeout(() => {
      window.api.getWaveformWindow(filePath, {
        startTime: renderWindow.sourceStart,
        duration: renderWindow.sourceDuration,
        pixels: renderWindow.requestPixels,
        channel
      }).then((data: WaveformWindowData) => {
        if (!active) return
        // Uebergangsantworten nicht cachen — sie werden nach dem
        // pyramid-ready-Event durch praezise Daten ersetzt.
        if (!data.provisional) {
          rememberRendererWaveform(requestKey, data)
        }
        setWaveform(data)
      }).catch((err: any) => {
        if (!active) return
        setError(err?.message || 'Waveform konnte nicht berechnet werden')
      })
    }, WAVEFORM_REQUEST_DEBOUNCE_MS)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [channel, filePath, requestKey, renderWindow?.sourceDuration, refreshTick])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !effectiveRenderWindow) return

    const cssWidth = Math.max(1, effectiveRenderWindow.widthPx)
    const cssHeight = Math.max(1, size.height || 80)
    const dpr = getSafeCanvasRatio(cssWidth, cssHeight)
    canvas.width = Math.max(1, Math.round(cssWidth * dpr))
    canvas.height = Math.max(1, Math.round(cssHeight * dpr))
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = '100%'

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    if (!waveform || waveform.channels.length === 0) {
      const laneCount = channel || sourceChannels < 2 ? 1 : 2
      const diagnosticKey = `empty:${filePath}:${effectiveRenderWindow.leftPx}:${effectiveRenderWindow.widthPx}`
      if (lastRendererDiagnosticRef.current !== diagnosticKey) {
        lastRendererDiagnosticRef.current = diagnosticKey
        writeDiagnosticLog('timeline', 'Waveform-Renderer ohne Daten gezeichnet', {
          filePath,
          leftPx: Math.round(effectiveRenderWindow.leftPx),
          widthPx: Math.round(effectiveRenderWindow.widthPx),
          canvasWidth: cssWidth,
          canvasHeight: cssHeight,
          channel,
          sourceChannels
        })
      }
      for (let i = 0; i < laneCount; i++) {
        const laneTop = (cssHeight / laneCount) * i
        drawZeroLine(ctx, cssWidth, laneTop + (cssHeight / laneCount) / 2)
      }
      return
    }

    // Zeitliche Lage der gelieferten Daten im aktuellen Fenster bestimmen.
    // Bei veralteten Daten (anderer Zoom) sorgt das Mapping dafuer, dass sie
    // an der richtigen Stelle erscheinen, bis die frischen Daten da sind.
    const windowSourceDuration = Math.max(0.000001, effectiveRenderWindow.sourceDuration)
    const relStart = (waveform.startTime - effectiveRenderWindow.sourceStart) / windowSourceDuration
    const relSpan = Math.max(0.000001, waveform.duration / windowSourceDuration)
    const mapping: DrawMapping = {
      offsetPx: relStart * cssWidth,
      spanPx: relSpan * cssWidth
    }

    const drawableChannels = waveform.channels.slice(0, channel ? 1 : 2)
    const laneCount = Math.max(1, drawableChannels.length)
    const laneHeight = cssHeight / laneCount
    const localMaxAbs = Math.max(...drawableChannels.map((waveChannel) => getChannelMaxAbs(waveChannel, waveform.mode)), 0.0001)
    // Stabile Normalisierung auf den Datei-Peak statt auf das Sichtfenster,
    // damit die Amplitude beim Scrollen und Zoomen nicht "pumpt".
    const normPeak = Math.max(waveform.filePeak || waveform.peak || 0, 0.0001)
    const visualScale = clamp(0.92 / normPeak, 0.5, 16)
    const safeGain = clamp(gain || 1, 0, 8)

    if (localMaxAbs < 0.015 || cssWidth > 12000 || waveform.points < 2) {
      const diagnosticKey = `flat:${filePath}:${waveform.mode}:${waveform.startTime.toFixed(5)}:${waveform.duration.toFixed(5)}:${localMaxAbs.toFixed(5)}:${cssWidth}`
      if (lastRendererDiagnosticRef.current !== diagnosticKey) {
        lastRendererDiagnosticRef.current = diagnosticKey
        writeDiagnosticLog('timeline', 'Waveform-Renderer auffaelliges Fenster', {
          filePath,
          mode: waveform.mode,
          startTime: waveform.startTime,
          duration: waveform.duration,
          points: waveform.points,
          peak: waveform.peak,
          localMaxAbs,
          visualScale,
          cssWidth,
          cssHeight,
          leftPx: Math.round(effectiveRenderWindow.leftPx),
          widthPx: Math.round(effectiveRenderWindow.widthPx),
          channelLengths: drawableChannels.map((waveChannel) => getChannelLength(waveChannel, waveform.mode))
        })
      }
    }

    drawableChannels.forEach((waveChannel, index) => {
      const laneTop = index * laneHeight
      const inset = laneCount > 1 ? 3 : 0
      const contentTop = laneTop + inset
      const contentHeight = Math.max(1, laneHeight - inset * 2)
      const length = getChannelLength(waveChannel, waveform.mode)

      if (laneCount > 1) {
        drawChannelLabel(ctx, index === 0 ? 'L' : 'R', contentTop)
      }

      if (length < 2) {
        drawZeroLine(ctx, cssWidth, contentTop + contentHeight / 2)
        return
      }

      if (waveform.mode === 'samples') {
        drawSampleChannel(ctx, waveChannel, cssWidth, mapping, contentTop, contentHeight, visualScale, safeGain, halfWaveform)
      } else {
        drawPeakChannel(ctx, waveChannel, cssWidth, mapping, contentTop, contentHeight, visualScale, safeGain, halfWaveform)
      }
    })
  }, [
    channel,
    gain,
    halfWaveform,
    size.height,
    sourceChannels,
    waveform,
    effectiveRenderWindow?.leftPx,
    effectiveRenderWindow?.widthPx,
    effectiveRenderWindow?.sourceStart,
    effectiveRenderWindow?.sourceDuration
  ])

  return (
    <div ref={wrapperRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {effectiveRenderWindow && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 bottom-0 opacity-95"
          style={{ left: `${effectiveRenderWindow.leftPx}px` }}
        />
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-cyan-100/45">
          Waveform nicht verfuegbar
        </div>
      )}
    </div>
  )
}
```

---

## 9. Schritt 7: Version und Changelog

1. In `package.json`: `"version": "0.13.8"` → `"version": "0.13.9"` (Patch: Verbesserung ohne neue Bedienoberfläche).
2. In `CHANGELOG.md` direkt nach den Kopfzeilen (`# Changelog` + Beschreibungssatz) folgenden Eintrag VOR `## [0.13.8]` einfügen:

```markdown
## [0.13.9] - 2026-07-11

### English

#### Changed
- **Waveform Analysis Pipeline**: Waveform data is now served from a multi-resolution peak pyramid that is computed once per file. Zooming and scrolling no longer trigger repeated audio decoding and respond without noticeable delay.
- **Stable Waveform Scaling**: The displayed waveform amplitude is now normalized to the file's overall peak instead of the visible window, keeping the waveform height consistent while scrolling and zooming.
- **Time-Aligned Rendering**: Waveform data is drawn based on its source time position. During zoom operations the previous view stays correctly aligned until refined data arrives, removing visual jumping.
- **Typed Data Transfer**: Waveform windows are transferred as typed arrays between processes, reducing serialization overhead for large views.

#### Fixed
- Fixed a quadratic buffer accumulation during PCM decoding that slowed down waveform requests for longer windows.

### Deutsch

#### Geändert
- **Waveform-Analyse-Pipeline**: Waveform-Daten werden jetzt aus einer mehrstufigen Peak-Pyramide beantwortet, die einmalig pro Datei berechnet wird. Zoomen und Scrollen lösen keine wiederholte Audio-Dekodierung mehr aus und reagieren ohne spürbare Verzögerung.
- **Stabile Waveform-Skalierung**: Die dargestellte Amplitude wird jetzt auf den Gesamt-Peak der Datei normalisiert statt auf das sichtbare Fenster. Die Wellenhöhe bleibt beim Scrollen und Zoomen konstant.
- **Zeitlich verankertes Zeichnen**: Waveform-Daten werden anhand ihrer Quellzeit positioniert. Beim Zoomen bleibt die bisherige Ansicht korrekt ausgerichtet, bis verfeinerte Daten eintreffen; das bisherige Springen entfällt.
- **Typisierte Datenübertragung**: Waveform-Fenster werden als typisierte Arrays zwischen den Prozessen übertragen, was den Serialisierungsaufwand großer Ansichten senkt.

#### Behoben
- Quadratisch anwachsende Puffer-Zusammenführung beim PCM-Dekodieren behoben, die Anfragen für längere Fenster verlangsamt hat.
```

---

## 10. Verifikation

### 10.1 Typprüfung

```
npm run typecheck
```

Muss ohne Fehler durchlaufen. Bei Fehlern: Meldung lesen, minimalen Fix machen (Tippfehler, fehlende Klammer), erneut prüfen. KEINE Umbauten.

### 10.2 Manueller Test

```
npm run dev
```

Testchoreografie (eine Audiodatei von mindestens einigen Minuten Länge in die Timeline laden):

1. **Erstladung:** Waveform erscheint sofort (Übergangsdaten). Nach kurzer Zeit erscheint im Log `Peak-Pyramide fertig` und die Waveform verfeinert sich einmalig von selbst.
2. **Zoomen (Strg+Mausrad) über viele Stufen rein und raus:** flüssig, keine sichtbaren Aussetzer, kein Springen/Schwimmen der Welle. Die Wellenhöhe bleibt konstant (kein "Pumpen").
3. **Schnelles horizontales Scrollen:** Waveform bleibt sichtbar und stabil.
4. **Sehr starker Zoom** (bis einzelne Samples sichtbar werden): Sample-Punkte mit Verbindungslinie erscheinen; erster Zugriff auf eine neue Stelle darf kurz (<0,5 s) laden, danach flüssig.
5. **Stereo-Datei:** L/R-Spuren getrennt sichtbar. Region-Stereo-Modus auf "nur links"/"nur rechts" stellen → korrekte Einzelkanal-Darstellung.
6. **Mono-Datei:** eine Spur, korrekte Darstellung.
7. **Halbe-Waveform-Einstellung** in den Settings umschalten → Darstellung wechselt live.
8. **Gain-Linie** einer Region ziehen → Waveform skaliert mit, keine Ruckler.

### 10.3 Erwartete Logmeldungen (Debug-Log)

- `Peak-Pyramide fertig` einmal pro geladener Datei.
- `Waveform-Fenster berechnet` mit `source: 'pyramid'` bei normalen Zoomstufen nach Pyramidenbau (nicht mehr `overview-fallback`).
- Bei starkem Zoom `source: 'pcm-chunks'`.

### 10.4 Rollback

Falls etwas grundlegend schiefgeht: `git checkout -- <datei>` für die betroffenen Dateien (alle Änderungen dieses Plans sind lokal, solange nicht committet).

---

## 11. Bekannte Grenzen (bewusst NICHT Teil dieses Plans)

- **Seek-Genauigkeit bei komprimierten Formaten:** PCM-Chunks werden per FFmpeg-Input-Seek dekodiert; bei z. B. MP3 kann der Startpunkt um wenige Millisekunden variieren. Das entspricht dem bisherigen Verhalten und fällt höchstens bei extremem Zoom an Chunk-Grenzen auf. Möglicher Folgeschritt: exakter Output-Seek oder Chunk-Überlappung.
- **Pyramide nur im RAM:** Nach App-Neustart wird sie neu gebaut (einmaliger Decode pro Datei). Möglicher Folgeschritt: Festplatten-Cache im bestehenden `cache`-Ordner.
- **Während des Pyramidenbaus** laufen kurzzeitig zwei Decoder (Overview-Fallback + Pyramide). Das ist beabsichtigt, damit sofort etwas sichtbar ist.

---

## 12. Abschluss

- `task.md` Checkliste abhaken.
- Änderungen NICHT committen/pushen — das ist Phase 3 und erfolgt erst nach separater Freigabe durch David (Drei-Phasen-Workflow aus `.clinerules`).
