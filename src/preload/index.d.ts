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
    }
  }
}