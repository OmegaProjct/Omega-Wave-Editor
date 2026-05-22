import React, { useState, useEffect } from 'react'
import { Download, CheckCircle, AlertTriangle, RefreshCw, X } from 'lucide-react'

interface UpdateModalProps {
  updateInfo: {
    latestVersion: string
    currentVersion: string
    url?: string
    body?: string
  }
  onClose: (deferredUpdate?: boolean) => void
}

type UpdateStep = 'prompt' | 'downloading' | 'ready' | 'error'

export function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const [step, setStep] = useState<UpdateStep>('prompt')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // Registriere den IPC-Listener für den Downloadfortschritt
    const unsubscribe = window.api.onDownloadProgress((data: any) => {
      if (data.status === 'downloading') {
        setStep('downloading')
        setProgress(data.percent)
      } else if (data.status === 'completed') {
        setStep('ready')
        setProgress(100)
      } else if (data.status === 'error') {
        setStep('error')
        setErrorMessage(data.error || 'Ein unbekannter Fehler ist aufgetreten.')
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleStartDownload = async () => {
    setStep('downloading')
    setProgress(0)
    
    try {
      const res = await window.api.startUpdateDownload({
        url: updateInfo.url || '',
        latestVersion: updateInfo.latestVersion
      })
      if (!res.success) {
        setStep('error')
        setErrorMessage(res.error || 'Der Download konnte nicht gestartet werden.')
      }
    } catch (err: any) {
      setStep('error')
      setErrorMessage(err.message || 'Verbindungsfehler beim Download.')
    }
  }

  const handleInstallNow = async () => {
    try {
      await window.api.installUpdate({ installNow: true })
    } catch (err) {
      console.error(err)
    }
  }

  const handleInstallLater = async () => {
    try {
      await window.api.installUpdate({ installNow: false })
      onClose(true) // Schließt Modal und übergibt true für "aufgeschoben"
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[5000] animate-in fade-in duration-200">
      <div className="bg-[#24272c]/90 border border-gray-700/60 w-[450px] rounded-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md">
        
        {/* Header */}
        <div className="bg-[#1a1d21]/60 px-5 py-3.5 border-b border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="text-omega-accent animate-spin" size={18} style={{ animationDuration: '4s' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-omega-accent">Software Update</span>
          </div>
          {step !== 'downloading' && (
            <button onClick={() => onClose(false)} className="text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col items-center text-center">
          
          {step === 'prompt' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-14 w-14 bg-omega-accent/10 rounded-full flex items-center justify-center text-omega-accent">
                <Download size={28} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-base text-white">Ein neues Update ist verfügbar!</h3>
                <p className="text-xs text-gray-400">Omega Wave Editor v{updateInfo.latestVersion}</p>
              </div>

              <div className="w-full bg-[#1b1e22] border border-gray-800 rounded-lg p-4 text-xs text-left text-gray-300 mt-2 flex flex-col gap-1.5 font-sans leading-relaxed max-h-[140px] overflow-y-auto">
                <div className="flex justify-between border-b border-gray-800 pb-1.5 font-semibold text-gray-400">
                  <span>Installierte Version:</span>
                  <span className="font-mono text-white">v{updateInfo.currentVersion}</span>
                </div>
                <div className="flex justify-between pt-0.5 font-semibold text-gray-400">
                  <span>Neueste Version:</span>
                  <span className="font-mono text-green-400">v{updateInfo.latestVersion}</span>
                </div>
                {updateInfo.body && (
                  <div className="mt-2 border-t border-gray-850 pt-2 text-gray-400 leading-normal whitespace-pre-wrap max-h-[80px] overflow-y-auto">
                    {updateInfo.body}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'downloading' && (
            <div className="flex flex-col items-center gap-5 w-full py-4">
              <RefreshCw className="text-omega-accent animate-spin" size={32} />
              <div className="flex flex-col gap-1.5 w-full">
                <h3 className="font-semibold text-sm text-white">Lade Update herunter...</h3>
                <p className="text-xs text-gray-400">Bitte schließe die Anwendung währenddessen nicht.</p>
              </div>

              {/* Fortschrittsbalken */}
              <div className="w-full mt-2">
                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700/50">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-omega-accent h-full rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(30,144,255,0.4)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1.5 px-0.5">
                  <span>Fortschritt</span>
                  <span className="font-mono font-bold text-omega-accent">{progress}%</span>
                </div>
              </div>
            </div>
          )}

          {step === 'ready' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-14 w-14 bg-green-500/10 rounded-full flex items-center justify-center text-green-400">
                <CheckCircle size={28} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-base text-white">Download abgeschlossen!</h3>
                <p className="text-xs text-gray-400">Das Update für v{updateInfo.latestVersion} ist bereit zur Installation.</p>
              </div>
              <p className="text-xs text-gray-300 px-4 leading-relaxed mt-1">
                Möchtest du das Update jetzt installieren (die App wird neu gestartet) oder soll die Installation erst nach dem Beenden der App ausgeführt werden?
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-14 w-14 bg-red-500/10 rounded-full flex items-center justify-center text-red-400">
                <AlertTriangle size={28} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-base text-white">Update fehlgeschlagen</h3>
                <p className="text-xs text-gray-400">Fehler beim Downloaden des Updates.</p>
              </div>
              <div className="w-full bg-[#1b1e22] border border-red-900/20 text-red-400 rounded-lg p-3 text-xs text-center mt-2 leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#1a1d21]/60 px-5 py-4 border-t border-gray-800/80 flex justify-end gap-2.5">
          {step === 'prompt' && (
            <>
              <button 
                onClick={() => onClose(false)} 
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg border border-gray-700/50 shadow transition-all duration-150 active:scale-[0.98]"
              >
                Später
              </button>
              <button 
                onClick={handleStartDownload} 
                className="px-6 py-2 bg-omega-accent hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-omega-accent/20 transition-all duration-150 active:scale-[0.98]"
              >
                Jetzt herunterladen
              </button>
            </>
          )}

          {step === 'downloading' && (
            <span className="text-[10px] text-gray-500 italic pr-2 flex items-center">Download läuft im Hintergrund...</span>
          )}

          {step === 'ready' && (
            <>
              <button 
                onClick={handleInstallLater} 
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg border border-gray-700/50 shadow transition-all duration-150 active:scale-[0.98]"
              >
                Nach Neustart
              </button>
              <button 
                onClick={handleInstallNow} 
                className="px-6 py-2 bg-omega-accent hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-omega-accent/20 transition-all duration-150 active:scale-[0.98]"
              >
                Jetzt installieren
              </button>
            </>
          )}

          {step === 'error' && (
            <>
              <button 
                onClick={handleStartDownload} 
                className="px-5 py-2 bg-omega-accent hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition-all duration-150 active:scale-[0.98]"
              >
                Wiederholen
              </button>
              <button 
                onClick={() => onClose(false)} 
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg border border-gray-700/50 shadow transition-all duration-150 active:scale-[0.98]"
              >
                Schließen
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
