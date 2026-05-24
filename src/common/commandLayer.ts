/**
 * commandLayer.ts
 * Command translation layer mapping serialized JSON action step descriptions
 * to functional Project state mutations.
 */

import { Project, RecipeStep } from './types'
import * as projectCore from './projectCore'

/**
 * Decodes a JSON-based recipe step and executes the corresponding Project core mutation.
 * Returns a new Project state (deep copied and immutable transition).
 */
export function executeCommand(project: Project, step: RecipeStep): Project {
  if (!step || typeof step !== 'object') {
    throw new Error('Ungültiger Befehls-Schritt übergeben.')
  }

  const { action, payload } = step
  if (!action) {
    throw new Error('Keine Aktion im Befehls-Schritt definiert.')
  }

  switch (action) {
    case 'project.create': {
      const tracksCount = typeof payload.tracksCount === 'number' ? payload.tracksCount : 4
      const sampleRate = typeof payload.sampleRate === 'number' ? payload.sampleRate : 48000
      return projectCore.createDefaultProject(tracksCount, sampleRate)
    }

    case 'project.load': {
      if (!payload.projectData) {
        throw new Error('Ladevorgang erfordert "projectData" im Payload.')
      }
      return projectCore.validateAndMigrateProject(payload.projectData)
    }

    case 'track.add': {
      const name = typeof payload.name === 'string' ? payload.name : undefined
      return projectCore.addTrack(project, name)
    }

    case 'track.remove': {
      if (typeof payload.trackId !== 'string') {
        throw new Error('Entfernen erfordert eine gültige "trackId" im Payload.')
      }
      return projectCore.removeTrack(project, payload.trackId)
    }

    case 'track.rename': {
      if (typeof payload.trackId !== 'string' || typeof payload.name !== 'string') {
        throw new Error('Umbenennen erfordert "trackId" und "name" im Payload.')
      }
      const next = projectCore.cloneDeep(project)
      const track = next.tracks.find(t => t.id === payload.trackId)
      if (!track) {
        throw new Error(`Spur mit der ID "${payload.trackId}" konnte nicht gefunden werden.`)
      }
      track.name = payload.name
      next.metadata.updatedAt = Date.now()
      return next
    }

    case 'clip.import': {
      if (
        typeof payload.trackId !== 'string' ||
        !payload.file ||
        typeof payload.startPos !== 'number' ||
        typeof payload.duration !== 'number'
      ) {
        throw new Error('Clip-Import erfordert "trackId", "file", "startPos" und "duration" im Payload.')
      }
      return projectCore.importClip(project, payload.trackId, payload.file, payload.startPos, payload.duration)
    }

    case 'clip.split': {
      if (typeof payload.trackId !== 'string' || typeof payload.regionId !== 'string' || typeof payload.splitPos !== 'number') {
        throw new Error('Schneiden erfordert "trackId", "regionId" und "splitPos" im Payload.')
      }
      return projectCore.splitClip(project, payload.trackId, payload.regionId, payload.splitPos)
    }

    case 'clip.trim': {
      if (
        typeof payload.trackId !== 'string' ||
        typeof payload.regionId !== 'string' ||
        typeof payload.sourceOffset !== 'number' ||
        typeof payload.duration !== 'number'
      ) {
        throw new Error('Trimming erfordert "trackId", "regionId", "sourceOffset" und "duration" im Payload.')
      }
      return projectCore.trimClip(project, payload.trackId, payload.regionId, payload.sourceOffset, payload.duration)
    }

    case 'clip.fade': {
      if (typeof payload.trackId !== 'string' || typeof payload.regionId !== 'string') {
        throw new Error('Fade-Anpassung erfordert "trackId" und "regionId" im Payload.')
      }
      return projectCore.updateClipFades(project, payload.trackId, payload.regionId, payload.fadeIn, payload.fadeOut)
    }

    case 'clip.gain': {
      if (typeof payload.trackId !== 'string' || typeof payload.regionId !== 'string' || typeof payload.gain !== 'number') {
        throw new Error('Gain-Anpassung erfordert "trackId", "regionId" und "gain" im Payload.')
      }
      return projectCore.updateClipGain(project, payload.trackId, payload.regionId, payload.gain)
    }

    case 'effects.apply': {
      if (typeof payload.trackId !== 'string' || typeof payload.regionId !== 'string' || !payload.effects) {
        throw new Error('Effektanwendung erfordert "trackId", "regionId" und "effects" im Payload.')
      }
      return projectCore.updateClipEffects(project, payload.trackId, payload.regionId, payload.effects)
    }

    case 'effects.reset': {
      if (typeof payload.trackId !== 'string' || typeof payload.regionId !== 'string') {
        throw new Error('Effektrücksetzung erfordert "trackId" und "regionId" im Payload.')
      }
      return projectCore.updateClipEffects(project, payload.trackId, payload.regionId, projectCore.DEFAULT_EFFECTS)
    }

    case 'project.save':
      throw new Error("Aktion 'project.save' ist im rein funktionalen Command Layer nicht direkt implementiert (erfordert I/O).")

    case 'metadata.write':
      throw new Error("Aktion 'metadata.write' ist im rein funktionalen Command Layer nicht direkt implementiert (erfordert Dateizugriff).")

    case 'export.render':
      throw new Error("Aktion 'export.render' ist im rein funktionalen Command Layer nicht direkt implementiert (erfordert Audio-Rendering).")

    default:
      throw new Error(`Unbekannter oder nicht unterstützter Action-Typ: ${action}`)
  }
}
