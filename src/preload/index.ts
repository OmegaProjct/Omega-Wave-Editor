import { contextBridge, ipcRenderer } from 'electron'

export type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
}

const api = {
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  getSystemPath: (name: string) => ipcRenderer.invoke('get-system-path', name),
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  extractAudio: (videoPath: string, outputPath: string) => ipcRenderer.invoke('extract-audio', videoPath, outputPath),
  getMediaInfo: (filePath: string) => ipcRenderer.invoke('get-media-info', filePath),
  getPeaks: (filePath: string, samples?: number, channel?: 'left' | 'right') => ipcRenderer.invoke('get-peaks', filePath, samples, channel),
  readFileBuffer: (filePath: string) => ipcRenderer.invoke('read-file-buffer', filePath),
  exportProject: (tracksData: any, outputPath: string, id3Tags?: any) => ipcRenderer.invoke('export-project', tracksData, outputPath, id3Tags),
  saveProject: (filePath: string, data: any) => ipcRenderer.invoke('save-project', filePath, data),
  saveProjectBackup: (filePath: string, data: any) => ipcRenderer.invoke('save-project-backup', filePath, data),
  loadProject: (filePath: string) => ipcRenderer.invoke('load-project', filePath),
  savePreset: (filePath: string, data: any) => ipcRenderer.invoke('save-preset', filePath, data),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  openPath: (dirPath: string) => ipcRenderer.invoke('open-path', dirPath),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  transcodeExport: (tempWavPath: string, outputPath: string, options: any, id3Tags?: any) => ipcRenderer.invoke('transcode-export', tempWavPath, outputPath, options, id3Tags),
  getStartupFile: () => ipcRenderer.invoke('get-startup-file'),
  
  // VST Bridge Pro (v0.8.0)
  scanVstPlugins: () => ipcRenderer.invoke('scan-vst-plugins'),
  getAsioDrivers: () => ipcRenderer.invoke('get-asio-drivers'),
  getAsioDriverDetails: (driverName: string) => ipcRenderer.invoke('get-asio-driver-details', driverName),
  openAsioControlPanel: (driverName: string) => ipcRenderer.invoke('open-asio-control-panel', driverName),
  loadVstPlugin: (path: string) => ipcRenderer.invoke('vst-load-plugin', path),
  vstSetSharedBuffer: (instanceId: number, inputSAB: SharedArrayBuffer, outputSAB: SharedArrayBuffer, midiSAB: SharedArrayBuffer) => 
    ipcRenderer.invoke('vst-set-shared-buffer', instanceId, inputSAB, outputSAB, midiSAB),
  vstStartAudio: (instanceId: number, sampleRate: number, blockSize: number) => ipcRenderer.invoke('vst-start-audio', instanceId, sampleRate, blockSize),
  vstStopAudio: (instanceId: number) => ipcRenderer.invoke('vst-stop-audio', instanceId),
  getVstParams: (instanceId: number) => ipcRenderer.invoke('vst-get-params', instanceId),
  setVstParam: (instanceId: number, index: number, value: number) => ipcRenderer.invoke('vst-set-param', instanceId, index, value),
  openVstEditor: (instanceId: number) => ipcRenderer.invoke('vst-open-editor', instanceId),
  closeVstEditor: (instanceId: number) => ipcRenderer.invoke('vst-close-editor', instanceId),
  unloadVstPlugin: (instanceId: number) => ipcRenderer.invoke('vst-unload-plugin', instanceId),
  onVstEditorClosed: (callback: (instanceId: number) => void) => {
    const sub = (_event: any, instanceId: number) => callback(instanceId)
    ipcRenderer.on('vst-editor-closed', sub)
    return () => { ipcRenderer.removeListener('vst-editor-closed', sub) }
  },
  onVstNativeEditorClosed: (callback: () => void) => {
    const sub = () => callback()
    ipcRenderer.on('vst-native-editor-closed', sub)
    return () => { ipcRenderer.removeListener('vst-native-editor-closed', sub) }
  },

  // Recording
  saveRecording: (outputPath: string, arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('save-recording', outputPath, arrayBuffer),
  getDiskSpace: (dirPath: string) => ipcRenderer.invoke('get-disk-space', dirPath),
  getPerformanceStats: () => ipcRenderer.invoke('get-performance-stats'),

  // Software Update
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  startUpdateDownload: (payload: { url: string, latestVersion: string }) => ipcRenderer.invoke('start-update-download', payload),
  cancelUpdateDownload: () => ipcRenderer.invoke('cancel-update-download'),
  installUpdate: (payload: { installNow: boolean }) => ipcRenderer.invoke('install-update', payload),
  readChangelog: () => ipcRenderer.invoke('read-changelog'),

  // Locales & Translations
  getLocales: () => ipcRenderer.invoke('get-locales'),
  saveLocale: (lang: string, content: any) => ipcRenderer.invoke('save-locale', { lang, content }),

  // Close Confirmation
  confirmClose: () => ipcRenderer.send('window-close-confirmed'),

  // Subscriptions
  onDownloadProgress: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on('download-progress', subscription)
    return () => {
      ipcRenderer.removeListener('download-progress', subscription)
    }
  },
  onCloseRequest: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('window-close-request', subscription)
    return () => {
      ipcRenderer.removeListener('window-close-request', subscription)
    }
  },
  onOpenProjectFromAssociation: (callback: (filePath: string) => void) => {
    const subscription = (_event: any, filePath: string) => callback(filePath)
    ipcRenderer.on('open-project-from-association', subscription)
    return () => {
      ipcRenderer.removeListener('open-project-from-association', subscription)
    }
  },

  // Export popouts
  openExportSettings: (tracks: any, selection: any, exportSettings: any) => ipcRenderer.send('open-export-settings', { tracks, selection, exportSettings }),
  getExportTracks: () => ipcRenderer.invoke('get-export-tracks'),
  updateExportSettings: (settings: any) => ipcRenderer.send('update-export-settings', settings),
  startOfflineExport: (settings: any) => ipcRenderer.send('start-offline-export', settings),
  updateExportProgress: (progress: number, label: string) => ipcRenderer.send('update-export-progress', progress, label),
  notifyExportFinished: (status: string, filePath?: string, errorMsg?: string) => ipcRenderer.send('notify-export-finished', status, filePath, errorMsg),
  closeProgressWindow: () => ipcRenderer.send('close-progress-window'),
  seekTimeline: (position: number) => ipcRenderer.send('seek-timeline', position),
  
  openPopoutWindow: (name: string, options?: { width?: number; height?: number; title?: string }) => 
    ipcRenderer.send('open-popout-window', { name, ...options }),
  
  resizeWindow: (width: number, height: number) => 
    ipcRenderer.send('resize-window', { width, height }),
  
  onExportSettingsUpdated: (callback: (settings: any) => void) => {
    const sub = (_e: any, settings: any) => callback(settings)
    ipcRenderer.on('export-settings-updated', sub)
    return () => { ipcRenderer.removeListener('export-settings-updated', sub) }
  },
  onStartOfflineRender: (callback: (settings: any) => void) => {
    const sub = (_e: any, settings: any) => callback(settings)
    ipcRenderer.on('start-offline-render', sub)
    return () => { ipcRenderer.removeListener('start-offline-render', sub) }
  },
  onExportProgressUpdate: (callback: (data: { progress: number; label: string }) => void) => {
    const sub = (_e: any, data: any) => callback(data)
    ipcRenderer.on('export-progress-update', sub)
    return () => { ipcRenderer.removeListener('export-progress-update', sub) }
  },
  onExportFinished: (callback: (data: { status: string; filePath?: string; errorMsg?: string }) => void) => {
    const sub = (_e: any, data: any) => callback(data)
    ipcRenderer.on('export-finished-event', sub)
    return () => { ipcRenderer.removeListener('export-finished-event', sub) }
  },
  onLockMainWindow: (callback: (locked: boolean) => void) => {
    const sub = (_e: any, locked: boolean) => callback(locked)
    ipcRenderer.on('lock-main-window', sub)
    return () => { ipcRenderer.removeListener('lock-main-window', sub) }
  },
  onSeekTimeline: (callback: (position: number) => void) => {
    const sub = (_e: any, position: number) => callback(position)
    ipcRenderer.on('seek-timeline', sub)
    return () => { ipcRenderer.removeListener('seek-timeline', sub) }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}

