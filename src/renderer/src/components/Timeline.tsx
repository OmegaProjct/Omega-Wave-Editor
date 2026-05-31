import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useAnimationFrame } from 'framer-motion'
import { WaveformRenderer } from './WaveformRenderer'
import { HistoryManager } from '../lib/HistoryManager'
import { Play, Square, SkipBack, SkipForward, Plus, Minus, MousePointer2, Scissors, Music, ChevronDown, MoveHorizontal, Maximize2, Unlock, Eye, Volume2, Lock, Zap, Mic, Magnet, Link, Unlink, RotateCcw, RotateCw } from 'lucide-react'
import { AudioCleaningModal } from './AudioCleaningModal'
import { ObjectPropertiesModal } from './ObjectPropertiesModal'
import { AudioRecordingModal } from './AudioRecordingModal'
import { AudioEngine } from '../lib/AudioEngine'
import { ProjectManager } from '../lib/ProjectManager'
import * as projectCore from '../../../common/projectCore'
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  KeyboardShortcuts,
  matchesShortcut,
  normalizeKeyboardShortcuts
} from '../lib/keyboardShortcuts'

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

export type Region = {
  id: string
  file: { name: string; path: string; isDirectory: boolean }
  startPos: number 
  duration: number 
  sourceOffset?: number
  fileDuration?: number
  color: string
  fadeIn?: number    // seconds
  fadeOut?: number   // seconds
  gain?: number      // linear multiplier, 1.0 = 0dB
  groupId?: string   // group membership
  stereoMode?: 'stereo' | 'left-only' | 'right-only'
  effects?: RegionEffects
}

export const REGION_COLORS: { label: string; value: string }[] = [
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

export type Track = {
  id: string
  index: number
  name: string
  regions: Region[]
  muted: boolean
  solo: boolean
  locked: boolean
  visible: boolean
  volume: number
  height: number
  automation: { time: number, value: number }[]
}

const PIXELS_PER_SECOND_BASE = 50 

export function Timeline({ 
  onTracksChange, 
  onOpenExport,
  externalAction,
  initialTracks,
  selectedRegionIds = new Set(),
  onSelectedRegionIdsChange,
  keyboardShortcuts = DEFAULT_KEYBOARD_SHORTCUTS
}: { 
  onTracksChange?: (tracks: Track[]) => void, 
  onOpenExport?: (customTracks?: Track[], selection?: { selectionStart: number | null; selectionEnd: number | null }, customExportSettings?: any) => void,
  externalAction?: { type: string; payload?: any },
  initialTracks?: Track[],
  selectedRegionIds?: Set<string>,
  onSelectedRegionIdsChange?: (ids: Set<string>) => void,
  keyboardShortcuts?: KeyboardShortcuts
}) {
  const engine = AudioEngine.getInstance()
  const [zoomLevel, setZoomLevel] = useState(1)
  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoomLevel
  
  const totalTimelineWidth = 600 * pixelsPerSecond 
  
  const [trackHeight, setTrackHeight] = useState(64)
  const [tracks, setTracks] = useState<Track[]>(initialTracks || [
    { id: '1', index: 1, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '2', index: 2, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '3', index: 3, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '4', index: 4, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
  ])
  const [sampleRate, setSampleRate] = useState<number>(48000)
  const [autoScroll, setAutoScroll] = useState<'Aus' | 'Langsam' | 'Schnell'>('Schnell')
  const [spacebarStops, setSpacebarStops] = useState<boolean>(false)
  const [activeShortcuts, setActiveShortcuts] = useState<KeyboardShortcuts>(normalizeKeyboardShortcuts(keyboardShortcuts))
  const playbackStartPosRef = useRef<number>(0)

  const [playheadPos, setPlayheadPos] = useState<number>(0)
  const playheadPosRef = useRef(0)
  const isDraggingPlayheadRef = useRef(false)
  const playheadMotionX = useMotionValue(128)
  // playheadRulerMotionWidth removed – the blue bar is now an independent export selection marker
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showAudioRecording, setShowAudioRecording] = useState(false)
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [exportSettings, setExportSettings] = useState<any>(null)
  const selectedRegionId = selectedRegionIds.size > 0 ? [...selectedRegionIds][0] : null
  const setSelectedRegionIds = useCallback((ids: Set<string>) => {
    if (onSelectedRegionIdsChange) {
      onSelectedRegionIdsChange(ids)
    }
  }, [onSelectedRegionIdsChange])
  const setSelectedRegionId = useCallback((id: string | null) => {
    setSelectedRegionIds(id ? new Set([id]) : new Set())
  }, [setSelectedRegionIds])
  const [draggingRegion, setDraggingRegion] = useState<{ id: string, trackId: string, initialStartPos: number, startX: number, action: 'move' | 'trimStart' | 'trimEnd', initialDuration: number, initialSourceOffset: number, initialFileDuration: number } | null>(null)
  // Lasso / Rubber-Band Selection
  const [lassoRect, setLassoRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const lassoStartRef = useRef<{ x: number; y: number } | null>(null)
  const isLassoActiveRef = useRef(false)
  const [toolMode, setToolMode] = useState<'select' | 'scissors'>('select')
  const [clipboard, setClipboard] = useState<Region | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  // Snap / Magnet
  const [snapEnabled, setSnapEnabled] = useState(false)
  // Gain dragging
  const [draggingGain, setDraggingGain] = useState<{ regionId: string; containerTop: number; containerHeight: number; startY?: number; startGain?: number } | null>(null)
  // Fade dragging
  const [draggingFade, setDraggingFade] = useState<{ regionId: string; edge: 'in' | 'out'; startX: number; startValue: number } | null>(null)
  // Hover state for gain line
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null)
  // Dragging state tracking to prevent click propagation
  const justDraggedRef = useRef(false)
  // Color submenu
  const [colorSubmenuOpen, setColorSubmenuOpen] = useState(false)
  const [dbSubmenuOpen, setDbSubmenuOpen] = useState(false)
  const [effectsSubmenuOpen, setEffectsSubmenuOpen] = useState(false)
  const [resetSubmenuOpen, setResetSubmenuOpen] = useState(false)
  const [stereoSubmenuOpen, setStereoSubmenuOpen] = useState(false)
  const [normalizeSubmenuOpen, setNormalizeSubmenuOpen] = useState(false)
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showAutomation, setShowAutomation] = useState(false)
  const [effectsClipboard, setEffectsClipboard] = useState<RegionEffects | null>(null)

  const [perfStats, setPerfStats] = useState<{ cpuUsage: number; processRamBytes: number; systemRamPct: number; systemCpuPct: number }>({ cpuUsage: 0, processRamBytes: 0, systemRamPct: 0, systemCpuPct: 0 });
  const [globalProgress, setGlobalProgress] = useState<number | null>(null);
  const [globalProgressLabel, setGlobalProgressLabel] = useState<string>('');

  useEffect(() => {
    setActiveShortcuts(normalizeKeyboardShortcuts(keyboardShortcuts))
  }, [keyboardShortcuts])

  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const stats = await window.api.getPerformanceStats();
        if (active && stats) {
          setPerfStats(stats);
        }
      } catch (err) {
        console.error('Error polling performance stats:', err);
      }
    }, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleProgress = (e: Event) => {
      const customEvent = e as CustomEvent<{ progress: number | null; label?: string }>;
      if (customEvent.detail) {
        setGlobalProgress(customEvent.detail.progress);
        setGlobalProgressLabel(customEvent.detail.label || '');
      }
    };
    window.addEventListener('SET_GLOBAL_PROGRESS', handleProgress);
    return () => {
      window.removeEventListener('SET_GLOBAL_PROGRESS', handleProgress);
    };
  }, []);

  // Ref to prevent feedback loop: when we call onTracksChange ourselves,
  // the parent reflects it back via initialTracks – we must not re-apply it.
  const isInternalUpdateRef = useRef(false);

  const updateTracksWithHistory = (newTracks: Track[]) => {
    HistoryManager.pushState(tracks);
    setTracks(newTracks);
    if (onTracksChange) {
      isInternalUpdateRef.current = true;
      onTracksChange(newTracks);
      // Reset on the next microtask, after the state propagation settles
      Promise.resolve().then(() => { isInternalUpdateRef.current = false; });
    }
  }

  const dbOptions = [
    { label: '+20 dB', value: 10.0 },
    { label: '+12 dB', value: 3.98 },
    { label: '+6 dB', value: 1.995 },
    { label: '+3 dB', value: 1.41 },
    { label: '0 dB', value: 1.0 },
    { label: '-3 dB', value: 0.707 },
    { label: '-6 dB', value: 0.501 },
    { label: '-12 dB', value: 0.251 },
    { label: '-20 dB', value: 0.1 },
    { label: 'Ton aus', value: 0.0 }
  ]

  const GapCloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1">
      <rect x="2" y="4" width="7" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="15" y="14" width="7" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <path d="M10 7h4M14 7l-2-2M14 7l-2 2" />
      <path d="M14 17h-4M10 17l2-2M10 17l2 2" />
    </svg>
  )

  const updateRegionGain = (regionId: string, newGain: number) => {
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => r.id === regionId ? { ...r, gain: newGain } : r)
    }));
    updateTracksWithHistory(newTracks);
    engine.updateActiveRegionVolume(regionId, newGain);
  };

  const normalizePeak = async (regionId: string) => {
    const region = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
    if (!region) return;
    try {
      const buffer = await engine.loadFile(region.file.path);
      let maxVal = 0.0001;
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          const abs = Math.abs(data[i]);
          if (abs > maxVal) maxVal = abs;
        }
      }
      const newGain = 1.0 / maxVal;
      updateRegionGain(regionId, newGain);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'error', title: 'Normalisierung fehlgeschlagen', message: err.message } }));
    }
  };

  const normalizeRMS = async (regionId: string) => {
    const region = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
    if (!region) return;
    try {
      const buffer = await engine.loadFile(region.file.path);
      let sum = 0;
      let totalSamples = 0;
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
        }
        totalSamples += data.length;
      }
      const rms = Math.sqrt(sum / (totalSamples || 1));
      const targetRms = 0.0707;
      const newGain = Math.max(0.01, Math.min(4.0, targetRms / (rms || 0.0001)));
      updateRegionGain(regionId, newGain);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'error', title: 'Normalisierung fehlgeschlagen', message: err.message } }));
    }
  };

  const splitStereoRegion = async (regionId: string) => {
    const region = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
    if (!region) return;
    const currentTrack = tracks.find(t => t.regions.some(r => r.id === regionId));
    if (!currentTrack) return;
    
    const leftRegion = {
      ...region,
      stereoMode: 'left-only' as const,
      file: { ...region.file, name: region.file.name + ' (Mono L)' }
    };

    const rightRegion = {
      ...region,
      id: Math.random().toString(36).substr(2, 9),
      stereoMode: 'right-only' as const,
      file: { ...region.file, name: region.file.name + ' (Mono R)' }
    };

    const trackIdx = tracks.findIndex(t => t.id === currentTrack.id);
    let targetTrackId = '';
    let updatedTracks = [...tracks];
    
    if (trackIdx === tracks.length - 1) {
      const nextIdx = tracks.length + 1;
      const newTrack = { id: nextIdx.toString(), index: nextIdx, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] };
      updatedTracks.push(newTrack);
      targetTrackId = newTrack.id;
    } else {
      targetTrackId = tracks[trackIdx + 1].id;
    }

    updatedTracks = updatedTracks.map(t => {
      if (t.id === currentTrack.id) {
        return {
          ...t,
          regions: t.regions.map(r => r.id === regionId ? leftRegion : r)
        };
      }
      if (t.id === targetTrackId) {
        return {
          ...t,
          regions: [...t.regions, rightRegion]
        };
      }
      return t;
    });

    updateTracksWithHistory(updatedTracks);
  };

  const setStereoMode = (regionId: string, mode: 'stereo' | 'left-only' | 'right-only') => {
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => r.id === regionId ? { ...r, stereoMode: mode } : r)
    }));
    updateTracksWithHistory(newTracks);
  };

  const resetTrackCurves = (type: 'volume' | 'pan') => {
    const newTracks = tracks.map(t => {
      if (type === 'volume') {
        engine.setTrackVolume(t.id, 1.0);
        return { ...t, volume: 1.0 };
      } else {
        engine.setTrackPan(t.id, 0.0);
        return { ...t, pan: 0.0 };
      }
    });
    updateTracksWithHistory(newTracks);
  };

  const copyEffects = (regionId: string) => {
    const region = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
    if (region && region.effects) {
      setEffectsClipboard({ ...region.effects });
    } else {
      setEffectsClipboard({ eqGains: new Array(10).fill(0), compThreshold: 0, compRatio: 1, deEsserActive: false, deEsserReduction: 0, reverbMix: 0, reverbTime: 1.5, delayTime: 300, delayFeedback: 0, pitchRate: 1.0 });
    }
  };

  const pasteEffects = (regionId: string) => {
    if (!effectsClipboard) return;
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => {
        if (r.id === regionId) {
          const updated = { ...r, effects: { ...effectsClipboard } };
          if (engine.isPlaying) {
            const eff = effectsClipboard;
            if (eff.eqGains) eff.eqGains.forEach((g, i) => engine.updateActiveRegionEQ(regionId, i, g));
            if (eff.compThreshold !== undefined && eff.compRatio !== undefined) engine.updateActiveRegionCompressor(regionId, eff.compThreshold, eff.compRatio);
            if (eff.deEsserActive !== undefined && eff.deEsserReduction !== undefined) engine.updateActiveRegionDeEsser(regionId, eff.deEsserActive, eff.deEsserReduction);
            if (eff.reverbMix !== undefined && eff.reverbTime !== undefined) engine.updateActiveRegionReverb(regionId, eff.reverbMix, eff.reverbTime);
            if (eff.delayTime !== undefined && eff.delayFeedback !== undefined) engine.updateActiveRegionDelay(regionId, eff.delayTime, eff.delayFeedback);
            if (eff.pitchRate !== undefined) engine.updateActiveRegionPitch(regionId, eff.pitchRate);
          }
          return updated;
        }
        return r;
      })
    }));
    updateTracksWithHistory(newTracks);
  };

  const resetEffects = (regionId: string) => {
    const defaults = { eqGains: new Array(10).fill(0), compThreshold: 0, compRatio: 1, deEsserActive: false, deEsserReduction: 0, reverbMix: 0, reverbTime: 1.5, delayTime: 300, delayFeedback: 0, pitchRate: 1.0 };
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => {
        if (r.id === regionId) {
          const updated = { ...r, effects: defaults };
          if (engine.isPlaying) {
            defaults.eqGains.forEach((g, i) => engine.updateActiveRegionEQ(regionId, i, g));
            engine.updateActiveRegionCompressor(regionId, 0, 1);
            engine.updateActiveRegionDeEsser(regionId, false, 0);
            engine.updateActiveRegionReverb(regionId, 0, 1.5);
            engine.updateActiveRegionDelay(regionId, 300, 0);
            engine.updateActiveRegionPitch(regionId, 1.0);
          }
          return updated;
        }
        return r;
      })
    }));
    updateTracksWithHistory(newTracks);
  };

  const applyEffectsToAll = (regionId: string, followingOnly: boolean = false) => {
    const sourceRegion = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
    if (!sourceRegion) return;
    const eff = sourceRegion.effects || { eqGains: new Array(10).fill(0), compThreshold: 0, compRatio: 1, deEsserActive: false, deEsserReduction: 0, reverbMix: 0, reverbTime: 1.5, delayTime: 300, delayFeedback: 0, pitchRate: 1.0 };
    
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => {
        if (r.id === regionId) return r;
        if (followingOnly && r.startPos <= sourceRegion.startPos) return r;
        
        const updated = { ...r, effects: { ...eff } };
        if (engine.isPlaying) {
          if (eff.eqGains) eff.eqGains.forEach((g, i) => engine.updateActiveRegionEQ(r.id, i, g));
          if (eff.compThreshold !== undefined && eff.compRatio !== undefined) engine.updateActiveRegionCompressor(r.id, eff.compThreshold, eff.compRatio);
          if (eff.deEsserActive !== undefined && eff.deEsserReduction !== undefined) engine.updateActiveRegionDeEsser(r.id, eff.deEsserActive, eff.deEsserReduction);
          if (eff.reverbMix !== undefined && eff.reverbTime !== undefined) engine.updateActiveRegionReverb(r.id, eff.reverbMix, eff.reverbTime);
          if (eff.delayTime !== undefined && eff.delayFeedback !== undefined) engine.updateActiveRegionDelay(r.id, eff.delayTime, eff.delayFeedback);
          if (eff.pitchRate !== undefined) engine.updateActiveRegionPitch(r.id, eff.pitchRate);
        }
        return updated;
      })
    }));
    updateTracksWithHistory(newTracks);
  };

  const saveEffectsPreset = async (regionId: string) => {
    const region = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
    if (!region) return;
    const effects = region.effects || { eqGains: new Array(10).fill(0), compThreshold: 0, compRatio: 1, deEsserActive: false, deEsserReduction: 0, reverbMix: 0, reverbTime: 1.5, delayTime: 300, delayFeedback: 0, pitchRate: 1.0 };
    
    const res = await window.api.showSaveDialog({ filters: [{ name: 'Omega Wave Editor Audioeffekte', extensions: ['owea'] }] });
    if (!res.canceled && res.filePath) {
      await window.api.savePreset(res.filePath, { format: 'OWEA_EFFECTS', version: '1.0.0', effects });
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Erfolg', message: 'Effekte gespeichert (.owea)' } }));
    }
  };

  const loadEffectsPreset = async (regionId: string) => {
    const res = await window.api.showOpenDialog({ filters: [{ name: 'Omega Wave Editor Audioeffekte', extensions: ['owea'] }], properties: ['openFile'] });
    if (!res.canceled && res.filePaths.length > 0) {
      const result = await window.api.loadProject(res.filePaths[0]);
      if (result.success && result.data.format === 'OWEA_EFFECTS') {
        const eff = result.data.effects;
        const newTracks = tracks.map(t => ({
          ...t,
          regions: t.regions.map(r => {
            if (r.id === regionId) {
              const updated = { ...r, effects: { ...eff } };
              if (engine.isPlaying) {
                 if (eff.eqGains) eff.eqGains.forEach((g: number, i: number) => engine.updateActiveRegionEQ(regionId, i, g));
                if (eff.compThreshold !== undefined && eff.compRatio !== undefined) engine.updateActiveRegionCompressor(regionId, eff.compThreshold, eff.compRatio);
                if (eff.deEsserActive !== undefined && eff.deEsserReduction !== undefined) engine.updateActiveRegionDeEsser(regionId, eff.deEsserActive, eff.deEsserReduction);
                if (eff.reverbMix !== undefined && eff.reverbTime !== undefined) engine.updateActiveRegionReverb(regionId, eff.reverbMix, eff.reverbTime);
                if (eff.delayTime !== undefined && eff.delayFeedback !== undefined) engine.updateActiveRegionDelay(regionId, eff.delayTime, eff.delayFeedback);
                if (eff.pitchRate !== undefined) engine.updateActiveRegionPitch(regionId, eff.pitchRate);
              }
              return updated;
            }
            return r;
          })
        }));
        updateTracksWithHistory(newTracks);
        window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Erfolg', message: 'Effekt-Preset geladen.' } }));
      } else {
        window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'error', title: 'Fehler', message: 'Ungültiges Preset-Format.' } }));
      }
    }
  };

  const closeAllGaps = useCallback(() => {
    const flatRegions: { region: Region; trackId: string }[] = [];
    tracks.forEach(track => {
      track.regions.forEach(region => {
        flatRegions.push({ region: { ...region }, trackId: track.id });
      });
    });

    if (flatRegions.length === 0) {
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Lücken schließen', message: 'Keine Audio-Objekte im Projekt vorhanden.' } }));
      return;
    }

    flatRegions.sort((a, b) => a.region.startPos - b.region.startPos);

    // Erstes Objekt wird auf 0.0s verschoben, um führende Lücken zu schließen
    let cumulativeShift = flatRegions[0].region.startPos;
    flatRegions[0].region.startPos = 0;
    let prevEnd = flatRegions[0].region.duration;
    
    for (let i = 1; i < flatRegions.length; i++) {
      const item = flatRegions[i];
      item.region.startPos -= cumulativeShift;
      
      const currentStart = item.region.startPos;
      if (currentStart > prevEnd) {
        const gap = currentStart - prevEnd;
        cumulativeShift += gap;
        item.region.startPos -= gap;
      }
      
      prevEnd = Math.max(prevEnd, item.region.startPos + item.region.duration);
    }

    const updatedTracks = tracks.map(track => {
      const trackRegions = flatRegions
        .filter(item => item.trackId === track.id)
        .map(item => item.region);
      return {
        ...track,
        regions: trackRegions
      };
    });

    updateTracksWithHistory(updatedTracks);
  }, [tracks, updateTracksWithHistory]);

  // --- CORE FUNCTIONS (Defined early to avoid initialization errors) ---

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      const curTime = engine.currentTime
      engine.pause()
      setIsPlaying(false)
      if (!spacebarStops) {
        setPlayheadPos(playbackStartPosRef.current)
        playheadPosRef.current = playbackStartPosRef.current
      } else {
        setPlayheadPos(curTime)
        playheadPosRef.current = curTime
      }
    } else {
      const startPos = playheadPosRef.current
      playbackStartPosRef.current = startPos
      engine.play({ tracks }, startPos)
      setIsPlaying(true)
    }
  }, [isPlaying, engine, tracks, spacebarStops])

  const handleSaveRecord = async (filePath: string, durationSec: number) => {
    const filename = filePath.split(/[\\/]/).pop() || 'Aufnahme.wav';
    const newRegion: Region = {
      id: Math.random().toString(36).substr(2, 9),
      file: { name: filename, path: filePath, isDirectory: false },
      startPos: playheadPos,
      duration: durationSec,
      fileDuration: durationSec,
      sourceOffset: 0,
      color: 'bg-red-600'
    };
    updateTracksWithHistory(tracks.map((t, i) => i === 0 ? { ...t, regions: [...t.regions, newRegion] } : t));
  };

  const handleCopy = useCallback(() => {
    const region = tracks.flatMap(t => t.regions).find(r => r.id === selectedRegionId);
    if (region) {
      setClipboard({ ...region, id: Math.random().toString(36).substr(2, 9) });
    }
  }, [selectedRegionId, tracks]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const selectedTrack = tracks.find(t => t.regions.some(r => r.id === selectedRegionId)) || tracks[0];
    const newRegion = { ...clipboard, id: Math.random().toString(36).substr(2, 9), startPos: playheadPos };
    const newTracks = tracks.map(t => t.id === selectedTrack.id ? { ...t, regions: [...t.regions, newRegion] } : t);
    updateTracksWithHistory(newTracks);
    setSelectedRegionId(newRegion.id);
  }, [clipboard, tracks, playheadPos, selectedRegionId]);

  // Helper: delete all selected regions
  const deleteSelectedRegions = useCallback(() => {
    if (selectedRegionIds.size === 0) return;
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.filter(r => !selectedRegionIds.has(r.id))
    }));
    updateTracksWithHistory(newTracks);
    setSelectedRegionIds(new Set());
  }, [selectedRegionIds, tracks]);

  // --- EXTERNAL ACTIONS HANDLER ---
  useEffect(() => {
    if (!externalAction) return;

    const handleAction = async () => {
      if (externalAction.type === 'SET_TRACKS') {
        setTracks(externalAction.payload);
      } else if (externalAction.type === 'RESET_PROJECT') {
        const { sampleRate: rate = 48000, tracksCount = 4 } = externalAction.payload || {};
        const resetTracks = [];
        for (let i = 1; i <= tracksCount; i++) {
          resetTracks.push({
            id: i.toString(),
            index: i,
            name: '',
            regions: [],
            muted: false,
            solo: false,
            locked: false,
            visible: true,
            volume: 1,
            height: 64,
            automation: []
          });
        }
        setTracks(resetTracks);
        if (onTracksChange) onTracksChange(resetTracks);
        setPlayheadPos(0);
        setSampleRate(rate);
        setSelectionStart(null);
        setSelectionEnd(null);
        ProjectManager.reset();
        window.dispatchEvent(new CustomEvent('PROJECT_RESET'));
      } else if (externalAction.type === 'SAVE_PROJECT') {
        let path = ProjectManager.getCurrentPath();
        if (!path) {
          const res = await window.api.showSaveDialog({ filters: [{ name: 'Omega Projects', extensions: ['owep'] }] });
          if (res.canceled || !res.filePath) return;
          path = res.filePath;
        }
        const saveRes = await ProjectManager.saveProject(path, tracks, { zoomLevel, playheadPos, sampleRate, exportSettings });
        if (saveRes.success) {
          window.dispatchEvent(new CustomEvent('PROJECT_SAVED', { detail: { path } }));
          window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Erfolg', message: 'Projekt gespeichert.' } }));
        }
      } else if (externalAction.type === 'LOAD_PROJECT' || externalAction.type === 'LOAD_PROJECT_DIRECT') {
        let filePath = externalAction.payload;
        if (!filePath) {
          const res = await window.api.showOpenDialog({ filters: [{ name: 'Omega Projects', extensions: ['owep'] }], properties: ['openFile'] });
          if (res.canceled || res.filePaths.length === 0) return;
          filePath = res.filePaths[0];
        }
        const result = await ProjectManager.loadProject(filePath);
        if (result.success) {
          const loadedTracks = await Promise.all(result.data.tracks.map(async (track: Track) => {
            const regions = await Promise.all(track.regions.map(async (region: Region) => {
              try {
                await engine.loadFile(region.file.path);
                if (!region.fileDuration) {
                   const info = await window.api.getMediaInfo(region.file.path);
                   return { ...region, fileDuration: info?.duration || region.duration };
                }
              } catch (err) {
                console.error('Fehler beim Vorladen der Audiodatei aus dem Projekt:', region.file.path, err);
              }
              return region;
            }));
            return { ...track, regions };
          }));

          setTracks(loadedTracks);
          if (onTracksChange) onTracksChange(loadedTracks);
          setZoomLevel(result.data.settings.zoomLevel || 1);
          setPlayheadPos(result.data.settings.playheadPos || 0);
          setSampleRate(result.data.settings.sampleRate || 48000);
          setExportSettings(result.data.settings.exportSettings || null);
          setSelectionStart(null);
          setSelectionEnd(null);
          window.dispatchEvent(new CustomEvent('PROJECT_LOADED', { detail: { path: filePath } }));
        }
      } else if (externalAction.type === 'EXPORT_ARRANGEMENT') {
        const res = await window.api.showSaveDialog({ filters: [{ name: 'Omega Arrangement', extensions: ['owea'] }] });
        if (!res.canceled && res.filePath) {
          await ProjectManager.exportArrangement(res.filePath, tracks);
          window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Erfolg', message: 'Arrangement exportiert (.owea)' } }));
        }
      } else if (externalAction.type === 'EXPORT_LAYER') {
        const selectedTrack = tracks.find(t => t.regions.some(r => r.id === selectedRegionId));
        if (!selectedTrack) {
          window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'error', title: 'Fehler', message: 'Bitte zuerst eine Region auf der gewünschten Spur auswählen.' } }));
          return;
        }
        const res = await window.api.showSaveDialog({ filters: [{ name: 'Omega Layer', extensions: ['owel'] }] });
        if (!res.canceled && res.filePath) {
          await ProjectManager.exportLayer(res.filePath, selectedTrack);
          window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Erfolg', message: 'Layer exportiert (.owel)' } }));
        }
      }
    };

    handleAction();
  }, [externalAction, tracks, onTracksChange, zoomLevel, playheadPos, selectedRegionId, exportSettings]);

  // Listen to exportSettings updates from the export popup window and trigger dirty checking
  useEffect(() => {
    const unsubscribe = window.api.onExportSettingsUpdated((settings: any) => {
      setExportSettings(settings);
      if (onTracksChange) {
        onTracksChange([...tracks]);
      }
    });
    return () => unsubscribe();
  }, [tracks, onTracksChange]);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, regionId: string, submenu: string | null } | null>(null)
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false)
  
  const [showCleaning, setShowCleaning] = useState(false)
  const [showProperties, setShowProperties] = useState(false)

  const tracksRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const hScrollTrackRef = useRef<HTMLDivElement>(null)
  const vScrollTrackRef = useRef<HTMLDivElement>(null)

  const skipToStart = () => {
    setPlayheadPos(0);
    if (isPlaying) { engine.stop(); engine.play({ tracks }, 0); }
  };

  const skipToEnd = () => {
    const allRegions = tracks.flatMap(t => t.regions);
    if (allRegions.length === 0) return;
    const end = Math.max(...allRegions.map(r => r.startPos + r.duration));
    setPlayheadPos(end);
    if (isPlaying) { engine.stop(); engine.play({ tracks }, end); }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (document.querySelector('[data-settings-modal="true"]')) return
      if (
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName) ||
        target.isContentEditable
      ) return

      if (matchesShortcut(e, activeShortcuts.normalizePeak)) {
        if (selectedRegionId) {
          e.preventDefault();
          normalizePeak(selectedRegionId);
        }
      } else if (matchesShortcut(e, activeShortcuts.toggleAutomation)) {
        e.preventDefault();
        setShowAutomation(s => !s);
      } else if (matchesShortcut(e, activeShortcuts.resetEffects)) {
        if (selectedRegionId) {
          e.preventDefault();
          resetEffects(selectedRegionId);
        }
      } else if (matchesShortcut(e, activeShortcuts.zoomIn)) {
        e.preventDefault();
        if (selectedRegionId) {
          loadEffectsPreset(selectedRegionId);
        } else {
          setZoomLevel(z => Math.min(z + 0.2, 20));
        }
      } else if (matchesShortcut(e, activeShortcuts.saveEffectsPreset)) {
        if (selectedRegionId) {
          e.preventDefault();
          saveEffectsPreset(selectedRegionId);
        }
      } else if (matchesShortcut(e, activeShortcuts.pasteEffects)) {
        if (selectedRegionId) {
          e.preventDefault();
          pasteEffects(selectedRegionId);
        }
      } else if (matchesShortcut(e, activeShortcuts.zoomOut)) {
        e.preventDefault();
        setZoomLevel(z => Math.max(z - 0.2, 0.05));
      } else if (matchesShortcut(e, activeShortcuts.deleteSelection) || matchesShortcut(e, activeShortcuts.deleteSelectionAlt)) {
        if (selectedRegionIds.size > 0) {
          e.preventDefault();
          deleteSelectedRegions();
        }
      } else if (matchesShortcut(e, activeShortcuts.copy)) {
        e.preventDefault();
        handleCopy();
      } else if (matchesShortcut(e, activeShortcuts.paste)) {
        e.preventDefault();
        handlePaste();
      } else if (matchesShortcut(e, activeShortcuts.cut)) {
        e.preventDefault();
        handleCopy();
        if (selectedRegionIds.size > 0) {
          deleteSelectedRegions();
        }
      } else if (matchesShortcut(e, activeShortcuts.redo)) {
        e.preventDefault();
        const nextState = HistoryManager.redo(tracks);
        if (nextState) {
           setTracks(nextState);
           if (onTracksChange) onTracksChange(nextState);
        }
      } else if (matchesShortcut(e, activeShortcuts.undo)) {
        e.preventDefault();
        const prevState = HistoryManager.undo(tracks);
        if (prevState) {
           setTracks(prevState);
           if (onTracksChange) onTracksChange(prevState);
        }
      } else if (matchesShortcut(e, activeShortcuts.splitAtPlayhead)) {
        e.preventDefault();
        const curPlayhead = playheadPosRef.current;
        const hasSelection = selectedRegionIds.size > 0;
        
        let tempProject: any = {
          format: 'OWEP',
          version: '1.0.0',
          tracks: tracks,
          settings: { zoomLevel, sampleRate, playheadPos: curPlayhead },
          metadata: { createdAt: Date.now(), updatedAt: Date.now(), author: '' }
        };

        let changed = false;
        tracks.forEach(t => {
          t.regions.forEach(region => {
            const isTarget = hasSelection
              ? selectedRegionIds.has(region.id)
              : (curPlayhead > region.startPos && curPlayhead < region.startPos + region.duration);
            if (isTarget && curPlayhead > region.startPos && curPlayhead < region.startPos + region.duration) {
              tempProject = projectCore.splitClip(tempProject, t.id, region.id, curPlayhead);
              changed = true;
            }
          });
        });

        if (changed) {
          updateTracksWithHistory(tempProject.tracks as any);
        }
      } else if (matchesShortcut(e, activeShortcuts.trimStart) || matchesShortcut(e, activeShortcuts.trimStartAlt)) {
        e.preventDefault();
        const curPlayhead = playheadPosRef.current;
        const hasSelection = selectedRegionIds.size > 0;
        const newTracks = tracks.map(t => {
          let changed = false;
          const updatedRegions = t.regions.map(region => {
            const isTarget = hasSelection ? selectedRegionIds.has(region.id) : (curPlayhead > region.startPos && curPlayhead < region.startPos + region.duration);
            if (isTarget && curPlayhead > region.startPos && curPlayhead < region.startPos + region.duration) {
              changed = true;
              const cutAmount = curPlayhead - region.startPos;
              return {
                ...region,
                startPos: curPlayhead,
                duration: region.duration - cutAmount,
                sourceOffset: (region.sourceOffset || 0) + cutAmount
              };
            }
            return region;
          });
          return changed ? { ...t, regions: updatedRegions } : t;
        });
        updateTracksWithHistory(newTracks);
      } else if (matchesShortcut(e, activeShortcuts.trimEnd)) {
        e.preventDefault();
        const curPlayhead = playheadPosRef.current;
        const hasSelection = selectedRegionIds.size > 0;
        const newTracks = tracks.map(t => {
          let changed = false;
          const updatedRegions = t.regions.map(region => {
            const isTarget = hasSelection ? selectedRegionIds.has(region.id) : (curPlayhead > region.startPos && curPlayhead < region.startPos + region.duration);
            if (isTarget && curPlayhead > region.startPos && curPlayhead < region.startPos + region.duration) {
              changed = true;
              return {
                ...region,
                duration: curPlayhead - region.startPos
              };
            }
            return region;
          });
          return changed ? { ...t, regions: updatedRegions } : t;
        });
        updateTracksWithHistory(newTracks);
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedRegionId, selectedRegionIds, deleteSelectedRegions, togglePlayback, tracks, handleCopy, handlePaste, activeShortcuts]);

  // Playhead and VU update loop
  const [vuLevel, setVuLevel] = useState(0);

  useAnimationFrame(() => {
    const current = engine.currentTime;
    if (engine.isPlaying && !isDraggingPlayheadRef.current) {
      playheadPosRef.current = current;
      
      // Real-time Autoscroll implementation
      let currentScrollLeft = scrollLeft;
      if (tracksRef.current && autoScroll !== 'Aus') {
        const visibleWidth = tracksRef.current.clientWidth;
        if (autoScroll === 'Schnell') {
          if (current * pixelsPerSecond >= scrollLeft + visibleWidth) {
            const page = Math.floor((current * pixelsPerSecond) / (visibleWidth || 1));
            tracksRef.current.scrollLeft = page * visibleWidth;
            currentScrollLeft = page * visibleWidth;
            setScrollLeft(currentScrollLeft);
          } else if (current * pixelsPerSecond < scrollLeft) {
            const page = Math.floor((current * pixelsPerSecond) / (visibleWidth || 1));
            tracksRef.current.scrollLeft = page * visibleWidth;
            currentScrollLeft = page * visibleWidth;
            setScrollLeft(currentScrollLeft);
          }
        } else if (autoScroll === 'Langsam') {
          const targetScroll = (current * pixelsPerSecond) - (visibleWidth / 2);
          const clampedScroll = Math.max(0, targetScroll);
          tracksRef.current.scrollLeft = clampedScroll;
          currentScrollLeft = clampedScroll;
          setScrollLeft(currentScrollLeft);
        }
      }

      playheadMotionX.set(128 + (current * pixelsPerSecond) - currentScrollLeft);
      // (blue trailing bar removed – selection is independent)
      
      // Throttle state updates for UI
      if (Math.floor(current * 10) % 2 === 0) {
         setPlayheadPos(current);
         setVuLevel(engine.getMasterLevels().left);
      }
    }

    // Sende frame-genaues Status-Event für die Koppelung mit dem Player-Tab
    const allRegions = tracks.flatMap(t => t.regions);
    const projectEnd = allRegions.length > 0 ? Math.max(...allRegions.map(r => r.startPos + r.duration)) : 30;
    const projectDuration = Math.max(30, projectEnd);

    window.dispatchEvent(new CustomEvent('TIMELINE_PLAYBACK_STATUS', {
      detail: {
        isPlaying: engine.isPlaying,
        playheadPos: engine.isPlaying ? current : playheadPos,
        duration: projectDuration
      }
    }));
  });

  // Load initial settings and listen to live settings changes
  useEffect(() => {
    window.api.getSettings().then(s => {
      if (s) {
        if (s.sampleRate !== undefined) setSampleRate(s.sampleRate);
        if (s.autoScroll !== undefined) setAutoScroll(s.autoScroll);
        if (s.spacebarStops !== undefined) setSpacebarStops(s.spacebarStops);
        if (s.keyboardShortcuts !== undefined) setActiveShortcuts(normalizeKeyboardShortcuts(s.keyboardShortcuts));
        if (!initialTracks && s.tracksCount !== undefined) {
          const count = s.tracksCount;
          setTracks(prev => {
            if (prev.length === 4 && prev.every(t => t.regions.length === 0)) {
              const newTracks: Track[] = [];
              for (let i = 1; i <= count; i++) {
                newTracks.push({
                  id: i.toString(),
                  index: i,
                  name: '',
                  regions: [],
                  muted: false,
                  solo: false,
                  locked: false,
                  visible: true,
                  volume: 1,
                  height: 64,
                  automation: []
                });
              }
              return newTracks;
            }
            return prev;
          });
        }
      }
    }).catch(err => console.error('Error loading settings in timeline:', err));
  }, [initialTracks]);

  useEffect(() => {
    if (!initialTracks) return;
    // Skip if this update was triggered by our own onTracksChange call
    if (isInternalUpdateRef.current) return;
    setTracks(initialTracks);
  }, [initialTracks]);

  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const newSettings = customEvent.detail;
      if (!newSettings) return;

      if (newSettings.sampleRate !== undefined) {
        setSampleRate(newSettings.sampleRate);
      }
      if (newSettings.autoScroll !== undefined) {
        setAutoScroll(newSettings.autoScroll);
      }
      if (newSettings.spacebarStops !== undefined) {
        setSpacebarStops(newSettings.spacebarStops);
      }
      if (newSettings.keyboardShortcuts !== undefined) {
        setActiveShortcuts(normalizeKeyboardShortcuts(newSettings.keyboardShortcuts));
      }

      if (newSettings.tracksCount !== undefined) {
        const targetCount = newSettings.tracksCount;
        setTracks(prevTracks => {
          let updatedTracks = [...prevTracks];
          if (updatedTracks.length < targetCount) {
            for (let i = updatedTracks.length + 1; i <= targetCount; i++) {
              updatedTracks.push({
                id: i.toString(),
                index: i,
                name: '',
                regions: [],
                muted: false,
                solo: false,
                locked: false,
                visible: true,
                volume: 1,
                height: 64,
                automation: []
              });
            }
          } else if (updatedTracks.length > targetCount) {
            let currentCount = updatedTracks.length;
            while (currentCount > targetCount) {
              const lastTrack = updatedTracks[currentCount - 1];
              if (lastTrack.regions.length === 0) {
                updatedTracks.pop();
                currentCount--;
              } else {
                break;
              }
            }
          }
          updatedTracks = updatedTracks.map((t, idx) => ({ ...t, index: idx + 1 }));
          if (onTracksChange) onTracksChange(updatedTracks);
          return updatedTracks;
        });
      }
    };

    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdated as EventListener);
    return () => {
      window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdated as EventListener);
    };
  }, [onTracksChange]);

  useEffect(() => {
    if (!engine.isPlaying && isPlaying) {
      setIsPlaying(false);
      setVuLevel(0);
    }
  }, [engine.isPlaying, isPlaying]);
  
  useEffect(() => {
    if (isPlaying) return; // Prevent fighting with useAnimationFrame during playback
    playheadPosRef.current = playheadPos;
    playheadMotionX.set(128 + (playheadPos * pixelsPerSecond) - scrollLeft);
    // (playheadRulerMotionWidth removed)
  }, [playheadPos, pixelsPerSecond, scrollLeft, isPlaying]);

  // Eventbus Listener: Empfange Aktionen vom Player-Tab
  useEffect(() => {
    const handleActionPlay = () => {
      togglePlayback();
    };
    const handleActionStop = () => {
      engine.stop();
      setIsPlaying(false);
      setPlayheadPos(0);
      playheadPosRef.current = 0;
    };
    const handleActionSeek = (e: Event) => {
      const customEvent = e as CustomEvent<{ position: number }>;
      const newPos = customEvent.detail.position;
      setPlayheadPos(newPos);
      playheadPosRef.current = newPos;
      if (engine.isPlaying) {
        engine.stop();
        engine.play({ tracks }, newPos);
      }
    };

    window.addEventListener('TIMELINE_ACTION_PLAY', handleActionPlay);
    window.addEventListener('TIMELINE_ACTION_STOP', handleActionStop);
    window.addEventListener('TIMELINE_ACTION_SEEK', handleActionSeek as EventListener);

    return () => {
      window.removeEventListener('TIMELINE_ACTION_PLAY', handleActionPlay);
      window.removeEventListener('TIMELINE_ACTION_STOP', handleActionStop);
      window.removeEventListener('TIMELINE_ACTION_SEEK', handleActionSeek as EventListener);
    };
  }, [togglePlayback, engine, tracks]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft)
    setScrollTop(e.currentTarget.scrollTop)
  }

  // Guard: wenn ein Doppelklick erkannt wird, ignoriert mouseDown das Setzen der Selektion
  const rulerDoubleClickPendingRef = useRef(false);

  const handleRulerDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    rulerDoubleClickPendingRef.current = true;
    setSelectionStart(null);
    setSelectionEnd(null);
    // Reset the guard after a short tick
    setTimeout(() => { rulerDoubleClickPendingRef.current = false; }, 300);
  };

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    // Rechtsklick → Endpunkt der Export-Selektion setzen
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      if (rulerDoubleClickPendingRef.current) return;
      const rulerEl = rulerRef.current;
      if (!rulerEl) return;
      const rect = rulerEl.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const newPos = (clickX + scrollLeft) / pixelsPerSecond;
      setSelectionEnd(newPos);
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setEditorContextMenu(null);
    setZoomMenuOpen(false);

    // Doppelklick hat Vorrang – Selektion löschen statt neue setzen
    if (rulerDoubleClickPendingRef.current) return;

    // Linksklick → nur Startpunkt der Export-Selektion setzen (kein Playhead-Move)
    const rulerEl = rulerRef.current;
    if (!rulerEl) return;
    const rect = rulerEl.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newPos = (clickX + scrollLeft) / pixelsPerSecond;
    setSelectionStart(newPos);
  };
  
  // Stufenloses Greifen und Verschieben des Abspielkopfs (Playhead-Dragging)
  const handlePlayheadDragMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Nur primärer Linksklick
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setEditorContextMenu(null);
    setZoomMenuOpen(false);

    isDraggingPlayheadRef.current = true;
    const wasPlaying = engine.isPlaying || isPlaying;
    if (wasPlaying) {
      engine.stop();
      setIsPlaying(false);
    }

    const updatePlayheadFromEvent = (clientX: number) => {
      if (!tracksRef.current) return;
      const rect = tracksRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const newPos = (clickX + scrollLeft) / pixelsPerSecond;
      setPlayheadPos(newPos);
      playheadPosRef.current = newPos;
    };

    updatePlayheadFromEvent(e.clientX);

    const handleMouseMove = (me: MouseEvent) => {
      updatePlayheadFromEvent(me.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      isDraggingPlayheadRef.current = false;
      
      // Wenn Wiedergabe aktiv war, an neuer Position nahtlos fortsetzen
      if (wasPlaying) {
        engine.play({ tracks }, playheadPosRef.current);
        setIsPlaying(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current) return;
    setContextMenu(null)
    setEditorContextMenu(null)
    setZoomMenuOpen(false)
    
    const target = e.target as HTMLElement;
    if (!target.closest('[data-region-id]') && !target.closest('button') && !target.closest('input')) {
      setSelectedRegionIds(new Set());
    }
  }

  const handleRegionContextMenu = (e: React.MouseEvent, regionId: string) => {
    e.preventDefault(); e.stopPropagation()
    setSelectedRegionId(regionId)
    const menuWidth = 224; // w-56
    const menuHeight = 380; // geschätzte Höhe
    const constrainedX = Math.max(0, Math.min(e.clientX, window.innerWidth - menuWidth));
    const constrainedY = Math.max(0, Math.min(e.clientY, window.innerHeight - menuHeight));
    setContextMenu({ x: constrainedX, y: constrainedY, regionId, submenu: null })
  }

  const addTrack = () => {
    const nextIdx = tracks.length + 1
    const newTracks = [...tracks, { id: nextIdx.toString(), index: nextIdx, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] }];
    updateTracksWithHistory(newTracks);
  }

  const updateTrackVolume = (trackId: string, value: number) => {
    const newTracks = tracks.map(t => t.id === trackId ? { ...t, volume: value } : t);
    setTracks(newTracks);
    engine.setTrackVolume(trackId, value)
  }

  const updateTrackPan = (trackId: string, value: number) => {
    const newTracks = tracks.map(t => t.id === trackId ? { ...t, pan: value } : t);
    setTracks(newTracks);
    engine.setTrackPan(trackId, value)
  }

  const toggleMute = (trackId: string) => {
    const newTracks = tracks.map(t => {
      if (t.id === trackId) {
        const newMuted = !t.muted
        engine.setTrackVolume(trackId, newMuted ? 0 : t.volume)
        return { ...t, muted: newMuted }
      }
      return t
    });
    updateTracksWithHistory(newTracks);
  }

  const toggleSolo = (trackId: string) => {
    const newTracks = tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t);
    updateTracksWithHistory(newTracks);
  }

  const onDrop = async (e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    let fileInfo: { name: string; path: string; isDirectory: boolean } | null = null;

    try {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0] as File & { path: string };
        if (file.path) {
          fileInfo = { name: file.name, path: file.path, isDirectory: false };
        } else {
          window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'error', title: 'Fehler beim Laden', message: 'Dateipfad nicht gefunden. Drag & Drop könnte durch das Betriebssystem blockiert sein.' } }));
          return;
        }
      } else {
        const data = e.dataTransfer.getData('application/json')
        if (data) {
          try {
            fileInfo = JSON.parse(data);
          } catch (err) {
            console.error("Invalid drop data");
          }
        }
      }

      if (fileInfo && tracksRef.current) {
        const startPos = playheadPosRef.current
        
        try {
          await engine.loadFile(fileInfo.path);
          const info = await window.api.getMediaInfo(fileInfo.path);
          
          const newRegion: Region = {
            id: Math.random().toString(36).substr(2, 9),
            file: fileInfo, startPos, duration: info?.duration || 10,
            sourceOffset: 0, fileDuration: info?.duration || 10,
            color: fileInfo.name.match(/\.(mp4|mkv|mov)$/i) ? 'bg-purple-600' : 'bg-omega-accent'
          }
          const newTracks = tracks.map(t => t.id === trackId ? { ...t, regions: [...t.regions, newRegion] } : t);
          updateTracksWithHistory(newTracks);
          setSelectedRegionId(newRegion.id)
        } catch (err: any) {
           window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'error', title: 'Fehler beim Importieren', message: 'Die Datei konnte nicht geladen werden: ' + err.message } }));
        }
      }
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'error', title: 'Unerwarteter Fehler', message: error.message } }));
    }
  }

  const handleRegionMouseDown = (e: React.MouseEvent, trackId: string, regionId: string, action: 'move' | 'trimStart' | 'trimEnd' = 'move') => {
    if (toolMode !== 'select') return;
    e.stopPropagation();
    const region = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
    if (!region) return;
    
    // Ctrl+Click: Toggle region in/out of selection
    if (e.ctrlKey) {
      const next = new Set(selectedRegionIds);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      setSelectedRegionIds(next);
      return; // Don't start dragging on Ctrl+Click
    }
    
    // If clicking a region not in selection, replace selection
    if (!selectedRegionIds.has(regionId)) {
      setSelectedRegionIds(new Set([regionId]));
    }
    
    HistoryManager.pushState(tracks); 
    setDraggingRegion({ 
      id: regionId, trackId, 
      initialStartPos: region.startPos, 
      initialDuration: region.duration,
      initialSourceOffset: region.sourceOffset || 0,
      initialFileDuration: region.fileDuration || region.duration,
      startX: e.clientX,
      action 
    });
  }

  // --- SNAP HELPER ---
  const snapPositionRef = useRef(snapEnabled);
  useEffect(() => { snapPositionRef.current = snapEnabled; }, [snapEnabled]);

  const applySnap = useCallback((newPos: number, dragRegionId: string, allTracks: typeof tracks): number => {
    if (!snapPositionRef.current) return newPos;
    const SNAP_THRESHOLD_SEC = 10 / pixelsPerSecond; // 10px
    let snapped = newPos;
    let bestDelta = SNAP_THRESHOLD_SEC;
    allTracks.forEach(t => {
      t.regions.forEach(r => {
        if (r.id === dragRegionId) return;
        const candidates = [r.startPos, r.startPos + r.duration];
        candidates.forEach(c => {
          const delta = Math.abs(newPos - c);
          if (delta < bestDelta) { bestDelta = delta; snapped = c; }
        });
      });
    });
    // Also snap to playhead
    const phDelta = Math.abs(newPos - playheadPosRef.current);
    if (phDelta < bestDelta) { snapped = playheadPosRef.current; }
    return snapped;
  }, [pixelsPerSecond]);

  // --- GROUP HELPERS ---
  const groupSelected = useCallback(() => {
    if (selectedRegionIds.size < 2) return;
    const groupId = Math.random().toString(36).substr(2, 9);
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => selectedRegionIds.has(r.id) ? { ...r, groupId } : r)
    }));
    updateTracksWithHistory(newTracks);
  }, [selectedRegionIds, tracks]);

  const ungroupSelected = useCallback(() => {
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => selectedRegionIds.has(r.id) ? { ...r, groupId: undefined } : r)
    }));
    updateTracksWithHistory(newTracks);
  }, [selectedRegionIds, tracks]);

  // --- GAIN DRAG ---
  useEffect(() => {
    if (!draggingGain) return;
    const onMove = (e: MouseEvent) => {
      const relativeY = e.clientY - draggingGain.containerTop;
      const yPercent = Math.max(0, Math.min(100, (relativeY / draggingGain.containerHeight) * 100));
      
      let newGain = 1.0;
      if (yPercent >= 50) {
        // scale from 100% (0.0) to 50% (1.0)
        newGain = (100 - yPercent) / 50;
      } else {
        // scale from 50% (1.0) to 0% (4.0)
        newGain = 1.0 + ((50 - yPercent) / 50) * 3.0;
      }
      
      newGain = Math.max(0, Math.min(4, newGain));

      setTracks(prev => prev.map(t => ({
        ...t,
        regions: t.regions.map(r => r.id === draggingGain.regionId ? { ...r, gain: newGain } : r)
      })));

      // Echtzeit-Lautstärkenänderung an die Web-Audio-Engine übertragen
      engine.updateActiveRegionVolume(draggingGain.regionId, newGain);
    };
    const onUp = () => {
      setDraggingGain(null);
      setTracks(cur => { if (onTracksChange) onTracksChange(cur); return cur; });
      // Verhindere, dass nach dem Draggen ein Klick-Event auf der Timeline ausgelöst wird
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 50);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [draggingGain, onTracksChange]);

  // --- FADE DRAG ---
  useEffect(() => {
    if (!draggingFade) return;
    const onMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingFade.startX;
      const deltaSec = deltaX / pixelsPerSecond;
      setTracks(prev => prev.map(t => ({
        ...t,
        regions: t.regions.map(r => {
          if (r.id !== draggingFade.regionId) return r;
          if (draggingFade.edge === 'in') {
            return { ...r, fadeIn: Math.max(0, Math.min(r.duration * 0.5, draggingFade.startValue + deltaSec)) };
          } else {
            return { ...r, fadeOut: Math.max(0, Math.min(r.duration * 0.5, draggingFade.startValue - deltaSec)) };
          }
        })
      })));
    };
    const onUp = () => {
      setDraggingFade(null);
      setTracks(cur => { if (onTracksChange) onTracksChange(cur); return cur; });
      // Verhindere, dass nach dem Draggen ein Klick-Event auf der Timeline ausgelöst wird
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 50);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [draggingFade, pixelsPerSecond, onTracksChange]);

  useEffect(() => {
    if (!draggingRegion) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingRegion.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      
      setTracks(prev => {
        let newTracks = [...prev];
        const sourceTrackIdx = newTracks.findIndex(t => t.regions.some(r => r.id === draggingRegion.id));
        if (sourceTrackIdx === -1) return prev;
        
        const region = newTracks[sourceTrackIdx].regions.find(r => r.id === draggingRegion.id)!;
        const currentTrackId = newTracks[sourceTrackIdx].id;

        if (draggingRegion.action === 'move') {
          let newPos = Math.max(0, draggingRegion.initialStartPos + deltaTime);
          newPos = applySnap(newPos, draggingRegion.id, newTracks);

          const elements = document.elementsFromPoint(e.clientX, e.clientY);
          const trackEl = elements.find(el => el.hasAttribute('data-track-id'));
          const hoverTrackId = trackEl ? trackEl.getAttribute('data-track-id') : null;

          // Move grouped regions together
          const groupId = region.groupId;
          const deltaPos = newPos - draggingRegion.initialStartPos;
          const groupMoveOffsets: Map<string, number> = new Map();
          if (groupId) {
            newTracks.forEach(t => {
              t.regions.forEach(r => {
                if (r.id !== draggingRegion.id && r.groupId === groupId) {
                  groupMoveOffsets.set(r.id, Math.max(0, r.startPos + deltaPos));
                }
              });
            });
          }

          if (hoverTrackId && currentTrackId !== hoverTrackId) {
              newTracks[sourceTrackIdx] = { ...newTracks[sourceTrackIdx], regions: newTracks[sourceTrackIdx].regions.filter(r => r.id !== region.id) };
              const targetTrackIdx = newTracks.findIndex(t => t.id === hoverTrackId);
              if (targetTrackIdx !== -1) {
                  newTracks[targetTrackIdx] = { ...newTracks[targetTrackIdx], regions: [...newTracks[targetTrackIdx].regions, { ...region, startPos: newPos }] };
              }
          } else {
              newTracks[sourceTrackIdx] = {
                  ...newTracks[sourceTrackIdx],
                  regions: newTracks[sourceTrackIdx].regions.map(r => r.id === draggingRegion.id ? { ...r, startPos: newPos } : r)
              }
          }

          // Apply grouped region movements
          if (groupMoveOffsets.size > 0) {
            newTracks = newTracks.map(t => ({
              ...t,
              regions: t.regions.map(r => groupMoveOffsets.has(r.id) ? { ...r, startPos: groupMoveOffsets.get(r.id)! } : r)
            }));
          }

        } else if (draggingRegion.action === 'trimStart') {
          // Prevent dragging left edge before the file start (sourceOffset cannot be less than 0)
          const minPos = Math.max(0, draggingRegion.initialStartPos - draggingRegion.initialSourceOffset);
          const maxDelta = draggingRegion.initialDuration - 0.1;
          const actualDelta = Math.min(deltaTime, maxDelta);
          const newPos = Math.max(minPos, draggingRegion.initialStartPos + actualDelta);
          const actualDeltaClamped = newPos - draggingRegion.initialStartPos;
          
          newTracks[sourceTrackIdx] = {
              ...newTracks[sourceTrackIdx],
              regions: newTracks[sourceTrackIdx].regions.map(r => r.id === draggingRegion.id ? { 
                ...r, 
                startPos: newPos, 
                duration: draggingRegion.initialDuration - actualDeltaClamped,
                sourceOffset: draggingRegion.initialSourceOffset + actualDeltaClamped
              } : r)
          }
        } else if (draggingRegion.action === 'trimEnd') {
          // Prevent dragging right edge beyond the actual physical file length
          const fileDur = draggingRegion.initialFileDuration;
          const srcOff = draggingRegion.initialSourceOffset;
          const maxDur = Math.max(0.1, fileDur - srcOff);
          const newDuration = Math.min(maxDur, Math.max(0.1, draggingRegion.initialDuration + deltaTime));
          newTracks[sourceTrackIdx] = {
              ...newTracks[sourceTrackIdx],
              regions: newTracks[sourceTrackIdx].regions.map(r => r.id === draggingRegion.id ? { ...r, duration: newDuration } : r)
          }
        }
        
        return newTracks;
      });
    }
    
    const handleMouseUp = () => {
      setDraggingRegion(null);
      setTracks(current => {
         if (onTracksChange) onTracksChange(current);
         return current;
      });
      // Verhindere, dass nach dem Draggen ein Klick-Event auf der Timeline ausgelöst wird
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 50);
    }
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
       window.removeEventListener('mousemove', handleMouseMove);
       window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [draggingRegion, pixelsPerSecond, onTracksChange, applySnap]);


  const handleRegionClick = (e: React.MouseEvent, trackId: string, regionId: string) => {
    e.stopPropagation();
    if (toolMode === 'scissors') {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const region = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
      if (!region) return;
      const splitTime = (clickX / pixelsPerSecond) + region.startPos;
      
      const tempProject: any = {
        format: 'OWEP',
        version: '1.0.0',
        tracks: tracks,
        settings: { zoomLevel, sampleRate, playheadPos },
        metadata: { createdAt: Date.now(), updatedAt: Date.now(), author: '' }
      };
      
      const nextProject = projectCore.splitClip(tempProject, trackId, regionId, splitTime);
      updateTracksWithHistory(nextProject.tracks as any);
    } else if (!e.ctrlKey) {
      // Plain click without Ctrl: select only this region (Ctrl+Click handled in MouseDown)
      if (!isLassoActiveRef.current) {
        setSelectedRegionIds(new Set([regionId]));
      }
    }
  }

  const [isDraggingH, setIsDraggingH] = useState(false)
  const [isDraggingV, setIsDraggingV] = useState(false)

  const handleMouseMoveH = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!hScrollTrackRef.current || !tracksRef.current) return
    const rect = hScrollTrackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const ratio = x / rect.width
    tracksRef.current.scrollLeft = ratio * (tracksRef.current.scrollWidth - tracksRef.current.clientWidth)
  }, [])

  const handleMouseMoveV = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!vScrollTrackRef.current || !tracksRef.current) return
    const rect = vScrollTrackRef.current.getBoundingClientRect()
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    const ratio = y / rect.height
    tracksRef.current.scrollTop = ratio * (tracksRef.current.scrollHeight - tracksRef.current.clientHeight)
  }, [])

  const onMouseDownH = (e: React.MouseEvent) => { setIsDraggingH(true); handleMouseMoveH(e); }
  const onMouseDownV = (e: React.MouseEvent) => { setIsDraggingV(true); handleMouseMoveV(e); }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingH) handleMouseMoveH(e)
      if (isDraggingV) handleMouseMoveV(e)
    }
    const onUp = () => { setIsDraggingH(false); setIsDraggingV(false); }
    if (isDraggingH || isDraggingV) {
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
    }
  }, [isDraggingH, isDraggingV, handleMouseMoveH, handleMouseMoveV])

  const selectedRegion = tracks.flatMap(t => t.regions).find(r => r.id === selectedRegionId)
  const hThumbWidth = tracksRef.current ? Math.min(1, tracksRef.current.clientWidth / tracksRef.current.scrollWidth) * 100 : 25
  const hThumbLeft = tracksRef.current ? (scrollLeft / tracksRef.current.scrollWidth) * 100 : 0
  const vThumbHeight = tracksRef.current ? Math.min(1, tracksRef.current.clientHeight / tracksRef.current.scrollHeight) * 100 : 25
  const vThumbTop = tracksRef.current ? (scrollTop / tracksRef.current.scrollHeight) * 100 : 0
  const selectedTrack = tracks.find(t => t.regions.some(r => r.id === selectedRegionId))

  const isBottomHalf = contextMenu && contextMenu.y > window.innerHeight / 2;
  const isEditorBottomHalf = editorContextMenu && editorContextMenu.y > window.innerHeight / 2;

  return (
    <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden relative font-sans text-[13px]" onClick={handleTimelineClick}>
      {showCleaning && <AudioCleaningModal onClose={() => setShowCleaning(false)} trackId={selectedTrack?.id} />}
      {showProperties && <ObjectPropertiesModal onClose={() => setShowProperties(false)} region={selectedRegion} />}
      {showAudioRecording && (
        <AudioRecordingModal
          onClose={() => setShowAudioRecording(false)}
          onSaveRecord={handleSaveRecord}
          playheadPos={playheadPos}
        />
      )}

      {contextMenu && (
        <div className="fixed bg-[#e5e5e5] text-black border border-gray-400 shadow-lg py-1 z-[9999] text-xs w-56 flex flex-col" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <button 
            className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between font-semibold border-b border-gray-300 pb-1"
            onClick={() => {
              const targetTrack = tracks.find(t => t.regions.some(r => r.id === contextMenu.regionId));
              if (targetTrack && onOpenExport) {
                onOpenExport([targetTrack], { selectionStart, selectionEnd }, exportSettings);
              }
              setContextMenu(null);
            }}
          >
            Spur exportieren (Mixdown)...
          </button>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { setShowCleaning(true); setContextMenu(null); }}>
            Audio Cleaning... <span className="text-[10px] text-gray-500 font-mono">Objekt</span>
          </button>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { setShowProperties(true); setContextMenu(null); }}>Objekteigenschaften...</button>
          
          <div className="h-px bg-gray-300 my-1 mx-1"></div>

          {/* Normalisieren */}
          <div className="relative" onMouseEnter={() => setNormalizeSubmenuOpen(true)} onMouseLeave={() => setNormalizeSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between">
              Normalisieren <span className="text-gray-400">▶</span>
            </button>
            {normalizeSubmenuOpen && (
              <div className={`absolute left-full bg-[#e5e5e5] border border-gray-400 shadow-lg py-1 w-56 ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { normalizePeak(contextMenu.regionId); setContextMenu(null); }}>
                  Maximalpegel <span className="text-[9px] text-gray-500">Alt+N</span>
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { normalizeRMS(contextMenu.regionId); setContextMenu(null); }}>
                  Lautstärke (EBU R128)
                </button>
              </div>
            )}
          </div>

          {/* Lautstärke setzen */}
          <div className="relative" onMouseEnter={() => setDbSubmenuOpen(true)} onMouseLeave={() => setDbSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between">
              Lautstärke setzen <span className="text-gray-400">▶</span>
            </button>
            {dbSubmenuOpen && (
              <div className={`absolute left-full bg-[#e5e5e5] border border-gray-400 shadow-lg py-1 w-32 max-h-60 overflow-y-auto z-[10000] ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                {dbOptions.map(opt => (
                  <button key={opt.label} className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { updateRegionGain(contextMenu.regionId, opt.value); setContextMenu(null); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stereo Bearbeitung */}
          <div className="relative" onMouseEnter={() => setStereoSubmenuOpen(true)} onMouseLeave={() => setStereoSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between">
              Stereo-Objekt <span className="text-gray-400">▶</span>
            </button>
            {stereoSubmenuOpen && (
              <div className={`absolute left-full bg-[#e5e5e5] border border-gray-400 shadow-lg py-1 w-56 ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { splitStereoRegion(contextMenu.regionId); setContextMenu(null); }}>
                  In Mono-Objekte aufteilen
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { setStereoMode(contextMenu.regionId, 'left-only'); setContextMenu(null); }}>
                  Nur linke Seite verwenden
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { setStereoMode(contextMenu.regionId, 'right-only'); setContextMenu(null); }}>
                  Nur rechte Seite verwenden
                </button>
              </div>
            )}
          </div>

          {/* Spurkurven */}
          <div className="relative" onMouseEnter={() => setResetSubmenuOpen(true)} onMouseLeave={() => setResetSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between">
              Spurkurven <span className="text-gray-400">▶</span>
            </button>
            {resetSubmenuOpen && (
              <div className={`absolute left-full bg-[#e5e5e5] border border-gray-400 shadow-lg py-1 w-52 ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { setShowAutomation(s => !s); setContextMenu(null); }}>
                  Spurkurven anzeigen <span className="text-[9px] text-gray-500">Alt+K</span>
                </button>
                <div className="h-px bg-gray-300 my-1 mx-1"></div>
                <div className="px-3 py-0.5 text-[10px] text-gray-500 font-semibold">Spurkurven zurücksetzen:</div>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white pl-6" onClick={() => { resetTrackCurves('volume'); setContextMenu(null); }}>
                  Lautstärke
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white pl-6" onClick={() => { resetTrackCurves('pan'); setContextMenu(null); }}>
                  Balance
                </button>
              </div>
            )}
          </div>

          {/* Audioeffekte */}
          <div className="relative" onMouseEnter={() => setEffectsSubmenuOpen(true)} onMouseLeave={() => setEffectsSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between">
              Audioeffekte <span className="text-gray-400">▶</span>
            </button>
            {effectsSubmenuOpen && (
              <div className={`absolute left-full bg-[#e5e5e5] border border-gray-400 shadow-lg py-1 w-64 z-[10000] ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { loadEffectsPreset(contextMenu.regionId); setContextMenu(null); }}>
                  Audioeffekt laden... <span className="text-[9px] text-gray-500">Strg++</span>
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { saveEffectsPreset(contextMenu.regionId); setContextMenu(null); }}>
                  Audioeffekt speichern... <span className="text-[9px] text-gray-500">Umschalt++</span>
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { resetEffects(contextMenu.regionId); setContextMenu(null); }}>
                  Audioeffekt zurücksetzen <span className="text-[9px] text-gray-500">Strg+Alt++</span>
                </button>
                <div className="h-px bg-gray-300 my-1 mx-1"></div>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { copyEffects(contextMenu.regionId); setContextMenu(null); }}>
                  Audioeffekte kopieren
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { pasteEffects(contextMenu.regionId); setContextMenu(null); }} disabled={!effectsClipboard}>
                  Audioeffekte einfügen <span className="text-[9px] text-gray-500">Umschalt+-</span>
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { applyEffectsToAll(contextMenu.regionId, false); setContextMenu(null); }}>
                  Auf alle anwenden...
                </button>
                <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { applyEffectsToAll(contextMenu.regionId, true); setContextMenu(null); }}>
                  Auf alle folgenden anwenden...
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-300 my-1 mx-1"></div>

          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { handleCopy(); setContextMenu(null); }}>
            Kopieren <span className="text-[10px] text-gray-500">Strg+C</span>
          </button>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { handleCopy(); updateTracksWithHistory(tracks.map(t => ({ ...t, regions: t.regions.filter(r => r.id !== contextMenu.regionId) }))); setContextMenu(null); }}>
            Ausschneiden <span className="text-[10px] text-gray-500">Strg+X</span>
          </button>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { updateTracksWithHistory(tracks.map(t => ({ ...t, regions: t.regions.filter(r => r.id !== contextMenu.regionId) }))); setContextMenu(null); }}>
            Löschen <span className="text-[10px] text-gray-500">Entf</span>
          </button>
          
          <div className="h-px bg-gray-300 my-1 mx-1"></div>

          {/* Objektfarbe Untermenü */}
          <div className="relative" onMouseEnter={() => setColorSubmenuOpen(true)} onMouseLeave={() => setColorSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between">
              Objektfarbe <span className="text-gray-400">▶</span>
            </button>
            {colorSubmenuOpen && (
              <div className={`absolute left-full bg-[#e5e5e5] border border-gray-400 shadow-lg py-1 w-36 ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                {REGION_COLORS.map(c => (
                  <button
                    key={c.value}
                    className="w-full text-left px-3 py-1 hover:bg-blue-500 hover:text-white flex items-center gap-2"
                    onClick={() => {
                      updateTracksWithHistory(tracks.map(t => ({
                        ...t,
                        regions: t.regions.map(r => r.id === contextMenu.regionId ? { ...r, color: c.value } : r)
                      })));
                      setContextMenu(null);
                      setColorSubmenuOpen(false);
                    }}
                  >
                    <span className={`w-3 h-3 rounded-sm ${c.value} inline-block flex-shrink-0`} />
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {editorContextMenu && (
        <div className="fixed bg-[#e5e5e5] text-black border border-gray-400 shadow-lg py-1 z-[9999] text-xs w-56 flex flex-col" style={{ top: editorContextMenu.y, left: editorContextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { handlePaste(); setEditorContextMenu(null); }}>
            Objekt einfügen <span className="text-[9px] text-gray-500">Strg+V</span>
          </button>
          <div className="h-px bg-gray-300 my-1 mx-1"></div>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white opacity-50 cursor-not-allowed" disabled>Bereich über Leerraum (Platzhalter)</button>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white opacity-50 cursor-not-allowed" disabled>Leerraum mit Standbild füllen (Platzhalter)</button>
          <div className="h-px bg-gray-300 my-1 mx-1"></div>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between" onClick={() => { setShowAutomation(s => !s); setEditorContextMenu(null); }}>
            Spurkurven anzeigen <span className="text-[9px] text-gray-500">Alt+K</span>
          </button>
          <div className="relative group">
            <button className="w-full text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center justify-between">
              Spurkurven zurücksetzen <span className="text-gray-400">▶</span>
            </button>
            <div className={`absolute left-full bg-[#e5e5e5] border border-gray-400 shadow-lg py-1 w-36 hidden group-hover:block ${isEditorBottomHalf ? 'bottom-0' : 'top-0'}`}>
              <button className="w-full text-left px-3 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { resetTrackCurves('volume'); setEditorContextMenu(null); }}>Lautstärke</button>
              <button className="w-full text-left px-3 py-1 hover:bg-blue-500 hover:text-white" onClick={() => { resetTrackCurves('pan'); setEditorContextMenu(null); }}>Balance</button>
            </div>
          </div>
          <div className="h-px bg-gray-300 my-1 mx-1"></div>
          <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white flex items-center gap-2 font-semibold" onClick={() => { closeAllGaps(); setEditorContextMenu(null); }}>
            <GapCloseIcon />
            Lücken finden & schließen
          </button>
        </div>
      )}

      <div className="h-10 border-b border-omega-border flex items-center bg-omega-panel px-2 gap-2 z-[150]">
        {/* Tools */}
        <div className="flex gap-1 border-r border-gray-700 pr-2">
           <button title="Auswahlwerkzeug" className={`p-1.5 rounded ${toolMode === 'select' ? 'text-white bg-omega-accent' : 'hover:bg-gray-700 text-gray-400'}`} onClick={() => setToolMode('select')}>
             <MousePointer2 size={16} />
           </button>
           <button title="Schneidewerkzeug (T)" className={`p-1.5 rounded ${toolMode === 'scissors' ? 'text-white bg-omega-accent' : 'hover:bg-gray-700 text-gray-400'}`} onClick={() => setToolMode('scissors')}>
             <Scissors size={16} />
           </button>
        </div>
        {/* Transport */}
        <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
           <button title="Aufnahme" className={`p-1.5 rounded ${showAudioRecording ? 'text-red-500 animate-pulse bg-red-500/20' : 'hover:bg-gray-700 text-gray-400'}`} onClick={() => setShowAudioRecording(true)}><Mic size={16} /></button>
        </div>
        {/* Edit buttons */}
        <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
          <button title="Rückgängig (Strg+Z)" className="p-1.5 hover:bg-gray-700 rounded" onClick={() => { const prev = HistoryManager.undo(tracks); if (prev) { setTracks(prev); if (onTracksChange) { isInternalUpdateRef.current = true; onTracksChange(prev); Promise.resolve().then(() => { isInternalUpdateRef.current = false; }); } } }}>
            <RotateCcw size={16} />
          </button>
          <button title="Wiederholen (Strg+Y)" className="p-1.5 hover:bg-gray-700 rounded" onClick={() => { const next = HistoryManager.redo(tracks); if (next) { setTracks(next); if (onTracksChange) { isInternalUpdateRef.current = true; onTracksChange(next); Promise.resolve().then(() => { isInternalUpdateRef.current = false; }); } } }}>
            <RotateCw size={16} />
          </button>
        </div>
        {/* Snap + Group */}
        <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
          <button
            title={snapEnabled ? 'Magnet/Snap aktiv – klicken zum Deaktivieren' : 'Magnet/Snap aktivieren'}
            className={`p-1.5 rounded ${snapEnabled ? 'text-white bg-omega-accent shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'hover:bg-gray-700 text-gray-400'}`}
            onClick={() => setSnapEnabled(s => !s)}
          >
            <Magnet size={16} />
          </button>
          <button title="Auswahl gruppieren" className="p-1.5 hover:bg-gray-700 rounded" onClick={groupSelected} disabled={selectedRegionIds.size < 2}>
            <Link size={16} className={selectedRegionIds.size >= 2 ? 'text-gray-300' : 'text-gray-600'} />
          </button>
          <button title="Gruppe auflösen" className="p-1.5 hover:bg-gray-700 rounded" onClick={ungroupSelected} disabled={selectedRegionIds.size === 0}>
            <Unlink size={16} className={selectedRegionIds.size > 0 ? 'text-gray-300' : 'text-gray-600'} />
          </button>
        </div>
        {/* Gap Closing */}
        <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
          <button
            title="Lücken finden und schließen (horizontal über alle Spuren)"
            className="p-1.5 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center hover:text-white"
            onClick={closeAllGaps}
          >
            <GapCloseIcon />
            <span className="text-[10px] ml-1 font-semibold">Lücken schließen</span>
          </button>
        </div>
        <div className="flex-1"></div>
        <button className="px-4 py-1 bg-omega-accent hover:bg-blue-500 text-white text-xs rounded shadow transition-colors" onClick={() => onOpenExport?.(tracks, { selectionStart, selectionEnd }, exportSettings)}>Mixdown Export</button>
      </div>
 
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <motion.div 
          className="absolute top-0 w-[17px] z-[150] cursor-ew-resize flex justify-center pointer-events-auto transform -translate-x-1/2" 
          style={{ left: playheadMotionX, bottom: 32 }}
          onMouseDown={handlePlayheadDragMouseDown}
        >
           <div className="w-px bg-red-600 h-full shadow-[0_0_8px_rgba(255,0,0,0.5)] pointer-events-none"></div>
           <div className="absolute top-[8px] w-3.5 h-3.5 bg-red-600 rotate-45 border border-red-400 z-[160] shadow pointer-events-none"></div>
        </motion.div>
 
        {/* ── Export-Selektion: schmaler Streifen oberhalb des Rulers ────────── */}
        <div className="h-2 flex-shrink-0 relative bg-[#131518] z-[131] overflow-hidden"
          style={{ marginLeft: 128 /* align with ruler, not left column */ }}
        >
          <div className="absolute inset-0" style={{ transform: `translateX(-${scrollLeft}px)` }}>
            {/* Gesamter Hintergrund als dünne Linie */}
            <div className="absolute inset-y-0 left-0" style={{ width: totalTimelineWidth, background: 'rgba(30,33,38,1)' }} />
            {/* Blauer Selektionsbalken */}
            {selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd && (() => {
              const minVal = Math.min(selectionStart, selectionEnd);
              const maxVal = Math.max(selectionStart, selectionEnd);
              return (
                <div
                  className="absolute inset-y-0 bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]"
                  style={{
                    left: `${minVal * pixelsPerSecond}px`,
                    width: `${(maxVal - minVal) * pixelsPerSecond}px`,
                  }}
                />
              );
            })()}
          </div>
        </div>

        {/* ── Timecode-Ruler ───────────────────────────────────────────────────── */}
        <div className="h-8 border-b border-omega-border flex items-center bg-[#1a1d21] z-[130] relative">
           <div className="w-32 h-full flex-shrink-0 bg-omega-panel border-r border-omega-border flex items-center justify-end px-3 gap-2 shadow-[2px_0_5px_rgba(0,0,0,0.3)] z-[160]">
              <Unlock size={12} className="text-gray-500" />
              <Zap size={12} className="text-gray-500" />
              <ChevronDown size={12} className="text-gray-500" />
           </div>
           <div
             ref={rulerRef}
             className="flex-1 h-full relative overflow-hidden cursor-ew-resize select-none"
             onMouseDown={handleRulerMouseDown}
             onDoubleClick={handleRulerDoubleClick}
             onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
           >
              <div className="absolute inset-0 flex items-center" style={{ transform: `translateX(-${scrollLeft}px)` }}>
                 {[...Array(300)].map((_, i) => (
                    <div key={i} className="absolute h-full border-l border-gray-800 text-[9px] text-gray-500 pl-1 flex items-end pb-1.5" style={{ left: pixelsPerSecond * (i * 5) }}>{i * 5}s</div>
                 ))}
                 {/* Floating timecode badge – nur Dauer, kein Background-Fill mehr */}
                 {selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd && (() => {
                    const minVal = Math.min(selectionStart, selectionEnd);
                    const maxVal = Math.max(selectionStart, selectionEnd);
                    const duration = maxVal - minVal;

                    const formatTimecode = (secs: number) => {
                      const h = Math.floor(secs / 3600);
                      const m = Math.floor((secs % 3600) / 60);
                      const s = Math.floor(secs % 60);
                      const f = Math.floor((secs % 1) * 30);
                      const pad = (num: number) => String(num).padStart(2, '0');
                      return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
                    };

                    return (
                      <div
                        className="absolute top-0 bottom-0 border-l border-r border-blue-500/50 z-[10] flex items-center justify-center pointer-events-none"
                        style={{
                          left: `${minVal * pixelsPerSecond}px`,
                          width: `${(maxVal - minVal) * pixelsPerSecond}px`,
                        }}
                      >
                        <span className="text-blue-300 font-mono text-[9px] font-bold bg-[#1a1d21]/90 px-1.5 py-0.5 rounded border border-blue-500/40 shadow-sm select-none whitespace-nowrap">
                          {formatTimecode(duration)}
                        </span>
                      </div>
                    );
                 })()}
              </div>
           </div>
           <div className="w-6 border-l border-omega-border bg-[#282b30] h-full z-[160]"></div>
        </div>


        <div className="flex-1 flex overflow-hidden relative">
           <div className="w-32 bg-omega-panel border-r border-omega-border z-[160] shadow-[2px_0_5px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative">
              <div className="flex-1 overflow-hidden relative">
                 <div className="flex flex-col" style={{ transform: `translateY(-${scrollTop}px)` }}>
                   {tracks.map(track => (
                       <div key={track.id} className="border-b border-[#282b30] bg-omega-panel flex flex-col justify-center px-1 overflow-hidden" style={{ height: trackHeight }}>
                           {trackHeight >= 55 && (
                             <div className="flex items-center gap-1 mb-1 px-1">
                                <input value={track.name} placeholder="kein Name" onChange={(e) => updateTracksWithHistory(tracks.map(t => t.id === track.id ? { ...t, name: e.target.value } : t))} className="flex-1 h-4 bg-[#1a1d21] border border-gray-600 rounded-sm px-1 text-[9px] text-gray-300 outline-none focus:border-omega-accent" />
                                <ChevronDown size={8} className="text-gray-500" />
                                <Plus size={10} className="text-gray-400 hover:text-white cursor-pointer" />
                             </div>
                           )}
                           <div className="flex items-center gap-0.5 px-1 py-1 text-gray-400">
                              {track.locked ? <Lock size={10} className="cursor-pointer hover:text-white" onClick={() => updateTracksWithHistory(tracks.map(t => t.id === track.id ? { ...t, locked: false } : t))} /> : <Unlock size={10} className="cursor-pointer hover:text-white" onClick={() => updateTracksWithHistory(tracks.map(t => t.id === track.id ? { ...t, locked: true } : t))} />}
                              <span className={`text-[10px] font-bold px-0.5 cursor-pointer hover:text-white ${track.solo ? 'text-yellow-400' : ''}`} onClick={() => toggleSolo(track.id)}>S</span>
                              <span className={`text-[10px] font-bold px-0.5 cursor-pointer hover:text-white ${track.muted ? 'text-red-400' : ''}`} onClick={() => toggleMute(track.id)}>M</span>
                              <div className="relative group flex items-center">
                                <Volume2 size={10} className="ml-1 cursor-pointer hover:text-white" />
                                <input type="range" min="0" max="2" step="0.05" value={track.volume} onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))} className="absolute hidden group-hover:block w-16 h-1 top-0 left-4 z-50 accent-omega-accent" />
                              </div>
                              <div className="flex-1"></div>
                              <span className="text-[10px] font-mono">{track.index}</span>
                           </div>
                        </div>
                     ))}
                     <div style={{ height: 48 }} className="flex-shrink-0" />
                  </div>
               </div>
            </div>
            <div 
             className="flex-1 overflow-auto relative bg-[#1e2124] z-[60] scrollbar-hide" 
             onScroll={handleScroll} 
             onClick={handleTimelineClick} 
             onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('[data-region-id]') || target.tagName === 'INPUT' || target.tagName === 'BUTTON') return;
                e.preventDefault();
                e.stopPropagation();
                const menuWidth = 224; // w-56
                const menuHeight = 180; // geschätzte Höhe
                const constrainedX = Math.max(0, Math.min(e.clientX, window.innerWidth - menuWidth));
                const constrainedY = Math.max(0, Math.min(e.clientY, window.innerHeight - menuHeight));
                setEditorContextMenu({ x: constrainedX, y: constrainedY });
                setContextMenu(null);
              }}
             onWheel={(e) => {
               if (e.ctrlKey) {
                 e.preventDefault();
                 if (e.deltaY < 0) {
                   setZoomLevel(z => Math.min(z + 0.2, 20));
                 } else {
                   setZoomLevel(z => Math.max(z - 0.2, 0.05));
                 }
               } else {
                 // Normales Scrollen: horizontal durch die Timeline
                 e.preventDefault();
                 if (tracksRef.current) {
                   tracksRef.current.scrollLeft += e.deltaY;
                 }
               }
             }}
             onMouseDown={(e) => {
               // Only start lasso on primary click on the track area itself (not on a region)
               if (e.button !== 0 || e.ctrlKey) return;
               const target = e.target as HTMLElement;
               if (target.closest('[data-region-id]')) return;
               if (!tracksRef.current) return;
               const rect = tracksRef.current.getBoundingClientRect();
               const x = e.clientX - rect.left + tracksRef.current.scrollLeft;
               const y = e.clientY - rect.top + tracksRef.current.scrollTop;
               lassoStartRef.current = { x, y };
               isLassoActiveRef.current = false;
               setLassoRect(null);

               const onMouseMove = (me: MouseEvent) => {
                 if (!lassoStartRef.current || !tracksRef.current) return;
                 const r = tracksRef.current.getBoundingClientRect();
                 const ex = me.clientX - r.left + tracksRef.current.scrollLeft;
                 const ey = me.clientY - r.top + tracksRef.current.scrollTop;
                 const dx = ex - lassoStartRef.current.x;
                 const dy = ey - lassoStartRef.current.y;
                 if (!isLassoActiveRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
                   isLassoActiveRef.current = true;
                 }
                 if (isLassoActiveRef.current) {
                   setLassoRect({ startX: lassoStartRef.current.x, startY: lassoStartRef.current.y, endX: ex, endY: ey });
                 }
               };

               const onMouseUp = () => {
                 window.removeEventListener('mousemove', onMouseMove);
                 window.removeEventListener('mouseup', onMouseUp);
                 if (isLassoActiveRef.current && lassoStartRef.current && tracksRef.current) {
                   // Compute lasso rect in timeline-local coords
                   setLassoRect(prev => {
                     if (!prev || !tracksRef.current) return null;
                     const lx1 = Math.min(prev.startX, prev.endX);
                     const lx2 = Math.max(prev.startX, prev.endX);
                     const ly1 = Math.min(prev.startY, prev.endY);
                     const ly2 = Math.max(prev.startY, prev.endY);
                     // Find all regions whose pixel bounds intersect the lasso
                     const matched = new Set<string>();
                     tracks.forEach((track, trackIdx) => {
                       const trackTop = trackIdx * trackHeight;
                       const trackBottom = trackTop + trackHeight;
                       if (trackBottom < ly1 || trackTop > ly2) return;
                       track.regions.forEach(region => {
                         const rx1 = region.startPos * pixelsPerSecond;
                         const rx2 = rx1 + region.duration * pixelsPerSecond;
                         if (rx2 >= lx1 && rx1 <= lx2) {
                           matched.add(region.id);
                         }
                       });
                     });
                     setSelectedRegionIds(matched);
                     return null;
                   });
                 }
                 isLassoActiveRef.current = false;
                 lassoStartRef.current = null;
               };

               window.addEventListener('mousemove', onMouseMove);
               window.addEventListener('mouseup', onMouseUp);
             }}
             ref={tracksRef}
             onDrop={(e) => {
               // Fallback drop handler for the whole area
               const target = e.target as HTMLElement;
               if (!target.closest('[data-track-id]')) {
                  // If dropped outside a specific track, add to the first track or create a new one
                  onDrop(e, tracks[0]?.id || '1');
               }
             }}
             onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
           >
              <div className="min-h-full relative" style={{ width: totalTimelineWidth }}>
                 {/* Lasso selection overlay */}
                 {lassoRect && (() => {
                   const lx = Math.min(lassoRect.startX, lassoRect.endX);
                   const ly = Math.min(lassoRect.startY, lassoRect.endY);
                   const lw = Math.abs(lassoRect.endX - lassoRect.startX);
                   const lh = Math.abs(lassoRect.endY - lassoRect.startY);
                   return (
                     <div
                       className="absolute pointer-events-none z-50 border border-blue-400 bg-blue-400/10"
                       style={{ left: lx, top: ly, width: lw, height: lh }}
                     />
                   );
                 })()}
                 {/* Export Selection overlay – shown across all tracks */}
                 {selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd && (() => {
                   const minVal = Math.min(selectionStart, selectionEnd);
                   const maxVal = Math.max(selectionStart, selectionEnd);
                   return (
                     <div
                       className="absolute top-0 bottom-0 pointer-events-none z-[15] bg-blue-500/10 border-l-2 border-r-2 border-blue-500/50"
                       style={{
                         left: `${minVal * pixelsPerSecond}px`,
                         width: `${(maxVal - minVal) * pixelsPerSecond}px`,
                       }}
                     />
                   );
                 })()}
                 {tracks.map(track => (
                    <div 
                       key={track.id} 
                       data-track-id={track.id}
                       className="border-b border-[#282b30] hover:bg-[#25282c] relative bg-[repeating-linear-gradient(90deg,#222_0px,#222_1px,transparent_1px,transparent_100%)] bg-[length:50px_100%]" 
                       style={{ height: trackHeight }} 
                       onDrop={(e) => { e.stopPropagation(); onDrop(e, track.id); }} 
                       onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                       onClick={(e) => {
                          if (!(e.target as HTMLElement).closest('[data-region-id]')) {
                            setSelectedRegionIds(new Set());
                            setEditorContextMenu(null);
                          }
                        }}
                    >
                        {showAutomation && (
                          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-cyan-500/40 pointer-events-none z-[8]" title="Spurkurve: Lautstärke">
                            <span className="absolute left-4 -translate-y-1/2 bg-[#1e2124] text-[8px] text-cyan-400 font-mono px-1 rounded border border-cyan-500/20">Spurkurve: Volume</span>
                          </div>
                        )}
                        {track.regions.map(region => {
                           const regionWidthPx = region.duration * pixelsPerSecond;
                           const fadeInPx = (region.fadeIn || 0) * pixelsPerSecond;
                           const fadeOutPx = (region.fadeOut || 0) * pixelsPerSecond;
                           const gainLinear = region.gain !== undefined ? region.gain : 1.0;
                           const gainDb = gainLinear > 0 ? 20 * Math.log10(gainLinear) : -Infinity;
                           let gainYPercent = 50;
                           if (gainLinear <= 1.0) {
                             gainYPercent = 100 - gainLinear * 50;
                           } else {
                             gainYPercent = 50 - ((gainLinear - 1.0) / 3.0) * 50;
                           }
                           gainYPercent = Math.max(8, Math.min(92, gainYPercent));
                           const isHovered = hoveredRegionId === region.id;
                           const isSelected = selectedRegionIds.has(region.id);

                           // Crossfade: same-track overlap detection
                           const sortedOnTrack = [...track.regions].sort((a, b) => a.startPos - b.startPos);
                           const prevOnTrack = sortedOnTrack.find(r => r.id !== region.id && r.startPos + r.duration > region.startPos && r.startPos < region.startPos);
                           const nextOnTrack = sortedOnTrack.find(r => r.id !== region.id && r.startPos < region.startPos + region.duration && r.startPos > region.startPos);
                           const xfadeInPx  = prevOnTrack ? Math.max(0, (prevOnTrack.startPos + prevOnTrack.duration - region.startPos) * pixelsPerSecond) : 0;
                           const xfadeOutPx = nextOnTrack ? Math.max(0, (region.startPos + region.duration - nextOnTrack.startPos) * pixelsPerSecond) : 0;

                           // Manual fades shown only when no crossfade is active on that side
                           const showFadeIn  = fadeInPx  > 1 && xfadeInPx  < 1;
                           const showFadeOut = fadeOutPx > 1 && xfadeOutPx < 1;

                           return (
                             <div
                               key={region.id}
                               data-region-id={region.id}
                               onMouseDown={(e) => handleRegionMouseDown(e, track.id, region.id, 'move')}
                               onClick={(e) => handleRegionClick(e, track.id, region.id)}
                               onContextMenu={(e) => handleRegionContextMenu(e, region.id)}
                               onMouseEnter={() => setHoveredRegionId(region.id)}
                               onMouseLeave={() => setHoveredRegionId(null)}
                               className={`absolute top-0.5 bottom-0.5 border rounded overflow-hidden cursor-grab active:cursor-grabbing flex flex-col shadow-md ${
                                 isSelected
                                   ? 'border-[#ffbe00] shadow-[0_0_8px_rgba(255,190,0,0.3)] z-10'
                                   : 'border-black/50 z-1'
                               }`}
                               style={{ left: `${region.startPos * pixelsPerSecond}px`, width: `${regionWidthPx}px` }}
                             >
                               {/* Namensleiste (Header) */}
                               <div
                                 className={`h-[18px] select-none flex-shrink-0 font-semibold flex items-center justify-between px-2 text-[10px] truncate ${
                                   isSelected ? 'bg-[#ffbe00] text-black font-bold' : `${region.color} text-white`
                                 }`}
                               >
                                 <span className="truncate flex-1 pr-2">{region.file.name}</span>
                                 {region.groupId && (
                                   <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full flex-shrink-0 shadow" title="Gruppiert" />
                                 )}
                               </div>

                               {/* Körper (Body) */}
                               <div className="flex-1 bg-[#15171a] relative overflow-hidden pointer-events-auto">
                                 {/* z-[1]: Waveform — always at bottom */}
                                 <div className="absolute inset-0 z-[1] pointer-events-none">
                                   <WaveformRenderer filePath={region.file.path} sourceOffset={region.sourceOffset} duration={region.duration} fileDuration={region.fileDuration} />
                                 </div>

                                 {/* z-[2]: Crossfade-In (left side) */}
                                 {xfadeInPx > 1 && (
                                   <div className="absolute left-0 top-0 bottom-0 z-[2] pointer-events-none" style={{ width: `${xfadeInPx}px` }}>
                                     <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                                       <polygon points={`0,0 100,0 100,${gainYPercent} 0,100`} fill="rgba(0,0,0,0.28)" />
                                       <line x1="0" y1="100" x2="100" y2={gainYPercent} stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                                     </svg>
                                   </div>
                                 )}

                                 {/* z-[2]: Crossfade-Out (right side) */}
                                 {xfadeOutPx > 1 && (
                                   <div className="absolute right-0 top-0 bottom-0 z-[2] pointer-events-none" style={{ width: `${xfadeOutPx}px` }}>
                                     <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                                       <polygon points={`0,0 100,0 100,100 0,${gainYPercent}`} fill="rgba(0,0,0,0.28)" />
                                       <line x1="0" y1={gainYPercent} x2="100" y2="100" stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                                     </svg>
                                   </div>
                                 )}

                                 {/* z-[2]: Manual Fade-In (only when no crossfade on left) */}
                                 {showFadeIn && (
                                   <div className="absolute left-0 top-0 bottom-0 z-[2] pointer-events-none" style={{ width: `${fadeInPx}px` }}>
                                     <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                                       <polygon points={`0,0 100,0 100,${gainYPercent} 0,100`} fill="rgba(0,0,0,0.30)" />
                                       <line x1="0" y1="100" x2="100" y2={gainYPercent} stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                                     </svg>
                                   </div>
                                 )}

                                 {/* z-[2]: Manual Fade-Out (only when no crossfade on right) */}
                                 {showFadeOut && (
                                   <div className="absolute right-0 top-0 bottom-0 z-[2] pointer-events-none" style={{ width: `${fadeOutPx}px` }}>
                                     <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                                       <polygon points={`0,0 100,0 100,100 0,${gainYPercent}`} fill="rgba(0,0,0,0.30)" />
                                       <line x1="0" y1={gainYPercent} x2="100" y2="100" stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                                     </svg>
                                   </div>
                                 )}

                                 {/* z-[4]: Volume gain line (interactive, 14px hit area) */}
                                 <div
                                   className="absolute left-0 right-0 z-[4]"
                                   style={{ top: `${gainYPercent}%`, transform: 'translateY(-50%)', height: '14px', cursor: 'ns-resize', display: 'flex', alignItems: 'center' }}
                                   onMouseDown={(e) => {
                                     e.stopPropagation();
                                     e.preventDefault();
                                     const bodyEl = e.currentTarget.parentElement;
                                     if (bodyEl) {
                                       const rect = bodyEl.getBoundingClientRect();
                                       // Aktuellen Zustand im Verlauf speichern vor der Änderung
                                       HistoryManager.pushState(tracks);
                                       setDraggingGain({
                                         regionId: region.id,
                                         startY: e.clientY,
                                         startGain: gainLinear,
                                         containerTop: rect.top,
                                         containerHeight: rect.height
                                       });
                                     }
                                   }}
                                 >
                                   <div className={`w-full pointer-events-none transition-all ${(isHovered || draggingGain?.regionId === region.id) ? 'h-0.5 bg-white opacity-100' : 'h-px bg-white/45 opacity-80'}`} />
                                   {(isHovered || draggingGain?.regionId === region.id) && (
                                     <div className="absolute left-1/2 -translate-x-1/2 -top-6 bg-black/90 text-white text-[9px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-[50] shadow">
                                       {gainDb === -Infinity ? '-∞' : gainDb.toFixed(1)} dB
                                     </div>
                                   )}
                                   <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 shadow pointer-events-none transition-all ${(isHovered || draggingGain?.regionId === region.id) ? 'w-3 h-3 bg-white' : 'w-2.5 h-2.5 bg-white/75'}`} />
                                 </div>

                                 {/* z-[10]: Fade-In circular handle (Kugel - always visible) */}
                                 <div
                                   className="absolute z-[10] cursor-ew-resize flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group/fadein"
                                   style={{
                                     left: `${fadeInPx}px`,
                                     top: `${gainYPercent}%`,
                                     width: '18px',
                                     height: '18px',
                                   }}
                                   onMouseDown={(e) => {
                                     e.stopPropagation();
                                     e.preventDefault();
                                     HistoryManager.pushState(tracks);
                                     setDraggingFade({ regionId: region.id, edge: 'in', startX: e.clientX, startValue: region.fadeIn || 0 });
                                   }}
                                 >
                                   <div className={`rounded-full border border-white/60 shadow transition-all ${
                                     (draggingFade?.regionId === region.id && draggingFade?.edge === 'in')
                                       ? 'w-3.5 h-3.5 bg-omega-accent'
                                       : 'w-2.5 h-2.5 bg-white hover:bg-omega-accent group-hover/fadein:w-3.5 group-hover/fadein:h-3.5'
                                   }`} />
                                   {(isHovered || (draggingFade?.regionId === region.id && draggingFade?.edge === 'in')) && (
                                     <div className="absolute -top-7 bg-black/90 text-white text-[9px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-[50] shadow border border-gray-700/50">
                                       Einblenden: {(region.fadeIn || 0).toFixed(2)}s
                                     </div>
                                   )}
                                 </div>

                                 {/* z-[10]: Fade-Out circular handle (Kugel - always visible) */}
                                 <div
                                   className="absolute z-[10] cursor-ew-resize flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group/fadeout"
                                   style={{
                                     left: `${regionWidthPx - fadeOutPx}px`,
                                     top: `${gainYPercent}%`,
                                     width: '18px',
                                     height: '18px',
                                   }}
                                   onMouseDown={(e) => {
                                     e.stopPropagation();
                                     e.preventDefault();
                                     HistoryManager.pushState(tracks);
                                     setDraggingFade({ regionId: region.id, edge: 'out', startX: e.clientX, startValue: region.fadeOut || 0 });
                                   }}
                                 >
                                   <div className={`rounded-full border border-white/60 shadow transition-all ${
                                     (draggingFade?.regionId === region.id && draggingFade?.edge === 'out')
                                       ? 'w-3.5 h-3.5 bg-omega-accent'
                                       : 'w-2.5 h-2.5 bg-white hover:bg-omega-accent group-hover/fadeout:w-3.5 group-hover/fadeout:h-3.5'
                                   }`} />
                                   {(isHovered || (draggingFade?.regionId === region.id && draggingFade?.edge === 'out')) && (
                                     <div className="absolute -top-7 bg-black/90 text-white text-[9px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-[50] shadow border border-gray-700/50">
                                       Ausblenden: {(region.fadeOut || 0).toFixed(2)}s
                                     </div>
                                   )}
                                 </div>

                                 {/* z-[6]: Trim handles (left/right resize) */}
                                 <div className="absolute left-0 top-0 bottom-0 w-2 z-[6] cursor-w-resize hover:bg-white/20" onMouseDown={(e) => handleRegionMouseDown(e, track.id, region.id, 'trimStart')} />
                                 <div className="absolute right-0 top-0 bottom-0 w-2 z-[6] cursor-e-resize hover:bg-white/20" onMouseDown={(e) => handleRegionMouseDown(e, track.id, region.id, 'trimEnd')} />
                               </div>
                             </div>
                           );
                        })}
                     </div>
                  ))}
              </div>
           </div>

           <div className="w-6 bg-[#282b30] border-l border-omega-border flex flex-col items-center py-0.5 z-[160]">
              <button className="w-full h-4 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 text-[8px]">▴</button>
              <div className="flex-1 w-full px-1 py-1 relative bg-[#1a1d21] border-y border-gray-800 cursor-pointer" onMouseDown={onMouseDownV} ref={vScrollTrackRef}>
                  <div className="absolute left-1 right-1 bg-[#4a4d52] rounded shadow-sm hover:bg-gray-500 transition-colors pointer-events-none" style={{ height: `${Math.max(5, vThumbHeight)}%`, top: `${vThumbTop}%` }}></div>
              </div>
              <button className="w-full h-4 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 text-[8px]">▾</button>
              <button className="p-1 hover:bg-gray-700 rounded text-gray-400" onClick={() => setTrackHeight(h => Math.max(30, h - 10))}><Minus size={12} /></button>
              <button className="p-1 hover:bg-gray-700 rounded text-gray-400" onClick={() => setTrackHeight(h => Math.min(300, h + 10))}><Plus size={12} /></button>
           </div>
        </div>

        <div className="h-8 bg-omega-panel border-t border-omega-border flex items-center px-0 z-[140]">
            <div className="w-32 h-full border-r border-omega-border flex-shrink-0 bg-omega-panel shadow-[2px_0_5px_rgba(0,0,0,0.3)] z-[160] flex items-center justify-center p-1">
               <button onClick={addTrack} className="w-full h-full flex items-center justify-center hover:bg-gray-750 text-gray-500 hover:text-omega-accent transition-colors bg-[#202225] rounded border border-gray-700/80" title="Neue Audiospur hinzufügen"><Plus size={14} /></button>
            </div>
           <div className="flex-1 h-full flex items-center px-1 bg-omega-dark relative overflow-hidden">
              <div className="flex-1 h-3.5 bg-[#1a1d21] rounded relative overflow-hidden border border-gray-800 flex items-center shadow-inner cursor-pointer" onMouseDown={onMouseDownH} ref={hScrollTrackRef}>
                  <button className="w-4 h-full bg-[#2b2d31] border-r border-gray-700 flex items-center justify-center text-[8px] text-gray-400 hover:text-white">◀</button>
                  <div className="flex-1 h-full relative">
                     <div className="absolute top-0.5 bottom-0.5 bg-[#4a4d52] rounded shadow-sm hover:bg-gray-500 transition-colors pointer-events-none" style={{ width: `${Math.max(5, hThumbWidth)}%`, left: `${hThumbLeft}%` }}></div>
                  </div>
                  <button className="w-4 h-full bg-[#2b2d31] border-l border-gray-700 flex items-center justify-center text-[8px] text-gray-400 hover:text-white">▶</button>
              </div>
           </div>
           <div className="flex items-center gap-1.5 px-2 bg-[#282b30] h-full border-l border-omega-border relative z-[160]">
              <div className="flex items-center gap-0.5 text-gray-400 hover:text-white cursor-pointer px-1 h-full relative" onClick={(e) => { e.stopPropagation(); setZoomMenuOpen(!zoomMenuOpen); }}>
                 <span className="text-[10px] font-semibold min-w-[32px] text-right">{Math.round(zoomLevel * 100)}%</span>
                 <ChevronDown size={10} />
                 {zoomMenuOpen && (
                   <div className="absolute bottom-full mb-1 left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded text-omega-text flex flex-col w-24">
                     {[10, 25, 50, 100, 200, 400].map(z => (
                       <div key={z} className="px-3 py-1 hover:bg-omega-accent cursor-pointer text-xs" onClick={() => setZoomLevel(z / 100)}>{z}%</div>
                     ))}
                   </div>
                 )}
              </div>
              <div className="w-px h-4 bg-gray-700 mx-0.5"></div>
              <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><MoveHorizontal size={14} /></button>
              <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" onClick={() => setZoomLevel(1)}><Maximize2 size={14} /></button>
              <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" onClick={() => setZoomLevel(z => Math.max(0.05, z - 0.1))}><Minus size={14} /></button>
              <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" onClick={() => setZoomLevel(z => Math.min(20, z + 0.1))}><Plus size={14} /></button>
           </div>
           <div className="w-6 bg-[#282b30] h-full border-l border-omega-border flex-shrink-0 z-[160]"></div>
        </div>
      </div>

      <div className="h-5 bg-[#141619] border-t border-black flex items-center px-3 text-[10px] text-gray-500 gap-4 z-[160] select-none font-medium">
         <span className="flex items-center gap-1.5">
           <span className={`w-1.5 h-1.5 rounded-full ${
             perfStats.cpuUsage > 80 ? 'bg-red-500 shadow-[0_0_4px_#ef4444]' :
             perfStats.cpuUsage > 50 ? 'bg-yellow-500 shadow-[0_0_4px_#eab308]' :
             'bg-green-500 shadow-[0_0_4px_#22c55e]'
           }`} />
           CPU: {perfStats.cpuUsage}% (System: {perfStats.systemCpuPct || 0}%)
         </span>
         <div className="h-2 w-px bg-gray-800"></div>
         <span className="flex items-center gap-1.5">
           <span className={`w-1.5 h-1.5 rounded-full ${
             perfStats.systemRamPct > 90 ? 'bg-red-500 shadow-[0_0_4px_#ef4444]' :
             perfStats.systemRamPct > 70 ? 'bg-yellow-500 shadow-[0_0_4px_#eab308]' :
             'bg-green-500 shadow-[0_0_4px_#22c55e]'
           }`} />
           RAM: {(perfStats.processRamBytes / (1024 * 1024)).toFixed(1)} MB (System: {perfStats.systemRamPct}%)
         </span>
         <div className="h-2 w-px bg-gray-800"></div>
         <span>Disk: Bereit</span>

         {globalProgress !== null && (
           <>
             <div className="h-2 w-px bg-gray-800"></div>
             <div className="flex items-center gap-2 flex-1 max-w-[240px] text-omega-text bg-black/35 px-2 py-0.5 rounded border border-gray-800/40">
               <span className="truncate text-[9px] font-semibold text-gray-400">{globalProgressLabel || 'Verarbeite...'}</span>
               <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden relative border border-gray-700/30">
                 <div 
                   className="h-full bg-omega-accent shadow-[0_0_6px_rgba(59,130,246,0.8)] transition-all duration-300" 
                   style={{ width: `${globalProgress}%` }}
                 />
               </div>
               <span className="font-mono text-[9px] text-omega-accent font-semibold">{Math.round(globalProgress)}%</span>
             </div>
           </>
         )}

         <div className="flex-1"></div>
         <span className="font-mono text-omega-accent font-semibold">{playheadPos.toFixed(2)}s</span>
      </div>
    </div>
  )
}

