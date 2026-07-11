import React, { useRef, useState, useEffect } from 'react'

interface LiveWaveformCanvasProps {
  duration: number
  pixelsPerSecond: number
}

export function LiveWaveformCanvas({ duration, pixelsPerSecond }: LiveWaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [halfWaveform, setHalfWaveform] = useState<boolean>(false)

  useEffect(() => {
    if (window.api && typeof window.api.getSettings === 'function') {
      window.api.getSettings().then((s: any) => {
        if (s && typeof s.halfWaveform === 'boolean') {
          setHalfWaveform(s.halfWaveform)
        }
      })
    }

    const handleSettingsUpdate = (e: any) => {
      if (e.detail && typeof e.detail.halfWaveform === 'boolean') {
        setHalfWaveform(e.detail.halfWaveform)
      }
    }
    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdate as EventListener)
    return () => {
      window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdate as EventListener)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    if (width === 0 || height === 0) return

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    let peaksHistory: number[] = []
    try {
      const historyStr = localStorage.getItem('recording_peaks_history')
      if (historyStr) {
        peaksHistory = JSON.parse(historyStr)
      }
    } catch (e) {}

    const centerY = height / 2

    if (peaksHistory.length === 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const baselineY = halfWaveform ? height * 0.95 : centerY
      ctx.moveTo(0, baselineY)
      ctx.lineTo(width, baselineY)
      ctx.stroke()
      return
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#f87171')
    gradient.addColorStop(0.5, '#ef4444')
    gradient.addColorStop(1, '#b91c1c')

    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.5

    ctx.beginPath()
    const step = width / peaksHistory.length
    const boost = 2.5

    if (halfWaveform) {
      const baseline = height * 0.95
      peaksHistory.forEach((peak, i) => {
        const x = i * step
        const amplitude = Math.min(1.0, Math.max(0.03, peak * boost))
        const drawHeight = amplitude * height * 0.90
        ctx.moveTo(x, baseline)
        ctx.lineTo(x, baseline - drawHeight)
      })
    } else {
      peaksHistory.forEach((peak, i) => {
        const x = i * step
        const amplitude = Math.min(1.0, Math.max(0.03, peak * boost))
        const drawHeight = amplitude * (height / 2) * 0.85
        ctx.moveTo(x, centerY - drawHeight)
        ctx.lineTo(x, centerY + drawHeight)
      })
    }
    ctx.stroke()
  }, [duration, pixelsPerSecond, halfWaveform])

  return <canvas ref={canvasRef} className="w-full h-full opacity-90 pointer-events-none" />
}
