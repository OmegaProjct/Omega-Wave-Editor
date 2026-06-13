import React, { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare, RefreshCw, AlertCircle, Clock, Upload, Trash2, FileText, Check, Paperclip } from 'lucide-react'

interface ChatMessage {
  sender: 'user' | 'admin'
  text: string
  timestamp: number
  images?: any[]
  logs?: string
}

interface SupportTicket {
  id: string
  deviceId: string
  project: string
  type: string
  title: string
  description: string
  status: 'open' | 'closed'
  createdAt: number
  updatedAt: number
  chat: ChatMessage[]
  images?: any[]
  logs?: string
}

interface MessageCenterModalProps {
  onClose: () => void
}

export function MessageCenterModal({ onClose }: MessageCenterModalProps) {
  const [deviceId, setDeviceId] = useState<string>('')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSending, setIsSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Attachment and error states
  const [attachedImages, setAttachedImages] = useState<{ name: string; dataUrl: string }[]>([])
  const [logsList, setLogsList] = useState<{ filename: string; size: number }[]>([])
  const [selectedLog, setSelectedLog] = useState<string>('')
  const [attachLog, setAttachLog] = useState<boolean>(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get Device ID and session logs list on mount
  useEffect(() => {
    window.api.getDeviceId()
      .then((id) => {
        setDeviceId(id)
        loadTickets(id)
      })
      .catch((err) => {
        console.error('Failed to get device ID:', err)
        setError('Geräte-ID konnte nicht ermittelt werden.')
      })

    window.api.getSessionLogs()
      .then((list) => {
        setLogsList(list)
        if (list.length > 0) {
          setSelectedLog(list[0].filename)
        }
      })
      .catch((err) => {
        console.error('Failed to get session logs:', err)
      })
  }, [])

  // Poll for new messages every 5 seconds if a ticket is selected and active
  useEffect(() => {
    if (!deviceId) return
    const interval = setInterval(() => {
      loadTickets(deviceId, true)
    }, 5000)
    return () => clearInterval(interval)
  }, [deviceId])

  // Scroll to bottom when selected ticket or chat changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedTicketId, tickets])

  // Globaler Paste-Listener für Bilder im Chat
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!selectedTicketId) return
      const ticket = tickets.find(t => t.id === selectedTicketId)
      if (!ticket || ticket.status === 'closed') return

      const items = e.clipboardData?.items
      if (!items) return

      let imagePasted = false
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            imagePasted = true
            if (attachedImages.length >= 10) {
              setReplyError('Maximal 10 Bilder sind erlaubt!')
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
              setReplyError(null)
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
  }, [selectedTicketId, tickets, attachedImages])

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
      setReplyError('Maximal 10 Bilder sind erlaubt!')
    } else {
      setReplyError(null)
    }
  }

  const handleRemoveImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
    setReplyError(null)
  }

  const handlePasteFromClipboard = async () => {
    try {
      const dataUrl = window.api.readClipboardImage()
      if (dataUrl) {
        if (attachedImages.length >= 10) {
          setReplyError('Maximal 10 Bilder sind erlaubt!')
          return
        }
        const name = `screenshot_${new Date().toLocaleDateString()}_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`
        setAttachedImages(prev => {
          if (prev.length >= 10) return prev
          return [...prev, { name, dataUrl }]
        })
        setReplyError(null)
      } else {
        alert('Kein Bild in der Zwischenablage gefunden. Bitte kopiere zuerst ein Bild/Screenshot.')
      }
    } catch (err: any) {
      console.error('Fehler beim Lesen der Zwischenablage:', err)
      setReplyError(err.message || 'Fehler beim Lesen der Zwischenablage.')
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatSessionFilename = (filename: string) => {
    return filename
      .replace('session_', 'Sitzung vom ')
      .replace('.log', '')
      .replace(/_/g, ' ')
  }

  const formatMessageText = (text: string) => {
    return text
      .replace(/\[Telegram OmegaProject Support\]/gi, '[OmegaProjects Support]')
      .replace(/\[Telegram Omega Project Support\]/gi, '[OmegaProjects Support]')
      .replace(/Telegram OmegaProject Support/gi, 'OmegaProjects Support')
      .replace(/Telegram Omega Project Support/gi, 'OmegaProjects Support')
  }

  const loadTickets = async (id: string, silent: boolean = false) => {
    if (!silent) setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`https://admin.omc.omegaprojects.de/api/messages?deviceId=${encodeURIComponent(id)}`)
      if (!response.ok) {
        throw new Error(`Server antwortete mit Status: ${response.status}`)
      }
      const data = await response.json()
      if (data.success && Array.isArray(data.tickets)) {
        // Sort tickets by last update
        const sortedTickets = [...data.tickets].sort((a, b) => b.updatedAt - a.updatedAt)
        setTickets(sortedTickets)
      } else {
        throw new Error(data.error || 'Fehler beim Laden der Tickets.')
      }
    } catch (err: any) {
      console.error('Failed to load tickets:', err)
      if (!silent) {
        setError('Verbindung zum Nachrichtencenter fehlgeschlagen. Bitte prüfe deine Internetverbindung.')
      }
    } finally {
      if (!silent) setIsLoading(false)
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicketId || isSending) return
    const hasText = !!replyText.trim()
    const hasImages = attachedImages.length > 0
    const hasLogs = attachLog && !!selectedLog
    if (!hasText && !hasImages && !hasLogs) return

    const ticket = tickets.find(t => t.id === selectedTicketId)
    if (!ticket || ticket.status === 'closed') return

    setIsSending(true)
    setError(null)
    setReplyError(null)
    try {
      let logsContent = ''
      if (attachLog && selectedLog) {
        try {
          logsContent = await window.api.getLogContent(selectedLog)
        } catch (err) {
          console.error('Failed to read log content:', err)
        }
      }

      const response = await fetch('https://admin.omc.omegaprojects.de/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicketId,
          feedbackId: selectedTicketId,
          deviceId: deviceId,
          text: replyText.trim() || (hasLogs ? '[Anhang: Diagnose-Protokoll]' : '[Anhang: Bild(er)]'),
          images: attachedImages,
          logs: logsContent
        })
      })

      if (!response.ok) {
        throw new Error(`Server antwortete mit Status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setReplyText('')
        setAttachedImages([])
        setAttachLog(false)
        await loadTickets(deviceId, true)
      } else {
        throw new Error(data.error || 'Antwort konnte nicht gesendet werden.')
      }
    } catch (err: any) {
      console.error('Failed to send reply:', err)
      setError('Nachricht konnte nicht gesendet werden.')
    } finally {
      setIsSending(false)
    }
  }

  const selectedTicket = tickets.find(t => t.id === selectedTicketId)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-screen w-screen bg-[#24272c] flex flex-col overflow-hidden text-omega-text select-none font-sans">
      
      {/* Header */}
      <div className="bg-[#1a1d21]/60 px-5 py-3.5 border-b border-gray-800/80 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-omega-accent w-5 h-5" />
          <div>
            <span className="text-base font-bold text-white tracking-wide block select-none">
              Support & Nachrichtencenter
            </span>
            <span className="text-2xs text-gray-500 font-mono block select-all">
              Geräte-ID: {deviceId || 'Lade...'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Left Sidebar: Tickets List */}
        <div className="w-[200px] border-r border-gray-800 flex flex-col bg-[#1e2124]/20 flex-shrink-0">
          <div className="p-3 bg-[#1e2124]/40 border-b border-gray-800 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Meine Tickets</span>
            <button 
              onClick={() => deviceId && loadTickets(deviceId)}
              disabled={isLoading}
              className="text-gray-500 hover:text-omega-accent transition-colors disabled:opacity-50 p-1"
              title="Aktualisieren"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin text-omega-accent' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {isLoading && tickets.length === 0 ? (
              <div className="text-center text-xs text-gray-500 mt-8 flex flex-col items-center gap-2">
                <RefreshCw size={16} className="animate-spin text-omega-accent" />
                <span>Lade Tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center text-xs text-gray-500 mt-8 px-2 leading-relaxed">
                Keine Support-Tickets gefunden. Erstelle eins über das Menü "Feedback & Fehlerbericht".
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t.id
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-2.5 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-omega-accent/15 border-omega-accent/50 text-white'
                        : 'bg-black/10 border-gray-800/40 text-gray-400 hover:bg-[#1a1d21]/60 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-xs font-semibold truncate leading-tight select-none">
                      {t.title}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] border px-1.5 py-0.5 rounded-sm font-bold uppercase select-none tracking-wider scale-[0.9] origin-left ${
                        t.status === 'open'
                          ? 'text-green-400 bg-green-500/10 border-green-500/20'
                          : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
                      }`}>
                        {t.status === 'open' ? 'Aktiv' : 'Geschlossen'}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500">
                        {formatDate(t.updatedAt)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Pane: Chat Window */}
        <div className="flex-1 flex flex-col bg-[#16181b] min-w-0">
          {error && (
            <div className="p-3 bg-red-950/20 border-b border-red-500/20 text-red-400 text-xs flex items-center gap-2 flex-shrink-0">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {selectedTicket ? (
            <div className="flex-grow flex flex-col min-h-0">
              {/* Chat Header Info */}
              <div className="p-3 bg-[#1a1d21]/40 border-b border-gray-800/60 flex items-center justify-between flex-shrink-0">
                <div className="min-w-0 pr-4">
                  <span className="text-xs font-bold text-white block truncate">
                    {selectedTicket.title}
                  </span>
                  <span className="text-[10px] text-gray-500 block truncate mt-0.5 select-none">
                    Kategorie: {selectedTicket.type === 'bug' ? 'Fehlerbericht' : selectedTicket.type === 'feedback' ? 'Verbesserungsvorschlag' : selectedTicket.type}
                  </span>
                </div>
                <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold uppercase select-none tracking-wider ${
                  selectedTicket.status === 'open'
                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
                }`}>
                  {selectedTicket.status === 'open' ? 'Aktiv' : 'Geschlossen'}
                </span>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar select-text">
                {/* Initial Description / Ticket-Start */}
                <div className="flex flex-col items-end">
                  <div className="bg-omega-accent text-white rounded-br-none rounded-xl max-w-[85%] p-3 text-xs leading-relaxed shadow">
                    <div className="font-semibold mb-1 text-[10px] text-blue-200 select-none">
                      Problembeschreibung
                    </div>
                    {selectedTicket.description}

                    {/* Display initial images in description if any */}
                    {selectedTicket.images && selectedTicket.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 select-none border-t border-blue-400/20 pt-2">
                        {selectedTicket.images.map((img: any, idx: number) => {
                          const src = typeof img === 'string' ? img : (img.dataUrl || img.data)
                          const name = typeof img === 'string' ? `screenshot_${idx}.png` : img.name
                          if (!src) return null
                          return (
                            <div key={idx} className="relative w-20 h-16 bg-gray-900 border border-gray-700/60 rounded overflow-hidden group shadow cursor-zoom-in flex-shrink-0">
                              <img
                                src={src}
                                alt={name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                onClick={() => {
                                  window.open(src, '_blank')
                                }}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Display initial logs in description if any */}
                    {selectedTicket.logs && selectedTicket.logs.trim().length > 0 && (
                      <div className="mt-2 p-2 bg-black/30 border border-gray-800 rounded font-mono text-[10px] text-gray-300 flex flex-col gap-1 border-t border-blue-400/20 pt-2">
                        <div className="flex items-center justify-between text-[9px] text-gray-400 select-none pb-1 border-b border-gray-800/60">
                          <span className="flex items-center gap-1">
                            <FileText size={10} />
                            Diagnose-Protokoll ({formatSize(new Blob([selectedTicket.logs]).size)})
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(selectedTicket.logs || '')
                                alert('Log in Zwischenablage kopiert!')
                              } catch (e) {
                                console.error('Kopieren fehlgeschlagen:', e)
                              }
                            }}
                            className="text-omega-accent hover:underline text-[9px]"
                          >
                            Kopieren
                          </button>
                        </div>
                        <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all custom-scrollbar leading-relaxed">
                          {selectedTicket.logs}
                        </pre>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 select-none flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(selectedTicket.createdAt)} um {formatTime(selectedTicket.createdAt)}
                  </span>
                </div>

                {/* Chat Replies */}
                {selectedTicket.chat.map((msg, index) => {
                  const isUser = msg.sender === 'user'
                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`p-3 text-xs leading-relaxed shadow max-w-[85%] ${
                        isUser
                          ? 'bg-omega-accent text-white rounded-br-none rounded-xl'
                          : 'bg-[#282b30] border border-gray-750 text-gray-100 rounded-bl-none rounded-xl'
                      }`}>
                        {!isUser && (
                          <div className="font-semibold mb-1 text-[10px] text-omega-accent select-none">
                            Support-Team
                          </div>
                        )}
                        <div>
                          {formatMessageText(msg.text)}
                        </div>

                        {/* Display reply images if any */}
                        {msg.images && msg.images.length > 0 && (
                          <div className={`flex flex-wrap gap-2 mt-2 select-none border-t pt-2 ${isUser ? 'border-blue-400/20' : 'border-gray-700/50'}`}>
                            {msg.images.map((img: any, idx: number) => {
                              const src = typeof img === 'string' ? img : (img.dataUrl || img.data)
                              const name = typeof img === 'string' ? `screenshot_${idx}.png` : img.name
                              if (!src) return null
                              return (
                                <div key={idx} className="relative w-20 h-16 bg-gray-900 border border-gray-700/60 rounded overflow-hidden group shadow cursor-zoom-in flex-shrink-0">
                                  <img
                                    src={src}
                                    alt={name}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                    onClick={() => {
                                      window.open(src, '_blank')
                                    }}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Display reply logs if any */}
                        {msg.logs && msg.logs.trim().length > 0 && (
                          <div className={`mt-2 p-2 bg-black/30 border border-gray-800 rounded font-mono text-[10px] text-gray-300 flex flex-col gap-1 border-t pt-2 ${isUser ? 'border-blue-400/20' : 'border-gray-700/50'}`}>
                            <div className="flex items-center justify-between text-[9px] text-gray-400 select-none pb-1 border-b border-gray-850">
                              <span className="flex items-center gap-1">
                                <FileText size={10} />
                                Diagnose-Protokoll ({formatSize(new Blob([msg.logs]).size)})
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(msg.logs || '')
                                    alert('Log in Zwischenablage kopiert!')
                                  } catch (e) {
                                    console.error('Kopieren fehlgeschlagen:', e)
                                  }
                                }}
                                className="text-omega-accent hover:underline text-[9px]"
                              >
                                Kopieren
                              </button>
                            </div>
                            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all custom-scrollbar leading-relaxed">
                              {msg.logs}
                            </pre>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-500 mt-1 select-none flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(msg.timestamp)} um {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Area */}
              <div className="p-3 bg-[#1a1d21]/30 border-t border-gray-800/80 flex-shrink-0 flex flex-col gap-2">
                {selectedTicket.status === 'closed' ? (
                  <div className="text-center py-2 text-xs text-gray-500 select-none">
                    Dieses Ticket wurde geschlossen. Bei neuen Fragen erstelle bitte ein neues Ticket.
                  </div>
                ) : (
                  <>
                    {/* Error display */}
                    {replyError && (
                      <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 select-text">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{replyError}</span>
                      </div>
                    )}

                    {/* Attached Images Thumbnails */}
                    {attachedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 bg-black/20 border border-gray-850 rounded-lg select-none">
                        {attachedImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative w-16 h-12 bg-gray-900 border border-gray-700/60 rounded overflow-hidden group shadow"
                          >
                            <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="bg-red-600 hover:bg-red-500 text-white rounded p-0.5 text-3xs transition-colors"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Log Attachment Badge / Dropdown */}
                    {attachLog && (
                      <div className="flex items-center gap-2 p-2 bg-black/20 border border-gray-850 rounded-lg select-none text-xs text-gray-300">
                        <FileText size={14} className="text-omega-accent shrink-0" />
                        <span className="text-[10px] font-mono truncate flex-1">
                          Diagnose-Protokoll anhängen:
                        </span>
                        <select
                          value={selectedLog}
                          onChange={(e) => setSelectedLog(e.target.value)}
                          className="bg-[#16181b] border border-gray-750 rounded px-1.5 py-0.5 text-[10px] text-white outline-none max-w-[180px]"
                          disabled={isSending}
                        >
                          {logsList.map(l => (
                            <option key={l.filename} value={l.filename}>
                              {formatSessionFilename(l.filename)} ({formatSize(l.size)})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setAttachLog(false)}
                          className="text-red-400 hover:text-red-300 text-[10px] ml-1 font-semibold"
                        >
                          Entfernen
                        </button>
                      </div>
                    )}

                    {/* Input field and send buttons */}
                    <div className="flex flex-col gap-2">
                      <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Antwort eingeben..."
                          disabled={isSending}
                          className="flex-1 bg-[#16181b] border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-omega-accent transition-colors"
                        />
                        
                        <button
                          type="submit"
                          disabled={isSending || (!replyText.trim() && attachedImages.length === 0 && !attachLog)}
                          className="px-4 py-2 bg-omega-accent hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg flex items-center justify-center transition-colors shrink-0 shadow h-[32px] w-[40px]"
                        >
                          <Send size={14} />
                        </button>
                      </form>

                      {/* Attachment Controls (Row of buttons) */}
                      <div className="flex gap-2 select-none justify-start mt-0.5">
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 text-[10px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                          title="Bilder hochladen"
                        >
                          <Upload size={10} />
                          <span>Bild hinzufügen</span>
                        </button>
                        
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={handlePasteFromClipboard}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 text-[10px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                          title="Bild aus der Zwischenablage einfügen"
                        >
                          <Check size={10} />
                          <span>Aus Zwischenablage</span>
                        </button>

                        {!attachLog && logsList.length > 0 && (
                          <button
                            type="button"
                            disabled={isSending}
                            onClick={() => setAttachLog(true)}
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 text-[10px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                            title="Protokoll anhängen"
                          >
                            <Paperclip size={10} />
                            <span>Protokoll anhängen</span>
                          </button>
                        )}
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isSending}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 select-none">
              <MessageSquare className="w-12 h-12 text-gray-700 mb-3" />
              <span className="text-sm font-bold text-gray-400">Kein Ticket ausgewählt</span>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed mt-1.5">
                Wähle links ein Support-Ticket aus, um den Chatverlauf anzuzeigen, oder erstelle ein neues über das Menü "Hilfe &rarr; Feedback...".
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
