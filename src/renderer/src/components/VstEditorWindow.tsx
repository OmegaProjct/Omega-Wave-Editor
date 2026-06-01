import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Power, RotateCcw, Volume2, Sparkles, HelpCircle, Activity, Music, Mic, Square } from 'lucide-react'

export interface VstParameter {
  name: string
  min: number
  max: number
  step: number
  value: number
  defaultValue: number
  unit: string
}

export interface LoadedVst {
  id: string
  name: string
  manufacturer: string
  format: string
  category: string
  path: string
  active: boolean
  parameters: VstParameter[]
}

// ✂️ Trim leading and trailing silence from AudioBuffer with safety padding
function trimAudioBuffer(buffer: AudioBuffer, threshold = 0.002): { trimmedBuffer: AudioBuffer; leadingSilenceSec: number } {
  const numChannels = buffer.numberOfChannels;
  const numSamples = buffer.length;
  const sampleRate = buffer.sampleRate;
  
  let startIdx = numSamples;
  let endIdx = 0;
  
  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    
    // Find first sample exceeding threshold
    for (let i = 0; i < numSamples; i++) {
      if (Math.abs(data[i]) > threshold) {
        if (i < startIdx) startIdx = i;
        break;
      }
    }
    
    // Find last sample exceeding threshold (searching backwards)
    for (let i = numSamples - 1; i >= 0; i--) {
      if (Math.abs(data[i]) > threshold) {
        if (i > endIdx) endIdx = i;
        break;
      }
    }
  }
  
  // If no audio exceeded the threshold, return the original buffer
  if (startIdx >= endIdx) {
    return { trimmedBuffer: buffer, leadingSilenceSec: 0 };
  }
  
  // Add a small padding (150ms) before and after to avoid clipping transients/release
  const paddingSamples = Math.floor(0.15 * sampleRate);
  const clampedStartIdx = Math.max(0, startIdx - paddingSamples);
  const clampedEndIdx = Math.min(numSamples, endIdx + paddingSamples);
  
  const leadingSilenceSec = clampedStartIdx / sampleRate;
  const trimmedLength = clampedEndIdx - clampedStartIdx;
  
  // Create a new AudioBuffer
  const trimmedBuffer = new (window.AudioContext || (window as any).webkitAudioContext)().createBuffer(
    numChannels, 
    trimmedLength, 
    sampleRate
  );
  
  for (let c = 0; c < numChannels; c++) {
    const srcData = buffer.getChannelData(c);
    const destData = trimmedBuffer.getChannelData(c);
    for (let i = 0; i < trimmedLength; i++) {
      destData[i] = srcData[clampedStartIdx + i];
    }
  }
  
  return { trimmedBuffer, leadingSilenceSec };
}

// 🎼 Direct PCM 16-bit WAV compiler in-memory
function exportToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numOfChan = audioBuffer.numberOfChannels;
  const numSamples = audioBuffer.length;
  const format = 1; // raw PCM
  const bitDepth = 16;
  const sampleRate = audioBuffer.sampleRate;
  const byteRate = sampleRate * numOfChan * (bitDepth / 8);
  const blockAlign = numOfChan * (bitDepth / 8);
  const dataSize = numSamples * numOfChan * (bitDepth / 8);
  const totalSize = 36 + dataSize;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let pos = 0;

  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(pos + i, s.charCodeAt(i));
    }
    pos += s.length;
  };

  const writeUint32 = (n: number) => {
    view.setUint32(pos, n, true);
    pos += 4;
  };

  const writeUint16 = (n: number) => {
    view.setUint16(pos, n, true);
    pos += 2;
  };

  writeString('RIFF');
  writeUint32(totalSize);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);
  writeUint16(format);
  writeUint16(numOfChan);
  writeUint32(sampleRate);
  writeUint32(byteRate);
  writeUint16(blockAlign);
  writeUint16(bitDepth);
  writeString('data');
  writeUint32(dataSize);

  // Write PCM audio samples
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return buffer;
}

export function VstEditorWindow() {
  const { t } = useTranslation()
  const [plugin, setPlugin] = useState<LoadedVst | null>(null)
  const [activePreset, setActivePreset] = useState<string>('Standard')
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set())
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [syncPlayback, setSyncPlayback] = useState(false)
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false)
  const [showOscilloscope, setShowOscilloscope] = useState<boolean>(true)

  // Web Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const recorderDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  
  // Timer & Frame refs
  const visualizerFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recordingTimerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)

  // Load the plugin configuration from localStorage
  const loadPluginFromStorage = () => {
    try {
      const payloadStr = localStorage.getItem('popout_vst-editor_payload')
      if (!payloadStr) return

      const payload = JSON.parse(payloadStr)
      const pluginId = payload.pluginId

      const savedRack = localStorage.getItem('vst_rack_plugins')
      if (savedRack) {
        const rack: LoadedVst[] = JSON.parse(savedRack)
        const found = rack.find(p => p.id === pluginId)
        if (found) {
          setPlugin(found)
        }
      }
    } catch (e) {
      console.error('Failed to load VST configurations for editor window:', e)
    }
  }

  // Initial load and localStorage listening for sync
  useEffect(() => {
    loadPluginFromStorage()

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vst_rack_plugins' || e.key === 'vst_rack_updated_trigger') {
        loadPluginFromStorage()
      }
    }

    const unsubClose = window.api.onVstNativeEditorClosed(() => {
      setIsCompactMode(false)
    })

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      unsubClose()
      if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [])

  // Dynamic Plugin customization profiles
  const getPluginProfile = (id: string) => {
    const lower = id.toLowerCase()
    if (lower.includes('surge')) {
      return {
        color: '#00f0ff',
        textColor: 'text-cyan-400',
        borderColor: 'border-cyan-500/30',
        glowColor: 'rgba(0, 240, 255, 0.4)',
        soundEngine: 'sawtooth_unison',
        presets: ['Standard', 'Warm Analog Pad', 'Cyberpunk Bassline', 'Astral Space Pluck']
      }
    }
    if (lower.includes('vital')) {
      return {
        color: '#bf00ff',
        textColor: 'text-purple-400',
        borderColor: 'border-purple-500/30',
        glowColor: 'rgba(191, 0, 255, 0.4)',
        soundEngine: 'square_sub',
        presets: ['Standard', 'Growl Bass', 'Visual Sweep Lead', 'Spectral Pluck']
      }
    }
    if (lower.includes('helm')) {
      return {
        color: '#f97316',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500/30',
        glowColor: 'rgba(249, 115, 22, 0.4)',
        soundEngine: 'triangle_warm',
        presets: ['Standard', 'Retro Poly-Keys', 'Chiptune Triangle', 'Creamy Lead']
      }
    }
    if (lower.includes('dexed')) {
      return {
        color: '#3b82f6',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        glowColor: 'rgba(59, 130, 246, 0.4)',
        soundEngine: 'dx7_fm_bell',
        presets: ['Standard', 'DX7 E-Piano', 'Crisp Bells', 'FM Log-Bass']
      }
    }
    if (lower.includes('supermassive')) {
      return {
        color: '#ec4899',
        textColor: 'text-pink-400',
        borderColor: 'border-pink-500/30',
        glowColor: 'rgba(236, 72, 153, 0.4)',
        soundEngine: 'effect',
        presets: ['Standard', 'Ambient Cathedral Reverb', 'Space Void Delay', 'Celestial Cloud']
      }
    }
    if (lower.includes('nova')) {
      return {
        color: '#22c55e',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        glowColor: 'rgba(34, 197, 94, 0.4)',
        soundEngine: 'effect',
        presets: ['Standard', 'Vocal Dynamix EQ', 'Drum Punch Compressor', 'Mastering Polisher']
      }
    }
    if (lower.includes('kilohearts')) {
      return {
        color: '#eab308',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-500/30',
        glowColor: 'rgba(234, 179, 8, 0.4)',
        soundEngine: 'effect',
        presets: ['Standard', 'Warm Tube Saturation', 'Stereo Widener Delay', 'Bite Chorus']
      }
    }
    if (lower.includes('labs drums') || lower.includes('sitala')) {
      return {
        color: '#f87171',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        glowColor: 'rgba(248, 113, 113, 0.4)',
        soundEngine: 'drum_synth_perc',
        presets: ['Standard', 'Heavy Rock Kit', 'Electronic Lofi Kit', 'Acoustic Room Kit']
      }
    }
    if (lower.includes('decent sampler') || lower.includes('decentsampler')) {
      return {
        color: '#34d399',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
        glowColor: 'rgba(52, 211, 153, 0.4)',
        soundEngine: 'sampler_piano_warm',
        presets: ['Standard', 'Felt Piano', 'Lofi Tape Keys', 'Ambient Strings']
      }
    }
    if (lower.includes('mpitch')) {
      return {
        color: '#f87171',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
        glowColor: 'rgba(248, 113, 113, 0.4)',
        soundEngine: 'effect',
        presets: ['Standard', 'Vocal Pitch Correction', 'Robot Voice Tuning', 'Double Tracker Pitch']
      }
    }
    if (lower.includes('omega limiter') || lower.includes('omegalimiter')) {
      return {
        color: '#34d399',
        textColor: 'text-green-400',
        borderColor: 'border-green-500/30',
        glowColor: 'rgba(52, 211, 153, 0.4)',
        soundEngine: 'effect',
        presets: ['Standard', 'Mastering Brickwall', 'Soft Mastering Peak', 'Saturating Clipper']
      }
    }
    // Fallback for built-ins
    return {
      color: '#3b82f6',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      glowColor: 'rgba(59, 130, 246, 0.4)',
      soundEngine: 'sine',
      presets: ['Standard', 'Brickwall Limiter', 'Soft Clipper', 'Clean Boost']
    }
  }

  const profile = plugin ? getPluginProfile(plugin.id) : getPluginProfile('default')

  // Draw simulated sound waves or analyzer spectrum
  useEffect(() => {
    if (!canvasRef.current || !plugin || !showOscilloscope) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let phase = 0

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const isInstrument = plugin.category.toLowerCase().includes('instrument')
      const active = plugin.active

      if (!active) {
        // Draw bypassed flatline
        ctx.beginPath()
        ctx.strokeStyle = '#4b5563'
        ctx.lineWidth = 2
        ctx.moveTo(0, canvas.height / 2)
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.stroke()
        
        ctx.fillStyle = '#4b5563'
        ctx.font = '10px monospace'
        ctx.fillText(t('vst_editor.bypassed_signal_chain', { defaultValue: 'BYPASSED / SIGNAL CHAIN ACTIVE' }), 15, canvas.height - 15)
        
        phase += 0.05
        visualizerFrameRef.current = requestAnimationFrame(render)
        return
      }

      ctx.lineWidth = 2.5
      phase += 0.15

      if (isInstrument) {
        // Synthesizer - Wavetable / Osc waves
        const cutoff = plugin.parameters.find(p => p.name === 'Cutoff')?.value || 1200
        const resonance = plugin.parameters.find(p => p.name === 'Resonance')?.value || 15
        const oscMix = plugin.parameters.find(p => p.name === 'Oscillator Mix')?.value || 50

        const isPlaying = activeKeys.size > 0
        const amplitude = isPlaying ? 35 : 12

        // Stacked colored waves reflection the plugin profile theme!
        const waveCount = 3
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath()
          
          if (w === 0) {
            ctx.strokeStyle = isPlaying ? `${profile.color}ee` : `${profile.color}66`
            ctx.shadowColor = profile.color
          } else if (w === 1) {
            ctx.strokeStyle = isPlaying ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'
            ctx.shadowColor = 'rgba(255,255,255,0.5)'
          } else {
            ctx.strokeStyle = 'rgba(120,120,120,0.3)'
            ctx.shadowColor = 'rgba(120,120,120,0.2)'
          }
          
          ctx.shadowBlur = isPlaying ? 12 : 3
          
          for (let x = 0; x < canvas.width; x++) {
            const freq = (0.01 + (cutoff / 20000) * 0.05) * (1 + w * 0.5)
            const noise = isPlaying ? (Math.random() - 0.5) * (resonance / 3) : 0
            
            let yVal = 0
            
            // Adjust wave geometry shapes based on unique sound engines!
            if (profile.soundEngine === 'sawtooth_unison') {
              // Unison Sawtooth
              yVal = ((x * freq + phase + w * 0.3) % 2) - 1
            } else if (profile.soundEngine === 'square_sub') {
              // Square & sub blend
              yVal = Math.sin(x * freq + phase) > 0 ? 0.8 : -0.8
              yVal += Math.sin(x * (freq * 0.5) + phase) * 0.4
            } else if (profile.soundEngine === 'triangle_warm') {
              // Triangle shape
              yVal = Math.abs((x * freq + phase + w * 0.2) % 2 - 1) * 2 - 1
            } else if (profile.soundEngine === 'dx7_fm_bell') {
              // FM complex carrier modulator visualizer
              yVal = Math.sin(x * freq + phase + Math.sin(x * freq * 3.5 + phase) * 1.5)
            } else if (profile.soundEngine === 'sampler_piano_warm') {
              // Rhodes felt piano visualizer (Sine + Triangle blend)
              yVal = Math.sin(x * freq + phase) * 0.7 + (Math.abs((x * (freq * 0.5) + phase) % 2 - 1) * 2 - 1) * 0.3
            } else if (profile.soundEngine === 'drum_synth_perc') {
              // Drum visualizer: Kick/Snare/Hi-hat responsive shapes
              yVal = Math.sin(x * freq + phase) * 0.4 + (Math.random() - 0.5) * 0.4
            } else {
              // Sine wave fallback
              yVal = Math.sin(x * freq + phase)
            }
            
            const y = canvas.height / 2 + yVal * amplitude + noise

            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
        
        ctx.fillStyle = profile.color
        ctx.font = '10px monospace'
        ctx.shadowBlur = 0
        ctx.fillText(`CUTOFF: ${Math.round(cutoff)}Hz | RES: ${resonance.toFixed(1)}% | TYPE: ${profile.soundEngine.toUpperCase()}`, 15, canvas.height - 15)

      } else {
        // Effect visualizer (Spectrogram grid)
        const low = plugin.parameters.find(p => p.name === 'Low EQ')?.value || 0
        const mid = plugin.parameters.find(p => p.name === 'Mid EQ')?.value || 0
        const high = plugin.parameters.find(p => p.name === 'High EQ')?.value || 0
        const mix = plugin.parameters.find(p => p.name === 'Mix / Wet')?.value || 100

        ctx.shadowBlur = 4
        
        // Draw grid
        ctx.strokeStyle = '#1d2126'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 1; i < 5; i++) {
          const x = (canvas.width / 5) * i
          ctx.moveTo(x, 0)
          ctx.lineTo(x, canvas.height)
          const y = (canvas.height / 5) * i
          ctx.moveTo(0, y)
          ctx.lineTo(canvas.width, y)
        }
        ctx.stroke()

        // Spectrum Curve matches the theme color!
        ctx.beginPath()
        ctx.strokeStyle = `${profile.color}ee`
        ctx.shadowColor = profile.color
        ctx.lineWidth = 3

        const points: {x: number, y: number}[] = []
        for (let x = 0; x <= canvas.width; x += 5) {
          const normX = x / canvas.width
          
          // EQ math curves
          const lowGain = low * Math.exp(-Math.pow(normX - 0.1, 2) / 0.05)
          const midGain = mid * Math.exp(-Math.pow(normX - 0.5, 2) / 0.08)
          const highGain = high * Math.exp(-Math.pow(normX - 0.9, 2) / 0.05)

          const eqCurve = (lowGain + midGain + highGain) * 2.2
          const liveWave = Math.sin(normX * 12 + phase) * 4 * (mix / 100)
          
          const y = canvas.height / 2 - eqCurve + liveWave
          points.push({ x, y })
        }

        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.stroke()

        // Fill area under curve
        ctx.lineTo(canvas.width, canvas.height)
        ctx.lineTo(0, canvas.height)
        ctx.fillStyle = `${profile.color}0a`
        ctx.fill()

        ctx.fillStyle = profile.color
        ctx.font = '10px monospace'
        ctx.shadowBlur = 0
        ctx.fillText(`Bands: Low ${low.toFixed(1)}dB | Mid ${mid.toFixed(1)}dB | High ${high.toFixed(1)}dB | Mix ${Math.round(mix)}%`, 15, canvas.height - 15)
      }

      visualizerFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current)
    }
  }, [plugin, activeKeys, profile, showOscilloscope])

  if (!plugin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#101214] text-gray-400 font-medium font-sans">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-omega-accent mx-auto"></div>
          <p className="text-xs tracking-wide uppercase mt-4">{t('vst_editor.loading_data', { defaultValue: 'Lade Plugin-Editor-Daten...' })}</p>
        </div>
      </div>
    )
  }

  // Update parameters back to localStorage and trigger events
  const pushStateUpdate = (updatedPlugin: LoadedVst) => {
    const savedRack = localStorage.getItem('vst_rack_plugins')
    if (savedRack) {
      try {
        const rack: LoadedVst[] = JSON.parse(savedRack)
        const newRack = rack.map(p => p.id === updatedPlugin.id ? updatedPlugin : p)
        
        localStorage.setItem('vst_rack_plugins', JSON.stringify(newRack))
        localStorage.setItem('vst_rack_updated_trigger', Date.now().toString())
        
        window.dispatchEvent(new CustomEvent('VST_PARAM_SYNC_POPUP', { detail: updatedPlugin }))
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Parameter adjustments from the dial/knob interface
  const handleParamValueChange = (paramIndex: number, newValue: number) => {
    const updatedParams = [...plugin.parameters]
    const param = updatedParams[paramIndex]
    
    const rounded = Math.round(newValue / param.step) * param.step
    const clamped = Math.max(param.min, Math.min(param.max, rounded))
    
    updatedParams[paramIndex] = { ...param, value: clamped }
    const updated = { ...plugin, parameters: updatedParams }
    
    setPlugin(updated)
    pushStateUpdate(updated)

    // Pass changes directly to native C++ engine
    const range = param.max - param.min
    const normalizedValue = range > 0 ? (clamped - param.min) / range : 0
    if (window.api && typeof window.api.setVstParam === 'function') {
      window.api.setVstParam(paramIndex, normalizedValue)
    }
  }

  const handleToggleBypass = () => {
    const updated = { ...plugin, active: !plugin.active }
    setPlugin(updated)
    pushStateUpdate(updated)
  }

  const handleResetParam = (paramIndex: number) => {
    const updatedParams = [...plugin.parameters]
    const param = updatedParams[paramIndex]
    updatedParams[paramIndex] = { ...param, value: param.defaultValue }
    const updated = { ...plugin, parameters: updatedParams }
    
    setPlugin(updated)
    pushStateUpdate(updated)

    // Pass changes directly to native C++ engine
    const range = param.max - param.min
    const normalizedValue = range > 0 ? (param.defaultValue - param.min) / range : 0
    if (window.api && typeof window.api.setVstParam === 'function') {
      window.api.setVstParam(paramIndex, normalizedValue)
    }
  }

  // Rotary Knob Drag control handler
  const handleKnobMouseDown = (e: React.MouseEvent, paramIdx: number) => {
    e.preventDefault()
    const startY = e.clientY
    const param = plugin.parameters[paramIdx]
    const startVal = param.value
    const range = param.max - param.min

    const pixelsPerRange = 150

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diffY = startY - moveEvent.clientY 
      const deltaVal = (diffY / pixelsPerRange) * range
      handleParamValueChange(paramIdx, startVal + deltaVal)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Setup Web Audio API Synthesizer Voice for keyboard playability!
  const playSynthTone = (frequency: number) => {
    if (!plugin.active) return

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      // Read ADSR parameters dynamically from VST parameters!
      const attack = (plugin.parameters.find(p => p.name === 'Attack')?.value || 10) / 1000 
      const decay = (plugin.parameters.find(p => p.name === 'Decay')?.value || 350) / 1000
      const sustain = (plugin.parameters.find(p => p.name === 'Sustain')?.value || 80) / 100
      const release = (plugin.parameters.find(p => p.name === 'Release')?.value || 450) / 1000
      const volDb = plugin.parameters.find(p => p.name === 'Output Volume')?.value || 0
      const gainValue = Math.pow(10, volDb / 20) * 0.15 

      // ADSR Overrides for unique simulated engines
      let customAttack = attack
      let customDecay = decay
      let customSustain = sustain
      let customRelease = release

      if (profile.soundEngine === 'drum_synth_perc') {
        customAttack = 0.002 // Super snap transient attack
        if (frequency < 315) {
          // Kick: 150ms decay
          customDecay = 0.15
          customSustain = 0.01
          customRelease = 0.15
        } else if (frequency < 500) {
          // Snare: 200ms decay
          customDecay = 0.2
          customSustain = 0.01
          customRelease = 0.2
        } else {
          // Hi-hat: 50ms very short decay
          customDecay = 0.05
          customSustain = 0.01
          customRelease = 0.05
        }
      } else if (profile.soundEngine === 'sampler_piano_warm') {
        // Felt piano pluck: 10ms quick attack, decay/sustain
        customAttack = 0.01
      }

      const gainNode = ctx.createGain()
      const filterNode = ctx.createBiquadFilter()

      const now = ctx.currentTime
      const sources: any[] = []

      // 🎹 ADVANCED DISTINCT SOUND ENGINES 🎹
      if (profile.soundEngine === 'drum_synth_perc') {
        if (frequency < 315) {
          // Kick: frequency sweep from 150Hz to 40Hz with short decay
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(150, now)
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.15)
          osc.connect(filterNode)
          sources.push(osc)
        } else if (frequency < 500) {
          // Snare: white noise filtered with bandpass at 1000Hz
          const bufferSize = ctx.sampleRate * 2
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const output = noiseBuffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1
          }
          const noiseSource = ctx.createBufferSource()
          noiseSource.buffer = noiseBuffer

          const bandpass = ctx.createBiquadFilter()
          bandpass.type = 'bandpass'
          bandpass.frequency.setValueAtTime(1000, now)
          bandpass.Q.setValueAtTime(1.0, now)

          noiseSource.connect(bandpass)
          bandpass.connect(filterNode)
          sources.push(noiseSource)
        } else {
          // Hi-hat: highpass-filtered noise or high frequency sine pluck
          const bufferSize = ctx.sampleRate * 2
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const output = noiseBuffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1
          }
          const noiseSource = ctx.createBufferSource()
          noiseSource.buffer = noiseBuffer

          const highpass = ctx.createBiquadFilter()
          highpass.type = 'highpass'
          highpass.frequency.setValueAtTime(7000, now)

          noiseSource.connect(highpass)
          highpass.connect(filterNode)
          sources.push(noiseSource)
        }
      } else if (profile.soundEngine === 'sampler_piano_warm') {
        // Warm felt-piano pluck: sine or triangle wave with a quick attack (10ms), decay/sustain,
        // and soft detuned sub-harmonic or high-harmonic bells to create a Rhodes felt-piano sound.
        
        // Base felt tone: Sine wave
        const oscBase = ctx.createOscillator()
        oscBase.type = 'sine'
        oscBase.frequency.setValueAtTime(frequency, now)
        oscBase.connect(filterNode)
        sources.push(oscBase)

        // Warm detuned sub-harmonic: Triangle wave 1 octave down, slightly detuned and soft
        const oscSub = ctx.createOscillator()
        oscSub.type = 'triangle'
        oscSub.frequency.setValueAtTime(frequency / 2, now)
        oscSub.detune.setValueAtTime(-8, now) // -8 cents detune
        const subGain = ctx.createGain()
        subGain.gain.setValueAtTime(0.35, now)
        oscSub.connect(subGain)
        subGain.connect(filterNode)
        sources.push(oscSub)

        // High-harmonic bell tine: Sine wave 4x frequency (2 octaves up) with extremely fast decay
        const oscBell = ctx.createOscillator()
        oscBell.type = 'sine'
        oscBell.frequency.setValueAtTime(frequency * 4, now)
        oscBell.detune.setValueAtTime(6, now) // slightly detuned up
        
        const bellGain = ctx.createGain()
        bellGain.gain.setValueAtTime(0.25, now)
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12) // decay in 120ms
        
        oscBell.connect(bellGain)
        bellGain.connect(filterNode)
        sources.push(oscBell)
      } else if (profile.soundEngine === 'sawtooth_unison') {
        // detuned dual sawtooth synthesizer ( Surge XT style )
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        osc1.type = 'sawtooth'
        osc2.type = 'sawtooth'
        osc1.frequency.setValueAtTime(frequency - 1.5, now)
        osc2.frequency.setValueAtTime(frequency + 1.5, now)
        
        osc1.connect(filterNode)
        osc2.connect(filterNode)
        sources.push(osc1, osc2)
      } else if (profile.soundEngine === 'square_sub') {
        // heavy square wave with sub-octave sine ( Vital style )
        const osc1 = ctx.createOscillator()
        const sub = ctx.createOscillator()
        osc1.type = 'square'
        sub.type = 'sine'
        osc1.frequency.setValueAtTime(frequency, now)
        sub.frequency.setValueAtTime(frequency / 2, now) // 1 octave down
        
        osc1.connect(filterNode)
        sub.connect(filterNode)
        sources.push(osc1, sub)
      } else if (profile.soundEngine === 'triangle_warm') {
        // smooth triangle synth ( Helm style )
        const osc1 = ctx.createOscillator()
        osc1.type = 'triangle'
        osc1.frequency.setValueAtTime(frequency, now)
        
        osc1.connect(filterNode)
        sources.push(osc1)
      } else if (profile.soundEngine === 'dx7_fm_bell') {
        // 🔔 CRISP FM BELL SYNTHESIS ( Dexed FM style )
        const carrier = ctx.createOscillator()
        const modulator = ctx.createOscillator()
        const modGain = ctx.createGain()
        
        carrier.type = 'sine'
        modulator.type = 'sine'
        
        carrier.frequency.setValueAtTime(frequency, now)
        modulator.frequency.setValueAtTime(frequency * 3.5, now)
        modGain.gain.setValueAtTime(frequency * 2.5, now)
        
        modulator.connect(modGain)
        modGain.connect(carrier.frequency)
        carrier.connect(filterNode)
        
        sources.push(carrier, modulator)
      } else {
        // Fallback
        const osc1 = ctx.createOscillator()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(frequency, now)
        osc1.connect(filterNode)
        sources.push(osc1)
      }

      // Filter settings (Lowpass reflecting Cutoff and Resonance)
      const cutoffVal = plugin.parameters.find(p => p.name === 'Cutoff')?.value || 1200
      const resonanceVal = plugin.parameters.find(p => p.name === 'Resonance')?.value || 15
      
      filterNode.type = 'lowpass'
      filterNode.frequency.setValueAtTime(cutoffVal, now)
      filterNode.Q.setValueAtTime(resonanceVal / 5, now)

      filterNode.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Bridge connection to recorder destination if recording live!
      if (recorderDestRef.current) {
        gainNode.connect(recorderDestRef.current)
      }

      // ADSR Envelope
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(gainValue, now + customAttack)
      gainNode.gain.setValueAtTime(gainValue, now + customAttack)
      gainNode.gain.exponentialRampToValueAtTime(gainValue * customSustain, now + customAttack + customDecay)

      sources.forEach(src => src.start(now))

      // Stop tone gracefully with release envelope
      const stopNode = () => {
        const stopTime = ctx.currentTime
        gainNode.gain.cancelScheduledValues(stopTime)
        gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime + customRelease)
        
        setTimeout(() => {
          try {
            sources.forEach(src => {
              src.stop()
              src.disconnect()
            })
            filterNode.disconnect()
            gainNode.disconnect()
          } catch(e) {}
        }, (customRelease + 0.1) * 1000)
      }

      return stopNode
    } catch(err) {
      console.warn('Web Audio Playback failed:', err)
      return () => {}
    }
  }

  // Pre-configured Sound Presets with dial blending interpolation
  const applyPreset = (presetName: string) => {
    setActivePreset(presetName)
    const isInstrument = plugin.category.toLowerCase().includes('instrument')
    
    let targetValues: Record<string, number> = {}

    if (isInstrument) {
      if (presetName === 'Warm Analog Pad') {
        targetValues = {
          'Cutoff': 650, 'Resonance': 20, 'Attack': 1200, 'Decay': 2100,
          'Sustain': 85, 'Release': 1800, 'Oscillator Mix': 30, 'Output Volume': -2
        }
      } else if (presetName === 'Cyberpunk Bassline') {
        targetValues = {
          'Cutoff': 450, 'Resonance': 55, 'Attack': 5, 'Decay': 250,
          'Sustain': 40, 'Release': 180, 'Oscillator Mix': 90, 'Output Volume': 1
        }
      } else if (presetName === 'Astral Space Pluck') {
        targetValues = {
          'Cutoff': 2400, 'Resonance': 35, 'Attack': 8, 'Decay': 400,
          'Sustain': 20, 'Release': 350, 'Oscillator Mix': 60, 'Output Volume': 0
        }
      } else {
        // Standard
        targetValues = {
          'Cutoff': 1200, 'Resonance': 15, 'Attack': 10, 'Decay': 350,
          'Sustain': 80, 'Release': 450, 'Oscillator Mix': 50, 'Output Volume': 0
        }
      }
    } else {
      // Effects
      if (presetName === 'Ambient Cathedral Reverb') {
        targetValues = {
          'Input Gain': 0, 'Low EQ': -4, 'Mid EQ': 2, 'High EQ': 3,
          'Threshold': -25, 'Ratio': 3, 'Release Time': 1800, 'Mix / Wet': 65
        }
      } else if (presetName === 'Vocal Dynamix EQ') {
        targetValues = {
          'Input Gain': 1.5, 'Low EQ': -5, 'Mid EQ': 3.5, 'High EQ': 5,
          'Threshold': -18, 'Ratio': 4, 'Release Time': 120, 'Mix / Wet': 100
        }
      } else if (presetName === 'Warm Tube Saturation') {
        targetValues = {
          'Input Gain': 6.0, 'Low EQ': 2.5, 'Mid EQ': -1, 'High EQ': -2,
          'Threshold': -12, 'Ratio': 8, 'Release Time': 80, 'Mix / Wet': 45
        }
      } else {
        // Standard
        targetValues = {
          'Input Gain': 0, 'Low EQ': 0, 'Mid EQ': 0, 'High EQ': 0,
          'Threshold': -20, 'Ratio': 4, 'Release Time': 200, 'Mix / Wet': 100
        }
      }
    }

    const steps = 15
    const duration = 200
    const stepTime = duration / steps
    
    let currentStep = 0
    const startValues = plugin.parameters.map(p => p.value)

    const timer = setInterval(() => {
      currentStep++
      const ratio = currentStep / steps
      
      const updatedParams = plugin.parameters.map((p, idx) => {
        const target = targetValues[p.name]
        if (target === undefined) return p
        
        const start = startValues[idx]
        const blended = start + (target - start) * ratio

        // Sync to VST engine!
        const range = p.max - p.min
        const normalizedValue = range > 0 ? (blended - p.min) / range : 0
        if (window.api && typeof window.api.setVstParam === 'function') {
          window.api.setVstParam(idx, normalizedValue)
        }

        return { ...p, value: blended }
      })

      const updated = { ...plugin, parameters: updatedParams }
      setPlugin(updated)
      
      if (currentStep >= steps) {
        clearInterval(timer)
        pushStateUpdate(updated)
      }
    }, stepTime)
  }

  // 🔴 LIVE RECORDING BRIDGE LOGIC 🔴
  const startLiveRecording = () => {
    if (isRecording) return

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      // 1. Create MediaStreamAudioDestinationNode
      if (!recorderDestRef.current) {
        recorderDestRef.current = ctx.createMediaStreamDestination()
      }

      const dest = recorderDestRef.current
      recordedChunksRef.current = []
      
      // 2. Set up MediaRecorder
      const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' })
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        const rawBuffer = await blob.arrayBuffer()
        
        try {
          const decodeCtx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // 1. Decode WebM container to standard PCM AudioBuffer
          const rawAudioBuffer = await decodeCtx.decodeAudioData(rawBuffer);
          
          // 2. Automatically trim silence from start and end
          const { trimmedBuffer, leadingSilenceSec } = trimAudioBuffer(rawAudioBuffer);
          
          // 3. Convert to genuine PCM WAV ArrayBuffer
          const wavArrayBuffer = exportToWav(trimmedBuffer);

          const settings = await window.api.getSettings()
          const recDir = settings.recPath || ''
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const safeName = plugin.name.replace(/[^a-zA-Z0-9]/g, '_')
          const filename = `VST_${safeName}_Preview_${timestamp}.wav`
          const fullPath = recDir ? `${recDir}\\${filename}` : `${filename}`
          
          // Save genuine WAV file to disk
          await window.api.saveRecording(fullPath, wavArrayBuffer)
          
          // 4. Retrieve playhead position at recording start
          const dawStartPlayhead = parseFloat(localStorage.getItem('vst_recording_start_playhead') || '0');
          const finalStartPos = dawStartPlayhead + leadingSilenceSec;
          
          // Trigger localStorage event to auto-inject in Timeline Track 1!
          const payload = {
            filePath: fullPath,
            durationSec: Math.max(0.5, trimmedBuffer.duration),
            startPos: finalStartPos,
            pluginName: plugin.name
          }
          localStorage.setItem('vst_live_record_finished', JSON.stringify(payload))
          localStorage.removeItem('vst_live_record_finished') // clear right away
        } catch (err) {
          console.error('Failed to save VST preview recording:', err)
        }
      }

      startTimeRef.current = Date.now()
      setRecordingSeconds(0)
      
      // Start recording slices
      recorder.start(250)
      mediaRecorderRef.current = recorder
      setIsRecording(true)

      // Notify main window that live recording has started
      localStorage.setItem('vst_recording_state', JSON.stringify({
        active: true,
        startTime: Date.now(),
        pluginName: plugin.name
      }));

      // Trigger playback coupling if checked
      if (syncPlayback) {
        localStorage.setItem('vst_recording_action', JSON.stringify({
          action: 'play_daw',
          timestamp: Date.now()
        }));
      }

      // Start display timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1)
      }, 1000)

    } catch (err) {
      console.error('Failed to start VST recording stream:', err)
    }
  }

  const stopLiveRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return
    
    try {
      mediaRecorderRef.current.stop()
    } catch(e) {}
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    
    setIsRecording(false)
    localStorage.setItem('vst_recording_state', JSON.stringify({ active: false }));
  }

  // Piano Key rendering parameters
  const whiteKeys = [
    { note: 'C', freq: 261.63 },
    { note: 'D', freq: 293.66 },
    { note: 'E', freq: 329.63 },
    { note: 'F', freq: 349.23 },
    { note: 'G', freq: 392.00 },
    { note: 'A', freq: 440.00 },
    { note: 'B', freq: 493.88 },
    { note: 'C5', freq: 523.25 },
    { note: 'D5', freq: 587.33 },
    { note: 'E5', freq: 659.25 },
    { note: 'F5', freq: 698.46 },
    { note: 'G5', freq: 783.99 },
    { note: 'A5', freq: 880.00 },
    { note: 'B5', freq: 987.77 },
    { note: 'C6', freq: 1046.50 }
  ]

  const blackKeys = [
    { note: 'C#', freq: 277.18, offset: 20 },
    { note: 'D#', freq: 311.13, offset: 56 },
    { note: 'F#', freq: 369.99, offset: 128 },
    { note: 'G#', freq: 415.30, offset: 164 },
    { note: 'A#', freq: 466.16, offset: 200 },
    { note: 'C#5', freq: 554.37, offset: 272 },
    { note: 'D#5', freq: 622.25, offset: 308 },
    { note: 'F#5', freq: 739.99, offset: 380 },
    { note: 'G#5', freq: 830.61, offset: 416 },
    { note: 'A#5', freq: 932.33, offset: 452 }
  ]

  // Key Event triggers
  const handleKeyTriggerOn = (freq: number, index: number, isBlack: boolean) => {
    const keyId = isBlack ? 1000 + index : index
    
    setActiveKeys(prev => {
      const next = new Set(prev)
      next.add(keyId)
      return next
    })

    const stopNode = playSynthTone(freq)

    const keyUpTracker = () => {
      setActiveKeys(prev => {
        const next = new Set(prev)
        next.delete(keyId)
        return next
      })
      if (stopNode) stopNode()
      window.removeEventListener('mouseup', keyUpTracker)
    }
    window.addEventListener('mouseup', keyUpTracker)
  }

  const isInstrument = plugin.category.toLowerCase().includes('instrument')

  return (
    <div className="flex flex-col h-screen bg-[#111315] text-[#d1d5db] overflow-hidden select-none font-sans">
      
      {/* Top Header */}
      <div className="h-14 bg-[#171a1d] border-b border-[#24292e] flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          {/* Glowing LED status */}
          <button
            onClick={handleToggleBypass}
            className={`p-2 rounded-full border transition-all duration-300 active:scale-95`}
            style={{
              backgroundColor: plugin.active ? `${profile.color}15` : 'rgba(31,41,55,0.4)',
              borderColor: plugin.active ? profile.color : '#374151',
              color: plugin.active ? profile.color : '#6b7280',
              boxShadow: plugin.active ? `0 0 10px ${profile.glowColor}` : 'none'
            }}
            title={plugin.active ? t('vst_editor.bypass_on', { defaultValue: 'Bypass einschalten' }) : t('vst_editor.bypass_off', { defaultValue: 'Effekt einschalten' })}
          >
            <Power size={14} className="stroke-[2.5]" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-wide">{plugin.name}</span>
              <span className="text-[9px] bg-[#1e2227] font-mono font-bold px-1.5 py-0.5 rounded border border-[#2d333b]"
                style={{ color: profile.color }}>
                {plugin.format}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 block">
              {plugin.category} • {plugin.manufacturer}
            </span>
          </div>
        </div>

        {/* Live Audio recording bridge controls */}
        <div className="flex items-center gap-3">
          {isInstrument && (
            <div className="flex items-center gap-3 border border-gray-800 rounded-lg p-1 bg-black/40 mr-2 shadow-inner">
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 cursor-pointer select-none pl-1.5" title={t('vst_editor.sync_playback_tooltip', { defaultValue: 'Startet bei Klick auf Live-Aufnahme automatisch die DAW-Wiedergabe synchron mit.' })}>
                <input
                  type="checkbox"
                  checked={syncPlayback}
                  onChange={(e) => setSyncPlayback(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 w-3 h-3 cursor-pointer"
                />
                <span>{t('vst_editor.sync_playback', { defaultValue: 'DAW mitstarten' })}</span>
              </label>

              {isRecording ? (
                <button
                  onClick={stopLiveRecording}
                  className="h-7 px-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded flex items-center gap-1.5 shadow animate-pulse"
                >
                  <Square size={11} fill="white" />
                  <span>{t('vst_editor.stop', { defaultValue: 'Stopp' })} ({recordingSeconds}s)</span>
                </button>
              ) : (
                <button
                  onClick={startLiveRecording}
                  className="h-7 px-3 bg-cyan-950/40 border border-cyan-500/25 hover:bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded flex items-center gap-1.5"
                  title={t('vst_editor.live_recording_tooltip', { defaultValue: 'Spiele Noten auf der Tastatur und nimm das Gespielte live als neuen Clip auf die Timeline auf!' })}
                >
                  <Mic size={11} className="text-cyan-400" />
                  <span>{t('vst_editor.live_recording', { defaultValue: 'Live-Aufnahme' })}</span>
                </button>
              )}
            </div>
          )}

          {/* Preset & Meta selector */}
          <div className="flex items-center gap-2 bg-[#0a0b0d] border border-[#24292e] rounded-lg px-2.5 py-1">
            <Sparkles size={11} className="text-amber-500" />
            <select
              value={activePreset}
              onChange={e => applyPreset(e.target.value)}
              className="bg-transparent text-xs text-amber-500 border-none outline-none font-semibold cursor-pointer py-0.5 pr-2"
            >
              {profile.presets.map((pr, i) => (
                <option key={i} value={pr} className="bg-[#101214] text-white">
                  {t('vst_editor.preset', { defaultValue: 'Preset' })}: {pr}
                </option>
              ))}
            </select>
          </div>

          {/* Natives VST Interface Trigger */}
          <button
            onClick={async () => {
              setIsCompactMode(true);
              await window.api.openVstEditor();
            }}
            className="h-7 px-3 bg-omega-accent hover:bg-blue-500 text-white text-[10.5px] font-bold rounded flex items-center gap-1.5 transition-all shadow active:scale-95 cursor-pointer"
            title={t('vst_editor.native_interface_tooltip', { defaultValue: 'Öffne das echte Original-Fenster des Plugin-Herstellers.' })}
          >
            <Sparkles size={11} />
            <span>{t('vst_editor.native_interface', { defaultValue: 'Natives Interface' })}</span>
          </button>

          {/* Compact Mode Toggle */}
          <button
            onClick={() => setIsCompactMode(!isCompactMode)}
            className={`h-7 px-3 text-[10.5px] font-bold rounded flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isCompactMode
                ? 'bg-amber-650 hover:bg-amber-500 text-white shadow'
                : 'bg-[#2a2d32] hover:bg-gray-700 text-gray-300 border border-[#3e444d]'
            }`}
            title={t('vst_editor.compact_mode_tooltip', { defaultValue: 'Blende Regler, Tastatur und Oszilloskop aus, um Platz zu sparen.' })}
          >
            <span>{isCompactMode ? t('vst_editor.show_controls', { defaultValue: 'Regler zeigen' }) : t('vst_editor.compact_mode', { defaultValue: 'Kompakt-Modus' })}</span>
          </button>
          
          <span className="text-[10px] text-gray-650 font-mono">ID: {plugin.id}</span>
        </div>
      </div>

      {/* Main Rack / Visualizer Split Panel */}
      {!isCompactMode && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#101214]/65">
        
        {/* Left Side: Parameters Grid */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 flex items-center justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-2xl">
            {plugin.parameters.map((param, idx) => {
              const percent = (param.value - param.min) / (param.max - param.min)
              const rotation = -135 + percent * 270

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-2 p-3 bg-[#171a1d]/65 border border-[#21262d]/45 hover:border-gray-700/60 rounded-2xl shadow-xl transition-all"
                >
                  <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase text-center block w-full truncate">
                    {param.name}
                  </span>

                  {/* Circular Rotary Dial */}
                  <div
                    onMouseDown={(e) => handleKnobMouseDown(e, idx)}
                    onDoubleClick={() => handleResetParam(idx)}
                    className="relative w-16 h-16 rounded-full bg-[#111315] border-2 border-[#2b3038] shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)] cursor-ns-resize flex items-center justify-center group"
                    title={t('vst_editor.dial_tooltip', { defaultValue: 'Ziehen zum Einstellen. Doppelklick zum Zurücksetzen.' })}
                  >
                    {/* Ring indicator matches VST custom profile theme color */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="27"
                        stroke="#1b1e22"
                        strokeWidth="2.5"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="27"
                        stroke={profile.color}
                        strokeWidth="2.5"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 27}
                        strokeDashoffset={2 * Math.PI * 27 * (1 - percent * 0.75)}
                        className="transition-all duration-75"
                        style={{ transformOrigin: 'center', transform: 'rotate(-135deg)' }}
                      />
                    </svg>

                    {/* Rotary tick */}
                    <div
                      className="absolute w-1 h-6 bg-white/90 rounded-full transition-transform duration-75 origin-bottom"
                      style={{
                        transform: `rotate(${rotation}deg) translateY(-14px)`,
                        transformOrigin: 'bottom center'
                      }}
                    >
                      <div className="w-1 h-2 rounded-full" style={{ backgroundColor: profile.color }}></div>
                    </div>
                  </div>

                  {/* Value and Reset */}
                  <div className="flex items-center gap-1.5 mt-1 bg-[#0b0c0e]/80 border border-[#21262d] rounded-md px-2 py-0.5 shadow-md">
                    <span className="text-[10px] text-white font-mono font-semibold tracking-wider">
                      {param.value.toFixed(1)}
                    </span>
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">
                      {param.unit}
                    </span>
                    
                    <button
                      onClick={() => handleResetParam(idx)}
                      title={t('vst_editor.reset_dial', { defaultValue: 'Regler zurücksetzen' })}
                      className="p-0.5 hover:bg-gray-800 rounded transition-all text-gray-650 hover:text-white"
                    >
                      <RotateCcw size={8} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Side: Oscilloscope Waveform Panel */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#24292e] bg-[#0c0d0f]/90 flex flex-col flex-shrink-0 z-0">
          <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
              <Activity size={12} className="animate-pulse" style={{ color: profile.color }} />
              {t('vst_editor.realtime_dsp', { defaultValue: 'Echtzeit-Signal-DSP' })}
            </span>
            <button
              onClick={() => setShowOscilloscope(!showOscilloscope)}
              className="text-[9px] bg-[#1e2227] hover:bg-gray-800 border border-[#2d333b] rounded px-1.5 py-0.5 text-gray-300 transition-colors cursor-pointer"
              title={t('vst_editor.show_oscilloscope_tooltip', { defaultValue: 'Schont CPU-Leistung bei Deaktivierung' })}
            >
              {showOscilloscope ? t('common.hide', { defaultValue: 'Ausblenden' }) : t('common.show', { defaultValue: 'Einblenden' })}
            </button>
          </div>

          {/* Interactive reactive wave canvas */}
          <div className="flex-1 relative p-4 flex items-center justify-center bg-[#070809]">
            {showOscilloscope ? (
              <canvas
                ref={canvasRef}
                width="280"
                height="200"
                className="border border-[#1f2329]/80 rounded-xl bg-black/60 shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
              />
            ) : (
              <div className="w-[280px] h-[200px] border border-[#1f2329]/80 rounded-xl bg-[#0f1115] flex flex-col items-center justify-center text-center p-4 shadow-inner">
                <Activity size={32} className="stroke-[1.5] mb-2 opacity-30" style={{ color: profile.color }} />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('vst_editor.dsp_wave_paused', { defaultValue: 'DSP Welle pausiert' })}</span>
                <span className="text-[9px] text-gray-600 mt-1 max-w-[200px] leading-relaxed">
                  {t('vst_editor.cpu_saver_description', { defaultValue: 'CPU-Schoner aktiv. Die Audiobearbeitung läuft im Hintergrund mit ultra-niedriger Latenz weiter.' })}
                </span>
              </div>
            )}
          </div>
          
          {/* Quick Stats Panel */}
          <div className="p-4 border-t border-[#21262d] space-y-2 text-[10px] font-mono text-gray-500 bg-[#0e1012]">
            <div className="flex justify-between">
              <span>{t('vst_editor.format_standard', { defaultValue: 'FORMAT STANDARD:' })}</span>
              <span className="text-gray-300 font-semibold">{plugin.format} Host API</span>
            </div>
            <div className="flex justify-between">
              <span>{t('vst_editor.latency_optimization', { defaultValue: 'LATENZ OPTIMIERUNG:' })}</span>
              <span className="font-semibold" style={{ color: profile.color }}>2.5 ms (Low-Lat)</span>
            </div>
            <div className="flex justify-between">
              <span>{t('vst_editor.dsp_engine', { defaultValue: 'DSP ENGINE:' })}</span>
              <span className="font-semibold" style={{ color: plugin.active ? '#10b981' : '#ef4444' }}>
                {plugin.active ? profile.soundEngine.toUpperCase() : "BYPASSED / OFF"}
              </span>
            </div>
          </div>
        </div>

        </div>
      )}

      {/* Interactive Piano Keyboard (Synthesizer/Instrument only) */}
      {!isCompactMode && isInstrument && (
        <div className="h-28 bg-[#0a0b0d] border-t border-[#24292e] flex flex-col justify-end flex-shrink-0 z-10">
          <div className="flex items-center px-4 py-1.5 border-b border-[#1b1f24] text-[9px] font-mono text-gray-500 justify-between">
            <span className="flex items-center gap-1.5">
              <Music size={11} className="text-amber-500 animate-pulse" />
              {t('vst_editor.integrated_previewer', { defaultValue: 'INTEGRIERTER VSTi-PREVIEWER — KLICKE TASTEN ZUM ABSPIELEN' })}
            </span>
            <span>{t('vst_editor.octave', { defaultValue: 'OKTAVE: C3 - C5' })}</span>
          </div>
          
          {/* Keys layout */}
          <div className="flex-1 flex relative select-none">
            {whiteKeys.map((key, idx) => {
              const active = activeKeys.has(idx)
              return (
                <div
                  key={idx}
                  onMouseDown={() => handleKeyTriggerOn(key.freq, idx, false)}
                  className={`flex-1 border-r border-[#1a1d22] transition-colors relative cursor-pointer flex items-end justify-center pb-2 text-[8px] font-mono font-bold select-none ${
                    active 
                      ? 'border-t-4 text-cyan-200' 
                      : 'bg-gradient-to-b from-[#f9fafb] to-[#d1d5db] hover:from-[#f3f4f6] hover:to-[#e5e7eb] text-gray-650'
                  }`}
                  style={{ 
                    height: '100%',
                    borderTopColor: active ? profile.color : 'transparent',
                    background: active ? `linear-gradient(to top, ${profile.color}2b, ${profile.color}0a)` : undefined
                  }}
                >
                  {key.note}
                </div>
              )
            })}

            {/* Floating Black keys */}
            {blackKeys.map((key, idx) => {
              const active = activeKeys.has(1000 + idx)
              return (
                <div
                  key={idx}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleKeyTriggerOn(key.freq, idx, true)
                  }}
                  className={`absolute w-7 rounded-b-md transition-colors cursor-pointer flex items-end justify-center pb-1 text-[7px] font-mono font-bold select-none z-20 shadow-lg ${
                    active 
                      ? 'border-t-2 text-white' 
                      : 'bg-[#181a1d] hover:bg-gray-900 text-white'
                  }`}
                  style={{
                    height: '62%',
                    left: `calc((${key.offset}% / 480) * 100)`,
                    borderTopColor: active ? profile.color : 'transparent',
                    background: active ? `linear-gradient(to bottom, #7e22ce, ${profile.color})` : undefined,
                    boxShadow: active ? `0 0 10px ${profile.glowColor}` : 'none'
                  }}
                >
                  {key.note}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      {!isCompactMode && (
        <div className="h-8 bg-[#171a1d] border-t border-[#24292e] flex items-center justify-between px-6 text-[10px] text-gray-500 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Volume2 size={11} className="text-gray-400" />
            <span>Post-cleaning, pre-fader DSP signal connection</span>
          </div>
          <span className="font-mono tracking-wider">Audio Engine Pro v0.8.5</span>
        </div>
      )}
      
    </div>
  )
}
