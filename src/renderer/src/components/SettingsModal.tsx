import React, { useState, useEffect } from 'react'
import { AudioEngine } from '../lib/AudioEngine'
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  SHORTCUT_DEFINITIONS,
  ShortcutAction,
  eventToShortcut,
  formatShortcut,
  normalizeKeyboardShortcuts
} from '../lib/keyboardShortcuts'

type Tab = 'Wiedergabe' | 'Ordner' | 'Import/Audio' | 'System' | 'Tastaturkürzel' | 'Projekteinstellungen'

export function SettingsModal({ onClose, initialTab = 'Projekteinstellungen', onTriggerUpdate }: { onClose: () => void; initialTab?: Tab; onTriggerUpdate?: (info: any) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [settings, setSettings] = useState<any>({
    defaultExplorerPath: '',
    autoScroll: 'Schnell',
    spacebarStops: false,
    autoSave: true,
    autoSaveInterval: 10,
    sampleRate: 48000,
    tracksCount: 32,
    maxUndoSteps: 50,
    halfWaveform: false,
    keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS
  })
  const [capturingShortcut, setCapturingShortcut] = useState<ShortcutAction | null>(null)

  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [updateInfo, setUpdateInfo] = useState<any | null>(null)
  const [currentVersion, setCurrentVersion] = useState<string>('0.1.0')

  const handleCheckForUpdates = async () => {
    setCheckingUpdates(true)
    setUpdateStatus('Prüfe auf Updates...')
    setUpdateInfo(null)
    try {
      const result = await window.api.checkForUpdates()
      if (result.error) {
        setUpdateStatus(`Fehler: ${result.error}`)
      } else if (result.available) {
        setUpdateStatus(`Update verfügbar: v${result.latestVersion}`)
        setUpdateInfo(result)
      } else {
        setUpdateStatus(`App ist auf dem neuesten Stand (v${result.currentVersion}).`)
      }
    } catch (e: any) {
      setUpdateStatus(`Fehler beim Update-Check: ${e.message}`)
    } finally {
      setCheckingUpdates(false)
    }
  }

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    window.api.getSettings().then(s => {
      setSettings((prev: any) => {
        const merged = {
          ...prev,
          ...s,
          keyboardShortcuts: normalizeKeyboardShortcuts(s?.keyboardShortcuts)
        }
        if (merged.activeDeviceId && merged.activeDeviceId !== 'default') {
          AudioEngine.getInstance().setOutputDevice(merged.activeDeviceId)
        }
        return merged
      })
    })
    window.api.getAppVersion().then((v: string) => {
      setCurrentVersion(v)
    }).catch((e: any) => console.error('Fehler beim Abrufen der App-Version:', e))

    navigator.mediaDevices.enumerateDevices().then(devs => {
      const outputs = devs.filter(d => d.kind === 'audiooutput')
      setDevices(outputs)
    }).catch(err => {
      console.error('Error enumerating audio output devices:', err)
    })
  }, [])

  const handleSave = async () => {
    const settingsToSave = {
      ...settings,
      keyboardShortcuts: normalizeKeyboardShortcuts(settings.keyboardShortcuts)
    }
    await window.api.saveSettings(settingsToSave)
    window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: settingsToSave }))
    onClose()
  }

  const renderWiedergabe = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
        <h3 className="text-center font-semibold mb-4 text-sm">Audioausgabe</h3>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Ausgabegerät:</span>
            <select 
              value={settings.activeDeviceId || 'default'} 
              onChange={async (e) => {
                const deviceId = e.target.value
                setSettings({ ...settings, activeDeviceId: deviceId })
                await AudioEngine.getInstance().setOutputDevice(deviceId)
              }}
              className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-48 outline-none text-xs text-white"
            >
              <option value="default">System (Standard)</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Ausgabegerät (${d.deviceId.slice(0, 8)})`}
                </option>
              ))}
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
         <label className="flex items-center gap-2 cursor-pointer">
           <input 
             type="checkbox" 
             checked={!!settings.halfWaveform} 
             onChange={(e) => setSettings({ ...settings, halfWaveform: e.target.checked })} 
           /> 
           Halbe Wellenformdarstellung
         </label>
      </div>
    </div>
  )

  const renderSystem = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4">
        <div className="border border-gray-700 p-4 rounded bg-[#1e2124]">
          <h3 className="text-center font-semibold mb-3 text-sm">Programmoberfläche</h3>
          <button className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors text-white" onClick={() => alert('Alle ausgeblendeten Warn- und Hinweisdialoge wurden wiederhergestellt.')}>Hinweisdialoge reaktivieren</button>
        </div>
        
        <div className="border border-gray-700 p-4 rounded bg-[#1e2124] flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-center font-semibold mb-3 text-sm">Software-Updates</h3>
            <div className="flex flex-col gap-2.5 items-center text-xs mt-1">
              <div className="text-gray-400">
                Aktuelle Version: <span className="text-white font-mono bg-[#1a1d21] px-2 py-0.5 rounded border border-gray-700 ml-1">v{currentVersion}</span>
              </div>
              
              <button 
                onClick={handleCheckForUpdates}
                disabled={checkingUpdates}
                className={`w-full py-2 rounded text-xs font-semibold shadow transition-all duration-200 text-white ${
                  checkingUpdates 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-omega-accent hover:bg-blue-500 active:scale-[0.98]'
                }`}
              >
                {checkingUpdates ? 'Suche läuft...' : 'Auf Updates prüfen'}
              </button>
            </div>
          </div>

          {updateStatus && (
            <div className="mt-3 p-2 bg-[#1a1d21] border border-gray-700 rounded text-center">
              <div className={`text-xs font-semibold ${updateInfo ? 'text-green-400' : 'text-gray-300'}`}>
                {updateStatus}
              </div>
              {updateInfo && (
                <button 
                  onClick={() => {
                    if (onTriggerUpdate) {
                      onTriggerUpdate(updateInfo)
                    } else {
                      window.api.openExternal(updateInfo.url)
                    }
                  }}
                  className="mt-2 w-full py-1 bg-green-600 hover:bg-green-500 text-white font-semibold text-[11px] rounded shadow animate-bounce transition-colors"
                >
                  Jetzt herunterladen
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124] h-full flex flex-col justify-between">
        <div>
          <h3 className="text-center font-semibold mb-4 text-sm">Automatisches Speichern</h3>
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={settings.autoSave} onChange={(e) => setSettings({...settings, autoSave: e.target.checked})} /> Projekt wird automatisch gespeichert
            </label>
            <div className="flex items-center gap-2 ml-6 text-gray-400">
              <span>Speichern alle</span>
              <input type="number" value={settings.autoSaveInterval} onChange={(e) => setSettings({...settings, autoSaveInterval: parseInt(e.target.value) || 10})} className="w-12 bg-[#1a1d21] border border-gray-600 rounded px-1 text-center text-white outline-none" />
              <span>Minuten</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-750 pt-4 mt-2">
          <h3 className="text-center font-semibold mb-3 text-sm">Undo-Verlauf</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Maximale Undo-Schritte:</span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min={5} 
                max={500} 
                value={settings.maxUndoSteps || 50} 
                onChange={(e) => setSettings({...settings, maxUndoSteps: parseInt(e.target.value) || 50})} 
                className="w-16 bg-[#1a1d21] border border-gray-600 rounded px-2 py-0.5 text-center text-white outline-none focus:border-omega-accent" 
              />
              <span className="text-xs text-gray-500">Schritte</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTastaturkuerzel = () => {
    const keyboardShortcuts = normalizeKeyboardShortcuts(settings.keyboardShortcuts)
    const groupedShortcuts = SHORTCUT_DEFINITIONS.reduce<Record<string, typeof SHORTCUT_DEFINITIONS>>((groups, item) => {
      groups[item.group] = groups[item.group] || []
      groups[item.group].push(item)
      return groups
    }, {})

    const setShortcut = (id: ShortcutAction, shortcut: string) => {
      setSettings({
        ...settings,
        keyboardShortcuts: {
          ...keyboardShortcuts,
          [id]: shortcut
        }
      })
    }

    const handleShortcutKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: ShortcutAction) => {
      if (capturingShortcut !== id) return
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setCapturingShortcut(null)
        return
      }

      const shortcut = eventToShortcut(event.nativeEvent)
      if (!shortcut) return

      setShortcut(id, shortcut)
      setCapturingShortcut(null)
    }

    return (
      <div className="border border-gray-700 p-4 rounded bg-[#1e2124] h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="font-semibold text-sm text-gray-300">Tastaturkürzel</h3>
          <button
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setSettings({ ...settings, keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS })}
          >
            Standard wiederherstellen
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {Object.entries(groupedShortcuts).map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">{group}</div>
              <div className="divide-y divide-gray-800 border border-gray-800 rounded overflow-hidden">
                {items.map(item => (
                  <div key={item.id} className="grid grid-cols-[1fr_190px_70px] items-center gap-2 px-3 py-2 bg-[#1a1d21]">
                    <span className="text-xs text-gray-300 truncate">{item.label}</span>
                    <button
                      className={`h-8 px-2 rounded border text-xs font-mono transition-colors ${
                        capturingShortcut === item.id
                          ? 'border-omega-accent bg-omega-accent/15 text-white'
                          : 'border-gray-700 bg-[#101215] text-omega-accent hover:border-gray-500'
                      }`}
                      onClick={() => setCapturingShortcut(item.id)}
                      onKeyDown={(event) => handleShortcutKeyDown(event, item.id)}
                    >
                      {capturingShortcut === item.id ? 'Taste drücken...' : formatShortcut(keyboardShortcuts[item.id])}
                    </button>
                    <button
                      className="h-8 px-2 rounded bg-gray-700 hover:bg-gray-600 text-[11px] text-gray-200"
                      onClick={() => setShortcut(item.id, DEFAULT_KEYBOARD_SHORTCUTS[item.id])}
                    >
                      Reset
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]" data-settings-modal="true">
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
