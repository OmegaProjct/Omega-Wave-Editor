import type {
  Track,
  Region,
  ToolbarSeparatorState,
  ToolbarColorState,
  ToolbarColorKey,
  TimeDisplayFormat,
  ToolbarVisibilityKey
} from './timelineTypes'

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

export const mergeSplitTracks = (tracksList: Track[]): Track[] => {
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

export const splitMergedTracks = (tracksList: Track[]): Track[] => {
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

export const shareChannels = (r1: Region, r2: Region): boolean => {
  const m1 = r1.stereoMode || 'stereo';
  const m2 = r2.stereoMode || 'stereo';
  return m1 === 'stereo' || m2 === 'stereo' || m1 === m2;
};

// Hilfsfunktion: Prüft, ob ein Zeitfenster mit existierenden Regionen auf der Spur überlappt
export const hasOverlap = (track: Track, startPos: number, duration: number): boolean => {
  return track.regions.some(r => {
    const pitchRate = r.effects?.pitchRate || 1.0;
    const rEnd = r.startPos + (r.duration / pitchRate);
    return startPos < rEnd && startPos + duration > r.startPos;
  });
};

// Hilfsfunktion: Sucht die erste freie Spur darunter oder erstellt eine neue
export const getFreeTrackOrNew = (
  tracksList: Track[],
  targetTrackId: string,
  startPos: number,
  duration: number
): { updatedTracks: Track[]; targetTrackId: string } => {
  const targetIdx = tracksList.findIndex(t => t.id === targetTrackId);
  if (targetIdx === -1) return { updatedTracks: tracksList, targetTrackId };

  // 1. Falls die Zielspur selbst frei ist, nimm diese
  if (!hasOverlap(tracksList[targetIdx], startPos, duration)) {
    return { updatedTracks: tracksList, targetTrackId };
  }

  // 2. Suche auf Spuren darunter
  for (let i = targetIdx + 1; i < tracksList.length; i++) {
    if (!hasOverlap(tracksList[i], startPos, duration)) {
      return { updatedTracks: tracksList, targetTrackId: tracksList[i].id };
    }
  }

  // 3. Keine Spur frei, erstelle eine neue
  const nextIdx = tracksList.length + 1;
  const newTrackId = nextIdx.toString();
  const newTrack: Track = {
    id: newTrackId,
    index: nextIdx,
    name: `Spur ${nextIdx}`,
    regions: [],
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    volume: 1,
    height: 64,
    automation: []
  };
  return {
    updatedTracks: [...tracksList, newTrack],
    targetTrackId: newTrackId
  };
};

// Hilfsfunktion: Ermittelt die nächste freie Position hinter blockierenden Regionen auf derselben Spur
export const getSequentialPosition = (track: Track, startPos: number, duration: number): number => {
  let currentStart = startPos;
  const sortedRegions = [...track.regions].sort((a, b) => a.startPos - b.startPos);
  for (const r of sortedRegions) {
    const pitchRate = r.effects?.pitchRate || 1.0;
    const rEnd = r.startPos + (r.duration / pitchRate);
    if (rEnd <= currentStart) {
      continue;
    }
    if (r.startPos < currentStart + duration && rEnd > currentStart) {
      currentStart = rEnd;
    }
  }
  return currentStart;
};

export const PIXELS_PER_SECOND_BASE = 50 
export const TIMELINE_TIME_FORMAT_STORAGE_KEY = 'omega.timelineTimeFormat.v1'
export const TIMELINE_SELECTION_FORMAT_STORAGE_KEY = 'omega.timelineSelectionFormat.v1'
export const TIMELINE_TOOLBAR_VISIBILITY_STORAGE_KEY = 'omega.timelineToolbarVisibility.v1'
export const TIMELINE_TOOLBAR_ORDER_STORAGE_KEY = 'omega.timelineToolbarOrder.v1'
export const TIMELINE_TOOLBAR_EDIT_LOCKED_STORAGE_KEY = 'omega.timelineToolbarEditLocked.v1'
export const TIMELINE_TOOLBAR_SEPARATORS_STORAGE_KEY = 'omega.timelineToolbarSeparators.v1'
export const TIMELINE_TOOLBAR_COLORS_STORAGE_KEY = 'omega.timelineToolbarColors.v1'

export const DEFAULT_TOOLBAR_ORDER: ToolbarVisibilityKey[] = [
  'selectTool',
  'cutTool',
  'transport',
  'record',
  'undo',
  'redo',
  'snap',
  'group',
  'ungroup',
  'gapClose',
  'timeDisplay',
  'selectionDisplay',
  'autoScrollMode',
  'export'
]

export const TOOLBAR_LABELS: Record<ToolbarVisibilityKey, string> = {
  selectTool: 'Auswahl',
  cutTool: 'Schneiden',
  transport: 'Transport',
  record: 'Aufnahme',
  undo: 'Undo',
  redo: 'Redo',
  snap: 'Snap',
  group: 'Gruppieren',
  ungroup: 'Loesen',
  gapClose: 'Luecken schliessen',
  timeDisplay: 'Zeit',
  selectionDisplay: 'Auswahl',
  autoScrollMode: 'Auto-Scroll',
  export: 'Mixdown Export'
}

export const TOOLBAR_DESCRIPTIONS: Record<ToolbarVisibilityKey, string> = {
  selectTool: 'Normales Auswahlwerkzeug',
  cutTool: 'Schnittwerkzeug fuer Trennungen',
  transport: 'Play, Pause und Stop',
  record: 'Recorder und Aufnahmezugriff',
  undo: 'Letzten Schritt rueckgaengig',
  redo: 'Letzten Schritt wiederholen',
  snap: 'Magnetische Ausrichtung',
  group: 'Auswahl zusammenfassen',
  ungroup: 'Gruppe wieder loesen',
  gapClose: 'Luecken automatisch schliessen',
  timeDisplay: 'Aktuelle Abspielzeit',
  selectionDisplay: 'Laenge der Auswahl',
  autoScrollMode: 'Scrollverhalten beim Abspielen',
  export: 'Mixdown direkt starten'
}

export const TOOLBAR_GROUPS: Array<{
  id: string
  label: string
  description: string
  keys: ToolbarVisibilityKey[]
}> = [
  {
    id: 'tools',
    label: 'Werkzeuge',
    description: 'Auswahl- und Schnittfunktionen',
    keys: ['selectTool', 'cutTool']
  },
  {
    id: 'playback',
    label: 'Player',
    description: 'Transport und Aufnahme',
    keys: ['transport', 'record']
  },
  {
    id: 'history',
    label: 'Verlauf',
    description: 'Rueckgaengig und Wiederholen',
    keys: ['undo', 'redo']
  },
  {
    id: 'editing',
    label: 'Bearbeitung',
    description: 'Snap, Gruppen und Luecken',
    keys: ['snap', 'group', 'ungroup', 'gapClose']
  },
  {
    id: 'display',
    label: 'Anzeige',
    description: 'Zeit, Auswahl und Scrollmodus',
    keys: ['timeDisplay', 'selectionDisplay', 'autoScrollMode']
  },
  {
    id: 'output',
    label: 'Export',
    description: 'Mixdown und Ausgabe',
    keys: ['export']
  }
]

export const createDefaultToolbarSeparators = (): ToolbarSeparatorState => ({
  selectTool: { before: false, after: false },
  cutTool: { before: false, after: false },
  transport: { before: false, after: false },
  record: { before: false, after: false },
  undo: { before: false, after: false },
  redo: { before: false, after: false },
  snap: { before: false, after: false },
  group: { before: false, after: false },
  ungroup: { before: false, after: false },
  gapClose: { before: false, after: false },
  timeDisplay: { before: false, after: false },
  selectionDisplay: { before: false, after: false },
  autoScrollMode: { before: false, after: false },
  export: { before: false, after: false }
})

export const createDefaultToolbarColors = (): ToolbarColorState => ({
  selectTool: 'default',
  cutTool: 'default',
  transport: 'default',
  record: 'default',
  undo: 'default',
  redo: 'default',
  snap: 'default',
  group: 'default',
  ungroup: 'default',
  gapClose: 'default',
  timeDisplay: 'default',
  selectionDisplay: 'default',
  autoScrollMode: 'default',
  export: 'default'
})

export const TOOLBAR_COLOR_STYLES: Record<ToolbarColorKey, { border: string; bg: string; grip: string; label: string }> = {
  default: { border: 'border-blue-500/35', bg: 'bg-blue-500/8', grip: 'text-blue-300', label: 'Standard' },
  blue: { border: 'border-sky-400/45', bg: 'bg-sky-500/10', grip: 'text-sky-300', label: 'Blau' },
  emerald: { border: 'border-emerald-400/45', bg: 'bg-emerald-500/10', grip: 'text-emerald-300', label: 'Gruen' },
  amber: { border: 'border-amber-400/45', bg: 'bg-amber-500/10', grip: 'text-amber-200', label: 'Gold' },
  rose: { border: 'border-rose-400/45', bg: 'bg-rose-500/10', grip: 'text-rose-300', label: 'Rot' },
  violet: { border: 'border-violet-400/45', bg: 'bg-violet-500/10', grip: 'text-violet-300', label: 'Violett' }
}

export const TIME_DISPLAY_FORMATS: Array<{ id: TimeDisplayFormat; label: string }> = [
  { id: 'seconds', label: 'Sekunden' },
  { id: 'seconds-ms', label: 'Sekunden + Millisekunden' },
  { id: 'hhmmss', label: 'hh:mm:ss' },
  { id: 'ddhhmmss', label: 'dd:hh:mm:ss' },
  { id: 'hhmmss-hundredths', label: 'hh:mm:ss + Hundertstel' },
  { id: 'hhmmss-ms', label: 'hh:mm:ss + Millisekunden' },
  { id: 'hhmmss-samples', label: 'hh:mm:ss + Samples' },
  { id: 'samples', label: 'Samples' },
  { id: 'hhmmss-film24', label: 'hh:mm:ss + Film-Frames (24 fps)' },
  { id: 'film24', label: 'Film-Frames (24 fps)' },
  { id: 'hhmmss-ntsc-drop', label: 'hh:mm:ss + NTSC-Drop-Frames' },
  { id: 'hhmmss-ntsc-nondrop', label: 'hh:mm:ss + NTSC-Non-Drop-Frames' },
  { id: 'ntsc', label: 'NTSC-Frames' },
  { id: 'hhmmss-pal', label: 'hh:mm:ss + PAL-Frames (25 fps)' },
  { id: 'pal', label: 'PAL-Frames (25 fps)' },
  { id: 'hhmmss-cdda', label: 'hh:mm:ss + CDDA-Frames (75 fps)' },
  { id: 'cdda', label: 'CDDA-Frames (75 fps)' }
]

export const pad2 = (value: number): string => value.toString().padStart(2, '0')
export const pad3 = (value: number): string => value.toString().padStart(3, '0')

export const splitTimeParts = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds)
  const totalWholeSeconds = Math.floor(safeSeconds)
  const days = Math.floor(totalWholeSeconds / 86400)
  const hours = Math.floor((totalWholeSeconds % 86400) / 3600)
  const minutes = Math.floor((totalWholeSeconds % 3600) / 60)
  const secs = totalWholeSeconds % 60
  const milliseconds = Math.floor((safeSeconds - totalWholeSeconds) * 1000)
  const hundredths = Math.floor(milliseconds / 10)
  return { days, hours, minutes, secs, milliseconds, hundredths }
}

export const formatDropFrameTimecode = (seconds: number): string => {
  const fps = 30000 / 1001
  const dropFrames = 2
  const framesPerHour = 107892
  const framesPer24Hours = framesPerHour * 24
  const framesPer10Minutes = 17982
  const framesPerMinute = 1798
  let totalFrames = Math.round(Math.max(0, seconds) * fps)
  totalFrames %= framesPer24Hours

  const tenMinuteChunks = Math.floor(totalFrames / framesPer10Minutes)
  const remainingFrames = totalFrames % framesPer10Minutes
  const droppedFrames =
    dropFrames * 9 * tenMinuteChunks +
    dropFrames * Math.max(0, Math.floor((remainingFrames - dropFrames) / framesPerMinute))

  const timecodeFrames = totalFrames + droppedFrames
  const hours = Math.floor(timecodeFrames / (30 * 60 * 60))
  const minutes = Math.floor(timecodeFrames / (30 * 60)) % 60
  const secs = Math.floor(timecodeFrames / 30) % 60
  const frames = timecodeFrames % 30
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)};${pad2(frames)}`
}

export const formatFrameTime = (seconds: number, fps: number, delimiter: string = ':'): string => {
  const { hours, minutes, secs } = splitTimeParts(seconds)
  const frame = Math.floor((((Math.max(0, seconds) % 1) * fps)) + 1e-6)
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}${delimiter}${pad2(Math.max(0, frame))}`
}

export const formatTimeDisplay = (seconds: number, format: TimeDisplayFormat, sampleRate: number): string => {
  const safeSeconds = Math.max(0, seconds)
  const { days, hours, minutes, secs, milliseconds, hundredths } = splitTimeParts(safeSeconds)
  const totalSamples = Math.round(safeSeconds * sampleRate)

  switch (format) {
    case 'seconds':
      return `${safeSeconds.toFixed(0)} s`
    case 'seconds-ms':
      return `${safeSeconds.toFixed(3)} s`
    case 'hhmmss':
      return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`
    case 'ddhhmmss':
      return `${pad2(days)}:${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`
    case 'hhmmss-hundredths':
      return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}.${hundredths.toString().padStart(2, '0')}`
    case 'hhmmss-ms':
      return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}.${pad3(milliseconds)}`
    case 'hhmmss-samples':
      return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)} + ${totalSamples} spl`
    case 'samples':
      return `${totalSamples} spl`
    case 'hhmmss-film24':
      return formatFrameTime(safeSeconds, 24)
    case 'film24':
      return `${Math.round(safeSeconds * 24)} fr`
    case 'hhmmss-ntsc-drop':
      return formatDropFrameTimecode(safeSeconds)
    case 'hhmmss-ntsc-nondrop':
      return formatFrameTime(safeSeconds, 30)
    case 'ntsc':
      return `${Math.round(safeSeconds * (30000 / 1001))} fr`
    case 'hhmmss-pal':
      return formatFrameTime(safeSeconds, 25)
    case 'pal':
      return `${Math.round(safeSeconds * 25)} fr`
    case 'hhmmss-cdda':
      return formatFrameTime(safeSeconds, 75)
    case 'cdda':
      return `${Math.round(safeSeconds * 75)} fr`
    default:
      return `${safeSeconds.toFixed(3)} s`
  }
}

export const MIN_ZOOM_LEVEL = 0.05
export const MAX_ZOOM_LEVEL = 2000
export const ZOOM_MENU_LEVELS = [10, 25, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 50000, 100000, 150000, 200000]

export const clampZoomLevel = (value: number): number => {
  return Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, value))
}

export const getNextZoomLevel = (currentZoom: number, direction: 'in' | 'out'): number => {
  const safeZoom = clampZoomLevel(currentZoom)

  const factor =
    safeZoom >= 800 ? 2.2 :
    safeZoom >= 240 ? 1.85 :
    safeZoom >= 80 ? 1.55 :
    safeZoom >= 24 ? 1.34 :
    safeZoom >= 4 ? 1.18 :
    1.1

  return clampZoomLevel(direction === 'in' ? safeZoom * factor : safeZoom / factor)
}

export const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const getDecimals = (val: number) => {
    if (Math.abs(val - Math.round(val)) < 1e-9) return 0;
    if (Math.abs(val * 10 - Math.round(val * 10)) < 1e-9) return 1;
    if (Math.abs(val * 100 - Math.round(val * 100)) < 1e-9) return 2;
    return 3;
  };
  if (m > 0) {
    const sFixed = s.toFixed(getDecimals(s));
    return sFixed !== '0' ? `${m}m ${sFixed}s` : `${m}m`;
  }
  return `${seconds.toFixed(getDecimals(seconds))}s`;
};

export const getDbHeightPercentage = (linearLevel: number): number => {
  if (linearLevel <= 0.001) return 0;
  const db = 20 * Math.log10(linearLevel);
  const clampedDb = Math.max(-60, Math.min(0, db));
  return ((clampedDb + 60) / 60) * 100;
};

export const gainToDb = (gain: number): string => {
  if (gain <= 0.001) return '-∞ dB';
  const db = 20 * Math.log10(gain);
  if (Math.abs(db) < 0.05) return '0.0 dB';
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
};
