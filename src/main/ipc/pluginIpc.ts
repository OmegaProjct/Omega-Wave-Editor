/**
 * pluginIpc.ts
 * Main process IPC handlers for VST2, VST3, AU, and LV2 scanning and registry.
 * Persists scanning state, handles crashes via a registry file, and handles platform differences.
 */

import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'
import { PluginDescriptor } from '../../common/types'
import { VstHost } from '../vstBridge/VstHostAddon'

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
      scanPaths.push(
        'C:\\Program Files\\VSTPlugins',
        'C:\\Program Files\\Common Files\\VST3',
        'C:\\Program Files\\Steinberg\\VSTPlugins',
        'C:\\Program Files (x86)\\VSTPlugins',
        'C:\\Program Files (x86)\\Common Files\\VST3',
        'C:\\Program Files (x86)\\Steinberg\\VSTPlugins',
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Common', 'VST3'),
        path.join(os.homedir(), 'Documents', 'VST Plugins'),
        path.join(os.homedir(), 'Documents', 'VST3 Plugins')
      )
    } else if (platform === 'darwin') {
      scanPaths.push(
        '/Library/Audio/Plug-Ins/VST',
        '/Library/Audio/Plug-Ins/VST3',
        '/Library/Audio/Plug-Ins/Components',
        path.join(os.homedir(), 'Library/Audio/Plug-Ins/VST'),
        path.join(os.homedir(), 'Library/Audio/Plug-Ins/VST3'),
        path.join(os.homedir(), 'Library/Audio/Plug-Ins/Components')
      )
    } else {
      scanPaths.push(
        '/usr/lib/vst',
        '/usr/lib/vst3',
        '/usr/local/lib/vst',
        '/usr/local/lib/vst3',
        '/usr/lib/lv2',
        '/usr/local/lib/lv2',
        path.join(os.homedir(), '.vst'),
        path.join(os.homedir(), '.vst3'),
        path.join(os.homedir(), '.lv2')
      )
    }

    // Load custom VST paths from user settings.json
    const settingsPath = path.join(userDataDir, 'settings.json')
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        if (settings && Array.isArray(settings.vstPaths)) {
          settings.vstPaths.forEach((p: string) => {
            if (p && !scanPaths.includes(p)) {
              scanPaths.push(p)
            }
          })
        }
      } catch (err) {
        console.error('Failed to read custom VST paths from settings.json:', err)
      }
    }

    // Standard-Kategorie für gescannte Plugins ohne verifizierte Metadaten
    function detectCategory(name: string, filePath: string): string {
      return 'Plugin'
    }

    // Rekursiver Verzeichnis-Scanner
    async function scanDirRecursive(
      dir: string,
      depth: number = 0
    ): Promise<Array<{ fullPath: string; name: string; format: 'VST2' | 'VST3' | 'AU' | 'LV2' }>> {
      const MAX_DEPTH = 6
      if (depth > MAX_DEPTH) return []
      const items: Array<{ fullPath: string; name: string; format: 'VST2' | 'VST3' | 'AU' | 'LV2' }> = []
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          const lowerName = entry.name.toLowerCase()

          if (lowerName.endsWith('.dll')) {
            items.push({ fullPath, name: entry.name.replace(/\.dll$/i, ''), format: 'VST2' })
          } else if (lowerName.endsWith('.vst') && !entry.isDirectory()) {
            items.push({ fullPath, name: entry.name.replace(/\.vst$/i, ''), format: 'VST2' })
          } else if (lowerName.endsWith('.vst3')) {
            // VST3 ist typischerweise ein Bundle-Ordner
            items.push({ fullPath, name: entry.name.replace(/\.vst3$/i, ''), format: 'VST3' })
          } else if (lowerName.endsWith('.component')) {
            items.push({ fullPath, name: entry.name.replace(/\.component$/i, ''), format: 'AU' })
          } else if (lowerName.endsWith('.lv2')) {
            items.push({ fullPath, name: entry.name.replace(/\.lv2$/i, ''), format: 'LV2' })
          } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
            // Rekursiv in Unterordner scannen (außer bekannte Bundle-Endungen)
            const sub = await scanDirRecursive(fullPath, depth + 1)
            items.push(...sub)
          }
        }
      } catch {
        // Verzeichnis nicht zugänglich – überspringen
      }
      return items
    }

    const currentRegistry = readRegistry()
    const foundPlugins: PluginDescriptor[] = []

    // 2. Rekursiver Filesystem-Scan über alle Suchpfade
    for (const scanDir of scanPaths) {
      if (!fs.existsSync(scanDir)) continue
      try {
        const entries = await scanDirRecursive(scanDir)
        for (const { fullPath, name, format } of entries) {
          const pluginId = generatePluginId(fullPath, name)
          const existing = currentRegistry[pluginId]
          const category = detectCategory(name, fullPath)

          const isHostSupported = VstHost.isSupported()
          const platform = process.platform

          let hostable = false
          let unsupportedReason: string | undefined = undefined

          if (platform === 'win32') {
            if (!isHostSupported) {
              hostable = false
              unsupportedReason = 'Das native VST-Host-Addon konnte nicht geladen werden.'
            } else if (format === 'VST2') {
              hostable = true
            } else {
              hostable = false
              if (format === 'VST3') {
                unsupportedReason = 'VST3-Format wird vom aktuellen Host unter Windows noch nicht unterstützt.'
              } else if (format === 'LV2') {
                unsupportedReason = 'LV2-Format wird unter Windows nicht unterstützt.'
              } else if (format === 'AU') {
                unsupportedReason = 'Audio Units (AU) sind nur auf macOS verfügbar.'
              } else {
                unsupportedReason = `Format ${format} wird nicht unterstützt.`
              }
            }
          } else {
            hostable = false
            unsupportedReason = `VST-Hosting ist auf der Plattform ${platform} derzeit nicht unterstützt.`
          }

          const plugin: PluginDescriptor = {
            id: pluginId,
            name,
            manufacturer: existing?.manufacturer || 'Unbekannt',
            format,
            path: fullPath,
            scanStatus: existing ? existing.scanStatus : 'scanned',
            crashCount: existing ? existing.crashCount : 0,
            blocked: existing ? existing.blocked : false,
            category,
            hostable,
            unsupportedReason
          }

          if (plugin.crashCount && plugin.crashCount >= 3) {
            plugin.blocked = true
            plugin.scanStatus = 'failed'
            plugin.error = 'Plugin stürzte wiederholt ab und wurde blockiert.'
          }

          currentRegistry[pluginId] = plugin
          if (!plugin.blocked) foundPlugins.push(plugin)
        }
      } catch (err) {
        console.error(`Fehler beim Scannen von ${scanDir}:`, err)
      }
    }

    // Write updated registry to disk
    writeRegistry(currentRegistry)

    return foundPlugins
  })
}
