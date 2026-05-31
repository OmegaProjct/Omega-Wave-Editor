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

  // Standardmäßige Audio-Unterordner erstellen
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
    vstPaths: [],
    driverType: 'wave',
    bufferCount: 6,
    midiMappings: [],
    midiInputDeviceId: '',
    midiChannel: 0,
    autoScroll: 'Schnell',
    spacebarStops: false,
    autoSave: true,
    autoSaveInterval: 10,
    sampleRate: 48000,
    tracksCount: 32,
    maxUndoSteps: 50,
    showStartScreen: true,
    halfWaveform: false,
    showExportGapWarning: true,
    recentProjects: [],
    keyboardShortcuts: {
      newProject: 'Ctrl+N',
      openProject: 'Ctrl+O',
      saveProject: 'Ctrl+S',
      saveProjectAs: 'Ctrl+Shift+S',
      exportAudio: 'Ctrl+E',
      openSettings: 'Ctrl+P',
      playPause: 'Space',
      undo: 'Ctrl+Z',
      redo: 'Ctrl+Y',
      cut: 'Ctrl+X',
      copy: 'Ctrl+C',
      paste: 'Ctrl+V',
      deleteSelection: 'Delete',
      deleteSelectionAlt: 'Backspace',
      splitAtPlayhead: 'T',
      trimStart: 'Z',
      trimStartAlt: 'C',
      trimEnd: 'U',
      zoomIn: 'Ctrl+Plus',
      zoomOut: 'Ctrl+Minus',
      normalizePeak: 'Alt+N',
      toggleAutomation: 'Alt+K',
      resetEffects: 'Ctrl+Alt+Plus',
      saveEffectsPreset: 'Shift+Plus',
      pasteEffects: 'Shift+Minus'
    }
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

  let startCpuUsage = process.cpuUsage();
  let startTime = process.hrtime();

  function getCpuTotalAndIdle() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += cpu.times[type as keyof typeof cpu.times];
      }
      idle += cpu.times.idle;
    }
    return { idle, total };
  }

  let prevCpus = getCpuTotalAndIdle();

  ipcMain.handle('get-performance-stats', () => {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const systemRamPct = Math.round(((totalMem - freeMem) / totalMem) * 100);
      const processRamBytes = process.memoryUsage().heapUsed;

      const elapCpu = process.cpuUsage(startCpuUsage);
      const elapTime = process.hrtime(startTime);
      startCpuUsage = process.cpuUsage();
      startTime = process.hrtime();

      const elapTimeMs = elapTime[0] * 1000 + elapTime[1] / 1000000;
      const elapCpuMs = (elapCpu.user + elapCpu.system) / 1000;
      const cpuPercent = elapTimeMs > 0 ? Math.min(100, Math.round((elapCpuMs / elapTimeMs) * 100)) : 0;

      // System CPU calculation
      const currentCpus = getCpuTotalAndIdle();
      const idleDiff = currentCpus.idle - prevCpus.idle;
      const totalDiff = currentCpus.total - prevCpus.total;
      prevCpus = currentCpus;

      const systemCpuPct = totalDiff > 0 ? Math.max(0, Math.min(100, Math.round(100 * (1 - (idleDiff / totalDiff))))) : 0;

      return {
        cpuUsage: cpuPercent,
        processRamBytes,
        systemRamPct,
        systemCpuPct
      };
    } catch (err) {
      console.error('Error fetching performance stats:', err);
      return { cpuUsage: 0, processRamBytes: 0, systemRamPct: 0, systemCpuPct: 0 };
    }
  });
}
