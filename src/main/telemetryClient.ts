import { app } from 'electron'
import os from 'os'
import fs from 'fs'
import path from 'path'
import https from 'https'
import crypto from 'crypto'
import { execSync } from 'child_process'
import dns from 'dns'
export interface TelemetrySpecs {
  cpu: string
  cpuCores: number
  gpu: string
  ramGB: number
  diskGB: number
}

export interface TelemetryPayload {
  clientId: string
  os: string
  version: string
  action: 'check' | 'download'
  specs: TelemetrySpecs
  updateFrom?: string
  updateTo?: string
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

/**
 * Holt die eindeutige anonyme ClientID aus settings.json
 * oder erzeugt eine neue, falls noch keine vorhanden ist.
 */
function getOrCreateClientId(): string {
  const settingsPath = getSettingsPath()
  let settings: any = {}
  try {
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
  } catch (err) {
    console.warn('[Telemetry] Fehler beim Lesen der settings.json:', err)
  }

  if (settings.telemetryClientId && typeof settings.telemetryClientId === 'string') {
    return settings.telemetryClientId
  }

  const newId = crypto.randomUUID()
  settings.telemetryClientId = newId
  try {
    // Falls das Verzeichnis noch nicht existiert (sehr unwahrscheinlich bei Telemetrie-Auslösung)
    const dir = path.dirname(settingsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[Telemetry] Fehler beim Schreiben der telemetryClientId:', err)
  }

  return newId
}

/**
 * Ermittelt das aktive GPU-Modell asynchron
 */
async function getGPUModel(): Promise<string> {
  try {
    const gpuInfo = (await app.getGPUInfo('basic')) as any
    const activeGpu = gpuInfo.gpuDevice?.find((d: any) => d.active) || gpuInfo.gpuDevice?.[0]
    if (activeGpu && activeGpu.glRenderer) {
      return activeGpu.glRenderer
    }
  } catch (err) {
    console.warn('[Telemetry] Konnte GPU-Modell nicht ermitteln:', err)
  }
  return 'Unbekannt'
}

/**
 * Ermittelt die Festplattengröße der Systempartition/Appdata-Partition in GB
 */
function getSystemDiskSizeGB(): number {
  try {
    const userDataPath = app.getPath('userData')
    // Unter Windows nehmen wir den Laufwerksbuchstaben (z.B. "C:\")
    const statPath = process.platform === 'win32' ? userDataPath.substring(0, 3) : '/'
    
    // fs.statfsSync wird ab Node.js v18.15.0+ unterstützt
    if (typeof fs.statfsSync === 'function') {
      const stats = fs.statfsSync(statPath)
      const sizeBytes = stats.bsize * stats.blocks
      return Math.round(sizeBytes / (1024 * 1024 * 1024))
    }
  } catch (err) {
    console.warn('[Telemetry] Konnte Festplattengröße nicht ermitteln:', err)
  }
  return 0
}

/**
 * Aggregiert alle Systemspezifikationen
 */
async function getSystemSpecs(): Promise<TelemetrySpecs> {
  const cpus = os.cpus()
  const cpu = cpus.length > 0 ? cpus[0].model : 'Unbekannt'
  const cpuCores = cpus.length
  
  const ramBytes = os.totalmem()
  const ramGB = Math.round(ramBytes / (1024 * 1024 * 1024))

  const gpu = await getGPUModel()
  const diskGB = getSystemDiskSizeGB()

  return {
    cpu,
    cpuCores,
    gpu,
    ramGB,
    diskGB
  }
}

/**
 * Sendet einen erweiterten Telemetrie-Ping an den VPS
 */
export async function sendEnhancedTelemetryPing(
  action: 'check' | 'download',
  currentVersion: string,
  targetVersion?: string
): Promise<void> {
  try {
    const clientId = getOrCreateClientId()
    const specs = await getSystemSpecs()

    const payload: TelemetryPayload = {
      clientId,
      os: process.platform,
      version: currentVersion,
      action,
      specs,
      updateFrom: currentVersion,
      updateTo: targetVersion
    }

    const data = JSON.stringify(payload)

    const options = {
      hostname: 'admin.omc.omegaprojects.de',
      port: 443,
      path: '/api/telemetry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Omega-Wave-Editor-Client'
      },
      timeout: 4000,
      lookup: (hostname: string, opts: any, callback: any) => {
        if (hostname === 'admin.omc.omegaprojects.de') {
          if (opts && opts.all) {
            callback(null, [{ address: '85.190.98.247', family: 4 }], 4)
          } else {
            callback(null, '85.190.98.247', 4)
          }
        } else {
          dns.lookup(hostname, opts, callback)
        }
      }
    }

    const req = https.request(options, (res) => {
      res.on('data', () => {})
    })

    req.on('error', (err) => {
      console.warn('[Telemetry] Ping fehlgeschlagen:', err.message)
    })

    req.on('timeout', () => {
      req.destroy()
    })

    req.write(data)
    req.end()
  } catch (err: any) {
    console.warn('[Telemetry] Fehler beim Zusammenstellen der Telemetriedaten:', err.message)
  }
}

/**
 * Ermittelt die MAC-Adresse der primären (nicht-internen) Netzwerkschnittstelle.
 */
export function getMacAddress(): string {
  try {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name]
      if (iface) {
        for (const item of iface) {
          if (!item.internal && item.mac && item.mac !== '00:00:00:00:00:00') {
            return item.mac
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Telemetry] Fehler beim Ermitteln der MAC-Adresse:', err)
  }
  return 'UnknownMAC'
}

/**
 * Erzeugt einen SHA-256 Hardware-Fingerprint im Format OMC-XXXX-XXXX-XXXX-XXXX.
 */
export async function getHardwareFingerprint(): Promise<string> {
  const hostname = os.hostname()
  const cpus = os.cpus()
  const cpu = cpus.length > 0 ? cpus[0].model : 'Unbekannt'
  const ramGB = Math.round(os.totalmem() / (1024 * 1024 * 1024))
  const gpu = await getGPUModel()
  const mac = getMacAddress()

  const rawString = `${hostname}|${cpu}|${ramGB}|${gpu}|${mac}`
  const hash = crypto.createHash('sha256').update(rawString).digest('hex').toUpperCase()

  const part1 = hash.substring(0, 4)
  const part2 = hash.substring(4, 8)
  const part3 = hash.substring(8, 12)
  const part4 = hash.substring(12, 16)

  return `OMC-${part1}-${part2}-${part3}-${part4}`
}

