import React, { useState } from 'react'
import { FileText, Music, Info, Copy, HelpCircle } from 'lucide-react'

type Tab = 'Allgemein' | 'Audio'

export function ObjectPropertiesModal({ onClose, region }: { onClose: () => void, region: any }) {
  const [activeTab, setActiveTab] = useState<Tab>('Allgemein')

  const renderAllgemein = () => (
    <div className="flex flex-col gap-6 text-sm">
       <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Objekt</span>
          <div className="flex items-center gap-4">
             <span className="w-24 text-gray-500">Name:</span>
             <input type="text" defaultValue={region?.file?.name || 'Unbenannt'} className="flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 outline-none focus:border-omega-accent" />
          </div>
          <div className="flex items-center gap-4 mt-2">
             <span className="w-24 text-gray-500">Objektfarbe:</span>
             <div className={`w-10 h-4 rounded border border-gray-900 ${region?.color || 'bg-emerald-600'}`}></div>
          </div>
          <div className="flex items-center gap-4 mt-2">
             <span className="w-24 text-gray-500">Spielzeit:</span>
             <span className="text-gray-300">00h 00min {Math.floor(region?.duration || 0)}s</span>
          </div>
          <div className="flex items-start gap-4 mt-2">
             <span className="w-24 text-gray-500">Hinweis:</span>
             <p className="flex-1 text-[11px] text-gray-500 leading-tight">Ein Objekt ist nur eine Referenz im aktuellen Projekt auf eine echte Datei.</p>
          </div>
       </div>

       <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 mt-2">Datei</span>
          <div className="flex items-center gap-4">
             <span className="w-24 text-gray-500">Dateiname:</span>
             <span className="flex-1 truncate text-[11px] text-gray-400">{region?.file?.path || 'C:\\...'}</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
             <span className="w-24 text-gray-500">Dateigröße:</span>
             <span className="text-gray-400">---</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
             <span className="w-24 text-gray-500">Dateispielzeit:</span>
             <span className="text-gray-400">---</span>
          </div>
          <div className="flex items-start gap-4 mt-2">
             <span className="w-24 text-gray-500">Kommentar:</span>
             <textarea className="flex-1 bg-[#1a1d21] border border-gray-600 rounded h-16 outline-none p-2 text-xs"></textarea>
          </div>
       </div>
    </div>
  )

  const renderAudio = () => (
    <div className="flex flex-col gap-6 text-sm">
       <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Eigenschaften Audio Sample</span>
          <div className="flex items-center gap-4">
             <span className="w-32 text-gray-500">Samplerate:</span>
             <div className="flex items-center gap-2">
                <input type="text" defaultValue="48000" className="w-24 bg-[#1a1d21] border border-gray-600 rounded px-2 py-0.5 text-center" />
                <span className="text-gray-500 text-xs">Samples/s</span>
             </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
             <span className="w-32 text-gray-500">Auflösung:</span>
             <span className="text-gray-300">24 Bit (2 Kanäle)</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
             <span className="w-32 text-gray-500">Importmodul:</span>
             <span className="text-gray-300">Internal RIFF Import</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
             <span className="w-32 text-gray-500">Originaltempo:</span>
             <span className="text-gray-500 italic">---</span>
          </div>
          <div className="flex items-start gap-4 mt-1">
             <span className="w-32 text-gray-500">Quelle der Zeitinformation:</span>
             <p className="flex-1 text-[11px] text-gray-500">Das Tempo des Samples konnte nicht ermittelt werden.</p>
          </div>
       </div>

       <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 mt-2">Echtzeittempoanpassung</span>
          <div className="flex items-center gap-4">
             <span className="w-40 text-gray-500">Gesamt:</span>
             <span className="text-gray-300">0.0</span>
             <span className="text-gray-500 text-[10px]">Prozent auf</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
             <span className="w-40 text-gray-500">Arrangement:</span>
             <span className="text-gray-300">0.0</span>
             <span className="text-gray-500 text-[10px]">Prozent auf</span>
          </div>
       </div>

       <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 mt-2">Tonhöhenanpassung</span>
          <div className="flex items-center gap-4">
             <span className="w-40 text-gray-500">Gesamt:</span>
             <span className="text-gray-500 text-[10px]">Halbtöne auf Note</span>
          </div>
       </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] font-sans">
      <div className="bg-[#282b30] border border-gray-600 w-[700px] h-[550px] rounded shadow-2xl flex flex-col overflow-hidden text-omega-text">
        
        {/* Title Bar */}
        <div className="p-2 px-3 border-b border-gray-600 flex justify-between items-center bg-[#1e2124]">
          <span className="text-xs font-semibold">Objekteigenschaften</span>
          <div className="flex items-center gap-4">
             <Copy size={14} className="text-gray-500 hover:text-white cursor-pointer" />
             <HelpCircle size={14} className="text-gray-500 hover:text-white cursor-pointer" />
             <button onClick={onClose} className="ml-2 hover:text-red-400">✖</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Tab Sidebar */}
          <div className="w-40 border-r border-gray-700 bg-[#1e2124] flex flex-col py-2">
             <button 
               onClick={() => setActiveTab('Allgemein')}
               className={`flex items-center gap-3 px-4 py-4 text-sm transition-colors ${activeTab === 'Allgemein' ? 'bg-[#2b2d31] text-omega-accent border-l-4 border-omega-accent' : 'text-gray-400 hover:text-white'}`}
             >
                <FileText size={18} />
                <span>Allgemein</span>
             </button>
             <button 
               onClick={() => setActiveTab('Audio')}
               className={`flex items-center gap-3 px-4 py-4 text-sm transition-colors ${activeTab === 'Audio' ? 'bg-[#2b2d31] text-omega-accent border-l-4 border-omega-accent' : 'text-gray-400 hover:text-white'}`}
             >
                <Music size={18} />
                <span>Audio</span>
             </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#2b2d31]/50">
             {activeTab === 'Allgemein' && renderAllgemein()}
             {activeTab === 'Audio' && renderAudio()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-600 flex justify-end gap-2 bg-[#1e2124]">
           <button onClick={onClose} className="px-10 py-1 text-sm bg-[#4a4d52] hover:bg-gray-500 rounded text-white shadow">OK</button>
           <button onClick={onClose} className="px-8 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded">Abbrechen</button>
        </div>

      </div>
    </div>
  )
}
