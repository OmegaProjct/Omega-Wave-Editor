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

// === EffectSlider – unverändert ===
function EffectSlider({ label, min, max, step, value, defaultValue, unit = '', onChange }: EffectSliderProps) {
  const [inputValue, setInputValue] = useState(value.toString())

  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)

  const handleInputBlur = () => {
    let num = parseFloat(inputValue)
    if (isNaN(num)) { setInputValue(value.toString()); return }
    num = Math.max(min, Math.min(max, num))
    onChange(num)
    setInputValue(num.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleInputBlur()
  }

  const increment = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100))
  const decrement = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100))

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#1a1d21]/60 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-300 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#101214] border border-gray-600 rounded overflow-hidden h-6">
            <input
              type="text" value={inputValue}
              onChange={handleInputChange} onBlur={handleInputBlur} onKeyDown={handleKeyDown}
              className="w-12 bg-transparent text-center text-[11px] text-omega-accent font-mono outline-none border-none py-0 px-1"
            />
            {unit && <span className="text-[10px] text-gray-500 pr-1 select-none font-mono">{unit}</span>}
            <div className="flex flex-col border-l border-gray-600 h-full">
              <button onClick={increment} className="flex-1 px-1.5 bg-[#1a1d21] hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center border-b border-gray-600">
                <ChevronDown size={7} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button onClick={decrement} className="flex-1 px-1.5 bg-[#1a1d21] hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center">
                <ChevronDown size={7} />
              </button>
            </div>
          </div>
          <button onClick={() => onChange(defaultValue)} title="Auf Standardwert zurücksetzen"
            className="p-1 rounded bg-[#282b30] hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-600/50 transition-all hover:rotate-[-90deg] duration-300">
            <RotateCcw size={11} />
          </button>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-omega-accent"
      />
    </div>
  )
}

// === Haupt-Akkordeon-Sektion ===
function AccordionSection({
  title, open, onToggle, children, badge, accentColor
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: string
  accentColor?: 'blue' | 'default'
}) {
  return (
    <div className="border-b border-gray-700/80 last:border-b-0">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
          accentColor === 'blue'
            ? 'bg-omega-accent/10 text-omega-accent hover:bg-omega-accent/20'
            : 'bg-[#1a1d21] text-gray-200 hover:bg-[#282b30]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {badge && (
            <span className="text-[9px] bg-omega-accent/20 text-omega-accent px-1.5 py-0.5 rounded-full font-normal normal-case tracking-normal">
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && <div className="bg-[#1e2124]">{children}</div>}
    </div>
  )
}

// === Untersektion innerhalb von Audioeffekte ===
function EffectSubSection({
  title, icon, open, onToggle, children, disabled
}: {
  title: string
  icon: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="border-b border-gray-800/50 last:border-b-0">
      <button
        onClick={disabled ? undefined : onToggle}
        className={`w-full flex items-center gap-2 px-5 py-2 text-xs transition-colors ${
          disabled
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:text-gray-200 hover:bg-[#282b30]'
        }`}
      >
        <span className={disabled ? 'opacity-30' : 'opacity-80'}>{icon}</span>
        <span className="flex-1 text-left font-medium">{title}</span>
        {!disabled && (open ? <ChevronDown size={11} /> : <ChevronRight size={11} />)}
      </button>
      {open && !disabled && (
        <div className="px-4 pb-4 pt-1">{children}</div>
      )}
    </div>
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

  // Aktiven Clip verfolgen (auch wenn abgewählt)
  const [lastSelectedRegionId, setLastSelectedRegionId] = useState<string | null>(null)
  useEffect(() => {
    if (selectedRegionId) setLastSelectedRegionId(selectedRegionId)
  }, [selectedRegionId])

  const activeId = selectedRegionId || lastSelectedRegionId
  const selectedRegion = tracks.flatMap((t: any) => t.regions).find((r: any) => r.id === activeId)
  const hasClip = !!selectedRegion

  // Statusmeldung
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [statusMessage])

  // VST-Status
  const [vstPlugins, setVstPlugins] = useState<any[]>([])
  const [isScanning, setIsScanning] = useState(false)

  // Akkordeon-Zustände
  const [effectsOpen, setEffectsOpen] = useState(true)
  const [vstOpen, setVstOpen] = useState(true)

  // Untersektion-Zustände
  const [eqOpen, setEqOpen] = useState(true)
  const [compOpen, setCompOpen] = useState(false)
  const [reverbOpen, setReverbOpen] = useState(false)
  const [delayOpen, setDelayOpen] = useState(false)
  const [deEsserOpen, setDeEsserOpen] = useState(false)
  const [pitchOpen, setPitchOpen] = useState(false)

  // Beim Start vorhandene Plugin-Registry laden (stumm)
  useEffect(() => {
    window.api.scanVstPlugins().then((plugins: any[]) => {
      setVstPlugins(plugins)
    }).catch(() => {})
  }, [])

  // Standard-Effektwerte
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

  // Effekte aktualisieren – nur wenn Clip ausgewählt
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
    if (newEffects.compThreshold !== undefined || newEffects.compRatio !== undefined) {
      engine.updateActiveRegionCompressor(rid, newEffects.compThreshold ?? effects.compThreshold!, newEffects.compRatio ?? effects.compRatio!)
    }
    if (newEffects.deEsserActive !== undefined || newEffects.deEsserReduction !== undefined) {
      engine.updateActiveRegionDeEsser(rid, newEffects.deEsserActive ?? effects.deEsserActive!, newEffects.deEsserReduction ?? effects.deEsserReduction!)
    }
    if (newEffects.reverbMix !== undefined || newEffects.reverbTime !== undefined) {
      engine.updateActiveRegionReverb(rid, newEffects.reverbMix ?? effects.reverbMix!, newEffects.reverbTime ?? effects.reverbTime!)
    }
    if (newEffects.delayTime !== undefined || newEffects.delayFeedback !== undefined) {
      engine.updateActiveRegionDelay(rid, newEffects.delayTime ?? effects.delayTime!, newEffects.delayFeedback ?? effects.delayFeedback!)
    }
    if (newEffects.pitchRate !== undefined || newEffects.keepPitch !== undefined) {
      engine.updateActiveRegionPitch(rid, newEffects.pitchRate ?? effects.pitchRate!, newEffects.keepPitch ?? effects.keepPitch!)
    }
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
            engine.updateActiveRegionCompressor(rid, pe.compThreshold ?? -20, pe.compRatio ?? 4)
            engine.updateActiveRegionDeEsser(rid, pe.deEsserActive ?? false, pe.deEsserReduction ?? 6)
            engine.updateActiveRegionReverb(rid, pe.reverbMix ?? 0, pe.reverbTime ?? 1.5)
            engine.updateActiveRegionDelay(rid, pe.delayTime ?? 300, pe.delayFeedback ?? 0)
            engine.updateActiveRegionPitch(rid, pe.pitchRate ?? 1.0, pe.keepPitch ?? false)
            setStatusMessage('✓ Preset geladen')
          }
        } else {
          alert('Ungültiges Preset-Format.')
        }
      }
    } catch (err: any) {
      alert('Preset konnte nicht geladen werden: ' + err.message)
    }
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
    } catch (err: any) {
      alert('Fehler: ' + err.message)
    }
  }

  const handleResetEffects = () => {
    if (!hasClip) return
    updateEffects(defaultEffects)
    const rid = selectedRegion!.id
    defaultEffects.eqGains!.forEach((g, i) => engine.updateActiveRegionEQ(rid, i, g))
    engine.updateActiveRegionCompressor(rid, defaultEffects.compThreshold, defaultEffects.compRatio)
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
    engine.updateActiveRegionCompressor(rid, cb.compThreshold ?? -20, cb.compRatio ?? 4)
    engine.updateActiveRegionDeEsser(rid, cb.deEsserActive ?? false, cb.deEsserReduction ?? 6)
    engine.updateActiveRegionReverb(rid, cb.reverbMix ?? 0, cb.reverbTime ?? 1.5)
    engine.updateActiveRegionDelay(rid, cb.delayTime ?? 300, cb.delayFeedback ?? 0)
    engine.updateActiveRegionPitch(rid, cb.pitchRate ?? 1.0, cb.keepPitch ?? false)
    setStatusMessage('✓ Effekte eingefügt')
  }

  const handleApplyToAll = () => {
    if (!hasClip) return
    if (!confirm('Möchten Sie diese Effekte auf ALLE Audio-Objekte im Projekt anwenden?')) return
    const updatedTracks = tracks.map((t: any) => ({
      ...t,
      regions: t.regions.map((r: any) => ({ ...r, effects: { ...effects } }))
    }))
    onTracksChange(updatedTracks)
    tracks.flatMap((t: any) => t.regions).forEach((r: any) => {
      if (effects.eqGains) effects.eqGains.forEach((g: number, i: number) => engine.updateActiveRegionEQ(r.id, i, g))
      engine.updateActiveRegionCompressor(r.id, effects.compThreshold!, effects.compRatio!)
      engine.updateActiveRegionDeEsser(r.id, effects.deEsserActive!, effects.deEsserReduction!)
      engine.updateActiveRegionReverb(r.id, effects.reverbMix!, effects.reverbTime!)
      engine.updateActiveRegionDelay(r.id, effects.delayTime!, effects.delayFeedback!)
      engine.updateActiveRegionPitch(r.id, effects.pitchRate!, effects.keepPitch!)
    })
    setStatusMessage('✓ Auf alle angewendet')
  }

  // VST-Scan auslösen
  const handleVstScan = async () => {
    setIsScanning(true)
    try {
      const plugins = await window.api.scanVstPlugins()
      setVstPlugins(plugins)
    } finally {
      setIsScanning(false)
    }
  }

  // VST-Plugin öffnen
  const handleOpenPlugin = async (vst: any) => {
    try {
      const result = await window.api.openVstUi(vst.path)
      if (!result.success) window.alert(result.error || 'Plugin-Hosting ist in diesem Prototyp noch nicht implementiert.')
    } catch (err: any) {
      window.alert(err?.message || 'Plugin konnte nicht geöffnet werden.')
    }
  }

  // Toolbar-Button-Styles
  const btnBase = 'p-1 px-2 text-[10px] border rounded flex items-center gap-1 transition-colors'
  const btnOn = 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300 hover:text-white'
  const btnOff = 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed opacity-40'

  // Aktive Plugins (nicht blockiert)
  const activePlugins = vstPlugins.filter(p => !p.blocked)
  const instrumentCount = activePlugins.filter(p => p.category?.toLowerCase().includes('instrument')).length
  const effectCount = activePlugins.length - instrumentCount

  return (
    <div className="flex flex-col h-full w-full bg-[#1e2124] text-omega-text text-sm select-none font-sans overflow-hidden">

      {/* === Toolbar-Leiste === */}
      <div className="h-10 border-b border-gray-700 bg-[#1a1d21] flex items-center justify-between px-3 flex-shrink-0 gap-2">
        {/* Clip-Anzeige */}
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

        {/* Preset-Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleLoadPreset} disabled={!hasClip} title="Preset laden (.owea)" className={`${btnBase} ${hasClip ? btnOn : btnOff}`}>
            <FolderOpen size={10} /> Laden
          </button>
          <button onClick={handleSavePreset} disabled={!hasClip} title="Preset speichern (.owea)" className={`${btnBase} ${hasClip ? btnOn : btnOff}`}>
            <Save size={10} /> Speichern
          </button>
          <div className="w-px h-4 bg-gray-700 mx-0.5" />
          <button onClick={handleCopyEffects} disabled={!hasClip} title="Effekt-Kette kopieren" className={`${btnBase} ${hasClip ? btnOn : btnOff}`}>
            <Copy size={10} /> Kopieren
          </button>
          <button onClick={handlePasteEffects} disabled={!hasClip} title="Effekt-Kette einfügen" className={`${btnBase} ${hasClip ? btnOn : btnOff}`}>
            <Clipboard size={10} /> Einfügen
          </button>
          <div className="w-px h-4 bg-gray-700 mx-0.5" />
          <button
            onClick={handleApplyToAll}
            disabled={!hasClip}
            title="Auf alle Objekte anwenden"
            className={`${btnBase} ${hasClip ? 'bg-omega-accent/20 border-omega-accent/40 hover:bg-omega-accent/40 text-omega-accent hover:text-white' : btnOff}`}
          >
            Auf alle
          </button>
          <button
            onClick={handleResetEffects}
            disabled={!hasClip}
            title="Effekte zurücksetzen"
            className={`p-1 rounded border transition-colors ${hasClip ? 'bg-[#282b30] hover:bg-gray-700 text-red-400 hover:text-red-300 border-gray-700' : 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed opacity-40'}`}
          >
            <RotateCcw size={10} />
          </button>
        </div>
      </div>

      {/* === Scrollbarer Hauptbereich === */}
      <div className="flex-1 overflow-y-auto">

        {/* ── AUDIOEFFEKTE ── */}
        <AccordionSection title="Audioeffekte" open={effectsOpen} onToggle={() => setEffectsOpen(v => !v)}>

          {/* Hinweis wenn kein Clip aktiv */}
          {!hasClip && (
            <div className="px-4 py-2 text-[10px] text-amber-400/80 bg-amber-950/10 border-b border-amber-900/20 flex items-center gap-1.5">
              ⚠️ Clip in der Timeline auswählen, um Effekte anzuwenden.
            </div>
          )}

          {/* Equalizer */}
          <EffectSubSection title="Equalizer" icon="🎚️" open={eqOpen} onToggle={() => setEqOpen(v => !v)} disabled={!hasClip}>
            <div className="flex justify-between items-end h-44 bg-[#1a1d21] p-3 rounded-lg border border-gray-700/80 relative">
              {effects.eqGains!.map((gain: number, i: number) => (
                <div key={i} className="flex flex-col items-center gap-1 h-full flex-1">
                  <span className="text-[8px] text-omega-accent font-mono">{gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}</span>
                  <div className="flex-1 w-2 bg-gray-800 rounded-full relative">
                    <div className="absolute w-full h-[1px] bg-gray-600 top-1/2 left-0 z-0" />
                    <div
                      className={`absolute w-full rounded-full transition-all duration-75 ${gain >= 0 ? 'bg-omega-accent' : 'bg-blue-600'}`}
                      style={{ top: gain > 0 ? 'auto' : '50%', bottom: gain < 0 ? 'auto' : '50%', height: `${Math.abs(gain / 15) * 50}%` }}
                    />
                    <input
                      type="range" min="-15" max="15" step="0.1" value={gain}
                      onChange={(e) => handleEqChange(i, parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
                    />
                  </div>
                  <span className="text-[8px] text-gray-600 font-mono">
                    {['60', '170', '310', '600', '800', '1k', '3k', '6k', '12k', '16k'][i]}
                  </span>
                  <button onClick={() => handleEqChange(i, 0)} className="text-[8px] text-gray-600 hover:text-gray-400" title="Band zurücksetzen">↺</button>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-gray-600 uppercase tracking-widest font-bold mt-2 px-1">
              <span>Bässe</span><span>Mitten</span><span>Höhen</span>
            </div>
          </EffectSubSection>

          {/* Kompressor */}
          <EffectSubSection title="Kompressor" icon="🗜️" open={compOpen} onToggle={() => setCompOpen(v => !v)} disabled={!hasClip}>
            <div className="flex flex-col gap-3">
              <EffectSlider label="Threshold (Schwellwert)" min={-60} max={0} step={1} value={effects.compThreshold!} defaultValue={-20} unit="dB" onChange={(v) => updateEffects({ compThreshold: v })} />
              <EffectSlider label="Ratio (Verhältnis)" min={1} max={20} step={0.5} value={effects.compRatio!} defaultValue={4} unit=":1" onChange={(v) => updateEffects({ compRatio: v })} />
              <div className="p-3 bg-[#141619]/60 rounded-lg border border-gray-700/60 text-[10px] text-gray-500 leading-relaxed">
                Sorgt für eine konsistente Dynamik innerhalb dieser Audio-Region.
              </div>
            </div>
          </EffectSubSection>

          {/* Hall / Reverb */}
          <EffectSubSection title="Hall / Reverb" icon="⛪" open={reverbOpen} onToggle={() => setReverbOpen(v => !v)} disabled={!hasClip}>
            <div className="flex flex-col gap-3">
              <EffectSlider label="Dry / Wet Mix (Hallanteil)" min={0} max={100} step={1} value={effects.reverbMix!} defaultValue={0} unit="%" onChange={(v) => updateEffects({ reverbMix: v })} />
              <EffectSlider label="Nachhallzeit (Decay)" min={0.1} max={8.0} step={0.1} value={effects.reverbTime!} defaultValue={1.5} unit="s" onChange={(v) => updateEffects({ reverbTime: v })} />
            </div>
          </EffectSubSection>

          {/* Echo / Delay */}
          <EffectSubSection title="Echo / Delay" icon="🗣️" open={delayOpen} onToggle={() => setDelayOpen(v => !v)} disabled={!hasClip}>
            <div className="flex flex-col gap-3">
              <EffectSlider label="Verzögerungszeit (Delay Time)" min={10} max={2000} step={10} value={effects.delayTime!} defaultValue={300} unit="ms" onChange={(v) => updateEffects({ delayTime: v })} />
              <EffectSlider label="Feedback (Wiederholungen)" min={0} max={99} step={1} value={effects.delayFeedback!} defaultValue={40} unit="%" onChange={(v) => updateEffects({ delayFeedback: v })} />
            </div>
          </EffectSubSection>

          {/* De-Esser */}
          <EffectSubSection title="De-Esser" icon="🤫" open={deEsserOpen} onToggle={() => setDeEsserOpen(v => !v)} disabled={!hasClip}>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-[#1a1d21]/60 border border-gray-700/50">
                <input
                  type="checkbox" checked={effects.deEsserActive!}
                  onChange={(e) => updateEffects({ deEsserActive: e.target.checked })}
                  className="w-4 h-4 rounded text-omega-accent bg-gray-900 border-gray-600 focus:ring-0 accent-omega-accent cursor-pointer"
                />
                <span className="text-xs text-gray-300 font-medium select-none">De-Esser aktivieren</span>
              </label>
              <EffectSlider label="Absenkung (S-Laute)" min={0} max={24} step={0.5} value={effects.deEsserReduction!} defaultValue={6} unit="dB" onChange={(v) => updateEffects({ deEsserReduction: v })} />
            </div>
          </EffectSubSection>

          {/* Pitch / Timestretch */}
          <EffectSubSection title="Pitch / Timestretch" icon="⏱️" open={pitchOpen} onToggle={() => setPitchOpen(v => !v)} disabled={!hasClip}>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-[#1a1d21]/60 border border-gray-700/50">
                <input
                  type="checkbox" checked={effects.keepPitch!}
                  onChange={(e) => updateEffects({ keepPitch: e.target.checked })}
                  className="w-4 h-4 rounded text-omega-accent bg-gray-900 border-gray-600 focus:ring-0 accent-omega-accent cursor-pointer"
                />
                <span className="text-xs text-gray-300 font-medium select-none">Tonhöhe beibehalten (Time-Stretching)</span>
              </label>
              <EffectSlider label="Abspielgeschwindigkeit / Tempo" min={0.5} max={2.0} step={0.01} value={effects.pitchRate!} defaultValue={1.0} unit="x" onChange={(v) => updateEffects({ pitchRate: v })} />
              <div className="p-3 bg-[#141619]/60 rounded-lg border border-gray-700/60 text-[10px] text-gray-500 leading-relaxed">
                {effects.keepPitch
                  ? 'Passt das Tempo an, ohne die Tonhöhe zu verändern (Timestretching).'
                  : 'Ändert Geschwindigkeit und Tonhöhe gemeinsam (klassischer Bandmaschinen-Effekt).'}
                <span className="block mt-1 text-omega-accent/70 font-semibold">Tipp: 1.0x = Originaltempo</span>
              </div>
            </div>
          </EffectSubSection>

        </AccordionSection>

        {/* ── VST-PLUGINS ── */}
        <AccordionSection
          title="VST-Plugins"
          open={vstOpen}
          onToggle={() => setVstOpen(v => !v)}
          badge={activePlugins.length > 0 ? `${activePlugins.length}` : undefined}
          accentColor="blue"
        >
          <div className="p-3">

            {/* Header mit Statistik und Scan-Button */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-gray-500">
                {activePlugins.length === 0
                  ? 'Keine Plugins gefunden'
                  : `${instrumentCount} Instrument${instrumentCount !== 1 ? 'e' : ''} · ${effectCount} Effekt${effectCount !== 1 ? 'e' : ''}`
                }
              </span>
              <button
                onClick={handleVstScan}
                disabled={isScanning}
                className="bg-omega-accent hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-[10px] transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={10} className={isScanning ? 'animate-spin' : ''} />
                {isScanning ? 'Scannt...' : 'Scannen'}
              </button>
            </div>

            {/* Plugin-Liste oder Leer-Zustand */}
            {activePlugins.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-700/60 rounded-lg text-gray-600 text-[10px] bg-black/10 leading-relaxed">
                Klicke auf „Scannen", um installierte VST-Plugins zu finden.<br />
                <span className="text-gray-700">Standard-Ordner werden automatisch durchsucht.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {activePlugins.map((vst) => {
                  const isInstrument = vst.category?.toLowerCase().includes('instrument')
                  return (
                    <div
                      key={vst.id}
                      className="bg-[#1a1d21] border border-gray-700/60 p-2.5 rounded-lg flex justify-between items-center hover:border-gray-500 transition-colors group"
                    >
                      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        <span className="text-xs font-semibold text-gray-200 truncate">{vst.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${isInstrument ? 'bg-purple-900/40 text-purple-300' : 'bg-blue-900/30 text-blue-300'}`}>
                            {isInstrument ? 'Instrument' : 'Effekt'}
                          </span>
                          <span className="text-[9px] text-gray-600">{vst.format}</span>
                          {vst.manufacturer && vst.manufacturer !== 'Unbekannt' && (
                            <span className="text-[9px] text-gray-600 truncate">· {vst.manufacturer}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenPlugin(vst)}
                        className="ml-2 flex-shrink-0 bg-gray-700 hover:bg-gray-600 px-2.5 py-1 rounded text-[10px] text-white transition-colors opacity-50 group-hover:opacity-100"
                      >
                        Öffnen
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </AccordionSection>

      </div>

      {/* === Footer === */}
      <div className="h-6 border-t border-gray-700 bg-[#1a1d21] flex items-center px-4 justify-between flex-shrink-0 text-[10px] text-gray-600">
        <span>Effekte wirken isoliert pro Clip – nicht destruktiv.</span>
        <span>Echtzeit-DSP aktiv</span>
      </div>
    </div>
  )
}
