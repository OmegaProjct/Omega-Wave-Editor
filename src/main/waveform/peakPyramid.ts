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
