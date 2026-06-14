import * as fs from 'fs'
import * as path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import { logger } from '../logger'

export type WaveformChannel = {
  min?: number[]
  max?: number[]
  rms?: number[]
  samples?: number[]
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

const metadataCache = new Map<string, MediaInfo>()
const windowCache = new Map<string, WaveformWindowResponse>()
const overviewCache = new Map<string, Promise<DecodedPcm>>()

const MAX_WINDOW_CACHE_ENTRIES = 80
const MAX_OVERVIEW_CACHE_ENTRIES = 12
const MAX_POINTS = 10000
const MAX_NATIVE_WINDOW_SAMPLES = 1_500_000
const MAX_SAMPLE_MODE_POINTS = 48000
const OVERVIEW_MAX_FRAMES = 900_000
const OVERVIEW_MAX_SAMPLE_RATE = 24000

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

function decodePcmWindow(
  filePath: string,
  info: MediaInfo,
  startTime: number,
  duration: number,
  channel?: 'left' | 'right',
  targetSampleRate?: number
): Promise<DecodedPcm> {
  const sourceSamples = duration * info.sampleRate
  const decodeSampleRate = targetSampleRate || (sourceSamples > MAX_NATIVE_WINDOW_SAMPLES
    ? clamp(Math.ceil(MAX_NATIVE_WINDOW_SAMPLES / duration), 4000, info.sampleRate)
    : info.sampleRate)
  const outputChannels = channel ? 1 : info.channels

  return new Promise((resolve, reject) => {
    let pcmBuffer = Buffer.alloc(0)
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
      pcmBuffer = Buffer.concat([pcmBuffer, chunk])
    })
  })
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
  const endFrame = clamp(Math.ceil((startTime + duration) * decoded.sampleRate), startFrame + 1, totalFrames)
  const startIndex = startFrame * decoded.channels
  const endIndex = endFrame * decoded.channels
  const data = new Float32Array(endIndex - startIndex)
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
  decoded: { data: Float32Array; channels: number; sampleRate: number },
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
  decoded: { data: Float32Array; channels: number; sampleRate: number },
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
    startTime.toFixed(3),
    duration.toFixed(3),
    pixels
  ].join('|')

  const cached = windowCache.get(key)
  if (cached) {
    windowCache.delete(key)
    windowCache.set(key, cached)
    return cached
  }

  const nativeFrameEstimate = duration * info.sampleRate
  const nativeSamplesPerPixel = nativeFrameEstimate / pixels
  const useNativeWindow = nativeSamplesPerPixel <= 96 && nativeFrameEstimate <= MAX_NATIVE_WINDOW_SAMPLES
  const decoded = useNativeWindow
    ? await decodePcmWindow(filePath, info, startTime, duration, request.channel)
    : sliceDecodedWindow(await getOverviewPcm(filePath, info, request.channel), startTime, duration)
  const frames = Math.floor(decoded.data.length / decoded.channels)
  const response = useNativeWindow && nativeSamplesPerPixel <= 12 && frames <= MAX_SAMPLE_MODE_POINTS
    ? buildSampleResponse(decoded, info, startTime, duration)
    : buildPeakResponse(decoded, info, startTime, duration, pixels)

  rememberWindow(key, response)
  logger.debug('Waveform', 'Waveform-Fenster berechnet', {
    filePath,
    startTime,
    duration,
    pixels,
    native: useNativeWindow,
    mode: response.mode,
    points: response.points,
    channels: response.channels.length
  })
  return response
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
    return firstChannel.samples.map((sample) => Math.abs(sample))
  }

  const minValues = firstChannel.min || []
  const maxValues = firstChannel.max || []
  return maxValues.map((max, index) => Math.max(Math.abs(max), Math.abs(minValues[index] || 0)))
}
