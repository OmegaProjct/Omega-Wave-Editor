type VstUiOpenResult = {
  success: boolean;
  error?: string;
};

interface Window {
  api: {
    scanVstPlugins: () => Promise<any[]>;
    openVstUi: (path: string) => Promise<VstUiOpenResult>;
    getAsioDrivers: () => Promise<any[]>;
    loadVstPlugin: (path: string) => Promise<any>;
    vstSetSharedBuffer: (inputSAB: SharedArrayBuffer, outputSAB: SharedArrayBuffer, midiSAB: SharedArrayBuffer) => Promise<{ success: boolean }>;
    vstStartAudio: (sampleRate: number, blockSize: number) => Promise<{ success: boolean }>;
    vstStopAudio: () => Promise<{ success: boolean }>;
    getVstParams: () => Promise<any[]>;
    setVstParam: (index: number, value: number) => Promise<{ success: boolean }>;
    openVstEditor: () => Promise<{ success: boolean }>;
    closeVstEditor: () => Promise<{ success: boolean }>;
    unloadVstPlugin: () => Promise<{ success: boolean }>;
    onVstEditorClosed: (callback: () => void) => () => void;
    readFileBuffer: (path: string) => Promise<any>;
    getHomeDir: () => Promise<string>;
    fileExists: (filePath: string) => Promise<boolean>;
    getSystemPath: (name: string) => Promise<string>;
    saveRecording: (path: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
    getDiskSpace: (dirPath: string) => Promise<{ success: boolean; freeBytes: number }>;
    getMediaInfo: (path: string) => Promise<{ duration: number; tags?: any }>;
    showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
    showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
    savePreset: (path: string, preset: any) => Promise<{ success: boolean; error?: string }>;
    loadProject: (path: string) => Promise<{ success: boolean; data: any }>;
    saveProject: (path: string, data: any) => Promise<{ success: boolean; error?: string }>;
    saveProjectBackup: (path: string, data: any) => Promise<any>;
    exportArrangement: (path: string, tracks: any[]) => Promise<void>;
    exportLayer: (path: string, track: any) => Promise<void>;
    readDir: (path: string) => Promise<any[]>;
    getSettings: () => Promise<any>;
    saveSettings: (settings: any) => Promise<void>;
    getWaveformData: (path: string) => Promise<any>;
    exportProject: (tracks: any[], path: string, id3Tags?: any) => Promise<boolean>;
    openExternal: (url: string) => Promise<void>;
    getPeaks: (path: string, samples?: number) => Promise<number[]>;
    openPath: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
    transcodeExport: (tempWavPath: string, outputPath: string, options: any, id3Tags?: any) => Promise<boolean>;
    getStartupFile: () => Promise<string | null>;
    onOpenProjectFromAssociation: (callback: (filePath: string) => void) => () => void;
    onCloseRequest: (callback: () => void) => () => void;
    confirmClose: () => void;
    checkForUpdates: () => Promise<{
      available: boolean;
      currentVersion: string;
      latestVersion?: string;
      url?: string;
      body?: string;
      error?: string;
    }>;
    getAppVersion: () => Promise<string>;
    startUpdateDownload: (payload: { url: string; latestVersion: string }) => Promise<{ success: boolean; error?: string; filePath?: string }>;
    installUpdate: (payload: { installNow: boolean }) => Promise<{ success: boolean; error?: string; deferred?: boolean }>;
    onDownloadProgress: (callback: (data: any) => void) => () => void;
    getPerformanceStats: () => Promise<{ cpuUsage: number, processRamBytes: number, systemRamPct: number, systemCpuPct: number }>;
    openExportSettings: (tracks: any, selection?: any, exportSettings?: any) => void;
    getExportTracks: () => Promise<{ tracks: any[]; selection: any; exportSettings: any } | null>;
    updateExportSettings: (settings: any) => void;
    startOfflineExport: (settings: any) => void;
    updateExportProgress: (progress: number, label: string) => void;
    notifyExportFinished: (status: string, filePath?: string, errorMsg?: string) => void;
    closeProgressWindow: () => void;
    seekTimeline: (position: number) => void;
    onExportSettingsUpdated: (callback: (settings: any) => void) => () => void;
    onStartOfflineRender: (callback: (settings: any) => void) => () => void;
    onExportProgressUpdate: (callback: (data: { progress: number; label: string }) => void) => () => void;
    onExportFinished: (callback: (data: { status: string; filePath?: string; errorMsg?: string }) => void) => () => void;
    onLockMainWindow: (callback: (locked: boolean) => void) => () => void;
    onSeekTimeline: (callback: (position: number) => void) => () => void;
    openPopoutWindow: (name: string, options?: { width?: number; height?: number; title?: string }) => void;
  };
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module 'ffprobe-static';
