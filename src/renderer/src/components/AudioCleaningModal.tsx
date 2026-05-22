import React, { useState } from 'react'
import { Play, Square, SkipBack, SkipForward, Info, ChevronDown } from 'lucide-react'

import { AudioEngine } from '../lib/AudioEngine'
import { SavePresetModal } from './SavePresetModal'

type Tab = 'Störgeräuschbefreiung' | 'Equalizer' | 'Kompressor' | 'Stereo FX'

export function AudioCleaningModal({ onClose, trackId }: { onClose: () => void, trackId?: string }) {
  const engine = AudioEngine.getInstance()
  const [activeTab, setActiveTab] = useState<Tab>('Störgeräuschbefreiung')
  const [showSavePreset, setShowSavePreset] = useState(false)
  
  // States for DSP
  const [eqGains, setEqGains] = useState<number[]>(new Array(10).fill(0))
  const [compressorStrength, setCompressorStrength] = useState<number>(1)
  const [stereoWidth, setStereoWidth] = useState<number>(100)
  
  const handleEqChange = (index: number, gain: number) => {
    const newGains = [...eqGains]
    newGains[index] = gain
    setEqGains(newGains)
    if (trackId) engine.setTrackEQ(trackId, index, gain)
  }

  const handleCompressorChange = (val: number) => {
    setCompressorStrength(val)
    if (trackId) {
       const ratio = 1 + (val * 19) // 1:1 to 20:1
       const threshold = -10 * val
       engine.setTrackCompressor(trackId, threshold, ratio)
    }
  }

  const handleStereoChange = (val: number) => {
    setStereoWidth(val)
    if (trackId) {
       // Simulate stereo width using pan adjustments (0 = mono, 100 = full stereo)
       // This will be handled by a dedicated StereoEnhancerNode in future versions
    }
  }

  const renderStoergeraeusch = () => (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex items-center gap-4">
        <input type="checkbox" className="w-4 h-4" />
        <span className="w-20">DeClipper:</span>
        <div className="flex-1 h-1 bg-gray-700 relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-1 h-4 bg-gray-400"></div>
        </div>
        <span className="w-12 text-right">-0.10</span>
      </div>
      <div className="flex justify-center gap-4 ml-24">
        <button className="bg-gray-700 px-4 py-1 rounded text-xs">Clip Level holen</button>
        <button className="bg-gray-700 px-4 py-1 rounded text-xs">Zurücksetzen</button>
      </div>
      
      <div className="flex items-center gap-4 mt-2">
        <input type="checkbox" className="w-4 h-4" />
        <span className="w-20">DeNoiser:</span>
        <div className="flex-1 h-1 bg-gray-700 relative">
          <div className="absolute left-1/4 -top-1.5 w-1 h-4 bg-gray-400"></div>
        </div>
        <span className="w-12 text-right">12.00</span>
      </div>
      <div className="flex items-center gap-4 ml-24">
        <span className="text-gray-400 text-xs">Störgeräusch:</span>
        <select className="flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-xs outline-none">
          <option>Allgemein: Brummen entfernen</option>
          <option>Kamera: Rauschen reduzieren</option>
          <option>Audio: Rauschen stark</option>
        </select>
      </div>
      <div className="flex justify-center gap-4 ml-24">
        <button className="bg-gray-700 px-4 py-1 rounded text-xs">Erweitert...</button>
        <button className="bg-gray-700 px-4 py-1 rounded text-xs">Zurücksetzen</button>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <input type="checkbox" className="w-4 h-4" />
        <span className="w-20">DeHisser:</span>
        <div className="flex-1 h-1 bg-gray-700 relative">
          <div className="absolute left-1/3 -top-1.5 w-1 h-4 bg-gray-400"></div>
        </div>
        <span className="w-12 text-right">6.00</span>
      </div>
    </div>
  )

  const renderEqualizer = () => (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <input type="checkbox" />
        <span>Equalizer:</span>
        <select className="ml-4 flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-xs outline-none text-gray-400">
          <option>Voreinstellung: Keine</option>
          <option>Voreinstellung: Bass Boost</option>
          <option>Voreinstellung: Voice Clarity</option>
        </select>
      </div>
      <div className="flex justify-between items-end h-32 px-4 bg-black/10 rounded border border-gray-800 py-2">
        {[60, 170, 310, 600, 800, '1K', '3K', '6K', '12K', '16K'].map((f, i) => (
          <div key={f} className="flex flex-col items-center gap-1 h-full">
            <input 
              type="range" 
              min="-20" max="20" step="0.1" 
              value={eqGains[i]} 
              onChange={(e) => handleEqChange(i, parseFloat(e.target.value))}
              className="w-1 h-24 -rotate-90 appearance-none bg-gray-700 outline-none cursor-pointer slider-vertical"
            />
            <span className="text-[9px] text-gray-500 mt-2">{f}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center px-2">
         <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" defaultChecked /> Frequenzbänder koppeln</label>
         <button className="bg-gray-700 px-4 py-1 rounded text-xs">Zurücksetzen</button>
      </div>
    </div>
  )

  const renderKompressor = () => (
    <div className="flex flex-col gap-6 text-sm py-4 px-10">
       <div className="flex items-center gap-4">
         <input type="checkbox" className="w-4 h-4" />
         <span>Kompressor:</span>
       </div>
       <div className="flex items-center gap-4 ml-10">
         <span className="w-20 text-right">Stärke:</span>
         <input 
           type="range" min="0" max="1" step="0.01" value={compressorStrength}
           onChange={(e) => handleCompressorChange(parseFloat(e.target.value))}
           className="flex-1 mx-4 accent-omega-accent"
         />
         <span className="w-12 text-right">{compressorStrength.toFixed(2)}</span>
       </div>
       <div className="flex items-center gap-4 ml-10">
         <span className="w-20 text-right">Funktion:</span>
         <select className="flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-sm outline-none">
            <option>Sprache gering komprimiert</option>
            <option>Sprache stark komprimiert</option>
            <option>Musik (Max. Lautstärke)</option>
         </select>
       </div>
       <div className="flex justify-center mt-4">
         <button className="bg-gray-700 px-6 py-1 rounded text-sm">Zurücksetzen</button>
       </div>
    </div>
  )

  const renderStereoFX = () => (
    <div className="flex flex-col gap-6 text-sm py-4 px-10">
       <div className="flex items-center gap-4">
         <input type="checkbox" className="w-4 h-4" />
         <span>StereoFX:</span>
         <select className="flex-1 ml-4 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-xs outline-none text-gray-400">
           <option>Voreinstellung: Keine</option>
           <option>Voreinstellung: Stereo Enhancer</option>
           <option>Voreinstellung: Mono Downmix</option>
         </select>
       </div>
       <div className="flex items-center gap-4 ml-10">
         <span className="w-24 text-right">Stereobreite:</span>
         <div className="flex-1 h-1 bg-gray-700 relative mx-4">
           <div className="absolute left-full -translate-x-full -top-1.5 w-1 h-4 bg-gray-400"></div>
         </div>
         <span className="w-12 text-right">100.00</span>
       </div>
       <div className="flex items-center gap-4 ml-10">
         <span className="w-24 text-right">Balance:</span>
         <div className="flex-1 h-1 bg-gray-700 relative mx-4">
           <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-1 h-4 bg-gray-400"></div>
         </div>
         <div className="flex flex-col text-[10px] text-gray-500 items-center">
            <span>0.00</span>
            <div className="flex justify-between w-full"><span>Links</span><span>Rechts</span></div>
         </div>
       </div>
       <div className="mt-4 p-2 border border-gray-700 bg-black/5 rounded text-[10px] text-gray-500 leading-tight">
          Hinweis:<br/>Einige Voreinstellungen benutzen Parameter, die nicht direkt zugänglich sind. Diese Voreinstellungen schalten die Betriebsart des Effektes um.
       </div>
       <div className="flex justify-center">
         <button className="bg-gray-700 px-6 py-1 rounded text-sm">Zurücksetzen</button>
       </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] font-sans">
      <div className="bg-[#282b30] border border-gray-600 w-[850px] h-[650px] rounded shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-2 px-3 border-b border-gray-600 flex justify-between items-center bg-[#1e2124]">
          <span className="text-sm font-semibold">Audio Cleaning</span>
          <button onClick={onClose} className="hover:text-red-400">✖</button>
        </div>

        <div className="flex flex-1 overflow-hidden p-3 gap-3">
          {/* Left Main Content */}
          <div className="flex-1 flex flex-col border border-gray-700 bg-[#2b2d31]/50 rounded">
             {/* Tabs */}
             <div className="flex border-b border-gray-700 bg-black/10">
               {['Störgeräuschbefreiung', 'Equalizer', 'Kompressor', 'Stereo FX'].map(t => (
                 <button 
                   key={t}
                   onClick={() => setActiveTab(t as Tab)}
                   className={`px-4 py-1.5 text-xs font-medium border-r border-gray-700 ${activeTab === t ? 'bg-[#282b30] text-omega-accent' : 'text-gray-400 hover:text-white'}`}
                 >
                   {t}
                 </button>
               ))}
             </div>
             {/* Tab Body */}
             <div className="flex-1 p-4 overflow-y-auto">
               {activeTab === 'Störgeräuschbefreiung' && renderStoergeraeusch()}
               {activeTab === 'Equalizer' && renderEqualizer()}
               {activeTab === 'Kompressor' && renderKompressor()}
               {activeTab === 'Stereo FX' && renderStereoFX()}
             </div>
             
             {/* Middle Buttons */}
             <div className="p-2 border-t border-gray-700 flex items-center gap-2 bg-black/5">
                <div className="flex-1 h-6 bg-[#1a1d21] border border-gray-600 rounded flex items-center px-2 text-[11px] text-gray-500">Dave Stream Be...</div>
                <button className="bg-gray-700 px-2 py-0.5 rounded text-xs disabled:opacity-30" disabled>Vom letzten Objekt übernehmen</button>
                <button className="bg-gray-700 px-2 py-0.5 rounded text-xs">Auf alle anwenden</button>
                <button className="bg-omega-accent hover:bg-blue-500 px-2 py-0.5 rounded text-xs text-white" onClick={() => setShowSavePreset(true)}>Preset speichern...</button>
             </div>
          </div>

          {/* Right Preview Side */}
          <div className="w-[300px] flex flex-col gap-3">
             <div className="flex-1 bg-black border border-gray-800 rounded flex items-center justify-center">
                <span className="text-gray-800 font-bold text-4xl">PREVIEW</span>
             </div>
             <div className="bg-[#1e2124] border border-gray-700 p-3 rounded flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 w-full justify-between">
                   <div className="w-full h-1 bg-gray-800 rounded relative">
                      <div className="absolute left-0 top-0 bottom-0 bg-gray-500 w-1/4"></div>
                   </div>
                   <span>00:00:00:00</span>
                </div>
                <div className="flex gap-1">
                   <button className="p-1 hover:bg-gray-700 rounded"><SkipBack size={14} /></button>
                   <button className="p-1 hover:bg-gray-700 rounded"><SkipForward size={14} /></button>
                   <button className="p-1 hover:bg-gray-700 rounded"><Square size={14} /></button>
                   <button className="p-1 hover:bg-gray-700 rounded text-white bg-omega-accent/20"><Play size={14} /></button>
                   <button className="p-1 hover:bg-gray-700 rounded"><SkipForward size={14} /></button>
                </div>
                <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer self-start mt-2">
                   <input type="checkbox" /> Alle Effekte vorübergehend deaktivieren
                </label>
             </div>
          </div>
        </div>

        {/* Bottom Help Area */}
        <div className="m-3 p-3 border border-gray-700 bg-[#1e2124] rounded flex flex-col overflow-y-auto max-h-[150px]">
           <span className="text-[11px] font-bold text-gray-400 mb-1">Tipps zur Nutzung des Dialogs "Audio Cleaning"</span>
           <p className="text-[10px] text-gray-500 leading-tight">
             Störgeräuschbefreiung: Auf dieser Seite sind die 3 Effekte 'DeClipper', 'DeNoiser' und 'DeHisser' verfügbar...<br/><br/>
             Equalizer: Diese Seite stellt einen Equalizer mit 10 Frequenzbändern bereit. Damit können Sie die Klangfarbe...<br/><br/>
             Kompressor: Mithilfe dieses Effekts kann die Dynamik des Audiomaterials beeinflusst werden...
           </p>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-600 flex justify-end gap-2 bg-[#1e2124]">
           <button onClick={onClose} className="px-8 py-1 text-sm bg-omega-accent hover:bg-blue-500 rounded text-white shadow">OK</button>
           <button onClick={onClose} className="px-8 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded">Abbrechen</button>
           <button className="px-8 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded ml-4">Hilfe</button>
        </div>

      </div>

      {showSavePreset && (
        <SavePresetModal 
          effects={[
            { id: 'eq', name: '10-Band Equalizer', isActive: true },
            { id: 'comp', name: 'Kompressor', isActive: true },
            { id: 'stereo', name: 'Stereo FX', isActive: true }
          ]} 
          onSave={async (selectedIds, presetName) => {
            try {
              const home = await window.api.getHomeDir();
              const path = `${home}\\preset_${presetName}.owepreset`;
              await window.api.savePreset(path, { name: presetName, effects: selectedIds });
              setShowSavePreset(false)
              window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'success', title: 'Preset gespeichert', message: `Das Preset "${presetName}" wurde erfolgreich unter ${path} gespeichert.` } }))
            } catch (e) {
              console.error(e)
            }
          }} 
          onClose={() => setShowSavePreset(false)} 
        />
      )}
    </div>
  )
}
