import React, { useState, useEffect } from 'react'
import { Download, CheckCircle, AlertTriangle, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface UpdateEntry {
  version?: string
  date?: string
  english: string
  deutsch: string
}

// Parse update body text into structured entries with DE/EN sections
function parseUpdateBody(raw: string): UpdateEntry[] {
  const normalized = raw.replace(/\r\n/g, '\n')
  
  // Clean up the upgrade notice block if present
  // Matches "### English", "#### Upgrade Notice", its contents, "### Deutsch", "#### Wichtiger Hinweis zum Update", its contents, and the "---" separator
  const noticeRegex = /###\s*English\s*[\r\n]+####\s*Upgrade\s*Notice\s*[\r\n]+[\s\S]*?###\s*Deutsch\s*[\r\n]+####\s*Wichtiger\s*Hinweis\s*zum\s*Update\s*[\r\n]+[\s\S]*?(?:\n---\n|\n---(?=\n)|$)/gi;
  const cleaned = normalized.replace(noticeRegex, '')

  // Split by '---' separator
  const versionBlocks = cleaned.split(/\n---\n|\n---(?=\n)/)
  const entries: UpdateEntry[] = []

  for (const block of versionBlocks) {
    const trimmedBlock = block.trim()
    if (!trimmedBlock) continue

    // Check if block starts with '### Version X.Y.Z (Date)'
    const versionMatch = trimmedBlock.match(/^### Version\s+([^\n(]+)(?:\s*\(([^)]+)\))?/)
    
    let version = ''
    let date = ''
    let contentBlock = trimmedBlock

    if (versionMatch) {
      version = versionMatch[1].trim()
      if (version.startsWith('v')) {
        version = version.slice(1)
      }
      date = versionMatch[2] ? versionMatch[2].trim() : ''
      contentBlock = trimmedBlock.substring(versionMatch[0].length).trim()
    }

    // Extract ### English and ### Deutsch blocks
    const englishMatch = contentBlock.match(/### English\n([\s\S]*?)(?=\n### |\n## |\n---|\s*$)/)
    const deutschMatch = contentBlock.match(/### Deutsch\n([\s\S]*?)(?=\n### |\n## |\n---|\s*$)/)

    // Fallback if sections are missing
    const fallbackText = contentBlock.replace(/^### English\n|^### Deutsch\n/, '').trim()

    entries.push({
      version: version || undefined,
      date: date || undefined,
      english: englishMatch ? englishMatch[1].trim() : fallbackText,
      deutsch: deutschMatch ? deutschMatch[1].trim() : fallbackText,
    })
  }

  return entries
}

// Render inline markdown: **bold** and `code`
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/)
    if (boldMatch) return <strong key={i} className="text-white font-bold">{boldMatch[1]}</strong>
    const codeMatch = part.match(/^`(.+)`$/)
    if (codeMatch) return <code key={i} className="bg-gray-800 text-omega-accent px-1 rounded text-sm font-mono">{codeMatch[1]}</code>
    return <span key={i}>{part}</span>
  })
}

// Render a markdown block (#### headers + bullet lists)
function renderMarkdownBlock(text: string) {
  if (!text) return <p className="text-gray-500 italic text-sm">No details available.</p>
  let isImportant = false
  return text.split('\n').map((line, idx) => {
    if (line.startsWith('#### ')) {
      const label = line.slice(5)
      let color = 'text-gray-300'
      const labelLower = label.toLowerCase()
      if (labelLower.includes('notice') || labelLower.includes('hinweis') || labelLower.includes('important') || labelLower.includes('wichtig')) {
        color = 'text-red-500 font-extrabold'
        isImportant = true
      } else {
        isImportant = false
        if (label === 'Added' || label === 'Hinzugefügt') color = 'text-green-400'
        if (label === 'Fixed' || label === 'Behoben') color = 'text-blue-400'
        if (label === 'Changed' || label === 'Geändert') color = 'text-yellow-400'
        if (label === 'Removed' || label === 'Entfernt') color = 'text-red-400'
      }
      return (
        <h5 key={idx} className={`${color} font-bold text-xs uppercase tracking-widest mt-4 mb-2 first:mt-0`}>
          {label}
        </h5>
      )
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2)
      return (
        <div key={idx} className="flex items-start gap-2 mb-2">
          <span className={`${isImportant ? 'text-red-500' : 'text-omega-accent'} mt-1 shrink-0 text-xs`}>•</span>
          <p className={`${isImportant ? 'text-red-400 font-semibold' : 'text-gray-200'} text-sm leading-relaxed`}>{renderInline(content)}</p>
        </div>
      )
    }
    if (line.trim() === '') return <div key={idx} className="h-1" />
    return <p key={idx} className={`${isImportant ? 'text-red-400 font-semibold' : 'text-gray-400'} text-sm`}>{renderInline(line)}</p>
  })
}

interface UpdateModalProps {
  updateInfo: {
    latestVersion: string
    currentVersion: string
    url?: string
    downloadUrl?: string
    body?: string
  }
  onClose: (deferredUpdate?: boolean) => void
}

type UpdateStep = 'prompt' | 'downloading' | 'ready' | 'error'

export function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const [step, setStep] = useState<UpdateStep>('prompt')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isPopout = new URLSearchParams(window.location.search).get('window') === 'update';

  const { i18n } = useTranslation()
  const [lang, setLang] = useState<'de' | 'en'>(i18n.language?.startsWith('de') ? 'de' : 'en')
  const [entries, setEntries] = useState<UpdateEntry[]>([])

  useEffect(() => {
    if (updateInfo.body) {
      setEntries(parseUpdateBody(updateInfo.body))
    } else {
      setEntries([])
    }
  }, [updateInfo.body])

  // Dynamically resize popout window to perfectly fit contents
  useEffect(() => {
    if (!isPopout) return;

    const resizeToFit = () => {
      const contentEl = document.getElementById('update-modal-content');
      if (contentEl) {
        const contentHeight = contentEl.scrollHeight;
        const totalHeight = contentHeight + 40; // 40px safety padding for window titlebar / frames
        console.log(`[UpdateModal] Dynamic content sizing: content(${contentHeight}) + pad(40) = ${totalHeight}px`);
        try {
          window.api.resizeWindow(720, Math.max(350, Math.min(850, totalHeight)));
        } catch (e) {
          console.warn('Failed to dynamically resize update window:', e);
        }
      }
    };

    // Run after DOM has settled, and also when step changes
    const timer = setTimeout(resizeToFit, 150);
    return () => clearTimeout(timer);
  }, [isPopout, step]);

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

  const renderParsedEntries = () => {
    if (entries.length === 0) {
      return (
        <p className="text-gray-500 italic text-sm">
          {lang === 'de' ? 'Keine Details verfügbar.' : 'No details available.'}
        </p>
      )
    }

    return entries.map((entry, idx) => {
      const content = lang === 'de' ? entry.deutsch : entry.english
      return (
        <div key={idx} className="border-b border-gray-800/40 pb-6 mb-6 last:border-0 last:pb-0 last:mb-0">
          {entry.version && (
            <div className="flex items-baseline gap-3 mb-4 select-none">
              <h4 className="text-omega-accent font-black text-base">v{entry.version}</h4>
              {entry.date && <span className="text-gray-500 text-xs">{entry.date}</span>}
            </div>
          )}
          <div>
            {renderMarkdownBlock(content || (lang === 'de' ? 'Keine Details verfügbar.' : 'No details available.'))}
          </div>
        </div>
      )
    })
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
        url: updateInfo.downloadUrl || updateInfo.url || '',
        latestVersion: updateInfo.latestVersion
      })
      if (!res.success) {
        if (res.error === 'Canceled') {
          setStep('prompt')
        } else {
          setStep('error')
          setErrorMessage(res.error || 'Der Download konnte nicht gestartet werden.')
        }
      }
    } catch (err: any) {
      if (err.message === 'Canceled') {
        setStep('prompt')
      } else {
        setStep('error')
        setErrorMessage(err.message || 'Verbindungsfehler beim Download.')
      }
    }
  }

  const handleCancelDownload = async () => {
    try {
      await window.api.cancelUpdateDownload()
      setStep('prompt')
      setProgress(0)
      setDownloadedBytes(null)
      setTotalBytes(null)
      setSpeedBps(null)
      setRemainingSeconds(null)
    } catch (err) {
      console.error('Failed to cancel update download:', err)
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

  const modalContent = (
    <div 
      id="update-modal-content"
      className={`${isPopout ? 'w-full h-full min-h-screen' : 'w-[720px] max-h-[calc(100vh-40px)] rounded-xl shadow-2xl border border-gray-700/60'} bg-[#24272c]/90 overflow-hidden flex flex-col backdrop-blur-md`}
    >
        
        {/* Header */}
        <div
          className="bg-[#1a1d21]/60 px-5 py-3.5 border-b border-gray-800/80 flex items-center justify-between"
          style={isPopout ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="text-omega-accent animate-spin" size={18} style={{ animationDuration: '4s' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-omega-accent">Software Update</span>
          </div>
          <div
            className="flex items-center gap-2"
            style={isPopout ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
          >
            {step !== 'downloading' && (
              <button
                onClick={() => {
                  if (isPopout) {
                    window.close()
                  } else {
                    onClose(false)
                  }
                }}
                className="text-gray-500 hover:text-white transition-colors"
                title="Schließen"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col items-center overflow-y-auto min-h-0 w-full custom-scrollbar">
          {step === 'prompt' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-16 w-16 bg-omega-accent/10 rounded-full flex items-center justify-center text-omega-accent shadow-lg shadow-omega-accent/5">
                <Download size={32} />
              </div>
              <div className="flex flex-col gap-1.5 text-center">
                <h3 className="font-black text-xl text-white tracking-tight">Ein neues Update ist verfügbar!</h3>
                <p className="text-sm text-gray-400 font-semibold">Omega Wave Editor {updateInfo.latestVersion.startsWith('v') ? updateInfo.latestVersion : `v${updateInfo.latestVersion}`}</p>
              </div>

              {/* Version overview and HandBrake changelog */}
              <div className="w-full bg-[#16181b]/80 border border-gray-800/80 rounded-lg p-5 text-sm text-left text-gray-305 mt-2 flex flex-col gap-3 font-sans shadow-inner">
                <div className="flex justify-between items-center border-b border-gray-800/40 pb-2.5">
                  <span className="text-gray-400 font-semibold">Installierte Version:</span>
                  <span className="font-mono text-white font-bold">{updateInfo.currentVersion.startsWith('v') ? updateInfo.currentVersion : `v${updateInfo.currentVersion}`}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800/40 pb-2.5">
                  <span className="text-gray-400 font-semibold">Neueste Version:</span>
                  <span className="font-mono text-green-400 font-extrabold">{updateInfo.latestVersion.startsWith('v') ? updateInfo.latestVersion : `v${updateInfo.latestVersion}`}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800/40 pb-2.5">
                  <span className="text-gray-400 font-semibold">Sprache / Language:</span>
                  <div className="flex items-center bg-gray-850/60 rounded-lg p-0.5 border border-gray-750/80">
                    <button
                      onClick={() => setLang('de')}
                      className={`px-3 py-0.5 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                        lang === 'de'
                          ? 'bg-omega-accent text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      DE Deutsch
                    </button>
                    <button
                      onClick={() => setLang('en')}
                      className={`px-3 py-0.5 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                        lang === 'en'
                          ? 'bg-omega-accent text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      GB English
                    </button>
                  </div>
                </div>
                
                {/* Warning notice banner */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-200 text-xs flex gap-2.5 items-start mt-1 mb-2 leading-relaxed">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <strong className="text-red-400 block mb-0.5 uppercase tracking-wider text-[10px] font-black">
                      {lang === 'de' ? 'Wichtiger Hinweis zum Update' : 'Important Upgrade Notice'}
                    </strong>
                    <span>
                      {lang === 'de' 
                        ? 'Bitte stelle vor dem Update des Omega Wave Editors sicher, dass deine aktiven Projekte (.owep) gespeichert sind. Wenn du von einer älteren Version aktualisierst, bleiben deine Einstellungen und die Liste der letzten Projekte sicher erhalten.' 
                        : 'Before updating the Omega Wave Editor, please make sure to save your active projects (.owep). If you are upgrading from an older version, your settings and recent project lists will be preserved safely.'}
                    </span>
                  </div>
                </div>

                {/* Scrollable Changelog box */}
                <div 
                  className="overflow-y-auto pr-2 leading-normal text-gray-200 custom-scrollbar select-text mt-2 w-full text-left"
                  style={{ maxHeight: 'min(300px, calc(100vh - 440px))' }}
                >
                  {renderParsedEntries()}
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

                <div 
                  className="w-full bg-[#16181b]/50 border border-gray-800/40 rounded-lg p-4 text-xs text-left text-gray-400 mt-3 flex flex-col gap-1.5 overflow-y-auto select-text shadow-inner"
                  style={{ maxHeight: 'min(240px, calc(100vh - 380px))' }}
                >
                  <div className="flex justify-between items-center border-b border-gray-800/40 pb-1 mb-1.5 select-none">
                    <span className="text-[9px] uppercase font-bold text-gray-500">Was ist neu:</span>
                    <div className="flex items-center bg-gray-855/60 rounded-lg p-0.5 border border-gray-755/80 scale-90 origin-right">
                      <button
                        onClick={() => setLang('de')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 ${
                          lang === 'de'
                            ? 'bg-omega-accent text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        DE
                      </button>
                      <button
                        onClick={() => setLang('en')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 ${
                          lang === 'en'
                            ? 'bg-omega-accent text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                  {renderParsedEntries()}
                </div>
            </div>
          )}

          {step === 'ready' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 shadow-lg shadow-green-550/5">
                <CheckCircle size={32} />
              </div>
              <div className="flex flex-col gap-1.5 text-center">
                <h3 className="font-black text-xl text-white tracking-tight">Download abgeschlossen!</h3>
                <p className="text-sm text-gray-400 font-semibold">Das Update für {updateInfo.latestVersion.startsWith('v') ? updateInfo.latestVersion : `v${updateInfo.latestVersion}`} ist bereit zur Installation.</p>
              </div>
              <p className="text-sm text-gray-300 px-4 leading-relaxed mt-1 text-center">
                Möchtest du das Update jetzt installieren (die App wird sofort neu gestartet) oder soll die Installation erst beim nächsten Beenden der App ausgeführt werden?
              </p>

                <div 
                  className="w-full bg-[#16181b]/50 border border-gray-800/40 rounded-lg p-5 text-sm text-left text-gray-305 mt-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar select-text shadow-inner"
                  style={{ maxHeight: 'min(220px, calc(100vh - 420px))' }}
                >
                  <div className="flex justify-between items-center border-b border-gray-800/40 pb-1 mb-2 select-none">
                    <span className="text-[9px] uppercase font-bold text-gray-500">Neue Features in diesem Update:</span>
                    <div className="flex items-center bg-gray-855/60 rounded-lg p-0.5 border border-gray-755/80 scale-90 origin-right">
                      <button
                        onClick={() => setLang('de')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 ${
                          lang === 'de'
                            ? 'bg-omega-accent text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        DE
                      </button>
                      <button
                        onClick={() => setLang('en')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 ${
                          lang === 'en'
                            ? 'bg-omega-accent text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                  {renderParsedEntries()}
                </div>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 shadow-lg shadow-red-550/5">
                <AlertTriangle size={32} />
              </div>
              <div className="flex flex-col gap-1.5 text-center">
                <h3 className="font-black text-xl text-white tracking-tight">Update fehlgeschlagen</h3>
                <p className="text-sm text-gray-400 font-semibold">Fehler beim Downloaden des Updates.</p>
              </div>
              <div className="w-full bg-[#1b1e22] border border-red-900/20 text-red-400 rounded-lg p-4 text-center mt-2 leading-relaxed font-mono text-xs shadow-inner">
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
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg border border-gray-700/50 shadow transition-all duration-150 active:scale-[0.98]"
              >
                Später
              </button>
              <button 
                onClick={handleStartDownload} 
                className="px-8 py-2.5 bg-omega-accent hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-omega-accent/20 transition-all duration-150 active:scale-[0.98]"
              >
                Jetzt herunterladen
              </button>
            </>
          )}

          {step === 'downloading' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 italic flex items-center">Download läuft im Hintergrund...</span>
              <button 
                onClick={handleCancelDownload}
                className="px-5 py-2 bg-red-950/40 border border-red-500/35 hover:bg-red-900/30 text-red-400 text-xs font-bold rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          )}

          {step === 'ready' && (
            <>
              <button 
                onClick={handleInstallLater} 
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg border border-gray-700/50 shadow transition-all duration-150 active:scale-[0.98]"
              >
                Nach Neustart
              </button>
              <button 
                onClick={handleInstallNow} 
                className="px-8 py-2.5 bg-omega-accent hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-omega-accent/20 transition-all duration-150 active:scale-[0.98]"
              >
                Jetzt installieren
              </button>
            </>
          )}

          {step === 'error' && (
            <>
              <button 
                onClick={handleStartDownload} 
                className="px-6 py-2.5 bg-omega-accent hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition-all duration-150 active:scale-[0.98]"
              >
                Wiederholen
              </button>
              <button 
                onClick={() => onClose(false)} 
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg border border-gray-700/50 shadow transition-all duration-150 active:scale-[0.98]"
              >
                Schließen
              </button>
            </>
          )}
        </div>

    </div>
  );

  if (isPopout) {
    return modalContent;
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[5000] animate-in fade-in duration-200">
      {modalContent}
    </div>
  );
}
