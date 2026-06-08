import React, { useState, useEffect } from 'react'
import { FileText, Music, Copy, HelpCircle } from 'lucide-react'

type Tab = 'Allgemein' | 'Audio'

const REGION_COLORS = [
  { label: 'Standard', value: 'bg-omega-accent' },
  { label: 'Türkis', value: 'bg-cyan-500' },
  { label: 'Blaugrün', value: 'bg-teal-600' },
  { label: 'Grün', value: 'bg-green-600' },
  { label: 'Hellgrün', value: 'bg-lime-500' },
  { label: 'Orange', value: 'bg-orange-500' },
  { label: 'Braun', value: 'bg-amber-800' },
  { label: 'Rot', value: 'bg-red-600' },
  { label: 'Pink', value: 'bg-pink-500' },
  { label: 'Lila', value: 'bg-purple-500' },
  { label: 'Violett', value: 'bg-violet-600' },
  { label: 'Dunkelblau', value: 'bg-blue-900' },
]

export function ObjectPropertiesModal({ 
  onClose, 
  region,
  onSave
}: { 
  onClose: () => void; 
  region: any;
  onSave?: (updatedFields: { name: string; color: string; comment: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('Allgemein')
  
  // Formular-Zustände
  const [name, setName] = useState(region?.name || region?.file?.name || 'Unbenannt')
  const [selectedColor, setSelectedColor] = useState(region?.color || 'bg-omega-accent')
  const [comment, setComment] = useState(region?.comment || '')
  
  // UI-Zustände
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const [mediaInfo, setMediaInfo] = useState<any>(null)

  // Metadaten der Datei beim Laden abrufen
  useEffect(() => {
    if (region?.file?.path) {
      window.api.getMediaInfo(region.file.path).then((info: any) => {
        setMediaInfo(info)
      }).catch((err: any) => {
        console.error('Fehler beim Abrufen der Datei-Metadaten:', err)
      })
    }
  }, [region?.file?.path])

  // Formatiert Sekunden in 00h 00min 00s
  const formatPlaytime = (duration: number) => {
    if (duration === undefined || duration === null || isNaN(duration)) return '00h 00min 00s'
    const h = Math.floor(duration / 3600)
    const m = Math.floor((duration % 3600) / 60)
    const s = Math.floor(duration % 60)
    
    const hStr = h.toString().padStart(2, '0')
    const mStr = m.toString().padStart(2, '0')
    const sStr = s.toString().padStart(2, '0')
    
    return `${hStr}h ${mStr}min ${sStr}s`
  }

  // Formatiert Bytes in lesbare Einheiten (B, KB, MB)
  const formatSize = (bytes: number) => {
    if (!bytes) return '---'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSave = () => {
    if (onSave) {
      onSave({
        name,
        color: selectedColor,
        comment
      })
    }
    onClose()
  }

  // Aktuelles Farbobjekt ermitteln
  const colorObj = REGION_COLORS.find(c => c.value === selectedColor) || REGION_COLORS[0]

  const renderAllgemein = () => (
    <div className="flex flex-col gap-6 text-sm">
       <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Objekt</span>
          <div className="flex items-center gap-4">
             <span className="w-24 text-gray-500">Name:</span>
             <input 
               type="text" 
               value={name} 
               onChange={(e) => setName(e.target.value)}
               className="flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 outline-none text-omega-text focus:border-omega-accent" 
             />
          </div>
          <div className="flex items-center gap-4 mt-2 relative">
             <span className="w-24 text-gray-500">Objektfarbe:</span>
             <div className="relative flex-1">
               <button 
                 type="button"
                 onClick={() => setShowColorDropdown(!showColorDropdown)}
                 className="flex items-center gap-2 bg-[#1a1d21] border border-gray-600 rounded px-3 py-1 text-sm text-gray-300 hover:border-omega-accent transition-colors w-48 text-left outline-none"
               >
                 <span className={`w-3.5 h-3.5 rounded-full ${colorObj.value} shadow-sm border border-black/20`} />
                 <span className="flex-1 truncate">{colorObj.label}</span>
                 <span className="text-[10px] text-gray-500">▼</span>
               </button>
               
               {showColorDropdown && (
                 <div className="absolute left-0 mt-1 w-48 bg-[#1e2124] border border-gray-600 rounded shadow-xl z-[210] max-h-60 overflow-y-auto">
                   {REGION_COLORS.map((c) => (
                     <button
                       key={c.value}
                       type="button"
                       onClick={() => {
                         setSelectedColor(c.value)
                         setShowColorDropdown(false)
                       }}
                       className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-omega-accent/20 hover:text-white transition-colors ${selectedColor === c.value ? 'bg-omega-accent/10 text-omega-accent font-semibold' : 'text-gray-300'}`}
                     >
                       <span className={`w-3 h-3 rounded-full ${c.value} border border-black/20`} />
                       <span>{c.label}</span>
                     </button>
                   ))}
                 </div>
               )}
             </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
             <span className="w-24 text-gray-500">Spielzeit:</span>
             <span className="text-gray-300">{formatPlaytime(region?.duration || 0)}</span>
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
             <span className="flex-1 truncate text-[11px] text-gray-400" title={region?.file?.path}>{region?.file?.path || 'C:\\...'}</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
             <span className="w-24 text-gray-500">Dateigröße:</span>
             <span className="text-omega-text">{formatSize(mediaInfo?.size)}</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
             <span className="w-24 text-gray-500">Dateispielzeit:</span>
             <span className="text-omega-text">{formatPlaytime(mediaInfo?.duration || region?.fileDuration || 0)}</span>
          </div>
          <div className="flex items-start gap-4 mt-2">
             <span className="w-24 text-gray-500">Kommentar:</span>
             <textarea 
               value={comment}
               onChange={(e) => setComment(e.target.value)}
               className="flex-1 bg-[#1a1d21] border border-gray-600 rounded h-16 outline-none p-2 text-xs text-omega-text focus:border-omega-accent"
             />
          </div>
       </div>
    </div>
  )

  const renderAudio = () => {
    const bitDepthStr = mediaInfo?.bitDepth ? `${mediaInfo.bitDepth} Bit` : (mediaInfo?.codec === 'mp3' ? '16 Bit (simuliert)' : '16 Bit')
    const channelsStr = mediaInfo?.channels ? (mediaInfo.channels === 1 ? 'Mono' : 'Stereo') : 'Stereo'
    const formatChannels = mediaInfo?.channels ? `${mediaInfo.channels} Kanäle` : '2 Kanäle'
    const resolutionStr = `${bitDepthStr} (${formatChannels}, ${channelsStr})`

    const formatLabel = mediaInfo?.formatName 
      ? (mediaInfo.formatName.includes(';') ? mediaInfo.formatName.split(';')[0] : mediaInfo.formatName)
      : (mediaInfo?.codec ? mediaInfo.codec.toUpperCase() : 'Internal RIFF Import')

    const bpmVal = mediaInfo?.tags?.bpm || ''
    const originStr = bpmVal 
      ? 'BPM-Tag in den Datei-Metadaten gefunden.'
      : 'Das Tempo des Samples konnte nicht ermittelt werden.'

    return (
      <div className="flex flex-col gap-6 text-sm">
         <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Eigenschaften Audio Sample</span>
            <div className="flex items-center gap-4">
               <span className="w-32 text-gray-500">Samplerate:</span>
               <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={mediaInfo?.sampleRate || '48000'} 
                    readOnly
                    className="w-24 bg-[#1a1d21]/50 border border-gray-700 rounded px-2 py-0.5 text-center text-gray-400 outline-none select-none" 
                  />
                  <span className="text-gray-500 text-xs">Samples/s</span>
               </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
               <span className="w-32 text-gray-500">Auflösung:</span>
               <span className="text-gray-300">{resolutionStr}</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
               <span className="w-32 text-gray-500">Importmodul:</span>
               <span className="text-gray-300">{formatLabel}</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
               <span className="w-32 text-gray-500">Originaltempo:</span>
               <span className={bpmVal ? 'text-emerald-400 font-semibold' : 'text-gray-500 italic'}>{bpmVal ? `${bpmVal} BPM` : '---'}</span>
            </div>
            <div className="flex items-start gap-4 mt-2">
               <span className="w-32 text-gray-500">Quelle der Zeitinformation:</span>
               <p className="flex-1 text-[11px] text-gray-500">{originStr}</p>
            </div>
         </div>

         <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 mt-2">Echtzeittempoanpassung</span>
            <div className="flex items-center gap-4">
               <span className="w-40 text-gray-500">Gesamt:</span>
               <span className="text-omega-text">0.0</span>
               <span className="text-gray-500 text-[10px]">Prozent auf</span>
            </div>
            <div className="flex items-center gap-4 mt-1">
               <span className="w-40 text-gray-500">Arrangement:</span>
               <span className="text-omega-text">0.0</span>
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
  }

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
           <button onClick={handleSave} className="px-10 py-1 text-sm bg-omega-accent hover:bg-omega-accent/80 rounded text-black font-semibold shadow">OK</button>
           <button onClick={onClose} className="px-8 py-1 text-sm bg-gray-600 hover:bg-omega-accent/10 border border-gray-500/30 rounded text-white transition-colors">Abbrechen</button>
        </div>

      </div>
    </div>
  )
}
