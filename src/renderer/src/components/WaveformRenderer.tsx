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
