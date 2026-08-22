const { app, BrowserWindow, protocol, session, ipcMain, screen } = require('electron')
const path = require('path')
const fs = require('fs')

protocol.registerSchemesAsPrivileged([
  { scheme: 'atom', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
])

const projectPath = 'C:\\\\Users\\\\Dave1\\\\Desktop\\\\Suno_Showcase_Demo.owep'
const assetsDir = path.join(__dirname, '../assets')

app.whenReady().then(async () => {
  protocol.registerFileProtocol('atom', (request, callback) => {
    let url = request.url.replace(/^atom:\/\//, '')
    if (/^[a-zA-Z]\//.test(url)) {
      url = url[0] + ':/' + url.slice(2)
    } else if (/^[a-zA-Z]\\/.test(url)) {
      url = url[0] + ':\\' + url.slice(2)
    }
    if (/^\/[a-zA-Z]\//.test(url)) {
      url = url[1] + ':/' + url.slice(3)
    } else if (/^\/[a-zA-Z]:\//.test(url)) {
      url = url[1] + ':/' + url.slice(4)
    }
    callback(decodeURIComponent(url))
  })

  ipcMain.handle('read-changelog', async () => {
    const p = path.join(__dirname, '../CHANGELOG.md')
    return fs.readFileSync(p, 'utf-8')
  })

  ipcMain.handle('get-settings', async () => ({
    waveformColor: '#00E5FF',
    waveformOpacity: 0.85,
    showRmsCore: true,
    halfWaveform: false,
    maxUndoSteps: 50,
    autoSave: true,
    autoSaveInterval: 10,
    keyboardShortcuts: {}
  }))

  ipcMain.handle('load-project', async (_, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { success: true, data: JSON.parse(content) }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('get-audio-files', async () => [])
  ipcMain.handle('get-drives', async () => [{ name: 'C:', path: 'C:\\' }])
  ipcMain.handle('get-system-path', async () => 'C:\\Users\\Dave1\\Documents')
  ipcMain.handle('get-home-dir', async () => 'C:\\Users\\Dave1')
  ipcMain.handle('get-locales', async () => ['de', 'en'])
  ipcMain.handle('get-performance-stats', async () => ({ cpu: 1.2, memory: 184, disk: 'Bereit' }))
  ipcMain.handle('check-for-updates', async () => ({ available: false, currentVersion: '0.13.22' }))
  ipcMain.handle('write-log', async () => ({ success: true }))
  ipcMain.handle('get-startup-file', async () => projectPath)
  ipcMain.handle('scan-vst-plugins', async () => [
    { name: 'Vital Spectral Warp Synthesizer', category: 'Synth / Wavetable', path: 'C:\\Program Files\\Common Files\\VST2\\Vital.dll', vendor: 'Matt Tytel', isInstrument: true, format: 'VST2' },
    { name: 'Surge XT Hybrid Synthesizer', category: 'Synth / Hybrid', path: 'C:\\Program Files\\Common Files\\VST2\\Surge XT.dll', vendor: 'Surge Synth Team', isInstrument: true, format: 'VST2' },
    { name: 'Dexed FM Plugin Synth', category: 'Synth / FM', path: 'C:\\Program Files\\Common Files\\VST2\\Dexed.dll', vendor: 'Digital Suburban', isInstrument: true, format: 'VST2' }
  ])

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

  // Step A: Close Start Center if present
  await win.webContents.executeJavaScript(`
    const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Überspringen') || b.textContent.includes('Projekt erstellen')));
    if (skipBtn) skipBtn.click();
  `)
  await new Promise(r => setTimeout(r, 1000))

  // Step B: Dispatch project loading
  const demoJson = JSON.parse(fs.readFileSync(projectPath, 'utf-8'))
  await win.webContents.executeJavaScript(`
    try {
      const evt = new CustomEvent('open-project-data', { detail: ${JSON.stringify(demoJson)} });
      window.dispatchEvent(evt);
    } catch (e) {}
  `)
  await new Promise(r => setTimeout(r, 3000))

  // 1. Screenshot: Main Timeline Workspace
  const img1 = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_1.png'), img1.toPNG())
  console.log('✅ 1/6 Captured assets/screenshot_1.png (Main Multitrack Timeline)')

  // 2. Open Equalizer & DSP Effects
  await win.webContents.executeJavaScript(`
    const eqItem = Array.from(document.querySelectorAll('div, button, span')).find(el => el.textContent === 'Equalizer');
    if (eqItem) eqItem.click();
  `)
  await new Promise(r => setTimeout(r, 1000))
  const img2 = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_2.png'), img2.toPNG())
  console.log('✅ 2/6 Captured assets/screenshot_2.png (10-Band Graphic Equalizer & DSP)')

  // 3. Open In-App Changelog Modal via Menu
  await win.webContents.executeJavaScript(`
    const helpBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Hilfe');
    if (helpBtn) helpBtn.click();
  `)
  await new Promise(r => setTimeout(r, 400))
  await win.webContents.executeJavaScript(`
    const changelogBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Changelog'));
    if (changelogBtn) changelogBtn.click();
  `)
  await new Promise(r => setTimeout(r, 1500))
  const imgChangelog = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_changelog.png'), imgChangelog.toPNG())
  console.log('✅ 3/6 Captured assets/screenshot_changelog.png (In-App Changelog Modal)')

  // Close Changelog modal
  await win.webContents.executeJavaScript(`
    const closeBtn = document.querySelector('button svg.lucide-x');
    if (closeBtn) closeBtn.closest('button').click();
  `)
  await new Promise(r => setTimeout(r, 600))

  // 4. Open Settings Modal (Appearance Tab)
  await win.webContents.executeJavaScript(`
    const fileBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Datei');
    if (fileBtn) fileBtn.click();
  `)
  await new Promise(r => setTimeout(r, 400))
  await win.webContents.executeJavaScript(`
    const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Einstellungen'));
    if (settingsBtn) settingsBtn.click();
  `)
  await new Promise(r => setTimeout(r, 1000))
  await win.webContents.executeJavaScript(`
    const darstellungTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Darstellung') || b.textContent.includes('Appearance')));
    if (darstellungTab) darstellungTab.click();
  `)
  await new Promise(r => setTimeout(r, 1000))
  const imgSettings = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_settings.png'), imgSettings.toPNG())
  console.log('✅ 4/6 Captured assets/screenshot_settings.png (Appearance Settings)')

  // Close Settings
  await win.webContents.executeJavaScript(`
    const closeBtn = document.querySelector('button svg.lucide-x');
    if (closeBtn) closeBtn.closest('button').click();
  `)
  await new Promise(r => setTimeout(r, 600))

  // 5. Open User Manual Modal
  await win.webContents.executeJavaScript(`
    const helpBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Hilfe');
    if (helpBtn) helpBtn.click();
  `)
  await new Promise(r => setTimeout(r, 400))
  await win.webContents.executeJavaScript(`
    const manualBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Handbuch') || b.textContent.includes('Hilfe')));
    if (manualBtn) manualBtn.click();
  `)
  await new Promise(r => setTimeout(r, 1200))
  const imgManual = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_manual.png'), imgManual.toPNG())
  console.log('✅ 5/6 Captured assets/screenshot_manual.png (Bilingual User Manual)')

  // Close Manual
  await win.webContents.executeJavaScript(`
    const closeBtn = document.querySelector('button svg.lucide-x');
    if (closeBtn) closeBtn.closest('button').click();
  `)
  await new Promise(r => setTimeout(r, 600))

  // 6. Open Mixdown Export Modal
  await win.webContents.executeJavaScript(`
    const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Mixdown Export'));
    if (exportBtn) exportBtn.click();
  `)
  await new Promise(r => setTimeout(r, 1200))
  const imgExport = await win.webContents.capturePage()
  fs.writeFileSync(path.join(assetsDir, 'screenshot_export.png'), imgExport.toPNG())
  console.log('✅ 6/6 Captured assets/screenshot_export.png (Mixdown & ID3 Export)')

  console.log('🎉 ALL SCREENSHOTS SUCCESSFULLY CAPTURED AND SAVED!')
  app.quit()
})
