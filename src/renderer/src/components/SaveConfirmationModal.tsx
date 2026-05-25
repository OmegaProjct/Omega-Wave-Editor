import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface SaveConfirmationModalProps {
  projectName: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function SaveConfirmationModal({ projectName, onSave, onDiscard, onCancel }: SaveConfirmationModalProps) {
  // Replikation des originalen professionellen DAW Speichern-Alerts:
  // - Slate-Gray Farbspektrum (#2d3136 für den Body, #1e2124 für die Titelzeile)
  // - Gelbes Warndreieck-Icon auf der linken Seite
  // - Rechter Textbereich mit exaktem Fragetext und Layout
  // - Drei nebeneinander liegende Buttons im DAW-Design
  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-[#2d3136] border border-gray-600/60 w-[460px] rounded-sm shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        
        {/* Title / Header */}
        <div className="bg-[#1e2124] px-4 py-2 border-b border-gray-700/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-300">Omega Wave Editor</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex gap-6 items-start bg-[#2d3136]">
          {/* Gelbes Dreieck-Symbol */}
          <div className="flex-shrink-0 text-yellow-500 mt-1">
            <AlertTriangle size={38} strokeWidth={2} />
          </div>

          {/* Nachrichtentext im originalen DAW-Wortlaut */}
          <div className="flex flex-col text-left text-xs leading-relaxed text-gray-200">
            <p className="mb-0.5">Das Projekt</p>
            <p className="font-bold text-white tracking-wide font-mono text-[13px] my-1">
              '{projectName || '2026-05-22.owep'}'
            </p>
            <p className="mb-1">wurde geändert und nicht abgespeichert!</p>
            <p className="font-semibold text-white">Soll es jetzt abgespeichert werden?</p>
          </div>
        </div>

        {/* Footer Buttons nebeneinander */}
        <div className="bg-[#24272b] px-4 py-3 border-t border-gray-700/50 flex gap-2 justify-end">
          <button 
            onClick={onSave} 
            className="px-3.5 py-1.5 bg-[#40454d] hover:bg-omega-accent hover:border-blue-500 text-white text-xs font-medium rounded border border-gray-600/40 shadow transition-all duration-150 active:scale-[0.98]"
          >
            Projekt speichern
          </button>
          <button 
            onClick={onDiscard} 
            className="px-3.5 py-1.5 bg-[#40454d] hover:bg-red-650 hover:border-red-600 text-white text-xs font-medium rounded border border-gray-600/40 shadow transition-all duration-150 active:scale-[0.98]"
          >
            Nicht speichern
          </button>
          <button 
            onClick={onCancel} 
            className="px-3.5 py-1.5 bg-[#40454d] hover:bg-gray-600 hover:border-gray-500 text-white text-xs font-medium rounded border border-gray-600/40 shadow transition-all duration-150 active:scale-[0.98]"
          >
            Abbrechen
          </button>
        </div>

      </div>
    </div>
  )
}
