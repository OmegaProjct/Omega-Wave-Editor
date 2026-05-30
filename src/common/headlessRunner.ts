/**
 * headlessRunner.ts
 * Executes recipe steps headlessly and provides strict file-integrity safety checks.
 */

import { Project, Recipe, RecipeStep, Region } from './types'
import { executeCommand } from './commandLayer'
import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'

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
        if (!payload || !payload.inputPath) {
          throw new Error('Aktion "metadata.write" erfordert einen "inputPath".')
        }
        const inputPath = payload.inputPath
        const tags = payload.tags || {}

        // Find safe output path
        const originalOutPath = payload.outputPath || inputPath
        const safeOutPath = this.getSafeOutputPath(originalOutPath, inputPaths, options)

        // If safeOutPath is the same as inputPath, write to a temp file first (preserving original extension for FFmpeg format detection), then replace.
        const resolvedInput = path.resolve(inputPath)
        const resolvedSafeOut = path.resolve(safeOutPath)
        const useTempFile = (resolvedInput === resolvedSafeOut)
        
        const ext = path.extname(safeOutPath)
        const base = path.basename(safeOutPath, ext)
        const dir = path.dirname(safeOutPath)
        const ffmpegOutPath = useTempFile ? path.join(dir, `${base}_temp${ext}`) : safeOutPath

        // Create directory for safeOutPath if it doesn't exist
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        await this.writeMetadataWithFFmpeg(inputPath, ffmpegOutPath, tags)

        if (useTempFile) {
          if (fs.existsSync(safeOutPath)) {
            fs.unlinkSync(safeOutPath)
          }
          fs.renameSync(ffmpegOutPath, safeOutPath)
        }

        lastOutputPath = safeOutPath
      } else if (action === 'project.save') {
        if (!payload || !payload.path) {
          throw new Error('Projekt-Speichern erfordert einen Pfad ("path").')
        }
        const originalPath = payload.path
        const safePath = this.getSafeOutputPath(originalPath, inputPaths, options)
        lastOutputPath = safePath
        console.log(`[HeadlessRunner] Saves project file safely to: ${safePath}`)
        fs.writeFileSync(safePath, JSON.stringify(currentProject, null, 2), 'utf8')
      } else {
        // Safe pure-functional state mutations
        currentProject = executeCommand(currentProject, step)
      }
    }

    return { project: currentProject, lastOutputPath }
  }

  /**
   * Writes metadata tags to an audio file using FFmpeg.
   */
  public static writeMetadataWithFFmpeg(
    inputPath: string,
    outputPath: string,
    tags: Record<string, string>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Find ffmpeg path
      let resolvedFfmpegPath: string | null = null
      try {
        // Resolve ffmpeg-static path
        resolvedFfmpegPath = require('ffmpeg-static')
      } catch (err) {
        // Fallback: expect ffmpeg to be on system PATH
        resolvedFfmpegPath = 'ffmpeg'
      }

      if (!resolvedFfmpegPath) {
        resolvedFfmpegPath = 'ffmpeg'
      }

      const args = ['-y', '-i', inputPath]
      
      // Map standard tags to FFmpeg metadata
      if (tags.title !== undefined) args.push('-metadata', `title=${tags.title}`)
      if (tags.artist !== undefined) args.push('-metadata', `artist=${tags.artist}`)
      if (tags.album !== undefined) args.push('-metadata', `album=${tags.album}`)
      if (tags.year !== undefined) args.push('-metadata', `date=${tags.year}`)
      if (tags.genre !== undefined) args.push('-metadata', `genre=${tags.genre}`)
      if (tags.comment !== undefined) args.push('-metadata', `comment=${tags.comment}`)
      if (tags.track !== undefined) args.push('-metadata', `track=${tags.track}`)
      
      args.push('-codec', 'copy', outputPath)

      const cp = spawn(resolvedFfmpegPath, args)
      let stderr = ''

      cp.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      cp.on('error', (err) => {
        reject(new Error(`Failed to start FFmpeg: ${err.message}`))
      })

      cp.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg exited with code ${code}. Error: ${stderr}`))
        }
      })
    })
  }
}
