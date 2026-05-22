import React from 'react'
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export type ModalType = 'info' | 'warn' | 'success' | 'error' | 'confirm'

interface MessageModalProps {
  type: ModalType
  title: string
  message: string
  onClose: (result?: boolean) => void
}

export function MessageModal({ type, title, message, onClose }: MessageModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'info': return <Info className="text-blue-400" size={24} />
      case 'warn': return <AlertTriangle className="text-yellow-400" size={24} />
      case 'success': return <CheckCircle className="text-green-400" size={24} />
      case 'error': return <XCircle className="text-red-400" size={24} />
      case 'confirm': return <AlertTriangle className="text-omega-accent" size={24} />
      default: return <Info className="text-blue-400" size={24} />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[5000] animate-in fade-in duration-200">
      <div className="bg-[#2b2d31] border border-gray-600 w-[420px] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#1e2124] px-4 py-2 border-b border-gray-700 flex items-center justify-between">
           <div className="flex items-center gap-2">
              {getIcon()}
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{title}</span>
           </div>
           <button onClick={() => onClose(false)} className="text-gray-500 hover:text-white transition-colors">✖</button>
        </div>

        {/* Content */}
        <div className="p-6 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {message}
        </div>

        {/* Footer */}
        <div className="bg-[#1e2124] px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
          {type === 'confirm' ? (
            <>
              <button 
                onClick={() => onClose(true)} 
                className="px-6 py-1.5 bg-omega-accent hover:bg-blue-500 text-white text-xs rounded shadow transition-all font-bold"
              >
                OK
              </button>
              <button 
                onClick={() => onClose(false)} 
                className="px-6 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded shadow transition-all"
              >
                Abbrechen
              </button>
            </>
          ) : (
            <button 
              onClick={() => onClose()} 
              className="px-8 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded shadow transition-all font-bold"
            >
              Schließen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

