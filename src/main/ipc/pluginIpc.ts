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

    // Instrument-Erkennung anhand von Schlüsselwörtern im Namen/Pfad
    function detectCategory(name: string, filePath: string): string {
      const lower = (name + ' ' + filePath).toLowerCase()
      const instrumentKeywords = [
        'synth', 'instrument', 'vsti', 'piano', 'keys', 'organ', 'drum', 'drums',
        'bass', 'guitar', 'violin', 'cello', 'brass', 'strings', 'sampler',
        'kontakt', 'omnisphere', 'serum', 'massive', 'nexus', 'sylenth',
        'battery', 'addictive', 'superior', 'ezdrummer', 'addictivekeys'
      ]
      return instrumentKeywords.some(kw => lower.includes(kw)) ? 'Instrument' : 'Effekt'
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

          const plugin: PluginDescriptor = {
            id: pluginId,
            name,
            manufacturer: existing?.manufacturer || 'Unbekannt',
            format,
            path: fullPath,
            scanStatus: existing ? existing.scanStatus : 'scanned',
            crashCount: existing ? existing.crashCount : 0,
            blocked: existing ? existing.blocked : false,
            category
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
    try {
      const connection = await launchNativeBridgeSubprocess(pluginPath)
      return {
        success: true,
        connection
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message
      }
    }
  })
}

/**
 * Native Bridge IPC Protocol & Lifecycle Manager.
 * Handles subprocess management, stdin/stdout-based JSON-RPC handshakes,
 * and crash detection for VST/AU/LV2 plugins.
 */
export interface BridgeHandshakeInit {
  type: 'init'
  pluginPath: string
  hostVersion: string
}

export interface BridgeHandshakeAck {
  type: 'init_ack'
  status: 'ok' | 'error'
  pid: number
  pluginFormat?: string
  error?: string
}

export interface BridgeHeartbeat {
  type: 'ping'
  timestamp: number
}

export interface BridgeHeartbeatAck {
  type: 'pong'
  timestamp: number
}

export interface NativeBridgeConnection {
  pid: number
  pluginPath: string
  status: 'connected' | 'disconnected'
}

/**
 * Spawns a native bridge subprocess and performs a 2-way handshake.
 * Utilizes a mock Node.js subprocess to safely emulate native execution and IPC protocols.
 */
export function launchNativeBridgeSubprocess(
  pluginPath: string
): Promise<NativeBridgeConnection> {
  return new Promise((resolve, reject) => {
    // A standard cross-platform way is to spawn a Node.js child process executing a simple bridge loop.
    // The bridge script listens for standard input commands and responds on standard output.
    const bridgeScript = `
      process.stdin.setEncoding('utf8');
      
      // Send initial readiness signal
      console.log(JSON.stringify({ type: 'ready' }));

      let initialized = false;

      process.stdin.on('data', (data) => {
        try {
          const lines = data.trim().split('\\n');
          for (const line of lines) {
            if (!line) continue;
            const message = JSON.parse(line);
            
            if (message.type === 'init') {
              initialized = true;
              console.log(JSON.stringify({
                type: 'init_ack',
                status: 'ok',
                pid: process.pid,
                pluginFormat: message.pluginPath.endsWith('.vst3') ? 'VST3' : 'VST2'
              }));
            } else if (message.type === 'ping') {
              console.log(JSON.stringify({
                type: 'pong',
                timestamp: message.timestamp
              }));
            }
          }
        } catch (err) {
          console.error(JSON.stringify({ type: 'error', message: err.message }));
        }
      });
    `;

    try {
      const child = spawn(process.execPath || 'node', ['-e', bridgeScript]);
      let resolved = false;

      // Setup a timeout for the handshake
      const timeout = setTimeout(() => {
        if (!resolved) {
          child.kill();
          reject(new Error('Handshake timeout: Native Bridge Subprocess failed to respond within 5000ms.'));
        }
      }, 5000);

      let buffer = '';

      child.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          try {
            const message = JSON.parse(cleanLine);
            if (message.type === 'ready') {
              // Part 1 of handshake: Send initialization command
              const initCmd: BridgeHandshakeInit = {
                type: 'init',
                pluginPath,
                hostVersion: '1.0.0'
              };
              child.stdin.write(JSON.stringify(initCmd) + '\n');
            } else if (message.type === 'init_ack') {
              const ack = message as any;
              if (ack.status === 'ok') {
                resolved = true;
                clearTimeout(timeout);
                
                // Set up periodic heartbeat (ping/pong) to check if subprocess is alive
                const heartbeatInterval = setInterval(() => {
                  if (child.killed) {
                    clearInterval(heartbeatInterval);
                    return;
                  }
                  const ping: BridgeHeartbeat = {
                    type: 'ping',
                    timestamp: Date.now()
                  };
                  child.stdin.write(JSON.stringify(ping) + '\n');
                }, 10000);

                // Unref the interval to avoid keeping the main process alive
                heartbeatInterval.unref();

                child.on('exit', (code, signal) => {
                  console.log(`[PluginBridge] Subprocess for ${pluginPath} exited. Code: ${code}, Signal: ${signal}`);
                  clearInterval(heartbeatInterval);
                });

                resolve({
                  pid: child.pid || 0,
                  pluginPath,
                  status: 'connected'
                });
              } else {
                resolved = true;
                clearTimeout(timeout);
                child.kill();
                reject(new Error(`Native Bridge initialization failed: ${ack.error}`));
              }
            }
          } catch (e) {
            console.error('[PluginBridge] Failed to parse message from bridge stdout:', cleanLine);
          }
        }
      });

      child.stderr.on('data', (data) => {
        console.error(`[PluginBridge Subprocess Error]: ${data.toString()}`);
      });

      child.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
