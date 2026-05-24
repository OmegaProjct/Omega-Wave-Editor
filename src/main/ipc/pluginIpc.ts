/**
 * pluginIpc.ts
 * Main process IPC handlers for VST2, VST3, AU, and LV2 scanning and registry.
 * Persists scanning state, handles crashes via a registry file, and handles platform differences.
 */

import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { PluginDescriptor } from '../../common/types'

// Cryptographic-like simple unique hash for plugin paths
function generatePluginId(filePath: string, name: string): string {
  let hash = 0
  const combined = `${filePath}:${name}`
  for (let i = 0; i < combined.length; i++) {
    const chr = combined.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0 // Convert to 32bit integer
  }
  return 'plug_' + Math.abs(hash).toString(16)
}

export function registerPluginIpc() {
  const userDataDir = app.getPath('userData')
  const registryPath = path.join(userDataDir, 'plugins-registry.json')

  // Helper to read persistent registry
  function readRegistry(): Record<string, PluginDescriptor> {
    try {
      if (fs.existsSync(registryPath)) {
        const content = fs.readFileSync(registryPath, 'utf-8')
        return JSON.parse(content) || {}
      }
    } catch (err) {
      console.error('Failed to read plugin registry:', err)
    }
    return {}
  }

  // Helper to write persistent registry
  function writeRegistry(registry: Record<string, PluginDescriptor>) {
    try {
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to write plugin registry:', err)
    }
  }

  ipcMain.handle('scan-vst-plugins', async () => {
    const platform = process.platform
    const scanPaths: string[] = []

    // 1. Setup platform-specific scan directories (Windows VST2/VST3, macOS VST2/VST3/AU, Linux VST3/LV2)
    if (platform === 'win32') {
      // Standard Windows directories for audio plugins
      scanPaths.push(
        'C:\\Program Files\\VSTPlugins',
        'C:\\Program Files\\Common Files\\VST3',
        'C:\\Program Files\\Steinberg\\VSTPlugins',
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Common', 'VST3')
      )
    } else if (platform === 'darwin') {
      // Standard macOS directories for VSTs and Audio Units (AU component files)
      scanPaths.push(
        '/Library/Audio/Plug-Ins/VST',
        '/Library/Audio/Plug-Ins/VST3',
        '/Library/Audio/Plug-Ins/Components', // Audio Units
        path.join(os.homedir(), 'Library/Audio/Plug-Ins/VST3'),
        path.join(os.homedir(), 'Library/Audio/Plug-Ins/Components')
      )
    } else {
      // Standard Linux directories for VST3 and LV2 bundle formats
      scanPaths.push(
        '/usr/lib/vst3',
        '/usr/local/lib/vst3',
        '/usr/lib/lv2',
        '/usr/local/lib/lv2',
        path.join(os.homedir(), '.vst3'),
        path.join(os.homedir(), '.lv2')
      )
    }

    const currentRegistry = readRegistry()
    const foundPlugins: PluginDescriptor[] = []

    // 2. Perform filesystem scans
    for (const scanDir of scanPaths) {
      try {
        if (fs.existsSync(scanDir)) {
          const entries = await fs.promises.readdir(scanDir, { withFileTypes: true })
          
          for (const entry of entries) {
            const fullPath = path.join(scanDir, entry.name)
            const name = entry.name.replace(/\.(dll|vst|vst3|component|lv2|so)$/i, '')
            let format: 'VST2' | 'VST3' | 'AU' | 'LV2' = 'VST3'

            if (entry.name.endsWith('.dll') || entry.name.endsWith('.vst')) {
              format = 'VST2'
            } else if (entry.name.endsWith('.vst3')) {
              format = 'VST3'
            } else if (entry.name.endsWith('.component')) {
              format = 'AU'
            } else if (entry.name.endsWith('.lv2')) {
              format = 'LV2'
            } else if (entry.name.endsWith('.so')) {
              format = 'VST3' // default fallback under linux
            } else {
              continue // skip unsupported file types
            }

            const pluginId = generatePluginId(fullPath, name)
            const existing = currentRegistry[pluginId]

            // Retain blocklist metadata
            const plugin: PluginDescriptor = {
              id: pluginId,
              name,
              manufacturer: 'Unbekannt',
              format,
              path: fullPath,
              scanStatus: existing ? existing.scanStatus : 'scanned',
              crashCount: existing ? existing.crashCount : 0,
              blocked: existing ? existing.blocked : false,
              category: format === 'AU' ? 'Instrument/Effect' : 'Effekt'
            }

            // Block plugins that crash repeatedly (threshold >= 3 crashes)
            if (plugin.crashCount && plugin.crashCount >= 3) {
              plugin.blocked = true
              plugin.scanStatus = 'failed'
              plugin.error = 'Plugin stürzte wiederholt ab und wurde blockiert.'
            }

            currentRegistry[pluginId] = plugin
            if (!plugin.blocked) {
              foundPlugins.push(plugin)
            }
          }
        }
      } catch (err) {
        console.error(`Fehler beim Scannen von ${scanDir}:`, err)
      }
    }

    // 3. Built-in Fallbacks if no plugins are found
    if (foundPlugins.length === 0) {
      const internalId = generatePluginId('internal://limiter', 'Omega Limiter (Built-in)')
      foundPlugins.push({
        id: internalId,
        name: 'Omega Limiter (Built-in)',
        manufacturer: 'Omega Projects',
        version: '1.0',
        format: 'VST3',
        path: 'internal://limiter',
        category: 'Limiter/Effekt',
        scanStatus: 'scanned',
        crashCount: 0,
        blocked: false
      })
    }

    // Write updated registry to disk
    writeRegistry(currentRegistry)

    return foundPlugins
  })

  ipcMain.handle('open-vst-ui', async (_, pluginPath: string) => {
    console.log(`Plugin Editor UI requested for: ${pluginPath}`)
    // Return explicit error because native hosting bridge is not yet implemented
    return {
      success: false,
      error: 'Plugin Host und Bridge sind in diesem Prototyp noch nicht implementiert.'
    }
  })
}
