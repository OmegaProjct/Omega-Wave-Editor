import React, { useEffect, useMemo, useRef, useState } from 'react'
import { shouldLogDiagnostic, writeDiagnosticLog } from '../lib/diagnosticLogging'

function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 150, b: 205 }
}

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
  fingerprint?: string
  filePeak?: number
  provisional?: boolean
  traceId?: string
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
const lastKnownFingerprintByPath = new Map<string, string>()

// Laufende Kennung fuer Trace-Logs (Phase A): jede Anfrage bekommt eine ID,
// die durch Renderer, IPC und Hauptprozess-Log mitgereicht wird.
let waveformTraceCounter = 0
function nextWaveformTraceId(): string {
  waveformTraceCounter += 1
  return `wf-${waveformTraceCounter}`
}

// Bitmap-Cache (Phase B3): haelt bereits fertig gezeichnete Canvas-Inhalte
// pro (Datei, Kanal, Fenster, Groesse, Darstellung) vor. Bei einem Treffer
// wird nur noch kopiert (drawImage), statt Gradient und Pfade neu zu
// berechnen — macht das Wiederkehren zu einem zuvor gesehenen Zoom/Ausschnitt
// praktisch kostenlos. Uebergangsdaten (provisional) werden nie gecacht,
// damit spaeter keine veraltete Grobansicht faelschlich wiederverwendet wird.
type WaveformTileBitmap = { canvas: HTMLCanvasElement; width: number; height: number }
const waveformTileBitmapCache = new Map<string, WaveformTileBitmap>()
const MAX_TILE_BITMAP_ENTRIES = 48

const MAX_TILE_BITMAP_BYTES = 96 * 1024 * 1024 // 96 MB Budget

// Schaetzt den Speicherverbrauch eines Bitmap-Eintrags in Bytes.
// Da Canvas-Bitmaps intern im RGBA-Format (4 Bytes pro Pixel) abgelegt sind,
// schaetzen wir den Speicher ueber width * height * 4.
// Dies ist ein Schätzwert, da der Browser interne Optimierungen vornehmen kann,
// aber er reflektiert die tatsächliche Größenordnung des Bitmaps.
function estimateTileBitmapBytes(entry: WaveformTileBitmap): number {
  return entry.width * entry.height * 4
}

function getTileBitmapCacheBytes(): number {
  let sum = 0
  for (const entry of waveformTileBitmapCache.values()) {
    sum += estimateTileBitmapBytes(entry)
  }
  return sum
}

function rememberTileBitmap(key: string, entry: WaveformTileBitmap): void {
  if (waveformTileBitmapCache.has(key)) {
    waveformTileBitmapCache.delete(key)
  }
  waveformTileBitmapCache.set(key, entry)

  while (waveformTileBitmapCache.size > MAX_TILE_BITMAP_ENTRIES || getTileBitmapCacheBytes() > MAX_TILE_BITMAP_BYTES) {
    const oldest = waveformTileBitmapCache.keys().next().value
    if (!oldest) break
    waveformTileBitmapCache.delete(oldest)
  }
}

function getTileBitmap(key: string): WaveformTileBitmap | undefined {
  const entry = waveformTileBitmapCache.get(key)
  if (entry) {
    // Zuletzt genutzte Eintraege nach hinten verschieben (LRU)
    waveformTileBitmapCache.delete(key)
    waveformTileBitmapCache.set(key, entry)
  }
  return entry
}

// Geometrie-Schnappschuss des zuletzt tatsaechlich gezeichneten Canvas-Inhalts.
// Bis neue Daten eintreffen, wird dieser Inhalt bei Zoom-/Scroll-Aenderungen
// nur noch per CSS gestreckt/verschoben (siehe Reposition-Effekt), statt neu
// gezeichnet zu werden ("Stretch-then-Refine").
type PaintedWindow = {
  leftPx: number
  widthPx: number
  sourceStart: number
  sourceDuration: number
}

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

function drawZeroLine(ctx: CanvasRenderingContext2D, width: number, y: number, colorRgbStr: string): void {
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(width, y)
  ctx.strokeStyle = `rgba(${colorRgbStr}, 0.12)`
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
  halfWaveform: boolean,
  waveformColor: string,
  waveformOpacity: number,
  waveformShowRms: boolean
): void {
  const minValues = channel.min || []
  const maxValues = channel.max || []
  const count = Math.min(minValues.length, maxValues.length)
  if (count < 2) return

  const { r, g, b } = hexToRgb(waveformColor)
  const colorRgbStr = `${r}, ${g}, ${b}`
  const rKern = Math.min(255, Math.round(r + (255 - r) * 0.5))
  const gKern = Math.min(255, Math.round(g + (255 - g) * 0.5))
  const bKern = Math.min(255, Math.round(b + (255 - b) * 0.5))

  if (halfWaveform) {
    const baseline = top + height * 0.92
    const amplitudeHeight = height * 0.84
    drawZeroLine(ctx, width, baseline, colorRgbStr)

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
    ctx.fillStyle = `rgba(${colorRgbStr}, ${waveformOpacity})`
    ctx.fill()

    const rmsValues = channel.rms || []
    if (waveformShowRms && rmsValues.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(mapX(mapping, 0, rmsValues.length), baseline)
      for (let i = 0; i < rmsValues.length; i++) {
        const x = mapX(mapping, i, rmsValues.length)
        const y = baseline - clamp((rmsValues[i] || 0) * scale * gain, 0, 1) * amplitudeHeight
        ctx.lineTo(x, y)
      }
      ctx.lineTo(mapX(mapping, rmsValues.length - 1, rmsValues.length), baseline)
      ctx.closePath()
      ctx.fillStyle = `rgba(${rKern}, ${gKern}, ${bKern}, ${waveformOpacity})`
      ctx.fill()
    }

    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const x = mapX(mapping, i, count)
      const amplitude = Math.max(Math.abs(minValues[i] || 0), Math.abs(maxValues[i] || 0))
      const y = baseline - clamp(amplitude * scale * gain, 0, 1) * amplitudeHeight
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = `rgba(${rKern}, ${gKern}, ${bKern}, 0.35)`
    ctx.lineWidth = 1
    ctx.stroke()
    return
  }

  const center = top + height / 2
  const amplitudeHeight = height * 0.43
  drawZeroLine(ctx, width, center, colorRgbStr)

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
  ctx.fillStyle = `rgba(${colorRgbStr}, ${waveformOpacity})`
  ctx.fill()

  const rmsValues = channel.rms || []
  if (waveformShowRms && rmsValues.length >= 2) {
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
    ctx.fillStyle = `rgba(${rKern}, ${gKern}, ${bKern}, ${waveformOpacity})`
    ctx.fill()
  }

  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const x = mapX(mapping, i, count)
    const y = center - clamp((maxValues[i] || 0) * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = `rgba(${rKern}, ${gKern}, ${bKern}, 0.35)`
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const x = mapX(mapping, i, count)
    const y = center - clamp((minValues[i] || 0) * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = `rgba(${rKern}, ${gKern}, ${bKern}, 0.35)`
  ctx.lineWidth = 1
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
  halfWaveform: boolean,
  waveformColor: string,
  waveformOpacity: number
): void {
  const samples = channel.samples || []
  if (samples.length < 2) return

  const center = halfWaveform ? top + height * 0.92 : top + height / 2
  const amplitudeHeight = halfWaveform ? height * 0.84 : height * 0.43

  const { r, g, b } = hexToRgb(waveformColor)
  const colorRgbStr = `${r}, ${g}, ${b}`
  const rKern = Math.min(255, Math.round(r + (255 - r) * 0.5))
  const gKern = Math.min(255, Math.round(g + (255 - g) * 0.5))
  const bKern = Math.min(255, Math.round(b + (255 - b) * 0.5))

  drawZeroLine(ctx, width, center, colorRgbStr)

  ctx.beginPath()
  ctx.moveTo(mapX(mapping, 0, samples.length), center)
  for (let i = 0; i < samples.length; i++) {
    const x = mapX(mapping, i, samples.length)
    const sample = halfWaveform ? Math.abs(samples[i] || 0) : (samples[i] || 0)
    const direction = halfWaveform ? 1 : -1
    const y = center - direction * clamp(sample * scale * gain, -1, 1) * amplitudeHeight
    ctx.lineTo(x, y)
  }
  ctx.lineTo(mapX(mapping, samples.length - 1, samples.length), center)
  ctx.closePath()
  ctx.fillStyle = `rgba(${colorRgbStr}, ${waveformOpacity * 0.8})`
  ctx.fill()

  ctx.beginPath()
  for (let i = 0; i < samples.length; i++) {
    const x = mapX(mapping, i, samples.length)
    const sample = halfWaveform ? Math.abs(samples[i] || 0) : (samples[i] || 0)
    const direction = halfWaveform ? 1 : -1
    const y = center - direction * clamp(sample * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = `rgba(${rKern}, ${gKern}, ${bKern}, 1.0)`
  ctx.lineWidth = 1.35
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()

  const spacing = mapping.spanPx / Math.max(1, samples.length - 1)
  if (spacing >= 5) {
    ctx.fillStyle = `rgba(${rKern}, ${gKern}, ${bKern}, 1.0)`
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
  // Geometrie des zuletzt gemalten Bitmaps; treibt den Reposition-Effekt
  // (CSS-Stretch bei Zoom/Scroll, bevor frische Daten eintreffen).
  const paintedWindowRef = useRef<PaintedWindow | null>(null)
  const [waveform, setWaveform] = useState<WaveformWindowData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [halfWaveform, setHalfWaveform] = useState<boolean>(false)
  const [waveformColor, setWaveformColor] = useState<string>('#0096cd')
  const [waveformOpacity, setWaveformOpacity] = useState<number>(0.9)
  const [waveformShowRms, setWaveformShowRms] = useState<boolean>(true)
  // Zaehler, um nach Fertigstellung der Peak-Pyramide einmal neu anzufragen
  const [refreshTick, setRefreshTick] = useState(0)
  // Analysefortschritt (Phase C, Proxy-Dateien): waehrend eine Datei zum
  // ersten Mal analysiert wird, zeigt der Clip einen dezenten Ladehinweis.
  // Bleibt null, wenn die Pyramide bereits im Cache/als Proxy vorliegt.
  const [pyramidProgress, setPyramidProgress] = useState<number | null>(null)
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
        if (settings) {
          if (typeof settings.halfWaveform === 'boolean') {
            setHalfWaveform(settings.halfWaveform)
          }
          if (typeof settings.waveformColor === 'string') {
            setWaveformColor(settings.waveformColor)
          }
          if (typeof settings.waveformOpacity === 'number') {
            setWaveformOpacity(settings.waveformOpacity)
          }
          if (typeof settings.waveformShowRms === 'boolean') {
            setWaveformShowRms(settings.waveformShowRms)
          }
        }
      })
    }

    const handleSettingsUpdate = (event: any) => {
      if (event.detail) {
        if (typeof event.detail.halfWaveform === 'boolean') {
          setHalfWaveform(event.detail.halfWaveform)
        }
        if (typeof event.detail.waveformColor === 'string') {
          setWaveformColor(event.detail.waveformColor)
        }
        if (typeof event.detail.waveformOpacity === 'number') {
          setWaveformOpacity(event.detail.waveformOpacity)
        }
        if (typeof event.detail.waveformShowRms === 'boolean') {
          setWaveformShowRms(event.detail.waveformShowRms)
        }
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
        setPyramidProgress(null)
      }
    })
    return unsubscribe
  }, [filePath])

  // Analysefortschritt der Datei verfolgen (nur relevant beim allerersten
  // Zugriff auf eine Datei ohne vorhandenen Proxy).
  useEffect(() => {
    if (!window.api || typeof window.api.onWaveformPyramidProgress !== 'function') return
    const unsubscribe = window.api.onWaveformPyramidProgress((data: { filePath: string; percent: number }) => {
      if (data && data.filePath === filePath) {
        setPyramidProgress(data.percent >= 100 ? null : data.percent)
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
      if (shouldLogDiagnostic('waveformTrace')) {
        writeDiagnosticLog('waveformTrace', 'Waveform-Anfrage aus Renderer-Cache', {
          filePath,
          requestPixels: renderWindow.requestPixels,
          cacheHit: true
        })
      }
      setWaveform(cached)
      return () => {
        active = false
      }
    }

    const traceId = nextWaveformTraceId()
    const requestedAt = performance.now()

    const timeout = window.setTimeout(() => {
      window.api.getWaveformWindow(filePath, {
        startTime: renderWindow.sourceStart,
        duration: renderWindow.sourceDuration,
        pixels: renderWindow.requestPixels,
        channel,
        traceId
      }).then((data: WaveformWindowData) => {
        if (!active) return

        if (data.fingerprint) {
          const knownFingerprint = lastKnownFingerprintByPath.get(filePath)
          if (knownFingerprint && knownFingerprint !== data.fingerprint) {
            // Fingerprint hat sich geaendert! Caches leeren.
            for (const key of Array.from(rendererWaveformCache.keys())) {
              if (key.startsWith(filePath + '|')) {
                rendererWaveformCache.delete(key)
              }
            }
            for (const key of Array.from(waveformTileBitmapCache.keys())) {
              if (key.startsWith(filePath + '|')) {
                waveformTileBitmapCache.delete(key)
              }
            }
          }
          lastKnownFingerprintByPath.set(filePath, data.fingerprint)
        }

        const ipcMs = performance.now() - requestedAt
        if (shouldLogDiagnostic('waveformTrace')) {
          writeDiagnosticLog('waveformTrace', 'Waveform-Antwort im Renderer eingetroffen', {
            traceId,
            filePath,
            requestPixels: renderWindow.requestPixels,
            cacheHit: false,
            provisional: !!data.provisional,
            mode: data.mode,
            points: data.points,
            ipcMs: Math.round(ipcMs)
          })
        }
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

  // Paint-Effekt: zeichnet den Canvas-Inhalt neu. Laeuft NUR, wenn sich die
  // Daten oder Darstellungs-Einstellungen aendern — nicht bei jeder Zoom-/
  // Scroll-Geometrieaenderung. Diese wird stattdessen vom Reposition-Effekt
  // (unten) per CSS behandelt, solange die Daten noch die alten sind.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !effectiveRenderWindow) return

    const drawStartedAt = performance.now()
    const { r, g, b } = hexToRgb(waveformColor)
    const colorRgbStr = `${r}, ${g}, ${b}`
    const cssWidth = Math.max(1, effectiveRenderWindow.widthPx)
    const cssHeight = Math.max(1, size.height || 80)
    const dpr = getSafeCanvasRatio(cssWidth, cssHeight)
    canvas.width = Math.max(1, Math.round(cssWidth * dpr))
    canvas.height = Math.max(1, Math.round(cssHeight * dpr))
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = '100%'

    // Frisch gemalter Inhalt: an der richtigen Stelle positionieren und
    // jede vom Reposition-Effekt gesetzte Zwischen-Verzerrung zuruecksetzen.
    canvas.style.left = `${effectiveRenderWindow.leftPx}px`
    canvas.style.transform = 'none'
    paintedWindowRef.current = {
      leftPx: effectiveRenderWindow.leftPx,
      widthPx: effectiveRenderWindow.widthPx,
      sourceStart: effectiveRenderWindow.sourceStart,
      sourceDuration: effectiveRenderWindow.sourceDuration
    }

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
        drawZeroLine(ctx, cssWidth, laneTop + (cssHeight / laneCount) / 2, colorRgbStr)
      }
      if (shouldLogDiagnostic('waveformTrace')) {
        writeDiagnosticLog('waveformTrace', 'Waveform gezeichnet (ohne Daten)', {
          filePath,
          widthPx: Math.round(cssWidth),
          drawMs: Math.round(performance.now() - drawStartedAt)
        })
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

    // Bitmap-Cache (Phase B3): bereits fertig gezeichnete Ansichten desselben
    // Ausschnitts/Zooms nur kopieren statt neu zu zeichnen. Uebergangsdaten
    // werden nie ueber den Cache bedient, um spaeter keine veraltete
    // Grobansicht faelschlich als Ergebnis zu zeigen.
    const tileCacheKey = waveform.provisional ? null : [
      filePath,
      channel || 'stereo',
      waveform.mode,
      waveform.startTime.toFixed(6),
      waveform.duration.toFixed(6),
      Math.round(cssWidth),
      Math.round(cssHeight),
      Math.round(dpr * 100),
      halfWaveform ? 1 : 0,
      Math.round(safeGain * 1000),
      waveformColor,
      waveformOpacity.toFixed(2),
      waveformShowRms ? 1 : 0
    ].join('|')

    const cachedBitmap = tileCacheKey ? getTileBitmap(tileCacheKey) : undefined
    if (cachedBitmap && cachedBitmap.width === canvas.width && cachedBitmap.height === canvas.height) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(cachedBitmap.canvas, 0, 0)
      if (shouldLogDiagnostic('waveformTrace')) {
        writeDiagnosticLog('waveformTrace', 'Waveform aus Bitmap-Cache kopiert', {
          traceId: waveform.traceId,
          filePath,
          widthPx: Math.round(cssWidth),
          drawMs: Math.round(performance.now() - drawStartedAt)
        })
      }
      return
    }

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
        drawZeroLine(ctx, cssWidth, contentTop + contentHeight / 2, colorRgbStr)
        return
      }

      if (waveform.mode === 'samples') {
        drawSampleChannel(ctx, waveChannel, cssWidth, mapping, contentTop, contentHeight, visualScale, safeGain, halfWaveform, waveformColor, waveformOpacity)
      } else {
        drawPeakChannel(ctx, waveChannel, cssWidth, mapping, contentTop, contentHeight, visualScale, safeGain, halfWaveform, waveformColor, waveformOpacity, waveformShowRms)
      }
    })

    // Frisch gezeichneten Inhalt fuer spaetere Wiederverwendung sichern.
    if (tileCacheKey) {
      const snapshot = document.createElement('canvas')
      snapshot.width = canvas.width
      snapshot.height = canvas.height
      const snapshotCtx = snapshot.getContext('2d')
      if (snapshotCtx) {
        snapshotCtx.drawImage(canvas, 0, 0)
        rememberTileBitmap(tileCacheKey, { canvas: snapshot, width: snapshot.width, height: snapshot.height })
      }
    }

    if (shouldLogDiagnostic('waveformTrace')) {
      writeDiagnosticLog('waveformTrace', 'Waveform gezeichnet', {
        traceId: waveform.traceId,
        filePath,
        mode: waveform.mode,
        points: waveform.points,
        channels: drawableChannels.length,
        widthPx: Math.round(cssWidth),
        provisional: !!waveform.provisional,
        drawMs: Math.round(performance.now() - drawStartedAt)
      })
    }
    // Bewusst OHNE effectiveRenderWindow.* in den Deps: eine reine Zoom-/
    // Scroll-Geometrieaenderung (ohne neue Daten) soll hier KEIN Neuzeichnen
    // ausloesen — das uebernimmt der Reposition-Effekt unten per CSS.
    // Sobald sich `waveform` aendert, liest dieser Effekt trotzdem die
    // jeweils aktuelle Fenstergeometrie (sie ist Teil des Closures).
  }, [channel, gain, halfWaveform, size.height, sourceChannels, waveform, waveformColor, waveformOpacity, waveformShowRms])

  // Reposition-Effekt: laeuft bei jeder Zoom-/Scroll-Geometrieaenderung.
  // Solange der Paint-Effekt noch nicht mit frischen Daten nachgezogen hat,
  // wird der vorhandene Canvas-Inhalt per CSS sofort an die neue Geometrie
  // angenaehert (verschoben + gestreckt) — kein Neuzeichnen, keine Wartezeit,
  // kein kurzzeitig leerer Canvas ("Stretch-then-Refine").
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !effectiveRenderWindow) return

    const painted = paintedWindowRef.current
    if (!painted) {
      canvas.style.left = `${effectiveRenderWindow.leftPx}px`
      canvas.style.transform = 'none'
      return
    }

    const ppsOld = painted.widthPx / Math.max(0.000001, painted.sourceDuration)
    const ppsNew = effectiveRenderWindow.widthPx / Math.max(0.000001, effectiveRenderWindow.sourceDuration)
    const scaleX = clamp(ppsNew / Math.max(0.000001, ppsOld), 0.05, 20)
    const targetLeftForPaintedStart = effectiveRenderWindow.leftPx
      + (painted.sourceStart - effectiveRenderWindow.sourceStart) * ppsNew
    const translateX = targetLeftForPaintedStart - painted.leftPx

    canvas.style.left = `${painted.leftPx}px`
    canvas.style.transformOrigin = '0 0'
    canvas.style.transform = (Math.abs(scaleX - 1) < 0.001 && Math.abs(translateX) < 0.5)
      ? 'none'
      : `translateX(${translateX}px) scaleX(${scaleX})`
  }, [
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
        />
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-cyan-100/45">
          Waveform nicht verfuegbar
        </div>
      )}
      {pyramidProgress !== null && (
        <div className="absolute inset-x-0 bottom-0 h-3 flex items-center px-1.5">
          <div className="w-full h-[3px] rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-omega-accent/80 transition-[width] duration-150"
              style={{ width: `${Math.max(4, pyramidProgress)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
