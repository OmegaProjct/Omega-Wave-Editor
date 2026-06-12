/**
 * projectIpc.ts
 * Main process IPC handlers for Project save, load, and backup lifecycles.
 */

import { ipcMain, app, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { logger } from '../logger'

// Local helper checks
function isSafePath(filePath: any): boolean {
  if (typeof filePath !== 'string' || filePath.trim() === '') return false
  try {
    const resolved = path.resolve(filePath)
    if (filePath.includes('file://')) return false
    if (filePath.includes('javascript:')) return false
    if (filePath.includes('data:')) return false
    return true
  } catch {
    return false
  }
}

function getDefaultProjPath(): string {
  const appDataDir = app.getPath('userData')
  const settingsPath = path.join(appDataDir, 'settings.json')
  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      if (data && typeof data.projPath === 'string' && data.projPath.trim() !== '') {
        return data.projPath
      }
    }
  } catch (e) {
    logger.warn('System', 'Fehler beim Lesen von projPath aus settings.json', e)
  }
  let docPath = ''
  try {
    docPath = app.getPath('documents')
  } catch (e) {
    docPath = path.join(os.homedir(), 'Documents')
  }
  return path.join(docPath, 'OmegaProjects', 'Omega Wave Editor', 'Projects')
}

let startupFile: string | null = null

export function setStartupFile(filePath: string | null) {
  startupFile = filePath
}

export function registerProjectIpc() {
  ipcMain.handle('show-open-dialog', async (_, options: any) => {
    const opts = (typeof options === 'object' && options !== null) ? { ...options } : {}
    if (!opts.defaultPath) {
      opts.defaultPath = getDefaultProjPath()
    }
    return await dialog.showOpenDialog(opts)
  })

  ipcMain.handle('show-save-dialog', async (_, options: any) => {
    const opts = (typeof options === 'object' && options !== null) ? { ...options } : {}
    if (!opts.defaultPath) {
      opts.defaultPath = getDefaultProjPath()
    }
    return await dialog.showSaveDialog(opts)
  })

  ipcMain.handle('save-project', async (_, filePath: string, data: any) => {
    logger.info('Project', 'Projekt speichern angefordert', { filePath })
    if (!isSafePath(filePath)) {
      logger.warn('Project', 'Speichern abgebrochen: Ungültiger Pfad', { filePath })
      return { success: false, error: 'Ungültiger Pfad' }
    }
    try {
      let targetPath = filePath
      if (!targetPath.endsWith('.owep')) {
        targetPath = targetPath.replace(/\.[a-zA-Z0-9]+$/, '') + '.owep'
      }

      // Convert absolute paths inside data to relative paths
      const projectDir = path.dirname(targetPath)
      if (data && Array.isArray(data.tracks)) {
        data.tracks.forEach((track: any) => {
          if (track && Array.isArray(track.regions)) {
            track.regions.forEach((region: any) => {
              if (region && region.file && region.file.path) {
                const fileAbsPath = region.file.path
                if (path.isAbsolute(fileAbsPath)) {
                  const relativePath = path.relative(projectDir, fileAbsPath)
                  if (!path.isAbsolute(relativePath)) {
                    region.file.path = relativePath
                  }
                }
              }
            })
          }
        })
      }

      await fs.promises.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf-8')
      logger.info('Project', 'Projekt erfolgreich gespeichert', { targetPath })
      return { success: true, filePath: targetPath }
    } catch (err: any) {
      logger.error('Project', 'Fehler beim Speichern des Projekts', { filePath, error: err.message })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('save-project-backup', async (_, filePath: string, data: any) => {
    logger.debug('Project', 'Backup speichern angefordert', { filePath })
    if (!isSafePath(filePath)) {
      logger.warn('Project', 'Backup abgebrochen: Ungültiger Pfad', { filePath })
      return { success: false, error: 'Ungültiger Pfad' }
    }
    try {
      const targetPath = filePath
      if (filePath.includes('Recovery')) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
      }

      const projectDir = path.dirname(targetPath)
      if (data && Array.isArray(data.tracks)) {
        data.tracks.forEach((track: any) => {
          if (track && Array.isArray(track.regions)) {
            track.regions.forEach((region: any) => {
              if (region && region.file && region.file.path) {
                const fileAbsPath = region.file.path
                if (path.isAbsolute(fileAbsPath)) {
                  const relativePath = path.relative(projectDir, fileAbsPath)
                  if (!path.isAbsolute(relativePath)) {
                    region.file.path = relativePath
                  }
                }
              }
            })
          }
        })
      }

      await fs.promises.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf-8')
      logger.debug('Project', 'Backup erfolgreich gespeichert', { targetPath })
      return { success: true }
    } catch (err: any) {
      logger.error('Project', 'Fehler beim Speichern des Backups', { filePath, error: err.message })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('load-project', async (_, filePath: string) => {
    logger.info('Project', 'Projekt laden angefordert', { filePath })
    if (!isSafePath(filePath)) {
      logger.warn('Project', 'Laden abgebrochen: Ungültiger Pfad', { filePath })
      return { success: false, error: 'Ungültiger Pfad' }
    }
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const mainData = JSON.parse(content)

      const projectDir = path.dirname(filePath)
      const resolvePaths = (data: any) => {
        if (data && Array.isArray(data.tracks)) {
          data.tracks.forEach((track: any) => {
            if (track && Array.isArray(track.regions)) {
              track.regions.forEach((region: any) => {
                if (region && region.file && region.file.path) {
                  const filePathInJson = region.file.path
                  if (!path.isAbsolute(filePathInJson)) {
                    region.file.path = path.resolve(projectDir, filePathInJson)
                  }
                }
              })
            }
          })
        }
      }
      resolvePaths(mainData)

      // Recovery check
      const bakPath = filePath + '.bak'
      let hasBackup = false
      let backupData = null
      if (fs.existsSync(bakPath)) {
        try {
          const statMain = fs.statSync(filePath)
          const statBak = fs.statSync(bakPath)
          if (statBak.mtimeMs > statMain.mtimeMs) {
            const bakContent = await fs.promises.readFile(bakPath, 'utf-8')
            backupData = JSON.parse(bakContent)
            resolvePaths(backupData)
            hasBackup = true
          }
        } catch (bakErr) {
          logger.error('Project', 'Fehler beim Lesen der Backup-Datei', { bakPath, error: bakErr })
        }
      }

      logger.info('Project', 'Projekt erfolgreich geladen', { filePath, hasBackup })
      return { success: true, data: mainData, hasBackup, backupData }
    } catch (err: any) {
      logger.error('Project', 'Fehler beim Laden des Projekts', { filePath, error: err.message })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('save-preset', async (_, filePath: string, data: any) => {
    logger.info('Project', 'Preset speichern angefordert', { filePath })
    if (!isSafePath(filePath)) {
      logger.warn('Project', 'Preset-Speichern abgebrochen: Ungültiger Pfad', { filePath })
      return { success: false, error: 'Ungültiger Pfad' }
    }
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      logger.info('Project', 'Preset erfolgreich gespeichert', { filePath })
      return { success: true }
    } catch (err: any) {
      logger.error('Project', 'Fehler beim Speichern des Presets', { filePath, error: err.message })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-startup-file', () => {
    const file = startupFile
    startupFile = null
    return file
  })
}
