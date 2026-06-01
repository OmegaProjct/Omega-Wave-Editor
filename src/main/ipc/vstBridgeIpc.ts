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
      
      editorWindow = new BrowserWindow({
        width: 650,
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
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // We call openEditor, passing the raw native window pointer buffer (HWND on Windows)
      const nativeHandle = editorWindow.getNativeWindowHandle()
      VstHost.openEditor(nativeHandle)

      editorWindow.once('ready-to-show', () => {
        editorWindow?.show()
      })

      // Show immediately since VST fills it natively
      editorWindow.show()

      editorWindow.on('closed', () => {
        try {
          VstHost.closeEditor()
        } catch (err) {
          console.error('Failed to close VST editor native resources:', err)
        }
        editorWindow = null
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
