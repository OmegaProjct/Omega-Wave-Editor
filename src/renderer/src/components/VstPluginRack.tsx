import React, { useState, useEffect } from 'react'
import { RotateCcw, Power, Trash2, Sliders, Play, Plus, Check, HelpCircle } from 'lucide-react'
import { MidiEngine } from '../lib/MidiEngine'

export interface VstParameter {
  name: string
  min: number
  max: number
  step: number
  value: number
  defaultValue: number
  unit: string
}

export interface LoadedVst {
  id: string
  name: string
  manufacturer: string
  format: string
  category: string
  path: string
  active: boolean
  parameters: VstParameter[]
}

// Hilfsfunktion zur Generierung von Parametern für ein VST
const getInitialParams = (category: string): VstParameter[] => {
  const isInstrument = category.toLowerCase().includes('instrument')
  if (isInstrument) {
    return [
      { name: 'Cutoff', min: 20, max: 20000, step: 1, value: 1200, defaultValue: 1200, unit: 'Hz' },
      { name: 'Resonance', min: 0, max: 100, step: 0.1, value: 15, defaultValue: 15, unit: '%' },
      { name: 'Attack', min: 0, max: 5000, step: 1, value: 10, defaultValue: 10, unit: 'ms' },
      { name: 'Decay', min: 1, max: 5000, step: 1, value: 350, defaultValue: 350, unit: 'ms' },
      { name: 'Sustain', min: 0, max: 100, step: 0.1, value: 80, defaultValue: 80, unit: '%' },
      { name: 'Release', min: 0, max: 10000, step: 1, value: 450, defaultValue: 450, unit: 'ms' },
      { name: 'Oscillator Mix', min: 0, max: 100, step: 1, value: 50, defaultValue: 50, unit: '%' },
      { name: 'Output Volume', min: -60, max: 6, step: 0.1, value: 0, defaultValue: 0, unit: 'dB' }
    ]
  } else {
    return [
      { name: 'Input Gain', min: -24, max: 24, step: 0.1, value: 0, defaultValue: 0, unit: 'dB' },
      { name: 'Low EQ', min: -15, max: 15, step: 0.1, value: 0, defaultValue: 0, unit: 'dB' },
      { name: 'Mid EQ', min: -15, max: 15, step: 0.1, value: 0, defaultValue: 0, unit: 'dB' },
      { name: 'High EQ', min: -15, max: 15, step: 0.1, value: 0, defaultValue: 0, unit: 'dB' },
      { name: 'Threshold', min: -60, max: 0, step: 0.5, value: -20, defaultValue: -20, unit: 'dB' },
      { name: 'Ratio', min: 1, max: 20, step: 0.1, value: 4, defaultValue: 4, unit: ':1' },
      { name: 'Release Time', min: 10, max: 2500, step: 1, value: 200, defaultValue: 200, unit: 'ms' },
      { name: 'Mix / Wet', min: 0, max: 100, step: 1, value: 100, defaultValue: 100, unit: '%' }
    ]
  }
}

export function VstPluginRack({ scanList }: { scanList: any[] }) {
  const [rackPlugins, setRackPlugins] = useState<LoadedVst[]>([])
  const [selectedPluginToLoad, setSelectedPluginToLoad] = useState<string>('')
  const [learningParam, setLearningParam] = useState<{ pluginId: string; paramIndex: number } | null>(null)
  const [vstMappings, setVstMappings] = useState<any[]>([])

  // Lade Mappings & Rack-Plugins beim Mount
  useEffect(() => {
    setVstMappings(MidiEngine.getVstMappings())

    const savedRack = localStorage.getItem('vst_rack_plugins')
    if (savedRack) {
      try {
        setRackPlugins(JSON.parse(savedRack))
      } catch (e) {
        console.error('Failed to load VST rack state:', e)
      }
    }

    const handleSettingsUpdated = () => {
      setVstMappings(MidiEngine.getVstMappings())
    }

    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdated)
    return () => {
      window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdated)
    }
  }, [])

  // In Echtzeit auf eingehende MIDI-Werte hören!
  useEffect(() => {
    const handleMidiControl = (e: Event) => {
      const customEvent = e as CustomEvent
      const { pluginId, paramIndex, value } = customEvent.detail

      setRackPlugins(prev => {
        const updated = prev.map(plugin => {
          if (plugin.id !== pluginId) return plugin

          const param = plugin.parameters[paramIndex]
          if (!param) return plugin

          // MIDI Wert (0.0-1.0) auf Parameterbereich skalieren
          const scaledValue = param.min + value * (param.max - param.min)
          const roundedValue = Math.round(scaledValue / param.step) * param.step

          const updatedParams = [...plugin.parameters]
          updatedParams[paramIndex] = {
            ...param,
            value: Math.max(param.min, Math.min(param.max, roundedValue))
          }

          return { ...plugin, parameters: updatedParams }
        })

        // Persistieren
        localStorage.setItem('vst_rack_plugins', JSON.stringify(updated))
        return updated
      })
    }

    const handleMidiLearned = (e: Event) => {
      const customEvent = e as CustomEvent
      const { pluginId, paramIndex } = customEvent.detail
      if (learningParam?.pluginId === pluginId && learningParam?.paramIndex === paramIndex) {
        setLearningParam(null)
      }
      setVstMappings(MidiEngine.getVstMappings())
    }

    window.addEventListener('VST_PARAM_MIDI_CONTROL', handleMidiControl)
    window.addEventListener('VST_MIDI_LEARNED', handleMidiLearned)

    return () => {
      window.removeEventListener('VST_PARAM_MIDI_CONTROL', handleMidiControl)
      window.removeEventListener('VST_MIDI_LEARNED', handleMidiLearned)
    }
  }, [learningParam])

  // Speichere Rack in localStorage
  const saveRackState = (newRack: LoadedVst[]) => {
    setRackPlugins(newRack)
    localStorage.setItem('vst_rack_plugins', JSON.stringify(newRack))
  }

  // Plugin hinzufügen
  const handleAddPlugin = () => {
    if (!selectedPluginToLoad) return
    const pluginToAdd = scanList.find(p => p.id === selectedPluginToLoad)
    if (!pluginToAdd) return

    // Prüfen, ob bereits geladen
    if (rackPlugins.some(p => p.path === pluginToAdd.path)) {
      alert('Dieses Plugin ist bereits im Rack geladen!')
      return
    }

    const newLoaded: LoadedVst = {
      id: pluginToAdd.id,
      name: pluginToAdd.name,
      manufacturer: pluginToAdd.manufacturer || 'Unbekannt',
      format: pluginToAdd.format || 'VST3',
      category: pluginToAdd.category || 'Effekt',
      path: pluginToAdd.path,
      active: true,
      parameters: getInitialParams(pluginToAdd.category || 'Effekt')
    }

    saveRackState([...rackPlugins, newLoaded])
    setSelectedPluginToLoad('')
  }

  // Plugin entfernen
  const handleRemovePlugin = (id: string) => {
    const updated = rackPlugins.filter(p => p.id !== id)
    saveRackState(updated)

    // Alle MIDI-Mappings dieses Plugins ebenfalls löschen
    const mappings = MidiEngine.getVstMappings()
    const thisPluginMappings = mappings.filter(m => m.pluginId === id)
    thisPluginMappings.forEach(m => {
      MidiEngine.clearVstMapping(id, m.paramIndex)
    })
  }

  // Active / Bypass umschalten
  const handleToggleActive = (id: string) => {
    const updated = rackPlugins.map(p => {
      if (p.id === id) return { ...p, active: !p.active }
      return p
    })
    saveRackState(updated)
  }

  // Parameter ändern
  const handleParamChange = (pluginId: string, paramIndex: number, val: number) => {
    const updated = rackPlugins.map(plugin => {
      if (plugin.id !== pluginId) return plugin
      const updatedParams = [...plugin.parameters]
      updatedParams[paramIndex] = { ...updatedParams[paramIndex], value: val }
      return { ...plugin, parameters: updatedParams }
    })
    saveRackState(updated)
  }

  // Parameter zurücksetzen
  const handleParamReset = (pluginId: string, paramIndex: number) => {
    const updated = rackPlugins.map(plugin => {
      if (plugin.id !== pluginId) return plugin
      const updatedParams = [...plugin.parameters]
      const param = updatedParams[paramIndex]
      updatedParams[paramIndex] = { ...param, value: param.defaultValue }
      return { ...plugin, parameters: updatedParams }
    })
    saveRackState(updated)
  }

  // MIDI-Learn starten / stoppen
  const handleMidiLearnClick = (pluginId: string, paramIndex: number) => {
    if (learningParam?.pluginId === pluginId && learningParam?.paramIndex === paramIndex) {
      MidiEngine.stopLearnMode()
      setLearningParam(null)
    } else {
      setLearningParam({ pluginId, paramIndex })
      MidiEngine.startVstLearn(pluginId, paramIndex)
    }
  }

  // Mappings löschen
  const handleMidiClearClick = (pluginId: string, paramIndex: number) => {
    MidiEngine.clearVstMapping(pluginId, paramIndex)
    setVstMappings(MidiEngine.getVstMappings())
  }

  // Prüfen, ob ein Parameter gemappt ist
  const getParamMapping = (pluginId: string, paramIndex: number) => {
    return vstMappings.find(m => m.pluginId === pluginId && m.paramIndex === paramIndex)
  }

  const isScanningLoading = scanList.length === 0

  return (
    <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden">
      
      {/* Top Controls Toolbar */}
      <div className="p-4 border-b border-gray-700/80 bg-[#1a1d21]/60 flex flex-wrap gap-3 items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            🎛️ VST Rack — DSP Signal Chain
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Verketten Sie Effekte & Synths. Mappen Sie Regler in Echtzeit über MIDI Learn.
          </p>
        </div>

        {/* Dropdown to add VST to Rack */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPluginToLoad}
            onChange={e => setSelectedPluginToLoad(e.target.value)}
            disabled={isScanningLoading}
            className="py-1.5 px-3 text-xs bg-[#101214] border border-gray-600 outline-none rounded-lg text-omega-accent font-medium cursor-pointer focus:border-omega-accent transition-colors disabled:opacity-40"
          >
            <option value="">+ Plugin in Rack laden...</option>
            {scanList.map(vst => (
              <option key={vst.id} value={vst.id}>
                {vst.category?.toLowerCase().includes('instrument') ? '🎹' : '🔌'} {vst.name} ({vst.format})
              </option>
            ))}
          </select>
          <button
            onClick={handleAddPlugin}
            disabled={!selectedPluginToLoad}
            className="h-8 px-3 bg-omega-accent hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-[0.97]"
          >
            <Plus size={13} />
            <span>Hinzufügen</span>
          </button>
        </div>
      </div>

      {/* Main Rack View Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#141619] space-y-6">
        
        {/* Placeholder if empty */}
        {rackPlugins.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-800 rounded-2xl text-center px-4 py-8">
            <span className="text-4xl filter grayscale opacity-40">🎛️</span>
            <h3 className="text-xs font-bold text-gray-400 mt-3 uppercase tracking-wider">
              Das Rack ist leer
            </h3>
            <p className="text-[10px] text-gray-650 max-w-xs mt-1 leading-relaxed">
              Wählen Sie oben ein gescanntes oder aus dem Store heruntergeladenes Plugin aus, um es dem DSP-Rack hinzuzufügen.
            </p>
          </div>
        )}

        {/* Loaded Plugins List */}
        {rackPlugins.map((plugin) => (
          <div
            key={plugin.id}
            className={`bg-[#202225] border border-gray-700/80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
              plugin.active ? 'border-l-4 border-l-omega-accent' : 'opacity-60 border-l-4 border-l-gray-600'
            }`}
          >
            {/* Module Header */}
            <div className="bg-[#181a1d] px-4 py-3 border-b border-gray-750 flex items-center justify-between">
              <div className="flex items-center gap-3">
                
                {/* Power Switch Button with LED Glow */}
                <button
                  onClick={() => handleToggleActive(plugin.id)}
                  title={plugin.active ? 'Bypass' : 'Aktivieren'}
                  className={`p-2 rounded-full border transition-all duration-300 active:scale-[0.9] flex items-center justify-center ${
                    plugin.active
                      ? 'bg-omega-accent/15 border-omega-accent text-omega-accent shadow-[0_0_8px_rgba(0,122,204,0.4)]'
                      : 'bg-gray-800/40 border-gray-750 text-gray-500'
                  }`}
                >
                  <Power size={13} className="stroke-[2.5]" />
                </button>

                {/* Title */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">
                      {plugin.name}
                    </span>
                    <span className="text-[8px] bg-gray-800 text-omega-accent font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">
                      {plugin.format}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono mt-0.5 block">
                    {plugin.category} von {plugin.manufacturer}
                  </span>
                </div>
              </div>

              {/* Header Right controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await window.api.openVstUi(plugin.path)
                      if (!res.success) alert(res.error || 'Native GUI konnte nicht geöffnet werden.')
                    } catch (err: any) {
                      alert('Fehler beim Öffnen: ' + err.message)
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] bg-gray-800 hover:bg-gray-700 rounded text-gray-300 font-semibold border border-gray-700/60 transition-colors"
                >
                  Native UI
                </button>
                <button
                  onClick={() => handleRemovePlugin(plugin.id)}
                  title="Aus Rack löschen"
                  className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 rounded-lg transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Parameters Grid */}
            <div className="p-4 bg-[#1e2124]/40 grid grid-cols-1 md:grid-cols-2 gap-4">
              {plugin.parameters.map((param, idx) => {
                const mapping = getParamMapping(plugin.id, idx)
                const isLearning = learningParam?.pluginId === plugin.id && learningParam?.paramIndex === idx

                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#17191c]/60 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
                  >
                    <div className="flex justify-between items-center text-xs">
                      {/* Name & value */}
                      <span className="text-gray-300 font-bold tracking-wide">
                        {param.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-omega-accent font-mono font-semibold bg-black/20 px-2 py-0.5 rounded border border-gray-800">
                          {param.value.toFixed(1)} {param.unit}
                        </span>
                        
                        {/* Reset Parameter */}
                        <button
                          onClick={() => handleParamReset(plugin.id, idx)}
                          title="Parameter zurücksetzen"
                          className="p-1 bg-gray-850 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-750 transition-all hover:rotate-[-90deg] duration-300"
                        >
                          <RotateCcw size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Slider and MIDI Learn */}
                    <div className="flex items-center gap-2.5">
                      <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={param.value}
                        onChange={e => handleParamChange(plugin.id, idx, parseFloat(e.target.value))}
                        disabled={!plugin.active}
                        className="flex-1 h-1.5 bg-gray-850 rounded-lg appearance-none cursor-pointer accent-omega-accent disabled:opacity-40 disabled:cursor-not-allowed"
                      />

                      {/* MIDI learn Button */}
                      <div className="flex items-center gap-1">
                        {mapping ? (
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-green-950 border border-green-900 text-green-400 text-[9px] font-mono font-bold rounded">
                              {mapping.type === 'cc' ? 'CC' : 'Note'} {mapping.number}
                            </span>
                            <button
                              onClick={() => handleMidiClearClick(plugin.id, idx)}
                              title="Mapping löschen"
                              className="px-1 py-0.5 bg-gray-800 hover:bg-gray-700 text-[8px] font-bold text-gray-400 hover:text-red-400 rounded transition-colors"
                            >
                              Reset
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleMidiLearnClick(plugin.id, idx)}
                            disabled={!plugin.active}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-md border shadow transition-all duration-300 ${
                              isLearning
                                ? 'bg-red-650 hover:bg-red-500 text-white border-red-500 animate-pulse font-semibold'
                                : 'bg-[#282b30] hover:bg-gray-700 text-gray-400 hover:text-omega-accent border-gray-700 disabled:opacity-30'
                            }`}
                          >
                            {isLearning ? 'Lerne...' : 'Lernen'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info bar */}
      <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-650 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Sliders size={12} className="text-gray-500" />
          <span>Der VST Signalweg ist post-cleaning, prä-fader auf den Arranger-Spuren geroutet.</span>
        </div>
        <span className="font-mono">DSP Host v0.8.0</span>
      </div>
    </div>
  )
}
