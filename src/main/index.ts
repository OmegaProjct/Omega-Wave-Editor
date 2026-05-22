import { app, BrowserWindow, protocol } from 'electron'
import { join } from 'path'
import { setupIpc } from './ipc'
import { setupSettingsIpc } from './settingsIpc'

// Register custom protocol for local files
protocol.registerSchemesAsPrivileged([
  { scheme: 'atom', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
])

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
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false // Necessary for local file access via custom protocol in some cases
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.webContents.openDevTools()
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

app.whenReady().then(async () => {
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
