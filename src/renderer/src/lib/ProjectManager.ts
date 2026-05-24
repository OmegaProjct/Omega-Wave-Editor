/**
 * ProjectManager.ts
 * Manages .owep (Project), .owea (Arrangement), and .owel (Layer) lifecycle.
 * Utilizing unified types and validation core.
 */

import { Project, ArrangementData, LayerData } from '../../../common/types'
import { validateAndMigrateProject } from '../../../common/projectCore'

export class ProjectManager {
  private static currentPath: string | null = null

  public static async saveProject(path: string, tracks: any[], settings: any) {
    const data: Project = {
      format: 'OWEP',
      version: '1.0.0',
      tracks,
      settings,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: 'Omega User'
      }
    }
    
    // Validate project before saving to guarantee file health
    const validated = validateAndMigrateProject(data)
    const result = await window.api.saveProject(path, validated)
    
    if (result.success) {
      this.currentPath = path
    }
    return result
  }

  public static async loadProject(path: string) {
    const result = await window.api.loadProject(path)
    if (result.success && result.data) {
      try {
        // Validate and migrate automatically upon loading
        const migratedProject = validateAndMigrateProject(result.data)
        result.data = migratedProject
        this.currentPath = path
        return result
      } catch (err: any) {
        throw new Error(`Fehler bei der Projekt-Validierung: ${err.message}`)
      }
    }
    throw new Error('Projekt-Dateiformat ist ungültig.')
  }

  /**
   * Export only the arrangement (tracks and regions)
   */
  public static async exportArrangement(path: string, tracks: any[]) {
    const data: ArrangementData = {
      format: 'OWEA',
      version: '1.0.0',
      tracks
    }
    return await window.api.savePreset(path, data)
  }

  /**
   * Export a single layer (track)
   */
  public static async exportLayer(path: string, track: any) {
    const data: LayerData = {
      format: 'OWEL',
      version: '1.0.0',
      track
    }
    return await window.api.savePreset(path, data)
  }

  public static getCurrentPath() {
    return this.currentPath
  }

  public static setCurrentPath(path: string | null) {
    this.currentPath = path
  }

  public static reset() {
    this.currentPath = null
  }
}
