import { app, BrowserWindow, protocol, ipcMain, session, Menu, screen } from 'electron'
import * as fs from 'fs'
import { dirname, join } from 'path'
import { setupIpc, setStartupFile } from './ipc'
import { setupSettingsIpc } from './settingsIpc'
import { setupUpdateDownloader } from './updateDownloader'
import { setupVstBridgeIpc } from './ipc/vstBridgeIpc'
import { logger } from './logger'

// Set custom AppData folder structure: AppData/Roaming/OmegaProjects/Omega Wave Editor
const appDataPath = app.getPath('appData')
const customUserDataPath = join(appDataPath, 'OmegaProjects', 'Omega Wave Editor')
app.setPath('userData', customUserDataPath)

// Logger initialisieren und unhandled Exceptions abfangen
logger.init()

process.on('uncaughtException', (err) => {
  logger.error('System', 'Uncaught Exception im Hauptprozess', err)
})
process.on('unhandledRejection', (reason) => {
  logger.error('System', 'Unhandled Rejection im Hauptprozess', reason)
})

logger.info('System', 'Hauptprozess startet', { args: process.argv })

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

// Headless MCP mode check
if (process.argv.includes('--mcp')) {
  import('./mcpServer').then(({ startMcpServer }) => {
    startMcpServer()
  })
} else {

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
const popoutBoundsPath = join(app.getPath('userData'), 'popout-window-bounds.json')
const snapEnabledPopoutNames = new Set(['panel-file-explorer', 'panel-effects', 'panel-timeline'])
const panelPopoutWindows = new Map<string, BrowserWindow>()
const snapInProgressWindows = new WeakSet<BrowserWindow>()
const WINDOW_SNAP_THRESHOLD = 18
const DEFAULT_MAIN_WINDOW_WIDTH = 1280
const DEFAULT_MAIN_WINDOW_HEIGHT = 720
const MIN_VISIBLE_WINDOW_OVERLAP = 100

function loadPopoutBounds(): Record<string, Electron.Rectangle> {
  try {
    if (!fs.existsSync(popoutBoundsPath)) return {}
    return JSON.parse(fs.readFileSync(popoutBoundsPath, 'utf-8'))
  } catch (error) {
    logger.error('Window', 'Gespeicherte Pop-out-Fensterpositionen konnten nicht geladen werden', error)
    return {}
  }
}

function savePopoutBounds(boundsByName: Record<string, Electron.Rectangle>) {
  try {
    fs.mkdirSync(dirname(popoutBoundsPath), { recursive: true })
    fs.writeFileSync(popoutBoundsPath, JSON.stringify(boundsByName, null, 2))
  } catch (error) {
    logger.error('Window', 'Pop-out-Fensterpositionen konnten nicht gespeichert werden', error)
  }
}

function getOverlappingRangeLength(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
}

function applySnapToWindow(win: BrowserWindow, name: string) {
  if (snapInProgressWindows.has(win)) return

  const originalBounds = win.getBounds()
  let snappedBounds = { ...originalBounds }
  const candidates: Electron.Rectangle[] = []

  if (mainWindow && !mainWindow.isDestroyed()) {
    candidates.push(mainWindow.getBounds())
  }

  panelPopoutWindows.forEach((otherWindow, otherName) => {
    if (otherName === name || otherWindow.isDestroyed()) return
    candidates.push(otherWindow.getBounds())
  })

  for (const candidate of candidates) {
    const verticalOverlap = getOverlappingRangeLength(
      originalBounds.y,
      originalBounds.y + originalBounds.height,
      candidate.y,
      candidate.y + candidate.height
    )
    const horizontalOverlap = getOverlappingRangeLength(
      originalBounds.x,
      originalBounds.x + originalBounds.width,
      candidate.x,
      candidate.x + candidate.width
    )

    if (verticalOverlap > 48) {
      if (Math.abs(originalBounds.x - candidate.x) <= WINDOW_SNAP_THRESHOLD) {
        snappedBounds.x = candidate.x
      } else if (Math.abs(originalBounds.x - (candidate.x + candidate.width)) <= WINDOW_SNAP_THRESHOLD) {
        snappedBounds.x = candidate.x + candidate.width
      } else if (Math.abs((originalBounds.x + originalBounds.width) - candidate.x) <= WINDOW_SNAP_THRESHOLD) {
        snappedBounds.x = candidate.x - originalBounds.width
      } else if (Math.abs((originalBounds.x + originalBounds.width) - (candidate.x + candidate.width)) <= WINDOW_SNAP_THRESHOLD) {
        snappedBounds.x = candidate.x + candidate.width - originalBounds.width
      }
    }

    if (horizontalOverlap > 64) {
      if (Math.abs(originalBounds.y - candidate.y) <= WINDOW_SNAP_THRESHOLD) {
        snappedBounds.y = candidate.y
      } else if (Math.abs(originalBounds.y - (candidate.y + candidate.height)) <= WINDOW_SNAP_THRESHOLD) {
        snappedBounds.y = candidate.y + candidate.height
      } else if (Math.abs((originalBounds.y + originalBounds.height) - candidate.y) <= WINDOW_SNAP_THRESHOLD) {
        snappedBounds.y = candidate.y - originalBounds.height
      } else if (Math.abs((originalBounds.y + originalBounds.height) - (candidate.y + candidate.height)) <= WINDOW_SNAP_THRESHOLD) {
        snappedBounds.y = candidate.y + candidate.height - originalBounds.height
      }
    }
  }

  const display = screen.getDisplayMatching(originalBounds)
  const workArea = display.workArea
  if (Math.abs(originalBounds.x - workArea.x) <= WINDOW_SNAP_THRESHOLD) {
    snappedBounds.x = workArea.x
  } else if (Math.abs((originalBounds.x + originalBounds.width) - (workArea.x + workArea.width)) <= WINDOW_SNAP_THRESHOLD) {
    snappedBounds.x = workArea.x + workArea.width - originalBounds.width
  }

  if (Math.abs(originalBounds.y - workArea.y) <= WINDOW_SNAP_THRESHOLD) {
    snappedBounds.y = workArea.y
  } else if (Math.abs((originalBounds.y + originalBounds.height) - (workArea.y + workArea.height)) <= WINDOW_SNAP_THRESHOLD) {
    snappedBounds.y = workArea.y + workArea.height - originalBounds.height
  }

  if (snappedBounds.x !== originalBounds.x || snappedBounds.y !== originalBounds.y) {
    snapInProgressWindows.add(win)
    win.setBounds(snappedBounds)
    setTimeout(() => snapInProgressWindows.delete(win), 0)
  }
}

function getDefaultPopoutBounds(name: string, width: number, height: number): Partial<Electron.Rectangle> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { width, height }
  }

  const mainBounds = mainWindow.getBounds()
  const display = screen.getDisplayMatching(mainBounds)
  const workArea = display.workArea
  let bounds: Partial<Electron.Rectangle> = { width, height }

  if (name === 'panel-file-explorer') {
    bounds = {
      width,
      height,
      x: Math.max(workArea.x, mainBounds.x - width - 8),
      y: mainBounds.y
    }
  } else if (name === 'panel-effects') {
    bounds = {
      width,
      height,
      x: Math.min(workArea.x + workArea.width - width, mainBounds.x + mainBounds.width + 8),
      y: mainBounds.y
    }
  } else if (name === 'panel-timeline') {
    bounds = {
      width,
      height,
      x: Math.max(workArea.x, Math.min(mainBounds.x, workArea.x + workArea.width - width)),
      y: Math.min(workArea.y + workArea.height - height, mainBounds.y + mainBounds.height + 8)
    }
  }

  return bounds
}

function sanitizeWindowBounds(
  requestedBounds: Partial<Electron.Rectangle> | null | undefined,
  fallbackBounds: Electron.Rectangle
): Electron.Rectangle {
  const fallbackDisplay = screen.getDisplayMatching(fallbackBounds)
  const targetDisplay = isRectMeaningful(requestedBounds)
    ? (findBestDisplayForBounds(requestedBounds) || fallbackDisplay)
    : fallbackDisplay
  const workArea = targetDisplay.workArea

  const width = Math.max(320, Math.min(requestedBounds?.width ?? fallbackBounds.width, workArea.width))
  const height = Math.max(220, Math.min(requestedBounds?.height ?? fallbackBounds.height, workArea.height))

  const requestedX = requestedBounds?.x
  const requestedY = requestedBounds?.y
  const hasRequestedPosition = typeof requestedX === 'number' && typeof requestedY === 'number'

  const centeredX = Math.round(workArea.x + (workArea.width - width) / 2)
  const centeredY = Math.round(workArea.y + (workArea.height - height) / 2)

  const x = hasRequestedPosition
    ? Math.min(Math.max(requestedX, workArea.x), workArea.x + workArea.width - width)
    : centeredX
  const y = hasRequestedPosition
    ? Math.min(Math.max(requestedY, workArea.y), workArea.y + workArea.height - height)
    : centeredY

  return { x, y, width, height }
}

function getDefaultMainWindowBounds(): Electron.Rectangle {
  const display = screen.getPrimaryDisplay()
  const workArea = display.workArea
  const width = Math.min(DEFAULT_MAIN_WINDOW_WIDTH, workArea.width)
  const height = Math.min(DEFAULT_MAIN_WINDOW_HEIGHT, workArea.height)

  return {
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2)
  }
}

function isRectMeaningful(rect: Partial<Electron.Rectangle> | null | undefined): rect is Electron.Rectangle {
  return !!rect
    && typeof rect.x === 'number'
    && typeof rect.y === 'number'
    && typeof rect.width === 'number'
    && typeof rect.height === 'number'
    && rect.width > 0
    && rect.height > 0
}

function getVisibleOverlapArea(bounds: Electron.Rectangle, workArea: Electron.Rectangle): number {
  const overlapWidth = getOverlappingRangeLength(
    bounds.x,
    bounds.x + bounds.width,
    workArea.x,
    workArea.x + workArea.width
  )
  const overlapHeight = getOverlappingRangeLength(
    bounds.y,
    bounds.y + bounds.height,
    workArea.y,
    workArea.y + workArea.height
  )
  return overlapWidth * overlapHeight
}

function findBestDisplayForBounds(bounds: Electron.Rectangle): Electron.Display | null {
  const displays = screen.getAllDisplays()
  let bestDisplay: Electron.Display | null = null
  let bestOverlap = 0

  for (const display of displays) {
    const overlap = getVisibleOverlapArea(bounds, display.workArea)
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestDisplay = display
    }
  }

  if (bestDisplay && bestOverlap >= MIN_VISIBLE_WINDOW_OVERLAP * MIN_VISIBLE_WINDOW_OVERLAP) {
    return bestDisplay
  }

  return null
}

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
  logger.info('System', 'Erstelle Hauptfenster...')
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
    logger.info('System', 'Hauptfenster bereit zur Anzeige.')
    mainWindow?.show()
    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools()
    }
  })

  // Intercept window close to check for unsaved changes in frontend
  mainWindow.on('close', (e) => {
    logger.info('System', 'Schließanforderung für Hauptfenster erhalten.')
    if (!forceQuit) {
      e.preventDefault()
      mainWindow?.webContents.send('window-close-request')
    }
  })

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['debug', 'info', 'warn', 'error'] as const
    const lvl = (level >= 0 && level < levels.length) ? levels[level] : 'info'
    logger.write(lvl, 'Renderer-Console', `${message} (${sourceId}:${line})`)
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
    // Disable default menu bar (prevents Alt key from showing/focusing it)
    Menu.setApplicationMenu(null)

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
    setupVstBridgeIpc()

    // Register COOP/COEP headers for SharedArrayBuffer support
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Cross-Origin-Opener-Policy': ['same-origin'],
          'Cross-Origin-Embedder-Policy': ['require-corp']
        }
      })
    })

    createWindow()

    // Initialize the auto updater downloader with our main window reference
    if (mainWindow) {
      setupUpdateDownloader(mainWindow)
    }

    let exportWindow: BrowserWindow | null = null
    let progressWindow: BrowserWindow | null = null
    let currentTracksData: any = null

    ipcMain.handle('get-export-tracks', () => {
      return currentTracksData
    })

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
        height: 940,
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

    // Open Popout Modal Dialog Window (Settings, About, Manual, Update)
    ipcMain.on('open-popout-window', (event, { name, width, height, title }) => {
      const existingWin = panelPopoutWindows.get(name)
      if (existingWin && !existingWin.isDestroyed()) {
        existingWin.focus()
        return
      }

      const savedBoundsByName = loadPopoutBounds()
      const savedBounds = savedBoundsByName[name]
      const fallbackBounds = getDefaultPopoutBounds(name, width || 800, height || 700)
      const resolvedBounds = sanitizeWindowBounds(savedBounds || fallbackBounds, {
        x: typeof fallbackBounds.x === 'number' ? fallbackBounds.x : getDefaultMainWindowBounds().x,
        y: typeof fallbackBounds.y === 'number' ? fallbackBounds.y : getDefaultMainWindowBounds().y,
        width: typeof fallbackBounds.width === 'number' ? fallbackBounds.width : (width || 800),
        height: typeof fallbackBounds.height === 'number' ? fallbackBounds.height : (height || 700)
      })
      // Update-Fenster bekommt keinen nativen Titelbalken (frame: false),
      // da der React-Modal seinen eigenen Schließen-Button mitbringt.
      const useFrameless = name === 'update'
      let win = new BrowserWindow({
        width: resolvedBounds.width,
        height: resolvedBounds.height,
        x: resolvedBounds.x,
        y: resolvedBounds.y,
        parent: mainWindow || undefined,
        modal: false,
        resizable: true,
        minimizable: false,
        autoHideMenuBar: true,
        frame: !useFrameless,
        title: title || 'Omega Wave Editor',
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false,
          webSecurity: true
        }
      })

      const persistBounds = () => {
        const nextBoundsByName = loadPopoutBounds()
        nextBoundsByName[name] = win.getBounds()
        savePopoutBounds(nextBoundsByName)
      }

      win.on('resize', persistBounds)
      win.on('move', () => {
        if (snapEnabledPopoutNames.has(name)) {
          applySnapToWindow(win, name)
        }
        persistBounds()
      })
      win.on('close', persistBounds)
      win.on('closed', () => {
        if (panelPopoutWindows.get(name) === win) {
          panelPopoutWindows.delete(name)
        }
      })

      if (snapEnabledPopoutNames.has(name)) {
        panelPopoutWindows.set(name, win)
      }

      if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
        win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?window=${name}`)
      } else {
        win.loadFile(join(__dirname, '../renderer/index.html'), { query: { window: name } })
      }
    })

    ipcMain.handle('get-popout-bounds', () => {
      return loadPopoutBounds()
    })

    ipcMain.handle('set-popout-bounds', (event, bounds: Record<string, Electron.Rectangle>) => {
      const currentBounds = loadPopoutBounds()
      const nextBounds = { ...currentBounds, ...bounds }
      savePopoutBounds(nextBounds)

      for (const [name, rect] of Object.entries(bounds)) {
        const win = panelPopoutWindows.get(name)
        if (win && !win.isDestroyed() && rect) {
          const fallbackBounds = getDefaultPopoutBounds(name, rect.width, rect.height)
          const sanitizedBounds = sanitizeWindowBounds(rect, {
            x: typeof fallbackBounds.x === 'number' ? fallbackBounds.x : getDefaultMainWindowBounds().x,
            y: typeof fallbackBounds.y === 'number' ? fallbackBounds.y : getDefaultMainWindowBounds().y,
            width: typeof fallbackBounds.width === 'number' ? fallbackBounds.width : rect.width,
            height: typeof fallbackBounds.height === 'number' ? fallbackBounds.height : rect.height
          })
          win.setBounds(sanitizedBounds)
        }
      }
    })

    ipcMain.handle('get-main-window-bounds', () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return null
      }
      return mainWindow.getBounds()
    })

    ipcMain.handle('get-default-main-window-bounds', () => {
      return getDefaultMainWindowBounds()
    })

    ipcMain.handle('set-main-window-bounds', (event, bounds: Electron.Rectangle) => {
      if (!mainWindow || mainWindow.isDestroyed() || !bounds) {
        return
      }
      const sanitizedBounds = sanitizeWindowBounds(bounds, getDefaultMainWindowBounds())
      mainWindow.setBounds(sanitizedBounds)
    })

    // Forward start-offline-export command from Export Dialog to Main DAW Editor Window
    ipcMain.on('update-export-settings', (event, settings) => {
      if (currentTracksData) {
        currentTracksData.exportSettings = settings
      }
      if (mainWindow) {
        mainWindow.webContents.send('export-settings-updated', settings)
      }
    })

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
        mainWindow.webContents.send('start-offline-render', {
          ...settings,
          tracks: currentTracksData ? currentTracksData.tracks : [],
          selection: currentTracksData ? currentTracksData.selection : null
        })
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

    ipcMain.on('seek-timeline', (event, position) => {
      if (mainWindow) {
        mainWindow.webContents.send('seek-timeline', position)
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
}


