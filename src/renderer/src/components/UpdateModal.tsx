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

  // Download statistics state
  const [downloadedBytes, setDownloadedBytes] = useState<number | null>(null)
  const [totalBytes, setTotalBytes] = useState<number | null>(null)
  const [speedBps, setSpeedBps] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)

  // Formatting helpers
  const formatSpeed = (bps: number | null) => {
    if (bps === null || bps <= 0) return '0 KB/s'
    const kbps = bps / 1024
    if (kbps < 1024) {
      return `${kbps.toFixed(1)} KB/s`
    }
    const mbps = kbps / 1024
    return `${mbps.toFixed(2)} MB/s`
  }

  const formatSize = (bytes: number | null) => {
    if (bytes === null || bytes <= 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatRemaining = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return '--:--'
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  // HandBrake-style Markdown-Parser for changelogs
  const renderFormattedChangelog = (text: string) => {
    if (!text) return <p className="text-xs text-gray-500 italic">Keine Details für dieses Update verfügbar.</p>;
    
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Horizontal lines / separators between releases
      if (line.trim() === '---') {
        return <div key={idx} className="border-t border-gray-800/80 my-5" />;
      }
      
      // Headers (Level 1-6)
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const content = headerMatch[2];
        
        if (level === 2) {
          return (
            <h3 key={idx} className="text-white font-extrabold text-sm mt-6 mb-3 first:mt-0 border-b border-gray-800/80 pb-2 select-none tracking-tight">
              {content}
            </h3>
          );
        }
        if (level === 3) {
          return (
            <h4 key={idx} className="text-omega-accent font-bold text-xs uppercase tracking-wider mt-5 mb-2 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 bg-omega-accent rounded-sm inline-block"></span>
              {content}
            </h4>
          );
        }
        if (level === 4) {
          return (
            <h5 key={idx} className="text-gray-100 font-bold text-xs mt-3.5 mb-2 border-l-2 border-omega-accent/60 pl-2 select-none">
              {content}
            </h5>
          );
        }
        // Fallback for Level 1 or other levels
        return (
          <h2 key={idx} className="text-white font-black text-base mt-6 mb-3 first:mt-0">
            {content}
          </h2>
        );
      }
      
      // List items with category prefix bolding (e.g. "- Core: Fixed seek offset")
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const content = line.trim().substring(2);
        const categoryMatch = content.match(/^([^:]+):\s*(.*)$/);
        
        if (categoryMatch) {
          return (
            <li key={idx} className="list-none pl-4 relative text-xs text-gray-200 mb-2 leading-relaxed flex items-start gap-1">
              <span className="text-omega-accent select-none mt-0.5 font-bold">•</span>
              <div>
                <strong className="text-white font-bold">{categoryMatch[1]}:</strong> {categoryMatch[2]}
              </div>
            </li>
          );
        }
        
        return (
          <li key={idx} className="list-none pl-4 relative text-xs text-gray-200 mb-2 leading-relaxed flex items-start gap-1">
            <span className="text-omega-accent select-none mt-0.5 font-bold">•</span>
            <span>{content}</span>
          </li>
        );
      }
      
      // Empty spaces
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      
      // Default text lines
      return (
        <p key={idx} className="text-xs text-gray-355 mb-2 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  useEffect(() => {
    // Registriere den IPC-Listener für den Downloadfortschritt
    const unsubscribe = window.api.onDownloadProgress((data: any) => {
      if (data.status === 'downloading') {
        setStep('downloading')
        setProgress(data.percent)
        if (data.downloadedBytes !== undefined) setDownloadedBytes(data.downloadedBytes)
        if (data.totalBytes !== undefined) setTotalBytes(data.totalBytes)
        if (data.speedBps !== undefined) setSpeedBps(data.speedBps)
        if (data.remainingSeconds !== undefined) setRemainingSeconds(data.remainingSeconds)
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
      if (window.location.search.includes('window=')) {
        alert('Das Update wurde erfolgreich heruntergeladen und wird ausgeführt, sobald der Editor beendet wird.')
        window.close()
      } else {
        onClose(true) // Schließt Modal und übergibt true für "aufgeschoben"
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[5000] animate-in fade-in duration-200">
      <div className="bg-[#24272c]/90 border border-gray-700/60 w-[720px] rounded-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md">
        
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
        <div className="p-6 flex-1 flex flex-col items-center">
          
          {step === 'prompt' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-14 w-14 bg-omega-accent/10 rounded-full flex items-center justify-center text-omega-accent">
                <Download size={28} />
              </div>
              <div className="flex flex-col gap-1 text-center">
                <h3 className="font-bold text-base text-white">Ein neues Update ist verfügbar!</h3>
                <p className="text-xs text-gray-400">Omega Wave Editor {updateInfo.latestVersion.startsWith('v') ? updateInfo.latestVersion : `v${updateInfo.latestVersion}`}</p>
              </div>

              {/* Version overview and HandBrake changelog */}
              <div className="w-full bg-[#16181b]/80 border border-gray-800/80 rounded-lg p-4.5 text-xs text-left text-gray-300 mt-2 flex flex-col gap-2.5 font-sans shadow-inner">
                <div className="flex justify-between items-center border-b border-gray-800/40 pb-2.5">
                  <span className="text-gray-400 font-semibold">Installierte Version:</span>
                  <span className="font-mono text-white font-semibold">{updateInfo.currentVersion.startsWith('v') ? updateInfo.currentVersion : `v${updateInfo.currentVersion}`}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800/40 pb-2.5">
                  <span className="text-gray-400 font-semibold">Neueste Version:</span>
                  <span className="font-mono text-green-400 font-semibold">{updateInfo.latestVersion.startsWith('v') ? updateInfo.latestVersion : `v${updateInfo.latestVersion}`}</span>
                </div>
                
                {/* Scrollable Changelog box */}
                <div className="max-h-[380px] overflow-y-auto pr-1 leading-normal text-gray-200 custom-scrollbar select-text mt-1.5">
                  {renderFormattedChangelog(updateInfo.body || '')}
                </div>
              </div>
            </div>
          )}

          {step === 'downloading' && (
            <div className="flex flex-col items-center gap-4 w-full py-2">
              <RefreshCw className="text-omega-accent animate-spin" size={32} />
              <div className="flex flex-col gap-1 w-full text-center">
                <h3 className="font-semibold text-sm text-white">Lade Update herunter...</h3>
                <p className="text-xs text-gray-400">Bitte schließe die Anwendung währenddessen nicht.</p>
              </div>

              {/* Progress bar */}
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

                {/* Real-time statistics block */}
                {downloadedBytes !== null && totalBytes !== null && (
                  <div className="mt-3 bg-[#16181b]/55 border border-gray-800/80 rounded-lg p-3 flex flex-col gap-1.5 w-full text-left font-sans text-[10px] text-gray-450 shadow-inner">
                    <div className="flex justify-between">
                      <span>Datenmenge:</span>
                      <span className="font-mono text-white font-semibold">
                        {formatSize(downloadedBytes)} / {formatSize(totalBytes)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-800/40 pt-1.5">
                      <span>Geschwindigkeit:</span>
                      <span className="font-mono text-omega-accent font-semibold">
                        {formatSpeed(speedBps)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-800/40 pt-1.5">
                      <span>Verbleibende Zeit:</span>
                      <span className="font-mono text-green-400 font-semibold">
                        {formatRemaining(remainingSeconds)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Changelog readable during download */}
              {updateInfo.body && (
                <div className="w-full bg-[#16181b]/50 border border-gray-800/40 rounded-lg p-4 text-xs text-left text-gray-400 mt-3 flex flex-col gap-1.5 max-h-[240px] overflow-y-auto select-text shadow-inner">
                  <div className="text-[9px] uppercase font-bold text-gray-500 border-b border-gray-800/40 pb-1 mb-1.5 select-none">Was ist neu:</div>
                  {renderFormattedChangelog(updateInfo.body)}
                </div>
              )}
            </div>
          )}

          {step === 'ready' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-14 w-14 bg-green-500/10 rounded-full flex items-center justify-center text-green-400">
                <CheckCircle size={28} />
              </div>
              <div className="flex flex-col gap-1 text-center">
                <h3 className="font-bold text-base text-white">Download abgeschlossen!</h3>
                <p className="text-xs text-gray-400">Das Update für {updateInfo.latestVersion.startsWith('v') ? updateInfo.latestVersion : `v${updateInfo.latestVersion}`} ist bereit zur Installation.</p>
              </div>
              <p className="text-xs text-gray-355 px-4 leading-relaxed mt-1 text-center">
                Möchtest du das Update jetzt installieren (die App wird sofort neu gestartet) oder soll die Installation erst beim nächsten Beenden der App ausgeführt werden?
              </p>

              {/* Changelog viewable in Ready step */}
              {updateInfo.body && (
                <div className="w-full bg-[#16181b]/50 border border-gray-800/40 rounded-lg p-4 text-xs text-left text-gray-400 mt-3 flex flex-col gap-1.5 max-h-[220px] overflow-y-auto select-text shadow-inner">
                  <div className="text-[9px] uppercase font-bold text-gray-500 border-b border-gray-800/40 pb-1 mb-1.5 select-none">Neue Features in diesem Update:</div>
                  {renderFormattedChangelog(updateInfo.body)}
                </div>
              )}
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-14 w-14 bg-red-500/10 rounded-full flex items-center justify-center text-red-400">
                <AlertTriangle size={28} />
              </div>
              <div className="flex flex-col gap-1 text-center">
                <h3 className="font-bold text-base text-white">Update fehlgeschlagen</h3>
                <p className="text-xs text-gray-400">Fehler beim Downloaden des Updates.</p>
              </div>
              <div className="w-full bg-[#1b1e22] border border-red-900/20 text-red-400 rounded-lg p-3.5 text-center mt-2 leading-relaxed font-mono text-[10px]">
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
