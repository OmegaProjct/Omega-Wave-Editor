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


