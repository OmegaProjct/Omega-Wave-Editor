import React, { useState, useEffect, useRef } from 'react'
import { CheckCircle2, AlertCircle, Folder, Play, X, Loader2 } from 'lucide-react'

export function ExportProgressWindow() {
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('Analysiere Spuren...')
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [filePath, setFilePath] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Check if opened as separate popout window
  const isPopout = new URLSearchParams(window.location.search).get('window') === 'progress';

  // Duration indicators
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Increment elapsed timer every second
    if (status === 'running') {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  useEffect(() => {
    // 1. Subscribe to progress updates from the main process
    const unsubscribeProgress = window.api.onExportProgressUpdate((data: { progress: number; label: string }) => {
      setProgress(data.progress)
      setLabel(data.label)
    })

    // 2. Subscribe to export finished events
    const unsubscribeFinished = window.api.onExportFinished((data: { status: string; filePath?: string; errorMsg?: string }) => {
      if (data.status === 'done') {
        setStatus('done')
        if (data.filePath) setFilePath(data.filePath)
        setProgress(100)
      } else if (data.status === 'error') {
        setStatus('error')
        setErrorMsg(data.errorMsg || 'Ein unerwarteter Fehler ist aufgetreten.')
      }
    })

    return () => {
      unsubscribeProgress()
      unsubscribeFinished()
    }
  }, [])

  const handleClose = () => {
    window.api.closeProgressWindow()
  }

  const handleOpenFolder = async () => {
    if (!filePath) return
    try {
      const dir = filePath.replace(/[\\\/][^\\\/]*$/, '')
      await window.api.openPath(dir)
    } catch (err) {
      console.error('Failed to open export folder:', err)
    }
  }

  const handlePlayFile = async () => {
    if (!filePath) return
    try {
      await window.api.openPath(filePath)
    } catch (err) {
      console.error('Failed to play file:', err)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate estimated remaining time
  const getRemainingTime = () => {
    if (progress <= 5) return '--:--'
    const totalEst = (elapsed / progress) * 100
    const rem = Math.max(0, Math.round(totalEst - elapsed))
    return formatDuration(rem)
  }

  return (
    <div className="w-screen h-screen bg-[#1e2124] text-omega-text flex flex-col font-sans select-none overflow-hidden relative">
      
      {/* Header */}
      <div className="p-3 border-b border-omega-border bg-[#1a1d21] flex justify-between items-center select-none">
        <span className="text-xs font-semibold">Mixdown-Export</span>
        {status !== 'running' && !isPopout && (
          <button onClick={handleClose} className="hover:text-red-400 text-sm transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 p-6 flex flex-col gap-5 justify-center relative overflow-hidden bg-[#25282c]">
        
        {/* Visual Wave Decoration (Active rendering only) */}
        {status === 'running' && (
          <div className="absolute inset-x-0 bottom-0 h-16 flex items-end justify-center gap-1 opacity-20 pointer-events-none px-6">
            {[...Array(24)].map((_, i) => {
              const animDuration = 0.5 + Math.random() * 0.8
              const heightPct = 15 + Math.random() * 75
              return (
                <div 
                  key={i} 
                  className="w-1.5 bg-omega-accent rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                  style={{ 
                    height: `${heightPct}%`
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Status Section */}
        <div className="flex items-start gap-4 z-10">
          {status === 'running' && (
            <div className="w-12 h-12 bg-omega-accent/10 border border-omega-accent/30 rounded-xl flex items-center justify-center text-omega-accent shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Loader2 className="animate-spin" size={24} />
            </div>
          )}
          {status === 'done' && (
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-center text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)] animate-bounce">
              <CheckCircle2 size={24} />
            </div>
          )}
          {status === 'error' && (
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <AlertCircle size={24} />
            </div>
          )}

          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              {status === 'running' ? 'Verarbeitung' : status === 'done' ? 'Abgeschlossen' : 'Fehler aufgetreten'}
            </span>
            <span className="text-sm font-semibold truncate max-w-[360px] text-gray-200" title={label}>
              {status === 'done' ? 'Export erfolgreich beendet!' : status === 'error' ? 'Fehler beim Exportieren' : label}
            </span>
            {status === 'error' && (
              <span className="text-xs text-red-400 leading-normal line-clamp-2 mt-0.5">
                {errorMsg}
              </span>
            )}
          </div>
        </div>

        {/* Progress & Stats */}
        <div className="flex flex-col gap-2 z-10">
          <div className="flex justify-between items-end text-xs">
            <div className="flex gap-4 text-gray-400 font-mono text-[10px]">
              <span>Dauer: {formatDuration(elapsed)}</span>
              {status === 'running' && <span>Restzeit: {getRemainingTime()}</span>}
            </div>
            <span className={`font-mono font-bold text-sm ${status === 'done' ? 'text-green-400' : 'text-omega-accent'}`}>
              {Math.round(progress)}%
            </span>
          </div>

          <div className="w-full h-3 bg-gray-800 rounded-full border border-gray-700/40 overflow-hidden relative shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-300 relative ${
                status === 'done' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' :
                status === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' :
                'bg-omega-accent shadow-[0_0_10px_rgba(59,130,246,0.6)]'
              }`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[progress-bar-stripes_1s_linear_infinite]" />
            </div>
          </div>
        </div>

        {/* Footer Actions (Only visible on done or error) */}
        {status !== 'running' && (
          <div className="flex justify-end gap-2.5 mt-2 z-10 animate-fade-in">
            {status === 'done' && (
              <>
                <button 
                  onClick={handlePlayFile}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                  title="Titel in Standard-Player abspielen"
                >
                  <Play size={12} /> Abspielen
                </button>
                <button 
                  onClick={handleOpenFolder}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-650 rounded text-gray-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  title="Zielordner im Explorer öffnen"
                >
                  <Folder size={12} /> Ordner öffnen
                </button>
              </>
            )}
            <button 
              onClick={handleClose}
              className="px-6 py-1.5 bg-omega-accent hover:bg-blue-500 rounded text-white text-xs font-semibold shadow transition-colors"
            >
              Schließen
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
