interface Window {
  api: {
    scanVstPlugins: () => Promise<any[]>;
    openVstUi: (path: string) => Promise<void>;
    readFileBuffer: (path: string) => Promise<any>;
    getHomeDir: () => Promise<string>;
    saveRecording: (path: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
    getMediaInfo: (path: string) => Promise<{ duration?: number }>;
    showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
    showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
    savePreset: (path: string, preset: any) => Promise<{ success: boolean; error?: string }>;
    loadProject: (path: string) => Promise<{ success: boolean; data: any }>;
    saveProject: (path: string, data: any) => Promise<{ success: boolean; error?: string }>;
    exportArrangement: (path: string, tracks: any[]) => Promise<void>;
    exportLayer: (path: string, track: any) => Promise<void>;
    readDir: (path: string) => Promise<any[]>;
    getSettings: () => Promise<any>;
    saveSettings: (settings: any) => Promise<void>;
    getWaveformData: (path: string) => Promise<any>;
    exportProject: (tracks: any[], path: string, id3Tags?: any) => Promise<boolean>;
    openExternal: (url: string) => Promise<void>;
    getPeaks: (path: string) => Promise<number[]>;
  };
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module 'ffprobe-static';
