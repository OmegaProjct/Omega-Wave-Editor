interface Window {
  api: {
    scanVstPlugins: () => Promise<any[]>;
    openVstUi: (path: string) => Promise<boolean>;
    readFileBuffer: (path: string) => Promise<any>;
    getHomeDir: () => Promise<string>;
    saveRecording: (path: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
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
  };
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module 'ffprobe-static';
