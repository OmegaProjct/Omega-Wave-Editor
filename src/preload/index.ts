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
  loadProject: (filePath: string) => ipcRenderer.invoke('load-project', filePath),
  savePreset: (filePath: string, data: any) => ipcRenderer.invoke('save-preset', filePath, data),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  
  // VST Bridge
  scanVstPlugins: () => ipcRenderer.invoke('scan-vst-plugins'),
  openVstUi: (pluginPath: string) => ipcRenderer.invoke('open-vst-ui', pluginPath),

  // Recording
  saveRecording: (outputPath: string, arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('save-recording', outputPath, arrayBuffer)
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
