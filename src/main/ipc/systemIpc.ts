/**
 * systemIpc.ts
 * Main process IPC handlers for system functions, updates, explorer navigation,
 * recording saving, and path validations.
 */

import { ipcMain, shell, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import * as https from 'https'
import * as http from 'http'
import { VstHost } from '../vstBridge/VstHostAddon'

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

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim()
}

function getPluginDownloadsDir(): string {
  let docPath = ''
  try {
    docPath = app.getPath('documents')
  } catch {
    docPath = path.join(os.homedir(), 'Documents')
  }
  return path.join(docPath, 'OmegaProjects', 'Omega Wave Editor', 'Downloads', 'VST Plugins')
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function getConfiguredDownloadDir(): string {
  try {
    const settingsPath = getSettingsPath()
    if (fs.existsSync(settingsPath)) {
      const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      if (typeof raw?.dlPath === 'string' && raw.dlPath.trim() !== '') {
        return path.join(raw.dlPath, 'VST Plugins')
      }
    }
  } catch (err) {
    console.warn('Could not read configured download path, falling back to default:', err)
  }
  return getPluginDownloadsDir()
}

function uniqueTargetPath(dirPath: string, fileName: string): string {
  const parsed = path.parse(fileName)
  let candidate = path.join(dirPath, fileName)
  let counter = 1

  while (fs.existsSync(candidate)) {
    candidate = path.join(dirPath, `${parsed.name} (${counter})${parsed.ext}`)
    counter += 1
  }

  return candidate
}

function downloadFileToDisk(
  urlStr: string,
  destPath: string,
  redirectCount = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 8) {
      reject(new Error('Zu viele Weiterleitungen beim Download.'))
      return
    }

    const client = urlStr.startsWith('https:') ? https : http
    const request = client.get(urlStr, {
      headers: {
        'User-Agent': 'Omega-Wave-Editor-VST-Store',
        'Accept': '*/*'
      }
    }, (response) => {
      const statusCode = response.statusCode ?? 0
      const location = response.headers.location

      if (statusCode >= 300 && statusCode < 400 && location) {
        response.resume()
        const nextUrl = new URL(location, urlStr).toString()
        downloadFileToDisk(nextUrl, destPath, redirectCount + 1).then(resolve).catch(reject)
        return
      }

      if (statusCode !== 200) {
        response.resume()
        reject(new Error(`Download fehlgeschlagen (HTTP ${statusCode}).`))
        return
      }

      const fileStream = fs.createWriteStream(destPath)
      response.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })

      fileStream.on('error', (err) => {
        fileStream.destroy()
        try {
          fs.unlinkSync(destPath)
        } catch {}
        reject(err)
      })
    })

    request.on('error', (err) => {
      try {
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath)
        }
      } catch {}
      reject(err)
    })
  })
}

export function registerSystemIpc() {
  // Read CHANGELOG.md – first from app resources (packaged), then from project root (dev)
  ipcMain.handle('read-changelog', async () => {
    const candidates = [
      path.join(process.resourcesPath, 'CHANGELOG.md'),
      path.join(app.getAppPath(), 'CHANGELOG.md'),
      path.join(__dirname, '../../CHANGELOG.md'),
      path.join(__dirname, '../../../CHANGELOG.md'),
    ]
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          return fs.readFileSync(p, 'utf-8')
        }
      } catch {}
    }
    return ''
  })

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

  ipcMain.handle('download-plugin-file', async (_, payload: { url: string; fileName?: string; pluginName?: string }) => {
    const url = payload?.url
    if (typeof url !== 'string' || url.trim() === '') {
      return { success: false, error: 'Keine Download-URL angegeben.' }
    }

    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { success: false, error: 'Nur http- und https-Downloads sind erlaubt.' }
      }

      const configuredDir = getConfiguredDownloadDir()
      fs.mkdirSync(configuredDir, { recursive: true })

      const urlFileName = decodeURIComponent(parsed.pathname.split('/').pop() || '')
      const fallbackName = payload?.pluginName
        ? `${payload.pluginName}.download`
        : 'plugin-download.bin'
      const resolvedFileName = sanitizeFileName(payload?.fileName || urlFileName || fallbackName)
      const targetPath = uniqueTargetPath(configuredDir, resolvedFileName)

      await downloadFileToDisk(url, targetPath)

      return {
        success: true,
        filePath: targetPath,
        directory: configuredDir
      }
    } catch (e: any) {
      console.error('Plugin download failed:', e)
      return { success: false, error: e?.message || 'Download fehlgeschlagen.' }
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
      const response = await fetch('https://api.github.com/repos/OmegaProjct/Omega-Wave-Editor/releases', {
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

      const releases: any[] = await response.json()
      if (!Array.isArray(releases) || releases.length === 0) {
        return {
          available: false,
          currentVersion,
          latestVersion: currentVersion,
          url: 'https://github.com/OmegaProjct/Omega-Wave-Editor/releases',
          body: ''
        }
      }

      const latestRelease = releases[0]
      const latestVersion = latestRelease.tag_name || ''
      const updateAvailable = isNewerVersion(currentVersion, latestVersion)

      // Gather intermediate releases between currentVersion and latestVersion (inclusive)
      const intermediateReleases = releases.filter(r => {
        const v = r.tag_name || ''
        return isNewerVersion(currentVersion, v)
      })

      let aggregatedChangelog = ''
      if (intermediateReleases.length > 0) {
        aggregatedChangelog = intermediateReleases.map(r => {
          const dateStr = r.published_at
            ? new Date(r.published_at).toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : ''
          const header = `### Version ${r.tag_name} (${dateStr})\n`
          return `${header}${r.body || 'Keine Details verfügbar.'}\n\n`
        }).join('---\n\n')
      } else {
        aggregatedChangelog = latestRelease.body || 'Keine Details verfügbar.'
      }

      return {
        available: updateAvailable,
        currentVersion,
        latestVersion,
        url: latestRelease.html_url || 'https://github.com/OmegaProjct/Omega-Wave-Editor/releases',
        body: aggregatedChangelog
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

  ipcMain.handle('get-asio-drivers', async () => {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        return resolve([]);
      }
      
      const driversMap = new Map<string, { name: string; description: string }>();
      
      const queryRegistry = (keyPath: string) => {
        return new Promise<void>((subResolve) => {
          exec(`reg query "${keyPath}" /s`, (error, stdout) => {
            if (error || !stdout) {
              return subResolve();
            }
            
            const lines = stdout.split(/\r?\n/);
            let currentDriverName = '';
            let currentDesc = '';
            
            for (let line of lines) {
              line = line.trim();
              if (line.startsWith('HKEY_LOCAL_MACHINE')) {
                const parts = line.split('\\');
                currentDriverName = parts[parts.length - 1] || '';
                currentDesc = currentDriverName;
              } else if (line.startsWith('Description')) {
                const parts = line.split(/\s+REG_SZ\s+/);
                if (parts.length > 1) {
                  currentDesc = parts[1];
                }
              }
              
              if (currentDriverName) {
                driversMap.set(currentDriverName.toLowerCase(), {
                  name: currentDriverName,
                  description: currentDesc || currentDriverName
                });
              }
            }
            subResolve();
          });
        });
      };
      
      Promise.all([
        queryRegistry('HKLM\\Software\\ASIO'),
        queryRegistry('HKLM\\Software\\WOW6432Node\\ASIO')
      ]).then(() => {
        if (driversMap.size === 0) {
          resolve([]);
        } else {
          resolve(Array.from(driversMap.values()));
        }
      });
    });
  });

  ipcMain.on('resize-window', (event, { width, height }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.setSize(width, height, true)
    }
  })

  ipcMain.handle('get-asio-driver-details', async (_, driverName: string) => {
    try {
      return VstHost.getAsioDriverDetails(driverName)
    } catch (err: any) {
      console.error('IPC Error: get-asio-driver-details failed:', err)
      throw err
    }
  })

  ipcMain.handle('open-asio-control-panel', async (_, driverName: string) => {
    try {
      VstHost.openAsioControlPanel(driverName)
      return { success: true }
    } catch (err: any) {
      console.error('IPC Error: open-asio-control-panel failed:', err)
      throw err
    }
  })
}
