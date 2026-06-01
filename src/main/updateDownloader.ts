import { ipcMain, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'
import { Readable } from 'stream'
import * as https from 'https'
import * as http from 'http'
import { URL } from 'url'

let downloadedInstallerPath: string | null = null
let runInstallerOnQuit = false

let activeDownloadRequest: http.ClientRequest | null = null
let activeFileStream: fs.WriteStream | null = null
let isDownloadCancelled = false

export function setupUpdateDownloader(mainWindow: BrowserWindow) {
  ipcMain.handle('start-update-download', async (_, { url, latestVersion }) => {
    try {
      isDownloadCancelled = false
      
      // 1. Suche nach dem passenden Release-Asset auf GitHub
      // Wir holen die Details über das neueste Release von der GitHub API
      const response = await fetch('https://api.github.com/repos/OmegaProjct/Omega-Wave-Editor/releases/latest', {
        headers: {
          'User-Agent': 'Omega-Wave-Editor-Updater'
        }
      })

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`)
      }

      const data: any = await response.json()
      const assets = data.assets || []
      
      // Filtere das Asset basierend auf dem Betriebssystem
      let targetAsset = null
      const platform = process.platform

      if (platform === 'win32') {
        // Windows: Bevorzuge das Setup (.exe), vermeide Portable
        targetAsset = assets.find((a: any) => a.name.endsWith('.exe') && !a.name.toLowerCase().includes('portable'))
        // Fallback auf irgendetwas mit .exe
        if (!targetAsset) {
          targetAsset = assets.find((a: any) => a.name.endsWith('.exe'))
        }
      } else if (platform === 'darwin') {
        // macOS: Bevorzuge .dmg, ansonsten .zip
        targetAsset = assets.find((a: any) => a.name.endsWith('.dmg'))
        if (!targetAsset) {
          targetAsset = assets.find((a: any) => a.name.endsWith('.zip'))
        }
      } else {
        // Linux: Bevorzuge .AppImage, ansonsten .deb
        targetAsset = assets.find((a: any) => a.name.endsWith('.AppImage'))
        if (!targetAsset) {
          targetAsset = assets.find((a: any) => a.name.endsWith('.deb'))
        }
      }

      if (!targetAsset || !targetAsset.browser_download_url) {
        throw new Error(`Kein passendes Download-Asset für Plattform "${platform}" gefunden.`)
      }

      const downloadUrl = targetAsset.browser_download_url
      const assetName = targetAsset.name
      
      let docPath = ''
      try {
        docPath = app.getPath('documents')
      } catch (e) {
        docPath = path.join(os.homedir(), 'Documents')
      }
      const downloadsDir = path.join(docPath, 'OmegaProjects', 'Omega Wave Editor', 'Downloads')
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true })
      }
      const tempFilePath = path.join(downloadsDir, assetName)
      downloadedInstallerPath = tempFilePath // Set early so cancel can delete it

      console.log(`Starting download from ${downloadUrl} to ${tempFilePath}`)

      // Remove existing 0-byte or corrupt temporary installer files if any
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath) } catch {}
      }

      // 2. Download starten via robuster native https-Methode mit Redirect-Unterstützung
      const startTime = Date.now()
      let lastProgressSentTime = 0

      await downloadFileHttps(downloadUrl, tempFilePath, (percent, downloadedBytes, totalBytes) => {
        if (isDownloadCancelled) {
          throw new Error('Canceled')
        }
        const now = Date.now()
        if (now - lastProgressSentTime > 150 || percent === 100) {
          lastProgressSentTime = now
          const elapsedSeconds = (now - startTime) / 1000
          const speedBps = elapsedSeconds > 0 ? (downloadedBytes / elapsedSeconds) : 0
          const remainingBytes = totalBytes - downloadedBytes
          const remainingSeconds = speedBps > 0 ? (remainingBytes / speedBps) : 0

          mainWindow.webContents.send('download-progress', {
            percent,
            status: 'downloading',
            downloadedBytes,
            totalBytes,
            speedBps,
            remainingSeconds
          })
        }
      })

      if (isDownloadCancelled) {
        throw new Error('Canceled')
      }

      downloadedInstallerPath = tempFilePath
      console.log(`Download completed successfully: ${tempFilePath}`)
      
      mainWindow.webContents.send('download-progress', {
        percent: 100,
        status: 'completed',
        downloadedBytes: 198000000,
        totalBytes: 198000000,
        speedBps: 0,
        remainingSeconds: 0
      })

      return { success: true, filePath: tempFilePath }
    } catch (error: any) {
      console.error('Fehler beim Download:', error)
      const isCanceled = isDownloadCancelled || error.message === 'Canceled'
      mainWindow.webContents.send('download-progress', { 
        percent: 0, 
        status: isCanceled ? 'cancelled' : 'error', 
        error: isCanceled ? 'Canceled' : error.message 
      })
      return { success: false, error: error.message }
    }
  })

  // Cancel Update Download Handler
  ipcMain.handle('cancel-update-download', async () => {
    console.log('IPC Request: cancel-update-download')
    isDownloadCancelled = true
    
    if (activeDownloadRequest) {
      try { activeDownloadRequest.destroy() } catch {}
      activeDownloadRequest = null
    }
    
    if (activeFileStream) {
      try { activeFileStream.destroy() } catch {}
      activeFileStream = null
    }

    // Clean up partial installer file on disk
    if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
      try {
        fs.unlinkSync(downloadedInstallerPath)
        console.log(`Cleaned up cancelled partial installer: ${downloadedInstallerPath}`)
      } catch (err) {
        console.warn('Failed to delete partial installer file during cancel:', err)
      }
    }
    
    downloadedInstallerPath = null
    return { success: true }
  })

  ipcMain.handle('install-update', (_, { installNow }) => {
    if (!downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
      return { success: false, error: 'Kein heruntergeladener Installer gefunden.' }
    }

    if (installNow) {
      // Setze Flag für verzögerte Ausführung beim Beenden und schließe die App ordentlich
      // So werden Speichern-Abfragen erst vollständig abgearbeitet
      runInstallerOnQuit = true
      app.quit()
      return { success: true }
    } else {
      // Auf Beendigung der App warten
      runInstallerOnQuit = true
      return { success: true, deferred: true }
    }
  })

  // Event registrieren für die Ausführung beim regulären Schließen
  app.on('quit', () => {
    if (runInstallerOnQuit && downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
      executeInstaller(downloadedInstallerPath)
    }
  })
}

function executeInstaller(filePath: string) {
  try {
    console.log(`Executing installer: ${filePath}`)
    const isWin = process.platform === 'win32'
    
    if (isWin) {
      // Unter Windows den Installer entkoppelt im Hintergrund starten
      const child = spawn(filePath, [], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
    } else if (process.platform === 'darwin') {
      // macOS: dmg öffnen
      spawn('open', [filePath], {
        detached: true,
        stdio: 'ignore'
      }).unref()
    } else {
      // Linux: AppImage ausführbar machen und starten
      fs.chmodSync(filePath, '755')
      spawn(filePath, [], {
        detached: true,
        stdio: 'ignore'
      }).unref()
    }
  } catch (err) {
    console.error('Fehler beim Ausführen des Installers:', err)
  }
}

function downloadFileHttps(
  urlStr: string,
  destPath: string,
  onProgress: (percent: number, downloaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let fileStream: fs.WriteStream | null = null

    function makeRequest(currentUrl: string) {
      try {
        const parsedUrl = new URL(currentUrl)
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Omega-Wave-Editor-Updater',
            'Accept': 'application/octet-stream'
          }
        }

        const req = https.request(options, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log(`Redirecting to: ${res.headers.location}`)
            makeRequest(res.headers.location)
            return
          }

          if (res.statusCode !== 200) {
            reject(new Error(`Server returned status code ${res.statusCode}: ${res.statusMessage}`))
            return
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
          let downloadedBytes = 0

          fileStream = fs.createWriteStream(destPath)

          res.on('data', (chunk) => {
            if (fileStream) {
              fileStream.write(chunk)
              downloadedBytes += chunk.length
              const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0
              onProgress(percent, downloadedBytes, totalBytes)
            }
          })

          res.on('end', () => {
            if (fileStream) {
              fileStream.end()
              resolve()
            }
          })

          res.on('error', (err) => {
            if (fileStream) {
              fileStream.destroy()
              fs.unlink(destPath, () => {})
            }
            reject(err)
          })
        })

        req.on('error', (err) => {
          reject(err)
        })

        req.end()
      } catch (err) {
        reject(err)
      }
    }

    makeRequest(urlStr)
  })
}

