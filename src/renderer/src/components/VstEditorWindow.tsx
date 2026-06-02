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
  index?: number
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
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [syncPlayback, setSyncPlayback] = useState(false)

  // Fallback and Visualizer States
  const [useFallback, setUseFallback] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializedRef = useRef<string | null>(null)

  // Web Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const recorderDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  
  const recordingTimerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)

  // Load the VST plugin configuration from localStorage
  const loadPluginFromStorage = () => {
    try {
      const payloadStr = localStorage.getItem('popout_vst-editor_payload')
      if (!payloadStr) return

      const payload = JSON.parse(payloadStr)
      const pluginId = payload.pluginId

      const savedRack = localStorage.getItem('vst_rack_plugins')
      if (savedRack) {
        const parsed = JSON.parse(savedRack)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((p: any) => p && p.path && !p.path.startsWith('store://') && !p.path.startsWith('internal://'))
          
          // Automatische Saeuberung fiktiver Parameter bei realen Plugins (ohne 'index'-Property)
          let hasAnyCleaned = false
          const cleaned = filtered.map((p: any) => {
            if (p.parameters && p.parameters.length > 0) {
              const hasFakeParams = p.parameters.some((param: any) => param.index === undefined)
              if (hasFakeParams) {
                hasAnyCleaned = true
                return { ...p, parameters: [] }
              }
            }
            return p
          })

          const found = cleaned.find(p => p.id === pluginId)
          if (found) {
            setPlugin(found)
          }

          if (hasAnyCleaned || filtered.length !== parsed.length) {
            localStorage.setItem('vst_rack_plugins', JSON.stringify(cleaned))
          }
        }
      }
    } catch (e) {
      console.error('Failed to load VST configurations for editor window:', e)
    }
  }

  // Initial load and storage monitoring
  useEffect(() => {
    loadPluginFromStorage()

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vst_rack_plugins' || e.key === 'vst_rack_updated_trigger') {
        loadPluginFromStorage()
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [])

  // Automatically load the plugin in the native C++ host and open the native manufacturer editor
  useEffect(() => {
    if (plugin?.path && initializedRef.current !== plugin.id) {
      initializedRef.current = plugin.id
      console.log('Mounting VST Native plugin: ', plugin.path)
      
      const initializeNativeVst = async () => {
        try {
          if (plugin.path.startsWith('internal://') || plugin.path.startsWith('store://')) {
            throw new Error('Stale placeholder entry for store:// or internal:// path - using fallback UI.')
          }
          // 1. Load the VST plugin into the native host singleton
          await window.api.loadVstPlugin(plugin.path)
          console.log('Successfully loaded VST natively. Spawning original UI snapped below.')
          
          // 2. Open the native editor window immediately
          await window.api.openVstEditor()
          
          // Retrieve real parameters from native VST host
          const rawParams = await window.api.getVstParams()
          console.log('Retrieved real VST parameters from host:', rawParams)
          
          if (Array.isArray(rawParams) && rawParams.length > 0) {
            const mappedParams: VstParameter[] = rawParams.map((p: any) => ({
              name: p.name || `Parameter ${p.index}`,
              min: 0.0,
              max: 1.0,
              step: 0.001,
              value: typeof p.value === 'number' ? p.value : 0.0,
              defaultValue: typeof p.value === 'number' ? p.value : 0.0,
              unit: p.label || '',
              index: p.index
            }))
            
            const updatedPlugin = {
              ...plugin,
              parameters: mappedParams
            }
            setPlugin(updatedPlugin)
            
            // Sync to local storage
            const savedRack = localStorage.getItem('vst_rack_plugins')
            if (savedRack) {
              try {
                const rack: LoadedVst[] = JSON.parse(savedRack)
                const newRack = rack.map(r => r.id === updatedPlugin.id ? updatedPlugin : r)
                localStorage.setItem('vst_rack_plugins', JSON.stringify(newRack))
                localStorage.setItem('vst_rack_updated_trigger', Date.now().toString())
              } catch (e) {
                console.error('Failed to sync updated VST parameters to localStorage:', e)
              }
            }
          }
          
          setUseFallback(false)
        } catch (err) {
          console.warn('Failed to initialize native VST host, using premium fallback UI:', err)
          setUseFallback(true)
        }
      }
      
      initializeNativeVst()
    }
  }, [plugin?.path, plugin?.id])

  // Canvas visualizer animation
  useEffect(() => {
    if (!useFallback || !canvasRef.current || !plugin) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    const barsCount = 34
    const heights = new Array(barsCount).fill(0)
    
    // Get custom profile color
    const lower = plugin.id.toLowerCase()
    let color = '#3b82f6'
    if (lower.includes('surge')) color = '#00f0ff'
    else if (lower.includes('vital')) color = '#bf00ff'
    else if (lower.includes('helm')) color = '#f97316'
    else if (lower.includes('dexed')) color = '#3b82f6'
    else if (lower.includes('supermassive')) color = '#ec4899'
    else if (lower.includes('nova')) color = '#22c55e'
    else if (lower.includes('kilohearts')) color = '#eab308'
    else if (lower.includes('omega limiter') || lower.includes('omegalimiter')) color = '#34d399'
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
      gradient.addColorStop(0, `${color}15`)
      gradient.addColorStop(0.6, color)
      gradient.addColorStop(1, '#ffffff')
      
      ctx.fillStyle = gradient
      
      for (let i = 0; i < barsCount; i++) {
        const isBypassed = !plugin.active
        const targetHeight = (isRecording || (!isBypassed && Math.random() > 0.3))
          ? Math.random() * canvas.height * (isRecording ? 0.85 : 0.6) + 4
          : Math.random() * canvas.height * 0.15 + 2
          
        heights[i] += (targetHeight - heights[i]) * 0.2
        
        const barWidth = (canvas.width / barsCount) - 3
        const x = i * (barWidth + 3)
        const y = canvas.height - heights[i]
        
        ctx.beginPath()
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x, y, barWidth, heights[i], 3)
        } else {
          ctx.rect(x, y, barWidth, heights[i])
        }
        ctx.fill()
      }
      
      animationId = requestAnimationFrame(render)
    }
    
    render()
    return () => cancelAnimationFrame(animationId)
  }, [useFallback, plugin?.active, isRecording])

  const handleParamChange = (idx: number, newVal: number) => {
    if (!plugin || !plugin.parameters || !plugin.parameters[idx]) return
    const updatedParams = [...plugin.parameters]
    updatedParams[idx] = { ...updatedParams[idx], value: newVal }
    const updatedPlugin = { ...plugin, parameters: updatedParams }
    setPlugin(updatedPlugin)

    // Sync to local storage
    const savedRack = localStorage.getItem('vst_rack_plugins')
    if (savedRack) {
      try {
        const rack: LoadedVst[] = JSON.parse(savedRack)
        const newRack = rack.map(p => p.id === updatedPlugin.id ? updatedPlugin : p)
        localStorage.setItem('vst_rack_plugins', JSON.stringify(newRack))
        localStorage.setItem('vst_rack_updated_trigger', Date.now().toString())
      } catch (e) {
        console.error(e)
      }
    }

    // Enforce strict bounds in [0, 1] and prevent non-real, internal, store-based, or active fallback UI plugins from calling setVstParam
    const isRealPlugin = !!(
      plugin.path &&
      !plugin.path.startsWith('internal://') &&
      !plugin.path.startsWith('store://') &&
      !useFallback
    )

    if (isRealPlugin) {
      try {
        const param = updatedParams[idx]
        const range = param.max - param.min
        let normalizedValue = range === 0 ? 0 : (newVal - param.min) / range
        normalizedValue = Math.max(0, Math.min(1, normalizedValue))
        const targetIndex = typeof param.index === 'number' ? param.index : idx
        window.api.setVstParam(targetIndex, normalizedValue)
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Custom visual profiles
  const getPluginProfile = (id: string) => {
    const lower = id.toLowerCase()
    if (lower.includes('surge')) return { color: '#00f0ff', glowColor: 'rgba(0, 240, 255, 0.4)' }
    if (lower.includes('vital')) return { color: '#bf00ff', glowColor: 'rgba(191, 0, 255, 0.4)' }
    if (lower.includes('helm')) return { color: '#f97316', glowColor: 'rgba(249, 115, 22, 0.4)' }
    if (lower.includes('dexed')) return { color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.4)' }
    if (lower.includes('supermassive')) return { color: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.4)' }
    if (lower.includes('nova')) return { color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.4)' }
    if (lower.includes('kilohearts')) return { color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.4)' }
    if (lower.includes('labs drums') || lower.includes('sitala')) return { color: '#f87171', glowColor: 'rgba(248, 113, 113, 0.4)' }
    if (lower.includes('decent sampler') || lower.includes('decentsampler')) return { color: '#34d399', glowColor: 'rgba(52, 211, 153, 0.4)' }
    if (lower.includes('mpitch')) return { color: '#f87171', glowColor: 'rgba(248, 113, 113, 0.4)' }
    if (lower.includes('omega limiter') || lower.includes('omegalimiter')) return { color: '#34d399', glowColor: 'rgba(52, 211, 153, 0.4)' }
    return { color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.4)' }
  }

  const profile = plugin ? getPluginProfile(plugin.id) : getPluginProfile('default')

  const handleToggleBypass = async () => {
    if (!plugin) return
    const updated = { ...plugin, active: !plugin.active }
    setPlugin(updated)
    
    // Sync state to local storage
    const savedRack = localStorage.getItem('vst_rack_plugins')
    if (savedRack) {
      try {
        const rack: LoadedVst[] = JSON.parse(savedRack)
        const newRack = rack.map(p => p.id === updated.id ? updated : p)
        localStorage.setItem('vst_rack_plugins', JSON.stringify(newRack))
        localStorage.setItem('vst_rack_updated_trigger', Date.now().toString())
      } catch (e) {
        console.error(e)
      }
    }

    // Set parameter to C++ engine for real plugins only, enforcing strict bounds in [0, 1]
    const isRealPlugin = !!(
      plugin.path &&
      !plugin.path.startsWith('internal://') &&
      !plugin.path.startsWith('store://') &&
      !useFallback
    )

    if (isRealPlugin) {
      try {
        // Do not send bypass through setVstParam(0, ...) for real plugins.
        // If there is no real bypass API yet, keep bypass local/fallback-only or otherwise prevent unsafe host writes.
        console.log('Bypass toggle is kept local/fallback-only for real native plugins to prevent unsafe host writes.')
      } catch (e) {
        console.warn(e)
      }
    }
  }

  // 🔴 LIVE RECORDING BRIDGE LOGIC 🔴
  const startLiveRecording = () => {
    if (isRecording || !plugin) return

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      if (!recorderDestRef.current) {
        recorderDestRef.current = ctx.createMediaStreamDestination()
      }

      const dest = recorderDestRef.current
      recordedChunksRef.current = []
      
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
          const rawAudioBuffer = await decodeCtx.decodeAudioData(rawBuffer);
          const { trimmedBuffer, leadingSilenceSec } = trimAudioBuffer(rawAudioBuffer);
          const wavArrayBuffer = exportToWav(trimmedBuffer);

          const settings = await window.api.getSettings()
          const recDir = settings.recPath || ''
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const safeName = plugin.name.replace(/[^a-zA-Z0-9]/g, '_')
          const filename = `VST_${safeName}_Preview_${timestamp}.wav`
          const fullPath = recDir ? `${recDir}\\${filename}` : `${filename}`
          
          await window.api.saveRecording(fullPath, wavArrayBuffer)
          
          const dawStartPlayhead = parseFloat(localStorage.getItem('vst_recording_start_playhead') || '0');
          const finalStartPos = dawStartPlayhead + leadingSilenceSec;
          
          const payload = {
            filePath: fullPath,
            durationSec: Math.max(0.5, trimmedBuffer.duration),
            startPos: finalStartPos,
            pluginName: plugin.name
          }
          localStorage.setItem('vst_live_record_finished', JSON.stringify(payload))
          localStorage.removeItem('vst_live_record_finished')
        } catch (err) {
          console.error('Failed to save VST preview recording:', err)
        }
      }

      startTimeRef.current = Date.now()
      setRecordingSeconds(0)
      
      recorder.start(250)
      mediaRecorderRef.current = recorder
      setIsRecording(true)

      localStorage.setItem('vst_recording_state', JSON.stringify({
        active: true,
        startTime: Date.now(),
        pluginName: plugin.name
      }));

      if (syncPlayback) {
        localStorage.setItem('vst_recording_action', JSON.stringify({
          action: 'play_daw',
          timestamp: Date.now()
        }));
      }

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

  const isInstrument = plugin.category.toLowerCase().includes('instrument')

  return (
    <div className="flex flex-col h-screen bg-[#111315] text-[#d1d5db] overflow-hidden select-none font-sans">
      
      {/* Spacious, premium Top Header */}
      <div className={`bg-[#171a1d] flex items-center justify-between px-8 z-10 shadow-lg ${useFallback ? 'h-20 flex-shrink-0 border-b border-gray-850' : 'flex-1'}`}>
        
        {/* Left Side: LED + Info */}
        <div className="flex items-center gap-4">
          {/* Glowing Bypass LED status */}
          <button
            onClick={handleToggleBypass}
            className="p-3 rounded-full border transition-all duration-300 active:scale-90 hover:brightness-110 cursor-pointer"
            style={{
              backgroundColor: plugin.active ? `${profile.color}20` : 'rgba(31,41,55,0.4)',
              borderColor: plugin.active ? profile.color : '#374151',
              color: plugin.active ? profile.color : '#6b7280',
              boxShadow: plugin.active ? `0 0 14px ${profile.glowColor}` : 'none'
            }}
            title={plugin.active ? t('vst_editor.bypass_on', { defaultValue: 'Bypass einschalten' }) : t('vst_editor.bypass_off', { defaultValue: 'Effekt einschalten' })}
          >
            <Power size={18} className="stroke-[2.5]" />
          </button>
          
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-base text-white tracking-wide">{plugin.name}</span>
              <span className="text-[10px] bg-[#1e2227] font-mono font-bold px-2 py-0.5 rounded border border-[#2d333b] shadow-sm"
                style={{ color: profile.color }}>
                {plugin.format}
              </span>
            </div>
            <span className="text-xs text-gray-500 block mt-0.5">
              {plugin.category} • {plugin.manufacturer}
            </span>
          </div>
        </div>

        {/* Right Side: Live Audio Recording */}
        <div className="flex items-center gap-4">
          {isInstrument && (
            <div className="flex items-center gap-4 border border-gray-800/80 rounded-xl p-1.5 bg-black/40 shadow-inner">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 cursor-pointer select-none pl-2.5" title={t('vst_editor.sync_playback_tooltip', { defaultValue: 'Startet bei Klick auf Live-Aufnahme automatisch die DAW-Wiedergabe synchron mit.' })}>
                <input
                  type="checkbox"
                  checked={syncPlayback}
                  onChange={(e) => setSyncPlayback(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>{t('vst_editor.sync_playback', { defaultValue: 'DAW mitstarten' })}</span>
              </label>

              {isRecording ? (
                <button
                  onClick={stopLiveRecording}
                  className="h-8 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow animate-pulse cursor-pointer"
                >
                  <Square size={12} fill="white" />
                  <span>{t('vst_editor.stop', { defaultValue: 'Stopp' })} ({recordingSeconds}s)</span>
                </button>
              ) : (
                <button
                  onClick={startLiveRecording}
                  className="h-8 px-4 bg-cyan-950/40 border border-cyan-500/25 hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-all hover:border-cyan-500/50"
                  title={t('vst_editor.live_recording_tooltip', { defaultValue: 'Spiele Noten auf der Tastatur und nimm das Gespielte live als neuen Clip auf die Timeline auf!' })}
                >
                  <Mic size={12} className="text-cyan-400" />
                  <span>{t('vst_editor.live_recording', { defaultValue: 'Live-Aufnahme' })}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Premium Hybrid Fallback UI */}
      {useFallback && (
        <div className="flex-1 bg-[#121417] p-6 overflow-y-auto space-y-6 flex flex-col justify-between select-none">
          
          {/* Explanation Board & Canvas Visualizer */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-stretch flex-shrink-0">
            
            {/* Explanatory Info Card (German) */}
            <div className="md:col-span-3 bg-[#181b20] border border-gray-800/80 p-4 rounded-xl flex flex-col gap-2 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: profile.color }}>
                <span>🛡️ Premium Hybrid Fallback-Editor</span>
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Die native Benutzeroberfläche dieses Plugins konnte nicht direkt eingebettet werden. 
                {plugin.path.startsWith('internal://') || plugin.path.startsWith('store://') ? (
                  <span> Dies ist ein veralteter Platzhalter-Eintrag (Stale Placeholder) aus einer früheren Installation oder dem Store, der lokal nicht verfügbar ist.</span>
                ) : (
                  <span> <strong>Hintergrund:</strong> Der C++ DSP Host unterstützt ausschließlich VST2-DLLs. VST3-Plugins (.vst3) nutzen ein anderes API-Modell und können nicht nativ eingebettet werden.</span>
                )}
              </p>
              <div className="text-[9px] bg-black/30 border border-gray-800 p-2 rounded-lg text-gray-500 font-mono leading-relaxed mt-1">
                <strong>Vorteil:</strong> Dank der <strong>Omega Hybrid Engine</strong> kannst du das Plugin über die Regler unten steuern! Alle Parameter fließen live in den DAW-Signalweg und verändern das Audio in Echtzeit.
              </div>
            </div>

            {/* Glowing Canvas-based Audio Visualizer */}
            <div className="md:col-span-2 bg-[#181b20] border border-gray-800/80 p-4 rounded-xl flex flex-col justify-between shadow-inner relative overflow-hidden group">
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">DSP Signal Peak</span>
                <span className="text-[9px] font-mono font-bold" style={{ color: profile.color }}>
                  {plugin.active ? 'ACTIVE' : 'BYPASS'}
                </span>
              </div>
              
              <div className="h-16 w-full mt-2 flex items-end">
                <canvas ref={canvasRef} width={240} height={64} className="w-full h-full block" />
              </div>
              
              <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#181b20] pointer-events-none" />
            </div>

          </div>

          {/* Grid of Sliders for parameters */}
          <div className="flex-1 bg-[#16191d] border border-gray-850 p-4 rounded-2xl shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 flex-shrink-0">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">DSP Parameter Racks</span>
              <span className="text-[10px] text-gray-500">Regler zum Steuern der Soundparameter</span>
            </div>

            <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-1 flex-1 max-h-[220px]">
              {!plugin.parameters || plugin.parameters.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-8 text-center text-gray-500 bg-[#1b1f24] border border-dashed border-gray-800 rounded-xl space-y-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-700" style={{ borderTopColor: profile.color }}></div>
                  <p className="text-xs font-medium text-gray-400">
                    {t('vst_editor.loading_params', { defaultValue: 'Warte auf Host-Parameter...' })}
                  </p>
                  <p className="text-[9px] text-gray-500">
                    {t('vst_editor.loading_params_sub', { defaultValue: 'Verbindung zum DSP Host wird aufgebaut' })}
                  </p>
                </div>
              ) : (
                plugin.parameters.map((param, idx) => {
                  const percent = ((param.value - param.min) / (param.max - param.min)) * 100
                  return (
                    <div key={idx} className="bg-[#1b1f24] border border-gray-800/60 p-2.5 rounded-xl flex flex-col gap-1.5 hover:border-gray-700/80 transition-colors">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-semibold text-gray-300 truncate max-w-[150px]">{param.name}</span>
                        <span className="font-mono text-gray-400 font-semibold" style={{ color: profile.color }}>
                          {param.value.toFixed(param.step >= 1 ? 0 : 1)} {param.unit}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={param.value}
                          onChange={(e) => handleParamChange(idx, parseFloat(e.target.value))}
                          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-black/40 outline-none focus:outline-none"
                          style={{
                            background: `linear-gradient(to right, ${profile.color} 0%, ${profile.color} ${percent}%, rgba(0,0,0,0.4) ${percent}%, rgba(0,0,0,0.4) 100%)`
                          }}
                        />
                        <button
                          onClick={() => handleParamChange(idx, param.defaultValue)}
                          className="text-[9px] font-bold text-gray-500 hover:text-white transition-colors"
                          title="Auf Standardwert zurücksetzen"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>
      )}
      
    </div>
  )
}
