/**
 * ProjectManager.ts
 * Manages .owep (Project), .owea (Arrangement), and .owel (Layer) lifecycle.
 */

export type ProjectData = {
  format: 'OWEP';
  version: string;
  tracks: any[];
  settings: {
    zoomLevel: number;
    sampleRate: number;
    playheadPos: number;
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    author: string;
  };
};

export type ArrangementData = {
  format: 'OWEA'; // Omega Wave Arrangement
  version: string;
  tracks: any[]; // Subset or full set of tracks without global settings
};

export type LayerData = {
  format: 'OWEL'; // Omega Wave Layer
  version: string;
  track: any; // Single track data
};

export class ProjectManager {
  private static currentPath: string | null = null;

  public static async saveProject(path: string, tracks: any[], settings: any) {
    const data: ProjectData = {
      format: 'OWEP',
      version: '1.0.0',
      tracks,
      settings,
      metadata: {
        createdAt: Date.now(), // Simplified for MVP
        updatedAt: Date.now(),
        author: 'Omega User'
      }
    };
    const result = await window.api.saveProject(path, data);
    if (result.success) {
      this.currentPath = path;
    }
    return result;
  }

  public static async loadProject(path: string) {
    const result = await window.api.loadProject(path);
    if (result.success && result.data.format === 'OWEP') {
      this.currentPath = path;
      return result;
    }
    throw new Error('Invalid project file format');
  }

  /**
   * Export only the arrangement (tracks and regions)
   */
  public static async exportArrangement(path: string, tracks: any[]) {
    const data: ArrangementData = {
      format: 'OWEA',
      version: '1.0.0',
      tracks
    };
    return await window.api.savePreset(path, data);
  }

  /**
   * Export a single layer (track)
   */
  public static async exportLayer(path: string, track: any) {
    const data: LayerData = {
      format: 'OWEL',
      version: '1.0.0',
      track
    };
    return await window.api.savePreset(path, data);
  }

  public static getCurrentPath() {
    return this.currentPath;
  }

  public static reset() {
    this.currentPath = null;
  }
}
