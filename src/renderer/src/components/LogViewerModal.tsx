import React, { useState, useEffect, useRef } from 'react'
import { X, Search, Copy, FolderOpen, Trash2, RefreshCw, Play, Pause, FileText, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LogViewerModalProps {
  onClose: () => void
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

export function LogViewerModal({ onClose }: LogViewerModalProps) {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<LogLine[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'>('ALL')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [logPath, setLogPath] = useState('')
  
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  // Lädt die Logs und den Dateipfad
  const fetchLogs = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const content = await window.api.getLogContent()
      const path = await window.api.getLogPath()
      setLogPath(path)
      
      // Parse die Logzeilen
      const lines = content.split('\n')
      const parsedLines: LogLine[] = []
      let idCounter = 0
      
      lines.forEach((line: string) => {
        if (!line.trim()) return
        
        // Regulärer Ausdruck für das Format: [Timestamp] [LEVEL] [MODULE] Nachricht
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
          // Zeilen ohne dieses Format sind Detailzeilen (z. B. Stacktraces)
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
    fetchLogs()
  }, [])

  // Auto-Refresh Intervall
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      fetchLogs(true)
    }, 2000)
    return () => clearInterval(timer)
  }, [autoRefresh])

  // Scrollt nach unten, wenn neue Logs hinzukommen und der Scrollbalken bereits unten war
  useEffect(() => {
    if (containerRef.current && isAtBottom.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  // Prüft, ob der Nutzer manuell hochscrollt
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    // Puffer von 15px
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 15
  }

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

  const handleClearLog = async () => {
    if (confirm(t('logs.confirm_clear', { defaultValue: 'Möchtest du das Diagnose-Protokoll wirklich leeren?' }))) {
      await window.api.clearLog()
      fetchLogs()
    }
  }

  const handleOpenFolder = async () => {
    await window.api.openLogFolder()
  }

  // Filterung der Logs
  const filteredLogs = logs.filter((log) => {
    // Falls es eine Detailzeile ist, behalten wir sie nur, wenn der vorherige Logeintrag (Header) auch durchgeht.
    // Der Einfachheit halber filtern wir nach Textinhalt der Rohzeile.
    const matchesSearch = log.raw.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (levelFilter === 'ALL') return matchesSearch
    
    if (log.isDetail) {
      // Detailzeilen haben kein Level, werden aber angezeigt wenn Suchfilter passt
      return matchesSearch
    }
    
    return log.level === levelFilter && matchesSearch
  })

  // Gibt die CSS-Klassen für das jeweilige Log-Level zurück
  const getLevelStyles = (level?: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'WARN':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'INFO':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      case 'DEBUG':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[5000] p-6 animate-in fade-in duration-200">
      <div className="bg-[#24272c] border border-gray-700/60 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md">
        
        {/* Header */}
        <div className="bg-[#1a1d21]/60 px-6 py-4 border-b border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="text-omega-accent w-5 h-5" />
            <div>
              <span className="text-lg font-bold text-white tracking-wide block">
                {t('logs.title', { defaultValue: 'Diagnose-Protokolle' })}
              </span>
              <span className="text-2xs text-gray-500 font-mono block select-all">
                {logPath}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-[#1e2124]/40 p-4 border-b border-gray-800/80 flex flex-wrap gap-3 items-center justify-between">
          {/* Suche und Level-Filter */}
          <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('logs.search_placeholder', { defaultValue: 'Protokolle durchsuchen...' })}
                className="w-full pl-9 pr-4 py-1.5 bg-[#16181b] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-omega-accent transition-colors"
              />
            </div>

            <div className="flex border border-gray-700 rounded-lg overflow-hidden text-xs bg-[#16181b]">
              {(['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={`px-3 py-1.5 font-semibold transition-colors ${
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

          {/* Steuerungsknöpfe */}
          <div className="flex gap-2 items-center">
            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                autoRefresh
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
              title={autoRefresh ? 'Live-Update aktiv' : 'Live-Update pausiert'}
            >
              {autoRefresh ? <RefreshCw size={14} className="animate-spin" /> : <Pause size={14} />}
              <span>{autoRefresh ? 'LIVE' : 'PAUSE'}</span>
            </button>

            {/* Manuelles Aktualisieren */}
            <button
              onClick={() => fetchLogs()}
              disabled={isLoading}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
              title="Aktualisieren"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <div className="w-px h-6 bg-gray-850 mx-1" />

            {/* In Zwischenablage kopieren */}
            <button
              onClick={handleCopyLogs}
              className={`p-2 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-all ${
                isCopied
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700'
              }`}
              title="In Zwischenablage kopieren"
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              <span>{isCopied ? 'Kopiert' : 'Kopieren'}</span>
            </button>

            {/* Ordner öffnen */}
            <button
              onClick={handleOpenFolder}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Log-Ordner im Windows-Explorer öffnen"
            >
              <FolderOpen size={14} />
              <span>Log-Ordner</span>
            </button>

            {/* Protokoll leeren */}
            <button
              onClick={handleClearLog}
              className="p-2 bg-red-950/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-lg border border-red-900/30 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Protokoll leeren"
            >
              <Trash2 size={14} />
              <span>Leeren</span>
            </button>
          </div>
        </div>

        {/* Log Lines Container */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 bg-[#16181b] font-mono text-[11px] leading-relaxed text-gray-300 custom-scrollbar select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-xs">
              Keine Logeinträge vorhanden.
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
                    {/* Timestamp */}
                    <span className="text-gray-500 flex-shrink-0 select-none">
                      {log.timestamp ? log.timestamp.split('T')[1].replace('Z', '') : ''}
                    </span>
                    
                    {/* Level */}
                    <span className={`px-1 rounded-sm text-[9px] font-bold tracking-wider select-none border w-[48px] text-center flex-shrink-0 ${getLevelStyles(log.level)}`}>
                      {log.level}
                    </span>

                    {/* Module */}
                    <span className="text-omega-accent/80 font-bold select-none w-[110px] truncate flex-shrink-0" title={log.moduleName}>
                      [{log.moduleName}]
                    </span>

                    {/* Message */}
                    <span className="text-gray-200 whitespace-pre-wrap break-all flex-1">
                      {log.message}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#1a1d21]/60 px-6 py-4 flex justify-between items-center border-t border-gray-800/80 select-none">
          <span className="text-xs text-gray-500">
            Zeige {filteredLogs.length} von {logs.length} Einträgen.
          </span>
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-omega-accent hover:bg-blue-500 text-white text-xs rounded-lg shadow-lg hover:shadow-omega-accent/20 transition-all font-bold active:scale-[0.98]"
          >
            {t('common.close', { defaultValue: 'Schließen' })}
          </button>
        </div>
      </div>
    </div>
  )
}
