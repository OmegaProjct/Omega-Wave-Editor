import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export function setupSettingsIpc() {
  const settingsPath = path.join(os.homedir(), '.omega-wave-editor-settings.json')

  ipcMain.handle('get-settings', () => {
    try {
      if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      }
    } catch (e) {
      console.error('Could not read settings', e)
    }
    return {
      defaultExplorerPath: os.homedir()
    }
  })

  ipcMain.handle('save-settings', (_, settings: any) => {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
      return true
    } catch (e) {
      console.error('Could not save settings', e)
      return false
    }
  })
}