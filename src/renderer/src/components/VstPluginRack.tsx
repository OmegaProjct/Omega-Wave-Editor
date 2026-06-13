import React, { useState, useEffect } from 'react'
import { RotateCcw, Power, Trash2, Sliders, Play, Plus, Check, HelpCircle, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { MidiEngine } from '../lib/MidiEngine'
import { useTranslation } from 'react-i18next'

export interface VstParameter {
  name: string
  min: number
  max: number
  step: number
  value: number
  defaultValue: number
  unit: string
  index?: number
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
  hasEditor?: boolean
  missingFromScan?: boolean
  notHostable?: boolean
  unsupportedReason?: string
  instanceId?: number
}

// Hilfsfunktion zur Generierung von Parametern für ein VST
export const getInitialParams = (category: string): VstParameter[] => {
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
  const { t } = useTranslation()
  const [rackPlugins, setRackPlugins] = useState<LoadedVst[]>([])
  const [selectedPluginToLoad, setSelectedPluginToLoad] = useState<string>('')
  const [learningParam, setLearningParam] = useState<{ pluginId: string; paramIndex: number } | null>(null)
  const [vstMappings, setVstMappings] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [collapsedPluginIds, setCollapsedPluginIds] = useState<Record<string, boolean>>({})

  const isRealPlugin = (plugin: { path?: string }) => {
    return !!(plugin.path && !plugin.path.startsWith('store://') && !plugin.path.startsWith('internal://'))
  }

  const hasLoadedRealPlugin = rackPlugins.some(p => isRealPlugin(p))

  const handleTogglePluginCheckbox = (vst: any) => {
    if (vst.hostable === false) {
      alert(`Dieses Plugin kann nicht geladen werden: ${vst.unsupportedReason || 'Inkompatibel'}`)
      return
    }
    const isLoaded = rackPlugins.some(p => p.id === vst.id)
    if (isLoaded) {
      handleRemovePlugin(vst.id)
    } else {
      const isPlaceholder = vst.path?.startsWith('store://') || vst.path?.startsWith('internal://')
      const newLoaded: LoadedVst = {
        id: vst.id,
        name: vst.name,
        manufacturer: vst.manufacturer || 'Unbekannt',
        format: vst.format || 'Unbekannt',
        category: vst.category || 'Plugin',
        path: vst.path,
        active: true,
        parameters: isPlaceholder ? getInitialParams(vst.category || 'Plugin') : []
      }
      saveRackState([...rackPlugins, newLoaded])
    }
  }

  // Lade Mappings & Rack-Plugins beim Mount
  useEffect(() => {
    setVstMappings(MidiEngine.getVstMappings())

    const loadRackState = () => {
      const savedRack = localStorage.getItem('vst_rack_plugins')
      if (savedRack) {
        try {
          const parsed = JSON.parse(savedRack)
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((p: any) => p && p.path && !p.path.startsWith('store://') && !p.path.startsWith('internal://'))
            
            // Automatische Saeuberung fiktiver Parameter bei realen Plugins (ohne 'index'-Property)
            let hasAnyCleaned = false
            const cleaned = filtered.map((p: any) => {
              if (p.parameters && p.parameters.length > 0) {
                const hasFakeParams = p.parameters.some((param: any) => param.index === undefined)
                if (hasFakeParams) {
                  hasAnyCleaned = true
                  return { ...p, parameters: [] }
                }
              }
              return p
            })

            // Validierung gegen die aktuelle Scan-Liste
            let validated = cleaned
            let hasValidationChanges = false

            if (scanList && scanList.length > 0) {
              validated = cleaned.map((p: any) => {
                const scanned = scanList.find((v: any) => v.id === p.id || v.path === p.path)
                let updatedP = { ...p }
                let modified = false

                if (!scanned) {
                  // Plugin fehlt beim Scan -> active=false, missingFromScan=true setzen (notHostable=false)
                  if (updatedP.active !== false) {
                    updatedP.active = false
                    modified = true
                  }
                  if (updatedP.missingFromScan !== true) {
                    updatedP.missingFromScan = true
                    modified = true
                  }
                  if (updatedP.notHostable !== false) {
                    updatedP.notHostable = false
                    modified = true
                  }
                  if (updatedP.unsupportedReason !== undefined) {
                    delete updatedP.unsupportedReason
                    modified = true
                  }
                } else {
                  // Plugin gefunden -> prüfen ob hostbar
                  const isHostable = scanned.hostable !== false
                  if (!isHostable) {
                    // Nicht hostbar -> active=false, notHostable=true setzen (missingFromScan=false)
                    if (updatedP.active !== false) {
                      updatedP.active = false
                      modified = true
                    }
                    if (updatedP.notHostable !== true) {
                      updatedP.notHostable = true
                      modified = true
                    }
                    const expectedReason = scanned.unsupportedReason || 'Inkompatibel'
                    if (updatedP.unsupportedReason !== expectedReason) {
                      updatedP.unsupportedReason = expectedReason
                      modified = true
                    }
                    if (updatedP.missingFromScan !== false) {
                      updatedP.missingFromScan = false
                      modified = true
                    }
                  } else {
                    // Hostbar und vorhanden -> Guardrail-Flags zurücksetzen
                    if (updatedP.missingFromScan !== false) {
                      updatedP.missingFromScan = false
                      modified = true
                    }
                    if (updatedP.notHostable !== false) {
                      updatedP.notHostable = false
                      modified = true
                    }
                    if (updatedP.unsupportedReason !== undefined) {
                      delete updatedP.unsupportedReason
                      modified = true
                    }
                  }
                }

                if (modified) {
                  hasValidationChanges = true
                }
                return updatedP
              })
            }

            setRackPlugins(validated)
            if (hasAnyCleaned || filtered.length !== parsed.length || hasValidationChanges) {
              localStorage.setItem('vst_rack_plugins', JSON.stringify(validated))
            }
          }
        } catch (e) {
          console.error('Failed to load VST rack state:', e)
        }
      }
    }

    loadRackState()

    const handleSettingsUpdated = () => {
      setVstMappings(MidiEngine.getVstMappings())
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vst_rack_plugins' || e.key === 'vst_rack_updated_trigger') {
        loadRackState()
      }
    }

    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdated)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdated)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [scanList])

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

    if (pluginToAdd.hostable === false) {
      alert(`Dieses Plugin kann nicht geladen werden: ${pluginToAdd.unsupportedReason || 'Inkompatibel'}`)
      return
    }

    // Prüfen, ob bereits geladen
    if (rackPlugins.some(p => p.path === pluginToAdd.path)) {
      alert('Dieses Plugin ist bereits im Rack geladen!')
      return
    }

    const isPlaceholder = pluginToAdd.path?.startsWith('store://') || pluginToAdd.path?.startsWith('internal://')
    const newLoaded: LoadedVst = {
      id: pluginToAdd.id,
      name: pluginToAdd.name,
      manufacturer: pluginToAdd.manufacturer || 'Unbekannt',
      format: pluginToAdd.format || 'Unbekannt',
      category: pluginToAdd.category || 'Plugin',
      path: pluginToAdd.path,
      active: true,
      parameters: isPlaceholder ? getInitialParams(pluginToAdd.category || 'Plugin') : []
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
    const pluginToToggle = rackPlugins.find(p => p.id === id)
    if (!pluginToToggle) return

    if (pluginToToggle.missingFromScan || pluginToToggle.notHostable) {
      return
    }

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
      if (!plugin.parameters || !plugin.parameters[paramIndex]) return plugin
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
      if (!plugin.parameters || !plugin.parameters[paramIndex]) return plugin
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

  const isPopout = new URLSearchParams(window.location.search).get('window') === 'vst-rack'
  const isScanningLoading = scanList.length === 0

  if (!isPopout) {
    const filteredPlugins = scanList.filter(vst =>
      vst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vst.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
      <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden font-sans">
        {/* Symmetrical 3-Part Header Toolbar */}
        <div 
          onDoubleClick={() => window.api.openPopoutWindow('vst-rack', { width: 900, height: 750, title: 'VST Rack - DSP Signal Chain' })}
          className="p-3 border-b border-gray-700/80 bg-[#1a1d21]/60 flex items-center justify-between gap-3 flex-shrink-0 cursor-pointer hover:bg-[#1a1d21]/80 select-none transition-colors"
          title="Doppelklick zum Ausdocken des VST Racks in ein separates Fenster"
        >
          {/* Left: Title */}
          <div className="w-1/3 min-w-[150px]">
            <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              🎛️ VST Rack
            </h2>
            <p className="text-[9px] text-gray-500 mt-0.5">
              Plugin-Verwaltung
            </p>
          </div>

          {/* Center: Outdock Button */}
          <div className="w-1/3 flex justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => window.api.openPopoutWindow('vst-rack', { width: 900, height: 750, title: 'VST Rack - DSP Signal Chain' })}
              className="h-8 px-3.5 bg-omega-accent/15 hover:bg-omega-accent hover:text-white border border-omega-accent/60 rounded-lg text-omega-accent font-extrabold text-[11px] flex items-center gap-1.5 transition-all shadow active:scale-[0.97] cursor-pointer"
              title="VST-Rack im separaten Studio-Fenster öffnen"
            >
              <ExternalLink size={12} className="stroke-[2.5]" />
              <span>Studio öffnen</span>
            </button>
          </div>

          {/* Right: Search Input bar */}
          <div className="w-1/3 flex justify-end" onClick={e => e.stopPropagation()}>
            <div className="relative w-44 sm:w-56">
              <input
                type="text"
                placeholder="Nach Plugins suchen..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full py-1.5 pl-8 pr-3 text-[11px] bg-[#101214] border border-gray-750 rounded-lg text-gray-250 outline-none focus:border-omega-accent transition-colors"
              />
              <span className="absolute left-2.5 top-2 text-[10px] text-gray-500">🔍</span>
            </div>
          </div>
        </div>

        {/* Grid List of Checklist Plugins */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#141619] space-y-4">

          {isScanningLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-omega-accent mx-auto"></div>
              <p className="text-xs text-gray-500 mt-3 uppercase tracking-wider font-semibold">Scanne VST-Datenbank...</p>
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-gray-800 rounded-2xl">
              <p className="text-xs text-gray-500">Keine Plugins gefunden, die auf deine Suche passen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredPlugins.map(vst => {
                const isLoaded = rackPlugins.some(p => p.id === vst.id)
                const isInstrument = vst.category?.toLowerCase().includes('instrument')
                const isPluginCategory = vst.category?.toLowerCase() === 'plugin'
                const isHostable = vst.hostable !== false

                return (
                  <div
                    key={vst.id}
                    onClick={() => {
                      if (!isHostable) return
                      handleTogglePluginCheckbox(vst)
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                      !isHostable
                        ? 'bg-red-950/5 border-red-900/30 opacity-60 cursor-not-allowed'
                        : isLoaded
                        ? 'bg-omega-accent/10 border-omega-accent/70 shadow-[0_0_12px_rgba(0,122,204,0.12)] cursor-pointer'
                        : 'bg-[#1b1e22]/50 border-gray-800 hover:border-gray-700 hover:bg-[#1b1e22]/80 cursor-pointer'
                    }`}
                    title={
                      !isHostable
                        ? `Nicht unterstützt: ${vst.unsupportedReason || 'Inkompatibel'}`
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox Icon */}
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        !isHostable
                          ? 'border-gray-800 bg-gray-950/15 text-gray-500'
                          : isLoaded
                          ? 'bg-omega-accent border-omega-accent text-white shadow-[0_0_8px_rgba(0,122,204,0.4)]'
                          : 'border-gray-700 bg-black/30'
                      }`}>
                        {isLoaded && <Check size={12} className="stroke-[3]" />}
                        {!isHostable && <span className="text-[10px] select-none">✕</span>}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${
                            !isHostable ? 'text-gray-500 line-through' : isLoaded ? 'text-omega-accent' : 'text-gray-250'
                          }`}>
                            {vst.name}
                          </span>
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                            !isHostable ? 'bg-gray-850 text-gray-500 border border-gray-800' : 'bg-gray-800 text-omega-accent'
                          }`}>
                            {vst.format || 'Unbekannt'}
                          </span>
                          {!isHostable && (
                            <span className="text-[7.5px] bg-red-600/15 text-red-400 border border-red-600/30 font-bold px-1.5 py-0.5 rounded font-sans uppercase tracking-wider select-none">
                              Inkompatibel
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                          {isInstrument ? '🎹' : isPluginCategory ? '🧩' : '🔌'} {vst.category || 'Plugin'} von {vst.manufacturer || 'Dritthersteller'}
                        </span>
                        {!isHostable && vst.unsupportedReason && (
                          <span className="text-[8.5px] text-red-400 font-medium block mt-1 leading-snug">
                            ⚠ {vst.unsupportedReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-650 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Sliders size={12} className="text-gray-500" />
            <span>Aktive Plugins: {rackPlugins.length} im Signalweg geladen</span>
          </div>
          <span className="font-mono">Manager v0.8.7</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden">
      
      {/* Top Controls Toolbar */}
      <div 
        onDoubleClick={() => {
          if (!isPopout) {
            window.api.openPopoutWindow('vst-rack', { width: 900, height: 750, title: 'VST Rack - DSP Signal Chain' })
          }
        }}
        className="p-4 border-b border-gray-700/80 bg-[#1a1d21]/60 flex flex-wrap gap-3 items-center justify-between flex-shrink-0 cursor-pointer hover:bg-[#1a1d21]/80 select-none transition-colors"
        title={!isPopout ? 'Doppelklick zum Ausdocken des VST Racks' : undefined}
      >
        <div>
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            🎛️ VST Rack — DSP Signal Chain
            {!isPopout && (
              <button
                onClick={() => window.api.openPopoutWindow('vst-rack', { width: 900, height: 750, title: 'VST Rack - DSP Signal Chain' })}
                className="p-1 hover:bg-gray-800 rounded transition-colors text-omega-accent hover:text-white"
                title="In separatem Fenster öffnen (Popout)"
              >
                <ExternalLink size={12} />
              </button>
            )}
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
            <option value="">+ {t('vst_rack.load_placeholder', { defaultValue: 'Plugin in Rack laden...' })}</option>
            {scanList.map(vst => {
              const isAlreadyLoaded = rackPlugins.some(p => p.id === vst.id)
              const isDisabledOption = !vst.hostable
              return (
                <option key={vst.id} value={vst.id} disabled={isDisabledOption}>
                  {vst.category?.toLowerCase().includes('instrument') ? '🎹' : vst.category?.toLowerCase() === 'plugin' ? '🧩' : '🔌'} {vst.name} ({vst.format})
                  {!vst.hostable && ` - Nicht unterstützt (${vst.unsupportedReason || 'Inkompatibel'})`}
                </option>
              )
            })}
          </select>
          <button
            onClick={handleAddPlugin}
            disabled={!selectedPluginToLoad}
            className="h-8 px-3 bg-omega-accent hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-[0.97]"
          >
            <Plus size={13} />
            <span>{t('vst_rack.add', { defaultValue: 'Hinzufügen' })}</span>
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
              {t('vst_rack.empty_title', { defaultValue: 'Das Rack ist leer' })}
            </h3>
            <p className="text-[10px] text-gray-650 max-w-xs mt-1 leading-relaxed">
              {t('vst_rack.empty_desc', { defaultValue: 'Wählen Sie oben ein gescanntes oder aus dem Store heruntergeladenes Plugin aus, um es dem DSP-Rack hinzuzufügen.' })}
            </p>
          </div>
        )}
        {/* Loaded Plugins List */}
        {rackPlugins.map((plugin) => {
          const isOfflineOrIncompatible = !!(plugin.missingFromScan || plugin.notHostable)
          return (
            <div
              key={plugin.id}
              className={`bg-[#202225] border border-gray-700/80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
                isOfflineOrIncompatible
                  ? 'border-l-4 border-l-red-600 bg-red-950/5'
                  : plugin.active
                  ? 'border-l-4 border-l-omega-accent'
                  : 'opacity-60 border-l-4 border-l-gray-600'
              }`}
            >
              {/* Module Header */}
              <div
                onClick={() => {
                  setCollapsedPluginIds(prev => ({ ...prev, [plugin.id]: !prev[plugin.id] }))
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (plugin.missingFromScan || plugin.notHostable) {
                    return
                  }
                  if (isOfflineOrIncompatible) return
                  if (!plugin.instanceId) return
                  if (plugin.path?.startsWith('store://') || plugin.path?.startsWith('internal://')) {
                    return
                  }
                  const width = 720
                  const height = plugin.hasEditor === false ? 580 : 110
                  localStorage.setItem('popout_vst-editor_payload', JSON.stringify({
                    pluginId: plugin.id,
                    instanceId: plugin.instanceId,
                    hasEditor: plugin.hasEditor,
                    name: plugin.name,
                    manufacturer: plugin.manufacturer,
                    format: plugin.format,
                    category: plugin.category,
                    path: plugin.path
                  }))
                  window.api.openPopoutWindow('vst-editor', { width, height, title: 'Plugin Editor - ' + plugin.name })
                }}
                className="bg-[#181a1d] px-4 py-3 border-b border-gray-750 flex items-center justify-between cursor-pointer hover:bg-[#1c1e22] transition-all select-none group/header animate-fade-in"
                title={
                  isOfflineOrIncompatible
                    ? t('vst_rack.offline_header_desc', { defaultValue: 'Plugin ist offline oder inkompatibel. Editor kann nicht geladen werden.' })
                    : t('vst_rack.double_click_desc', { defaultValue: 'Einfacher Klick zum Ein-/Ausklappen. Doppelklick zum Versuch, den Herstellereigentümlichen Editor zu laden (nicht garantiert)' })
                }
              >
                <div className="flex items-center gap-3">
                  {/* Collapsible Arrow Chevron */}
                  <div className="text-gray-500 group-hover/header:text-omega-accent transition-colors mr-1">
                    {collapsedPluginIds[plugin.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </div>
                  
                  {/* Power Switch Button with LED Glow */}
                  <button
                    disabled={isOfflineOrIncompatible}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (plugin.missingFromScan || plugin.notHostable) {
                        return
                      }
                      if (isOfflineOrIncompatible) return;
                      handleToggleActive(plugin.id);
                    }}
                    title={
                      isOfflineOrIncompatible
                        ? t('vst_rack.disabled_offline', { defaultValue: 'Gesperrt - Plugin ist offline oder inkompatibel' })
                        : plugin.active
                        ? t('vst_rack.bypass', { defaultValue: 'Bypass' })
                        : t('vst_rack.activate', { defaultValue: 'Aktivieren' })
                    }
                    className={`p-2 rounded-full border transition-all duration-300 flex items-center justify-center ${
                      isOfflineOrIncompatible
                        ? 'bg-gray-800/10 border-gray-800/50 text-gray-650 cursor-not-allowed opacity-40'
                        : `active:scale-[0.9] ${
                            plugin.active
                              ? 'bg-omega-accent/15 border-omega-accent text-omega-accent shadow-[0_0_8px_rgba(0,122,204,0.4)] hover:bg-omega-accent/25'
                              : 'bg-gray-800/40 border-gray-750 text-gray-500 hover:bg-gray-800/70 hover:text-gray-400'
                          }`
                    }`}
                  >
                    <Power size={13} className="stroke-[2.5]" />
                  </button>
   
                  {/* Title */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-wide group-hover/header:text-omega-accent transition-colors">
                        {plugin.name}
                      </span>
                      <span className="text-[8px] bg-gray-800 text-omega-accent font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider font-semibold">
                        {plugin.format}
                      </span>
                      {plugin.missingFromScan && (
                        <span className="text-[7.5px] bg-red-600/15 text-red-400 border border-red-600/30 font-bold px-1.5 py-0.5 rounded font-sans uppercase tracking-wider select-none">
                          Fehlt beim Scan
                        </span>
                      )}
                      {plugin.notHostable && !plugin.missingFromScan && (
                        <span className="text-[7.5px] bg-red-600/15 text-red-400 border border-red-600/30 font-bold px-1.5 py-0.5 rounded font-sans uppercase tracking-wider select-none">
                          Inkompatibel
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono mt-0.5 block">
                      {plugin.category} von {plugin.manufacturer}
                    </span>
                  </div>
                </div>

                {/* Header Right controls */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!(plugin.path?.startsWith('store://') || plugin.path?.startsWith('internal://')) && (
                    <button
                      disabled={isOfflineOrIncompatible || !plugin.instanceId}
                      onClick={() => {
                        if (isOfflineOrIncompatible) return
                        if (!plugin.instanceId) return
                        const width = 720
                        const height = plugin.hasEditor === false ? 580 : 110
                        localStorage.setItem('popout_vst-editor_payload', JSON.stringify({
                          pluginId: plugin.id,
                          instanceId: plugin.instanceId,
                          hasEditor: plugin.hasEditor,
                          name: plugin.name,
                          manufacturer: plugin.manufacturer,
                          format: plugin.format,
                          category: plugin.category,
                          path: plugin.path
                        }))
                        window.api.openPopoutWindow('vst-editor', { width, height, title: 'Plugin Editor - ' + plugin.name })
                      }}
                      className={`px-2.5 py-1 text-[10px] rounded font-semibold border transition-colors ${
                        isOfflineOrIncompatible || !plugin.instanceId
                          ? 'bg-red-950/10 border-red-900/30 text-red-400/50 cursor-not-allowed opacity-50'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700/60 transition-colors'
                      }`}
                      title={!plugin.instanceId ? 'Erst im Signalweg laden' : undefined}
                    >
                      {plugin.hasEditor === false
                        ? t('vst_rack.parameters', { defaultValue: 'Parameter' })
                        : t('vst_rack.open_ui', { defaultValue: 'Editor laden' })
                      }
                    </button>
                  )}
                  <button
                    onClick={() => handleRemovePlugin(plugin.id)}
                    title={t('vst_rack.delete_from_rack', { defaultValue: 'Aus Rack löschen' })}
                    className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Parameters Grid */}
              {!collapsedPluginIds[plugin.id] && (
                <div className="p-4 bg-[#1e2124]/40 grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-down">
                  {isOfflineOrIncompatible ? (
                    plugin.missingFromScan ? (
                      <div className="col-span-full p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start gap-3 text-left text-xs leading-relaxed text-gray-300 shadow-inner">
                        <span className="text-lg select-none">⚠️</span>
                        <div>
                          <h5 className="font-bold text-[11px] text-red-400 uppercase tracking-wider mb-1">Plugin offline (nicht im System gefunden)</h5>
                          <p className="text-[11px] leading-relaxed text-gray-400">
                            Dieses Plugin wurde beim aktuellen System-Scan nicht im Workspace oder in den VST-Ordnern gefunden. 
                            Es wurde aus Sicherheitsgründen im Signalweg automatisch deaktiviert.
                          </p>
                          <p className="text-[10px] text-gray-500 mt-2 font-mono leading-normal bg-black/25 p-2 rounded border border-gray-850">
                            Pfad: {plugin.path}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="col-span-full p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start gap-3 text-left text-xs leading-relaxed text-gray-300 shadow-inner">
                        <span className="text-lg select-none">⚠️</span>
                        <div>
                          <h5 className="font-bold text-[11px] text-red-400 uppercase tracking-wider mb-1">Plugin inkompatibel</h5>
                          <p className="text-[11px] leading-relaxed text-gray-400">
                            Dieses Plugin ist mit der aktuellen Host-Plattform oder Host-Architektur nicht kompatibel und wurde automatisch deaktiviert.
                          </p>
                          {plugin.unsupportedReason && (
                            <div className="mt-2 p-2 bg-red-950/40 border border-red-900/30 text-red-300 font-semibold rounded text-[10.5px]">
                              Grund: {plugin.unsupportedReason}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <>
                      {plugin.hasEditor === false && (
                        <div className="col-span-full p-3 bg-blue-950/20 border border-blue-900/35 rounded-xl flex items-start gap-2.5 text-left text-xs leading-relaxed text-gray-300">
                          <span className="text-sm mt-0.5 select-none">ℹ️</span>
                          <div>
                            <h5 className="font-bold text-[10px] text-omega-accent uppercase tracking-wider mb-0.5">Kein nativer Editor verfügbar</h5>
                            <p className="text-[10.5px] leading-relaxed text-gray-400">
                              Dieses Plugin besitzt laut Host-Rückmeldung keinen herstellereigenen grafischen Editor (GUI). Sie können alle Parameter stattdessen direkt hier im Rack über die Regler steuern oder extern anpassen.
                            </p>
                          </div>
                        </div>
                      )}
                      {(!plugin.parameters || plugin.parameters.length === 0) ? (
                        <div className="col-span-full py-6 px-4 bg-[#17191c]/45 border border-gray-700/40 rounded-xl text-center">
                          <Sliders size={18} className="mx-auto text-gray-600 mb-2 opacity-60" />
                          <p className="text-xs font-semibold text-gray-400">
                            {plugin.hasEditor === false ? 'Parameter-Steuerung' : 'Keine Host-Parameter initialisiert'}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                            {plugin.hasEditor === false 
                              ? 'Dieses Plugin besitzt keinen nativen Editor und stellt derzeit keine steuerbaren Host-Parameter über das Rack bereit.'
                              : 'Für dieses externe Plugin wurden keine fiktiven Regler erzeugt. Sie können versuchen, das Herstellereigene Editor-Interface zu öffnen (Klick auf „Editor laden“ oder Doppelklick auf den Header), falls vom Plugin-Hersteller unterstützt und scanseitig verfügbar.'
                            }
                          </p>
                        </div>
                      ) : (
                        plugin.parameters.map((param, idx) => {
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
                                    title={t('vst_rack.reset_parameter', { defaultValue: 'Parameter zurücksetzen' })}
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
                                        title={t('vst_rack.delete_mapping', { defaultValue: 'Mapping löschen' })}
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
                                          ? 'bg-red-650 hover:bg-red-500 text-white border-red-500 font-semibold'
                                          : 'bg-[#282b30] hover:bg-gray-700 text-gray-400 hover:text-omega-accent border-gray-700 disabled:opacity-30'
                                      }`}
                                    >
                                      {isLearning ? t('vst_rack.learning', { defaultValue: 'Lerne...' }) : t('vst_rack.learn', { defaultValue: 'Lernen' })}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Info bar */}
      <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-650 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Sliders size={12} className="text-gray-500" />
          <span>{t('vst_rack.uninstall_desc', { defaultValue: 'Der VST Signalweg ist post-cleaning, prä-fader auf den Arranger-Spuren geroutet.' })}</span>
        </div>
        <span className="font-mono">DSP Host v0.8.0</span>
      </div>
    </div>
  )
}

export function VstPluginRackPopout() {
  const [scanList, setScanList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.scanVstPlugins().then((plugins: any[]) => {
      const filtered = plugins.filter((p: any) => p && p.path && !p.path.startsWith('store://') && !p.path.startsWith('internal://'))
      setScanList(filtered.filter(p => !p.blocked))
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#101214] text-gray-400 font-medium font-sans">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-omega-accent mx-auto"></div>
          <p className="text-xs tracking-wide uppercase mt-4">Lade VST Rack...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <VstPluginRack scanList={scanList} />
    </div>
  )
}
