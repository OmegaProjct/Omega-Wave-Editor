import { FileEntry } from './index'

declare global {
  interface Window {
    api: {
      getHomeDir: () => Promise<string>
      fileExists: (filePath: string) => Promise<boolean>
      getSystemPath: (name: string) => Promise<string>
      readDir: (dirPath: string) => Promise<FileEntry[]>
      extractAudio: (videoPath: string, outputPath: string) => Promise<boolean>
      getMediaInfo: (filePath: string) => Promise<{ duration: number, channels?: number, tags?: any }>
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
      cancelUpdateDownload: () => Promise<{ success: boolean }>
      installUpdate: (payload: { installNow: boolean }) => Promise<{ success: boolean, error?: string, deferred?: boolean }>
      readChangelog: () => Promise<string>
      confirmClose: () => void
      onDownloadProgress: (callback: (data: any) => void) => () => void
      onCloseRequest: (callback: () => void) => () => void
      getPeaks: (filePath: string, samples?: number, channel?: 'left' | 'right') => Promise<number[]>
      getWaveformWindow: (filePath: string, options?: {
        startTime?: number
        duration?: number
        pixels?: number
        channel?: 'left' | 'right'
      }) => Promise<any>
      readFileBuffer: (filePath: string) => Promise<any>
      savePreset: (filePath: string, data: any) => Promise<any>
      saveProjectBackup: (filePath: string, data: any) => Promise<any>
      openPath: (dirPath: string) => Promise<{ success: boolean, error?: string }>
      transcodeExport: (tempWavPath: string, outputPath: string, options: any, id3Tags?: any) => Promise<boolean>
      getStartupFile: () => Promise<string | null>
      onOpenProjectFromAssociation: (callback: (filePath: string) => void) => () => void
      scanVstPlugins: () => Promise<any[]>
      
      // VST Bridge Pro (v0.8.0 / v0.8.9)
      loadVstPlugin: (path: string) => Promise<{ instanceId: number; name: string; vendor: string; numParams: number; numInputs: number; numOutputs: number; uniqueId: number; hasEditor: boolean }>
      vstSetSharedBuffer: (instanceId: number, inputSAB: SharedArrayBuffer, outputSAB: SharedArrayBuffer, midiSAB: SharedArrayBuffer) => Promise<{ success: boolean }>
      vstStartAudio: (instanceId: number, sampleRate: number, blockSize: number) => Promise<{ success: boolean }>
      vstStopAudio: (instanceId: number) => Promise<{ success: boolean }>
      getVstParams: (instanceId: number) => Promise<any[]>
      setVstParam: (instanceId: number, index: number, value: number) => Promise<{ success: boolean }> | void
      openVstEditor: (instanceId: number) => Promise<{ success: boolean }>
      closeVstEditor: (instanceId: number) => Promise<{ success: boolean }>
      unloadVstPlugin: (instanceId: number) => Promise<{ success: boolean }>
      onVstEditorClosed: (callback: (instanceId: number) => void) => () => void
      onVstNativeEditorClosed: (callback: () => void) => () => void
      
      getAsioDrivers: () => Promise<any[]>
      getAsioDriverDetails: (driverName: string) => Promise<{
        name: string
        inputsCount: number
        outputsCount: number
        inputChannels: string[]
        outputChannels: string[]
        minBufferSize: number
        maxBufferSize: number
        preferredBufferSize: number
        bufferSizeGranularity: number
        inputLatencySamples: number
        outputLatencySamples: number
        sampleRate: number
      } | null>
      openAsioControlPanel: (driverName: string) => Promise<{ success: boolean }>
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
      resizeWindow: (width: number, height: number) => void
      getMainWindowBounds: () => Promise<Electron.Rectangle | null>
      getDefaultMainWindowBounds: () => Promise<Electron.Rectangle>
      setMainWindowBounds: (bounds: Electron.Rectangle) => Promise<void>
      getPopoutBounds: () => Promise<Record<string, Electron.Rectangle>>
      setPopoutBounds: (bounds: Record<string, Electron.Rectangle>) => Promise<void>
      
      // Diagnose-Protokollierung (Logging) & Feedback
      log: (level: 'debug' | 'info' | 'warn' | 'error', moduleName: string, message: string, details?: any) => Promise<void>
      getLogPath: () => Promise<string>
      openLogFolder: () => Promise<void>
      getLogContent: (filename?: string) => Promise<string>
      clearLog: (filename?: string) => Promise<void>
      getSessionLogs: () => Promise<any[]>
      deleteSessionLog: (filename: string) => Promise<boolean>
      exportSessionLog: (filename: string) => Promise<{ success: boolean; error?: string }>
      submitFeedback: (data: any) => Promise<{ success: boolean; folder?: string; error?: string }>
      readClipboardImage: () => string | null
      getDeviceId: () => Promise<string>
      showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>
      deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
      copyFile: (srcPath: string, destDir: string) => Promise<{ success: boolean; error?: string }>
      moveFile: (srcPath: string, destDir: string) => Promise<{ success: boolean; error?: string }>
    }
  }
}
