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
 * - Fertige Pyramiden werden zusaetzlich als Proxy-Datei auf Platte
 *   gesichert (proxyStore.ts), damit ein Neustart die Analyse nicht erneut
 *   anstossen muss.
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
import { computeFileFingerprint, loadProxyFromDisk, saveProxyToDisk } from './proxyStore'

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
  // Vom Renderer vergebene Kennung fuer die Trace-Logs (Phase A);
  // rein diagnostisch, hat keinen Einfluss auf den Cache-Schluessel.
  traceId?: string
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
  fingerprint: string
  // Globaler Peak der gesamten Datei (aus der Pyramide); fuer stabile Skalierung
  filePeak?: number
  // true = Uebergangsantwort, solange die Pyramide noch baut
  provisional?: boolean
  // Spiegelt request.traceId, damit der Renderer Anfrage und Antwort im Log verketten kann
  traceId?: string
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
const MAX_WINDOW_CACHE_BYTES = 64 * 1024 * 1024 // 64 MB Budget
const MAX_OVERVIEW_CACHE_ENTRIES = 12
const MAX_POINTS = 120000
const MAX_SAMPLE_MODE_POINTS = 200_000
const OVERVIEW_MAX_FRAMES = 900_000
const OVERVIEW_MAX_SAMPLE_RATE = 24000
// Unterhalb dieser Samples-pro-Pixel-Grenze werden echte Samples gezeichnet
const SAMPLE_MODE_MAX_SPP = 4
// Schutz: laengere Fenster werden immer aus der Pyramide beantwortet
const MAX_PCM_WINDOW_SECONDS = 120
// PCM-Chunks liegen an einem festen 10-Sekunden-Raster
const PCM_CHUNK_SECONDS = 10
const MAX_PCM_CHUNKS = 24
const MAX_PYRAMID_ENTRIES = 6

// Schaetzt den Speicherverbrauch einer WaveformWindowResponse in Bytes.
// Jedes Array in einem Kanal (min, max, rms, samples) enthaelt Fließkommazahlen (4 Bytes pro Wert).
// Wir addieren die Laengen dieser Arrays ueber alle Kanaele und multiplizieren mit 4.
function estimateWindowResponseBytes(response: WaveformWindowResponse): number {
  let valuesCount = 0
  for (const ch of response.channels) {
    if (ch.min) valuesCount += ch.min.length
    if (ch.max) valuesCount += ch.max.length
    if (ch.rms) valuesCount += ch.rms.length
    if (ch.samples) valuesCount += ch.samples.length
  }
  return valuesCount * 4
}

function getWindowCacheBytes(): number {
  let sum = 0
  for (const response of windowCache.values()) {
    sum += estimateWindowResponseBytes(response)
  }
  return sum
}

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

function rememberWindow(key: string, response: WaveformWindowResponse): void {
  if (windowCache.has(key)) {
    windowCache.delete(key)
  }
  windowCache.set(key, response)

  while (windowCache.size > MAX_WINDOW_CACHE_ENTRIES || getWindowCacheBytes() > MAX_WINDOW_CACHE_BYTES) {
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
  const fingerprint = computeFileFingerprint(filePath)
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

// Meldet den Analysefortschritt beim erstmaligen Aufbau einer Pyramide
// (Datei-Import), damit der Clip in der Timeline einen Ladezustand zeigen kann.
function broadcastPyramidProgress(filePath: string, percent: number): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('waveform:pyramid-progress', { filePath, percent })
    }
  }
}

// Baut die Pyramide fuer eine Datei einmal durch (ein Streaming-Decode-Versuch)
function buildPyramidOnce(
  filePath: string,
  info: MediaInfo,
  onProgress?: (percent: number) => void
): Promise<PeakPyramid> {
  const startedAt = Date.now()
  const builder = new PyramidBuilder(info.sampleRate, info.channels)
  const expectedFrames = Math.max(1, info.duration * info.sampleRate)
  let framesSeen = 0
  let lastReportedPercent = -1
  let lastReportedAt = 0

  return decodePcmStream(filePath, info.sampleRate, info.channels, (samples) => {
    builder.push(samples)
    if (!onProgress) return
    framesSeen += Math.floor(samples.length / Math.max(1, info.channels))
    const percent = Math.min(99, Math.floor((framesSeen / expectedFrames) * 100))
    const now = Date.now()
    if (percent !== lastReportedPercent && now - lastReportedAt > 150) {
      lastReportedPercent = percent
      lastReportedAt = now
      onProgress(percent)
    }
  }).then(() => {
    const pyramid = builder.finish()
    onProgress?.(100)
    logger.info('Waveform', 'Peak-Pyramide fertig', {
      filePath,
      frames: pyramid.frames,
      levels: pyramid.levels.length,
      filePeak: Number(pyramid.filePeak.toFixed(4)),
      buildMs: Date.now() - startedAt
    })
    return pyramid
  })
}

// Startet (einmalig pro Datei) den Pyramidenaufbau: zuerst wird ein zuvor
// gespeicherter Proxy von der Platte geladen; nur wenn keiner existiert,
// wird per Streaming-Decode neu analysiert (mit einem automatischen
// Wiederholungsversuch bei sporadischen Decode-Fehlern) und danach als
// Proxy-Datei gesichert. Verwaltet zudem den RAM-LRU-Cache.
function ensurePyramid(filePath: string, info: MediaInfo): PyramidState {
  const existing = pyramidCache.get(info.fingerprint)
  if (existing) {
    pyramidCache.delete(info.fingerprint)
    pyramidCache.set(info.fingerprint, existing)
    return existing
  }

  // Versuche zuerst, den Proxy synchron von Platte zu laden
  const fromDisk = loadProxyFromDisk(info.fingerprint)
  if (fromDisk) {
    logger.info('Waveform', 'Peak-Pyramide von Proxy-Datei geladen (synchron)', {
      filePath,
      frames: fromDisk.frames,
      levels: fromDisk.levels.length
    })
    const state: PyramidState = {
      status: 'ready',
      pyramid: fromDisk,
      promise: Promise.resolve(fromDisk)
    }
    broadcastPyramidReady(filePath)
    pyramidCache.set(info.fingerprint, state)
    evictPyramidCacheIfNeeded()
    return state
  }

  const state: PyramidState = {
    status: 'building',
    promise: null as unknown as Promise<PeakPyramid>
  }

  const buildAndPersist = async (): Promise<PeakPyramid> => {
    const onProgress = (percent: number) => broadcastPyramidProgress(filePath, percent)
    let pyramid: PeakPyramid
    try {
      pyramid = await buildPyramidOnce(filePath, info, onProgress)
    } catch (err) {
      // Ein Fehlversuch (z. B. "Output stream closed") wird nicht sofort
      // als endgueltig gewertet — ein zweiter Versuch behebt in der Praxis
      // die meisten dieser sporadischen FFmpeg-Stream-Abbrueche.
      logger.warn('Waveform', 'Peak-Pyramide fehlgeschlagen, versuche erneut', err)
      pyramid = await buildPyramidOnce(filePath, info, onProgress)
    }
    saveProxyToDisk(info.fingerprint, filePath, pyramid)
    return pyramid
  }

  state.promise = buildAndPersist()
    .then((pyramid) => {
      state.status = 'ready'
      state.pyramid = pyramid
      broadcastPyramidReady(filePath)
      return pyramid
    })
    .catch((err) => {
      state.status = 'error'
      pyramidCache.delete(info.fingerprint)
      logger.error('Waveform', 'Peak-Pyramide endgueltig fehlgeschlagen', err)
      throw err
    })
  // Verhindert unhandled-rejection-Warnungen, falls niemand wartet
  state.promise.catch(() => {})

  pyramidCache.set(info.fingerprint, state)
  evictPyramidCacheIfNeeded()
  return state
}

function evictPyramidCacheIfNeeded(): void {
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
    fingerprint: info.fingerprint,
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
    const samples = new Float32Array(frames)
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
    fingerprint: info.fingerprint,
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
    fingerprint: info.fingerprint,
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
    fingerprint: info.fingerprint,
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

  const traceId = request.traceId
  const cached = windowCache.get(key)
  if (cached) {
    windowCache.delete(key)
    windowCache.set(key, cached)
    logger.debug('Waveform', 'Waveform-Fenster aus Cache beantwortet', { traceId, filePath, startTime, duration, pixels })
    return { ...cached, traceId }
  }

  const inflight = inflightWindowCache.get(key)
  if (inflight) {
    return inflight.then((response) => ({ ...response, traceId }))
  }

  const requestStartedAt = Date.now()
  const requestPromise = (async () => {
    const samplesPerPixel = (duration * info.sampleRate) / pixels
    const channelIndex = request.channel === 'right'
      ? Math.min(1, info.channels - 1)
      : request.channel === 'left' ? 0 : undefined
    const pyramidState = ensurePyramid(filePath, info)

    let response: WaveformWindowResponse
    let source: 'pyramid' | 'overview-fallback' | 'pcm-chunks'
    const decodeStartedAt = Date.now()

    if (samplesPerPixel >= PYRAMID_BASE_SPP || duration > MAX_PCM_WINDOW_SECONDS) {
      if (pyramidState.status === 'ready' && pyramidState.pyramid) {
        response = buildPyramidResponse(pyramidState.pyramid, info, startTime, duration, pixels, channelIndex)
        source = 'pyramid'
      } else {
        // Uebergangsantworten nicht cachen — sie werden nach dem
        // pyramid-ready-Event durch praezise Daten ersetzt.
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

    const decodeMs = Date.now() - decodeStartedAt

    // Globalen Datei-Peak mitgeben, sobald die Pyramide ihn kennt
    if (pyramidState.status === 'ready' && pyramidState.pyramid) {
      response.filePeak = pyramidState.pyramid.filePeak
    }

    if (!response.provisional) {
      rememberWindow(key, response)
    }
    response.traceId = traceId
    logger.debug('Waveform', 'Waveform-Fenster berechnet', {
      traceId,
      filePath,
      startTime,
      duration,
      pixels,
      source,
      mode: response.mode,
      points: response.points,
      channels: response.channels.length,
      decodeMs,
      totalMs: Date.now() - requestStartedAt
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
