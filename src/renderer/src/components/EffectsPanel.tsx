import React, { useState, useEffect } from 'react'
import { RotateCcw, ChevronDown, ChevronRight, Save, FolderOpen, Copy, Clipboard, RefreshCw } from 'lucide-react'
import { AudioEngine } from '../lib/AudioEngine'

// === Typen ===
export type RegionEffects = {
  eqGains?: number[]
  compActive?: boolean
  compThreshold?: number
  compRatio?: number
  deEsserActive?: boolean
  deEsserReduction?: number
  reverbMix?: number
  reverbTime?: number
  delayTime?: number
  delayFeedback?: number
  pitchRate?: number
  keepPitch?: boolean
}

// === EffectSlider ===
interface EffectSliderProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  defaultValue: number
  unit?: string
  onChange: (val: number) => void
}

function EffectSlider({ label, min, max, step, value, defaultValue, unit = '', onChange }: EffectSliderProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  useEffect(() => { setInputValue(value.toString()) }, [value])

  const handleBlur = () => {
    let num = parseFloat(inputValue)
    if (isNaN(num)) { setInputValue(value.toString()); return }
    num = Math.max(min, Math.min(max, num))
    onChange(num)
    setInputValue(num.toString())
  }

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#1a1d21]/60 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-300 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#101214] border border-gray-600 rounded overflow-hidden h-6">
            <input
              type="text" value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={e => e.key === 'Enter' && handleBlur()}
              className="w-12 bg-transparent text-center text-[11px] text-omega-accent font-mono outline-none border-none py-0 px-1"
            />
            {unit && <span className="text-[10px] text-gray-500 pr-1 font-mono">{unit}</span>}
            <div className="flex flex-col border-l border-gray-600 h-full">
              <button onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
                className="flex-1 px-1.5 bg-[#1a1d21] hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center border-b border-gray-600">
                <ChevronDown size={7} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
                className="flex-1 px-1.5 bg-[#1a1d21] hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center">
                <ChevronDown size={7} />
              </button>
            </div>
          </div>
          <button onClick={() => onChange(defaultValue)} title="Zurücksetzen"
            className="p-1 rounded bg-[#282b30] hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-600/50 transition-all hover:rotate-[-90deg] duration-300">
            <RotateCcw size={11} />
          </button>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-omega-accent" />
    </div>
  )
}

// === Linke Sidebar: Ordner-Gruppe ===
function SidebarFolder({
  title, open, onToggle, children
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-200 hover:bg-[#282b30] transition-colors select-none"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className="flex-1 text-left">{title}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// === Linke Sidebar: Einzel-Eintrag ===
function SidebarItem({
  label, icon, active, onClick, badge
}: {
  label: string
  icon: string
  active: boolean
  onClick: () => void
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 pl-6 pr-2 py-1.5 text-xs transition-colors select-none truncate ${
        active
          ? 'bg-omega-accent text-white font-medium'
          : 'text-gray-400 hover:text-gray-200 hover:bg-[#282b30]'
      }`}
    >
      <span className="text-sm flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge && (
        <span className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// === Haupt-Komponente ===
export function EffectsPanel({
  selectedRegionId,
  tracks,
  onTracksChange
}: {
  selectedRegionId: string | null
  tracks: any[]
  onTracksChange: (tracks: any[]) => void
}) {
  const engine = AudioEngine.getInstance()

  // Aktiven Clip verfolgen
  const [lastSelectedRegionId, setLastSelectedRegionId] = useState<string | null>(null)
  useEffect(() => {
    if (selectedRegionId) setLastSelectedRegionId(selectedRegionId)
  }, [selectedRegionId])

  const activeId = selectedRegionId || lastSelectedRegionId
  const selectedRegion = tracks.flatMap((t: any) => t.regions).find((r: any) => r.id === activeId)
  const hasClip = !!selectedRegion

  // Status
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [statusMessage])

  // VST
  const [vstPlugins, setVstPlugins] = useState<any[]>([])
  const [isScanning, setIsScanning] = useState(false)

  // Sidebar-Zustände
  const [effectsOpen, setEffectsOpen] = useState(true)
  const [vstOpen, setVstOpen] = useState(true)
  const [selectedItem, setSelectedItem] = useState<string>('eq')

  // Beim Start vorhandene Plugin-Registry laden
  useEffect(() => {
    window.api.scanVstPlugins().then((plugins: any[]) => {
      setVstPlugins(plugins)
    }).catch(() => {})
  }, [])

  // Standard-Effekte
  const defaultEffects: Required<RegionEffects> = {
    eqGains: new Array(10).fill(0),
    compActive: false,
    compThreshold: -20,
    compRatio: 4,
    deEsserActive: false,
    deEsserReduction: 6,
    reverbMix: 0,
    reverbTime: 1.5,
    delayTime: 300,
    delayFeedback: 0,
    pitchRate: 1.0,
    keepPitch: false
  }

  const effects = { ...defaultEffects, ...selectedRegion?.effects }

  // Synchronized state for real-time length input (Magix-style)
  const currentLength = selectedRegion ? (selectedRegion.duration / (effects.pitchRate || 1.0)) : 0;
  const [tempLength, setTempLength] = useState(currentLength.toFixed(2));

  useEffect(() => {
    if (selectedRegion) {
      const len = selectedRegion.duration / (effects.pitchRate || 1.0);
      setTempLength(len.toFixed(2));
    }
  }, [selectedRegion?.id, effects.pitchRate, selectedRegion?.duration]);

  const handleLengthBlur = () => {
    if (!selectedRegion) return;
    let newLen = parseFloat(tempLength);
    if (isNaN(newLen) || newLen <= 0) {
      const len = selectedRegion.duration / (effects.pitchRate || 1.0);
      setTempLength(len.toFixed(2));
      return;
    }
    // Clamp between pitchRate 0.5 and pitchRate 2.0
    const minLen = selectedRegion.duration / 2.0;
    const maxLen = selectedRegion.duration / 0.5;
    newLen = Math.max(minLen, Math.min(maxLen, newLen));
    
    const newPitchRate = Math.round((selectedRegion.duration / newLen) * 100) / 100;
    updateEffects({ pitchRate: newPitchRate });
  };

  // Effekte aktualisieren
  const updateEffects = (newEffects: Partial<RegionEffects>) => {
    if (!selectedRegion) return
    const updatedEffects = { ...effects, ...newEffects }
    const updatedTracks = tracks.map((t: any) => ({
      ...t,
      regions: t.regions.map((r: any) =>
        r.id === selectedRegion.id ? { ...r, effects: updatedEffects } : r
      )
    }))
    onTracksChange(updatedTracks)

    const rid = selectedRegion.id
    if (newEffects.eqGains !== undefined) {
      newEffects.eqGains.forEach((g: number, i: number) => {
        if (g !== effects.eqGains![i]) engine.updateActiveRegionEQ(rid, i, g)
      })
    }
    if (newEffects.compActive !== undefined || newEffects.compThreshold !== undefined || newEffects.compRatio !== undefined)
      engine.updateActiveRegionCompressor(rid, newEffects.compActive ?? effects.compActive!, newEffects.compThreshold ?? effects.compThreshold!, newEffects.compRatio ?? effects.compRatio!)
    if (newEffects.deEsserActive !== undefined || newEffects.deEsserReduction !== undefined)
      engine.updateActiveRegionDeEsser(rid, newEffects.deEsserActive ?? effects.deEsserActive!, newEffects.deEsserReduction ?? effects.deEsserReduction!)
    if (newEffects.reverbMix !== undefined || newEffects.reverbTime !== undefined)
      engine.updateActiveRegionReverb(rid, newEffects.reverbMix ?? effects.reverbMix!, newEffects.reverbTime ?? effects.reverbTime!)
    if (newEffects.delayTime !== undefined || newEffects.delayFeedback !== undefined)
      engine.updateActiveRegionDelay(rid, newEffects.delayTime ?? effects.delayTime!, newEffects.delayFeedback ?? effects.delayFeedback!)
    if (newEffects.pitchRate !== undefined || newEffects.keepPitch !== undefined)
      engine.updateActiveRegionPitch(rid, newEffects.pitchRate ?? effects.pitchRate!, newEffects.keepPitch ?? effects.keepPitch!)
  }

  const handleEqChange = (index: number, value: number) => {
    const newGains = [...effects.eqGains!]
    newGains[index] = value
    updateEffects({ eqGains: newGains })
  }

  // Preset-Handler
  const handleLoadPreset = async () => {
    if (!hasClip) return
    try {
      const result = await window.api.showOpenDialog({
        title: 'Effekt-Preset laden (.owea)',
        filters: [{ name: 'Omega Wave Editor Audioeffekte', extensions: ['owea'] }],
        properties: ['openFile']
      })
      if (!result.canceled && result.filePaths.length > 0) {
        const loadResult = await window.api.loadProject(result.filePaths[0])
        if (loadResult.success && loadResult.data?.format === 'OWEA') {
          const pe = loadResult.data.effects
          if (pe) {
            updateEffects(pe)
            const rid = selectedRegion!.id
            if (pe.eqGains) pe.eqGains.forEach((g: number, i: number) => engine.updateActiveRegionEQ(rid, i, g))
            engine.updateActiveRegionCompressor(rid, pe.compActive ?? false, pe.compThreshold ?? -20, pe.compRatio ?? 4)
            engine.updateActiveRegionDeEsser(rid, pe.deEsserActive ?? false, pe.deEsserReduction ?? 6)
            engine.updateActiveRegionReverb(rid, pe.reverbMix ?? 0, pe.reverbTime ?? 1.5)
            engine.updateActiveRegionDelay(rid, pe.delayTime ?? 300, pe.delayFeedback ?? 0)
            engine.updateActiveRegionPitch(rid, pe.pitchRate ?? 1.0, pe.keepPitch ?? false)
            setStatusMessage('✓ Preset geladen')
          }
        } else { alert('Ungültiges Preset-Format.') }
      }
    } catch (err: any) { alert('Fehler: ' + err.message) }
  }

  const handleSavePreset = async () => {
    if (!hasClip) return
    try {
      const baseName = selectedRegion!.file.name.replace(/\.[^/.]+$/, '')
      const result = await window.api.showSaveDialog({
        title: 'Effekt-Preset speichern (.owea)',
        defaultPath: `${baseName}_effects.owea`,
        filters: [{ name: 'Omega Wave Editor Audioeffekte', extensions: ['owea'] }]
      })
      if (!result.canceled && result.filePath) {
        const saveResult = await window.api.savePreset(result.filePath, { format: 'OWEA', version: '1.0.0', effects })
        if (saveResult.success) setStatusMessage('✓ Preset gespeichert')
        else alert('Fehler: ' + saveResult.error)
      }
    } catch (err: any) { alert('Fehler: ' + err.message) }
  }

  const handleResetEffects = () => {
    if (!hasClip) return
    updateEffects(defaultEffects)
    const rid = selectedRegion!.id
    defaultEffects.eqGains!.forEach((g, i) => engine.updateActiveRegionEQ(rid, i, g))
    engine.updateActiveRegionCompressor(rid, defaultEffects.compActive, defaultEffects.compThreshold, defaultEffects.compRatio)
    engine.updateActiveRegionDeEsser(rid, defaultEffects.deEsserActive, defaultEffects.deEsserReduction)
    engine.updateActiveRegionReverb(rid, defaultEffects.reverbMix, defaultEffects.reverbTime)
    engine.updateActiveRegionDelay(rid, defaultEffects.delayTime, defaultEffects.delayFeedback)
    engine.updateActiveRegionPitch(rid, defaultEffects.pitchRate, defaultEffects.keepPitch)
    setStatusMessage('✓ Effekte zurückgesetzt')
  }

  const handleCopyEffects = () => {
    if (!hasClip) return
    ;(window as any).__effectsClipboard = { ...effects }
    setStatusMessage('✓ Effekte kopiert')
  }

  const handlePasteEffects = () => {
    if (!hasClip) return
    const cb = (window as any).__effectsClipboard
    if (!cb) { alert('Keine Effekte in der Zwischenablage.'); return }
    updateEffects(cb)
    const rid = selectedRegion!.id
    if (cb.eqGains) cb.eqGains.forEach((g: number, i: number) => engine.updateActiveRegionEQ(rid, i, g))
    engine.updateActiveRegionCompressor(rid, cb.compActive ?? false, cb.compThreshold ?? -20, cb.compRatio ?? 4)
    engine.updateActiveRegionDeEsser(rid, cb.deEsserActive ?? false, cb.deEsserReduction ?? 6)
    engine.updateActiveRegionReverb(rid, cb.reverbMix ?? 0, cb.reverbTime ?? 1.5)
    engine.updateActiveRegionDelay(rid, cb.delayTime ?? 300, cb.delayFeedback ?? 0)
    engine.updateActiveRegionPitch(rid, cb.pitchRate ?? 1.0, cb.keepPitch ?? false)
    setStatusMessage('✓ Effekte eingefügt')
  }

  const handleApplyToAll = () => {
    if (!hasClip) return
    if (!confirm('Möchten Sie diese Effekte auf ALLE Audio-Objekte anwenden?')) return
    const updatedTracks = tracks.map((t: any) => ({
      ...t,
      regions: t.regions.map((r: any) => ({ ...r, effects: { ...effects } }))
    }))
    onTracksChange(updatedTracks)
    tracks.flatMap((t: any) => t.regions).forEach((r: any) => {
      if (effects.eqGains) effects.eqGains.forEach((g: number, i: number) => engine.updateActiveRegionEQ(r.id, i, g))
      engine.updateActiveRegionCompressor(r.id, effects.compActive ?? false, effects.compThreshold!, effects.compRatio!)
      engine.updateActiveRegionDeEsser(r.id, effects.deEsserActive!, effects.deEsserReduction!)
      engine.updateActiveRegionReverb(r.id, effects.reverbMix!, effects.reverbTime!)
      engine.updateActiveRegionDelay(r.id, effects.delayTime!, effects.delayFeedback!)
      engine.updateActiveRegionPitch(r.id, effects.pitchRate!, effects.keepPitch!)
    })
    setStatusMessage('✓ Auf alle angewendet')
  }

  const handleVstScan = async () => {
    setIsScanning(true)
    try {
      const plugins = await window.api.scanVstPlugins()
      setVstPlugins(plugins)
    } finally {
      setIsScanning(false)
    }
  }

  const handleOpenPlugin = async (vst: any) => {
    try {
      const result = await window.api.openVstUi(vst.path)
      if (!result.success) window.alert(result.error || 'Plugin-Hosting noch nicht implementiert.')
    } catch (err: any) {
      window.alert(err?.message || 'Plugin konnte nicht geöffnet werden.')
    }
  }

  // Toolbar-Styles
  const btnBase = 'p-1 px-2 text-[10px] border rounded flex items-center gap-1 transition-colors'
  const btnOn = 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300 hover:text-white'
  const btnOff = 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed opacity-40'

  const activePlugins = vstPlugins.filter(p => !p.blocked)

  // Aktuell gewähltes VST-Plugin (falls Item-ID einem Plugin gehört)
  const selectedVst = activePlugins.find(p => p.id === selectedItem)

  // Effekt-Items für die Sidebar
  const effectItems = [
    { id: 'eq',      label: 'Equalizer',          icon: '🎚️' },
    { id: 'comp',    label: 'Kompressor',          icon: '🗜️' },
    { id: 'reverb',  label: 'Hall / Reverb',       icon: '⛪' },
    { id: 'delay',   label: 'Echo / Delay',        icon: '🗣️' },
    { id: 'deesser', label: 'De-Esser',            icon: '🤫' },
    { id: 'pitch',   label: 'Pitch / Timestretch', icon: '⏱️' },
  ]

  return (
    <div className="flex flex-col h-full w-full bg-[#1e2124] text-omega-text text-sm select-none font-sans overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="h-10 border-b border-gray-700 bg-[#1a1d21] flex items-center justify-between px-3 flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasClip ? (
            <>
              <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold flex-shrink-0">Clip</span>
              <span className="text-xs text-omega-accent font-medium truncate" title={selectedRegion!.file.name}>
                {selectedRegion!.file.name}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-gray-600 italic">Kein Clip ausgewählt</span>
          )}
          {statusMessage && (
            <span className="text-[10px] text-green-400 font-medium flex-shrink-0 animate-pulse">{statusMessage}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleLoadPreset} disabled={!hasClip} className={`${btnBase} ${hasClip ? btnOn : btnOff}`}>
            <FolderOpen size={10} /> Laden
          </button>
          <button onClick={handleSavePreset} disabled={!hasClip} className={`${btnBase} ${hasClip ? btnOn : btnOff}`}>
            <Save size={10} /> Speichern
          </button>
          <div className="w-px h-4 bg-gray-700 mx-0.5" />
          <button onClick={handleCopyEffects} disabled={!hasClip} className={`${btnBase} ${hasClip ? btnOn : btnOff}`}>
            <Copy size={10} /> Kopieren
          </button>
          <button onClick={handlePasteEffects} disabled={!hasClip} className={`${btnBase} ${hasClip ? btnOn : btnOff}`}>
            <Clipboard size={10} /> Einfügen
          </button>
          <div className="w-px h-4 bg-gray-700 mx-0.5" />
          <button onClick={handleApplyToAll} disabled={!hasClip}
            className={`${btnBase} ${hasClip ? 'bg-omega-accent/20 border-omega-accent/40 hover:bg-omega-accent/40 text-omega-accent hover:text-white' : btnOff}`}>
            Auf alle
          </button>
          <button onClick={handleResetEffects} disabled={!hasClip} title="Effekte zurücksetzen"
            className={`p-1 rounded border transition-colors ${hasClip ? 'bg-[#282b30] hover:bg-gray-700 text-red-400 hover:text-red-300 border-gray-700' : 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed opacity-40'}`}>
            <RotateCcw size={10} />
          </button>
        </div>
      </div>

      {/* ── Zweispalten-Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══ LINKE SIDEBAR ══ */}
        <div className="w-44 flex-shrink-0 border-r border-gray-700/80 bg-[#1a1d21] flex flex-col overflow-y-auto">

          {/* Ordner: Effekte */}
          <SidebarFolder title="Effekte" open={effectsOpen} onToggle={() => setEffectsOpen(v => !v)}>
            {effectItems.map(item => (
              <SidebarItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={selectedItem === item.id}
                onClick={() => setSelectedItem(item.id)}
              />
            ))}
          </SidebarFolder>

          {/* Trennlinie */}
          <div className="h-px bg-gray-700/60 mx-2 my-1" />

          {/* Ordner: VST-Plugins */}
          <SidebarFolder
            title="VST-Plugins"
            open={vstOpen}
            onToggle={() => setVstOpen(v => !v)}
          >
            {activePlugins.length === 0 ? (
              <div className="pl-6 pr-2 py-2 text-[10px] text-gray-600 italic">
                Noch keine Plugins gescannt.
              </div>
            ) : (
              activePlugins.map(vst => {
                const isInstrument = vst.category?.toLowerCase().includes('instrument')
                return (
                  <SidebarItem
                    key={vst.id}
                    label={vst.name}
                    icon={isInstrument ? '🎹' : '🔌'}
                    active={selectedItem === vst.id}
                    onClick={() => setSelectedItem(vst.id)}
                    badge={vst.format}
                  />
                )
              })
            )}
            {/* Scan-Button am Ende der VST-Liste */}
            <button
              onClick={handleVstScan}
              disabled={isScanning}
              className="w-full flex items-center gap-1.5 pl-6 pr-2 py-1.5 text-[10px] text-omega-accent hover:bg-[#282b30] transition-colors disabled:opacity-40"
            >
              <RefreshCw size={10} className={isScanning ? 'animate-spin' : ''} />
              {isScanning ? 'Scannt...' : 'Scannen...'}
            </button>
          </SidebarFolder>
        </div>

        {/* ══ RECHTER INHALTSBEREICH ══ */}
        <div className="flex-1 overflow-y-auto bg-[#25282c]">

          {/* Hinweis wenn kein Clip */}
          {!hasClip && selectedItem !== '' && !selectedVst && (
            <div className="mx-4 mt-3 px-3 py-2 text-[10px] text-amber-400/80 bg-amber-950/10 border border-amber-900/20 rounded flex items-center gap-1.5">
              ⚠️ Clip in der Timeline auswählen, um Effekte anzuwenden.
            </div>
          )}

          <div className="p-4">

            {/* ── EQUALIZER ── */}
            {selectedItem === 'eq' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">🎚️ Equalizer</h3>
                <div className="flex justify-between items-end h-48 bg-[#1a1d21] p-3 rounded-xl border border-gray-700/80 relative">
                  {effects.eqGains!.map((gain: number, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-1 h-full flex-1">
                      <span className="text-[8px] text-omega-accent font-mono">
                        {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                      </span>
                      <div className="flex-1 w-2 bg-gray-800 rounded-full relative">
                        <div className="absolute w-full h-[1px] bg-gray-600 top-1/2 left-0 z-0" />
                        <div
                          className={`absolute w-full rounded-full transition-all duration-75 ${gain >= 0 ? 'bg-omega-accent' : 'bg-blue-600'}`}
                          style={{ top: gain > 0 ? 'auto' : '50%', bottom: gain < 0 ? 'auto' : '50%', height: `${Math.abs(gain / 15) * 50}%` }}
                        />
                        <input type="range" min="-15" max="15" step="0.1" value={gain}
                          onChange={e => handleEqChange(i, parseFloat(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
                        />
                      </div>
                      <span className="text-[8px] text-gray-600 font-mono">
                        {['60', '170', '310', '600', '800', '1k', '3k', '6k', '12k', '16k'][i]}
                      </span>
                      <button onClick={() => handleEqChange(i, 0)} className="text-[8px] text-gray-600 hover:text-gray-400" title="Reset">↺</button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-gray-600 uppercase tracking-widest font-bold px-1">
                  <span>Bässe</span><span>Mitten</span><span>Höhen</span>
                </div>
              </div>
            )}

            {/* ── KOMPRESSOR ── */}
            {selectedItem === 'comp' && (
              <div className="flex flex-col gap-4 max-w-sm">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">🗜️ Kompressor</h3>
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-[#1a1d21]/60 border border-gray-700/50">
                  <input type="checkbox" checked={effects.compActive || false}
                    onChange={e => updateEffects({ compActive: e.target.checked })}
                    className="w-4 h-4 rounded accent-omega-accent cursor-pointer" />
                  <span className="text-xs text-gray-300 font-medium select-none">Kompressor aktivieren</span>
                </label>
                <EffectSlider label="Threshold (Schwellwert)" min={-60} max={0} step={1} value={effects.compThreshold!} defaultValue={-20} unit="dB" onChange={v => updateEffects({ compThreshold: v })} />
                <EffectSlider label="Ratio (Verhältnis)" min={1} max={20} step={0.5} value={effects.compRatio!} defaultValue={4} unit=":1" onChange={v => updateEffects({ compRatio: v })} />
                <p className="text-[10px] text-gray-500 leading-relaxed p-3 bg-[#1a1d21]/60 rounded-lg border border-gray-700/60">
                  Sorgt für eine konsistente Dynamik innerhalb dieser Audio-Region. Dämpft laute Passagen und hebt leise Details an.
                </p>
              </div>
            )}

            {/* ── HALL / REVERB ── */}
            {selectedItem === 'reverb' && (
              <div className="flex flex-col gap-4 max-w-sm">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">⛪ Hall / Reverb</h3>
                <EffectSlider label="Dry / Wet Mix (Hallanteil)" min={0} max={100} step={1} value={effects.reverbMix!} defaultValue={0} unit="%" onChange={v => updateEffects({ reverbMix: v })} />
                <EffectSlider label="Nachhallzeit (Decay)" min={0.1} max={8.0} step={0.1} value={effects.reverbTime!} defaultValue={1.5} unit="s" onChange={v => updateEffects({ reverbTime: v })} />
                <p className="text-[10px] text-gray-500 leading-relaxed p-3 bg-[#1a1d21]/60 rounded-lg border border-gray-700/60">
                  Fügt räumliche Tiefe hinzu — von subtilem Studioraum bis hin zu weitläufigen Kathedralen.
                </p>
              </div>
            )}

            {/* ── ECHO / DELAY ── */}
            {selectedItem === 'delay' && (
              <div className="flex flex-col gap-4 max-w-sm">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">🗣️ Echo / Delay</h3>
                <EffectSlider label="Verzögerungszeit (Delay Time)" min={10} max={2000} step={10} value={effects.delayTime!} defaultValue={300} unit="ms" onChange={v => updateEffects({ delayTime: v })} />
                <EffectSlider label="Feedback (Wiederholungen)" min={0} max={99} step={1} value={effects.delayFeedback!} defaultValue={40} unit="%" onChange={v => updateEffects({ delayFeedback: v })} />
                <p className="text-[10px] text-gray-500 leading-relaxed p-3 bg-[#1a1d21]/60 rounded-lg border border-gray-700/60">
                  Erzeugt rhythmische, präzise Echos. Ideal für Soli oder Sound-Effekte im Stereobild.
                </p>
              </div>
            )}

            {/* ── DE-ESSER ── */}
            {selectedItem === 'deesser' && (
              <div className="flex flex-col gap-4 max-w-sm">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">🤫 De-Esser</h3>
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-[#1a1d21]/60 border border-gray-700/50">
                  <input type="checkbox" checked={effects.deEsserActive!}
                    onChange={e => updateEffects({ deEsserActive: e.target.checked })}
                    className="w-4 h-4 rounded accent-omega-accent cursor-pointer" />
                  <span className="text-xs text-gray-300 font-medium select-none">De-Esser aktivieren</span>
                </label>
                <EffectSlider label="Absenkung (S-Laute)" min={0} max={24} step={0.5} value={effects.deEsserReduction!} defaultValue={6} unit="dB" onChange={v => updateEffects({ deEsserReduction: v })} />
                <p className="text-[10px] text-gray-500 leading-relaxed p-3 bg-[#1a1d21]/60 rounded-lg border border-gray-700/60">
                  Dämpft scharfe S-, SCH- und Zischgeräusche in Sprach- und Gesangsaufnahmen dynamisch ab.
                </p>
              </div>
            )}

            {/* ── PITCH / TIMESTRETCH ── */}
            {selectedItem === 'pitch' && (
              <div className="flex flex-col gap-4 max-w-sm">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">⏱️ Pitch / Timestretch</h3>
                
                {/* Algorithm Dropdown */}
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#1a1d21]/60 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium">Algorithmus</span>
                    <select
                      value={effects.keepPitch ? 'timestretching' : 'resampling'}
                      onChange={e => updateEffects({ keepPitch: e.target.value === 'timestretching' })}
                      className="w-52 py-1 px-2.5 text-[11px] bg-[#101214] border border-gray-600 outline-none rounded text-omega-accent font-medium cursor-pointer focus:border-omega-accent transition-colors"
                    >
                      <option value="timestretching">Timestretching (Tonhöhe beibehalten)</option>
                      <option value="resampling">Resampling (Tonhöhe ändert sich)</option>
                    </select>
                  </div>
                </div>

                {/* Speed Slider */}
                <EffectSlider 
                  label="Faktor (Abspielgeschwindigkeit)" 
                  min={0.5} 
                  max={2.0} 
                  step={0.01} 
                  value={effects.pitchRate!} 
                  defaultValue={1.0} 
                  unit="x" 
                  onChange={v => updateEffects({ pitchRate: v })} 
                />

                {/* Length Input */}
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#1a1d21]/60 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium">Länge (Echtzeit-Dauer)</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-[#101214] border border-gray-600 rounded overflow-hidden h-6">
                        <input
                          type="text"
                          value={tempLength}
                          onChange={e => setTempLength(e.target.value)}
                          onBlur={handleLengthBlur}
                          onKeyDown={e => e.key === 'Enter' && handleLengthBlur()}
                          className="w-16 bg-transparent text-center text-[11px] text-omega-accent font-mono outline-none border-none py-0 px-1"
                        />
                        <span className="text-[10px] text-gray-500 pr-1 font-mono">s</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed p-3 bg-[#1a1d21]/60 rounded-lg border border-gray-700/60">
                  {effects.keepPitch
                    ? 'Passt das Tempo an, ohne die Tonhöhe zu verändern (Timestretching).'
                    : 'Ändert Geschwindigkeit und Tonhöhe gemeinsam (klassischer Bandmaschinen-Effekt).'}
                  <span className="block mt-1 text-omega-accent/70 font-semibold">1.0x = Originaltempo</span>
                </p>
              </div>
            )}

            {/* ── VST-PLUGIN DETAIL ── */}
            {selectedVst && (
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  {selectedVst.category?.toLowerCase().includes('instrument') ? '🎹' : '🔌'} {selectedVst.name}
                </h3>
                <div className="bg-[#1a1d21] border border-gray-700/80 rounded-xl p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-gray-600 uppercase tracking-wider font-bold block">Format</span>
                      <span className="text-gray-300">{selectedVst.format}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 uppercase tracking-wider font-bold block">Typ</span>
                      <span className={`font-medium ${selectedVst.category?.toLowerCase().includes('instrument') ? 'text-purple-400' : 'text-blue-400'}`}>
                        {selectedVst.category || 'Effekt'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 uppercase tracking-wider font-bold block">Hersteller</span>
                      <span className="text-gray-300">{selectedVst.manufacturer || 'Unbekannt'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 uppercase tracking-wider font-bold block">Status</span>
                      <span className="text-green-400">✓ Gescannt</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-600 break-all font-mono bg-black/20 p-2 rounded">
                    {selectedVst.path}
                  </div>
                  <button
                    onClick={() => handleOpenPlugin(selectedVst)}
                    className="w-full bg-omega-accent hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Plugin-Interface öffnen
                  </button>
                </div>
              </div>
            )}

            {/* ── FALLBACK wenn VST-Kategorie gewählt aber kein Plugin selektiert ── */}
            {!selectedVst && !effectItems.find(e => e.id === selectedItem) && (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-xs text-center">
                <span className="text-3xl mb-2">🔌</span>
                <span>Plugin in der Sidebar auswählen</span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="h-6 border-t border-gray-700 bg-[#1a1d21] flex items-center px-4 justify-between flex-shrink-0 text-[10px] text-gray-600">
        <span>Effekte wirken isoliert pro Clip – nicht destruktiv.</span>
        <span>Echtzeit-DSP aktiv</span>
      </div>
    </div>
  )
}
