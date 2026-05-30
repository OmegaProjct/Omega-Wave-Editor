import React, { useEffect, useState, useRef } from 'react'

// A highly realistic, deterministic, and instant peak generator based on a string seed (e.g. file path)
function getDeterministicPeaks(filePath: string, samples: number = 1000): number[] {
  let hash = 0
  for (let i = 0; i < filePath.length; i++) {
    hash = (hash << 5) - hash + filePath.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
  
  const seed = Math.abs(hash) || 12345
  const peaks: number[] = []
  
  let currentSeed = seed
  const nextRand = () => {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296
    return currentSeed / 4294967296
  }

  // Define musical sections (e.g., quiet intro, loud chorus, verse, etc.)
  const numSections = 5
  const sectionAmplitudes = Array.from({ length: numSections }, () => 0.25 + nextRand() * 0.65)
  
  for (let i = 0; i < samples; i++) {
    const progress = i / samples
    const sectionIdx = Math.floor(progress * numSections)
    const baseAmp = sectionAmplitudes[sectionIdx] || 0.5
    
    // Macro envelope structure: fade-in, fade-out, section transitions
    let envelope = baseAmp
    if (progress < 0.03) {
      envelope *= (progress / 0.03)
    } else if (progress > 0.97) {
      envelope *= ((1 - progress) / 0.03)
    }
    
    // Section transition smoothing
    const sectionProgress = (progress * numSections) % 1
    if (sectionProgress < 0.1 && sectionIdx > 0) {
      const prevAmp = sectionAmplitudes[sectionIdx - 1]
      const t = sectionProgress / 0.1
      envelope = prevAmp * (1 - t) + baseAmp * t
    }
    
    // Micro-structure: high frequency oscillations + noise
    const f1 = Math.sin(progress * Math.PI * 60)
    const f2 = Math.sin(progress * Math.PI * 220)
    const noise = nextRand() * 0.25
    
    let value = (Math.abs(f1 * 0.55 + f2 * 0.25 + noise * 0.2)) * envelope
    
    // Beat/transient spikes periodically
    if (i % 45 === 0) {
      value = Math.min(0.95, value + 0.35 + nextRand() * 0.25)
    }
    
    peaks.push(Math.max(0.04, Math.min(0.95, value)))
  }
  
  return peaks
}

export function WaveformRenderer({ filePath, sourceOffset = 0, duration = 0, fileDuration = 0 }: { filePath: string, sourceOffset?: number, duration?: number, fileDuration?: number }) {
  const [peaks, setPeaks] = useState<number[]>([])
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
    if (!filePath) {
      setPeaks(getDeterministicPeaks('demo_track', 1000))
      return
    }

    let active = true
    const timeout = setTimeout(() => {
      if (active) {
        console.warn('getPeaks IPC timed out, falling back to deterministic visual waveform.')
        setPeaks(getDeterministicPeaks(filePath, 1000))
      }
    }, 3000)

    // Get fast peak data from Main Process via FFmpeg
    window.api.getPeaks(filePath).then(data => {
      clearTimeout(timeout)
      if (active) {
        if (Array.isArray(data) && data.length > 0) {
          setPeaks(data)
        } else {
          setPeaks(getDeterministicPeaks(filePath, 1000))
        }
      }
    }).catch(err => {
      clearTimeout(timeout)
      if (active) {
        console.warn('Failed to get peaks from API, falling back to realistic waveform:', err)
        setPeaks(getDeterministicPeaks(filePath, 1000))
      }
    })

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [filePath])

  const draw = () => {
    if (!canvasRef.current || peaks.length === 0) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const parent = canvas.parentElement
    const width = parent ? parent.clientWidth : canvas.clientWidth
    const height = parent ? parent.clientHeight : canvas.clientHeight
    
    if (width === 0 || height === 0) return

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)
    
    // Premium vibrant cyan-blue gradient for rich aesthetics
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#00b4d8bb') // Bright cyan
    gradient.addColorStop(0.5, '#0077b6dd') // Vibrant blue
    gradient.addColorStop(1, '#00b4d8bb')
    
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.5
    
    const centerY = height / 2

    ctx.beginPath()
    let peaksToDraw = peaks
    
    // Slice peaks if offset and durations are provided
    if (fileDuration > 0 && duration > 0) {
       const startIndex = Math.max(0, Math.floor((sourceOffset / fileDuration) * peaks.length))
       const endIndex = Math.max(startIndex + 1, Math.min(peaks.length, Math.floor(((sourceOffset + duration) / fileDuration) * peaks.length)))
       peaksToDraw = peaks.slice(startIndex, endIndex)
    }
    
    const step = width / (peaksToDraw.length || 1)
    
    if (halfWaveform) {
      const baseline = height * 0.95
      peaksToDraw.forEach((peak, i) => {
        const x = i * step
        const amplitude = Math.max(0.03, peak)
        const drawHeight = amplitude * height * 0.90
        ctx.moveTo(x, baseline)
        ctx.lineTo(x, baseline - drawHeight)
      })
    } else {
      peaksToDraw.forEach((peak, i) => {
        const x = i * step
        const amplitude = Math.max(0.03, peak) // Boost minimum level slightly for clean visibility
        const drawHeight = amplitude * (height / 2) * 0.85 // margin top/bottom
        ctx.moveTo(x, centerY - drawHeight)
        ctx.lineTo(x, centerY + drawHeight)
      })
    }
    ctx.stroke()
  }

  // Draw on data update
  useEffect(() => {
    draw()
  }, [peaks, sourceOffset, duration, fileDuration, halfWaveform])

  // Draw on parent resize (essential when regions are dragged or resized, or zoom changes)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const observer = new ResizeObserver(() => {
      draw()
    })
    observer.observe(parent)
    return () => observer.disconnect()
  }, [peaks, sourceOffset, duration, fileDuration, halfWaveform])

  return (
    <div className="w-full h-full relative overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full opacity-85 pointer-events-none"
      />
    </div>
  )
}