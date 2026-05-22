import { contextBridge, ipcRenderer } from 'electron'

export type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
}

const api = {
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  extractAudio: (videoPath: string, outputPath: string) => ipcRenderer.invoke('extract-audio', videoPath, outputPath),
  getMediaInfo: (filePath: string) => ipcRenderer.invoke('get-media-info', filePath),
  getPeaks: (filePath: string, samples?: number) => ipcRenderer.invoke('get-peaks', filePath, samples),
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
  
  // VST Bridge
  scanVstPlugins: () => ipcRenderer.invoke('scan-vst-plugins'),
  openVstUi: (pluginPath: string) => ipcRenderer.invoke('open-vst-ui', pluginPath),

  // Recording
  saveRecording: (outputPath: string, arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('save-recording', outputPath, arrayBuffer),

  // Software Update
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  startUpdateDownload: (payload: { url: string, latestVersion: string }) => ipcRenderer.invoke('start-update-download', payload),
  installUpdate: (payload: { installNow: boolean }) => ipcRenderer.invoke('install-update', payload),

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

