import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export function setupSettingsIpc() {
  let docPath = ''
  try {
    docPath = app.getPath('documents')
  } catch (e) {
    docPath = path.join(os.homedir(), 'Documents')
  }
  
  const documentsDir = path.join(docPath, 'OmegaProjects', 'Omega Wave Editor')
  const appDataDir = app.getPath('userData')
  const settingsPath = path.join(appDataDir, 'settings.json')

  // Migration von altem AppData-Ordner (Roaming/Omega Wave Editor)
  const oldAppDataDir = path.join(app.getPath('appData'), 'Omega Wave Editor')
  const oldSettingsJsonPath = path.join(oldAppDataDir, 'settings.json')
  if (fs.existsSync(oldSettingsJsonPath) && !fs.existsSync(settingsPath)) {
    try {
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
      fs.copyFileSync(oldSettingsJsonPath, settingsPath)
      console.log('Successfully migrated settings.json from old AppData to new OmegaProjects AppData.')
    } catch (err) {
      console.error('Failed to migrate settings from old AppData:', err)
    }
  }

  // MAGIX-orientierte Unterordner erstellen
  const subDirs = ['Projects', 'Exports', 'Recordings', 'Presets', 'AudioTemp', 'Downloads']
  try {
    subDirs.forEach(dir => {
      const fullPath = path.join(documentsDir, dir)
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
      }
    })
  } catch (err) {
    console.error('Could not create standard folders', err)
  }

  const defaults = {
    projPath: path.join(documentsDir, 'Projects'),
    expPath: path.join(documentsDir, 'Exports'),
    recPath: path.join(documentsDir, 'Recordings'),
    dlPath: path.join(documentsDir, 'Downloads'),
    defaultExplorerPath: documentsDir,
    audioDriver: 'Wave-Treiber',
    autoScroll: 'Schnell',
    spacebarStops: false,
    autoSave: true,
    autoSaveInterval: 10,
    sampleRate: 48000,
    tracksCount: 32,
    maxUndoSteps: 50,
    showStartScreen: true,
    recentProjects: []
  }

  ipcMain.handle('get-settings', () => {
    try {
      let currentSettings = { ...defaults }
      
      const oldSettingsPath = path.join(os.homedir(), '.omega-wave-editor-settings.json')
      
      // Migration von altem Pfad im Home-Verzeichnis
      if (fs.existsSync(oldSettingsPath)) {
        try {
          const oldData = JSON.parse(fs.readFileSync(oldSettingsPath, 'utf-8'))
          currentSettings = { ...currentSettings, ...oldData }
          fs.unlinkSync(oldSettingsPath)
          
          fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
          fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2))
          console.log('Settings successfully migrated from home folder to AppData.')
        } catch (err) {
          console.error('Failed to migrate old settings', err)
        }
      } else if (fs.existsSync(settingsPath)) {
        const fileContent = fs.readFileSync(settingsPath, 'utf-8')
        const saved = JSON.parse(fileContent)
        currentSettings = { ...currentSettings, ...saved }
      } else {
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
        fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2))
      }

      // Ensure empty strings/nulls for standard paths are populated with their brand-specific defaults
      const pathKeys = ['projPath', 'expPath', 'recPath', 'dlPath', 'defaultExplorerPath'] as const
      pathKeys.forEach(key => {
        if (!currentSettings[key] || currentSettings[key].trim() === '') {
          currentSettings[key] = defaults[key]
        }
      })

      return currentSettings
    } catch (e) {
      console.error('Could not read settings', e)
    }
    return defaults
  })

  ipcMain.handle('save-settings', (_, settings: any) => {
    try {
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
      return true
    } catch (e) {
      console.error('Could not save settings', e)
      return false
    }
  })
}