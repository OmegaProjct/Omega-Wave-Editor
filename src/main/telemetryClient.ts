import { app } from 'electron'
import os from 'os'
import fs from 'fs'
import path from 'path'
import https from 'https'
import crypto from 'crypto'

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
      hostname: 'admin.owe.omegaprojects.de',
      port: 443,
      path: '/api/telemetry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Omega-Wave-Editor-Client'
      },
      timeout: 4000
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
