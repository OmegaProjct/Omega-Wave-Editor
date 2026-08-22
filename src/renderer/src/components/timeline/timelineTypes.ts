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
  pan?: number
  panL?: number
  panR?: number
  color?: string
}

export type ToolbarVisibilityKey =
  | 'selectTool'
  | 'cutTool'
  | 'transport'
  | 'record'
  | 'undo'
  | 'redo'
  | 'snap'
  | 'group'
  | 'ungroup'
  | 'gapClose'
  | 'timeDisplay'
  | 'selectionDisplay'
  | 'autoScrollMode'
  | 'export'

export type ToolbarSeparatorState = Record<ToolbarVisibilityKey, { before: boolean; after: boolean }>
export type ToolbarColorKey = 'default' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet'
export type ToolbarColorState = Record<ToolbarVisibilityKey, ToolbarColorKey>

export type TimeDisplayFormat =
  | 'seconds'
  | 'seconds-ms'
  | 'hhmmss'
  | 'ddhhmmss'
  | 'hhmmss-hundredths'
  | 'hhmmss-ms'
  | 'hhmmss-samples'
  | 'samples'
  | 'hhmmss-film24'
  | 'film24'
  | 'hhmmss-ntsc-drop'
  | 'hhmmss-ntsc-nondrop'
  | 'ntsc'
  | 'hhmmss-pal'
  | 'pal'
  | 'hhmmss-cdda'
  | 'cdda'

export type TimelinePerformanceStats = {
  cpuUsage: number
  processRamBytes: number
  systemRamPct: number
  systemCpuPct: number
  gpuProcessCpuPct?: number
  gpuProcessRamBytes?: number
  gpuModel?: string
  gpuFeatureStatus?: Record<string, string> | null
}

export type TimelineDiagnosticEvent = {
  seq: number
  kind: string
  atMs: number
  details?: Record<string, unknown>
}
