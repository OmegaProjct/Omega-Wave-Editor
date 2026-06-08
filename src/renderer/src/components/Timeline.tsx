import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, useMotionValue, useAnimationFrame } from 'framer-motion'
import { WaveformRenderer } from './WaveformRenderer'
import { HistoryManager } from '../lib/HistoryManager'
import { Play, Square, SkipBack, SkipForward, Plus, Minus, MousePointer2, Scissors, Music, ChevronDown, MoveHorizontal, Maximize2, Unlock, Eye, Volume2, Lock, Zap, Mic, Magnet, Link, Unlink, RotateCcw, RotateCw, ChevronRight } from 'lucide-react'
import { AudioCleaningModal } from './AudioCleaningModal'
import { ObjectPropertiesModal } from './ObjectPropertiesModal'
import { AudioRecordingModal } from './AudioRecordingModal'
import { AudioEngine } from '../lib/AudioEngine'
import { ProjectManager } from '../lib/ProjectManager'
import * as projectCore from '../../../common/projectCore'
import { MidiEngine } from '../lib/MidiEngine'
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
  channels?: number
  visualNameSuffix?: string
  name?: string
  comment?: string
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

const mergeSplitTracks = (tracksList: Track[]): Track[] => {
  let updatedTracks = tracksList.map(t => ({ ...t, regions: [...t.regions] }));
  
  for (let i = 0; i < updatedTracks.length; i++) {
    const trackL = updatedTracks[i];
    const leftRegions = trackL.regions.filter(r => r.stereoMode === 'left-only');
    
    for (const rL of leftRegions) {
      let bestTrackIdx = -1;
      let bestRegionIdx = -1;
      let minDistance = Infinity;
      
      for (let j = i + 1; j < updatedTracks.length; j++) {
        const trackR = updatedTracks[j];
        for (let k = 0; k < trackR.regions.length; k++) {
          const rR = trackR.regions[k];
          if (rR.stereoMode === 'right-only' && rR.file.path === rL.file.path) {
            const dist = Math.abs(rR.startPos - rL.startPos);
            if (dist < minDistance) {
              minDistance = dist;
              bestTrackIdx = j;
              bestRegionIdx = k;
            }
          }
        }
      }
      
      if (bestTrackIdx !== -1 && bestRegionIdx !== -1) {
        const rR = updatedTracks[bestTrackIdx].regions[bestRegionIdx];
        trackL.regions.push(rR);
        updatedTracks[bestTrackIdx].regions.splice(bestRegionIdx, 1);
      }
    }
  }
  
  updatedTracks = updatedTracks.filter((t, idx) => t.regions.length > 0 || idx === 0);
  updatedTracks = updatedTracks.map((t, idx) => ({ ...t, index: idx + 1 }));
  return updatedTracks;
};

const splitMergedTracks = (tracksList: Track[]): Track[] => {
  let updatedTracks = tracksList.map(t => ({ ...t, regions: [...t.regions] }));
  
  for (let i = 0; i < updatedTracks.length; i++) {
    const track = updatedTracks[i];
    const leftRegions = track.regions.filter(r => r.stereoMode === 'left-only');
    const rightRegions = track.regions.filter(r => r.stereoMode === 'right-only');
    
    const rightToMove: Region[] = [];
    
    for (const rR of rightRegions) {
      const hasMatchingLeft = leftRegions.some(rL => rL.file.path === rR.file.path);
      if (hasMatchingLeft) {
        rightToMove.push(rR);
      }
    }
    
    if (rightToMove.length > 0) {
      track.regions = track.regions.filter(r => !rightToMove.includes(r));
      
      const targetTrackIdx = i + 1;
      if (targetTrackIdx >= updatedTracks.length) {
        const nextIdx = updatedTracks.length + 1;
        const newTrack: Track = {
          id: nextIdx.toString(),
          index: nextIdx,
          name: '',
          regions: [],
          muted: false,
          solo: false,
          locked: false,
          visible: true,
          volume: 1,
          height: 64,
          automation: []
        };
        updatedTracks.push(newTrack);
      } else {
        updatedTracks[targetTrackIdx].regions.push(...rightToMove);
      }
    }
  }
  
  updatedTracks = updatedTracks.map((t, idx) => ({ ...t, index: idx + 1 }));
  return updatedTracks;
};

const shareChannels = (r1: Region, r2: Region): boolean => {
  const m1 = r1.stereoMode || 'stereo';
  const m2 = r2.stereoMode || 'stereo';
  return m1 === 'stereo' || m2 === 'stereo' || m1 === m2;
};

function LiveWaveformCanvas({ duration, pixelsPerSecond }: { duration: number; pixelsPerSecond: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [halfWaveform, setHalfWaveform] = useState<boolean>(false);

  useEffect(() => {
    if (window.api && typeof window.api.getSettings === 'function') {
      window.api.getSettings().then((s: any) => {
        if (s && typeof s.halfWaveform === 'boolean') {
          setHalfWaveform(s.halfWaveform);
        }
      });
    }

    const handleSettingsUpdate = (e: any) => {
      if (e.detail && typeof e.detail.halfWaveform === 'boolean') {
        setHalfWaveform(e.detail.halfWaveform);
      }
    };
    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    let peaksHistory: number[] = [];
    try {
      const historyStr = localStorage.getItem('recording_peaks_history');
      if (historyStr) {
        peaksHistory = JSON.parse(historyStr);
      }
    } catch (e) {}

    const centerY = height / 2;

    if (peaksHistory.length === 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const baselineY = halfWaveform ? height * 0.95 : centerY;
      ctx.moveTo(0, baselineY);
      ctx.lineTo(width, baselineY);
      ctx.stroke();
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f87171');
    gradient.addColorStop(0.5, '#ef4444');
    gradient.addColorStop(1, '#b91c1c');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    const step = width / peaksHistory.length;
    const boost = 2.5;

    if (halfWaveform) {
      const baseline = height * 0.95;
      peaksHistory.forEach((peak, i) => {
        const x = i * step;
        const amplitude = Math.min(1.0, Math.max(0.03, peak * boost));
        const drawHeight = amplitude * height * 0.90;
        ctx.moveTo(x, baseline);
        ctx.lineTo(x, baseline - drawHeight);
      });
    } else {
      peaksHistory.forEach((peak, i) => {
        const x = i * step;
        const amplitude = Math.min(1.0, Math.max(0.03, peak * boost));
        const drawHeight = amplitude * (height / 2) * 0.85;
        ctx.moveTo(x, centerY - drawHeight);
        ctx.lineTo(x, centerY + drawHeight);
      });
    }
    ctx.stroke();
  }, [duration, pixelsPerSecond, halfWaveform]);

  return <canvas ref={canvasRef} className="w-full h-full opacity-90 pointer-events-none" />;
}

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
  preMuteVolume?: number
  height: number
  automation: { time: number, value: number }[]
  volumeL?: number
  volumeR?: number
  mutedL?: boolean
  mutedR?: boolean
  soloL?: boolean
  soloR?: boolean
  lockedL?: boolean
  lockedR?: boolean
  nameL?: string
  nameR?: string
  preMuteVolumeL?: number
  preMuteVolumeR?: number
}

const PIXELS_PER_SECOND_BASE = 50 

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    const sFixed = s.toFixed(s % 1 === 0 ? 0 : 1);
    return sFixed !== '0' ? `${m}m ${sFixed}s` : `${m}m`;
  }
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
};

const getDbHeightPercentage = (linearLevel: number): number => {
  if (linearLevel <= 0.001) return 0;
  const db = 20 * Math.log10(linearLevel);
  const clampedDb = Math.max(-60, Math.min(0, db));
  return ((clampedDb + 60) / 60) * 100;
};

const gainToDb = (gain: number): string => {
  if (gain <= 0.001) return '-∞ dB';
  const db = 20 * Math.log10(gain);
  if (Math.abs(db) < 0.05) return '0.0 dB';
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
};

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
  const [showVerticalGuidelines, setShowVerticalGuidelines] = useState<boolean>(false)
  const [videoAudioOnOneTrack, setVideoAudioOnOneTrack] = useState<boolean>(true)

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
  const [jumpSizePlayback, setJumpSizePlayback] = useState<number>(3.0)
  const [jumpSizeStopped, setJumpSizeStopped] = useState<number>(1.0)
  const [activeShortcuts, setActiveShortcuts] = useState<KeyboardShortcuts>(normalizeKeyboardShortcuts(keyboardShortcuts))
  const playbackStartPosRef = useRef<number>(0)

  const [playheadPos, setPlayheadPos] = useState<number>(0)
  const playheadPosRef = useRef(0)
  const isDraggingPlayheadRef = useRef(false)
  const currentTracksRef = useRef<Track[]>(tracks)
  useEffect(() => {
    currentTracksRef.current = tracks
  }, [tracks])

  const lastRescheduleTimeRef = useRef<number>(0)
  const rescheduleTimeoutRef = useRef<any>(null)
  const playheadMotionX = useMotionValue(0)
  // playheadRulerMotionWidth removed – the blue bar is now an independent export selection marker
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const [vstRecording, setVstRecording] = useState<{ active: boolean; startTime: number; startPlayhead: number; pluginName: string } | null>(null);
  const [vstRecordingDuration, setVstRecordingDuration] = useState(0);
  const [audioRecording, setAudioRecording] = useState<{ active: boolean; startTime: number; startPlayhead: number } | null>(null);
  const [audioRecordingDuration, setAudioRecordingDuration] = useState(0);
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

  // Dynamische Timeline-Dauer und -Breite
  const timelineDuration = useMemo(() => {
    let maxRegionEnd = 0;
    tracks.forEach(t => {
      t.regions.forEach(r => {
        const pitchRate = r.effects?.pitchRate || 1.0;
        const end = r.startPos + (r.duration / pitchRate);
        if (end > maxRegionEnd) {
          maxRegionEnd = end;
        }
      });
    });
    return Math.max(600, maxRegionEnd + 120, playheadPos + 120);
  }, [tracks, playheadPos]);

  const totalTimelineWidth = timelineDuration * pixelsPerSecond 
  
  const getDisplayedTracks = useCallback((tracksList: Track[], videoAudioOnOneTrackVal: boolean) => {
    if (videoAudioOnOneTrackVal) {
      return tracksList.map(t => ({ ...t, originalTrackId: t.id }));
    }
    
    const result: any[] = [];
    tracksList.forEach((track) => {
      // Hat dieser Track Stereo-Inhalte? (D.h. mindestens eine Region, die nicht mono (1) ist)
      const hasStereo = track.regions.some(r => r.channels !== 1);
      
      if (hasStereo) {
        // Wir teilen den Track in zwei visuelle Tracks auf
        result.push({
          ...track,
          id: track.id + '_L',
          originalTrackId: track.id,
          name: track.nameL !== undefined ? track.nameL : (track.name ? `${track.name} [L]` : `Spur ${track.index} [L]`),
          volume: track.volumeL !== undefined ? track.volumeL : track.volume,
          muted: track.mutedL !== undefined ? track.mutedL : track.muted,
          solo: track.soloL !== undefined ? track.soloL : track.solo,
          locked: track.lockedL !== undefined ? track.lockedL : track.locked,
          regions: track.regions.map((r: Region) => ({
            ...r,
            stereoMode: r.channels !== 1 ? 'left-only' : r.stereoMode,
            visualNameSuffix: r.channels !== 1 ? ' [L]' : ' [Mono]'
          }))
        });
        result.push({
          ...track,
          id: track.id + '_R',
          originalTrackId: track.id,
          name: track.nameR !== undefined ? track.nameR : (track.name ? `${track.name} [R]` : `Spur ${track.index} [R]`),
          volume: track.volumeR !== undefined ? track.volumeR : track.volume,
          muted: track.mutedR !== undefined ? track.mutedR : track.muted,
          solo: track.soloR !== undefined ? track.soloR : track.solo,
          locked: track.lockedR !== undefined ? track.lockedR : track.locked,
          regions: track.regions.map((r: Region) => ({
            ...r,
            stereoMode: r.channels !== 1 ? 'right-only' : r.stereoMode,
            visualNameSuffix: r.channels !== 1 ? ' [R]' : ' [Mono]'
          }))
        });
      } else {
        // Wenn der Track nur Mono-Inhalte hat, bleibt er auf einer Spur
        result.push({
          ...track,
          originalTrackId: track.id,
          regions: track.regions.map((r: Region) => ({
            ...r,
            visualNameSuffix: ' [Mono]'
          }))
        });
      }
    });
    return result;
  }, []);

  const recalculateTrackVolumes = useCallback((currentTracks: Track[]) => {
    const dispTracks = getDisplayedTracks(currentTracks, videoAudioOnOneTrack);
    const hasSolo = dispTracks.some(t => t.solo);
    
    dispTracks.forEach(t => {
      let effectiveVolume = t.volume;
      if (hasSolo) {
        effectiveVolume = t.solo ? t.volume : 0;
      } else {
        effectiveVolume = t.muted ? 0 : t.volume;
      }
      engine.setTrackVolume(t.id, effectiveVolume);
    });
  }, [videoAudioOnOneTrack, engine, getDisplayedTracks]);

  const displayedTracks = useMemo(() => {
    return getDisplayedTracks(tracks, videoAudioOnOneTrack);
  }, [tracks, videoAudioOnOneTrack, getDisplayedTracks]);

  const guidelineInterval = useMemo(() => {
    // Dynamisches Intervall: Abstand zwischen Ticks/Linien soll mind. 80px betragen
    const intervals = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    for (const interval of intervals) {
      if (interval * pixelsPerSecond >= 80) {
        return interval;
      }
    }
    return 600;
  }, [pixelsPerSecond]);

  const visibleTicks = useMemo(() => {
    const viewportWidth = 3000;
    const startIdx = Math.max(0, Math.floor(scrollLeft / (pixelsPerSecond * guidelineInterval)) - 1);
    const endIdx = Math.ceil((scrollLeft + viewportWidth) / (pixelsPerSecond * guidelineInterval)) + 1;
    
    const maxIdx = Math.ceil(timelineDuration / guidelineInterval);
    const limitEndIdx = Math.min(maxIdx, endIdx);
    
    const result: number[] = [];
    for (let i = startIdx; i <= limitEndIdx; i++) {
      result.push(i);
    }
    return result;
  }, [scrollLeft, pixelsPerSecond, guidelineInterval, timelineDuration]);
  const [draggingRegion, setDraggingRegion] = useState<{
    id: string;
    trackId: string;
    initialStartPos: number;
    startX: number;
    action: 'move' | 'trimStart' | 'trimEnd';
    initialDuration: number;
    initialSourceOffset: number;
    initialFileDuration: number;
    pitchRate?: number;
    initialGroupPositions?: { id: string; initialStartPos: number }[];
  } | null>(null)
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
  const [trackContextMenu, setTrackContextMenu] = useState<{ x: number; y: number; trackId: string } | null>(null)
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

  const isInternalUpdateRef = useRef(false);

  const updateTracksWithHistory = (newTracks: Track[]) => {
    HistoryManager.pushState(tracks);
    setTracks(newTracks);
    if (onTracksChange) {
      isInternalUpdateRef.current = true;
      onTracksChange(newTracks);
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
      channels: 1,
      stereoMode: 'left-only' as const,
      file: { ...region.file, name: region.file.name + ' (Mono L)' }
    };

    const rightRegion = {
      ...region,
      id: Math.random().toString(36).substr(2, 9),
      channels: 1,
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

  const splitStereoTrack = (trackId: string) => {
    const targetTrack = tracks.find(t => t.id === trackId);
    if (!targetTrack) return;

    const stereoRegions = targetTrack.regions.filter(r => r.channels && r.channels !== 1);
    if (stereoRegions.length === 0) {
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Stereo aufteilen', message: 'Keine Stereo-Objekte auf dieser Spur vorhanden.' } }));
      return;
    }

    const trackIdx = tracks.findIndex(t => t.id === trackId);
    if (trackIdx === -1) return;

    let updatedTracks = [...tracks];
    let targetTrackId = '';

    if (trackIdx === tracks.length - 1) {
      const nextIdx = tracks.length + 1;
      const newTrack = { id: nextIdx.toString(), index: nextIdx, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] };
      updatedTracks.push(newTrack);
      targetTrackId = newTrack.id;
    } else {
      targetTrackId = tracks[trackIdx + 1].id;
    }

    const leftRegionsMap = new Map<string, any>();
    const rightRegionsList: any[] = [];

    targetTrack.regions.forEach(region => {
      if (region.channels && region.channels !== 1) {
        const leftRegion = {
          ...region,
          channels: 1,
          stereoMode: 'left-only' as const,
          groupId: undefined,
          file: { ...region.file, name: region.file.name + ' (Mono L)' }
        };

        const rightRegion = {
          ...region,
          id: Math.random().toString(36).substr(2, 9),
          channels: 1,
          stereoMode: 'right-only' as const,
          groupId: undefined,
          file: { ...region.file, name: region.file.name + ' (Mono R)' }
        };

        leftRegionsMap.set(region.id, leftRegion);
        rightRegionsList.push(rightRegion);
      } else {
        leftRegionsMap.set(region.id, region);
      }
    });

    updatedTracks = updatedTracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          regions: t.regions.map(r => leftRegionsMap.has(r.id) ? leftRegionsMap.get(r.id) : r)
        };
      }
      if (t.id === targetTrackId) {
        return {
          ...t,
          regions: [...t.regions, ...rightRegionsList]
        };
      }
      return t;
    });

    updateTracksWithHistory(updatedTracks);

    if (engine.isPlaying) {
      const dispTracks = getDisplayedTracks(updatedTracks, videoAudioOnOneTrack);
      dispTracks.forEach(t => {
        t.regions.forEach((r: any) => {
          engine.rescheduleRegion(t.id, r, t.regions);
        });
      });
    }
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
            if (eff.compThreshold !== undefined && eff.compRatio !== undefined) engine.updateActiveRegionCompressor(regionId, eff.compActive ?? false, eff.compThreshold, eff.compRatio);
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
    const defaults = { eqGains: new Array(10).fill(0), compActive: false, compThreshold: 0, compRatio: 1, deEsserActive: false, deEsserReduction: 0, reverbMix: 0, reverbTime: 1.5, delayTime: 300, delayFeedback: 0, pitchRate: 1.0 };
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => {
        if (r.id === regionId) {
          const updated = { ...r, effects: defaults };
          if (engine.isPlaying) {
            defaults.eqGains.forEach((g, i) => engine.updateActiveRegionEQ(regionId, i, g));
            engine.updateActiveRegionCompressor(regionId, false, 0, 1);
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
    const eff = sourceRegion.effects || { eqGains: new Array(10).fill(0), compActive: false, compThreshold: 0, compRatio: 1, deEsserActive: false, deEsserReduction: 0, reverbMix: 0, reverbTime: 1.5, delayTime: 300, delayFeedback: 0, pitchRate: 1.0 };
    
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => {
        if (r.id === regionId) return r;
        if (followingOnly && r.startPos <= sourceRegion.startPos) return r;
        
        const updated = { ...r, effects: { ...eff } };
        if (engine.isPlaying) {
          if (eff.eqGains) eff.eqGains.forEach((g, i) => engine.updateActiveRegionEQ(r.id, i, g));
          if (eff.compThreshold !== undefined && eff.compRatio !== undefined) engine.updateActiveRegionCompressor(r.id, eff.compActive ?? false, eff.compThreshold, eff.compRatio);
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
                if (eff.compThreshold !== undefined && eff.compRatio !== undefined) engine.updateActiveRegionCompressor(regionId, eff.compActive ?? false, eff.compThreshold, eff.compRatio);
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
    const allRegions = tracks.flatMap((t: any) => t.regions.map((r: any) => ({ ...r, trackId: t.id })));
    if (allRegions.length === 0) {
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Lücken schließen', message: 'Keine Lücken zum Schließen vorhanden.' } }));
      return;
    }

    // Nach Startposition sortieren
    const sortedRegions = [...allRegions].sort((a: any, b: any) => a.startPos - b.startPos);

    // Zusammenhängende Intervalle spurübergreifend mergen (Belegung ermitteln)
    const mergedIntervals: { start: number; end: number; regionIds: string[] }[] = [];
    sortedRegions.forEach((r: any) => {
      const start = r.startPos;
      const end = r.startPos + r.duration;
      
      // Überlappungen oder unmittelbar aneinandergrenzende Clips (Toleranz 1ms)
      if (mergedIntervals.length > 0 && start <= mergedIntervals[mergedIntervals.length - 1].end + 0.001) {
        const last = mergedIntervals[mergedIntervals.length - 1];
        last.end = Math.max(last.end, end);
        last.regionIds.push(r.id);
      } else {
        mergedIntervals.push({ start, end, regionIds: [r.id] });
      }
    });

    const newStartPosMap = new Map<string, number>();
    let changed = false;
    
    // Verschieben der Blöcke, um Lücken zu schließen
    let currentNewStart = 0;
    mergedIntervals.forEach((interval: any) => {
      const originalStart = interval.start;
      const shiftDelta = currentNewStart - originalStart;
      
      interval.regionIds.forEach((id: string) => {
        const r = allRegions.find((reg: any) => reg.id === id);
        if (r) {
          const newStart = r.startPos + shiftDelta;
          newStartPosMap.set(id, newStart);
        }
      });
      
      const newEnd = interval.end + shiftDelta;
      currentNewStart = newEnd;
    });

    const updatedTracks = tracks.map((track: any) => {
      return {
        ...track,
        regions: track.regions.map((r: any) => {
          if (newStartPosMap.has(r.id)) {
            const newStart = newStartPosMap.get(r.id)!;
            if (Math.abs(newStart - r.startPos) > 0.0001) {
              changed = true;
            }
            return {
              ...r,
              startPos: newStart
            };
          }
          return r;
        })
      };
    });

    if (!changed) {
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', { detail: { type: 'info', title: 'Lücken schließen', message: 'Keine Lücken zum Schließen vorhanden.' } }));
      return;
    }

    updateTracksWithHistory(updatedTracks);

    // Echte Echtzeit-Audioaktualisierung nach dem Schließen von Lücken!
    if (engine.isPlaying) {
      const dispTracks = getDisplayedTracks(updatedTracks, videoAudioOnOneTrack);
      
      dispTracks.forEach((track: any) => {
        track.regions.forEach((r: any) => {
          const originalRegion = tracks.flatMap((t: any) => t.regions).find((reg: any) => reg.id === r.id);
          if (originalRegion && Math.abs(originalRegion.startPos - r.startPos) > 0.0001) {
            engine.rescheduleRegion(track.id, r, track.regions);
          }
        });
      });
    }
  }, [tracks, updateTracksWithHistory, engine, getDisplayedTracks, videoAudioOnOneTrack]);

  const togglePlayback = useCallback(() => {
    console.log('[Timeline] togglePlayback called. isPlaying:', isPlaying, 'startPos:', playheadPosRef.current);
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
      console.log('[Timeline] Calling engine.play. tracks count:', displayedTracks?.length, 'startPos:', startPos);
      // Zuruecksetzen auf normale Wiedergabe vorwaerts
      engine.playbackSpeed = 1.0;
      engine.playbackDirection = 1;
      engine.play({ tracks: displayedTracks }, startPos)
      setIsPlaying(true)
    }
  }, [isPlaying, engine, displayedTracks, spacebarStops])

  const handleSaveRecord = async (filePath: string, durationSec: number, startPos?: number) => {
    const filename = filePath.split(/[\\/]/).pop() || 'Aufnahme.wav';
    const newRegion: Region = {
      id: Math.random().toString(36).substr(2, 9),
      file: { name: filename, path: filePath, isDirectory: false },
      startPos: startPos !== undefined ? startPos : playheadPos,
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

  const deleteSelectedRegions = useCallback(() => {
    if (selectedRegionIds.size === 0) return;
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.filter(r => !selectedRegionIds.has(r.id))
    }));
    updateTracksWithHistory(newTracks);
    setSelectedRegionIds(new Set());
  }, [selectedRegionIds, tracks]);

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
  const stripRef = useRef<HTMLDivElement>(null)
  const hScrollTrackRef = useRef<HTMLDivElement>(null)
  const vScrollTrackRef = useRef<HTMLDivElement>(null)

  const skipToStart = () => {
    setPlayheadPos(0);
    playheadPosRef.current = 0;
    if (isPlaying) { engine.stop(); engine.play({ tracks: displayedTracks }, 0); }
  };

  const skipToEnd = () => {
    const allRegions = tracks.flatMap(t => t.regions);
    if (allRegions.length === 0) return;
    const end = Math.max(...allRegions.map(r => r.startPos + r.duration));
    setPlayheadPos(end);
    playheadPosRef.current = end;
    if (isPlaying) { engine.stop(); engine.play({ tracks: displayedTracks }, end); }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (document.querySelector('[data-settings-modal="true"]')) return
      const isTextInput = 
        (target.tagName === 'INPUT' && ['text', 'number', 'email', 'search', 'password'].includes((target.getAttribute('type') || 'text').toLowerCase())) ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTextInput) return;

      if (matchesShortcut(e, activeShortcuts.setPlaybackStart)) {
        e.preventDefault();
        if (isPlaying) {
          const curTime = engine.currentTime;
          engine.pause();
          setIsPlaying(false);
          setPlayheadPos(curTime);
          playheadPosRef.current = curTime;
          playbackStartPosRef.current = curTime;
          console.log('[Timeline] setPlaybackStart (ArrowDown) gedrückt während Wiedergabe. Gestoppt bei:', curTime);
        } else {
          const curTime = playheadPosRef.current;
          playbackStartPosRef.current = curTime;
          console.log('[Timeline] setPlaybackStart (ArrowDown) gedrückt im Stillstand. Startpunkt bei:', curTime);
        }
      } else if (matchesShortcut(e, activeShortcuts.playAtPosition)) {
        e.preventDefault();
        if (e.repeat) return;
        if (isPlaying) {
          const curTime = engine.currentTime;
          engine.pause();
          setIsPlaying(false);
          setPlayheadPos(curTime);
          playheadPosRef.current = curTime;
        } else {
          const startPos = playheadPosRef.current;
          playbackStartPosRef.current = startPos;
          engine.playbackSpeed = 1.0;
          engine.playbackDirection = 1;
          engine.play({ tracks: displayedTracks }, startPos);
          setIsPlaying(true);
        }
      } else if (matchesShortcut(e, activeShortcuts.playForward)) {
        e.preventDefault();
        if (e.repeat) return;
        
        let newSpeed = 1.0;
        let newDir = 1;
        if (isPlaying) {
          if (engine.playbackDirection === 1) {
            // Vorwärts: Zyklisch erhöhen (1.0 -> 1.5 -> 2.0 -> 3.0 -> 4.0 -> 5.0 -> 1.0)
            if (engine.playbackSpeed === 1.0) newSpeed = 1.5;
            else if (engine.playbackSpeed === 1.5) newSpeed = 2.0;
            else if (engine.playbackSpeed === 2.0) newSpeed = 3.0;
            else if (engine.playbackSpeed === 3.0) newSpeed = 4.0;
            else if (engine.playbackSpeed === 4.0) newSpeed = 5.0;
            else newSpeed = 1.0;
            newDir = 1;
          } else {
            // Rückwärts: Schrittweise abbremsen in Richtung vorwärts
            newDir = -1;
            if (engine.playbackSpeed === 5.0) newSpeed = 4.0;
            else if (engine.playbackSpeed === 4.0) newSpeed = 3.0;
            else if (engine.playbackSpeed === 3.0) newSpeed = 2.0;
            else if (engine.playbackSpeed === 2.0) newSpeed = 1.5;
            else if (engine.playbackSpeed === 1.5) newSpeed = 1.0;
            else {
              // Bei 1.0x rückwärts wechseln wir zu 1.0x vorwärts
              newSpeed = 1.0;
              newDir = 1;
            }
          }
        }
        
        const curTime = isPlaying ? engine.currentTime : playheadPosRef.current;
        if (isPlaying) {
          engine.stop();
        }
        engine.playbackSpeed = newSpeed;
        engine.playbackDirection = newDir;
        engine.play({ tracks: displayedTracks }, curTime);
        setIsPlaying(true);
      } else if (matchesShortcut(e, activeShortcuts.playBackward)) {
        e.preventDefault();
        if (e.repeat) return;
        
        let newSpeed = 1.0;
        let newDir = -1;
        if (isPlaying) {
          if (engine.playbackDirection === -1) {
            // Rückwärts: Zyklisch erhöhen (1.0 -> 1.5 -> 2.0 -> 3.0 -> 4.0 -> 5.0 -> 1.0)
            if (engine.playbackSpeed === 1.0) newSpeed = 1.5;
            else if (engine.playbackSpeed === 1.5) newSpeed = 2.0;
            else if (engine.playbackSpeed === 2.0) newSpeed = 3.0;
            else if (engine.playbackSpeed === 3.0) newSpeed = 4.0;
            else if (engine.playbackSpeed === 4.0) newSpeed = 5.0;
            else newSpeed = 1.0;
            newDir = -1;
          } else {
            // Vorwärts: Schrittweise abbremsen in Richtung rückwärts
            newDir = 1;
            if (engine.playbackSpeed === 5.0) newSpeed = 4.0;
            else if (engine.playbackSpeed === 4.0) newSpeed = 3.0;
            else if (engine.playbackSpeed === 3.0) newSpeed = 2.0;
            else if (engine.playbackSpeed === 2.0) newSpeed = 1.5;
            else if (engine.playbackSpeed === 1.5) newSpeed = 1.0;
            else {
              // Bei 1.0x vorwärts wechseln wir zu 1.0x rückwärts
              newSpeed = 1.0;
              newDir = -1;
            }
          }
        }
        
        const curTime = isPlaying ? engine.currentTime : playheadPosRef.current;
        if (isPlaying) {
          engine.stop();
        }
        engine.playbackSpeed = newSpeed;
        engine.playbackDirection = newDir;
        engine.play({ tracks: displayedTracks }, curTime);
        setIsPlaying(true);
      } else if (matchesShortcut(e, activeShortcuts.jumpBackward)) {
        e.preventDefault();
        const curTime = isPlaying ? engine.currentTime : playheadPosRef.current;
        const step = isPlaying ? jumpSizePlayback : jumpSizeStopped;
        const targetPos = Math.max(0, curTime - step);
        
        setPlayheadPos(targetPos);
        playheadPosRef.current = targetPos;
        if (isPlaying) {
          engine.stop();
          engine.play({ tracks: displayedTracks }, targetPos);
        }
      } else if (matchesShortcut(e, activeShortcuts.jumpForward)) {
        e.preventDefault();
        const curTime = isPlaying ? engine.currentTime : playheadPosRef.current;
        const step = isPlaying ? jumpSizePlayback : jumpSizeStopped;
        const targetPos = curTime + step;
        
        setPlayheadPos(targetPos);
        playheadPosRef.current = targetPos;
        if (isPlaying) {
          engine.stop();
          engine.play({ tracks: displayedTracks }, targetPos);
        }
      } else if (matchesShortcut(e, activeShortcuts.normalizePeak)) {
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
        
        const regionsUnderPlayhead: { region: Region; trackId: string }[] = [];
        tracks.forEach(t => {
          t.regions.forEach(r => {
            if (curPlayhead > r.startPos && curPlayhead < r.startPos + r.duration) {
              regionsUnderPlayhead.push({ region: r, trackId: t.id });
            }
          });
        });

        if (regionsUnderPlayhead.length === 0) return;

        const hasSelectionUnderPlayhead = regionsUnderPlayhead.some(item => selectedRegionIds.has(item.region.id));

        let tempProject: any = {
          format: 'OWEP',
          version: '1.0.0',
          tracks: tracks,
          settings: { zoomLevel, sampleRate, playheadPos: curPlayhead },
          metadata: { createdAt: Date.now(), updatedAt: Date.now(), author: '' }
        };

        let changed = false;
        const newSelectedIds = new Set(selectedRegionIds);

        regionsUnderPlayhead.forEach(item => {
          const region = item.region;
          const trackId = item.trackId;

          const isTarget = hasSelectionUnderPlayhead ? selectedRegionIds.has(region.id) : true;

          if (isTarget) {
            const targetTrackBefore = tempProject.tracks.find((x: any) => x.id === trackId);
            const regionsBefore = targetTrackBefore ? [...targetTrackBefore.regions] : [];

            tempProject = projectCore.splitClip(tempProject, trackId, region.id, curPlayhead);
            
            const targetTrackAfter = tempProject.tracks.find((x: any) => x.id === trackId);
            if (targetTrackAfter) {
              const newRegions = targetTrackAfter.regions.filter((r: any) => !regionsBefore.some((rb: any) => rb.id === r.id));
              newRegions.forEach((nr: any) => newSelectedIds.add(nr.id));
            }

            changed = true;
          }
        });

        if (changed) {
          updateTracksWithHistory(tempProject.tracks as any);
          if (hasSelectionUnderPlayhead) {
            setSelectedRegionIds(newSelectedIds);
          }
        }
      } else if (matchesShortcut(e, activeShortcuts.trimStart) || matchesShortcut(e, activeShortcuts.trimStartAlt)) {
        e.preventDefault();
        const curPlayhead = playheadPosRef.current;
        
        const regionsUnderPlayhead: { region: Region; trackId: string }[] = [];
        tracks.forEach(t => {
          t.regions.forEach(r => {
            if (curPlayhead > r.startPos && curPlayhead < r.startPos + r.duration) {
              regionsUnderPlayhead.push({ region: r, trackId: t.id });
            }
          });
        });

        if (regionsUnderPlayhead.length === 0) return;

        const hasSelectionUnderPlayhead = regionsUnderPlayhead.some(item => selectedRegionIds.has(item.region.id));

        const newTracks = tracks.map(t => {
          let changed = false;
          const updatedRegions = t.regions.map(region => {
            const isUnderPlayhead = curPlayhead > region.startPos && curPlayhead < region.startPos + region.duration;
            if (!isUnderPlayhead) return region;

            const isTarget = hasSelectionUnderPlayhead ? selectedRegionIds.has(region.id) : true;

            if (isTarget) {
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

        const isChanged = newTracks.some((t, i) => t !== tracks[i]);
        if (isChanged) {
          updateTracksWithHistory(newTracks);
        }
      } else if (matchesShortcut(e, activeShortcuts.trimEnd)) {
        e.preventDefault();
        const curPlayhead = playheadPosRef.current;
        
        const regionsUnderPlayhead: { region: Region; trackId: string }[] = [];
        tracks.forEach(t => {
          t.regions.forEach(r => {
            if (curPlayhead > r.startPos && curPlayhead < r.startPos + r.duration) {
              regionsUnderPlayhead.push({ region: r, trackId: t.id });
            }
          });
        });

        if (regionsUnderPlayhead.length === 0) return;

        const hasSelectionUnderPlayhead = regionsUnderPlayhead.some(item => selectedRegionIds.has(item.region.id));

        const newTracks = tracks.map(t => {
          let changed = false;
          const updatedRegions = t.regions.map(region => {
            const isUnderPlayhead = curPlayhead > region.startPos && curPlayhead < region.startPos + region.duration;
            if (!isUnderPlayhead) return region;

            const isTarget = hasSelectionUnderPlayhead ? selectedRegionIds.has(region.id) : true;

            if (isTarget) {
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

        const isChanged = newTracks.some((t, i) => t !== tracks[i]);
        if (isChanged) {
          updateTracksWithHistory(newTracks);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedRegionId, selectedRegionIds, deleteSelectedRegions, togglePlayback, tracks, handleCopy, handlePaste, activeShortcuts]);

  const [vuLevel, setVuLevel] = useState(0);
  const [masterVolume, setMasterVolume] = useState(engine.getMasterVolume ? engine.getMasterVolume() : 0.8);
  const vuMaskLRef = useRef<HTMLDivElement>(null);
  const vuMaskRRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleVolumeChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ volume: number }>;
      setMasterVolume(customEvent.detail.volume);
    };
    window.addEventListener('MASTER_VOLUME_CHANGED', handleVolumeChanged);
    return () => {
      window.removeEventListener('MASTER_VOLUME_CHANGED', handleVolumeChanged);
    };
  }, []);

  useAnimationFrame(() => {
    // Direct DOM manipulation of the stereo VU meters for 60fps performance
    const levels = engine.getMasterLevels();
    const isPlayingAudio = engine.isPlaying;
    const lPercent = isPlayingAudio ? getDbHeightPercentage(levels.left) : 0;
    const rPercent = isPlayingAudio ? getDbHeightPercentage(levels.right) : 0;

    if (vuMaskLRef.current) {
      vuMaskLRef.current.style.height = `${100 - lPercent}%`;
    }
    if (vuMaskRRef.current) {
      vuMaskRRef.current.style.height = `${100 - rPercent}%`;
    }

    if (vstRecording && vstRecording.active) {
      const elapsed = (Date.now() - vstRecording.startTime) / 1000;
      setVstRecordingDuration(elapsed);
    }
    if (audioRecording && audioRecording.active) {
      const elapsed = (Date.now() - audioRecording.startTime) / 1000;
      setAudioRecordingDuration(elapsed);
    }

    const current = engine.currentTime;
    
    // Automatischer Stopp bei Rueckwaertsabspielen am Anfang des Projekts
    if (engine.isPlaying && engine.playbackDirection === -1 && current <= 0) {
      engine.stop();
      setIsPlaying(false);
      setPlayheadPos(0);
      playheadPosRef.current = 0;
      return;
    }

    if (engine.isPlaying && !isDraggingPlayheadRef.current) {
      playheadPosRef.current = current;
      
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

      playheadMotionX.set((current * pixelsPerSecond) - currentScrollLeft);
      
      if (Math.floor(current * 10) % 2 === 0) {
         setPlayheadPos(current);
         setVuLevel(engine.getMasterLevels().left);
      }
    }

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

  useEffect(() => {
    window.api.getSettings().then(s => {
      if (s) {
        if (s.maxUndoSteps !== undefined) HistoryManager.setMaxHistory(s.maxUndoSteps);
        if (s.sampleRate !== undefined) setSampleRate(s.sampleRate);
        if (s.autoScroll !== undefined) setAutoScroll(s.autoScroll);
        if (s.spacebarStops !== undefined) setSpacebarStops(s.spacebarStops);
        if (s.jumpSizePlayback !== undefined) setJumpSizePlayback(s.jumpSizePlayback);
        if (s.jumpSizeStopped !== undefined) setJumpSizeStopped(s.jumpSizeStopped);
        if (s.keyboardShortcuts !== undefined) setActiveShortcuts(normalizeKeyboardShortcuts(s.keyboardShortcuts));
        if (s.showVerticalGuidelines !== undefined) setShowVerticalGuidelines(s.showVerticalGuidelines);
        if (s.videoAudioOnOneTrack !== undefined) setVideoAudioOnOneTrack(s.videoAudioOnOneTrack);
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
    if (isInternalUpdateRef.current) return;
    setTracks(initialTracks);
  }, [initialTracks]);

  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const newSettings = customEvent.detail;
      if (!newSettings) return;

      if (newSettings.maxUndoSteps !== undefined) {
        HistoryManager.setMaxHistory(newSettings.maxUndoSteps);
      }
      if (newSettings.sampleRate !== undefined) {
        setSampleRate(newSettings.sampleRate);
      }
      if (newSettings.autoScroll !== undefined) {
        setAutoScroll(newSettings.autoScroll);
      }
      if (newSettings.spacebarStops !== undefined) {
        setSpacebarStops(newSettings.spacebarStops);
      }
      if (newSettings.jumpSizePlayback !== undefined) {
        setJumpSizePlayback(newSettings.jumpSizePlayback);
      }
      if (newSettings.jumpSizeStopped !== undefined) {
        setJumpSizeStopped(newSettings.jumpSizeStopped);
      }
      if (newSettings.keyboardShortcuts !== undefined) {
        setActiveShortcuts(normalizeKeyboardShortcuts(newSettings.keyboardShortcuts));
      }
      if (newSettings.showVerticalGuidelines !== undefined) {
        setShowVerticalGuidelines(newSettings.showVerticalGuidelines);
      }
      if (newSettings.videoAudioOnOneTrack !== undefined) {
        const newVal = newSettings.videoAudioOnOneTrack;
        setVideoAudioOnOneTrack(newVal);
        
        setTracks(prevTracks => {
          HistoryManager.pushState(prevTracks);
          let updatedTracks = [...prevTracks];
          if (newVal) {
            updatedTracks = mergeSplitTracks(updatedTracks);
          } else {
            updatedTracks = splitMergedTracks(updatedTracks);
          }
          
          if (engine.isPlaying) {
            const dispTracks = getDisplayedTracks(updatedTracks, newVal);
            dispTracks.forEach(t => {
              t.regions.forEach((r: any) => {
                engine.rescheduleRegion(t.id, r, t.regions);
              });
            });
          }
          
          if (onTracksChange) {
            onTracksChange(updatedTracks);
          }
          return updatedTracks;
        });
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
    if (isPlaying) return;
    playheadPosRef.current = playheadPos;
    playheadMotionX.set((playheadPos * pixelsPerSecond) - scrollLeft);
  }, [playheadPos, pixelsPerSecond, scrollLeft, isPlaying]);

  useEffect(() => {
    const handleActionPlay = () => {
      console.log('[Timeline] handleActionPlay (TIMELINE_ACTION_PLAY event received), triggering togglePlayback()');
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
        engine.play({ tracks: displayedTracks }, newPos);
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

  const rulerDoubleClickPendingRef = useRef(false);

  const handleStripDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    rulerDoubleClickPendingRef.current = true;
    setSelectionStart(null);
    setSelectionEnd(null);
    setTimeout(() => { rulerDoubleClickPendingRef.current = false; }, 300);
  };

  const handleStripMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setEditorContextMenu(null);
    setTrackContextMenu(null);
    setZoomMenuOpen(false);

    if (rulerDoubleClickPendingRef.current) return;

    const stripEl = stripRef.current;
    if (!stripEl) return;
    const rect = stripEl.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const clickedTime = (clickX + scrollLeft) / pixelsPerSecond;

    const isSelectionPresent = selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd;

    if (!isSelectionPresent) {
      if (e.button === 0) {
        const allRegions = tracks.flatMap(t => t.regions);
        const projectEnd = allRegions.length > 0 ? Math.max(...allRegions.map(r => r.startPos + r.duration)) : 30;
        setSelectionStart(clickedTime);
        setSelectionEnd(projectEnd);
      } else {
        setSelectionStart(0);
        setSelectionEnd(clickedTime);
      }
    } else {
      if (e.button === 0) {
        const currentEnd = selectionEnd !== null ? selectionEnd : clickedTime;
        setSelectionStart(clickedTime);
        setSelectionEnd(currentEnd);
      } else {
        const currentStart = selectionStart !== null ? selectionStart : 0;
        setSelectionStart(currentStart);
        setSelectionEnd(clickedTime);
      }
    }
  };
  
  const handlePlayheadDragMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setEditorContextMenu(null);
    setTrackContextMenu(null);
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
      
      if (wasPlaying) {
        engine.play({ tracks: displayedTracks }, playheadPosRef.current);
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
    setTrackContextMenu(null)
    setZoomMenuOpen(false)
    
    const target = e.target as HTMLElement;
    if (!target.closest('[data-region-id]') && !target.closest('button') && !target.closest('input')) {
      setSelectedRegionIds(new Set());
    }
  }

  const handleRegionContextMenu = (e: React.MouseEvent, regionId: string) => {
    e.preventDefault(); e.stopPropagation()
    setSelectedRegionId(regionId)
    const menuWidth = 224;
    const menuHeight = 380;
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
    const isL = trackId.endsWith('_L');
    const isR = trackId.endsWith('_R');
    const cleanTrackId = trackId.replace(/_[LR]$/, '');
    
    const newTracks = tracks.map(t => {
      if (t.id === cleanTrackId) {
        if (isL) return { ...t, volumeL: value };
        if (isR) return { ...t, volumeR: value };
        return { ...t, volume: value };
      }
      return t;
    });
    setTracks(newTracks);
    recalculateTrackVolumes(newTracks);
  }

  const updateTrackPan = (trackId: string, value: number) => {
    const isL = trackId.endsWith('_L');
    const isR = trackId.endsWith('_R');
    const cleanTrackId = trackId.replace(/_[LR]$/, '');
    
    const newTracks = tracks.map(t => {
      if (t.id === cleanTrackId) {
        if (isL) return { ...t, panL: value };
        if (isR) return { ...t, panR: value };
        return { ...t, pan: value };
      }
      return t;
    });
    setTracks(newTracks);
    engine.setTrackPan(trackId, value);
  }

  const toggleMute = (trackId: string) => {
    const isL = trackId.endsWith('_L');
    const isR = trackId.endsWith('_R');
    const cleanTrackId = trackId.replace(/_[LR]$/, '');
    
    const newTracks = tracks.map(t => {
      if (t.id === cleanTrackId) {
        if (isL) {
          const newMuted = !(t.mutedL !== undefined ? t.mutedL : t.muted);
          return { ...t, mutedL: newMuted };
        }
        if (isR) {
          const newMuted = !(t.mutedR !== undefined ? t.mutedR : t.muted);
          return { ...t, mutedR: newMuted };
        }
        const newMuted = !t.muted;
        return { ...t, muted: newMuted };
      }
      return t;
    });
    updateTracksWithHistory(newTracks);
    recalculateTrackVolumes(newTracks);
  }

  const toggleSolo = (trackId: string) => {
    const isL = trackId.endsWith('_L');
    const isR = trackId.endsWith('_R');
    const cleanTrackId = trackId.replace(/_[LR]$/, '');
    
    const newTracks = tracks.map(t => {
      if (t.id === cleanTrackId) {
        if (isL) return { ...t, soloL: !(t.soloL !== undefined ? t.soloL : t.solo) };
        if (isR) return { ...t, soloR: !(t.soloR !== undefined ? t.soloR : t.solo) };
        return { ...t, solo: !t.solo };
      }
      return t;
    });
    updateTracksWithHistory(newTracks);
    recalculateTrackVolumes(newTracks);
  }

  const toggleVolumeMute = (trackId: string) => {
    const isL = trackId.endsWith('_L');
    const isR = trackId.endsWith('_R');
    const cleanTrackId = trackId.replace(/_[LR]$/, '');
    const track = tracks.find(t => t.id === cleanTrackId);
    if (!track) return;

    const newTracks = tracks.map(t => {
      if (t.id === cleanTrackId) {
        if (isL) {
          const currentVol = t.volumeL !== undefined ? t.volumeL : t.volume;
          let newVolume = 0;
          let preMuteVolume = currentVol;
          if (currentVol > 0) {
            newVolume = 0;
            preMuteVolume = currentVol;
          } else {
            newVolume = t.preMuteVolumeL !== undefined ? t.preMuteVolumeL : 1.0;
          }
          return { ...t, volumeL: newVolume, preMuteVolumeL: preMuteVolume };
        }
        if (isR) {
          const currentVol = t.volumeR !== undefined ? t.volumeR : t.volume;
          let newVolume = 0;
          let preMuteVolume = currentVol;
          if (currentVol > 0) {
            newVolume = 0;
            preMuteVolume = currentVol;
          } else {
            newVolume = t.preMuteVolumeR !== undefined ? t.preMuteVolumeR : 1.0;
          }
          return { ...t, volumeR: newVolume, preMuteVolumeR: preMuteVolume };
        }
        let newVolume = 0;
        let preMuteVolume = t.volume;
        if (t.volume > 0) {
          newVolume = 0;
          preMuteVolume = t.volume;
        } else {
          newVolume = t.preMuteVolume !== undefined ? t.preMuteVolume : 1.0;
        }
        return { ...t, volume: newVolume, preMuteVolume };
      }
      return t;
    });
    updateTracksWithHistory(newTracks);
    recalculateTrackVolumes(newTracks);
  }


  const tracksRefForMidi = useRef(tracks);
  useEffect(() => {
    tracksRefForMidi.current = tracks;
  }, [tracks]);

  const isPlayingRefForMidi = useRef(isPlaying);
  useEffect(() => {
    isPlayingRefForMidi.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const checkVstRecordingState = () => {
      try {
        const savedState = localStorage.getItem('vst_recording_state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (parsed.active) {
            setVstRecording(prev => {
              if (prev?.active) return prev;
              const currentPlayhead = playheadPosRef.current;
              localStorage.setItem('vst_recording_start_playhead', currentPlayhead.toString());
              return {
                active: true,
                startTime: parsed.startTime || Date.now(),
                startPlayhead: currentPlayhead,
                pluginName: parsed.pluginName || 'Plugin'
              };
            });
          } else {
            setVstRecording(null);
            setVstRecordingDuration(0);
          }
        } else {
          setVstRecording(null);
          setVstRecordingDuration(0);
        }
      } catch (e) {
        console.error('Failed to parse vst_recording_state:', e);
      }
    };

    const checkAudioRecordingState = () => {
      try {
        const savedState = localStorage.getItem('audio_recording_state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (parsed.active) {
            setAudioRecording(prev => {
              if (prev?.active) return prev;
              const currentPlayhead = playheadPosRef.current;
              localStorage.setItem('audio_recording_start_playhead', currentPlayhead.toString());
              return {
                active: true,
                startTime: parsed.startTime || Date.now(),
                startPlayhead: currentPlayhead
              };
            });
          } else {
            setAudioRecording(null);
            setAudioRecordingDuration(0);
          }
        } else {
          setAudioRecording(null);
          setAudioRecordingDuration(0);
        }
      } catch (e) {
        console.error('Failed to parse audio_recording_state:', e);
      }
    };

    checkVstRecordingState();
    checkAudioRecordingState();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vst_recording_state') {
        checkVstRecordingState();
      } else if (e.key === 'audio_recording_state') {
        checkAudioRecordingState();
      } else if (e.key === 'vst_recording_action' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.action === 'play_daw') {
            if (!isPlayingRefForMidi.current) {
              togglePlayback();
            }
          } else if (parsed.action === 'stop_daw') {
            if (isPlayingRefForMidi.current) {
              togglePlayback();
            }
          } else if (parsed.action === 'toggle_daw') {
            togglePlayback();
          }
        } catch (err) {
          console.error('Failed to parse vst_recording_action:', err);
        }
      } else if (e.key === 'audio_recorded_finished' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.filePath && parsed.durationSec) {
            const filename = parsed.filePath.split(/[\\/]/).pop() || 'Aufnahme.wav';
            const newRegion: Region = {
              id: Math.random().toString(36).substr(2, 9),
              file: { name: filename, path: parsed.filePath, isDirectory: false },
              startPos: parsed.startPos || playheadPosRef.current,
              duration: parsed.durationSec,
              fileDuration: parsed.durationSec,
              sourceOffset: 0,
              color: 'bg-red-600'
            };
            updateTracksWithHistory(tracksRefForMidi.current.map((t, i) => i === 0 ? { ...t, regions: [...t.regions, newRegion] } : t));
            console.log('[Timeline] Imported recording from popout:', parsed.filePath);
          }
        } catch (err) {
          console.error('Failed to parse audio_recorded_finished:', err);
        }
      }
    };

    const handleAudioRecordStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      setAudioRecording(prev => {
        if (prev?.active) return prev;
        const currentPlayhead = playheadPosRef.current;
        return {
          active: true,
          startTime: detail.startTime || Date.now(),
          startPlayhead: currentPlayhead
        };
      });
    };

    const handleAudioRecordStop = () => {
      setAudioRecording(null);
      setAudioRecordingDuration(0);
    };

    const handleAudioRecordAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      if (detail.action === 'play_daw') {
        if (!isPlayingRefForMidi.current) {
          togglePlayback();
        }
      } else if (detail.action === 'stop_daw') {
        if (isPlayingRefForMidi.current) {
          togglePlayback();
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('AUDIO_RECORD_START', handleAudioRecordStart);
    window.addEventListener('AUDIO_RECORD_STOP', handleAudioRecordStop);
    window.addEventListener('AUDIO_RECORD_ACTION', handleAudioRecordAction);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('AUDIO_RECORD_START', handleAudioRecordStart);
      window.removeEventListener('AUDIO_RECORD_STOP', handleAudioRecordStop);
      window.removeEventListener('AUDIO_RECORD_ACTION', handleAudioRecordAction);
    };
  }, [togglePlayback]);

  useEffect(() => {
    const handleMidiPlay = () => {
      if (!isPlayingRefForMidi.current) {
        togglePlayback();
      }
    };

    const handleMidiStop = () => {
      if (isPlayingRefForMidi.current) {
        togglePlayback();
      } else {
        engine.stop();
        setIsPlaying(false);
        setPlayheadPos(0);
        playheadPosRef.current = 0;
      }
    };

    const handleMidiRecord = () => {
      window.api.openPopoutWindow('audio-recorder', { width: 600, height: 520, title: '🔴 Audio-Aufnahme' });
    };

    const handleMidiTrackVolume = (payload?: any) => {
      if (!payload) return;
      const { trackIndex, value } = payload;
      const currentTracks = tracksRefForMidi.current;
      if (trackIndex !== undefined && trackIndex >= 0 && trackIndex < currentTracks.length) {
        const track = currentTracks[trackIndex];
        updateTrackVolume(track.id, value);
      }
    };

    const handleMidiTrackMute = (payload?: any) => {
      if (!payload) return;
      const { trackIndex } = payload;
      const currentTracks = tracksRefForMidi.current;
      if (trackIndex !== undefined && trackIndex >= 0 && trackIndex < currentTracks.length) {
        const track = currentTracks[trackIndex];
        toggleMute(track.id);
      }
    };

    const handleMidiTrackSolo = (payload?: any) => {
      if (!payload) return;
      const { trackIndex } = payload;
      const currentTracks = tracksRefForMidi.current;
      if (trackIndex !== undefined && trackIndex >= 0 && trackIndex < currentTracks.length) {
        const track = currentTracks[trackIndex];
        toggleSolo(track.id);
      }
    };

    const handleMidiMasterVolume = (payload?: any) => {
      if (!payload) return;
      const { value } = payload;
      engine.setMasterVolume(value);
    };

    MidiEngine.addListener('transport_play', handleMidiPlay);
    MidiEngine.addListener('transport_stop', handleMidiStop);
    MidiEngine.addListener('transport_record', handleMidiRecord);
    MidiEngine.addListener('track_volume', handleMidiTrackVolume);
    MidiEngine.addListener('track_mute', handleMidiTrackMute);
    MidiEngine.addListener('track_solo', handleMidiTrackSolo);
    MidiEngine.addListener('master_volume', handleMidiMasterVolume);

    return () => {
      MidiEngine.removeListener('transport_play', handleMidiPlay);
      MidiEngine.removeListener('transport_stop', handleMidiStop);
      MidiEngine.removeListener('transport_record', handleMidiRecord);
      MidiEngine.removeListener('track_volume', handleMidiTrackVolume);
      MidiEngine.removeListener('track_mute', handleMidiTrackMute);
      MidiEngine.removeListener('track_solo', handleMidiTrackSolo);
      MidiEngine.removeListener('master_volume', handleMidiMasterVolume);
    };
  }, [togglePlayback, updateTrackVolume, toggleMute, toggleSolo, engine]);

  const onDrop = async (e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    const cleanTrackId = trackId.replace(/_[LR]$/, '');
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
            channels: info?.channels || 2,
            color: fileInfo.name.match(/\.(mp4|mkv|mov)$/i) ? 'bg-purple-600' : 'bg-omega-accent'
          }
          const newTracks = tracks.map(t => t.id === cleanTrackId ? { ...t, regions: [...t.regions, newRegion] } : t);
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
    const cleanTrackId = trackId.replace(/_[LR]$/, '');
    const region = tracks.flatMap(t => t.regions).find(r => r.id === regionId);
    if (!region) return;
    
    if (e.ctrlKey) {
      const next = new Set(selectedRegionIds);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      setSelectedRegionIds(next);
      return;
    }
    
    if (!selectedRegionIds.has(regionId)) {
      setSelectedRegionIds(new Set([regionId]));
    }
    
    HistoryManager.pushState(tracks); 
    
    const initialGroupPositions: { id: string; initialStartPos: number }[] = [];
    if (region.groupId) {
      tracks.forEach(t => {
        t.regions.forEach(r => {
          if (r.groupId === region.groupId && r.id !== regionId) {
            initialGroupPositions.push({ id: r.id, initialStartPos: r.startPos });
          }
        });
      });
    }

    setDraggingRegion({ 
      id: regionId, trackId: cleanTrackId, 
      initialStartPos: region.startPos, 
      initialDuration: region.duration,
      initialSourceOffset: region.sourceOffset || 0,
      initialFileDuration: region.fileDuration || region.duration,
      startX: e.clientX,
      action,
      pitchRate: region.effects?.pitchRate || 1.0,
      initialGroupPositions
    });
  }

  const snapPositionRef = useRef(snapEnabled);
  useEffect(() => { snapPositionRef.current = snapEnabled; }, [snapEnabled]);

  const applySnap = useCallback((newPos: number, dragRegionId: string, allTracks: typeof tracks): number => {
    if (!snapPositionRef.current) return newPos;
    const SNAP_THRESHOLD_SEC = 10 / pixelsPerSecond;
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
    const phDelta = Math.abs(newPos - playheadPosRef.current);
    if (phDelta < bestDelta) { snapped = playheadPosRef.current; }
    return snapped;
  }, [pixelsPerSecond]);

  const groupSelected = useCallback(() => {
    if (selectedRegionIds.size < 2) return;
    const groupId = Math.random().toString(36).substr(2, 9);
    const newTracks = tracks.map(t => ({
      ...t,
      regions: t.regions.map(r => selectedRegionIds.has(r.id) ? { ...r, groupId } : r)
    }));
    updateTracksWithHistory(newTracks);
  }, [selectedRegionIds, tracks]);

  const handleUnlinkClick = useCallback(() => {
    if (selectedRegionIds.size === 0) return;

    const selectedRegions = tracks.flatMap(t => t.regions).filter(r => selectedRegionIds.has(r.id));
    const stereoRegions = selectedRegions.filter(r => r.channels && r.channels !== 1);

    if (stereoRegions.length > 0) {
      let updatedTracks = [...tracks];
      for (const region of stereoRegions) {
        const currentTrack = updatedTracks.find(t => t.regions.some(r => r.id === region.id));
        if (!currentTrack) continue;

        const leftRegion = {
          ...region,
          channels: 1,
          stereoMode: 'left-only' as const,
          groupId: undefined,
          file: { ...region.file, name: region.file.name + ' (Mono L)' }
        };

        const rightRegion = {
          ...region,
          id: Math.random().toString(36).substr(2, 9),
          channels: 1,
          stereoMode: 'right-only' as const,
          groupId: undefined,
          file: { ...region.file, name: region.file.name + ' (Mono R)' }
        };

        const trackIdx = updatedTracks.findIndex(t => t.id === currentTrack.id);
        let targetTrackId = '';

        if (trackIdx === updatedTracks.length - 1) {
          const nextIdx = updatedTracks.length + 1;
          const newTrack = { id: nextIdx.toString(), index: nextIdx, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] };
          updatedTracks.push(newTrack);
          targetTrackId = newTrack.id;
        } else {
          targetTrackId = updatedTracks[trackIdx + 1].id;
        }

        updatedTracks = updatedTracks.map(t => {
          if (t.id === currentTrack.id) {
            return {
              ...t,
              regions: t.regions.map(r => r.id === region.id ? leftRegion : r)
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
      }
      updateTracksWithHistory(updatedTracks);
    } else {
      const hasGroup = selectedRegions.some(r => r.groupId !== undefined);
      if (hasGroup) {
        const newTracks = tracks.map(t => ({
          ...t,
          regions: t.regions.map(r => selectedRegionIds.has(r.id) ? { ...r, groupId: undefined } : r)
        }));
        updateTracksWithHistory(newTracks);
      }
    }
  }, [selectedRegionIds, tracks, updateTracksWithHistory]);

  useEffect(() => {
    if (!draggingGain) return;
    const onMove = (e: MouseEvent) => {
      const relativeY = e.clientY - draggingGain.containerTop;
      const yPercent = Math.max(0, Math.min(100, (relativeY / draggingGain.containerHeight) * 100));
      
      let newGain = 1.0;
      if (yPercent >= 50) {
        newGain = (100 - yPercent) / 50;
      } else {
        newGain = 1.0 + ((50 - yPercent) / 50) * 3.0;
      }
      
      newGain = Math.max(0, Math.min(4, newGain));

      setTracks(prev => prev.map(t => ({
        ...t,
        regions: t.regions.map(r => r.id === draggingGain.regionId ? { ...r, gain: newGain } : r)
      })));

      engine.updateActiveRegionVolume(draggingGain.regionId, newGain);
    };
    const onUp = () => {
      setDraggingGain(null);
      setTracks(cur => { if (onTracksChange) onTracksChange(cur); return cur; });
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 50);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [draggingGain, onTracksChange]);

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
      
      const prevTracks = currentTracksRef.current;
      let newTracks = [...prevTracks];
      const sourceTrackIdx = newTracks.findIndex(t => t.regions.some(r => r.id === draggingRegion.id));
      if (sourceTrackIdx === -1) return;
      
      const region = newTracks[sourceTrackIdx].regions.find(r => r.id === draggingRegion.id)!;
      const currentTrackId = newTracks[sourceTrackIdx].id;
      
      let updatedRegion = { ...region };
      let targetTrackId = currentTrackId;

      if (draggingRegion.action === 'move') {
        let minInitialStartPos = draggingRegion.initialStartPos;
        if (draggingRegion.initialGroupPositions) {
          draggingRegion.initialGroupPositions.forEach(gp => {
            if (gp.initialStartPos < minInitialStartPos) {
              minInitialStartPos = gp.initialStartPos;
            }
          });
        }

        const maxNegativeDelta = -minInitialStartPos;
        const clampedDeltaTime = Math.max(maxNegativeDelta, deltaTime);

        let newPos = Math.max(0, draggingRegion.initialStartPos + clampedDeltaTime);
        newPos = applySnap(newPos, draggingRegion.id, newTracks);

        const deltaPos = newPos - draggingRegion.initialStartPos;

        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const trackEl = elements.find(el => el.hasAttribute('data-track-id'));
        const hoverTrackId = trackEl ? trackEl.getAttribute('data-track-id') : null;
        const cleanHoverTrackId = hoverTrackId ? hoverTrackId.replace(/_[LR]$/, '') : null;

        const groupId = region.groupId;
        const groupMoveOffsets: Map<string, number> = new Map();
        if (groupId && draggingRegion.initialGroupPositions) {
          draggingRegion.initialGroupPositions.forEach(gp => {
            groupMoveOffsets.set(gp.id, Math.max(0, gp.initialStartPos + deltaPos));
          });
        }

        updatedRegion = { ...region, startPos: newPos };

        if (cleanHoverTrackId && currentTrackId !== cleanHoverTrackId) {
            newTracks[sourceTrackIdx] = { ...newTracks[sourceTrackIdx], regions: newTracks[sourceTrackIdx].regions.filter(r => r.id !== region.id) };
            const targetTrackIdx = newTracks.findIndex(t => t.id === cleanHoverTrackId);
            if (targetTrackIdx !== -1) {
                newTracks[targetTrackIdx] = { ...newTracks[targetTrackIdx], regions: [...newTracks[targetTrackIdx].regions, updatedRegion] };
                targetTrackId = cleanHoverTrackId;
            }
        } else {
            newTracks[sourceTrackIdx] = {
                ...newTracks[sourceTrackIdx],
                regions: newTracks[sourceTrackIdx].regions.map(r => r.id === draggingRegion.id ? updatedRegion : r)
            }
        }

        if (groupMoveOffsets.size > 0) {
          newTracks = newTracks.map(t => ({
            ...t,
            regions: t.regions.map(r => groupMoveOffsets.has(r.id) ? { ...r, startPos: groupMoveOffsets.get(r.id)! } : r)
          }));
        }

      } else if (draggingRegion.action === 'trimStart') {
        const pitchRate = draggingRegion.pitchRate || 1.0;
        const minPos = Math.max(0, draggingRegion.initialStartPos - (draggingRegion.initialSourceOffset / pitchRate));
        const maxDelta = (draggingRegion.initialDuration / pitchRate) - 0.1;
        const actualDelta = Math.min(deltaTime, maxDelta);
        const newPos = Math.max(minPos, draggingRegion.initialStartPos + actualDelta);
        const actualDeltaClamped = newPos - draggingRegion.initialStartPos;
        
        updatedRegion = { 
          ...region, 
          startPos: newPos, 
          duration: draggingRegion.initialDuration - actualDeltaClamped * pitchRate,
          sourceOffset: draggingRegion.initialSourceOffset + actualDeltaClamped * pitchRate
        };

        newTracks[sourceTrackIdx] = {
            ...newTracks[sourceTrackIdx],
            regions: newTracks[sourceTrackIdx].regions.map(r => r.id === draggingRegion.id ? updatedRegion : r)
        }
      } else if (draggingRegion.action === 'trimEnd') {
        const pitchRate = draggingRegion.pitchRate || 1.0;
        const fileDur = draggingRegion.initialFileDuration;
        const srcOff = draggingRegion.initialSourceOffset;
        const maxDur = Math.max(0.1, fileDur - srcOff);
        const newDuration = Math.min(maxDur, Math.max(0.1, draggingRegion.initialDuration + deltaTime * pitchRate));
        
        updatedRegion = { ...region, duration: newDuration };

        newTracks[sourceTrackIdx] = {
            ...newTracks[sourceTrackIdx],
            regions: newTracks[sourceTrackIdx].regions.map(r => r.id === draggingRegion.id ? updatedRegion : r)
        }
      }
      
      // Update UI state immediately for smooth 60fps movement
      setTracks(newTracks);

      // Throttle-with-trailing-edge audio engine rescheduling
      if (engine.isPlaying) {
        const triggerReschedule = () => {
          const dispTracks = getDisplayedTracks(newTracks, videoAudioOnOneTrack);
          
          let foundDispRegion: Region | null = null;
          let foundDispTrackId = '';
          let foundDispTrackRegions: Region[] = [];
          for (const t of dispTracks) {
            const r = t.regions.find((reg: any) => reg.id === draggingRegion.id);
            if (r) {
              foundDispRegion = r;
              foundDispTrackId = t.id;
              foundDispTrackRegions = t.regions;
              break;
            }
          }

          if (foundDispRegion && foundDispTrackId) {
            engine.rescheduleRegion(foundDispTrackId, foundDispRegion, foundDispTrackRegions);
          }

          if (region.groupId) {
            dispTracks.forEach(t => {
              t.regions.forEach((r: any) => {
                if (r.id !== draggingRegion.id && r.groupId === region.groupId) {
                  engine.rescheduleRegion(t.id, r, t.regions);
                }
              });
            });
          }
        };

        const now = Date.now();
        const THROTTLE_MS = 50;
        
        if (rescheduleTimeoutRef.current) {
          clearTimeout(rescheduleTimeoutRef.current);
          rescheduleTimeoutRef.current = null;
        }

        if (now - lastRescheduleTimeRef.current >= THROTTLE_MS) {
          triggerReschedule();
          lastRescheduleTimeRef.current = now;
        } else {
          const delay = THROTTLE_MS - (now - lastRescheduleTimeRef.current);
          rescheduleTimeoutRef.current = setTimeout(() => {
            triggerReschedule();
            lastRescheduleTimeRef.current = Date.now();
          }, delay);
        }
      }
    };
    
    const handleMouseUp = () => {
      if (rescheduleTimeoutRef.current) {
        clearTimeout(rescheduleTimeoutRef.current);
        rescheduleTimeoutRef.current = null;
      }

      setDraggingRegion(null);
      setTracks(current => {
         if (onTracksChange) onTracksChange(current);

         // Echte Finalisierung des Audioschnitts beim Loslassen
         if (engine.isPlaying) {
           const dispTracks = getDisplayedTracks(current, videoAudioOnOneTrack);
           let foundDispRegion: Region | null = null;
           let foundDispTrackId = '';
           let foundDispTrackRegions: Region[] = [];
           for (const t of dispTracks) {
             const r = t.regions.find((reg: any) => reg.id === draggingRegion.id);
             if (r) {
               foundDispRegion = r;
               foundDispTrackId = t.id;
               foundDispTrackRegions = t.regions;
               break;
             }
           }

           if (foundDispRegion && foundDispTrackId) {
             engine.rescheduleRegion(foundDispTrackId, foundDispRegion, foundDispTrackRegions);
           }

           // Reschedule andere Regionen in der Gruppe
           const sourceTrackIdx = current.findIndex(t => t.regions.some((r: any) => r.id === draggingRegion.id));
           if (sourceTrackIdx !== -1) {
             const region = current[sourceTrackIdx].regions.find((r: any) => r.id === draggingRegion.id)!;
             if (region.groupId) {
               dispTracks.forEach(t => {
                 t.regions.forEach((r: any) => {
                   if (r.id !== draggingRegion.id && r.groupId === region.groupId) {
                     engine.rescheduleRegion(t.id, r, t.regions);
                   }
                 });
               });
             }
           }
         }

         return current;
      });
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 50);
    }
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
       window.removeEventListener('mousemove', handleMouseMove);
       window.removeEventListener('mouseup', handleMouseUp);
       if (rescheduleTimeoutRef.current) {
         clearTimeout(rescheduleTimeoutRef.current);
       }
    }
  }, [draggingRegion, pixelsPerSecond, onTracksChange, applySnap, getDisplayedTracks, videoAudioOnOneTrack]);


  const handleRegionClick = (e: React.MouseEvent, trackId: string, regionId: string) => {
    e.stopPropagation();
    const cleanTrackId = trackId.replace(/_[LR]$/, '');
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
      
      const nextProject = projectCore.splitClip(tempProject, cleanTrackId, regionId, splitTime);
      updateTracksWithHistory(nextProject.tracks as any);
    } else if (!e.ctrlKey) {
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
      {showProperties && (
        <ObjectPropertiesModal 
          onClose={() => setShowProperties(false)} 
          region={selectedRegion} 
          onSave={(updatedFields) => {
            if (!selectedRegionId) return;
            const newTracks = tracks.map(t => ({
              ...t,
              regions: t.regions.map(r => r.id === selectedRegionId ? { ...r, ...updatedFields } : r)
            }));
            updateTracksWithHistory(newTracks);
          }}
        />
      )}


      {contextMenu && (
        <div className="fixed bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 z-[9999] text-xs w-56 flex flex-col select-none" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <button 
            className="text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white flex items-center justify-between font-semibold border-b border-gray-700/60 pb-1.5 text-gray-100 group cursor-pointer transition-colors"
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
          <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { setShowCleaning(true); setContextMenu(null); }}>
            Audio Cleaning... <span className="text-[10px] text-gray-500 group-hover:text-gray-200 transition-colors font-mono">Objekt</span>
          </button>
          <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { setShowProperties(true); setContextMenu(null); }}>Objekteigenschaften...</button>
          
          <div className="h-px bg-gray-700/50 my-1 mx-1"></div>

          <div className="relative" onMouseEnter={() => setNormalizeSubmenuOpen(true)} onMouseLeave={() => setNormalizeSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer">
              Normalisieren <ChevronRight size={13} className="text-gray-500 group-hover:text-white transition-colors" />
            </button>
            {normalizeSubmenuOpen && (
              <div className={`absolute left-full bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 w-56 z-[10000] ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { normalizePeak(contextMenu.regionId); setContextMenu(null); }}>
                  Maximalpegel <span className="text-[9px] text-gray-500 group-hover:text-gray-200 transition-colors">Alt+N</span>
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { normalizeRMS(contextMenu.regionId); setContextMenu(null); }}>
                  Lautstärke (EBU R128)
                </button>
              </div>
            )}
          </div>

          <div className="relative" onMouseEnter={() => setDbSubmenuOpen(true)} onMouseLeave={() => setDbSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer">
              Lautstärke setzen <ChevronRight size={13} className="text-gray-500 group-hover:text-white transition-colors" />
            </button>
            {dbSubmenuOpen && (
              <div className={`absolute left-full bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 w-32 max-h-60 overflow-y-auto z-[10000] ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                {dbOptions.map(opt => (
                  <button key={opt.label} className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { updateRegionGain(contextMenu.regionId, opt.value); setContextMenu(null); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" onMouseEnter={() => setStereoSubmenuOpen(true)} onMouseLeave={() => setStereoSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer">
              Stereo-Objekt <ChevronRight size={13} className="text-gray-500 group-hover:text-white transition-colors" />
            </button>
            {stereoSubmenuOpen && (
              <div className={`absolute left-full bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 w-56 z-[10000] ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { splitStereoRegion(contextMenu.regionId); setContextMenu(null); }}>
                  In Mono-Objekte aufteilen
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { setStereoMode(contextMenu.regionId, 'left-only'); setContextMenu(null); }}>
                  Nur linke Seite verwenden
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { setStereoMode(contextMenu.regionId, 'right-only'); setContextMenu(null); }}>
                  Nur rechte Seite verwenden
                </button>
              </div>
            )}
          </div>

          <div className="relative" onMouseEnter={() => setResetSubmenuOpen(true)} onMouseLeave={() => setResetSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer">
              Spurkurven <ChevronRight size={13} className="text-gray-500 group-hover:text-white transition-colors" />
            </button>
            {resetSubmenuOpen && (
              <div className={`absolute left-full bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 w-52 z-[10000] ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { setShowAutomation(s => !s); setContextMenu(null); }}>
                  Spurkurven anzeigen <span className="text-[9px] text-gray-500 group-hover:text-gray-200 transition-colors">Alt+K</span>
                </button>
                <div className="h-px bg-gray-700/50 my-1 mx-1"></div>
                <div className="px-3 py-0.5 text-[10px] text-gray-500 font-semibold">Spurkurven zurücksetzen:</div>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors pl-6 text-gray-300 group cursor-pointer" onClick={() => { resetTrackCurves('volume'); setContextMenu(null); }}>
                  Lautstärke
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors pl-6 text-gray-300 group cursor-pointer" onClick={() => { resetTrackCurves('pan'); setContextMenu(null); }}>
                  Balance
                </button>
              </div>
            )}
          </div>

          <div className="relative" onMouseEnter={() => setEffectsSubmenuOpen(true)} onMouseLeave={() => setEffectsSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer">
              Audioeffekte <ChevronRight size={13} className="text-gray-500 group-hover:text-white transition-colors" />
            </button>
            {effectsSubmenuOpen && (
              <div className={`absolute left-full bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 w-64 z-[10000] ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { loadEffectsPreset(contextMenu.regionId); setContextMenu(null); }}>
                  Audioeffekt laden... <span className="text-[9px] text-gray-500 group-hover:text-gray-200 transition-colors">Strg++</span>
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { saveEffectsPreset(contextMenu.regionId); setContextMenu(null); }}>
                  Audioeffekt speichern... <span className="text-[9px] text-gray-500 group-hover:text-gray-200 transition-colors">Umschalt++</span>
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { resetEffects(contextMenu.regionId); setContextMenu(null); }}>
                  Audioeffekt zurücksetzen <span className="text-[9px] text-gray-500 group-hover:text-gray-200 transition-colors">Strg+Alt++</span>
                </button>
                <div className="h-px bg-gray-700/50 my-1 mx-1"></div>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { copyEffects(contextMenu.regionId); setContextMenu(null); }}>
                  Audioeffekte kopieren
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-300" onClick={() => { pasteEffects(contextMenu.regionId); setContextMenu(null); }} disabled={!effectsClipboard}>
                  Audioeffekte einfügen <span className="text-[9px] text-gray-500 group-hover:text-gray-200 transition-colors">Umschalt+-</span>
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { applyEffectsToAll(contextMenu.regionId, false); setContextMenu(null); }}>
                  Auf alle anwenden...
                </button>
                <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 group cursor-pointer" onClick={() => { applyEffectsToAll(contextMenu.regionId, true); setContextMenu(null); }}>
                  Auf alle folgenden anwenden...
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-700/50 my-1 mx-1"></div>

          <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { handleCopy(); setContextMenu(null); }}>
            Kopieren <span className="text-[10px] text-gray-500 group-hover:text-gray-200 transition-colors">Strg+C</span>
          </button>
          <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { handleCopy(); updateTracksWithHistory(tracks.map(t => ({ ...t, regions: t.regions.filter(r => r.id !== contextMenu.regionId) }))); setContextMenu(null); }}>
            Ausschneiden <span className="text-[10px] text-gray-500 group-hover:text-gray-200 transition-colors">Strg+X</span>
          </button>
          <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { updateTracksWithHistory(tracks.map(t => ({ ...t, regions: t.regions.filter(r => r.id !== contextMenu.regionId) }))); setContextMenu(null); }}>
            Löschen <span className="text-[10px] text-gray-500 group-hover:text-gray-200 transition-colors">Entf</span>
          </button>
          
          <div className="h-px bg-gray-700/50 my-1 mx-1"></div>

          <div className="relative" onMouseEnter={() => setColorSubmenuOpen(true)} onMouseLeave={() => setColorSubmenuOpen(false)}>
            <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer">
              Objektfarbe <ChevronRight size={13} className="text-gray-500 group-hover:text-white transition-colors" />
            </button>
            {colorSubmenuOpen && (
              <div className={`absolute left-full bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 w-36 z-[10000] ${isBottomHalf ? 'bottom-0' : 'top-0'}`}>
                {REGION_COLORS.map(c => (
                  <button
                    key={c.value}
                    className="w-full text-left px-3 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center gap-2 text-gray-300 group cursor-pointer"
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
        <div className="fixed bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 z-[9999] text-xs w-56 flex flex-col select-none" style={{ top: editorContextMenu.y, left: editorContextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { handlePaste(); setEditorContextMenu(null); }}>
            Objekt einfügen <span className="text-[9px] text-gray-500 group-hover:text-gray-200 transition-colors font-sans">Strg+V</span>
          </button>
          <div className="h-px bg-gray-700/50 my-1 mx-1"></div>
          <button className="w-full text-left px-4 py-1.5 text-gray-500 cursor-not-allowed opacity-50" disabled>Bereich über Leerraum (Platzhalter)</button>
          <button className="w-full text-left px-4 py-1.5 text-gray-500 cursor-not-allowed opacity-50" disabled>Leerraum mit Standbild füllen (Platzhalter)</button>
          <div className="h-px bg-gray-700/50 my-1 mx-1"></div>
          <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer" onClick={() => { setShowAutomation(s => !s); setEditorContextMenu(null); }}>
            Spurkurven anzeigen <span className="text-[9px] text-gray-500 group-hover:text-gray-200 transition-colors">Alt+K</span>
          </button>
          <div className="relative group">
            <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 group cursor-pointer">
              Spurkurven zurücksetzen <ChevronRight size={13} className="text-gray-500 group-hover:text-white transition-colors" />
            </button>
            <div className={`absolute left-full bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 w-36 hidden group-hover:block z-[10000] ${isEditorBottomHalf ? 'bottom-0' : 'top-0'}`}>
              <button className="w-full text-left px-3 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 cursor-pointer" onClick={() => { resetTrackCurves('volume'); setEditorContextMenu(null); }}>Lautstärke</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-omega-accent hover:text-white transition-colors text-gray-300 cursor-pointer" onClick={() => { resetTrackCurves('pan'); setEditorContextMenu(null); }}>Balance</button>
            </div>
          </div>
          <div className="h-px bg-gray-700/50 my-1 mx-1"></div>
          <button className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center gap-2 font-semibold text-gray-100 cursor-pointer" onClick={() => { closeAllGaps(); setEditorContextMenu(null); }}>
            <GapCloseIcon />
            Lücken finden & schließen
          </button>
        </div>
      )}
 
      {trackContextMenu && (
        <div 
          className="fixed bg-[#1e2124]/95 backdrop-blur-md text-gray-200 border border-gray-700/60 rounded-lg shadow-2xl py-1.5 z-[9999] text-xs w-60 flex flex-col select-none" 
          style={{ top: trackContextMenu.y, left: trackContextMenu.x }} 
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-4 py-1.5 hover:bg-omega-accent hover:text-white transition-colors flex items-center justify-between text-gray-300 font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            onClick={() => {
              splitStereoTrack(trackContextMenu.trackId);
              setTrackContextMenu(null);
            }}
            disabled={!tracks.find(t => t.id === trackContextMenu.trackId)?.regions.some(r => r.channels && r.channels !== 1)}
          >
            Spur: Stereo in zwei Mono-Spuren aufteilen
          </button>
        </div>
      )}

      <div className="h-10 border-b border-omega-border flex items-center bg-omega-panel px-2 gap-2 z-[150]">
        <div className="flex gap-1 border-r border-gray-700 pr-2">
           <button title="Auswahlwerkzeug" className={`p-1.5 rounded ${toolMode === 'select' ? 'text-white bg-omega-accent' : 'hover:bg-gray-700 text-gray-400'}`} onClick={() => setToolMode('select')}>
             <MousePointer2 size={16} />
           </button>
           <button title="Schneidewerkzeug (T)" className={`p-1.5 rounded ${toolMode === 'scissors' ? 'text-white bg-omega-accent' : 'hover:bg-gray-700 text-gray-400'}`} onClick={() => setToolMode('scissors')}>
             <Scissors size={16} />
           </button>
        </div>
        <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
            <button 
              title="Audioaufnahme" 
              className={`p-1.5 rounded transition-all ${audioRecording?.active ? 'text-red-500 animate-pulse bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.5)] border border-red-500/30' : 'hover:bg-gray-700 text-gray-400'}`} 
              onClick={() => {
                window.api.openPopoutWindow('audio-recorder', { width: 600, height: 520, title: '🔴 Audio-Aufnahme' });
              }}
            >
              <Mic size={16} />
            </button>
        </div>
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
          <button title="Gruppe auflösen" className="p-1.5 hover:bg-gray-700 rounded" onClick={handleUnlinkClick} disabled={selectedRegionIds.size === 0}>
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
        <button className="px-4 py-1 bg-omega-accent hover:bg-blue-500 text-white text-xs rounded shadow transition-colors" onClick={() => onOpenExport?.(displayedTracks, { selectionStart, selectionEnd }, exportSettings)}>Mixdown Export</button>
      </div>
 
      <div className="flex-1 flex overflow-hidden relative">
        {/* Master Volume Column */}
        <div className="w-[72px] h-full bg-[#16181b] border-r border-omega-border z-[160] flex flex-col items-center py-2.5 flex-shrink-0">
          {/* decibel display */}
          <div className="text-[10px] font-mono text-[#a8b2c1] bg-[#0c0d0f] border border-[#23262c] px-1.5 py-0.5 rounded shadow-inner mb-3.5 select-none w-14 text-center">
            {gainToDb(masterVolume)}
          </div>
          
          {/* VU Meters and Fader */}
          <div className="flex-1 flex gap-1.5 h-full relative items-stretch mb-2">
            {/* dB Scale */}
            <div className="flex flex-col justify-between text-[8px] font-mono text-gray-500 select-none pr-1">
              <span>0</span>
              <span>-6</span>
              <span>-12</span>
              <span>-18</span>
              <span>-24</span>
              <span>-36</span>
              <span>-48</span>
              <span>-∞</span>
            </div>

            {/* VU Left */}
            <div className="w-2 h-full bg-[#0c0d0f] border border-[#23262b] rounded-sm relative overflow-hidden flex flex-col justify-end">
              <div 
                className="absolute inset-x-0 bottom-0 top-0" 
                style={{
                  background: 'linear-gradient(to top, #22c55e 0%, #22c55e 80%, #eab308 80%, #eab308 95%, #ef4444 95%, #ef4444 100%)'
                }}
              />
              <div ref={vuMaskLRef} className="absolute inset-x-0 top-0 bg-[#0c0d0f]" style={{ height: '100%' }} />
            </div>

            {/* VU Right */}
            <div className="w-2 h-full bg-[#0c0d0f] border border-[#23262b] rounded-sm relative overflow-hidden flex flex-col justify-end mr-1">
              <div 
                className="absolute inset-x-0 bottom-0 top-0" 
                style={{
                  background: 'linear-gradient(to top, #22c55e 0%, #22c55e 80%, #eab308 80%, #eab308 95%, #ef4444 95%, #ef4444 100%)'
                }}
              />
              <div ref={vuMaskRRef} className="absolute inset-x-0 top-0 bg-[#0c0d0f]" style={{ height: '100%' }} />
            </div>

            {/* Fader */}
            <div className="flex items-center justify-center relative w-6">
              <input 
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={masterVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  engine.setMasterVolume(val);
                }}
                className="vertical-fader"
                style={{
                  WebkitAppearance: 'slider-vertical',
                  width: '14px',
                  height: '100%',
                  background: 'transparent',
                }}
              />
            </div>
          </div>
          
          <span className="text-[9px] font-bold text-gray-500 select-none tracking-wider uppercase mt-1">Master</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Playhead restricted/clipped container */}
        <div className="absolute left-[128px] right-0 top-0 bottom-[32px] overflow-hidden pointer-events-none z-[150]">
          <motion.div 
            className="absolute top-0 w-[17px] cursor-ew-resize flex justify-center pointer-events-auto transform -translate-x-1/2 h-full" 
            style={{ left: playheadMotionX }}
            onMouseDown={handlePlayheadDragMouseDown}
          >
             <div className="w-px bg-red-600 h-full shadow-[0_0_8px_rgba(255,0,0,0.5)] pointer-events-none"></div>
             <div className="absolute top-[22px] w-3.5 h-3.5 bg-red-600 rotate-45 border border-red-400 z-[160] shadow pointer-events-none"></div>
          </motion.div>
        </div>
 
        {/* ── Export-Selektion: schmaler Streifen oberhalb des Rulers ────────── */}
        <div className="h-4 flex-shrink-0 flex z-[131] overflow-hidden">
          <div className="w-32 flex-shrink-0 bg-omega-panel border-r border-omega-border" />
          <div
            ref={stripRef}
            className="flex-1 relative overflow-hidden bg-[#131518] cursor-ew-resize"
            onMouseDown={handleStripMouseDown}
            onDoubleClick={handleStripDoubleClick}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="absolute inset-0" style={{ transform: `translateX(-${scrollLeft}px)` }}>
              {selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd && (() => {
                const minVal = Math.min(selectionStart, selectionEnd);
                const maxVal = Math.max(selectionStart, selectionEnd);
                return (
                  <div
                    className="absolute inset-y-0 bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                    style={{
                      left: `${minVal * pixelsPerSecond}px`,
                      width: `${(maxVal - minVal) * pixelsPerSecond}px`,
                    }}
                  />
                );
              })()}
            </div>
          </div>
          <div className="w-6 flex-shrink-0 bg-[#282b30] border-l border-omega-border" />
        </div>

        {/* ── Timecode-Ruler ───────────────────────────────────────────────────── */}
        <div className="h-8 border-b border-omega-border flex items-center bg-[#1a1d21] z-[130] relative">
           <div className="w-32 h-full flex-shrink-0 bg-omega-panel border-r border-omega-border flex items-center justify-end px-3 gap-2 shadow-[2px_0_5px_rgba(0,0,0,0.3)] z-[160]">
           </div>
           <div
             ref={rulerRef}
             className="flex-1 h-full relative overflow-hidden cursor-ew-resize select-none"
             onMouseDown={handlePlayheadDragMouseDown}
             onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
           >
              <div className="absolute inset-0 flex items-center" style={{ transform: `translateX(-${scrollLeft}px)` }}>
                  {visibleTicks.map((i) => {
                     const time = i * guidelineInterval;
                     return (
                       <div 
                         key={i} 
                         className="absolute h-full border-l border-gray-700 text-[11px] text-gray-300 pl-1.5 flex items-end pb-1 whitespace-nowrap" 
                         style={{ left: pixelsPerSecond * time }}
                       >
                         {formatTime(time)}
                       </div>
                     );
                  })}
              </div>
           </div>
           <div className="w-6 border-l border-omega-border bg-[#282b30] h-full z-[160]"></div>
        </div>


        <div className="flex-1 flex overflow-hidden relative">
           <div className="w-32 bg-omega-panel border-r border-omega-border z-[160] shadow-[2px_0_5px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative">
              <div className="flex-1 overflow-hidden relative">
                 <div className="flex flex-col" style={{ transform: `translateY(-${scrollTop}px)` }}>
                   {displayedTracks.map(track => (
                        <div 
                           key={track.id} 
                           className="border-b border-[#282b30] bg-omega-panel flex flex-col justify-center px-1 overflow-hidden" 
                           style={{ height: trackHeight }}
                           onContextMenu={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             setTrackContextMenu({ x: e.clientX, y: e.clientY, trackId: track.originalTrackId || track.id });
                             setContextMenu(null);
                             setEditorContextMenu(null);
                           }}
                        >
                            {trackHeight >= 55 && (
                              <div className="flex items-center gap-1 mb-1 px-1">
                                 <input 
                                   value={track.name} 
                                   placeholder="kein Name" 
                                   onChange={(e) => {
                                     const isL = track.id.endsWith('_L');
                                     const isR = track.id.endsWith('_R');
                                     const cleanTrackId = track.id.replace(/_[LR]$/, '');
                                     const newTracks = tracks.map(t => {
                                       if (t.id === cleanTrackId) {
                                         if (isL) return { ...t, nameL: e.target.value };
                                         if (isR) return { ...t, nameR: e.target.value };
                                         return { ...t, name: e.target.value };
                                       }
                                       return t;
                                     });
                                     updateTracksWithHistory(newTracks);
                                   }} 
                                   className="flex-1 h-4 bg-[#1a1d21] border border-gray-600 rounded-sm px-1 text-[9px] text-gray-300 outline-none focus:border-omega-accent" 
                                 />
                                 <ChevronDown size={8} className="text-gray-500" />
                                 <Plus size={10} className="text-gray-400 hover:text-white cursor-pointer" />
                              </div>
                            )}
                            <div className="flex items-center gap-1 px-1 py-1 text-gray-400">
                                <button 
                                  type="button"
                                  title={track.locked ? "Spur entsperren" : "Spur sperren"}
                                  className={`w-5 h-5 flex items-center justify-center rounded transition-colors duration-150 ${
                                    track.locked 
                                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]' 
                                      : 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-300'
                                  }`}
                                  onClick={() => {
                                    const isL = track.id.endsWith('_L');
                                    const isR = track.id.endsWith('_R');
                                    const cleanTrackId = track.id.replace(/_[LR]$/, '');
                                    const newTracks = tracks.map(t => {
                                      if (t.id === cleanTrackId) {
                                        if (isL) return { ...t, lockedL: !(t.lockedL !== undefined ? t.lockedL : t.locked) };
                                        if (isR) return { ...t, lockedR: !(t.lockedR !== undefined ? t.lockedR : t.locked) };
                                        return { ...t, locked: !t.locked };
                                      }
                                      return t;
                                    });
                                    updateTracksWithHistory(newTracks);
                                  }}
                                >
                                  {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
                                </button>
                                <button 
                                  type="button"
                                  title="Solo"
                                  className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-extrabold transition-colors duration-150 ${
                                    track.solo 
                                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]' 
                                      : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300'
                                  }`}
                                  onClick={() => toggleSolo(track.id)}
                                >
                                  S
                                </button>
                                <button 
                                  type="button"
                                  title="Mute"
                                  className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-extrabold transition-colors duration-150 ${
                                    track.muted 
                                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]' 
                                      : 'bg-red-950/60 hover:bg-red-900/80 text-red-300'
                                  }`}
                                  onClick={() => toggleMute(track.id)}
                                >
                                  M
                                </button>
                               <div className="flex-1"></div>
                               <span className="text-[10px] font-mono">{track.index}</span>
                            </div>
                            {trackHeight >= 40 && (
                              <div className="flex items-center gap-1.5 px-1 py-0.5 text-gray-400">
                                <button 
                                  type="button"
                                  title="Lautstärkeregler stummschalten/wiederherstellen"
                                  className="w-5 h-5 flex items-center justify-center rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 flex-shrink-0 transition-colors duration-150"
                                  onClick={() => toggleVolumeMute(track.id)}
                                >
                                  <Volume2 size={11} />
                                </button>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="2" 
                                  step="0.05" 
                                  value={track.volume} 
                                  onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))} 
                                  onMouseUp={() => updateTracksWithHistory(tracks)}
                                  className="w-full h-1 accent-omega-accent bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                                />
                              </div>
                            )}
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
                   justDraggedRef.current = true;
                   setTimeout(() => { justDraggedRef.current = false; }, 50);

                   // Compute lasso rect in timeline-local coords
                   setLassoRect(prev => {
                     if (!prev || !tracksRef.current) return null;
                     const lx1 = Math.min(prev.startX, prev.endX);
                     const lx2 = Math.max(prev.startX, prev.endX);
                     const ly1 = Math.min(prev.startY, prev.endY);
                     const ly2 = Math.max(prev.startY, prev.endY);
                     // Find all regions whose pixel bounds intersect the lasso
                     const matched = new Set<string>();
                     displayedTracks.forEach((track, trackIdx) => {
                       const trackTop = trackIdx * trackHeight;
                       const trackBottom = trackTop + trackHeight;
                       if (trackBottom < ly1 || trackTop > ly2) return;
                        track.regions.forEach((region: Region) => {
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
                 {showVerticalGuidelines && visibleTicks.map((i) => {
                     const time = i * guidelineInterval;
                     if (time === 0) return null;
                     return (
                       <div
                         key={i}
                         className="absolute top-0 bottom-0 border-l border-white/15 pointer-events-none z-[5]"
                         style={{ left: time * pixelsPerSecond }}
                       />
                     );
                  })}
                 {/* track-area selection overlay removed – only the blue strip above is used */}
                 {displayedTracks.map(track => (
                    <div 
                       key={track.id} 
                       data-track-id={track.id}
                       className="border-b border-[#282b30] hover:bg-[#25282c] relative" 
                       style={{ height: trackHeight }} 
                       onDrop={(e) => { e.stopPropagation(); onDrop(e, track.id); }} 
                       onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                       onClick={(e) => {
                          if (justDraggedRef.current) return;
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
                        {track.regions.map((region: Region) => {
                           const pitchRate = region.effects?.pitchRate || 1.0;
                           const regionWidthPx = (region.duration / pitchRate) * pixelsPerSecond;
                           const fadeInPx = ((region.fadeIn || 0) / pitchRate) * pixelsPerSecond;
                           const fadeOutPx = ((region.fadeOut || 0) / pitchRate) * pixelsPerSecond;
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
                           const prevOnTrack = sortedOnTrack.find(r => r.id !== region.id && r.startPos + (r.duration / (r.effects?.pitchRate || 1.0)) > region.startPos && r.startPos < region.startPos && shareChannels(region, r));
                           const nextOnTrack = sortedOnTrack.find(r => r.id !== region.id && r.startPos < region.startPos + (region.duration / pitchRate) && r.startPos > region.startPos && shareChannels(region, r));
                           const xfadeInPx  = prevOnTrack ? Math.max(0, (prevOnTrack.startPos + (prevOnTrack.duration / (prevOnTrack.effects?.pitchRate || 1.0)) - region.startPos) * pixelsPerSecond) : 0;
                           const xfadeOutPx = nextOnTrack ? Math.max(0, (region.startPos + (region.duration / pitchRate) - nextOnTrack.startPos) * pixelsPerSecond) : 0;

                           // Manual fades shown only when no crossfade is active on that side
                           const showFadeIn  = fadeInPx  > 1 && xfadeInPx  < 1;
                           const showFadeOut = fadeOutPx > 1 && xfadeOutPx < 1;

                           // Calculate visible bounds of region in pixel space for floating label
                           const vw = tracksRef.current?.clientWidth || 1000;
                           const regionLeft = region.startPos * pixelsPerSecond;
                           const regionRight = regionLeft + regionWidthPx;
                           const visibleLeft = Math.max(regionLeft, scrollLeft);
                           const visibleRight = Math.min(regionRight, scrollLeft + vw);
                           const localLeft = Math.max(0, visibleLeft - regionLeft);
                           const localRight = Math.max(0, visibleRight - regionLeft);
                           const visibleWidth = Math.max(0, localRight - localLeft);

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
                               style={{ left: `${regionLeft}px`, width: `${regionWidthPx}px` }}
                             >
                               {/* Namensleiste (Header) */}
                               <div
                                 className={`h-[18px] select-none flex-shrink-0 font-semibold flex items-center justify-between px-2 text-[10px] truncate relative overflow-hidden ${
                                   isSelected ? 'bg-[#ffbe00] text-black font-bold' : `${region.color} text-white`
                                 }`}
                               >
                                 {/* Schwebendes Label, zentriert im sichtbaren Bereich */}
                                 <div 
                                   className="absolute inset-y-0 flex items-center justify-center pointer-events-none"
                                   style={{ left: `${localLeft}px`, width: `${visibleWidth}px` }}
                                 >
                                   <span className="truncate px-2 text-center max-w-full">
                                     {region.name || region.file.name}{region.visualNameSuffix || (region.channels === 1 ? ' [Mono]' : ' [Stereo]')}
                                   </span>
                                 </div>
                                 {region.groupId && (
                                   <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full flex-shrink-0 shadow absolute right-2 top-[6px] z-10" title="Gruppiert" />
                                 )}
                               </div>

                               {/* Körper (Body) */}
                               <div className="flex-1 bg-[#15171a] relative overflow-hidden pointer-events-auto">
                                 {/* z-[1]: Waveform — always at bottom */}
                                 <div className="absolute inset-0 z-[1] pointer-events-none">
                                   <WaveformRenderer 
                                      filePath={region.file.path} 
                                      sourceOffset={region.sourceOffset} 
                                      duration={region.duration} 
                                      fileDuration={region.fileDuration} 
                                      channel={region.stereoMode === 'left-only' ? 'left' : (region.stereoMode === 'right-only' ? 'right' : undefined)}
                                    />
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
                        {track.id === '1' && vstRecording && vstRecording.active && (
                          <div
                            className="absolute top-0.5 bottom-0.5 border rounded overflow-hidden flex flex-col shadow-lg pointer-events-none bg-red-950/40 border-red-500/60 text-red-400 z-20"
                            style={{
                              left: `${vstRecording.startPlayhead * pixelsPerSecond}px`,
                              width: `${vstRecordingDuration * pixelsPerSecond}px`
                            }}
                          >
                            <div className="h-[18px] bg-red-600 text-white font-bold select-none flex items-center px-2 text-[10px] truncate leading-none">
                              🔴 LIVE-AUFNAHME ({vstRecording.pluginName})
                            </div>
                            <div className="flex-1 bg-red-950/30 relative overflow-hidden">
                              <LiveWaveformCanvas duration={vstRecordingDuration} pixelsPerSecond={pixelsPerSecond} />
                            </div>
                          </div>
                        )}
                        {track.id === '1' && audioRecording && audioRecording.active && (
                          <div
                            className="absolute top-0.5 bottom-0.5 border rounded overflow-hidden flex flex-col shadow-lg pointer-events-none bg-red-950/40 border-red-500/60 text-red-400 z-20"
                            style={{
                              left: `${audioRecording.startPlayhead * pixelsPerSecond}px`,
                              width: `${audioRecordingDuration * pixelsPerSecond}px`
                            }}
                          >
                            <div className="h-[18px] bg-red-600 text-white font-bold select-none flex items-center px-2 text-[10px] truncate leading-none">
                              🔴 AUDIO-AUFNAHME
                            </div>
                            <div className="flex-1 bg-red-950/30 relative overflow-hidden">
                              <LiveWaveformCanvas duration={audioRecordingDuration} pixelsPerSecond={pixelsPerSecond} />
                            </div>
                          </div>
                        )}
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
                  <button className="w-4 h-full bg-[#2b2d31] border-r border-gray-700 flex items-center justify-center text-[8px] text-gray-400 hover:text-white">◂</button>
                  <div className="flex-1 h-full relative">
                     <div className="absolute top-0.5 bottom-0.5 bg-[#4a4d52] rounded shadow-sm hover:bg-gray-500 transition-colors pointer-events-none" style={{ width: `${Math.max(5, hThumbWidth)}%`, left: `${hThumbLeft}%` }}></div>
                  </div>
                  <button className="w-4 h-full bg-[#2b2d31] border-l border-gray-700 flex items-center justify-center text-[8px] text-gray-400 hover:text-white">▸</button>
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

