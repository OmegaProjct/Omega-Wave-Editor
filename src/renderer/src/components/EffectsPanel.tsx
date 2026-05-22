import React, { useState, useEffect } from 'react'
import { RotateCcw, ChevronUp, ChevronDown, Save, FolderOpen, Copy, Clipboard, Check, RefreshCw } from 'lucide-react'
import { AudioEngine } from '../lib/AudioEngine'

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
}

interface EffectSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  defaultValue: number;
  unit?: string;
  onChange: (val: number) => void;
}

function EffectSlider({ label, min, max, step, value, defaultValue, unit = '', onChange }: EffectSliderProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    let num = parseFloat(inputValue);
    if (isNaN(num)) {
      setInputValue(value.toString());
      return;
    }
    num = Math.max(min, Math.min(max, num));
    onChange(num);
    setInputValue(num.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  const increment = () => {
    const next = Math.min(max, Math.round((value + step) * 100) / 100);
    onChange(next);
  };

  const decrement = () => {
    const next = Math.max(min, Math.round((value - step) * 100) / 100);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#1a1d21]/60 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-300 font-medium">{label}</span>
        
        {/* ValueSpinner & Reset */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#101214] border border-gray-600 rounded overflow-hidden h-6">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="w-12 bg-transparent text-center text-[11px] text-omega-accent font-mono outline-none border-none py-0 px-1"
            />
            {unit && <span className="text-[10px] text-gray-500 pr-1 select-none font-mono">{unit}</span>}
            <div className="flex flex-col border-l border-gray-600 h-full">
              <button 
                onClick={increment}
                className="flex-1 px-1.5 bg-[#1a1d21] hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center border-b border-gray-600 text-[6px]"
              >
                <ChevronUp size={8} />
              </button>
              <button 
                onClick={decrement}
                className="flex-1 px-1.5 bg-[#1a1d21] hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-[6px]"
              >
                <ChevronDown size={8} />
              </button>
            </div>
          </div>
          
          {/* Circular reset button */}
          <button
            onClick={() => onChange(defaultValue)}
            title="Auf Standardwert zurücksetzen"
            className="p-1 rounded bg-[#282b30] hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-600/50 transition-all hover:rotate-[-90deg] duration-300"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>
      
      {/* Premium Range Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-omega-accent"
      />
    </div>
  );
}

export function EffectsPanel({
  selectedRegionId,
  tracks,
  onTracksChange
}: {
  selectedRegionId: string | null;
  tracks: any[];
  onTracksChange: (tracks: any[]) => void;
}) {
  const [activeCategory, setActiveCategory] = useState('Equalizer')
  const [vstPlugins, setVstPlugins] = useState<any[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  
  const engine = AudioEngine.getInstance()

  // Find selected region
  const selectedRegion = tracks.flatMap((t: any) => t.regions).find((r: any) => r.id === selectedRegionId);

  // Default effect parameters
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
    delayFeedback: 40,
    pitchRate: 1.0
  };

  const effects = { ...defaultEffects, ...selectedRegion?.effects };

  // Status message auto-clear
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [statusMessage]);

  if (!selectedRegionId || !selectedRegion) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#1e2124] text-omega-text font-sans p-6 text-center select-none">
        <div className="bg-[#282b30] border border-gray-700/80 rounded-xl p-8 max-w-md shadow-2xl backdrop-blur-md">
          <div className="text-5xl mb-4 animate-pulse">🎚️</div>
          <h3 className="text-base font-semibold text-gray-200 mb-2">Kein Audio-Objekt ausgewählt</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Wählen Sie ein Audio-Objekt in der Timeline aus, um objektbasierte DSP-Effekte wie EQ, Kompressor, Reverb, Delay, De-Esser und Pitch in Echtzeit anzuwenden.
          </p>
        </div>
      </div>
    );
  }

  // Update helper
  const updateEffects = (newEffects: Partial<RegionEffects>) => {
    const updatedEffects = { ...effects, ...newEffects };
    
    // Update tracks state
    const updatedTracks = tracks.map((t: any) => ({
      ...t,
      regions: t.regions.map((r: any) => r.id === selectedRegion.id ? { ...r, effects: updatedEffects } : r)
    }));
    onTracksChange(updatedTracks);

    // Live update Web Audio DSP nodes
    const regionId = selectedRegion.id;
    
    if (newEffects.eqGains !== undefined) {
      newEffects.eqGains.forEach((g: number, idx: number) => {
        if (g !== effects.eqGains[idx]) {
          engine.updateActiveRegionEQ(regionId, idx, g);
        }
      });
    }
    if (newEffects.compThreshold !== undefined || newEffects.compRatio !== undefined) {
      const th = newEffects.compThreshold !== undefined ? newEffects.compThreshold : effects.compThreshold;
      const rt = newEffects.compRatio !== undefined ? newEffects.compRatio : effects.compRatio;
      engine.updateActiveRegionCompressor(regionId, th, rt);
    }
    if (newEffects.deEsserActive !== undefined || newEffects.deEsserReduction !== undefined) {
      const act = newEffects.deEsserActive !== undefined ? newEffects.deEsserActive : effects.deEsserActive;
      const red = newEffects.deEsserReduction !== undefined ? newEffects.deEsserReduction : effects.deEsserReduction;
      engine.updateActiveRegionDeEsser(regionId, act, red);
    }
    if (newEffects.reverbMix !== undefined || newEffects.reverbTime !== undefined) {
      const mix = newEffects.reverbMix !== undefined ? newEffects.reverbMix : effects.reverbMix;
      const time = newEffects.reverbTime !== undefined ? newEffects.reverbTime : effects.reverbTime;
      engine.updateActiveRegionReverb(regionId, mix, time);
    }
    if (newEffects.delayTime !== undefined || newEffects.delayFeedback !== undefined) {
      const dTime = newEffects.delayTime !== undefined ? newEffects.delayTime : effects.delayTime;
      const dFb = newEffects.delayFeedback !== undefined ? newEffects.delayFeedback : effects.delayFeedback;
      engine.updateActiveRegionDelay(regionId, dTime, dFb);
    }
    if (newEffects.pitchRate !== undefined) {
      engine.updateActiveRegionPitch(regionId, newEffects.pitchRate);
    }
  };

  const handleEqChange = (index: number, value: number) => {
    const newGains = [...effects.eqGains];
    newGains[index] = value;
    updateEffects({ eqGains: newGains });
  };

  // --- Preset-Toolbar Handlers ---
  const handleLoadPreset = async () => {
    try {
      const result = await window.api.showOpenDialog({
        title: 'Effekt-Preset laden (.owea)',
        filters: [{ name: 'Omega Wave Editor Audioeffekte', extensions: ['owea'] }],
        properties: ['openFile']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        const path = result.filePaths[0];
        const loadResult = await window.api.loadProject(path); // loaded as JSON
        if (loadResult.success && loadResult.data && loadResult.data.format === 'OWEA') {
          const presetEffects = loadResult.data.effects;
          if (presetEffects) {
            updateEffects(presetEffects);
            
            // Push active live updates to engine immediately
            const regionId = selectedRegion.id;
            if (presetEffects.eqGains) {
              presetEffects.eqGains.forEach((g: number, idx: number) => {
                engine.updateActiveRegionEQ(regionId, idx, g);
              });
            }
            engine.updateActiveRegionCompressor(regionId, presetEffects.compThreshold ?? -20, presetEffects.compRatio ?? 4);
            engine.updateActiveRegionDeEsser(regionId, presetEffects.deEsserActive ?? false, presetEffects.deEsserReduction ?? 6);
            engine.updateActiveRegionReverb(regionId, presetEffects.reverbMix ?? 0, presetEffects.reverbTime ?? 1.5);
            engine.updateActiveRegionDelay(regionId, presetEffects.delayTime ?? 300, presetEffects.delayFeedback ?? 40);
            engine.updateActiveRegionPitch(regionId, presetEffects.pitchRate ?? 1.0);
            
            setStatusMessage('✓ Preset erfolgreich geladen');
          }
        } else {
          alert('Ungültiges Preset-Format.');
        }
      }
    } catch (err: any) {
      alert('Preset konnte nicht geladen werden: ' + err.message);
    }
  };

  const handleSavePreset = async () => {
    try {
      const baseName = selectedRegion.file.name.replace(/\.[^/.]+$/, "");
      const result = await window.api.showSaveDialog({
        title: 'Effekt-Preset speichern (.owea)',
        defaultPath: `${baseName}_effects.owea`,
        filters: [{ name: 'Omega Wave Editor Audioeffekte', extensions: ['owea'] }]
      });
      if (!result.canceled && result.filePath) {
        const data = {
          format: 'OWEA',
          version: '1.0.0',
          effects: effects
        };
        const saveResult = await window.api.savePreset(result.filePath, data);
        if (saveResult.success) {
          setStatusMessage('✓ Preset erfolgreich gespeichert');
        } else {
          alert('Fehler beim Speichern des Presets: ' + saveResult.error);
        }
      }
    } catch (err: any) {
      alert('Fehler beim Speichern des Presets: ' + err.message);
    }
  };

  const handleResetEffects = () => {
    updateEffects(defaultEffects);
    
    // Live update Web Audio
    const regionId = selectedRegion.id;
    defaultEffects.eqGains.forEach((g: number, idx: number) => {
      engine.updateActiveRegionEQ(regionId, idx, g);
    });
    engine.updateActiveRegionCompressor(regionId, defaultEffects.compThreshold, defaultEffects.compRatio);
    engine.updateActiveRegionDeEsser(regionId, defaultEffects.deEsserActive, defaultEffects.deEsserReduction);
    engine.updateActiveRegionReverb(regionId, defaultEffects.reverbMix, defaultEffects.reverbTime);
    engine.updateActiveRegionDelay(regionId, defaultEffects.delayTime, defaultEffects.delayFeedback);
    engine.updateActiveRegionPitch(regionId, defaultEffects.pitchRate);
    
    setStatusMessage('✓ Effekte zurückgesetzt');
  };

  const handleCopyEffects = () => {
    (window as any).__effectsClipboard = { ...effects };
    setStatusMessage('✓ Effekte kopiert');
  };

  const handlePasteEffects = () => {
    const clipboard = (window as any).__effectsClipboard;
    if (clipboard) {
      updateEffects(clipboard);
      
      // Live update Web Audio
      const regionId = selectedRegion.id;
      if (clipboard.eqGains) {
        clipboard.eqGains.forEach((g: number, idx: number) => {
          engine.updateActiveRegionEQ(regionId, idx, g);
        });
      }
      engine.updateActiveRegionCompressor(regionId, clipboard.compThreshold ?? -20, clipboard.compRatio ?? 4);
      engine.updateActiveRegionDeEsser(regionId, clipboard.deEsserActive ?? false, clipboard.deEsserReduction ?? 6);
      engine.updateActiveRegionReverb(regionId, clipboard.reverbMix ?? 0, clipboard.reverbTime ?? 1.5);
      engine.updateActiveRegionDelay(regionId, clipboard.delayTime ?? 300, clipboard.delayFeedback ?? 40);
      engine.updateActiveRegionPitch(regionId, clipboard.pitchRate ?? 1.0);
      
      setStatusMessage('✓ Effekte eingefügt');
    } else {
      alert('Keine Effekte in der Zwischenablage.');
    }
  };

  const handleApplyToAll = () => {
    if (confirm('Möchten Sie diese Effekte auf ALLE Audio-Objekte im Projekt anwenden?')) {
      const updatedTracks = tracks.map((t: any) => ({
        ...t,
        regions: t.regions.map((r: any) => ({
          ...r,
          effects: { ...effects }
        }))
      }));
      onTracksChange(updatedTracks);
      
      // Live update Web Audio for all active playing regions
      tracks.flatMap((t: any) => t.regions).forEach((r: any) => {
        const regionId = r.id;
        if (effects.eqGains) {
          effects.eqGains.forEach((g: number, idx: number) => {
            engine.updateActiveRegionEQ(regionId, idx, g);
          });
        }
        engine.updateActiveRegionCompressor(regionId, effects.compThreshold, effects.compRatio);
        engine.updateActiveRegionDeEsser(regionId, effects.deEsserActive, effects.deEsserReduction);
        engine.updateActiveRegionReverb(regionId, effects.reverbMix, effects.reverbTime);
        engine.updateActiveRegionDelay(regionId, effects.delayTime, effects.delayFeedback);
        engine.updateActiveRegionPitch(regionId, effects.pitchRate);
      });

      setStatusMessage('✓ Effekte auf alle Objekte angewendet');
    }
  };

  const handleVstScan = async () => {
    const plugins = await window.api.scanVstPlugins();
    setVstPlugins(plugins);
  };

  const categories = [
    { name: 'Equalizer', icon: '🎚️' },
    { name: 'Kompressor', icon: '🗜️' },
    { name: 'Hall / Reverb', icon: '⛪' },
    { name: 'Echo / Delay', icon: '🗣️' },
    { name: 'De-Esser', icon: '🤫' },
    { name: 'Pitch / Timestretch', icon: '⏱️' },
    { name: 'VST Plugins', icon: '🔌' }
  ];

  return (
    <div className="flex h-full w-full bg-[#1e2124] text-omega-text text-sm select-none font-sans overflow-hidden">
      
      {/* Sidebar: Categories */}
      <div className="w-52 border-r border-omega-border flex flex-col overflow-y-auto bg-[#1a1d21] flex-shrink-0">
        <div className="p-3 border-b border-gray-700 flex flex-col gap-1">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Audio-Objekt</span>
          <span className="text-xs text-omega-accent font-semibold truncate" title={selectedRegion.file.name}>
            {selectedRegion.file.name}
          </span>
        </div>
        <div className="flex-1 py-2">
          {categories.map(cat => (
            <div
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center px-4 py-2 cursor-pointer text-xs transition-colors ${
                activeCategory === cat.name ? 'bg-omega-accent text-white font-medium' : 'hover:bg-[#282b30] text-gray-300'
              }`}
            >
              <span className="mr-3 opacity-80 text-sm">{cat.icon}</span>
              <span className="flex-1 truncate">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#25282c] overflow-hidden relative">
        
        {/* Preset-Toolbar */}
        <div className="h-10 border-b border-gray-700 bg-[#1e2124] flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-200">{activeCategory}</span>
            {statusMessage && (
              <span className="text-[11px] text-green-400 font-medium animate-pulse">{statusMessage}</span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleLoadPreset}
              title="Preset laden (.owea)"
              className="p-1 px-2 text-[10px] bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <FolderOpen size={11} /> Laden
            </button>
            <button
              onClick={handleSavePreset}
              title="Preset speichern (.owea)"
              className="p-1 px-2 text-[10px] bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Save size={11} /> Speichern
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button
              onClick={handleCopyEffects}
              title="Effekt-Kette kopieren"
              className="p-1 px-2 text-[10px] bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Copy size={11} /> Kopieren
            </button>
            <button
              onClick={handlePasteEffects}
              title="Effekt-Kette einfügen"
              className="p-1 px-2 text-[10px] bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Clipboard size={11} /> Einfügen
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button
              onClick={handleApplyToAll}
              title="Auf alle Objekte anwenden"
              className="p-1 px-2 text-[10px] bg-omega-accent/20 border border-omega-accent/40 rounded hover:bg-omega-accent/40 text-omega-accent hover:text-white flex items-center gap-1 transition-colors"
            >
              Auf alle anwenden
            </button>
            <button
              onClick={handleResetEffects}
              title="Effekte zurücksetzen"
              className="p-1 rounded bg-[#282b30] hover:bg-gray-700 text-red-400 hover:text-red-300 border border-gray-700 transition-colors"
            >
              <RotateCcw size={11} />
            </button>
          </div>
        </div>

        {/* Categories Panels */}
        <div className="flex-1 p-5 overflow-y-auto scrollbar-hide">
          {activeCategory === 'Equalizer' ? (
            <div className="flex flex-col gap-5 h-full">
              <div className="flex justify-between items-end h-56 bg-[#1a1d21] p-4 rounded-xl border border-gray-700/80 relative shadow-inner">
                {effects.eqGains.map((gain: number, i: number) => (
                  <div key={i} className="flex flex-col items-center gap-2 h-full flex-1">
                    <span className="text-[10px] text-omega-accent font-mono font-bold">{gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}</span>
                    <div className="flex-1 w-2 bg-gray-800 rounded-full relative">
                      {/* Zero line */}
                      <div className="absolute w-full h-[1px] bg-gray-600 top-1/2 left-0 z-0"></div>
                      
                      {/* Fader fill */}
                      <div 
                        className={`absolute w-full rounded-full transition-all duration-75 ${gain >= 0 ? 'bg-omega-accent' : 'bg-blue-600'}`}
                        style={{ 
                          top: gain > 0 ? 'auto' : '50%', 
                          bottom: gain < 0 ? 'auto' : '50%', 
                          height: `${Math.abs(gain / 15) * 50}%` 
                        }}
                      ></div>
                      
                      {/* Range input slider */}
                      <input 
                        type="range" min="-15" max="15" step="0.1" value={gain} 
                        onChange={(e) => handleEqChange(i, parseFloat(e.target.value))} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any} 
                      />
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono font-medium">{[60, 170, 310, 600, 800, 1000, 3000, 6000, 12000, 16000][i]}Hz</span>
                    
                    {/* Tiny reset button per band */}
                    <button
                      onClick={() => handleEqChange(i, 0)}
                      className="p-0.5 rounded text-[8px] bg-gray-800 text-gray-400 hover:text-white"
                      title="Band zurücksetzen"
                    >
                      ↺
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest font-bold border-t border-gray-700/50 pt-3 px-2">
                <span>Bässe</span><span>Mitten</span><span>Höhen</span>
              </div>
            </div>
          ) : activeCategory === 'Kompressor' ? (
            <div className="flex flex-col gap-4 max-w-md">
              <EffectSlider
                label="Threshold (Schwellwert)"
                min={-60}
                max={0}
                step={1}
                value={effects.compThreshold}
                defaultValue={-20}
                unit="dB"
                onChange={(v) => updateEffects({ compThreshold: v })}
              />
              <EffectSlider
                label="Ratio (Verhältnis)"
                min={1}
                max={20}
                step={0.5}
                value={effects.compRatio}
                defaultValue={4}
                unit=":1"
                onChange={(v) => updateEffects({ compRatio: v })}
              />
              <div className="p-4 bg-[#141619]/60 rounded-lg border border-gray-700/60 text-xs text-gray-400 leading-relaxed shadow-inner">
                Der Objekt-Kompressor sorgt für eine konsistente Dynamik innerhalb dieser Audio-Region. Er dämpft laute Passagen und hebt den leisen Detailreichtum an, um Durchsetzungsfähigkeit im Mix zu garantieren.
              </div>
            </div>
          ) : activeCategory === 'Hall / Reverb' ? (
            <div className="flex flex-col gap-4 max-w-md">
              <EffectSlider
                label="Dry / Wet Mix (Hallanteil)"
                min={0}
                max={100}
                step={1}
                value={effects.reverbMix}
                defaultValue={0}
                unit="%"
                onChange={(v) => updateEffects({ reverbMix: v })}
              />
              <EffectSlider
                label="Nachhallzeit (Decay)"
                min={0.1}
                max={8.0}
                step={0.1}
                value={effects.reverbTime}
                defaultValue={1.5}
                unit="s"
                onChange={(v) => updateEffects({ reverbTime: v })}
              />
              <div className="p-4 bg-[#141619]/60 rounded-lg border border-gray-700/60 text-xs text-gray-400 leading-relaxed shadow-inner">
                Fügt dieser Audio-Region plastische, räumliche Tiefe hinzu. Von subtilem Studioraum bis hin zu endlos nachhallenden Kathedralen.
              </div>
            </div>
          ) : activeCategory === 'Echo / Delay' ? (
            <div className="flex flex-col gap-4 max-w-md">
              <EffectSlider
                label="Verzögerungzeit (Delay Time)"
                min={10}
                max={2000}
                step={10}
                value={effects.delayTime}
                defaultValue={300}
                unit="ms"
                onChange={(v) => updateEffects({ delayTime: v })}
              />
              <EffectSlider
                label="Feedback (Wiederholungen)"
                min={0}
                max={99}
                step={1}
                value={effects.delayFeedback}
                defaultValue={40}
                unit="%"
                onChange={(v) => updateEffects({ delayFeedback: v })}
              />
              <div className="p-4 bg-[#141619]/60 rounded-lg border border-gray-700/60 text-xs text-gray-400 leading-relaxed shadow-inner">
                Erzeugt rhythmische, präzise Echos. Perfekt geeignet, um Soli oder Sound-Effekte im Stereobild zu veredeln.
              </div>
            </div>
          ) : activeCategory === 'De-Esser' ? (
            <div className="flex flex-col gap-4 max-w-md">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1d21]/60 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                <input
                  type="checkbox"
                  id="deEsserActiveCheckbox"
                  checked={effects.deEsserActive}
                  onChange={(e) => updateEffects({ deEsserActive: e.target.checked })}
                  className="w-4 h-4 rounded text-omega-accent bg-gray-900 border-gray-600 focus:ring-0 accent-omega-accent cursor-pointer"
                />
                <label htmlFor="deEsserActiveCheckbox" className="text-xs text-gray-300 font-medium select-none cursor-pointer">
                  De-Esser aktivieren
                </label>
              </div>
              <EffectSlider
                label="Absenkung (S-Laute)"
                min={0}
                max={24}
                step={0.5}
                value={effects.deEsserReduction}
                defaultValue={6}
                unit="dB"
                onChange={(v) => updateEffects({ deEsserReduction: v })}
              />
              <div className="p-4 bg-[#141619]/60 rounded-lg border border-gray-700/60 text-xs text-gray-400 leading-relaxed shadow-inner">
                Dämpft scharfe S-, SCH- und Zischgeräusche in Gesangs- und Sprachaufnahmen ab 6 kHz dynamisch ab, ohne die restlichen Frequenzen an Transparenz einzubüßen.
              </div>
            </div>
          ) : activeCategory === 'Pitch / Timestretch' ? (
            <div className="flex flex-col gap-4 max-w-md">
              <EffectSlider
                label="Tonhöhe / Abspielgeschwindigkeit"
                min={0.5}
                max={2.0}
                step={0.01}
                value={effects.pitchRate}
                defaultValue={1.0}
                unit="x"
                onChange={(v) => updateEffects({ pitchRate: v })}
              />
              <div className="p-4 bg-[#141619]/60 rounded-lg border border-gray-700/60 text-xs text-gray-400 leading-relaxed shadow-inner">
                Ändert die Abspielgeschwindigkeit und die relative Tonhöhe des Objekts in Echtzeit. 
                <br />
                <span className="text-[10px] text-omega-accent font-semibold">Tipp: 1.0x entspricht der Originaltonhöhe.</span>
              </div>
            </div>
          ) : activeCategory === 'VST Plugins' ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2 bg-[#1a1d21] p-3 rounded-lg border border-gray-700">
                <span className="text-xs text-gray-300 font-medium">Installierte VST Instrumente & Effekte</span>
                <button
                  onClick={handleVstScan}
                  className="bg-omega-accent hover:bg-blue-500 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Scannen
                </button>
              </div>
              {vstPlugins.length === 0 ? (
                <div className="text-center p-8 border border-gray-700/80 border-dashed rounded-lg text-gray-500 text-xs bg-black/10">
                  Klicken Sie auf "Scannen", um VST2/VST3-Plugins auf Ihrem Windows-System zu lokalisieren.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {vstPlugins.map((vst, idx) => (
                    <div key={idx} className="bg-[#1a1d21] border border-gray-700/80 p-3 rounded-lg flex justify-between items-center hover:border-gray-500 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-200 text-xs">{vst.name}</span>
                        <span className="text-[9px] text-gray-500">{vst.type} | Version {vst.version}</span>
                      </div>
                      <button
                        onClick={() => window.api.openVstUi(vst.path)}
                        className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-[11px] text-white transition-colors"
                      >
                        Interface öffnen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">Unbekannter Effekt.</div>
          )}
        </div>
        
        {/* Footer info bar */}
        <div className="h-6 border-t border-gray-700 bg-[#1a1d21] flex items-center px-4 justify-between flex-shrink-0 text-[10px] text-gray-500">
          <span>Objekt-DSP-Effekte wirken isoliert pro Clip und verändern die Audiospur nicht destruktiv.</span>
          <span>Echtzeit-Verarbeitung aktiv</span>
        </div>
      </div>
    </div>
  )
}
