import { ipcMain, BrowserWindow, screen } from 'electron'
import { VstHost } from '../vstBridge/VstHostAddon'
import { logger } from '../logger'

const editorWindows = new Map<number, BrowserWindow>()

export function setupVstBridgeIpc(): void {
  // Load Plugin
  ipcMain.handle('vst-load-plugin', async (_, dllPath: string) => {
    try {
      logger.info('VST-Bridge', 'Lade Plugin angefordert', { dllPath })
      const res = VstHost.loadPlugin(dllPath)
      logger.info('VST-Bridge', 'Plugin erfolgreich geladen', { dllPath, instanceId: res.instanceId })
      return res
    } catch (err: any) {
      logger.error('VST-Bridge', 'Fehler beim Laden des Plugins', { dllPath, error: err.message })
      throw err
    }
  })

  // Set Shared Array Buffers
  ipcMain.handle('vst-set-shared-buffer', async (_, instanceId: number, inputSAB: SharedArrayBuffer, outputSAB: SharedArrayBuffer, midiSAB: SharedArrayBuffer) => {
    try {
      logger.debug('VST-Bridge', 'Setze Shared Array Buffer', { instanceId })
      VstHost.setSharedBuffer(instanceId, inputSAB, outputSAB, midiSAB)
      return { success: true }
    } catch (err: any) {
      logger.error('VST-Bridge', 'Fehler beim Setzen des Shared Array Buffers', { instanceId, error: err.message })
      throw err
    }
  })

  // Start Audio Thread
  ipcMain.handle('vst-start-audio', async (_, instanceId: number, sampleRate: number, blockSize: number) => {
    try {
      logger.info('VST-Bridge', 'Starte Audio-Thread', { instanceId, sampleRate, blockSize })
      VstHost.startAudioThread(instanceId, sampleRate, blockSize)
      return { success: true }
    } catch (err: any) {
      logger.error('VST-Bridge', 'Fehler beim Starten des Audio-Threads', { instanceId, error: err.message })
      throw err
    }
  })

  // Stop Audio Thread
  ipcMain.handle('vst-stop-audio', async (_, instanceId: number) => {
    try {
      logger.info('VST-Bridge', 'Stoppe Audio-Thread', { instanceId })
      VstHost.stopAudioThread(instanceId)
      return { success: true }
    } catch (err: any) {
      logger.error('VST-Bridge', 'Fehler beim Stoppen des Audio-Threads', { instanceId, error: err.message })
      throw err
    }
  })

  // Get Parameters
  ipcMain.handle('vst-get-params', async (_, instanceId: number) => {
    try {
      return VstHost.getParams(instanceId)
    } catch (err: any) {
      console.error(`IPC Error: vst-get-params failed for instance ${instanceId}:`, err)
      throw err
    }
  })

  // Set Parameter
  ipcMain.handle('vst-set-param', async (_, instanceId: number, index: number, value: number) => {
    try {
      VstHost.setParam(instanceId, index, value)
      return { success: true }
    } catch (err: any) {
      console.error(`IPC Error: vst-set-param failed for instance ${instanceId}:`, err)
      throw err
    }
  })

  // Open Native VST Editor Window
  ipcMain.handle('vst-open-editor', async (event, instanceId: number) => {
    try {
      console.log(`IPC Request: vst-open-editor for instance ${instanceId}`)
      
      let editorWindow = editorWindows.get(instanceId)
      if (editorWindow) {
        editorWindow.focus()
        return { success: true }
      }

      const senderWindow = BrowserWindow.fromWebContents(event.sender)
      
      // Auto-resize React window to compact height (110px)
      let originalBounds = { width: 720, height: 110 }
      if (senderWindow) {
        const bounds = senderWindow.getBounds()
        originalBounds = { width: bounds.width, height: bounds.height }
        senderWindow.setSize(bounds.width, 110, false)
      }

      const [rx, ry] = senderWindow ? senderWindow.getPosition() : [100, 100]
      const [rw, rh] = senderWindow ? senderWindow.getSize() : [720, 110]

      editorWindow = new BrowserWindow({
        width: rw,
        height: 450,
        parent: senderWindow || undefined,
        modal: false,
        show: false,
        useContentSize: true,
        resizable: true,
        minimizable: false,
        maximizable: true,
        title: `Plugin Editor (Instance ${instanceId})`,
        autoHideMenuBar: true,
        x: rx,
        y: ry + rh,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      editorWindows.set(instanceId, editorWindow)

      // Load a blank page and wait a small duration for Chromium's native widgets to instantiate.
      // This ensures the C++ EnumChildWindows call will successfully find and hide the Chrome widgets.
      await editorWindow.loadURL('about:blank')
      await new Promise(resolve => setTimeout(resolve, 150))

      // We call openEditor, passing the raw native window pointer buffer (HWND on Windows)
      const nativeHandle = editorWindow.getNativeWindowHandle()
      const preferredSize = VstHost.openEditor(instanceId, nativeHandle)
      
      let preferredWidth = rw
      let preferredHeight = 450
      if (preferredSize) {
        preferredWidth = preferredSize.width
        preferredHeight = preferredSize.height
        console.log(`[IPC] Resizing VST container to preferred bounds: ${preferredWidth}x${preferredHeight}`)
      }
      
      editorWindow.setContentSize(preferredWidth, preferredHeight, false)

      editorWindow.once('ready-to-show', () => {
        editorWindow?.show()
      })

      // Show immediately since VST fills it natively
      editorWindow.show()

      // Intercept Spacebar inside the VST editor popout windows to toggle DAW playback
      const handleBeforeInput = (e: any, input: any) => {
        if (input.key === ' ' && input.type === 'keyDown') {
          console.log('[IPC] Space key detected in VST popout, toggling DAW playback');
          const mainWin = BrowserWindow.getAllWindows().find(w => {
            const url = w.webContents.getURL();
            return !url.includes('window=');
          });
          if (mainWin) {
            mainWin.webContents.send('seek-timeline', -999);
          }
        }
      }

      if (senderWindow) {
        senderWindow.webContents.on('before-input-event', handleBeforeInput)
      }
      editorWindow.webContents.on('before-input-event', handleBeforeInput)

      // 🧲 BIDIRECTIONAL MAGNETIC LOCK (Unified Snapping)
      const syncPositions = () => {
        if (!editorWindow || !senderWindow || editorWindow.isDestroyed() || senderWindow.isDestroyed()) return
        const bounds = editorWindow.getBounds()
        const senderBounds = senderWindow.getBounds()
        senderWindow.setBounds({
          x: bounds.x,
          y: bounds.y - senderBounds.height,
          width: bounds.width,
          height: senderBounds.height
        }, false)
        
        // Smoothly resize the embedded native VST editor child window
        try {
          const contentBounds = editorWindow.getContentBounds()
          VstHost.resizeEditor(instanceId, contentBounds.width, contentBounds.height)
        } catch (err) {
          console.warn('Failed to resize VST native editor:', err)
        }
      }

      const syncFromSender = () => {
        if (!editorWindow || !senderWindow || editorWindow.isDestroyed() || senderWindow.isDestroyed()) return
        const bounds = senderWindow.getBounds()
        editorWindow.setBounds({
          x: bounds.x,
          y: bounds.y + bounds.height,
          width: bounds.width,
          height: editorWindow.getBounds().height
        }, false)
      }

      if (senderWindow) {
        editorWindow.on('move', syncPositions)
        editorWindow.on('resize', syncPositions)
        senderWindow.on('move', syncFromSender)
        senderWindow.on('resize', syncFromSender)
        
        // Close VST editor child if the React controller window is closed by the user
        senderWindow.on('closed', () => {
          if (editorWindow && !editorWindow.isDestroyed()) {
            editorWindow.close()
          }
        })
      }

      editorWindow.on('closed', () => {
        if (senderWindow && !senderWindow.isDestroyed()) {
          senderWindow.webContents.off('before-input-event', handleBeforeInput)
        }
        try {
          VstHost.closeEditor(instanceId)
        } catch (err) {
          console.error(`Failed to close VST editor native resources for instance ${instanceId}:`, err)
        }
        editorWindows.delete(instanceId)

        // Cleanup magnetic listeners and close React control window as well
        if (senderWindow && !senderWindow.isDestroyed()) {
          senderWindow.off('move', syncFromSender)
          senderWindow.off('resize', syncFromSender)
          senderWindow.close()
        }

        // Notify the renderer that the editor window has been closed
        event.sender.send('vst-editor-closed', instanceId)
      })

      return { success: true }
    } catch (err: any) {
      console.error(`IPC Error: vst-open-editor failed for instance ${instanceId}:`, err)
      throw err
    }
  })

  // Close Editor Window
  ipcMain.handle('vst-close-editor', async (_, instanceId: number) => {
    try {
      logger.info('VST-Bridge', 'Schließe VST-Editor angefordert', { instanceId })
      const editorWindow = editorWindows.get(instanceId)
      if (editorWindow) {
        editorWindow.close()
      }
      return { success: true }
    } catch (err: any) {
      logger.error('VST-Bridge', 'Fehler beim Schließen des VST-Editors', { instanceId, error: err.message })
      throw err
    }
  })

  // Unload Plugin
  ipcMain.handle('vst-unload-plugin', async (_, instanceId: number) => {
    try {
      logger.info('VST-Bridge', 'Entlade VST-Plugin angefordert', { instanceId })
      VstHost.unloadPlugin(instanceId)
      const editorWindow = editorWindows.get(instanceId)
      if (editorWindow) {
        editorWindow.close()
      }
      logger.info('VST-Bridge', 'VST-Plugin erfolgreich entladen', { instanceId })
      return { success: true }
    } catch (err: any) {
      logger.error('VST-Bridge', 'Fehler beim Entladen des VST-Plugins', { instanceId, error: err.message })
      throw err
    }
  })
}

