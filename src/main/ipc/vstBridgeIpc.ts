import { ipcMain, BrowserWindow, screen } from 'electron'
import { VstHost } from '../vstBridge/VstHostAddon'

let editorWindow: BrowserWindow | null = null

export function setupVstBridgeIpc(): void {
  // Load Plugin
  ipcMain.handle('vst-load-plugin', async (_, dllPath: string) => {
    try {
      console.log('IPC Request: vst-load-plugin for', dllPath)
      return VstHost.loadPlugin(dllPath)
    } catch (err: any) {
      console.error('IPC Error: vst-load-plugin failed:', err)
      throw err
    }
  })

  // Set Shared Array Buffers
  ipcMain.handle('vst-set-shared-buffer', async (_, inputSAB: SharedArrayBuffer, outputSAB: SharedArrayBuffer, midiSAB: SharedArrayBuffer) => {
    try {
      console.log('IPC Request: vst-set-shared-buffer')
      VstHost.setSharedBuffer(inputSAB, outputSAB, midiSAB)
      return { success: true }
    } catch (err: any) {
      console.error('IPC Error: vst-set-shared-buffer failed:', err)
      throw err
    }
  })

  // Start Audio Thread
  ipcMain.handle('vst-start-audio', async (_, sampleRate: number, blockSize: number) => {
    try {
      console.log(`IPC Request: vst-start-audio (sampleRate: ${sampleRate}, blockSize: ${blockSize})`)
      VstHost.startAudioThread(sampleRate, blockSize)
      return { success: true }
    } catch (err: any) {
      console.error('IPC Error: vst-start-audio failed:', err)
      throw err
    }
  })

  // Stop Audio Thread
  ipcMain.handle('vst-stop-audio', async () => {
    try {
      console.log('IPC Request: vst-stop-audio')
      VstHost.stopAudioThread()
      return { success: true }
    } catch (err: any) {
      console.error('IPC Error: vst-stop-audio failed:', err)
      throw err
    }
  })

  // Get Parameters
  ipcMain.handle('vst-get-params', async () => {
    try {
      return VstHost.getParams()
    } catch (err: any) {
      console.error('IPC Error: vst-get-params failed:', err)
      throw err
    }
  })

  // Set Parameter
  ipcMain.handle('vst-set-param', async (_, index: number, value: number) => {
    try {
      VstHost.setParam(index, value)
      return { success: true }
    } catch (err: any) {
      console.error('IPC Error: vst-set-param failed:', err)
      throw err
    }
  })

  // Open Native VST Editor Window
  ipcMain.handle('vst-open-editor', async (event) => {
    try {
      console.log('IPC Request: vst-open-editor')
      
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
        title: 'Plugin Editor',
        autoHideMenuBar: true,
        x: rx,
        y: ry + rh,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // Load a blank page and wait a small duration for Chromium's native widgets to instantiate.
      // This ensures the C++ EnumChildWindows call will successfully find and hide the Chrome widgets.
      await editorWindow.loadURL('about:blank')
      await new Promise(resolve => setTimeout(resolve, 150))

      // We call openEditor, passing the raw native window pointer buffer (HWND on Windows)
      const nativeHandle = editorWindow.getNativeWindowHandle()
      const preferredSize = VstHost.openEditor(nativeHandle)
      
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
          VstHost.resizeEditor(contentBounds.width, contentBounds.height)
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
        try {
          VstHost.closeEditor()
        } catch (err) {
          console.error('Failed to close VST editor native resources:', err)
        }
        editorWindow = null

        // Cleanup magnetic listeners and close React control window as well
        if (senderWindow && !senderWindow.isDestroyed()) {
          senderWindow.off('move', syncFromSender)
          senderWindow.off('resize', syncFromSender)
          senderWindow.close()
        }

        // Notify the renderer that the editor window has been closed
        event.sender.send('vst-editor-closed')
      })

      return { success: true }
    } catch (err: any) {
      console.error('IPC Error: vst-open-editor failed:', err)
      throw err
    }
  })

  // Close Editor Window
  ipcMain.handle('vst-close-editor', async () => {
    try {
      console.log('IPC Request: vst-close-editor')
      if (editorWindow) {
        editorWindow.close()
      }
      return { success: true }
    } catch (err: any) {
      console.error('IPC Error: vst-close-editor failed:', err)
      throw err
    }
  })

  // Unload Plugin
  ipcMain.handle('vst-unload-plugin', async () => {
    try {
      console.log('IPC Request: vst-unload-plugin')
      VstHost.unloadPlugin()
      if (editorWindow) {
        editorWindow.close()
      }
      return { success: true }
    } catch (err: any) {
      console.error('IPC Error: vst-unload-plugin failed:', err)
      throw err
    }
  })
}
