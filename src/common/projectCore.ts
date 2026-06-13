/**
 * projectCore.ts
 * Pure functional core logic for Project and Timeline state mutations.
 * Fully framework-agnostic and testable in pure Node.js environments.
 */

import { Project, Track, Region, Effects, FileEntry, ProjectSettings } from './types'

// Helper for unique ID generation
export function generateUUID(): string {
  return Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
}

// Deep clone helper
export function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// Default Effects definition
export const DEFAULT_EFFECTS: Effects = {
  eqActive: false,
  eqGains: new Array(10).fill(0),
  compActive: false,
  compThreshold: 0,
  compRatio: 1,
  reverbMix: 0,
  reverbTime: 1.5,
  delayFeedback: 0,
  delayTime: 300,
  deEsserActive: false,
  deEsserReduction: 0,
  pitchRate: 1.0,
  keepPitch: false
}

/**
 * Validates raw JSON data and migrates it to the current v1.0.0 OWEP format.
 */
export function validateAndMigrateProject(raw: any): Project {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Projektdatei ist leer oder ungültig.')
  }

  if (raw.format !== 'OWEP') {
    throw new Error('Ungültiges Projekt-Format. Erwartet wird OWEP.')
  }

  // Clone to avoid side effects
  const project = cloneDeep(raw) as Project

  // Default settings
  if (!project.settings || typeof project.settings !== 'object') {
    project.settings = {
      zoomLevel: 1,
      sampleRate: 48000,
      playheadPos: 0
    }
  } else {
    project.settings.zoomLevel = typeof project.settings.zoomLevel === 'number' ? project.settings.zoomLevel : 1
    project.settings.sampleRate = typeof project.settings.sampleRate === 'number' ? project.settings.sampleRate : 48000
    project.settings.playheadPos = typeof project.settings.playheadPos === 'number' ? project.settings.playheadPos : 0
  }

  // Default metadata
  if (!project.metadata || typeof project.metadata !== 'object') {
    project.metadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: 'Omega User'
    }
  } else {
    project.metadata.createdAt = typeof project.metadata.createdAt === 'number' ? project.metadata.createdAt : Date.now()
    project.metadata.updatedAt = typeof project.metadata.updatedAt === 'number' ? project.metadata.updatedAt : Date.now()
    project.metadata.author = typeof project.metadata.author === 'string' ? project.metadata.author : 'Omega User'
  }

  // Ensure version compatibility
  project.version = '1.0.0'

  // Validate tracks
  if (!Array.isArray(project.tracks)) {
    project.tracks = []
  }

  project.tracks = project.tracks.map((rawTrack: any, index: number) => {
    const track: Track = {
      ...rawTrack,
      id: typeof rawTrack.id === 'string' ? rawTrack.id : generateUUID(),
      index: typeof rawTrack.index === 'number' ? rawTrack.index : index + 1,
      name: typeof rawTrack.name === 'string' ? rawTrack.name : `Audiospur ${index + 1}`,
      regions: Array.isArray(rawTrack.regions) ? rawTrack.regions : [],
      muted: typeof rawTrack.muted === 'boolean' ? rawTrack.muted : false,
      solo: typeof rawTrack.solo === 'boolean' ? rawTrack.solo : false,
      locked: typeof rawTrack.locked === 'boolean' ? rawTrack.locked : false,
      visible: typeof rawTrack.visible === 'boolean' ? rawTrack.visible : true,
      volume: typeof rawTrack.volume === 'number' ? rawTrack.volume : 1.0,
      height: typeof rawTrack.height === 'number' ? rawTrack.height : 64,
      automation: Array.isArray(rawTrack.automation) ? rawTrack.automation : [],
      denoise: typeof rawTrack.denoise === 'number' ? rawTrack.denoise : 0,
      dehiss: typeof rawTrack.dehiss === 'number' ? rawTrack.dehiss : 0
    }

    // Validate regions inside track
    track.regions = track.regions.map((rawRegion: any) => {
      const file: FileEntry = {
        name: rawRegion.file && typeof rawRegion.file.name === 'string' ? rawRegion.file.name : 'Unbenannt',
        path: rawRegion.file && typeof rawRegion.file.path === 'string' ? rawRegion.file.path : '',
        isDirectory: rawRegion.file && typeof rawRegion.file.isDirectory === 'boolean' ? rawRegion.file.isDirectory : false
      }

      const effects: Effects = {
        ...cloneDeep(DEFAULT_EFFECTS),
        ...(rawRegion.effects || {})
      }

      const region: Region = {
        ...rawRegion,
        id: typeof rawRegion.id === 'string' ? rawRegion.id : generateUUID(),
        file,
        startPos: typeof rawRegion.startPos === 'number' ? rawRegion.startPos : 0,
        duration: typeof rawRegion.duration === 'number' ? rawRegion.duration : 0,
        sourceOffset: typeof rawRegion.sourceOffset === 'number' ? rawRegion.sourceOffset : 0,
        gain: typeof rawRegion.gain === 'number' ? rawRegion.gain : 1.0,
        fadeIn: typeof rawRegion.fadeIn === 'number' ? rawRegion.fadeIn : 0,
        fadeOut: typeof rawRegion.fadeOut === 'number' ? rawRegion.fadeOut : 0,
        effects,
        stereoMode: ['stereo', 'left-only', 'right-only'].includes(rawRegion.stereoMode)
          ? rawRegion.stereoMode
          : 'stereo',
        name: typeof rawRegion.name === 'string' ? rawRegion.name : file.name
      }

      return region
    })

    return track
  })

  return project
}

/**
 * Creates an empty default project.
 */
export function createDefaultProject(tracksCount = 4, sampleRate = 48000): Project {
  const tracks: Track[] = []
  for (let i = 0; i < tracksCount; i++) {
    tracks.push({
      id: generateUUID(),
      index: i + 1,
      name: `Spur ${i + 1}`,
      regions: [],
      muted: false,
      solo: false,
      locked: false,
      visible: true,
      volume: 1.0,
      height: 64,
      automation: []
    })
  }

  return {
    format: 'OWEP',
    version: '1.0.0',
    tracks,
    settings: {
      zoomLevel: 1,
      sampleRate,
      playheadPos: 0
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: 'Omega User'
    }
  }
}

/**
 * Adds a new empty track to the project.
 */
export function addTrack(project: Project, name?: string): Project {
  const next = cloneDeep(project)
  const maxIdx = next.tracks.reduce((max, t) => (t.index > max ? t.index : max), 0)
  
  next.tracks.push({
    id: generateUUID(),
    index: maxIdx + 1,
    name: name || `Spur ${maxIdx + 1}`,
    regions: [],
    muted: false,
    solo: false,
    locked: false,
    visible: true,
    volume: 1.0,
    height: 64,
    automation: []
  })
  
  next.metadata.updatedAt = Date.now()
  return next
}

/**
 * Removes a track from the project and re-indexes remaining tracks.
 */
export function removeTrack(project: Project, trackId: string): Project {
  const next = cloneDeep(project)
  next.tracks = next.tracks.filter(t => t.id !== trackId)
  
  // Re-index remaining tracks starting from 1
  next.tracks.forEach((t, i) => {
    t.index = i + 1
  })
  
  next.metadata.updatedAt = Date.now()
  return next
}

/**
 * Imports a new audio clip region into a specific track.
 */
export function importClip(
  project: Project,
  trackId: string,
  file: FileEntry,
  startPos: number,
  duration: number
): Project {
  const next = cloneDeep(project)
  const track = next.tracks.find(t => t.id === trackId)
  if (!track) return project

  track.regions.push({
    id: generateUUID(),
    file,
    startPos,
    duration,
    sourceOffset: 0,
    gain: 1.0,
    fadeIn: 0,
    fadeOut: 0,
    effects: cloneDeep(DEFAULT_EFFECTS),
    stereoMode: 'stereo',
    name: file.name
  })

  next.metadata.updatedAt = Date.now()
  return next
}

/**
 * Splits a clip region into two separate contiguous adjacent clips.
 */
export function splitClip(project: Project, trackId: string, regionId: string, splitPos: number): Project {
  const next = cloneDeep(project)
  const track = next.tracks.find(t => t.id === trackId)
  if (!track) return project

  const regionIdx = track.regions.findIndex(r => r.id === regionId)
  if (regionIdx === -1) return project

  const r = track.regions[regionIdx]
  
  // Verify split position is inside the clip
  if (splitPos <= r.startPos || splitPos >= r.startPos + r.duration) {
    return project
  }

  const offsetDiff = splitPos - r.startPos
  
  // Clip 1 (Left Part)
  const leftPart: Region = {
    ...cloneDeep(r),
    duration: offsetDiff
  }

  // Clip 2 (Right Part)
  const rightPart: Region = {
    ...cloneDeep(r),
    id: generateUUID(),
    startPos: splitPos,
    duration: r.duration - offsetDiff,
    sourceOffset: (r.sourceOffset || 0) + offsetDiff,
    name: `${r.name || r.file?.name || 'Audio'} (Teil 2)`
  }

  // Replace original clip with left and right adjacent parts
  track.regions.splice(regionIdx, 1, leftPart, rightPart)

  next.metadata.updatedAt = Date.now()
  return next
}

/**
 * Trims the start or end of an audio region.
 */
export function trimClip(
  project: Project,
  trackId: string,
  regionId: string,
  sourceOffset: number,
  duration: number
): Project {
  const next = cloneDeep(project)
  const track = next.tracks.find(t => t.id === trackId)
  if (!track) return project

  const r = track.regions.find(reg => reg.id === regionId)
  if (!r) return project

  r.sourceOffset = sourceOffset
  r.duration = duration
  
  next.metadata.updatedAt = Date.now()
  return next
}

/**
 * Updates the fade-in and fade-out durations of a region.
 */
export function updateClipFades(
  project: Project,
  trackId: string,
  regionId: string,
  fadeIn?: number,
  fadeOut?: number
): Project {
  const next = cloneDeep(project)
  const track = next.tracks.find(t => t.id === trackId)
  if (!track) return project

  const r = track.regions.find(reg => reg.id === regionId)
  if (!r) return project

  if (fadeIn !== undefined) r.fadeIn = Math.max(0, fadeIn)
  if (fadeOut !== undefined) r.fadeOut = Math.max(0, fadeOut)

  next.metadata.updatedAt = Date.now()
  return next
}

/**
 * Updates the gain (volume) factor of a region.
 */
export function updateClipGain(project: Project, trackId: string, regionId: string, gain: number): Project {
  const next = cloneDeep(project)
  const track = next.tracks.find(t => t.id === trackId)
  if (!track) return project

  const r = track.regions.find(reg => reg.id === regionId)
  if (!r) return project

  r.gain = Math.max(0, gain)

  next.metadata.updatedAt = Date.now()
  return next
}

/**
 * Updates the active DSP effects chain of a region.
 */
export function updateClipEffects(project: Project, trackId: string, regionId: string, effects: Effects): Project {
  const next = cloneDeep(project)
  const track = next.tracks.find(t => t.id === trackId)
  if (!track) return project

  const r = track.regions.find(reg => reg.id === regionId)
  if (!r) return project

  r.effects = {
    ...cloneDeep(DEFAULT_EFFECTS),
    ...(r.effects || {}),
    ...cloneDeep(effects)
  }

  next.metadata.updatedAt = Date.now()
  return next
}
