/**
 * systemIpc.ts
 * Main process IPC handlers for system functions, updates, explorer navigation,
 * recording saving, and path validations.
 */

import { ipcMain, shell, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

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

function isNewerVersion(current: string, latest: string): boolean {
  if (!current || !latest) return false
  const parse = (v: string) => {
    const parts = v.replace(/^v/, '').split('.').map(Number)
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
  }
  const [currMajor, currMinor, currPatch] = parse(current)
  const [lateMajor, lateMinor, latePatch] = parse(latest)

  if (lateMajor > currMajor) return true
  if (lateMajor < currMajor) return false

  if (lateMinor > currMinor) return true
  if (lateMinor < currMinor) return false

  return latePatch > currPatch
}

export function registerSystemIpc() {
  ipcMain.handle('open-external', (_, url: string) => {
    if (typeof url !== 'string') return
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url)
      } else {
        console.warn(`Blocked attempt to open insecure external URL: ${url}`)
      }
    } catch (e) {
      console.error(`Invalid URL attempt: ${url}`, e)
    }
  })

  ipcMain.handle('open-path', async (_, dirPath: string) => {
    if (!isSafePath(dirPath)) return { success: false, error: 'Ungültiger Pfad' }
    try {
      const resolved = path.resolve(dirPath)
      if (!fs.existsSync(resolved)) {
        return { success: false, error: 'Pfad existiert nicht' }
      }
      const err = await shell.openPath(resolved)
      if (err) {
        return { success: false, error: err }
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('get-home-dir', () => {
    try {
      return os.homedir()
    } catch (e) {
      try {
        return app.getPath('home')
      } catch (err) {
        return app.getPath('desktop')
      }
    }
  })

  ipcMain.handle('get-system-path', (_, name: string) => {
    if (typeof name !== 'string') return ''
    try {
      if (name === 'computer') {
        return process.platform === 'win32' ? 'C:\\' : '/'
      }
      return app.getPath(name as any)
    } catch (e) {
      console.error(`Failed to get-system-path for ${name}:`, e)
      const home = os.homedir()
      if (name === 'desktop') return path.join(home, 'Desktop')
      if (name === 'documents') return path.join(home, 'Documents')
      if (name === 'downloads') return path.join(home, 'Downloads')
      if (name === 'music') return path.join(home, 'Music')
      return home
    }
  })

  ipcMain.handle('read-dir', async (_, dirPath: string) => {
    if (dirPath === 'computer') {
      const drives: { name: string; path: string; isDirectory: boolean }[] = []
      const driveLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      for (const char of driveLetters) {
        const drivePath = `${char}:\\`
        try {
          if (fs.existsSync(drivePath)) {
            drives.push({
              name: `Lokaler Datenträger (${char}:)`,
              path: drivePath,
              isDirectory: true
            })
          }
        } catch {
          // Ignore non-existent or unreadable drives
        }
      }
      return drives
    }
    if (!isSafePath(dirPath)) return []
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
      const visibleEntries = entries.filter(e => !e.name.startsWith('.'))
      const files = visibleEntries.map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory()
      }))
      return files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
    } catch (error) {
      console.error('Error reading dir:', error)
      return []
    }
  })

  ipcMain.handle('save-recording', async (_, outputPath: string, arrayBuffer: ArrayBuffer) => {
    try {
      const dir = path.dirname(outputPath)
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer))
      console.log(`Real recording saved to: ${outputPath}`)
      return { path: outputPath, success: true }
    } catch (err: any) {
      console.error('Failed to save recording:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('check-for-updates', async () => {
    const currentVersion = app.getVersion()
    try {
      const response = await fetch('https://api.github.com/repos/OmegaProjct/Omega-Wave-Editor/releases/latest', {
        headers: {
          'User-Agent': 'Omega-Wave-Editor-Updater'
        }
      })

      if (response.status === 404) {
        return {
          available: false,
          currentVersion,
          latestVersion: currentVersion,
          url: 'https://github.com/OmegaProjct/Omega-Wave-Editor/releases',
          body: ''
        }
      }

      if (!response.ok) {
        throw new Error(`GitHub API meldet Status ${response.status}`)
      }

      const data: any = await response.json()
      const latestVersion = data.tag_name || ''
      const updateAvailable = isNewerVersion(currentVersion, latestVersion)

      return {
        available: updateAvailable,
        currentVersion,
        latestVersion,
        url: data.html_url || 'https://github.com/OmegaProjct/Omega-Wave-Editor/releases',
        body: data.body || ''
      }
    } catch (err: any) {
      console.error('Update-Prüfung fehlgeschlagen:', err)
      return {
        error: err.message,
        currentVersion,
        available: false
      }
    }
  })

  ipcMain.handle('get-disk-space', async (_, dirPath: string) => {
    if (!isSafePath(dirPath)) return { success: false, error: 'Ungültiger Pfad' }
    try {
      if (typeof fs.promises.statfs === 'function') {
        const stats = await fs.promises.statfs(dirPath)
        const freeBytes = stats.bavail * stats.bsize
        return { success: true, freeBytes }
      }
    } catch (e) {
      console.warn('statfs not supported or failed, trying fallback:', e)
    }
    if (process.platform === 'win32') {
      try {
        const drive = path.parse(dirPath).root.replace('\\', '')
        const { execSync } = require('child_process')
        const output = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace`).toString()
        const num = output.replace(/\D/g, '')
        if (num) {
          return { success: true, freeBytes: parseInt(num, 10) }
        }
      } catch (err) {
        console.error('Fallback disk space query failed:', err)
      }
    }
    return { success: true, freeBytes: 500 * 1024 * 1024 * 1024 }
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
  
  ipcMain.handle('file-exists', (_, filePath: string) => {
    if (!isSafePath(filePath)) return false
    try {
      return fs.existsSync(path.resolve(filePath))
    } catch {
      return false
    }
  })
}
