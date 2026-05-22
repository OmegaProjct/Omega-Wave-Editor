import { FileEntry } from '../../preload/index'

declare global {
  interface Window {
    api: {
      getHomeDir: () => Promise<string>
      readDir: (dirPath: string) => Promise<FileEntry[]>
      extractAudio: (videoPath: string, outputPath: string) => Promise<boolean>
      getMediaInfo: (filePath: string) => Promise<{ duration: number, tags?: any }>
      exportProject: (tracksData: any, outputPath: string, id3Tags?: any) => Promise<boolean>
      getSettings: () => Promise<{ defaultExplorerPath: string }>
      saveSettings: (settings: { defaultExplorerPath: string }) => Promise<boolean>
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
      openVstUi: (pluginPath: string) => Promise<boolean>
      saveRecording: (outputPath: string, arrayBuffer: ArrayBuffer) => Promise<any>
      getDiskSpace: (dirPath: string) => Promise<{ success: boolean, freeBytes: number }>
      showOpenDialog: (options: any) => Promise<any>
      showSaveDialog: (options: any) => Promise<any>
    }
  }
}