import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const DATA_DIR = path.join(__dirname, 'data')
const LOG_FILE = path.join(DATA_DIR, 'telemetry-log.json')

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '31090'
const activeSessions = new Set()

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { password } = req.body
  if (!password) {
    return res.status(400).json({ error: 'Kein Passwort angegeben.' })
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Falsches Passwort.' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  activeSessions.add(token)
  res.json({ success: true, token })
})

app.post('/api/logout', (req, res) => {
  const token = extractToken(req)
  if (token) activeSessions.delete(token)
  res.json({ success: true })
})

function extractToken(req) {
  const auth = req.headers['authorization'] || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

function requireAuth(req, res, next) {
  const token = extractToken(req)
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Nicht authentifiziert.' })
  }
  next()
}

// ------------------------------------------------------------------
// Telemetrie Logs laden / speichern
// ------------------------------------------------------------------
function loadLogs() {
  if (!fs.existsSync(LOG_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveLogs(logs) {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8')
  } catch (err) {
    console.error('Fehler beim Schreiben des Log-Files:', err)
  }
}

// ------------------------------------------------------------------
// Baseline-Seed für 30 Tage erweiterte Telemetrie
// ------------------------------------------------------------------
function seedBaselineTelemetry() {
  const logs = loadLogs()
  if (logs.length > 0) return

  console.log('Seed: Erstelle erweiterte Demo-Telemetriedaten für 30 Tage...')
  const seeded = []
  const now = Date.now()

  // 12 simulierte Benutzer mit festen Specs und Geodaten
  const mockClients = [
    {
      clientId: 'user-7ba2b83d-3d44-4861-a541-b8417c8201a9',
      os: 'win32',
      specs: { cpu: 'Intel Core i7-10700K', cpuCores: 8, gpu: 'NVIDIA GeForce RTX 3070', ramGB: 16, diskGB: 1024 },
      geo: { country: 'Germany', countryCode: 'DE', city: 'Berlin' }
    },
    {
      clientId: 'user-02a83f12-2d1b-419b-8e12-c2892c90e0b3',
      os: 'win32',
      specs: { cpu: 'AMD Ryzen 5 5600X', cpuCores: 6, gpu: 'NVIDIA GeForce RTX 3060', ramGB: 16, diskGB: 512 },
      geo: { country: 'Germany', countryCode: 'DE', city: 'München' }
    },
    {
      clientId: 'user-31e9c201-9a28-40b3-ae01-44781ca29014',
      os: 'darwin',
      specs: { cpu: 'Apple M1 Pro', cpuCores: 10, gpu: 'Apple M1 Pro GPU', ramGB: 16, diskGB: 512 },
      geo: { country: 'Austria', countryCode: 'AT', city: 'Wien' }
    },
    {
      clientId: 'user-a82f1b40-192a-4db3-98ba-d2903b418a02',
      os: 'darwin',
      specs: { cpu: 'Apple M2 Max', cpuCores: 12, gpu: 'Apple M2 Max GPU', ramGB: 32, diskGB: 1024 },
      geo: { country: 'Switzerland', countryCode: 'CH', city: 'Zürich' }
    },
    {
      clientId: 'user-81c9b2d4-ab92-4f10-ae0b-c89b27a01d45',
      os: 'linux',
      specs: { cpu: 'AMD Ryzen 9 7900X', cpuCores: 12, gpu: 'AMD Radeon RX 7900 XTX', ramGB: 64, diskGB: 2048 },
      geo: { country: 'Germany', countryCode: 'DE', city: 'Hamburg' }
    },
    {
      clientId: 'user-519ab0c2-cd41-47ba-89f4-2198cd01b8e1',
      os: 'win32',
      specs: { cpu: 'Intel Core i9-12900K', cpuCores: 16, gpu: 'NVIDIA GeForce RTX 4080', ramGB: 32, diskGB: 2048 },
      geo: { country: 'United States', countryCode: 'US', city: 'San Francisco' }
    },
    {
      clientId: 'user-91fa0b32-e019-48ba-9d32-dfa8019b8e21',
      os: 'win32',
      specs: { cpu: 'Intel Core i5-11400', cpuCores: 6, gpu: 'Intel Iris Xe Graphics', ramGB: 8, diskGB: 256 },
      geo: { country: 'United Kingdom', countryCode: 'GB', city: 'London' }
    },
    {
      clientId: 'user-bcda82d1-20a8-48b2-ae1a-bfd910ba2b1e',
      os: 'win32',
      specs: { cpu: 'AMD Ryzen 7 5800X', cpuCores: 8, gpu: 'NVIDIA GeForce GTX 1660 Super', ramGB: 16, diskGB: 512 },
      geo: { country: 'France', countryCode: 'FR', city: 'Paris' }
    },
    {
      clientId: 'user-c2b9a842-83b1-419b-ab01-c8efd38a0b01',
      os: 'darwin',
      specs: { cpu: 'Intel Core i7 (MacBook Pro)', cpuCores: 6, gpu: 'AMD Radeon Pro 5300M', ramGB: 16, diskGB: 512 },
      geo: { country: 'Netherlands', countryCode: 'NL', city: 'Amsterdam' }
    },
    {
      clientId: 'user-19cb2bda-d391-49b8-b8cf-cd8fa10b7ca2',
      os: 'win32',
      specs: { cpu: 'Intel Core i5-8250U', cpuCores: 4, gpu: 'Intel UHD Graphics 620', ramGB: 8, diskGB: 256 },
      geo: { country: 'Germany', countryCode: 'DE', city: 'Köln' }
    },
    {
      clientId: 'user-fa8b91cd-da28-4f1b-ab82-c8fa10bca2d8',
      os: 'win32',
      specs: { cpu: 'Intel Core i7-13700H', cpuCores: 14, gpu: 'NVIDIA GeForce RTX 4060 Laptop', ramGB: 32, diskGB: 1024 },
      geo: { country: 'Poland', countryCode: 'PL', city: 'Warschau' }
    },
    {
      clientId: 'user-da9b81ca-28fa-41e8-bc81-cdfb91ab01cf',
      os: 'linux',
      specs: { cpu: 'AMD Ryzen 7 7700', cpuCores: 8, gpu: 'NVIDIA GeForce RTX 3060 Ti', ramGB: 32, diskGB: 1024 },
      geo: { country: 'Germany', countryCode: 'DE', city: 'Dresden' }
    }
  ]

  // Generiere Simulationsverlauf für die 12 Benutzer
  // Wir simulieren Updates von v0.8.25 -> v0.8.26 -> v0.8.27 -> v0.8.28 über die letzten 30 Tage
  for (let i = 30; i >= 0; i--) {
    const dayMs = i * 24 * 60 * 60 * 1000
    const targetDate = now - dayMs

    // Jeder User pingt unregelmäßig
    mockClients.forEach(client => {
      // 30% Chance für einen Check an diesem Tag
      if (Math.random() < 0.3) {
        const timeOffset = Math.floor(Math.random() * 20 * 60 * 60 * 1000)
        const timestamp = targetDate + timeOffset

        // Bestimme Version basierend auf dem Alter des Pings
        let version = '0.8.25'
        if (i < 20) version = '0.8.26'
        if (i < 10) version = '0.8.27'
        if (i < 3) version = '0.8.28'

        // Check Event
        const ipHash = crypto.createHash('sha256').update(client.clientId).digest('hex').substring(0, 12)
        seeded.push({
          timestamp,
          clientId: client.clientId,
          ipHash,
          os: client.os,
          version,
          action: 'check',
          specs: client.specs,
          geo: client.geo
        })

        // Gelegentlich ein Download-Event (Update)
        // Z.B. wenn sich die Hauptversion ändert
        if (i === 19 || i === 9 || i === 2) {
          const oldVersion = i === 19 ? '0.8.25' : (i === 9 ? '0.8.26' : '0.8.27')
          const newVersion = i === 19 ? '0.8.26' : (i === 9 ? '0.8.27' : '0.8.28')
          
          seeded.push({
            timestamp: timestamp + 30000, // 30 Sekunden später
            clientId: client.clientId,
            ipHash,
            os: client.os,
            version: newVersion,
            action: 'download',
            specs: client.specs,
            geo: client.geo,
            updateFrom: oldVersion,
            updateTo: newVersion
          })
        }
      }
    })
  }

  seeded.sort((a, b) => a.timestamp - b.timestamp)
  saveLogs(seeded)
}

seedBaselineTelemetry()

// ------------------------------------------------------------------
// Telemetrie Ping (Öffentlich)
// ------------------------------------------------------------------
app.post('/api/telemetry', async (req, res) => {
  const { clientId, os, version, action, specs, updateFrom, updateTo } = req.body

  if (!clientId || !os || !version || !action) {
    return res.status(400).json({ error: 'Fehlende Parameter (clientId, os, version, action).' })
  }

  // IP Geolocation
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
  let geo = req.body.geo || { country: 'Local Network', countryCode: 'LCL', city: 'Localhost' }

  // Nur echte öffentliche IPs nach Standort prüfen, wenn kein manuelles Geo angegeben wurde
  if (!req.body.geo) {
    const cleanIp = String(ip).replace('::ffff:', '')
    if (cleanIp !== '127.0.0.1' && cleanIp !== '::1' && !cleanIp.startsWith('192.168.') && !cleanIp.startsWith('10.')) {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,city`)
        if (geoResponse.ok) {
          const geoData = await geoResponse.json()
          if (geoData.status === 'success') {
            geo = {
              country: geoData.country || 'Unbekannt',
              countryCode: geoData.countryCode || 'UN',
              city: geoData.city || 'Unbekannt'
            }
          }
        }
      } catch (err) {
        console.error('[Telemetry] Geolocation-Fehler:', err)
      }
    }
  }

  const ipHash = crypto.createHash('sha256').update(cleanIp).digest('hex').substring(0, 12)

  const newEvent = {
    timestamp: Date.now(),
    clientId,
    ipHash,
    os,
    version,
    action: action === 'download' ? 'download' : 'check',
    specs: specs || { cpu: 'Unbekannt', cpuCores: 0, gpu: 'Unbekannt', ramGB: 0, diskGB: 0 },
    geo,
    updateFrom,
    updateTo
  }

  const logs = loadLogs()
  logs.push(newEvent)
  if (logs.length > 5000) logs.shift()
  saveLogs(logs)

  console.log(`[Telemetrie] ${action} von ${os} (v${version}) aus ${geo.city}, ${geo.countryCode}`)
  res.json({ success: true })
})

// ------------------------------------------------------------------
// Aggregierte Statistiken (Geschützt)
// ------------------------------------------------------------------
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    // 1. GitHub Releases
    const githubResponse = await fetch('https://api.github.com/repos/OmegaProjct/Omega-Wave-Editor/releases', {
      headers: { 'User-Agent': 'Omega-Wave-Editor-Telemetry-Server' }
    })

    let githubReleases = []
    if (githubResponse.ok) {
      const data = await githubResponse.json()
      githubReleases = Array.isArray(data) ? data : []
    }

    const githubStats = githubReleases.map(release => {
      let downloadCount = 0
      const assets = (release.assets || []).map(asset => {
        downloadCount += (asset.download_count || 0)
        return { name: asset.name, downloadCount: asset.download_count || 0, size: asset.size }
      })
      return {
        tag: release.tag_name,
        name: release.name || release.tag_name,
        publishedAt: release.published_at,
        downloadCount,
        assets
      }
    })

    // 2. Telemetrie
    const logs = loadLogs()
    let internalDownloads = 0
    let internalChecks = 0

    // Geolocation Rankings
    const geoBreakdown = {}
    
    // Hardware Breakdown
    const ramDistribution = {}
    const gpuDistribution = {}
    const cpuDistribution = {}
    
    // User-Profile Map
    const userProfiles = {}

    // Daily Trend
    const dailyTrendMap = {}
    const now = Date.now()
    for (let i = 29; i >= 0; i--) {
      const dateStr = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      dailyTrendMap[dateStr] = { checks: 0, downloads: 0 }
    }

    logs.forEach(log => {
      const { clientId, specs, geo, action, version, timestamp, os } = log

      // Standard-Zähler
      if (action === 'download') {
        internalDownloads++
      } else {
        internalChecks++
      }

      // Geo-Zähler
      if (geo && geo.countryCode) {
        const countryKey = `${geo.country} (${geo.countryCode})`
        if (!geoBreakdown[countryKey]) {
          geoBreakdown[countryKey] = { name: geo.country, code: geo.countryCode, checks: 0, downloads: 0 }
        }
        if (action === 'download') geoBreakdown[countryKey].downloads++
        else geoBreakdown[countryKey].checks++
      }

      // Daily Trend
      const dateStr = new Date(timestamp).toISOString().split('T')[0]
      if (dailyTrendMap[dateStr]) {
        if (action === 'download') dailyTrendMap[dateStr].downloads++
        else dailyTrendMap[dateStr].checks++
      }

      // User Profile Aggregation
      if (clientId) {
        if (!userProfiles[clientId]) {
          userProfiles[clientId] = {
            clientId,
            os,
            geo: geo || { country: 'Unbekannt', countryCode: 'UN', city: 'Unbekannt' },
            specs: specs || { cpu: 'Unbekannt', cpuCores: 0, gpu: 'Unbekannt', ramGB: 0, diskGB: 0 },
            firstSeen: timestamp,
            lastSeen: timestamp,
            firstVersion: version,
            lastVersion: version,
            checksCount: 0,
            downloadsCount: 0,
            transitions: []
          }
        }

        const profile = userProfiles[clientId]
        
        // Letzte Version & Datum überschreiben (da Logs chronologisch sortiert sind)
        if (timestamp > profile.lastSeen) {
          profile.lastSeen = timestamp
          profile.lastVersion = version
          if (specs) profile.specs = specs
          if (geo) profile.geo = geo
        }
        if (timestamp < profile.firstSeen) {
          profile.firstSeen = timestamp
          profile.firstVersion = version
        }

        if (action === 'download') {
          profile.downloadsCount++
          if (log.updateFrom && log.updateTo) {
            // Speichere die Transition ab, falls noch nicht vorhanden
            const transitionStr = `${log.updateFrom} → ${log.updateTo}`
            if (!profile.transitions.includes(transitionStr)) {
              profile.transitions.push(transitionStr)
            }
          }
        } else {
          profile.checksCount++
        }
      }
    })

    // Berechne Hardware-Verteilungen basierend auf den *einzigartigen* Profilen
    const profilesList = Object.values(userProfiles)
    profilesList.forEach(profile => {
      const sp = profile.specs
      if (sp) {
        // RAM
        if (sp.ramGB) {
          const ramLabel = `${sp.ramGB} GB`
          ramDistribution[ramLabel] = (ramDistribution[ramLabel] || 0) + 1
        }
        // GPU
        if (sp.gpu && sp.gpu !== 'Unbekannt') {
          // Kürze GPU Bezeichnungen, falls zu lang (für Charts)
          const shortGpu = sp.gpu.replace('/PCIe/SSE2', '').substring(0, 32)
          gpuDistribution[shortGpu] = (gpuDistribution[shortGpu] || 0) + 1
        }
        // CPU
        if (sp.cpu && sp.cpu !== 'Unbekannt') {
          const shortCpu = sp.cpu.replace('(R)', '').replace('(TM)', '').replace('Processor', '').substring(0, 32)
          cpuDistribution[shortCpu] = (cpuDistribution[shortCpu] || 0) + 1
        }
      }
    })

    const dailyTrend = Object.keys(dailyTrendMap).sort().map(date => ({
      date,
      checks: dailyTrendMap[date].checks,
      downloads: dailyTrendMap[date].downloads
    }))

    // Sortierte Geo-Liste
    const geoList = Object.values(geoBreakdown)
      .sort((a, b) => b.downloads - a.downloads || b.checks - a.checks)
      .slice(0, 10)

    // Letzte Logs für Terminal
    const recentLogs = [...logs].reverse().slice(0, 40).map(log => ({
      timestamp: log.timestamp,
      clientId: log.clientId,
      ipHash: log.ipHash,
      os: log.os,
      version: log.version,
      action: log.action,
      geo: log.geo,
      specs: log.specs
    }))

    // OS Breakdown (nur Downloads)
    const osBreakdown = { win32: 0, darwin: 0, linux: 0 }
    profilesList.forEach(p => {
      if (osBreakdown[p.os] !== undefined) osBreakdown[p.os]++
    })

    // Versions-Breakdown
    const versionBreakdown = {}
    profilesList.forEach(p => {
      versionBreakdown[p.lastVersion] = (versionBreakdown[p.lastVersion] || 0) + 1
    })

    res.json({
      success: true,
      github: {
        totalDownloads: githubStats.reduce((sum, r) => sum + r.downloadCount, 0),
        releases: githubStats
      },
      internal: {
        totalDownloads: internalDownloads,
        totalChecks: internalChecks,
        osBreakdown,
        versionBreakdown,
        dailyTrend,
        recentLogs,
        geoList,
        hardware: {
          ram: ramDistribution,
          gpu: gpuDistribution,
          cpu: cpuDistribution
        },
        users: profilesList.sort((a, b) => b.lastSeen - a.lastSeen) // Neueste Aktivität zuerst
      }
    })
  } catch (err) {
    console.error('Fehler beim Aggregieren der erweiterten Stats:', err)
    res.status(500).json({ error: 'Fehler bei der Aggregation.' })
  }
})

// Control-Routen
app.post('/api/control/clear', requireAuth, (req, res) => {
  saveLogs([])
  res.json({ success: true, message: 'Logs gelöscht.' })
})

app.post('/api/control/seed', requireAuth, (req, res) => {
  saveLogs([])
  seedBaselineTelemetry()
  res.json({ success: true, message: 'Erweiterte Demo-Daten geladen.' })
})

app.listen(PORT, () => {
  console.log(`Erweiterter Admin-Telemetrie-Server läuft auf Port ${PORT}`)
})
