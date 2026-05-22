import React, { useEffect, useState, useRef } from 'react'

export function WaveformRenderer({ filePath, sourceOffset = 0, duration = 0, fileDuration = 0 }: { filePath: string, sourceOffset?: number, duration?: number, fileDuration?: number }) {
  const [peaks, setPeaks] = useState<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Get fast peak data from Main Process via FFmpeg
    window.api.getPeaks(filePath).then(data => {
      setPeaks(data)
    })
  }, [filePath])

  useEffect(() => {
    if (!canvasRef.current || peaks.length === 0) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = '#ffffff80'
    ctx.lineWidth = 1
    
    const centerY = rect.height / 2

    ctx.beginPath()
    let peaksToDraw = peaks;
    
    // Slice peaks if offset and durations are provided
    if (fileDuration > 0 && duration > 0) {
       const startIndex = Math.max(0, Math.floor((sourceOffset / fileDuration) * peaks.length));
       const endIndex = Math.max(startIndex + 1, Math.floor(((sourceOffset + duration) / fileDuration) * peaks.length));
       peaksToDraw = peaks.slice(startIndex, endIndex);
    }
    
    const step = rect.width / (peaksToDraw.length || 1)
    
    peaksToDraw.forEach((peak, i) => {
      const x = i * step
      const height = peak * (rect.height / 2)
      ctx.moveTo(x, centerY - height)
      ctx.lineTo(x, centerY + height)
    })
    ctx.stroke()
  }, [peaks, sourceOffset, duration, fileDuration])

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-60 pointer-events-none"
      />
    </div>
  )
}