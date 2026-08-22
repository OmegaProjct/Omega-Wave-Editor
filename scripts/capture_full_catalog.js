const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const assetsDir = path.join(__dirname, '../assets')
const projectPath = 'C:\\Users\\Dave1\\Desktop\\Suno_Showcase_Demo.owep'

function setupIpcMocks() {
  const noopHandlers = [
    'get-recent-projects', 'get-project-details', 'get-theme-colors',
    'save-theme-colors', 'save-settings', 'get-app-version', 'get-system-info',
    'check-for-updates', 'get-changelog', 'log-message', 'read-file-buffer',
    'get-audio-metadata', 'get-audio-analysis', 'waveform:cancel-trace',
    'get-locales', 'get-system-path', 'scan-vst-plugins', 'write-log',
    'get-startup-file', 'get-home-dir', 'get-performance-stats', 'get-asio-drivers'
  ]
  noopHandlers.forEach(ch => {
    try { ipcMain.handle(ch, async () => ({})) } catch (e) {}
  })

  try {
    ipcMain.handle('load-settings', async () => ({
      waveformColor: '#00E5FF',
      waveformOpacity: 0.9,
      waveformShowRms: true,
      halfWaveform: false,
      theme: 'dark',
      language: 'de'
    }))
  } catch (e) {}

  try {
    ipcMain.handle('get-settings', async () => ({
      waveformColor: '#00E5FF',
      waveformOpacity: 0.9,
      waveformShowRms: true,
      halfWaveform: false,
      theme: 'dark',
      language: 'de',
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
      latency: 128
    }))
  } catch (e) {}

  try {
    ipcMain.handle('get-changelog-content', async () => {
      const p = path.join(__dirname, '../CHANGELOG.md')
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8')
      return '# Changelog\n\n## [0.13.22] - 2026-08-22\n### Neu\n- Mehrspur-Spurfarben'
    })
  } catch (e) {}

  try {
    ipcMain.handle('waveform:get-window', async (_event, filePath, options) => {
      const points = (options && options.requestPixels) ? Math.min(Math.max(options.requestPixels, 100), 2000) : 800
      const minArr = new Float32Array(points)
      const maxArr = new Float32Array(points)
      const rmsArr = new Float32Array(points)

      for (let i = 0; i < points; i++) {
        const t = (i / points) * 20
        const beat = Math.pow(Math.abs(Math.sin(t * 3.14)), 3) * 0.4
        const detail = Math.sin(t * 18.0) * 0.25 + Math.cos(t * 43.0) * 0.15
        const envelope = Math.sin((i / points) * Math.PI) * 0.3 + 0.35
        const amp = Math.min(0.95, (beat + Math.abs(detail)) * envelope + 0.05)
        maxArr[i] = amp
        minArr[i] = -amp * (0.85 + Math.sin(t) * 0.1)
        rmsArr[i] = amp * 0.62
      }

      return {
        mode: 'peaks',
        startTime: (options && options.sourceStart) || 0,
        duration: (options && options.sourceDuration) || 30,
        points: points,
        sampleRate: 48000,
        samplesPerPoint: 256,
        peak: 0.95,
        filePeak: 0.95,
        channels: [
          { min: minArr, max: maxArr, rms: rmsArr },
          { min: minArr, max: maxArr, rms: rmsArr }
        ]
      }
    })
  } catch (e) {}
}

app.whenReady().then(async () => {
  setupIpcMocks()

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  await win.loadFile(path.join(__dirname, '../out/renderer/index.html'))
  console.log('App loaded. Initializing UI and demo project...')
  await new Promise(r => setTimeout(r, 2000))

  await win.webContents.executeJavaScript(`
    const skipBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && (b.textContent.includes("Überspringen") || b.textContent.includes("Projekt erstellen")));
    if (skipBtn) skipBtn.click();
  `)
  await new Promise(r => setTimeout(r, 1000))

  const demoJson = JSON.parse(fs.readFileSync(projectPath, 'utf-8'))
  await win.webContents.executeJavaScript(`
    try {
      if (window.__loadDemoTracks) {
        window.__loadDemoTracks(` + JSON.stringify(demoJson.tracks) + `);
      }
      const evt = new CustomEvent("open-project-data", { detail: ` + JSON.stringify(demoJson) + ` });
      window.dispatchEvent(evt);
    } catch (e) {}
  `)
  await new Promise(r => setTimeout(r, 3000))

  // 1. Main Multitrack Studio Workspace
  const img1 = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_1.png'), img1.toPNG())
  console.log('✅ 1/14 Captured assets/screenshot_1.png (Main Multitrack Timeline)')

  // 2. Equalizer & DSP Effects (select clip)
  await win.webContents.executeJavaScript(`
    if (window.__selectClip) window.__selectClip("reg-1-intro");
    if (window.__setEffectView) window.__setEffectView('eq');
  `)
  await new Promise(r => setTimeout(r, 1000))
  const img2 = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_2.png'), img2.toPNG())
  console.log('✅ 2/14 Captured assets/screenshot_2.png (10-Band Graphic Equalizer & DSP)')

  // 3. Dynamics Compressor Effect View
  await win.webContents.executeJavaScript(`
    if (window.__setEffectView) window.__setEffectView('comp');
  `)
  await new Promise(r => setTimeout(r, 1000))
  const imgComp = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_effects_compressor.png'), imgComp.toPNG())
  console.log('✅ 3/14 Captured assets/screenshot_effects_compressor.png (Dynamics Compressor)')

  // 4. Spatial Reverb & Echo Delay Effect View
  await win.webContents.executeJavaScript(`
    if (window.__setEffectView) window.__setEffectView('reverb');
  `)
  await new Promise(r => setTimeout(r, 1000))
  const imgReverb = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_effects_reverb.png'), imgReverb.toPNG())
  console.log('✅ 4/14 Captured assets/screenshot_effects_reverb.png (Spatial Reverb & Delay)')

  // 5. Audio Cleaning & Restoration Suite
  await win.webContents.executeJavaScript(`
    if (window.__openTimelineModal) window.__openTimelineModal('cleaning');
  `)
  await new Promise(r => setTimeout(r, 1200))
  const imgCleaning = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_cleaning.png'), imgCleaning.toPNG())
  console.log('✅ 5/14 Captured assets/screenshot_cleaning.png (Audio Cleaning & Restoration Suite)')

  // 6. Object Properties & Pitch/Time-Stretching Modal
  await win.webContents.executeJavaScript(`
    if (window.__openTimelineModal) window.__openTimelineModal('properties');
  `)
  await new Promise(r => setTimeout(r, 1200))
  const imgProps = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_object_properties.png'), imgProps.toPNG())
  console.log('✅ 6/14 Captured assets/screenshot_object_properties.png (Object Properties & Pitch/Time)')

  // Close Timeline modals
  await win.webContents.executeJavaScript(`
    if (window.__openTimelineModal) window.__openTimelineModal(null);
  `)
  await new Promise(r => setTimeout(r, 500))

  // 7. VST Store
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal(null);
    if (window.__setEffectMainView) window.__setEffectMainView('vst_store');
  `)
  await new Promise(r => setTimeout(r, 1200))
  const imgVst = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_vst_store.png'), imgVst.toPNG())
  console.log('✅ 7/14 Captured assets/screenshot_vst_store.png (Curated VST Plugin Store)')

  // 8. Settings Modal (Appearance Tab)
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal("settings");
    setTimeout(() => {
      const darstellungTab = Array.from(document.querySelectorAll("button")).find(b => b.textContent && (b.textContent.includes("Darstellung") || b.textContent.includes("Appearance")));
      if (darstellungTab) darstellungTab.click();
    }, 200);
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgSettings = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_settings.png'), imgSettings.toPNG())
  console.log('✅ 8/14 Captured assets/screenshot_settings.png (Appearance Settings)')

  // 9. Toolbar & Symbol Manager Modal
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal("symbols");
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgSymbols = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_toolbar_symbols.png'), imgSymbols.toPNG())
  console.log('✅ 9/14 Captured assets/screenshot_toolbar_symbols.png (Symbol & Toolbar Manager)')

  // 10. In-App Changelog Modal
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal("changelog");
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgChangelog = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_changelog.png'), imgChangelog.toPNG())
  console.log('✅ 10/14 Captured assets/screenshot_changelog.png (In-App Changelog Modal)')

  // 11. User Manual Modal
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal("manual");
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgManual = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_manual.png'), imgManual.toPNG())
  console.log('✅ 11/14 Captured assets/screenshot_manual.png (Bilingual User Manual)')

  // 12. Mixdown Export Modal
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal("export");
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgExport = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_export.png'), imgExport.toPNG())
  console.log('✅ 12/14 Captured assets/screenshot_export.png (Mixdown & ID3 Export)')

  win.close()

  // 13. Standalone Window: Live Audio Recording Studio
  const recWin = new BrowserWindow({
    width: 820,
    height: 620,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false
    }
  })
  await recWin.loadFile(path.join(__dirname, '../out/renderer/index.html'), { query: { window: 'audio-recorder' } })
  await new Promise(r => setTimeout(r, 1500))
  const imgRec = await recWin.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_recording.png'), imgRec.toPNG())
  console.log('✅ 13/14 Captured assets/screenshot_recording.png (Live Audio Recording Studio)')
  recWin.close()

  // 14. Standalone Window: Diagnostic Log Viewer
  const logWin = new BrowserWindow({
    width: 880,
    height: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false
    }
  })
  await logWin.loadFile(path.join(__dirname, '../out/renderer/index.html'), { query: { window: 'logs' } })
  await new Promise(r => setTimeout(r, 1500))
  const imgLog = await logWin.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_log_viewer.png'), imgLog.toPNG())
  console.log('✅ 14/14 Captured assets/screenshot_log_viewer.png (Diagnostic Log Viewer)')
  logWin.close()

  console.log('🎉 ALL 14 HIGH-RESOLUTION SCREENSHOTS FULLY GENERATED AND SAVED!')
  app.quit()
})
