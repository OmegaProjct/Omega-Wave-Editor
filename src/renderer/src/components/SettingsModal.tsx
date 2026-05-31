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
import { MidiEngine } from '../lib/MidiEngine'

type Tab = 'Wiedergabe' | 'Ordner' | 'Import/Audio' | 'System' | 'Tastaturkürzel' | 'Projekteinstellungen' | 'MIDI'

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
    midiMappings: [],
    midiInputDeviceId: '',
    midiChannel: 0,
    driverType: 'wave',
    bufferCount: 6,
    vstPaths: [],
    keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS
  })
  const [capturingShortcut, setCapturingShortcut] = useState<ShortcutAction | null>(null)

  const [midiDevices, setMidiDevices] = useState<{ id: string; name: string }[]>([])
  const [learningAction, setLearningAction] = useState<{ action: string; trackIndex?: number } | null>(null)

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
  const [asioDrivers, setAsioDrivers] = useState<{ name: string; description: string }[]>([])

  useEffect(() => {
    window.api.getSettings().then(s => {
      setSettings((prev: any) => {
        const merged = {
          ...prev,
          ...s,
          keyboardShortcuts: normalizeKeyboardShortcuts(s?.keyboardShortcuts)
        }
        if (merged.activeDeviceId && merged.activeDeviceId !== 'default' && merged.driverType !== 'asio') {
          AudioEngine.getInstance().setOutputDevice(merged.activeDeviceId)
        }
        return merged
      })
    })
    window.api.getAppVersion().then((v: string) => {
      setCurrentVersion(v)
    }).catch((e: any) => console.error('Fehler beim Abrufen der App-Version:', e))

    navigator.mediaDevices.enumerateDevices().then(devs => {
      const outputs = devs.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default')
      setDevices(outputs)
    }).catch(err => {
      console.error('Error enumerating audio output devices:', err)
    })

    window.api.getAsioDrivers().then((drivers: any[]) => {
      setAsioDrivers(drivers)
    }).catch((err: any) => {
      console.error('Error fetching ASIO drivers:', err)
    })
  }, [])

  useEffect(() => {
    const updateMidiDevices = () => {
      setMidiDevices(MidiEngine.getInputs())
    }

    updateMidiDevices()
    window.addEventListener('MIDI_DEVICES_CHANGED', updateMidiDevices)
    return () => {
      window.removeEventListener('MIDI_DEVICES_CHANGED', updateMidiDevices)
      MidiEngine.stopLearnMode()
    }
  }, [])

  const handleSave = async () => {
    const settingsToSave = {
      ...settings,
      keyboardShortcuts: normalizeKeyboardShortcuts(settings.keyboardShortcuts)
    }
    await window.api.saveSettings(settingsToSave)
    AudioEngine.getInstance().setAudioDriver(settingsToSave.driverType || 'wave', settingsToSave.bufferCount || 6)
    
    // Write trigger to localStorage so the main window can synchronize instantly
    localStorage.setItem('settings_updated_trigger', JSON.stringify({ 
      timestamp: Date.now(), 
      settings: settingsToSave 
    }))

    window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: settingsToSave }))
    onClose()
  }

  const renderWiedergabe = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
        <h3 className="text-center font-semibold mb-4 text-sm">Audioausgabe</h3>
        <div className="flex flex-col gap-4 text-sm">
          {/* Treiberauswahl */}
          <div className="flex justify-between items-start gap-4">
            <span className="text-gray-400">Treiberauswahl:</span>
            <div className="flex flex-col gap-2 w-48">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                <input 
                  type="radio" 
                  name="driverType" 
                  value="wave" 
                  checked={settings.driverType === 'wave' || !settings.driverType} 
                  onChange={() => setSettings({ ...settings, driverType: 'wave', activeDeviceId: 'default' })} 
                  className="text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 w-3.5 h-3.5"
                />
                Wave-Treiber
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                <input 
                  type="radio" 
                  name="driverType" 
                  value="directsound" 
                  checked={settings.driverType === 'directsound'} 
                  onChange={() => setSettings({ ...settings, driverType: 'directsound', activeDeviceId: 'default' })} 
                  className="text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 w-3.5 h-3.5"
                />
                Direct-Sound
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                <input 
                  type="radio" 
                  name="driverType" 
                  value="asio" 
                  checked={settings.driverType === 'asio'} 
                  onChange={() => {
                    const firstAsio = asioDrivers[0]?.name || '';
                    setSettings({ ...settings, driverType: 'asio', asioDriver: firstAsio })
                  }} 
                  className="text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 w-3.5 h-3.5"
                />
                ASIO-Treiber
              </label>
            </div>
          </div>

          {settings.driverType === 'asio' && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">ASIO-Treiber:</span>
              <select 
                value={settings.asioDriver || (asioDrivers[0]?.name || 'default')} 
                onChange={(e) => {
                  const driverName = e.target.value
                  setSettings({ ...settings, asioDriver: driverName })
                }}
                className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-48 outline-none text-xs text-white"
              >
                {asioDrivers.map(drv => (
                  <option key={drv.name} value={drv.name}>
                    {drv.description}
                  </option>
                ))}
                {asioDrivers.length === 0 && (
                  <option value="default">Kein ASIO Treiber gefunden</option>
                )}
              </select>
            </div>
          )}

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
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-400">Audiopuffer:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Anzahl:</span>
              <input 
                type="number" 
                min={2}
                max={64}
                value={settings.bufferCount !== undefined ? settings.bufferCount : 6} 
                onChange={(e) => setSettings({ ...settings, bufferCount: parseInt(e.target.value) || 6 })}
                className="w-12 bg-[#1a1d21] border border-gray-600 rounded px-1.5 py-0.5 text-center text-xs text-white outline-none focus:border-omega-accent" 
              />
            </div>
          </div>

          {settings.driverType === 'asio' && asioDrivers.length === 0 && (
            <div className="mt-3 p-3 bg-red-950/20 border border-red-900/30 rounded text-red-450 text-[11px] leading-relaxed">
              ⚠️ <strong className="text-red-400">Kein ASIO-Treiber vorhanden!</strong><br />
              Es wurden keine ASIO-Treiber auf diesem System registriert.<br />
              Bitte installiere einen passenden ASIO-Treiber (z. B. <strong>ASIO4ALL</strong> oder den offiziellen ASIO-Treiber deines Audio-Interfaces wie <strong>Steinberg/Yamaha ASIO</strong>), um diesen Modus zu nutzen.
            </div>
          )}
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
        
        {/* Zusätzliche VST Pfade */}
        <div className="mt-4 border-t border-gray-700/60 pt-4">
          <span className="text-gray-400 block mb-2 font-bold uppercase text-[10px] tracking-wider">Zusätzliche VST2- & VST3-Suchpfade:</span>
          {(!settings.vstPaths || settings.vstPaths.length === 0) ? (
            <div className="text-xs text-gray-500 italic mb-3">Keine zusätzlichen Pfade konfiguriert (es werden nur die System-Standardpfade gescannt).</div>
          ) : (
            <div className="flex flex-col gap-2 mb-3 bg-[#1a1d21] p-2.5 rounded border border-gray-800">
              {(settings.vstPaths || []).map((path: string, idx: number) => (
                <div key={idx} className="flex justify-between items-center gap-2 text-xs">
                  <span className="text-gray-300 font-mono break-all">{path}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      const updated = settings.vstPaths.filter((_: any, i: number) => i !== idx)
                      setSettings({ ...settings, vstPaths: updated })
                    }}
                    className="text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-[10px] transition-colors"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center">
            <button 
              type="button"
              className="bg-omega-accent hover:bg-blue-500 px-4 py-1.5 rounded text-xs text-white font-semibold flex items-center gap-1.5 transition-colors shadow" 
              onClick={async () => {
                const res = await window.api.showOpenDialog({ properties: ['openDirectory'], title: 'VST Plug-in-Pfad auswählen' })
                if (!res.canceled && res.filePaths.length > 0) {
                  const pathToAdd = res.filePaths[0]
                  const currentPaths = settings.vstPaths || []
                  if (!currentPaths.includes(pathToAdd)) {
                    const updated = [...currentPaths, pathToAdd]
                    setSettings({ ...settings, vstPaths: updated })
                  } else {
                    alert('Dieser Pfad wurde bereits hinzugefügt.')
                  }
                }
              }}
            >
              <span>+ VST Plug-in-Pfad hinzufügen...</span>
            </button>
          </div>
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

  const handleReactivateWarnings = () => {
    setSettings((prev: any) => ({
      ...prev,
      showStartScreen: true,
      showExportGapWarning: true
    }))
    window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', {
      detail: {
        type: 'info',
        title: 'Erfolg',
        message: 'Alle ausgeblendeten Warn- und Hinweisdialoge wurden wiederhergestellt.'
      }
    }))
  }

  const renderSystem = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4">
        <div className="border border-gray-700 p-4 rounded bg-[#1e2124]">
          <h3 className="text-center font-semibold mb-3 text-sm">Programmoberfläche</h3>
          <button 
            className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors text-white" 
            onClick={handleReactivateWarnings}
          >
            Hinweisdialoge reaktivieren
          </button>
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

  const renderMidi = () => {
    const CONFIGURABLE_ACTIONS: { action: string; label: string; trackIndex?: number }[] = [
      { action: 'transport_play', label: 'Transport: Wiedergabe' },
      { action: 'transport_stop', label: 'Transport: Stopp' },
      { action: 'transport_record', label: 'Transport: Aufnahme' },
      { action: 'master_volume', label: 'Mixer: Master Lautstärke' },
      ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap(idx => [
        { action: 'track_volume', trackIndex: idx, label: `Mixer: Spur ${idx + 1} Lautstärke` },
        { action: 'track_mute', trackIndex: idx, label: `Mixer: Spur ${idx + 1} Mute` },
        { action: 'track_solo', trackIndex: idx, label: `Mixer: Spur ${idx + 1} Solo` },
      ])
    ];

    const getMappingForAction = (action: string, trackIndex?: number) => {
      return (settings.midiMappings || []).find(
        (m: any) => m.action === action && m.trackIndex === trackIndex
      );
    };

    const startLearn = (action: string, trackIndex?: number) => {
      setLearningAction({ action, trackIndex });
      MidiEngine.startLearnMode((event) => {
        const currentMappings = [...(settings.midiMappings || [])];
        const existingIdx = currentMappings.findIndex(
          (m: any) => m.action === action && m.trackIndex === trackIndex
        );

        const newMapping = {
          action,
          trackIndex,
          type: event.type,
          number: event.number
        };

        if (existingIdx >= 0) {
          currentMappings[existingIdx] = newMapping;
        } else {
          currentMappings.push(newMapping);
        }

        setSettings((prev: any) => ({
          ...prev,
          midiMappings: currentMappings
        }));
        setLearningAction(null);
      });
    };

    const stopLearn = () => {
      MidiEngine.stopLearnMode();
      setLearningAction(null);
    };

    const clearMapping = (action: string, trackIndex?: number) => {
      const currentMappings = (settings.midiMappings || []).filter(
        (m: any) => !(m.action === action && m.trackIndex === trackIndex)
      );
      setSettings((prev: any) => ({
        ...prev,
        midiMappings: currentMappings
      }));
    };

    return (
      <div className="border border-gray-700 p-4 rounded bg-[#1e2124] h-full flex flex-col overflow-hidden">
        {/* Device & Channel Selector */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">MIDI-Eingangsgerät</label>
            <select
              value={settings.midiInputDeviceId || ''}
              onChange={(e) => setSettings({ ...settings, midiInputDeviceId: e.target.value })}
              className="w-full bg-[#1a1d21] border border-gray-750 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-omega-accent"
            >
              <option value="">Kein Gerät ausgewählt</option>
              {midiDevices.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-400 mb-1">MIDI-Kanal</label>
            <select
              value={settings.midiChannel}
              onChange={(e) => setSettings({ ...settings, midiChannel: parseInt(e.target.value) })}
              className="w-full bg-[#1a1d21] border border-gray-750 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-omega-accent"
            >
              <option value={0}>Omni (Alle)</option>
              {[...Array(16)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Kanal {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mappings Table */}
        <h3 className="font-semibold text-xs text-gray-300 mb-2">MIDI-Aktionszuweisungen</h3>
        <div className="flex-1 overflow-y-auto border border-gray-750 rounded bg-[#1a1d21]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#202225] text-gray-400 border-b border-gray-750">
                <th className="p-2 font-medium">Aktion</th>
                <th className="p-2 font-medium">Zuweisung</th>
                <th className="p-2 font-medium text-right">Optionen</th>
              </tr>
            </thead>
            <tbody>
              {CONFIGURABLE_ACTIONS.map(cfg => {
                const mapping = getMappingForAction(cfg.action, cfg.trackIndex);
                const isLearning = learningAction?.action === cfg.action && learningAction?.trackIndex === cfg.trackIndex;
                
                let assignmentText = 'Nicht zugewiesen';
                if (mapping) {
                  const typeLabel = mapping.type === 'cc' ? 'Control Change' : (mapping.type === 'note' ? 'Note' : mapping.type.toUpperCase());
                  assignmentText = `${typeLabel} #${mapping.number}`;
                }

                return (
                  <tr key={`${cfg.action}-${cfg.trackIndex ?? 'none'}`} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="p-2 text-gray-300 font-medium">{cfg.label}</td>
                    <td className="p-2 text-gray-400">
                      {isLearning ? (
                        <span className="text-omega-accent animate-pulse font-semibold">Lerne... (Bewege Regler / Drücke Taste)</span>
                      ) : (
                        <span className={mapping ? 'text-green-400 font-medium' : ''}>{assignmentText}</span>
                      )}
                    </td>
                    <td className="p-2 text-right space-x-1.5">
                      {isLearning ? (
                        <button
                          onClick={stopLearn}
                          className="px-2.5 py-1 text-[11px] bg-red-600 hover:bg-red-500 rounded text-white font-medium shadow-sm transition-colors"
                        >
                          Abbrechen
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => startLearn(cfg.action, cfg.trackIndex)}
                            className="px-2.5 py-1 text-[11px] bg-omega-accent hover:bg-blue-500 rounded text-white font-medium shadow-sm transition-colors"
                          >
                            Lernen
                          </button>
                          {mapping && (
                            <button
                              onClick={() => clearMapping(cfg.action, cfg.trackIndex)}
                              className="px-2.5 py-1 text-[11px] bg-gray-750 hover:bg-gray-700 rounded text-gray-400 font-medium shadow-sm transition-colors"
                            >
                              Löschen
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };


  const tabs: Tab[] = ['Projekteinstellungen', 'Wiedergabe', 'Ordner', 'Import/Audio', 'System', 'Tastaturkürzel', 'MIDI']

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-6" data-settings-modal="true">
      <div className="bg-[#282b30] border border-gray-700 w-[750px] max-h-full rounded shadow-2xl flex flex-col">
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
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'Wiedergabe' && renderWiedergabe()}
          {activeTab === 'Ordner' && renderOrdner()}
          {activeTab === 'Import/Audio' && renderVideoAudio()}
          {activeTab === 'System' && renderSystem()}
          {activeTab === 'Tastaturkürzel' && renderTastaturkuerzel()}
          {activeTab === 'Projekteinstellungen' && renderFilmeinstellungen()}
          {activeTab === 'MIDI' && renderMidi()}
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
