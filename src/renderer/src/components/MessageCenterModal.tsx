import React, { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare, RefreshCw, AlertCircle, Clock } from 'lucide-react'

interface ChatMessage {
  sender: 'user' | 'admin'
  text: string
  timestamp: number
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

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Get Device ID on mount
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
    if (!selectedTicketId || !replyText.trim() || isSending) return

    const ticket = tickets.find(t => t.id === selectedTicketId)
    if (!ticket || ticket.status === 'closed') return

    setIsSending(true)
    setError(null)
    try {
      const response = await fetch('https://admin.omc.omegaprojects.de/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicketId,
          feedbackId: selectedTicketId,
          deviceId: deviceId,
          text: replyText.trim()
        })
      })

      if (!response.ok) {
        throw new Error(`Server antwortete mit Status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setReplyText('')
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
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
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
            <div className="p-3 bg-red-950/20 border-b border-red-500/20 text-red-400 text-xs flex items-center gap-2 flex-shrink-0 animate-pulse">
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
                        {msg.text}
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
              <div className="p-3 bg-[#1a1d21]/30 border-t border-gray-800/80 flex-shrink-0">
                {selectedTicket.status === 'closed' ? (
                  <div className="text-center py-2 text-xs text-gray-500 select-none">
                    Dieses Ticket wurde geschlossen. Bei neuen Fragen erstelle bitte ein neues Ticket.
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="flex gap-2">
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
                      disabled={isSending || !replyText.trim()}
                      className="px-4 py-2 bg-omega-accent hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg flex items-center justify-center transition-colors shrink-0 shadow"
                    >
                      <Send size={14} className={isSending ? 'animate-pulse' : ''} />
                    </button>
                  </form>
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
