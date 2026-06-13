import React, { useState, useEffect, useRef } from 'react'
import { X, Search, Copy, FolderOpen, Trash2, RefreshCw, Pause, FileText, Check, Upload, Send, File, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LogViewerModalProps {
  onClose: () => void
  initialTab?: 'logs' | 'feedback'
  mode?: 'logs' | 'feedback'
}

interface LogLine {
  id: number
  raw: string
  timestamp?: string
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'UNKNOWN'
  moduleName?: string
  message?: string
  isDetail?: boolean
}

interface SessionLogFile {
  filename: string
  size: number
  mtime: number
}

interface AttachedImage {
  name: string
  dataUrl: string
}

function formatSessionFilename(name: string): string {
  const match = name.match(/^session_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.log$/)
  if (match) {
    const [, y, m, d, hh, mm, ss] = match
    return `Sitzung: ${d}.${m}.${y}, ${hh}:${mm}:${ss}`
  }
  return name
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LogViewerModal({ onClose, initialTab = 'logs', mode }: LogViewerModalProps) {
  const { t } = useTranslation()
  const isPopout = new URLSearchParams(window.location.search).get('window') === 'logs'
  const activeTab = mode || initialTab || 'logs'

  // === State für Logs-Viewer ===
  const [logsList, setLogsList] = useState<SessionLogFile[]>([])
  const [selectedLogFile, setSelectedLogFile] = useState<string>('')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'>('ALL')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [logPath, setLogPath] = useState('')
  
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  // === State für Feedback ===
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feedback'>('bug')
  const [feedbackText, setFeedbackText] = useState('')
  const [attachLog, setAttachLog] = useState(true)
  const [selectedFeedbackLog, setSelectedFeedbackLog] = useState('')
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackSuccess, setFeedbackSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lädt die Liste aller Sitzungs-Logs
  const fetchLogsList = async (selectNewest = false) => {
    try {
      const list = await window.api.getSessionLogs()
      setLogsList(list)
      
      if (list.length > 0) {
        if (!selectedLogFile || selectNewest) {
          setSelectedLogFile(list[0].filename)
          setSelectedFeedbackLog(list[0].filename)
        }
      } else {
        setSelectedLogFile('')
        setSelectedFeedbackLog('')
      }
    } catch (e) {
      console.error('Fehler beim Laden der Log-Liste:', e)
    }
  }

  // Lädt den Inhalt des ausgewählten Logs
  const fetchLogsContent = async (silent = false) => {
    if (!selectedLogFile) {
      setLogs([])
      return
    }
    if (!silent) setIsLoading(true)
    try {
      const content = await window.api.getLogContent(selectedLogFile)
      const path = await window.api.getLogPath()
      setLogPath(path)
      
      const lines = content.split('\n')
      const parsedLines: LogLine[] = []
      let idCounter = 0
      
      lines.forEach((line: string) => {
        if (!line.trim()) return
        
        const match = line.match(/^\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*)$/)
        if (match) {
          const [, timestamp, levelStr, moduleName, message] = match
          const level = levelStr.trim() as any
          parsedLines.push({
            id: idCounter++,
            raw: line,
            timestamp,
            level: ['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level) ? level : 'UNKNOWN',
            moduleName,
            message,
            isDetail: false
          })
        } else {
          parsedLines.push({
            id: idCounter++,
            raw: line,
            isDetail: true
          })
        }
      })
      
      setLogs(parsedLines)
    } catch (e) {
      console.error('Fehler beim Abrufen der Logs:', e)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  // Initiales Laden
  useEffect(() => {
    fetchLogsList(true)
  }, [])

  // Inhaltsaktualisierung bei Log-Auswahl
  useEffect(() => {
    fetchLogsContent()
    if (logsList.length > 0 && selectedLogFile !== logsList[0].filename) {
      setAutoRefresh(false)
    } else {
      setAutoRefresh(true)
    }
  }, [selectedLogFile])

  // Auto-Refresh Intervall für das aktive Log
  useEffect(() => {
    if (!autoRefresh || !selectedLogFile) return
    if (logsList.length > 0 && selectedLogFile !== logsList[0].filename) return

    const timer = setInterval(() => {
      fetchLogsContent(true)
    }, 2000)
    return () => clearInterval(timer)
  }, [autoRefresh, selectedLogFile, logsList])

  // Scroll-Logik
  useEffect(() => {
    if (containerRef.current && isAtBottom.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 15
  }

  // Kopiert Log-Inhalt in die Zwischenablage
  const handleCopyLogs = async () => {
    try {
      const rawText = logs.map(l => l.raw).join('\n')
      await navigator.clipboard.writeText(rawText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (e) {
      console.error('Kopieren fehlgeschlagen:', e)
    }
  }

  // Exportiert die Log-Datei
  const handleExportLog = async () => {
    if (!selectedLogFile) return
    try {
      const res = await window.api.exportSessionLog(selectedLogFile)
      if (res.success) {
        alert(t('logs.export_success', { defaultValue: 'Log-Datei erfolgreich exportiert!' }))
      } else if (res.error) {
        alert(`${t('logs.export_failed', { defaultValue: 'Export fehlgeschlagen:' })} ${res.error}`)
      }
    } catch (e) {
      console.error('Fehler beim Exportieren des Logs:', e)
    }
  }

  // Leert das ausgewählte Log
  const handleClearLog = async () => {
    if (!selectedLogFile) return
    const filenameReadable = formatSessionFilename(selectedLogFile)
    if (confirm(t('logs.confirm_clear_specific', { defaultValue: `Möchtest du das Diagnose-Protokoll (${filenameReadable}) wirklich leeren?` }))) {
      await window.api.clearLog(selectedLogFile)
      fetchLogsContent()
      fetchLogsList()
    }
  }

  // Löscht eine Log-Datei vom PC
  const handleDeleteLog = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const filenameReadable = formatSessionFilename(filename)
    if (confirm(t('logs.confirm_delete', { defaultValue: `Möchtest du die Protokolldatei (${filenameReadable}) wirklich dauerhaft von deinem PC löschen?` }))) {
      try {
        const success = await window.api.deleteSessionLog(filename)
        if (success) {
          if (selectedLogFile === filename) {
            setSelectedLogFile('')
          }
          await fetchLogsList(true)
        } else {
          alert(t('logs.delete_failed', { defaultValue: 'Löschen fehlgeschlagen.' }))
        }
      } catch (err) {
        console.error('Fehler beim Löschen des Logs:', err)
      }
    }
  }

  // Gesamtspeicherplatz berechnen
  const totalLogsSize = logsList.reduce((sum, item) => sum + item.size, 0)

  // Globaler Paste-Listener für Bilder
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (activeTab !== 'feedback') return
      const items = e.clipboardData?.items
      if (!items) return

      let imagePasted = false
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            imagePasted = true
            if (attachedImages.length >= 10) {
              setFeedbackError(t('feedback.max_images_error', { defaultValue: 'Maximal 10 Bilder sind erlaubt!' }))
              return
            }

            const reader = new FileReader()
            reader.onload = () => {
              setAttachedImages(prev => {
                if (prev.length >= 10) return prev
                return [...prev, {
                  name: `screenshot_${new Date().toLocaleDateString()}_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`,
                  dataUrl: reader.result as string
                }]
              })
              setFeedbackError('')
            }
            reader.readAsDataURL(file)
          }
        }
      }
      if (imagePasted) {
        e.preventDefault()
      }
    }

    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [activeTab, attachedImages])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    
    let overLimit = false
    let currentLength = attachedImages.length

    files.forEach(file => {
      if (currentLength >= 10) {
        overLimit = true
        return
      }
      currentLength++

      const reader = new FileReader()
      reader.onload = () => {
        setAttachedImages(prev => {
          if (prev.length >= 10) return prev
          return [...prev, {
            name: file.name,
            dataUrl: reader.result as string
          }]
        })
      }
      reader.readAsDataURL(file)
    })

    if (overLimit || files.length + attachedImages.length > 10) {
      setFeedbackError(t('feedback.max_images_error', { defaultValue: 'Maximal 10 Bilder sind erlaubt!' }))
    } else {
      setFeedbackError('')
    }
  }

  const handleRemoveImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
    setFeedbackError('')
  }

  const handlePasteFromClipboard = async () => {
    try {
      const dataUrl = window.api.readClipboardImage()
      if (dataUrl) {
        if (attachedImages.length >= 10) {
          setFeedbackError(t('feedback.max_images_error', { defaultValue: 'Maximal 10 Bilder sind erlaubt!' }))
          return
        }
        const name = `screenshot_${new Date().toLocaleDateString()}_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`
        setAttachedImages(prev => {
          if (prev.length >= 10) return prev
          return [...prev, { name, dataUrl }]
        })
        setFeedbackError('')
      } else {
        alert('Kein Bild in der Zwischenablage gefunden. Bitte kopiere zuerst ein Bild/Screenshot.')
      }
    } catch (err: any) {
      console.error('Fehler beim Lesen der Zwischenablage:', err)
      setFeedbackError(err.message || 'Fehler beim Lesen der Zwischenablage.')
    }
  }

  // Absenden des Feedbacks
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackError('')
    setFeedbackSuccess('')

    if (!feedbackTitle.trim()) {
      setFeedbackError(t('feedback.title_required', { defaultValue: 'Bitte gib einen Betreff an.' }))
      return
    }
    if (!feedbackText.trim()) {
      setFeedbackError(t('feedback.text_required', { defaultValue: 'Bitte beschreibe dein Feedback oder deinen Fehler.' }))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await window.api.submitFeedback({
        title: feedbackTitle,
        type: feedbackType,
        text: feedbackText,
        logFilename: attachLog ? selectedFeedbackLog : undefined,
        images: attachedImages
      })

      if (res.success) {
        setFeedbackSuccess(t('feedback.success_msg', { defaultValue: `Dein Bericht wurde erfolgreich an den Support gesendet und lokal gespeichert unter:\n${res.folder}` }))
        setFeedbackTitle('')
        setFeedbackText('')
        setAttachedImages([])
      } else {
        setFeedbackError(res.error || t('feedback.submit_failed', { defaultValue: 'Fehler beim Absenden.' }))
      }
    } catch (err: any) {
      setFeedbackError(err.message || t('feedback.submit_failed', { defaultValue: 'Fehler beim Absenden.' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filterung der Logs (Rechte Spalte)
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.raw.toLowerCase().includes(searchQuery.toLowerCase())
    if (levelFilter === 'ALL') return matchesSearch
    if (log.isDetail) return matchesSearch
    return log.level === levelFilter && matchesSearch
  })

  const getLevelStyles = (level?: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'WARN': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'INFO': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      case 'DEBUG': return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <div className={isPopout ? "h-screen w-screen bg-[#24272c] flex flex-col overflow-hidden text-omega-text select-none font-sans" : "fixed inset-0 bg-black/80 flex items-center justify-center z-[5000] p-6 animate-in fade-in duration-200"}>
      <div className={isPopout ? "w-full h-full flex flex-col overflow-hidden bg-transparent" : "bg-[#24272c] border border-gray-700/60 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md"}>
        
        {/* Header */}
        <div className="bg-[#1a1d21]/60 px-5 py-3.5 border-b border-gray-800/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="text-omega-accent w-5 h-5" />
            <div>
              <span className="text-base font-bold text-white tracking-wide block select-none">
                {activeTab === 'logs' ? 'Sitzungs-Protokolle' : 'Feedback & Fehlerbericht'}
              </span>
              {activeTab === 'logs' && (
                <span className="text-2xs text-gray-500 font-mono block select-all">
                  {logPath}
                </span>
              )}
            </div>
          </div>
          {!isPopout && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Tab-Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* TAB 1: LOGS-VIEWER (Zwei-Spalten-Layout) */}
          {activeTab === 'logs' && (
            <div className="flex-1 flex overflow-hidden">
              
              {/* Linke Spalte: Sitzungs-Logliste */}
              <div className="w-[280px] border-r border-gray-800 flex flex-col bg-[#1e2124]/20">
                <div className="p-3 bg-[#1e2124]/40 border-b border-gray-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider select-none">
                  Verfügbare Sitzungen
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {logsList.length === 0 ? (
                    <div className="text-center text-xs text-gray-500 mt-8">
                      Keine Logs gefunden.
                    </div>
                  ) : (
                    logsList.map((file) => {
                      const isSelected = selectedLogFile === file.filename
                      const isLatest = file.filename === logsList[0].filename
                      return (
                        <div
                          key={file.filename}
                          onClick={() => setSelectedLogFile(file.filename)}
                          className={`group p-2.5 rounded-lg border transition-all duration-150 cursor-pointer flex items-center gap-2.5 relative select-none ${
                            isSelected
                              ? 'bg-omega-accent/10 border-omega-accent/50 text-white'
                              : 'bg-black/10 border-gray-800/40 text-gray-400 hover:bg-[#1a1d21]/60 hover:text-gray-200'
                          }`}
                        >
                          <File className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-omega-accent' : 'text-gray-500'}`} />
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <span className="text-xs font-semibold truncate leading-tight">
                              {formatSessionFilename(file.filename)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono text-gray-500">
                                {formatSize(file.size)}
                              </span>
                              {isLatest && (
                                <span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-1 rounded-sm font-bold uppercase select-none tracking-wider scale-[0.9]">
                                  AKTIV
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteLog(file.filename, e)}
                            className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1 bg-[#1a1d21]/80 rounded border border-gray-700/60 shadow text-gray-400"
                            title="Protokoll vom PC löschen"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
                {/* Speicherplatz-Anzeige */}
                <div className="p-3 border-t border-gray-800/80 bg-[#1a1d21]/30 flex flex-col gap-0.5 text-[10px] font-mono text-gray-500 select-none">
                  <div>Gesamtspeicher Logs:</div>
                  <div className="text-xs font-bold text-gray-400 font-sans mt-0.5">
                    {formatSize(totalLogsSize)}
                  </div>
                </div>
              </div>

              {/* Rechte Spalte: Log-Inhalt */}
              <div className="flex-1 flex flex-col">
                
                {/* Toolbar */}
                <div className="bg-[#1e2124]/40 p-3 border-b border-gray-800 flex flex-wrap gap-3 items-center justify-between flex-shrink-0 select-none">
                  <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[260px]">
                    {/* Suchen */}
                    <div className="relative flex-1 max-w-xs">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                        <Search size={13} />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('logs.search_placeholder', { defaultValue: 'Protokoll filtern...' })}
                        className="w-full pl-8 pr-4 py-1.5 bg-[#16181b] border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-omega-accent transition-colors"
                      />
                    </div>

                    {/* Pegel-Filter */}
                    <div className="flex border border-gray-700 rounded-lg overflow-hidden text-[10px] bg-[#16181b]">
                      {(['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setLevelFilter(level)}
                          className={`px-2.5 py-1 font-semibold transition-colors ${
                            levelFilter === level
                              ? 'bg-omega-accent text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {level === 'ALL' ? 'ALLE' : level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 items-center">
                    {selectedLogFile && logsList.length > 0 && selectedLogFile === logsList[0].filename && (
                      <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold ${
                          autoRefresh
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                        title={autoRefresh ? 'Live-Update aktiv' : 'Live-Update pausiert'}
                      >
                        {autoRefresh ? <RefreshCw size={12} className="animate-spin" /> : <Pause size={12} />}
                        <span>{autoRefresh ? 'LIVE' : 'PAUSE'}</span>
                      </button>
                    )}

                    <div className="w-px h-5 bg-gray-800 mx-1" />

                    <button
                      onClick={handleCopyLogs}
                      disabled={logs.length === 0}
                      className={`p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-semibold transition-all disabled:opacity-50 ${
                        isCopied
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700'
                      }`}
                      title="Protokoll in Zwischenablage kopieren"
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? 'Kopiert' : 'Kopieren'}</span>
                    </button>

                    <button
                      onClick={handleExportLog}
                      disabled={logs.length === 0}
                      className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors flex items-center gap-1 text-[10px] font-semibold disabled:opacity-50"
                      title="Als .log-Datei auf PC exportieren"
                    >
                      <FolderOpen size={12} />
                      <span>Exportieren</span>
                    </button>

                    <button
                      onClick={handleClearLog}
                      disabled={logs.length === 0}
                      className="p-1.5 bg-red-950/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-lg border border-red-900/30 transition-colors flex items-center gap-1 text-[10px] font-semibold disabled:opacity-50"
                      title="Protokolldatei leeren"
                    >
                      <Trash2 size={12} />
                      <span>Leeren</span>
                    </button>
                  </div>
                </div>

                {/* Log-Einträge */}
                <div
                  ref={containerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 bg-[#16181b] font-mono text-[11px] leading-relaxed text-gray-300 custom-scrollbar select-text"
                >
                  {filteredLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs select-none">
                      {selectedLogFile ? 'Keine passenden Logeinträge vorhanden.' : 'Wähle eine Sitzung links aus.'}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredLogs.map((log) => {
                        if (log.isDetail) {
                          return (
                            <div key={log.id} className="text-gray-500 pl-24 whitespace-pre-wrap break-all">
                              {log.raw}
                            </div>
                          )
                        }
                        return (
                          <div key={log.id} className="flex items-start hover:bg-white/5 py-0.5 rounded px-1 transition-colors gap-3">
                            <span className="text-gray-500 flex-shrink-0 select-none">
                              {log.timestamp ? log.timestamp.split('T')[1].replace('Z', '') : ''}
                            </span>
                            <span className={`px-1 rounded-sm text-[9px] font-bold tracking-wider select-none border w-[48px] text-center flex-shrink-0 ${getLevelStyles(log.level)}`}>
                              {log.level}
                            </span>
                            <span className="text-omega-accent/80 font-bold select-none w-[110px] truncate flex-shrink-0" title={log.moduleName}>
                              [{log.moduleName}]
                            </span>
                            <span className="text-gray-200 whitespace-pre-wrap break-all flex-1">
                              {log.message}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-[#1a1d21]/30 px-4 py-2 flex justify-between items-center border-t border-gray-800/80 text-[10px] text-gray-500 select-none flex-shrink-0">
                  <span>
                    Zeige {filteredLogs.length} von {logs.length} Einträgen.
                  </span>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: FEEDBACK & FEHLERBERICHT */}
          {activeTab === 'feedback' && (
            <form onSubmit={handleSubmitFeedback} className="flex-1 overflow-y-auto p-7 flex flex-col gap-5 custom-scrollbar bg-[#16181b]/10">
              
              {feedbackError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-start gap-2 select-text animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{feedbackError}</div>
                </div>
              )}
              {feedbackSuccess && (
                <div className="p-4 bg-green-950/25 border border-green-500/20 text-green-400 rounded-lg text-xs flex items-start gap-2.5 select-text">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-wrap">{feedbackSuccess}</div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider select-none">
                  Betreff / Thema *
                </label>
                <input
                  type="text"
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                  placeholder="Z. B. Knacken im Audio-Export oder Featurewunsch für Fader..."
                  className="bg-[#16181b] border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-omega-accent transition-colors"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider select-none">
                  Art des Berichts
                </label>
                <div className="flex gap-4 text-xs mt-0.5 select-none">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="radio"
                      name="feedbackType"
                      checked={feedbackType === 'bug'}
                      onChange={() => setFeedbackType('bug')}
                      className="accent-omega-accent"
                      disabled={isSubmitting}
                    />
                    <span>Fehlerbericht (Bug Report)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="radio"
                      name="feedbackType"
                      checked={feedbackType === 'feedback'}
                      onChange={() => setFeedbackType('feedback')}
                      className="accent-omega-accent"
                      disabled={isSubmitting}
                    />
                    <span>Feedback / Verbesserungsvorschlag</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider select-none">
                  Beschreibung *
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Beschreibe bitte möglichst genau, was passiert ist, wie man den Fehler reproduziert, oder was du dir wünschst..."
                  rows={6}
                  className="bg-[#16181b] border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-omega-accent transition-colors resize-none leading-relaxed"
                  disabled={isSubmitting}
                />
              </div>

              <div className="border border-gray-800 p-4 rounded-xl bg-black/15 flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white select-none text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={attachLog}
                    onChange={(e) => setAttachLog(e.target.checked)}
                    className="accent-omega-accent"
                    disabled={isSubmitting}
                  />
                  <span>Diagnose-Protokoll an diesen Bericht anhängen</span>
                </label>
                {attachLog && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider select-none">
                      Protokoll-Auswahl
                    </span>
                    <select
                      value={selectedFeedbackLog}
                      onChange={(e) => setSelectedFeedbackLog(e.target.value)}
                      className="bg-[#16181b] border border-gray-750 rounded px-2.5 py-1.5 text-xs text-white outline-none w-full max-w-sm"
                      disabled={isSubmitting}
                    >
                      {logsList.map(l => (
                        <option key={l.filename} value={l.filename}>
                          {formatSessionFilename(l.filename)} ({formatSize(l.size)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex justify-between select-none">
                  <span>Bilder / Screenshots anhängen (Max. 10)</span>
                  <span className="text-gray-600">{attachedImages.length} / 10</span>
                </label>

                <div
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.clipboard-btn')) {
                      return
                    }
                    fileInputRef.current?.click()
                  }}
                  className="border-2 border-dashed border-gray-800 hover:border-omega-accent/40 rounded-xl p-6 text-center cursor-pointer bg-black/5 hover:bg-black/10 transition-colors flex flex-col items-center gap-2 select-none group"
                >
                  <Upload className="w-8 h-8 text-gray-600 group-hover:text-omega-accent transition-colors" />
                  <div className="text-xs text-gray-400">
                    Klicke hier, um Bilder auszuwählen.
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePasteFromClipboard()
                    }}
                    className="clipboard-btn mt-2 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg border border-gray-700 text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span>Aus Zwischenablage einfügen</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </div>

                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-3.5 mt-2 p-2.5 bg-black/10 border border-gray-850 rounded-xl select-none">
                    {attachedImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-24 h-20 bg-gray-900 border border-gray-700/60 rounded-lg overflow-hidden group shadow-md"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="bg-red-600 hover:bg-red-500 text-white rounded p-1 text-2xs transition-colors"
                            title="Bild entfernen"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-gray-400 px-1 truncate select-none text-center font-mono leading-relaxed" title={img.name}>
                          {img.name.substring(0, 12)}...
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-3 border-t border-gray-800/80 pt-4 flex-shrink-0 select-none">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-omega-accent hover:bg-blue-500 text-white text-xs rounded-lg shadow-lg hover:shadow-omega-accent/20 transition-all font-bold flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="animate-spin w-3.5 h-3.5" />
                      <span>Bericht wird gesendet...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Bericht an Support senden</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Globaler Footer */}
        {!isPopout && (
          <div className="bg-[#1a1d21]/60 px-5 py-3.5 flex justify-end items-center border-t border-gray-800/80 select-none flex-shrink-0">
            <button 
              onClick={onClose} 
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700/60 text-xs rounded-lg shadow font-bold active:scale-[0.98] transition-all"
            >
              {t('common.close', { defaultValue: 'Schließen' })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
