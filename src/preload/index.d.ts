import { FileEntry } from './index'

type VstUiOpenResult = {
  success: boolean
  error?: string
}

declare global {
  interface Window {
    api: {
      getHomeDir: () => Promise<string>
      fileExists: (filePath: string) => Promise<boolean>
      getSystemPath: (name: string) => Promise<string>
      readDir: (dirPath: string) => Promise<FileEntry[]>
      extractAudio: (videoPath: string, outputPath: string) => Promise<boolean>
      getMediaInfo: (filePath: string) => Promise<{ duration: number, tags?: any }>
      exportProject: (tracksData: any, outputPath: string, id3Tags?: any) => Promise<boolean>
      getSettings: () => Promise<any>
      saveSettings: (settings: any) => Promise<boolean>
      openExternal: (url: string) => Promise<void>
      checkForUpdates: () => Promise<{
        available: boolean
        currentVersion: string
        latestVersion?: string
        url?: string
        body?: string
        error?: string
      }>
      getAppVersion: () => Promise<string>
      startUpdateDownload: (payload: { url: string, latestVersion: string }) => Promise<{ success: boolean, error?: string, filePath?: string }>
      installUpdate: (payload: { installNow: boolean }) => Promise<{ success: boolean, error?: string, deferred?: boolean }>
      confirmClose: () => void
      onDownloadProgress: (callback: (data: any) => void) => () => void
      onCloseRequest: (callback: () => void) => () => void
      getPeaks: (filePath: string, samples?: number) => Promise<number[]>
      readFileBuffer: (filePath: string) => Promise<any>
      savePreset: (filePath: string, data: any) => Promise<any>
      saveProjectBackup: (filePath: string, data: any) => Promise<any>
      openPath: (dirPath: string) => Promise<{ success: boolean, error?: string }>
      transcodeExport: (tempWavPath: string, outputPath: string, options: any, id3Tags?: any) => Promise<boolean>
      getStartupFile: () => Promise<string | null>
      onOpenProjectFromAssociation: (callback: (filePath: string) => void) => () => void
      scanVstPlugins: () => Promise<any[]>
      openVstUi: (pluginPath: string) => Promise<VstUiOpenResult>
      setVstParam: (index: number, value: number) => Promise<{ success: boolean }> | void
      getAsioDrivers: () => Promise<any[]>
      saveRecording: (outputPath: string, arrayBuffer: ArrayBuffer) => Promise<any>
      getDiskSpace: (dirPath: string) => Promise<{ success: boolean, freeBytes: number }>
      getPerformanceStats: () => Promise<{ cpuUsage: number, processRamBytes: number, systemRamPct: number, systemCpuPct: number }>
      showOpenDialog: (options: any) => Promise<any>
      showSaveDialog: (options: any) => Promise<any>
      openExportSettings: (tracks: any, selection: any, exportSettings: any) => void
      getExportTracks: () => Promise<{ tracks: any[]; selection: any; exportSettings: any } | null>
      updateExportSettings: (settings: any) => void
      startOfflineExport: (settings: any) => void
      updateExportProgress: (progress: number, label: string) => void
      notifyExportFinished: (status: string, filePath?: string, errorMsg?: string) => void
      closeProgressWindow: () => void
      seekTimeline: (position: number) => void
      onExportSettingsUpdated: (callback: (settings: any) => void) => () => void
      onStartOfflineRender: (callback: (settings: any) => void) => () => void
      onExportProgressUpdate: (callback: (data: { progress: number; label: string }) => void) => () => void
      onExportFinished: (callback: (data: { status: string; filePath?: string; errorMsg?: string }) => void) => () => void
      onLockMainWindow: (callback: (locked: boolean) => void) => () => void
      onSeekTimeline: (callback: (position: number) => void) => () => void
      openPopoutWindow: (name: string, options?: { width?: number; height?: number; title?: string }) => void
    }
  }
}