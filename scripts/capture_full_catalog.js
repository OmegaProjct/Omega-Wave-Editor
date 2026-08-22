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
    'get-audio-metadata', 'get-audio-analysis', 'waveform:cancel-trace'
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

  // 1. Main Timeline Workspace
  const img1 = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_1.png'), img1.toPNG())
  console.log('✅ 1/7 Captured assets/screenshot_1.png (Main Multitrack Timeline)')

  // 2. Equalizer & DSP Effects
  await win.webContents.executeJavaScript(`
    if (window.__selectClip) window.__selectClip("reg-1-intro");
    const clipEl = document.querySelector('[data-region-id="reg-1-intro"]');
    if (clipEl) clipEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const eqItem = Array.from(document.querySelectorAll("div, button, span")).find(el => el.textContent === "Equalizer");
    if (eqItem) eqItem.click();
  `)
  await new Promise(r => setTimeout(r, 1200))
  const img2 = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_2.png'), img2.toPNG())
  console.log('✅ 2/7 Captured assets/screenshot_2.png (10-Band Graphic Equalizer & DSP)')

  // 3. VST Store
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal(null);
    const storeBtn = Array.from(document.querySelectorAll("button, div, span")).find(b => b.textContent && b.textContent.includes("VST Store"));
    if (storeBtn) storeBtn.click();
  `)
  await new Promise(r => setTimeout(r, 1200))
  const imgVst = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_vst_store.png'), imgVst.toPNG())
  console.log('✅ 3/7 Captured assets/screenshot_vst_store.png (Curated VST Plugin Store)')

  // 4. Changelog Modal
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal("changelog");
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgChangelog = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_changelog.png'), imgChangelog.toPNG())
  console.log('✅ 4/7 Captured assets/screenshot_changelog.png (In-App Changelog Modal)')

  // 5. Settings Modal
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
  console.log('✅ 5/7 Captured assets/screenshot_settings.png (Appearance Settings)')

  // 6. User Manual Modal
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal("manual");
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgManual = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_manual.png'), imgManual.toPNG())
  console.log('✅ 6/7 Captured assets/screenshot_manual.png (Bilingual User Manual)')

  // 7. Mixdown Export Modal
  await win.webContents.executeJavaScript(`
    if (window.__openScreenshotModal) window.__openScreenshotModal("export");
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgExport = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_export.png'), imgExport.toPNG())
  console.log('✅ 7/7 Captured assets/screenshot_export.png (Mixdown & ID3 Export)')

  console.log('🎉 ALL 7 SCREENSHOTS FULLY UPDATED AND SAVED!')
  app.quit()
})
