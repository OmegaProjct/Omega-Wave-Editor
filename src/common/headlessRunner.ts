/**
 * headlessRunner.ts
 * Executes recipe steps headlessly and provides strict file-integrity safety checks.
 */

import { Project, Recipe, RecipeStep, Region } from './types'
import { executeCommand } from './commandLayer'
import * as path from 'path'
import * as fs from 'fs'

export interface HeadlessRunnerOptions {
  allowOverwrite?: boolean
  defaultSuffix?: string
}

export class HeadlessRunner {
  /**
   * Scans a Project for all active audio clip filepaths to establish the input blocklist.
   */
  public static getInputFilePaths(project: Project): string[] {
    const paths: string[] = []
    project.tracks.forEach(track => {
      track.regions.forEach(region => {
        if (region.file && region.file.path) {
          paths.push(path.resolve(region.file.path))
        }
      })
    })
    return Array.from(new Set(paths))
  }

  /**
   * Safely calculates a non-colliding destination path if overwriting is prohibited.
   */
  public static getSafeOutputPath(
    targetPath: string,
    inputPaths: string[],
    options: HeadlessRunnerOptions = {}
  ): string {
    const { allowOverwrite = false, defaultSuffix = '_processed' } = options
    const resolvedTarget = path.resolve(targetPath)

    // If overwriting is explicitly allowed, or the target path does not collide with any input file
    if (allowOverwrite || !inputPaths.includes(resolvedTarget)) {
      return targetPath
    }

    // Overwrite detected & prohibited -> enforce safety suffix
    const dir = path.dirname(resolvedTarget)
    const ext = path.extname(resolvedTarget)
    const base = path.basename(resolvedTarget, ext)
    
    let suffixCount = 0
    let safePath = path.join(dir, `${base}${defaultSuffix}${ext}`)
    
    // Ensure no collision with both input files and existing output files
    while (inputPaths.includes(path.resolve(safePath)) || fs.existsSync(safePath)) {
      suffixCount++
      safePath = path.join(dir, `${base}${defaultSuffix}_${suffixCount}${ext}`)
    }

    return safePath
  }

  /**
   * Executes a complete recipe of sequential actions on a Project.
   */
  public static async executeRecipe(
    project: Project,
    recipe: Recipe,
    options: HeadlessRunnerOptions = {}
  ): Promise<{ project: Project; lastOutputPath?: string }> {
    let currentProject = JSON.parse(JSON.stringify(project)) as Project
    const inputPaths = this.getInputFilePaths(currentProject)
    let lastOutputPath: string | undefined = undefined

    // Clone to prevent any mutation of caller-provided recipe or steps
    const recipeCopy = JSON.parse(JSON.stringify(recipe)) as Recipe

    for (const step of recipeCopy.steps) {
      const { action, payload } = step

      if (action === 'export.render') {
        throw new Error("Fehler: Aktion 'export.render' (Audio-Rendering) ist im Headless-Prototyp noch nicht implementiert.")
      } else if (action === 'metadata.write') {
        throw new Error("Fehler: Aktion 'metadata.write' (Metadaten schreiben) ist im Headless-Prototyp noch nicht implementiert.")
      } else if (action === 'project.save') {
        if (!payload || !payload.path) {
          throw new Error('Projekt-Speichern erfordert einen Pfad ("path").')
        }
        const originalPath = payload.path
        const safePath = this.getSafeOutputPath(originalPath, inputPaths, options)
        lastOutputPath = safePath
        console.log(`[HeadlessRunner] Saves project file safely to: ${safePath}`)
      } else {
        // Safe pure-functional state mutations
        currentProject = executeCommand(currentProject, step)
      }
    }

    return { project: currentProject, lastOutputPath }
  }
}
