import React, { useState } from 'react'

type Effect = {
  id: string
  name: string
  isActive: boolean
}

export function SavePresetModal({ effects, onSave, onClose }: { effects: Effect[], onSave: (selectedIds: string[], presetName: string) => void, onClose: () => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(effects.map(e => e.id))
  const [presetName, setPresetName] = useState('Mein Preset')

  const toggleEffect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[3000] font-sans text-omega-text">
      <div className="bg-[#282b30] border border-gray-600 w-[450px] rounded shadow-2xl flex flex-col overflow-hidden">
        
        <div className="p-2 px-3 border-b border-gray-600 flex justify-between items-center bg-[#1e2124]">
          <span className="text-xs font-semibold uppercase tracking-wider">Audioeffekte speichern</span>
          <button onClick={onClose} className="hover:text-red-400">✖</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
           <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Preset Name:</span>
              <input 
                type="text" 
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1.5 text-sm outline-none focus:border-omega-accent"
              />
           </div>

           <div className="flex flex-col gap-2 border border-gray-700 rounded p-3 bg-black/10">
              <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Enthaltene Effekte wählen:</span>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                 {effects.map(effect => (
                    <label key={effect.id} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors text-sm">
                       <input 
                         type="checkbox" 
                         checked={selectedIds.includes(effect.id)} 
                         onChange={() => toggleEffect(effect.id)}
                         className="w-4 h-4 rounded"
                       />
                       <span>{effect.name}</span>
                    </label>
                 ))}
              </div>
           </div>

           <p className="text-[10px] text-gray-500 leading-tight italic">
              Nur die ausgewählten Effekte werden in der .owea Datei gespeichert und können später als Kette wieder geladen werden.
           </p>
        </div>

        <div className="p-3 border-t border-gray-600 flex justify-end gap-2 bg-[#1e2124]">
           <button 
             onClick={() => onSave(selectedIds, presetName)}
             className="px-8 py-1.5 text-sm bg-omega-accent hover:bg-blue-500 rounded text-white shadow font-semibold"
           >
             Speichern
           </button>
           <button onClick={onClose} className="px-6 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded">Abbrechen</button>
        </div>

      </div>
    </div>
  )
}