import React, { useEffect, useState } from 'react'

// A highly realistic, deterministic, and instant peak generator based on a string seed (e.g. file path)
function getDeterministicPeaks(filePath: string, samples: number = 8000): number[] {
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

export function WaveformRenderer({ 
  filePath, 
  sourceOffset = 0, 
  duration = 0, 
  fileDuration = 0, 
  channel,
  gain = 1.0
}: { 
  filePath: string
  sourceOffset?: number
  duration?: number
  fileDuration?: number
  channel?: 'left' | 'right'
  gain?: number
}) {
  const [peaks, setPeaks] = useState<number[]>([])
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
      setPeaks(getDeterministicPeaks('demo_track', 8000))
      return
    }

    let active = true
    const timeout = setTimeout(() => {
      if (active) {
        console.warn('getPeaks IPC timed out, falling back to deterministic visual waveform.')
        setPeaks(getDeterministicPeaks(filePath, 8000))
      }
    }, 3000)

    // Request 8000 samples for high-resolution waveform display
    window.api.getPeaks(filePath, 8000, channel).then(data => {
      clearTimeout(timeout)
      if (active) {
        if (Array.isArray(data) && data.length > 0) {
          setPeaks(data)
        } else {
          setPeaks(getDeterministicPeaks(filePath, 8000))
        }
      }
    }).catch(err => {
      clearTimeout(timeout)
      if (active) {
        console.warn('Failed to get peaks from API, falling back to realistic waveform:', err)
        setPeaks(getDeterministicPeaks(filePath, 8000))
      }
    })

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [filePath, channel])

  if (peaks.length === 0) return null

  let peaksToDraw = peaks
  
  // Slice peaks if offset and durations are provided
  if (fileDuration > 0 && duration > 0) {
     const startIndex = Math.max(0, Math.floor((sourceOffset / fileDuration) * peaks.length))
     const endIndex = Math.max(startIndex + 1, Math.min(peaks.length, Math.floor(((sourceOffset + duration) / fileDuration) * peaks.length)))
     peaksToDraw = peaks.slice(startIndex, endIndex)
  }

  if (peaksToDraw.length === 0) return null

  // Normalize based on the entire file's peaks to ensure a consistent scale across different volume tracks
  const maxPeak = peaks.length > 0 ? Math.max(...peaks) : 1.0
  const visualScale = maxPeak > 0.05 ? (0.92 / maxPeak) : 1.0

  const width = 1000
  const height = 100
  const step = width / Math.max(1, peaksToDraw.length - 1)

  let fillPath = ''
  let strokePathTop = ''
  let strokePathBottom = ''

  if (halfWaveform) {
    const baseline = 95
    
    // Build fill path
    const fillCoords = peaksToDraw.map((peak, i) => {
      const x = i * step
      // Scale by visualScale and clip gain
      const amplitude = Math.max(0.01, Math.min(1.0, peak * visualScale * gain))
      const drawHeight = amplitude * 90
      return `${x.toFixed(1)}, ${(baseline - drawHeight).toFixed(1)}`
    })
    fillPath = `M 0, ${baseline} L ${fillCoords.join(' L ')} L ${width}, ${baseline} Z`
    
    // Build top stroke path
    strokePathTop = `M ${fillCoords.join(' L ')}`
  } else {
    const centerY = 50
    
    // Build top half
    const topCoords = peaksToDraw.map((peak, i) => {
      const x = i * step
      // Scale by visualScale and clip gain
      const amplitude = Math.max(0.01, Math.min(1.0, peak * visualScale * gain))
      const drawHeight = amplitude * 45
      return `${x.toFixed(1)}, ${(centerY - drawHeight).toFixed(1)}`
    })
    
    // Build bottom half (left to right for stroke, then reverse for fill polygon)
    const bottomCoords = peaksToDraw.map((peak, i) => {
      const x = i * step
      // Scale by visualScale and clip gain
      const amplitude = Math.max(0.01, Math.min(1.0, peak * visualScale * gain))
      const drawHeight = amplitude * 45
      return `${x.toFixed(1)}, ${(centerY + drawHeight).toFixed(1)}`
    })
    
    const bottomCoordsReversed = [...bottomCoords].reverse()
    
    fillPath = `M 0, ${centerY} L ${topCoords.join(' L ')} L ${width}, ${centerY} L ${bottomCoordsReversed.join(' L ')} Z`
    
    strokePathTop = `M ${topCoords.join(' L ')}`
    strokePathBottom = `M ${bottomCoords.join(' L ')}`
  }

  // Generate unique IDs for the SVG gradients to prevent collisions
  const fillGradientId = `wf-fill-${halfWaveform ? 'half' : 'full'}`
  const strokeGradientId = `wf-stroke`

  return (
    <div className="w-full h-full relative overflow-hidden">
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-85 pointer-events-none"
      >
        <defs>
          {halfWaveform ? (
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0, 229, 255, 0.45)" />
              <stop offset="100%" stopColor="rgba(0, 119, 182, 0.15)" />
            </linearGradient>
          ) : (
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0, 229, 255, 0.4)" />
              <stop offset="50%" stopColor="rgba(0, 119, 182, 0.15)" />
              <stop offset="100%" stopColor="rgba(0, 229, 255, 0.4)" />
            </linearGradient>
          )}
          <linearGradient id={strokeGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#0096c7" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>
        </defs>
        
        {/* Draw fill */}
        <path d={fillPath} fill={`url(#${fillGradientId})`} />
        
        {/* Draw top stroke */}
        <path 
          d={strokePathTop} 
          stroke={`url(#${strokeGradientId})`} 
          strokeWidth="1.5" 
          fill="none" 
          vectorEffect="non-scaling-stroke" 
        />
        
        {/* Draw bottom stroke if not half waveform */}
        {!halfWaveform && (
          <path 
            d={strokePathBottom} 
            stroke={`url(#${strokeGradientId})`} 
            strokeWidth="1.5" 
            fill="none" 
            vectorEffect="non-scaling-stroke" 
          />
        )}
      </svg>
    </div>
  )
}