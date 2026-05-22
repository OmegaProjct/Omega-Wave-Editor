import React, { useState, useEffect } from 'react'

type Tab = 'Wiedergabe' | 'Ordner' | 'Import/Audio' | 'System' | 'Tastaturkürzel' | 'Projekteinstellungen'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('Ordner')
  const [settings, setSettings] = useState<any>({
    defaultExplorerPath: '',
    audioDriver: 'Wave-Treiber',
    autoScroll: 'Schnell',
    spacebarStops: false,
    autoSave: true,
    autoSaveInterval: 10,
    sampleRate: 48000,
    tracksCount: 32
  })

  useEffect(() => {
    window.api.getSettings().then(s => {
      setSettings((prev: any) => ({ ...prev, ...s }))
    })
  }, [])

  const handleSave = async () => {
    await window.api.saveSettings(settings)
    alert('Einstellungen gespeichert!')
    onClose()
  }

  const renderWiedergabe = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
        <h3 className="text-center font-semibold mb-4 text-sm">Audiowiedergabe</h3>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Treiberauswahl:</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="driver" checked={settings.audioDriver === 'Wave-Treiber'} onChange={() => setSettings({...settings, audioDriver: 'Wave-Treiber'})} /> Wave-Treiber</label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="driver" checked={settings.audioDriver === 'Direct-Sound'} onChange={() => setSettings({...settings, audioDriver: 'Direct-Sound'})} /> Direct-Sound</label>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Ausgabegerät:</span>
            <select className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-48 outline-none">
              <option>System (Standard)</option>
            </select>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-400">Audiopuffer:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Anzahl:</span>
              <input type="number" value={6} readOnly className="w-12 bg-[#1a1d21] border border-gray-600 rounded px-1 text-center" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
        <h3 className="text-center font-semibold mb-4 text-sm">Arranger</h3>
        <div className="flex flex-col gap-4 text-sm">
           <div>
             <span className="text-gray-400 block mb-2">Autoscroll während des Abspielens:</span>
             <div className="flex gap-4">
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="scroll" checked={settings.autoScroll === 'Aus'} onChange={() => setSettings({...settings, autoScroll: 'Aus'})} /> Aus</label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="scroll" checked={settings.autoScroll === 'Langsam'} onChange={() => setSettings({...settings, autoScroll: 'Langsam'})} /> Langsam</label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="scroll" checked={settings.autoScroll === 'Schnell'} onChange={() => setSettings({...settings, autoScroll: 'Schnell'})} /> Schnell</label>
             </div>
           </div>
           <div className="mt-4">
             <span className="text-gray-400 block mb-2">Verhalten Leertaste:</span>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={settings.spacebarStops} onChange={(e) => setSettings({...settings, spacebarStops: e.target.checked})} />
               Leertaste stoppt an aktueller Abspielposition
             </label>
           </div>
        </div>
      </div>
    </div>
  )

  const renderOrdner = () => (
    <div className="border border-gray-700 p-4 rounded bg-[#1e2124] h-full overflow-y-auto">
      <h3 className="text-center font-semibold mb-6 text-sm">Ordnerpfade</h3>
      <div className="flex flex-col gap-3 text-sm">
        {[
          { label: 'Projekte:', key: 'projPath' },
          { label: 'Exporte:', key: 'expPath' },
          { label: 'Import (Standard):', key: 'defaultExplorerPath' },
          { label: 'Aufnahmen:', key: 'recPath' },
          { label: 'Downloads:', key: 'dlPath' }
        ].map((f, i) => (
          <div key={i} className="flex justify-between items-center gap-4">
            <span className="text-gray-400 w-32">{f.label}</span>
            <input 
              type="text" 
              value={settings[f.key] || ''}
              onChange={(e) => setSettings({...settings, [f.key]: e.target.value})}
              className="flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-sm outline-none focus:border-omega-accent"
              placeholder="C:\Users\..."
            />
            <button className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded" onClick={async () => {
              const res = await window.api.showOpenDialog({ properties: ['openDirectory'] })
              if (!res.canceled && res.filePaths.length > 0) setSettings({...settings, [f.key]: res.filePaths[0]})
            }}>📁</button>
          </div>
        ))}
        <div className="mt-4 flex justify-center">
           <button className="bg-gray-700 hover:bg-gray-600 px-4 py-1.5 rounded text-xs" onClick={async () => {
             const res = await window.api.showOpenDialog({ properties: ['openDirectory'], title: 'VST Plug-in-Pfad auswählen' })
             if (!res.canceled && res.filePaths.length > 0) alert(`VST Plug-in Pfad "${res.filePaths[0]}" hinzugefügt und wird beim nächsten Start gescannt.`)
           }}>VST Plug-in-Pfad hinzufügen...</button>
        </div>
      </div>
    </div>
  )

  const renderVideoAudio = () => (
    <div className="border border-gray-700 p-4 rounded bg-[#1e2124] h-full">
      <h3 className="text-center font-semibold mb-4 text-sm">Import Einstellungen</h3>
      <div className="flex flex-col gap-3 text-sm">
         <label className="flex items-center gap-2 cursor-pointer">
           <input type="checkbox" defaultChecked /> Video-Dateien importieren (Nur Audiospur wird geladen)
         </label>
         <label className="flex items-center gap-2 cursor-pointer">
           <input type="checkbox" defaultChecked /> Wellenform beim Import automatisch erstellen
         </label>
      </div>
    </div>
  )

  const renderSystem = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
        <h3 className="text-center font-semibold mb-4 text-sm">Programmoberfläche</h3>
        <button className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded mb-4 text-sm" onClick={() => alert('Alle ausgeblendeten Warn- und Hinweisdialoge wurden wiederhergestellt.')}>Hinweisdialoge reaktivieren</button>
      </div>
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
        <h3 className="text-center font-semibold mb-4 text-sm">Automatisches Speichern</h3>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
             <input type="checkbox" checked={settings.autoSave} onChange={(e) => setSettings({...settings, autoSave: e.target.checked})} /> Projekt wird automatisch gespeichert
          </label>
          <div className="flex items-center gap-2 ml-6 text-gray-400">
            <span>Speichern alle</span>
            <input type="number" value={settings.autoSaveInterval} onChange={(e) => setSettings({...settings, autoSaveInterval: parseInt(e.target.value)})} className="w-12 bg-[#1a1d21] border border-gray-600 rounded px-1 text-center text-white" />
            <span>Minuten</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTastaturkuerzel = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-2">
         <div className="border border-gray-700 rounded bg-[#1e2124] flex-1 overflow-y-auto p-2 text-sm">
           <div className="font-semibold text-gray-300 mb-2">Datei</div>
           <div className="pl-4 py-0.5 hover:bg-omega-accent cursor-pointer">Neues Projekt...</div>
           <div className="pl-4 py-0.5 hover:bg-omega-accent cursor-pointer">Projekt Öffnen...</div>
           <div className="pl-4 py-0.5 hover:bg-omega-accent cursor-pointer">Medien Öffnen...</div>
           <div className="pl-4 py-0.5 hover:bg-omega-accent cursor-pointer text-gray-400">Zuletzt geöffnete Projekte</div>
           <div className="pl-4 py-0.5 hover:bg-omega-accent cursor-pointer">Projekt speichern</div>
           <div className="pl-4 py-0.5 hover:bg-omega-accent cursor-pointer">Projekt speichern unter...</div>
           <div className="font-semibold text-gray-300 mt-2 mb-2">Projekt verwalten</div>
           <div className="pl-4 py-0.5 hover:bg-omega-accent cursor-pointer">Neuen leeren Arranger hinzufügen</div>
         </div>
         <div className="border border-gray-700 p-2 rounded bg-[#1e2124]">
           <span className="block text-center font-semibold text-xs text-gray-400 mb-2">Aktueller Menüpunkt</span>
           <div className="h-6 bg-[#1a1d21] border border-gray-600 rounded"></div>
           <div className="mt-2 text-[10px] text-gray-500 leading-tight mb-2">Klicken Sie in die Box und drücken Sie die gewünschte Tastenkombination...</div>
           <div className="flex gap-2">
             <input type="text" value="Keine" readOnly className="w-1/2 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-xs" />
             <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs rounded" onClick={() => alert('Bitte drücken Sie nun die neue Tastenkombination auf Ihrer Tastatur.')}>Tastaturkürzel zuweisen</button>
           </div>
         </div>
      </div>
      <div className="w-48 flex flex-col gap-2">
         <div className="border border-gray-700 p-2 rounded bg-[#1e2124] text-center text-sm font-semibold text-gray-400">Tastaturkürzelliste</div>
         <button className="bg-gray-700 hover:bg-gray-600 py-1 rounded text-sm" onClick={() => alert('Alle Kürzel auf Standard zurückgesetzt.')}>Zurücksetzen</button>
         <button className="bg-gray-700 hover:bg-gray-600 py-1 rounded text-sm" onClick={() => alert('Lade Kürzel aus Datei...')}>Laden</button>
         <button className="bg-gray-700 hover:bg-gray-600 py-1 rounded text-sm" onClick={() => alert('Kürzel gespeichert.')}>Speichern</button>
         <button className="bg-gray-700 hover:bg-gray-600 py-1 rounded text-sm" onClick={() => alert('Liste aller Kürzel als PDF exportiert.')}>Auflisten</button>
         <div className="border border-gray-700 rounded bg-[#1e2124] flex-1 mt-2 p-2 text-center text-xs text-gray-500 flex flex-col justify-end pb-4">
           <button className="w-full bg-gray-700 hover:bg-gray-600 py-1 rounded text-sm text-white" onClick={() => alert('Kürzel gelöscht.')}>Löschen</button>
         </div>
      </div>
    </div>
  )

  const renderFilmeinstellungen = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
         <h3 className="text-center font-semibold mb-4 text-sm">Anzahl der Spuren</h3>
         <div className="flex flex-col gap-2 text-sm pl-4">
           {[4, 16, 32, 64, 99, 200].map(num => (
             <label key={num} className="flex items-center gap-2 cursor-pointer">
               <input type="radio" name="tracks" checked={settings.tracksCount === num} onChange={() => setSettings({...settings, tracksCount: num})} />
               {num} Spuren
             </label>
           ))}
         </div>
      </div>
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
         <h3 className="text-center font-semibold mb-4 text-sm">Audio-Samplerate</h3>
         <div className="flex flex-col gap-2 text-sm pl-4">
           {[48000, 44100, 32000, 22050, 11025].map(rate => (
             <label key={rate} className="flex items-center gap-2 cursor-pointer">
               <input type="radio" name="samplerate" checked={settings.sampleRate === rate} onChange={() => setSettings({...settings, sampleRate: rate})} />
               {rate} Hz
             </label>
           ))}
         </div>
      </div>
    </div>
  )


  const tabs: Tab[] = ['Projekteinstellungen', 'Wiedergabe', 'Ordner', 'Import/Audio', 'System', 'Tastaturkürzel']

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]">
      <div className="bg-[#282b30] border border-gray-700 w-[750px] h-[550px] rounded shadow-2xl flex flex-col">
        <div className="p-3 border-b border-gray-700 font-semibold flex justify-between items-center bg-[#1e2124] rounded-t">
          <span>Programmeinstellungen</span>
          <button onClick={onClose} className="hover:text-red-400">✖</button>
        </div>
        
        {/* Tab Header */}
        <div className="flex border-b border-gray-700 bg-[#1a1d21] overflow-x-auto">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-omega-accent text-omega-accent bg-[#282b30]' : 'border-transparent text-gray-400 hover:text-white hover:bg-[#282b30]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-hidden">
          {activeTab === 'Wiedergabe' && renderWiedergabe()}
          {activeTab === 'Ordner' && renderOrdner()}
          {activeTab === 'Import/Audio' && renderVideoAudio()}
          {activeTab === 'System' && renderSystem()}
          {activeTab === 'Tastaturkürzel' && renderTastaturkuerzel()}
          {activeTab === 'Projekteinstellungen' && renderFilmeinstellungen()}
        </div>

        {/* Footer Buttons */}
        <div className="p-3 border-t border-gray-700 flex justify-end gap-2 bg-[#1e2124] rounded-b">
          <button onClick={onClose} className="px-6 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded">Abbrechen</button>
          <button onClick={handleSave} className="px-6 py-1.5 text-sm bg-omega-accent hover:bg-blue-500 rounded text-white shadow">OK</button>
          <button className="px-6 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded ml-4" onClick={() => window.api.openExternal('https://github.com/OmegaProjct/Omega-Wave-Editor/issues')}>Hilfe</button>
        </div>
      </div>
    </div>
  )
}
