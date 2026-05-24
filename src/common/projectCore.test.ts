/**
 * projectCore.test.ts
 * Standalone Node.js Unit Tests for the Omega Wave Editor Command Layer, mutations, and headless runner.
 * Rigorously tests edge cases, error conditions, safety, and lossless model migration.
 */

import * as assert from 'assert'
import * as projectCore from './projectCore'
import { HeadlessRunner } from './headlessRunner'
import { executeCommand } from './commandLayer'
import { Project, Recipe } from './types'
import * as path from 'path'

console.log('=== STARTE ERWEITERTE OMEGA WAVE EDITOR CORE TESTS ===\n')

async function runTests() {
  // --- Test 1: Erstellung & Standardwerte ---
  console.log('[Test 1] Erstelle Standardprojekt...');
  const proj = projectCore.createDefaultProject(4, 44100)
  assert.strictEqual(proj.format, 'OWEP')
  assert.strictEqual(proj.tracks.length, 4)
  assert.strictEqual(proj.settings.sampleRate, 44100)
  console.log('  -> OK: Standardprojekt erfolgreich erstellt.\n')

  // --- Test 2: Spuren hinzufügen und entfernen ---
  console.log('[Test 2] Spuren hinzufügen, entfernen und re-indizieren...');
  const projWithTrack = projectCore.addTrack(proj, 'Gitarrenspur')
  assert.strictEqual(projWithTrack.tracks.length, 5)
  assert.strictEqual(projWithTrack.tracks[4].name, 'Gitarrenspur')

  const projWithRemovedTrack = projectCore.removeTrack(projWithTrack, projWithTrack.tracks[0].id)
  assert.strictEqual(projWithRemovedTrack.tracks.length, 4)
  assert.strictEqual(projWithRemovedTrack.tracks[0].index, 1)
  console.log('  -> OK: Spuren erfolgreich hinzugefügt und re-indiziert.\n')

  // --- Test 3: Verlustfreier Clip-Split ---
  console.log('[Test 3] Verlustfreier Clip-Split (Erhaltung von Farbe, Gruppe, Fades, Gain und Effekten)...');
  const trackId = proj.tracks[0].id
  const testFile = { name: 'gitarre.wav', path: 'C:/Files/gitarre.wav', isDirectory: false }
  
  // Custom region with full timeline visual metadata
  const originalRegion = {
    id: 'test-region-1',
    file: testFile,
    startPos: 2.0,
    duration: 10.0,
    sourceOffset: 0.0,
    fileDuration: 20.0,
    color: 'bg-teal-600',
    fadeIn: 0.5,
    fadeOut: 1.2,
    gain: 0.8,
    groupId: 'test-group-id',
    stereoMode: 'left-only' as const,
    name: 'Gitarrenclip',
    effects: {
      ...projectCore.cloneDeep(projectCore.DEFAULT_EFFECTS),
      reverbMix: 15
    },
    customProperty: 'extra-val' // unknown custom field to verify preservation
  }

  // Insert original region into track
  let projWithCustomRegion = projectCore.cloneDeep(proj)
  projWithCustomRegion.tracks[0].regions.push(originalRegion)

  // Split region at 6.0s
  const projWithSplit = projectCore.splitClip(projWithCustomRegion, trackId, 'test-region-1', 6.0)
  const regions = projWithSplit.tracks[0].regions
  assert.strictEqual(regions.length, 2)

  // Left part: 2.0s to 6.0s (duration 4.0s)
  assert.strictEqual(regions[0].startPos, 2.0)
  assert.strictEqual(regions[0].duration, 4.0)
  assert.strictEqual(regions[0].sourceOffset, 0.0)
  assert.strictEqual(regions[0].color, 'bg-teal-600')
  assert.strictEqual(regions[0].groupId, 'test-group-id')
  assert.strictEqual(regions[0].fadeIn, 0.5)
  assert.strictEqual(regions[0].fadeOut, 1.2)
  assert.strictEqual(regions[0].gain, 0.8)
  assert.strictEqual(regions[0].fileDuration, 20.0)
  assert.strictEqual(regions[0].stereoMode, 'left-only')
  assert.strictEqual(regions[0].customProperty, 'extra-val') // custom field preserved in split!
  assert.strictEqual(regions[0].effects?.reverbMix, 15)

  // Right part: 6.0s to 12.0s (duration 6.0s, offset 4.0s)
  assert.strictEqual(regions[1].startPos, 6.0)
  assert.strictEqual(regions[1].duration, 6.0)
  assert.strictEqual(regions[1].sourceOffset, 4.0)
  assert.strictEqual(regions[1].color, 'bg-teal-600')
  assert.strictEqual(regions[1].groupId, 'test-group-id')
  assert.strictEqual(regions[1].fadeIn, 0.5)
  assert.strictEqual(regions[1].fadeOut, 1.2)
  assert.strictEqual(regions[1].gain, 0.8)
  assert.strictEqual(regions[1].fileDuration, 20.0)
  assert.strictEqual(regions[1].stereoMode, 'left-only')
  assert.strictEqual(regions[1].customProperty, 'extra-val') // custom field preserved in split!
  assert.strictEqual(regions[1].effects?.reverbMix, 15)
  console.log('  -> OK: Clip erfolgreich sample-genau ohne Datenverlust gespalten.\n')

  // --- Test 4: Verlustfreie Migration ( validateAndMigrateProject ) ---
  console.log('[Test 4] Verlustfreie Migration mit unbekannten Zusatzfeldern...');
  const rawProject = {
    format: 'OWEP',
    version: '0.1.0',
    tracks: [
      {
        id: 'track-1',
        index: 1,
        name: 'Spur 1',
        customTrackMeta: 'keep-this-meta', // unknown custom track field
        regions: [
          {
            id: 'region-1',
            file: { name: 'gitarre.wav', path: 'C:/Files/gitarre.wav', isDirectory: false },
            startPos: 0,
            duration: 5,
            color: 'bg-red-600',
            groupId: 'group-1',
            customRegionMeta: 'keep-this-region-meta' // unknown custom region field
          }
        ]
      }
    ]
  }

  const migrated = projectCore.validateAndMigrateProject(rawProject)
  assert.strictEqual(migrated.tracks[0].customTrackMeta, 'keep-this-meta')
  assert.strictEqual(migrated.tracks[0].regions[0].color, 'bg-red-600')
  assert.strictEqual(migrated.tracks[0].regions[0].groupId, 'group-1')
  assert.strictEqual(migrated.tracks[0].regions[0].customRegionMeta, 'keep-this-region-meta')
  console.log('  -> OK: validateAndMigrateProject erhällt unbekannte Zusatzfelder vollständig.\n')

  // --- Test 5: Headless Safety Overwrite Prevention (Windows & POSIX) ---
  console.log('[Test 5] Headless Runner Schreibschutz-Pfadprüfung (Windows & POSIX)...');
  
  // Windows-Pfade
  const inputsWin = ['C:\\Files\\gitarre.wav'].map(p => path.resolve(p))
  const safeOutWin = HeadlessRunner.getSafeOutputPath('C:\\Files\\gitarre.wav', inputsWin, { allowOverwrite: false })
  assert.ok(safeOutWin.includes('_processed'))
  assert.notStrictEqual(safeOutWin, 'C:\\Files\\gitarre.wav')

  // POSIX-Pfade
  const inputsPosix = ['/files/gitarre.wav'].map(p => path.resolve(p))
  const safeOutPosix = HeadlessRunner.getSafeOutputPath('/files/gitarre.wav', inputsPosix, { allowOverwrite: false })
  assert.ok(safeOutPosix.includes('_processed'))
  assert.notStrictEqual(safeOutPosix, '/files/gitarre.wav')
  console.log('  -> OK: Schreibschutz schützt Windows- und POSIX-Originaldateien verlässlich.\n')

  // --- Test 6: Recipe-Ausführung auf realen Track-IDs ---
  console.log('[Test 6] Recipe-Ausführung mit realen Track-IDs...');
  const firstTrackId = proj.tracks[0].id
  const recipe: Recipe = {
    steps: [
      {
        action: 'clip.import',
        payload: {
          trackId: firstTrackId,
          file: { name: 'drum.wav', path: 'C:/drum.wav', isDirectory: false },
          startPos: 0,
          duration: 4
        }
      }
    ]
  }

  const result = await HeadlessRunner.executeRecipe(proj, recipe)
  // Verify clip was actually imported to the correct track
  assert.strictEqual(result.project.tracks[0].regions.length, 1)
  assert.strictEqual(result.project.tracks[0].regions[0].file.name, 'drum.wav')
  console.log('  -> OK: Recipe importiert erfolgreich Clips in vorhandene Spuren.\n')

  // --- Test 7: Recipe-Ausführung mit unbekannten Aktionen ---
  console.log('[Test 7] Recipe-Ausführung mit unbekannter Action (erwarteter Fehler)...');
  const badRecipe: Recipe = {
    steps: [
      {
        action: 'invalid.action' as any,
        payload: {}
      }
    ]
  }

  await assert.rejects(
    async () => {
      await HeadlessRunner.executeRecipe(proj, badRecipe)
    },
    (err: any) => {
      assert.ok(err.message.includes('Unbekannter oder nicht unterstützter Action-Typ'))
      return true
    }
  )
  console.log('  -> OK: Unbekannte Actions schlagen kontrolliert und sicher fehl.\n')

  // --- Test 8: Recipe-Ausführung mit nicht implementierten I/O-Aktionen ---
  console.log('[Test 8] Recipe-Ausführung mit I/O-Actions (export.render / metadata.write) (erwartete Fehler)...');
  const renderRecipe: Recipe = {
    steps: [
      {
        action: 'export.render',
        payload: { path: 'C:/Files/export.wav' }
      }
    ]
  }

  await assert.rejects(
    async () => {
      await HeadlessRunner.executeRecipe(proj, renderRecipe)
    },
    (err: any) => {
      assert.ok(err.message.includes("Aktion 'export.render' (Audio-Rendering) ist im Headless-Prototyp noch nicht implementiert"))
      return true
    }
  )
  console.log('  -> OK: export.render schlägt mit klarem, ehrlichen Not-Implemented-Fehler fehl.\n')

  console.log('=== ALLE ERWEITERTEN CORE TESTS ERFOLGREICH BESTANDEN! ===');
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('\n!!! TEST FEHLGESCHLAGEN !!!')
  console.error(err)
  process.exit(1)
})
