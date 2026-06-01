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
  const subDirs = ['Projects', 'Exports', 'Recordings', 'Presets', 'AudioTemp', 'Downloads', 'Locales']
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

  ipcMain.handle('get-locales', () => {
    const localesDir = path.join(documentsDir, 'Locales')
    if (!fs.existsSync(localesDir)) {
      fs.mkdirSync(localesDir, { recursive: true })
    }

    const dePath = path.join(localesDir, 'de.json')
    const enPath = path.join(localesDir, 'en.json')
    const examplePath = path.join(localesDir, 'custom_example.json')

    const deContent = {
      "vst_store": {
        "title": "VST & VSTi Store — Kuratierte Freeware",
        "subtitle": "Laden Sie professionelle, kostenlose Synthesizer und Effekte direkt in Ihr VST-Rack.",
        "sandboxed": "Direkt sandboxed & betriebsbereit",
        "load": "Laden",
        "installed": "Installiert",
        "uninstall": "Deinstallieren",
        "size": "Größe",
        "formats": "Formate",
        "platforms": "Plattformen",
        "manufacturer_site": "Herstellerseite öffnen",
        "activate": "Dieses Plugin aktivieren",
        "features": "Features & Details",
        "tech_specs": "Technische Spezifikationen",
        "disclaimer": "Alle Plugins sind Open-Source oder Freeware, virengeprüft und vollständig digital signiert."
      },
      "settings": {
        "title": "Programmeinstellungen",
        "lang_display_tab": "Sprache & Anzeige",
        "language": "Sprachauswahl",
        "text_scale": "Schriftgröße",
        "text_scale_normal": "Normal (Standard)",
        "text_scale_medium": "Mittel (+10%)",
        "text_scale_large": "Groß (+20%)",
        "text_scale_xlarge": "Sehr groß (+30%)"
      },
      "vst_rack": {
        "title": "VST RACK — DSP SIGNAL CHAIN",
        "subtitle": "Verketten Sie Effekte & Synths. Mappen Sie Regler in Echtzeit über MIDI Learn.",
        "load_placeholder": "Plugin in Rack laden...",
        "add": "Hinzufügen",
        "open_ui": "Interface öffnen",
        "midi_learn": "MIDI Learn",
        "learn": "Lernen",
        "learned": "Gelernt",
        "uninstall_desc": "Der VST Signalweg ist post-cleaning, prä-fader auf den Arranger-Spuren geroutet."
      },
      "menu": {
        "file": "Datei",
        "new_project": "Neues Projekt...",
        "open_project": "Projekt Öffnen...",
        "save_project": "Projekt speichern",
        "save_project_as": "Projekt speichern unter...",
        "export_audio": "Audio exportieren (Mixdown)...",
        "export_arrangement": "Arrangement exportieren (.owea)...",
        "export_layer": "Layer exportieren (.owel)...",
        "settings": "Einstellungen",
        "quit": "Beenden",
        "edit": "Bearbeiten",
        "undo": "Rückgängig",
        "redo": "Wiederherstellen",
        "cut": "Objekte ausschneiden",
        "copy": "Objekte kopieren",
        "paste": "Objekte einfügen",
        "delete": "Objekte löschen",
        "plugins": "Plugins",
        "scan_vst": "VST Plugins laden/scannen...",
        "help": "Hilfe",
        "manual": "Benutzerhandbuch",
        "check_updates": "Auf Updates prüfen...",
        "about": "Über Omega Wave Editor...",
        "support_paypal": "❤️ Projekt unterstützen (PayPal)",
        "vst_scan_finished": "VST Scan abgeschlossen. {{count}} Plugins gefunden:\n\n",
        "checking_updates": "Prüfe auf Updates...\n\nBitte warten...",
        "update_check_error": "Fehler bei der Update-Prüfung:\n{{error}}",
        "up_to_date": "Deine Software ist auf dem neuesten Stand.\n\nInstallierte Version: {{current}}\nNeueste Version: {{latest}}",
        "update_check_error_msg": "Fehler bei der Update-Prüfung: {{message}}",
        "master_effects": "Master-Effekte",
        "effects_active": "Das Effekt-Panel auf der rechten Seite ist bereits aktiv und wendet Effekte in Echtzeit an.",
        "feature_preparing": "Die Funktion \"{{action}}\" wird derzeit vorbereitet."
      }
    }

    const enContent = {
      "vst_store": {
        "title": "VST & VSTi Store — Curated Freeware",
        "subtitle": "Download professional, free synthesizers and effects directly into your VST rack.",
        "sandboxed": "Directly sandboxed & ready to run",
        "load": "Download",
        "installed": "Installed",
        "uninstall": "Uninstall",
        "size": "Size",
        "formats": "Formats",
        "platforms": "Platforms",
        "manufacturer_site": "Open manufacturer site",
        "activate": "Download & activate this plugin",
        "features": "Features & Details",
        "tech_specs": "Technical Specifications",
        "disclaimer": "All plugins are open-source or freeware, virus-checked and fully digitally signed."
      },
      "settings": {
        "title": "Program Settings",
        "lang_display_tab": "Language & Display",
        "language": "Language Selection",
        "text_scale": "Font Size",
        "text_scale_normal": "Normal (Default)",
        "text_scale_medium": "Medium (+10%)",
        "text_scale_large": "Large (+20%)",
        "text_scale_xlarge": "Very Large (+30%)"
      },
      "vst_rack": {
        "title": "VST RACK — DSP SIGNAL CHAIN",
        "subtitle": "Chain effects & synths. Map parameters in real-time via MIDI Learn.",
        "load_placeholder": "Load plugin into rack...",
        "add": "Add Plugin",
        "open_ui": "Open Interface",
        "midi_learn": "MIDI Learn",
        "learn": "Learn",
        "learned": "Mapped",
        "uninstall_desc": "The VST signal path is routed post-cleaning, pre-fader to the arranger tracks."
      },
      "menu": {
        "file": "File",
        "new_project": "New Project...",
        "open_project": "Open Project...",
        "save_project": "Save Project",
        "save_project_as": "Save Project As...",
        "export_audio": "Export Audio (Mixdown)...",
        "export_arrangement": "Export Arrangement (.owea)...",
        "export_layer": "Export Layer (.owel)...",
        "settings": "Settings",
        "quit": "Exit",
        "edit": "Edit",
        "undo": "Undo",
        "redo": "Redo",
        "cut": "Cut Objects",
        "copy": "Copy Objects",
        "paste": "Paste Objects",
        "delete": "Delete Objects",
        "plugins": "Plugins",
        "scan_vst": "Load/Scan VST Plugins...",
        "help": "Help",
        "manual": "User Manual",
        "check_updates": "Check for Updates...",
        "about": "About Omega Wave Editor...",
        "support_paypal": "❤️ Support Project (PayPal)",
        "vst_scan_finished": "VST Scan completed. {{count}} plugins found:\n\n",
        "checking_updates": "Checking for updates...\n\nPlease wait...",
        "update_check_error": "Error during update check:\n{{error}}",
        "up_to_date": "Your software is up to date.\n\nInstalled Version: {{current}}\nLatest Version: {{latest}}",
        "update_check_error_msg": "Error during update check: {{message}}",
        "master_effects": "Master Effects",
        "effects_active": "The effects panel on the right side is already active and applies effects in real time.",
        "feature_preparing": "The feature \"{{action}}\" is currently being prepared."
      }
    }

    const softMerge = (existing: any, defaults: any) => {
      const merged = { ...defaults };
      if (!existing) return merged;
      Object.keys(defaults).forEach(key => {
        if (existing[key] !== undefined) {
          if (typeof existing[key] === 'object' && existing[key] !== null && defaults[key]) {
            merged[key] = { ...defaults[key], ...existing[key] };
          } else {
            merged[key] = existing[key];
          }
        }
      });
      // Preserve any keys existing has but defaults doesn't
      Object.keys(existing).forEach(key => {
        if (merged[key] === undefined) {
          merged[key] = existing[key];
        }
      });
      return merged;
    };

    // Safely soft-merge and write language files
    let currentDe = deContent;
    if (fs.existsSync(dePath)) {
      try {
        const fileContent = fs.readFileSync(dePath, 'utf-8');
        currentDe = softMerge(JSON.parse(fileContent), deContent);
      } catch (err) {
        console.error('Failed to parse existing de.json:', err);
      }
    }
    fs.writeFileSync(dePath, JSON.stringify(currentDe, null, 2), 'utf-8');

    let currentEn = enContent;
    if (fs.existsSync(enPath)) {
      try {
        const fileContent = fs.readFileSync(enPath, 'utf-8');
        currentEn = softMerge(JSON.parse(fileContent), enContent);
      } catch (err) {
        console.error('Failed to parse existing en.json:', err);
      }
    }
    fs.writeFileSync(enPath, JSON.stringify(currentEn, null, 2), 'utf-8');

    if (!fs.existsSync(examplePath)) {
      const exampleContent = {
        "vst_store": {
          "title": "VST & VSTi Store [CUSTOM]",
          "subtitle": "Translate this subtitle into your custom language."
        }
      }
      fs.writeFileSync(examplePath, JSON.stringify(exampleContent, null, 2), 'utf-8')
    }

    // Lesen aller json-Dateien im Locales-Verzeichnis
    const locales: any = {}
    try {
      const files = fs.readdirSync(localesDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const langCode = path.basename(file, '.json')
          const fileContent = fs.readFileSync(path.join(localesDir, file), 'utf-8')
          try {
            locales[langCode] = JSON.parse(fileContent)
          } catch (e) {
            console.error(`Failed to parse locale file: ${file}`, e)
          }
        }
      }
    } catch (err) {
      console.error('Failed to read locales directory:', err)
    }

    return locales
  })

  ipcMain.handle('save-locale', (_, { lang, content }) => {
    try {
      const localesDir = path.join(documentsDir, 'Locales')
      if (!fs.existsSync(localesDir)) {
        fs.mkdirSync(localesDir, { recursive: true })
      }
      const filePath = path.join(localesDir, `${lang}.json`)
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}

