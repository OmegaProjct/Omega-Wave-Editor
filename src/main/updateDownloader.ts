import { ipcMain, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'
import { Readable } from 'stream'

let downloadedInstallerPath: string | null = null
let runInstallerOnQuit = false

export function setupUpdateDownloader(mainWindow: BrowserWindow) {
  ipcMain.handle('start-update-download', async (_, { url, latestVersion }) => {
    try {
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

      console.log(`Starting download from ${downloadUrl} to ${tempFilePath}`)

      // 2. Download starten
      const fileResponse = await fetch(downloadUrl)
      if (!fileResponse.ok) {
        throw new Error(`Download-Anfrage fehlgeschlagen: ${fileResponse.statusText}`)
      }

      const contentLength = fileResponse.headers.get('content-length')
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0
      let downloadedBytes = 0

      const fileStream = fs.createWriteStream(tempFilePath)

      if (!fileResponse.body) {
        throw new Error('Response-Body ist leer')
      }

      const reader = Readable.fromWeb(fileResponse.body as any)
      const startTime = Date.now()
      let lastProgressSentTime = 0

      return new Promise((resolve, reject) => {
        reader.on('data', (chunk) => {
          fileStream.write(chunk)
          downloadedBytes += chunk.length
          
          const now = Date.now()
          if (now - lastProgressSentTime > 200 || downloadedBytes === totalBytes) {
            lastProgressSentTime = now
            const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0
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

        reader.on('end', () => {
          fileStream.end()
          downloadedInstallerPath = tempFilePath
          console.log(`Download completed successfully: ${tempFilePath}`)
          mainWindow.webContents.send('download-progress', {
            percent: 100,
            status: 'completed',
            downloadedBytes: totalBytes,
            totalBytes,
            speedBps: 0,
            remainingSeconds: 0
          })
          resolve({ success: true, filePath: tempFilePath })
        })

        reader.on('error', (err) => {
          fileStream.destroy()
          reject(err)
        })
      })

    } catch (error: any) {
      console.error('Fehler beim Download:', error)
      mainWindow.webContents.send('download-progress', { percent: 0, status: 'error', error: error.message })
      return { success: false, error: error.message }
    }
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
