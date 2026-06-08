/**
 * types.ts
 * Unified core type definitions for the Omega Wave Editor ecosystem.
 * Shared across Main Process, Preload, and Renderer.
 */

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
}

export interface Effects {
  eqActive?: boolean
  eqGains?: number[] // 10-band values (e.g. from -15 to +15)
  compActive?: boolean
  compThreshold?: number // dB
  compRatio?: number // e.g. 1 to 20
  reverbMix?: number // %
  reverbTime?: number // seconds
  delayFeedback?: number // %
  delayTime?: number // ms
  deEsserActive?: boolean
  deEsserReduction?: number // dB
  pitchRate?: number // multiplier (e.g. 0.5 to 2.0)
  keepPitch?: boolean
}

export interface Region {
  id: string
  file: FileEntry
  startPos: number // in seconds in timeline
  duration: number // in seconds
  sourceOffset?: number // starting offset in original audio in seconds
  gain?: number // multiplier (e.g. 0.0 to 2.0)
  fadeIn?: number // fade-in duration in seconds
  fadeOut?: number // fade-out duration in seconds
  effects?: Effects
  stereoMode?: 'stereo' | 'left-only' | 'right-only'
  name?: string
  fileDuration?: number
  color?: string
  groupId?: string
  channels?: number
  [key: string]: any // allow unknown/extra fields at runtime
}

export interface Track {
  id: string
  index: number
  name: string
  regions: Region[]
  muted: boolean
  solo: boolean
  locked: boolean
  visible: boolean
  volume: number // multiplier (0.0 to 1.5)
  preMuteVolume?: number // remember volume level before fader mute toggle
  height: number // visual height in pixels
  automation: any[] // reserved for parameter automation curves
  denoise?: number // reduction dB (0 to 24)
  dehiss?: number // reduction dB (0 to 24)
  [key: string]: any // allow unknown/extra fields at runtime
}

export interface ProjectSettings {
  zoomLevel: number
  sampleRate: number
  playheadPos: number
  exportSettings?: ExportSettings
}

export interface ProjectMetadata {
  createdAt: number
  updatedAt: number
  author: string
}

export interface Project {
  format: 'OWEP'
  version: string // e.g. "1.0.0"
  tracks: Track[]
  settings: ProjectSettings
  metadata: ProjectMetadata
}

export interface MetadataTags {
  title?: string
  artist?: string
  album?: string
  year?: string
  genre?: string
  comment?: string
  track?: string
  coverPath?: string
}

export interface ExportSettings {
  format: 'wav' | 'mp3' | 'flac' | 'ogg' | 'm4a' | 'opus'
  path: string
  sampleRate: number
  bitDepth?: string // e.g. "16 Bit", "24 Bit", "32 Bit float"
  bitrate?: string // e.g. "128", "192", "320" kbps
  channels: 'Stereo' | 'Mono'
  playAfterExport: boolean
  id3Tags?: MetadataTags
}

export interface PluginDescriptor {
  id: string // unique SHA-like hash of filepath and name
  name: string
  manufacturer: string
  version?: string
  format: 'VST2' | 'VST3' | 'AU' | 'LV2'
  path: string
  category?: string
  scanStatus: 'scanned' | 'failed' | 'ignored'
  crashCount?: number
  blocked?: boolean
  error?: string
  hostable?: boolean
  unsupportedReason?: string
}

export interface Session {
  id: string
  currentProject: Project
  createdAt: number
  updatedAt: number
}

export interface Job {
  id: string
  sessionId: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'canceled'
  progress: number // 0 to 100
  label: string
  logs: string[]
  error?: string
  outputPath?: string
}

export interface RecipeStep {
  action:
    | 'project.create'
    | 'project.load'
    | 'project.save'
    | 'track.add'
    | 'track.remove'
    | 'track.rename'
    | 'clip.import'
    | 'clip.split'
    | 'clip.trim'
    | 'clip.fade'
    | 'clip.gain'
    | 'effects.apply'
    | 'effects.reset'
    | 'metadata.write'
    | 'export.render'
  payload: any
}

export interface Recipe {
  name?: string
  steps: RecipeStep[]
}

export interface ArrangementData {
  format: 'OWEA'
  version: string
  tracks: Track[]
}

export interface LayerData {
  format: 'OWEL'
  version: string
  track: Track
}
