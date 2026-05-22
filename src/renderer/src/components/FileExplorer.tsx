import React, { useState, useEffect, useRef } from 'react'
import { Folder, FileAudio, FileVideo, ArrowLeft, Play, Pause, Square, HardDrive, User, Download, Music, Search, Volume2, VolumeX, X } from 'lucide-react'
import { AudioEngine } from '../lib/AudioEngine'

type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
}

export function FileExplorer() {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [playingName, setPlayingName] = useState<string>('')
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null)
  const [activeTab, setActiveTab] = useState('Import')
  const [searchQuery, setSearchQuery] = useState('')

  // Preview Player states
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null)

  // Project Timeline Synchronisation states
  const [projectIsPlaying, setProjectIsPlaying] = useState(false)
  const [projectTime, setProjectTime] = useState(0)
  const [projectDuration, setProjectDuration] = useState(30)

  // Keep track of audio reference to update time
  const timeUpdateRef = useRef<number | null>(null)

  // Listen for timeline playback status events
  useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ isPlaying: boolean; playheadPos: number; duration: number }>
      setProjectIsPlaying(customEvent.detail.isPlaying)
      setProjectTime(customEvent.detail.playheadPos)
      setProjectDuration(customEvent.detail.duration)
    }
    window.addEventListener('TIMELINE_PLAYBACK_STATUS', handleStatus as EventListener)
    return () => {
      window.removeEventListener('TIMELINE_PLAYBACK_STATUS', handleStatus as EventListener)
    }
  }, [])

  // Project Transport control actions
  const handleProjectPlayPause = () => {
    window.dispatchEvent(new CustomEvent('TIMELINE_ACTION_PLAY'))
  }

  const handleProjectStop = () => {
    window.dispatchEvent(new CustomEvent('TIMELINE_ACTION_STOP'))
  }

  const handleProjectSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    window.dispatchEvent(new CustomEvent('TIMELINE_ACTION_SEEK', { detail: { position: val } }))
  }

  const handleProjectVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value)
    setVolume(newVol)
    setIsMuted(false)
    AudioEngine.getInstance().setMasterVolume(newVol)
  }

  const toggleProjectMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    AudioEngine.getInstance().setMasterVolume(nextMuted ? 0 : volume)
  }

  useEffect(() => {
    window.api.getHomeDir().then(home => {
      loadDirectory(home)
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioObj) {
        audioObj.pause()
        audioObj.src = ''
      }
      if (audioCtx) {
        audioCtx.close()
      }
    }
  }, [audioObj, audioCtx])

  const loadDirectory = async (dirPath: string) => {
    try {
      const dirFiles = await window.api.readDir(dirPath)
      setFiles(dirFiles)
      setCurrentPath(dirPath)
    } catch (e) {
      console.error(e)
    }
  }

  const navigateTo = (entry: FileEntry) => {
    if (entry.isDirectory) {
      setHistory([...history, currentPath])
      loadDirectory(entry.path)
    } else {
      if (entry.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        playPreview(entry.path)
      }
    }
  }

  const goBack = () => {
    if (history.length > 0) {
      const newHistory = [...history]
      const prevPath = newHistory.pop()!
      setHistory(newHistory)
      loadDirectory(prevPath)
    }
  }

  const playPreview = (filePath: string) => {
    // 1. Stop existing preview
    if (audioObj) {
      audioObj.pause()
      audioObj.src = ''
    }

    const name = filePath.replace(/.*[\\\/]/, '')
    setPlayingName(name)
    setPlayingAudio(filePath)

    // 2. Create new Audio instance with Electron atom:// protocol
    const url = `atom://${filePath}`
    const audio = new Audio(url)
    audio.volume = isMuted ? 0 : volume

    // 3. Connect to a dedicated AudioContext for real-time visualization
    try {
      // Close previous audio context if any
      if (audioCtx) {
        audioCtx.close()
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContextClass()
      const analyserNode = ctx.createAnalyser()
      analyserNode.fftSize = 64 // compact size for smooth visualization
      
      const source = ctx.createMediaElementSource(audio)
      source.connect(analyserNode)
      analyserNode.connect(ctx.destination)

      setAudioCtx(ctx)
      setAnalyser(analyserNode)
    } catch (err) {
      console.warn('Failed to set up preview Web Audio Visualizer:', err)
    }

    audio.play()
    setIsPlaying(true)
    setAudioObj(audio)
    setActiveTab('Player') // Auto-switch to Player tab on preview start

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0)
    }

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime)
    }

    audio.onended = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  const stopPreview = () => {
    if (audioObj) {
      audioObj.pause()
      audioObj.src = ''
      setAudioObj(null)
    }
    setPlayingAudio(null)
    setPlayingName('')
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setAnalyser(null)
    if (audioCtx) {
      audioCtx.close()
      setAudioCtx(null)
    }
  }

  const handlePlayPause = () => {
    if (!audioObj) return
    if (isPlaying) {
      audioObj.pause()
      setIsPlaying(false)
    } else {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume()
      }
      audioObj.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioObj) return
    const newTime = parseFloat(e.target.value)
    audioObj.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value)
    setVolume(newVol)
    setIsMuted(false)
    if (audioObj) {
      audioObj.volume = newVol
    }
  }

  const toggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (audioObj) {
      audioObj.volume = nextMuted ? 0 : volume
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00'
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getFileIcon = (name: string) => {
    if (name.match(/\.(mp3|wav|ogg|m4a|wma)$/i)) return <FileAudio size={16} className="text-blue-400" />
    if (name.match(/\.(mp4|mkv|mov|avi)$/i)) return <FileVideo size={16} className="text-purple-400" />
    return <Folder size={16} className="text-yellow-400" />
  }

  const onDragStart = (e: React.DragEvent, file: FileEntry) => {
    e.dataTransfer.setData('application/json', JSON.stringify(file))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // --- Neon Visualizer Canvas Effect ---
  useEffect(() => {
    if (activeTab !== 'Player') return

    let animationId: number
    const canvas = document.getElementById('preview-visualizer') as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 500
      canvas.height = canvas.parentElement?.clientHeight || 200
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const draw = () => {
      animationId = requestAnimationFrame(draw)

      const activeAnalyser = playingAudio ? analyser : AudioEngine.getInstance().getMasterAnalyser()
      if (!activeAnalyser) return

      const bufferLength = activeAnalyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      activeAnalyser.getByteFrequencyData(dataArray)

      const w = canvas.width
      const h = canvas.height

      // Semi-transparent overlay to create smooth motion trails
      ctx.fillStyle = 'rgba(26, 29, 33, 0.25)'
      ctx.fillRect(0, 0, w, h)

      const barWidth = (w / bufferLength) * 1.6
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const percent = dataArray[i] / 255
        const barHeight = percent * h * 0.75

        // Modern hot-neon gradient
        const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight)
        gradient.addColorStop(0, '#3b82f6') // neon blue
        gradient.addColorStop(0.5, '#a855f7') // purple
        gradient.addColorStop(1, '#f43f5e') // hot pink

        ctx.fillStyle = gradient

        // Neon shadow glow
        ctx.shadowBlur = 16
        ctx.shadowColor = '#a855f7'

        // Rounded top bars
        ctx.beginPath()
        ctx.roundRect(x, h - barHeight, barWidth - 4, barHeight, [6, 6, 0, 0])
        ctx.fill()

        x += barWidth
      }

      ctx.shadowBlur = 0
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [activeTab, analyser, playingAudio])

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const renderExplorerContent = () => (
    <div className="flex flex-1 overflow-hidden relative">
      <div className="w-[180px] border-r border-omega-border bg-[#1e2124] flex flex-col text-[11px] overflow-y-auto flex-shrink-0 select-none">
        <div className="px-3 py-1.5 text-gray-400 font-bold mb-1 border-b border-gray-700 bg-[#1a1d21] uppercase tracking-wider">Verknüpfungen</div>
        <div className="px-3 py-1.5 hover:bg-omega-accent hover:text-white cursor-pointer flex items-center gap-2 transition-colors text-gray-300" onClick={() => window.api.getHomeDir().then(d => loadDirectory(d.split('\\').slice(0, 2).join('\\')))}><HardDrive size={12} /> Computer</div>
        <div className="px-3 py-1.5 hover:bg-omega-accent hover:text-white cursor-pointer flex items-center gap-2 transition-colors text-gray-300" onClick={() => window.api.getHomeDir().then(d => loadDirectory(d))}><User size={12} /> Benutzer</div>
        
        <div className="px-3 py-1.5 text-gray-400 font-bold mt-2 mb-1 border-b border-gray-700 bg-[#1a1d21] uppercase tracking-wider">Eigene Medien</div>
        <div className="px-3 py-1.5 hover:bg-omega-accent hover:text-white cursor-pointer flex items-center gap-2 transition-colors text-gray-300" onClick={() => window.api.getHomeDir().then(d => loadDirectory(d + '\\Documents'))}><Folder size={12} className="text-yellow-500" /> Dokumente</div>
        <div className="px-3 py-1.5 hover:bg-omega-accent hover:text-white cursor-pointer flex items-center gap-2 transition-colors text-gray-300" onClick={() => window.api.getHomeDir().then(d => loadDirectory(d + '\\Music'))}><Music size={12} className="text-blue-400" /> Musik</div>
        <div className="px-3 py-1.5 hover:bg-omega-accent hover:text-white cursor-pointer flex items-center gap-2 transition-colors text-gray-300" onClick={() => window.api.getHomeDir().then(d => loadDirectory(d + '\\Desktop'))}><Folder size={12} className="text-red-400" /> Desktop</div>
        <div className="px-3 py-1.5 hover:bg-omega-accent hover:text-white cursor-pointer flex items-center gap-2 transition-colors text-gray-300" onClick={() => window.api.getHomeDir().then(d => loadDirectory(d + '\\Downloads'))}><Download size={12} className="text-green-500" /> Downloads</div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-[#25282c] overflow-hidden">
        <div className="p-2 border-b border-omega-border flex items-center gap-2 bg-[#1e2124]">
          <button onClick={goBack} disabled={history.length === 0} className="p-1 hover:bg-omega-border rounded disabled:opacity-50 text-gray-300"><ArrowLeft size={16} /></button>
          <div className="flex-1 truncate text-xs bg-[#1a1d21] p-1 px-2 rounded border border-gray-600 shadow-inner text-gray-300" title={currentPath}>{currentPath || 'Laden...'}</div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#141619] border border-gray-700 rounded pl-7 pr-2 py-0.5 text-xs text-white focus:border-omega-accent outline-none w-36" />
          </div>
        </div>

        {/* Dateiliste */}
        <div className="flex-1 overflow-y-auto p-1.5 scrollbar-hide">
          {filteredFiles.map((file, idx) => (
            <div 
              key={idx} 
              draggable={!file.isDirectory} 
              onDragStart={(e) => onDragStart(e, file)} 
              onDoubleClick={() => navigateTo(file)} 
              className={`flex items-center gap-2 p-1.5 px-3 hover:bg-omega-accent/25 cursor-pointer rounded-md group transition-colors ${
                playingAudio === file.path ? 'bg-omega-accent/20 border-l-2 border-omega-accent' : ''
              }`}
            >
              {file.isDirectory ? <Folder size={16} className="text-yellow-500 flex-shrink-0" /> : getFileIcon(file.name)}
              <span className="text-xs truncate flex-1 text-gray-200">{file.name}</span>
              {!file.isDirectory && file.name.match(/\.(mp3|wav|ogg|m4a)$/i) && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  {playingAudio === file.path && isPlaying ? (
                    <Pause size={14} className="text-omega-accent cursor-pointer hover:scale-110" onClick={(e) => { e.stopPropagation(); handlePlayPause() }} />
                  ) : (
                    <Play size={14} className="text-green-400 cursor-pointer hover:scale-110" onClick={(e) => { e.stopPropagation(); playPreview(file.path) }} />
                  )}
                  {playingAudio === file.path && (
                    <Square size={12} className="text-red-400 cursor-pointer hover:scale-110" onClick={(e) => { e.stopPropagation(); stopPreview() }} />
                  )}
                </div>
              )}
            </div>
          ))}
          {filteredFiles.length === 0 && <div className="p-4 text-center text-gray-500 text-xs">Keine Treffer</div>}
        </div>

        {/* Compact Preview-Player under list */}
        {playingAudio && (
          <div className="p-3 bg-[#1a1d21] border-t border-omega-border flex flex-col gap-2 select-none animate-slide-up">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-omega-accent font-semibold truncate max-w-[70%]" title={playingName}>
                Vorschau: {playingName}
              </span>
              <button onClick={stopPreview} className="text-gray-500 hover:text-red-400 transition-colors">
                <X size={13} />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePlayPause}
                className="p-1.5 rounded-full bg-omega-accent/20 text-omega-accent hover:bg-omega-accent hover:text-white transition-all"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button 
                onClick={stopPreview}
                className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
              >
                <Square size={12} />
              </button>
              
              {/* Seekbar */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.01}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-omega-accent"
              />
              
              {/* Time display */}
              <span className="text-[10px] text-gray-400 font-mono select-none">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Mini Volume */}
              <div className="flex items-center gap-1">
                <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                  {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-12 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-omega-accent"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderPlayerTab = () => {
    const isPreview = playingAudio !== null

    // Determine values based on mode
    const currentTitle = isPreview ? 'Wiedergabe-Vorschau' : 'DAW-Projekt'
    const currentName = isPreview ? playingName : 'Haupt-Projekt-Timeline'
    const currentSeekValue = isPreview ? currentTime : projectTime
    const currentDurationValue = isPreview ? duration : projectDuration
    const currentIsPlaying = isPreview ? isPlaying : projectIsPlaying

    const onPlayPauseClick = isPreview ? handlePlayPause : handleProjectPlayPause
    const onStopClick = isPreview ? stopPreview : handleProjectStop
    const onSeekChange = isPreview ? handleSeek : handleProjectSeek

    return (
      <div className="flex-1 flex flex-col h-full bg-[#25282c] overflow-hidden p-6 font-sans relative select-none">
        <div className="flex flex-col h-full gap-5">
          {/* Visualizer Canvas Container */}
          <div className="flex-1 bg-[#1a1d21] rounded-2xl border border-gray-700/80 shadow-2xl relative overflow-hidden flex items-center justify-center min-h-[160px]">
            <canvas id="preview-visualizer" className="absolute inset-0 w-full h-full" />
            
            {/* Overlay Glassmorphism Info */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700/50 flex flex-col gap-0.5 pointer-events-none max-w-[85%] z-10">
              <span className="text-[9px] text-omega-accent font-bold uppercase tracking-widest">{currentTitle}</span>
              <span className="text-xs text-white font-semibold truncate">{currentName}</span>
              {!isPreview && (
                <span className="text-[9px] text-gray-400">
                  {projectIsPlaying ? 'Wiedergabe active • Master-Visualizer' : 'DAW bereit • Master-Visualizer'}
                </span>
              )}
            </div>

            {/* Close Button to return to Project Mode (Only in Preview Mode) */}
            {isPreview && (
              <button 
                onClick={stopPreview} 
                className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 hover:text-white transition-all text-gray-300 p-1.5 rounded-lg border border-gray-700/50 backdrop-blur-md z-20 shadow-lg flex items-center justify-center"
                title="Vorschau schließen (Zurück zum DAW-Projekt)"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Controls panel */}
          <div className="bg-[#1e2124] border border-gray-700/80 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
            {/* Big Seek Slider */}
            <div className="flex flex-col gap-1.5">
              <input
                type="range"
                min={0}
                max={currentDurationValue || 100}
                step={0.01}
                value={currentSeekValue}
                onChange={onSeekChange}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-omega-accent"
              />
              <div className="flex justify-between text-xs text-gray-400 font-mono">
                <span>{formatTime(currentSeekValue)}</span>
                <span>{formatTime(currentDurationValue)}</span>
              </div>
            </div>

            {/* Buttons & Volume */}
            <div className="flex items-center justify-between">
              {/* Transport buttons */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={onPlayPauseClick}
                  className="p-3 rounded-full bg-omega-accent text-white hover:bg-blue-500 shadow-lg shadow-omega-accent/20 transition-all hover:scale-105 active:scale-95"
                  title={currentIsPlaying ? 'Pause' : 'Play'}
                >
                  {currentIsPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button 
                  onClick={onStopClick}
                  className="p-3 rounded-full bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white transition-all active:scale-95"
                  title="Stop"
                >
                  <Square size={16} />
                </button>
              </div>

              {/* Format details / Mode indicator */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Modus</span>
                <span className="text-xs text-gray-300 font-medium font-mono">
                  {isPreview ? 'Vorschau' : 'DAW Project'}
                </span>
              </div>

              {/* Volume slider */}
              <div className="flex items-center gap-2 bg-[#1a1d21] border border-gray-700 px-3 py-1.5 rounded-lg">
                <button 
                  onClick={isPreview ? toggleMute : toggleProjectMute} 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={isPreview ? handleVolumeChange : handleProjectVolumeChange}
                  className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-omega-accent"
                />
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-center text-gray-500 leading-relaxed px-4">
            {isPreview 
              ? 'Wiedergabe-Vorschau aktiv. Klicken Sie auf das "X" oben rechts, um wieder das Haupt-Projekt der DAW zu steuern.'
              : 'DAW-Projekt-Modus aktiv. Verwenden Sie die Tasten oben, um die Timeline zu steuern. Der Visualizer zeigt den Live-Mixdown der Spuren.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-omega-panel text-omega-text select-none">
      <div className="flex border-b border-omega-border bg-[#1a1d21] text-xs">
        {['Import', 'Player'].map(t => (
          <div 
            key={t} 
            onClick={() => setActiveTab(t)} 
            className={`px-6 py-2 cursor-pointer border-b-2 transition-all ${
              activeTab === t 
                ? 'border-omega-accent bg-[#25282c] text-white font-semibold' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </div>
        ))}
      </div>
      {activeTab === 'Import' && renderExplorerContent()}
      {activeTab === 'Player' && renderPlayerTab()}
    </div>
  )
}

