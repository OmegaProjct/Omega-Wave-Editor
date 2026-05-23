import { app, BrowserWindow, protocol, ipcMain } from 'electron'
import { join } from 'path'
import { setupIpc, setStartupFile } from './ipc'
import { setupSettingsIpc } from './settingsIpc'
import { setupUpdateDownloader } from './updateDownloader'

// Set custom AppData folder structure: AppData/Roaming/OmegaProjects/Omega Wave Editor
const appDataPath = app.getPath('appData')
const customUserDataPath = join(appDataPath, 'OmegaProjects', 'Omega Wave Editor')
app.setPath('userData', customUserDataPath)

// Helper to find .owep files in command arguments
function findProjectFile(args: string[]): string | null {
  for (const arg of args) {
    if (arg.endsWith('.owep')) {
      try {
        return join(arg)
      } catch {
        return arg
      }
    }
  }
  return null
}

// Implement Single-Instance Lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

// Register custom protocol for local files
protocol.registerSchemesAsPrivileged([
  { scheme: 'atom', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
])

let mainWindow: BrowserWindow | null = null
let forceQuit = false

async function installDevTools(): Promise<void> {
  if (!app.isPackaged) {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = await import('electron-devtools-installer')
    try {
      const name = await installExtension(REACT_DEVELOPER_TOOLS)
      console.log(`Added Extension: ${name}`)
    } catch (err) {
      console.log('An error occurred while installing extension: ', err)
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    icon: join(app.getAppPath(), 'assets', 'app_icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true // Hardened to true; local media is loaded securely via atom:// protocol
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools()
    }
  })

  // Intercept window close to check for unsaved changes in frontend
  mainWindow.on('close', (e) => {
    if (!forceQuit) {
      e.preventDefault()
      mainWindow?.webContents.send('window-close-request')
    }
  })

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message} (${sourceId}:${line})`)
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

if (gotTheLock) {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      const filePath = findProjectFile(commandLine)
      if (filePath) {
        mainWindow.webContents.send('open-project-from-association', filePath)
      }
    }
  })

  app.whenReady().then(async () => {
    // Scan initial process arguments for .owep association file
    const initialFile = findProjectFile(process.argv)
    if (initialFile) {
      setStartupFile(initialFile)
    }

    // Register the atom:// handler
    protocol.registerFileProtocol('atom', (request, callback) => {
      let url = request.url.replace(/^atom:\/\//, '')
      // Wenn der Pfad mit einem Laufwerksbuchstaben ohne Doppelpunkt anfängt (z.B. "C/" oder "C\"), fügen wir den Doppelpunkt ein
      if (/^[a-zA-Z]\//.test(url)) {
        url = url[0] + ':/' + url.slice(2)
      } else if (/^[a-zA-Z]\\/.test(url)) {
        url = url[0] + ':\\' + url.slice(2)
      }
      // Falls ein führender Slash vor dem Laufwerksbuchstaben existiert, z.B. /C:/ oder /C/
      if (/^\/[a-zA-Z]\//.test(url)) {
        url = url[1] + ':/' + url.slice(3)
      } else if (/^\/[a-zA-Z]:\//.test(url)) {
        url = url[1] + ':/' + url.slice(4)
      }
      const decodedPath = decodeURIComponent(url)
      try {
        return callback(decodedPath)
      } catch (error) {
        console.error('Failed to handle protocol', error)
      }
    })

    await installDevTools()
    setupIpc()
    setupSettingsIpc()
    createWindow()

    // Initialize the auto updater downloader with our main window reference
    if (mainWindow) {
      setupUpdateDownloader(mainWindow)
    }

    let exportWindow: BrowserWindow | null = null
    let progressWindow: BrowserWindow | null = null
    let currentTracksData: any = null

    // Open Popout Export Settings Window
    ipcMain.on('open-export-settings', (event, tracksData) => {
      currentTracksData = tracksData

      // Pause playback in main editor first
      if (mainWindow) {
        mainWindow.webContents.send('lock-main-window', true)
      }

      if (exportWindow) {
        exportWindow.focus()
        return
      }

      exportWindow = new BrowserWindow({
        width: 780,
        height: 660,
        parent: mainWindow || undefined,
        modal: false, // We use custom blur and locking to allow moving it out
        resizable: true,
        minimizable: false,
        autoHideMenuBar: true,
        title: 'Mixdown Export-Einstellungen',
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false,
          webSecurity: true
        }
      })

      exportWindow.on('closed', () => {
        exportWindow = null
        // If progressWindow was not opened, unlock the main window
        if (!progressWindow && mainWindow) {
          mainWindow.webContents.send('lock-main-window', false)
        }
      })

      if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
        exportWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?window=export`)
      } else {
        exportWindow.loadFile(join(__dirname, '../renderer/index.html'), { query: { window: 'export' } })
      }
    })

    // Forward start-offline-export command from Export Dialog to Main DAW Editor Window
    ipcMain.on('start-offline-export', (event, settings) => {
      // 1. Close settings window
      if (exportWindow) {
        exportWindow.close()
        exportWindow = null
      }

      // 2. Open progress window
      if (!progressWindow) {
        progressWindow = new BrowserWindow({
          width: 520,
          height: 360,
          parent: mainWindow || undefined,
          modal: false,
          resizable: false,
          minimizable: false,
          autoHideMenuBar: true,
          title: 'Exportiere Mixdown...',
          webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: true
          }
        })

        progressWindow.on('closed', () => {
          progressWindow = null
          if (mainWindow) {
            mainWindow.webContents.send('lock-main-window', false)
          }
        })

        if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
          progressWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?window=progress`)
        } else {
          progressWindow.loadFile(join(__dirname, '../renderer/index.html'), { query: { window: 'progress' } })
        }
      }

      // 3. Trigger actual offline rendering in the main editor window (which has the tracks state and AudioContext)
      if (mainWindow) {
        mainWindow.webContents.send('start-offline-render', { ...settings, tracks: currentTracksData })
      }
    })

    // Forward rendering progress from DAW Editor Window to Progress Popout Window
    ipcMain.on('update-export-progress', (event, progress, label) => {
      if (progressWindow) {
        progressWindow.webContents.send('export-progress-update', { progress, label })
      }
      // Also update the footer progress in the main window
      if (mainWindow) {
        mainWindow.webContents.send('SET_GLOBAL_PROGRESS', { progress, label })
      }
    })

    // Forward export finished/error status to Progress Popout Window and unlock main editor
    ipcMain.on('notify-export-finished', (event, status, filePath, errorMsg) => {
      if (progressWindow) {
        progressWindow.webContents.send('export-finished-event', { status, filePath, errorMsg })
      }
      if (mainWindow) {
        // Hide global footer progress bar
        mainWindow.webContents.send('SET_GLOBAL_PROGRESS', { progress: null })
      }
    })

    // Close progress window explicitly from client
    ipcMain.on('close-progress-window', () => {
      if (progressWindow) {
        progressWindow.close()
        progressWindow = null
      }
      if (mainWindow) {
        mainWindow.webContents.send('lock-main-window', false)
      }
    })

    // Handle confirmed force exit from renderer
    ipcMain.on('window-close-confirmed', () => {
      forceQuit = true
      app.quit()
    })

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}


