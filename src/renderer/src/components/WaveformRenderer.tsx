import React, { useEffect, useMemo, useRef, useState } from 'react'

type WaveformChannel = {
  min?: number[]
  max?: number[]
  rms?: number[]
  samples?: number[]
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

const TILE_SIZE_PX = 512
const TILE_BUFFER_PX = 768
const MAX_REQUEST_PIXELS = 10000
const MAX_DEVICE_PIXEL_RATIO = 2

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getChannelLength(channel: WaveformChannel | undefined, mode: 'peaks' | 'samples'): number {
  if (!channel) return 0
  if (mode === 'samples') return channel.samples?.length || 0
  return Math.min(channel.min?.length || 0, channel.max?.length || 0)
}

function getCssPixelRatio(): number {
  return clamp(window.devicePixelRatio || 1, 1, MAX_DEVICE_PIXEL_RATIO)
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
  const viewportStartPx = clamp(scrollLeft - regionStart * pixelsPerSecond, 0, regionWidthPx)
  const viewportEndPx = clamp(viewportStartPx + Math.max(1, viewportWidth || measuredWidth || regionWidthPx), 0, regionWidthPx)

  if (viewportEndPx <= viewportStartPx) return null

  const leftPx = clamp(Math.floor((viewportStartPx - TILE_BUFFER_PX) / TILE_SIZE_PX) * TILE_SIZE_PX, 0, regionWidthPx)
  const rightPx = clamp(Math.ceil((viewportEndPx + TILE_BUFFER_PX) / TILE_SIZE_PX) * TILE_SIZE_PX, leftPx + 1, regionWidthPx)
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
    ctx.moveTo(0, baseline)
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? 0 : (i / (count - 1)) * width
      const amplitude = Math.max(Math.abs(minValues[i] || 0), Math.abs(maxValues[i] || 0))
      const y = baseline - clamp(amplitude * scale * gain, 0, 1) * amplitudeHeight
      ctx.lineTo(x, y)
    }
    ctx.lineTo(width, baseline)
    ctx.closePath()
    ctx.fillStyle = fillGradient
    ctx.fill()

    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? 0 : (i / (count - 1)) * width
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
    const x = count === 1 ? 0 : (i / (count - 1)) * width
    const y = center - clamp((maxValues[i] || 0) * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let i = count - 1; i >= 0; i--) {
    const x = count === 1 ? 0 : (i / (count - 1)) * width
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
      const x = (i / (rmsValues.length - 1)) * width
      const y = center - clamp((rmsValues[i] || 0) * scale * gain, 0, 1) * amplitudeHeight
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let i = rmsValues.length - 1; i >= 0; i--) {
      const x = (i / (rmsValues.length - 1)) * width
      const y = center + clamp((rmsValues[i] || 0) * scale * gain, 0, 1) * amplitudeHeight
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(186, 245, 255, 0.18)'
    ctx.fill()
  }

  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? 0 : (i / (count - 1)) * width
    const y = center - clamp((maxValues[i] || 0) * scale * gain, -1, 1) * amplitudeHeight
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = strokeGradient
  ctx.lineWidth = 1.35
  ctx.stroke()

  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? 0 : (i / (count - 1)) * width
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
    const x = (i / (samples.length - 1)) * width
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

  const spacing = width / Math.max(1, samples.length - 1)
  if (spacing >= 5) {
    ctx.fillStyle = 'rgba(220, 252, 255, 0.95)'
    for (let i = 0; i < samples.length; i++) {
      const x = (i / (samples.length - 1)) * width
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
  const [waveform, setWaveform] = useState<WaveformWindowData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [halfWaveform, setHalfWaveform] = useState<boolean>(false)

  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      setSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height)
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
        renderWindow.sourceStart.toFixed(3),
        renderWindow.sourceDuration.toFixed(3),
        renderWindow.requestPixels
      ].join('|')
    : ''

  useEffect(() => {
    if (!filePath || !renderWindow || renderWindow.sourceDuration <= 0) {
      setWaveform(null)
      return
    }

    let active = true
    setError(null)

    window.api.getWaveformWindow(filePath, {
      startTime: renderWindow.sourceStart,
      duration: renderWindow.sourceDuration,
      pixels: renderWindow.requestPixels,
      channel
    }).then((data: WaveformWindowData) => {
      if (!active) return
      setWaveform(data)
    }).catch((err: any) => {
      if (!active) return
      setWaveform(null)
      setError(err?.message || 'Waveform konnte nicht berechnet werden')
    })

    return () => {
      active = false
    }
  }, [channel, filePath, requestKey, renderWindow])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !renderWindow) return

    const cssWidth = Math.max(1, renderWindow.widthPx)
    const cssHeight = Math.max(1, size.height || 80)
    const dpr = getCssPixelRatio()
    canvas.width = Math.max(1, Math.round(cssWidth * dpr))
    canvas.height = Math.max(1, Math.round(cssHeight * dpr))
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = '100%'

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    if (!waveform || waveform.channels.length === 0) {
      const laneCount = channel || sourceChannels < 2 ? 1 : 2
      for (let i = 0; i < laneCount; i++) {
        const laneTop = (cssHeight / laneCount) * i
        drawZeroLine(ctx, cssWidth, laneTop + (cssHeight / laneCount) / 2)
      }
      return
    }

    const drawableChannels = waveform.channels.slice(0, channel ? 1 : 2)
    const laneCount = Math.max(1, drawableChannels.length)
    const laneHeight = cssHeight / laneCount
    const peak = Math.max(0.0001, waveform.peak)
    const visualScale = peak > 0.05 ? clamp(0.92 / peak, 0.5, 8) : 1
    const safeGain = clamp(gain || 1, 0, 8)

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
        drawSampleChannel(ctx, waveChannel, cssWidth, contentTop, contentHeight, visualScale, safeGain, halfWaveform)
      } else {
        drawPeakChannel(ctx, waveChannel, cssWidth, contentTop, contentHeight, visualScale, safeGain, halfWaveform)
      }
    })
  }, [channel, gain, halfWaveform, renderWindow, size.height, sourceChannels, waveform])

  return (
    <div ref={wrapperRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {renderWindow && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 bottom-0 opacity-95"
          style={{ left: `${renderWindow.leftPx}px` }}
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
