import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

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

// seedBaselineTelemetry() // Deaktiviert, um das automatische Generieren von Demo-Daten zu stoppen

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
  const cleanIp = String(ip).replace('::ffff:', '')
  let geo = req.body.geo || { country: 'Local Network', countryCode: 'LCL', city: 'Localhost' }

  // Nur echte öffentliche IPs nach Standort prüfen, wenn kein manuelles Geo angegeben wurde
  if (!req.body.geo) {
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

// ------------------------------------------------------------------
// Support-Tickets & Telegram Bot Integration
// ------------------------------------------------------------------
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json')
const TELEGRAM_MAPPINGS_FILE = path.join(DATA_DIR, 'telegram-mappings.json')
const BOT_TOKEN = '8829793594:AAGfpXXZ_QDiPhe-_Lsvyf8wHjUsoeBKk70'
const RECIPIENTS = ['7045186168']

if (!fs.existsSync(FEEDBACK_FILE)) {
  fs.writeFileSync(FEEDBACK_FILE, '[]', 'utf-8')
}
if (!fs.existsSync(TELEGRAM_MAPPINGS_FILE)) {
  fs.writeFileSync(TELEGRAM_MAPPINGS_FILE, '{}', 'utf-8')
}

function loadFeedbacks() {
  if (!fs.existsSync(FEEDBACK_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveFeedbacks(feedbacks) {
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf-8')
  } catch (err) {
    console.error('Fehler beim Schreiben des Feedback-Files:', err)
  }
}

function loadTelegramMappings() {
  if (!fs.existsSync(TELEGRAM_MAPPINGS_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(TELEGRAM_MAPPINGS_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function saveTelegramMappings(mappings) {
  try {
    fs.writeFileSync(TELEGRAM_MAPPINGS_FILE, JSON.stringify(mappings, null, 2), 'utf-8')
  } catch (err) {
    console.error('Fehler beim Schreiben des Telegram-Mappings-Files:', err)
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function registerTelegramWebhook() {
  const webhookUrl = 'https://admin.omc.omegaprojects.de/api/telegram-webhook'
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    })
    const data = await res.json()
    console.log('[Telegram Bot] Webhook registriert:', data)
  } catch (err) {
    console.error('[Telegram Bot] Fehler bei Webhook-Registrierung:', err)
  }
}

// 1. Webhook Route für Telegram Updates (Callback Queries & Replies)
app.post('/api/telegram-webhook', async (req, res) => {
  const { message, callback_query } = req.body

  // Verarbeite Callback Queries (Inline-Schließen-Button)
  if (callback_query) {
    const callbackData = callback_query.data
    if (callbackData && callbackData.startsWith('close_ticket:')) {
      const ticketId = callbackData.split(':')[1]
      const tickets = loadFeedbacks()
      const ticket = tickets.find(t => t.id === ticketId)
      if (ticket) {
        ticket.status = 'closed'
        ticket.updatedAt = Date.now()
        saveFeedbacks(tickets)

        // Callback Query beantworten
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callback_query.id,
            text: 'Ticket wurde geschlossen.'
          })
        }).catch(err => console.error('[Telegram] answerCallbackQuery failed:', err))

        // Nachricht aktualisieren (Button entfernen, „✅ GESCHLOSSEN“ einfügen)
        if (callback_query.message) {
          const originalText = callback_query.message.text || ''
          const closedText = originalText + '\n\n✅ GESCHLOSSEN'
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: callback_query.message.chat.id,
              message_id: callback_query.message.message_id,
              text: closedText,
              reply_markup: null
            })
          }).catch(err => console.error('[Telegram] editMessageText failed:', err))
        }
      }
    }
    return res.json({ ok: true })
  }

  // Verarbeite Antworten (Replies) auf Bot-Nachrichten
  if (message && message.reply_to_message) {
    const replyToId = message.reply_to_message.message_id
    const chatId = message.chat.id
    const mappings = loadTelegramMappings()
    const ticketId = mappings[`${chatId}:${replyToId}`]

    if (ticketId) {
      const tickets = loadFeedbacks()
      const ticket = tickets.find(t => t.id === ticketId)
      if (ticket) {
        const senderName = message.from.first_name || 'Admin'
        let displaySender = `Telegram ${senderName}`
        if (senderName.toLowerCase().includes('omega')) {
          displaySender = 'OmegaProjects Support'
        }
        ticket.chat.push({
          sender: 'admin',
          text: `[${displaySender}]: ${message.text || ''}`,
          timestamp: Date.now()
        })
        ticket.updatedAt = Date.now()
        saveFeedbacks(tickets)
        console.log(`[Telegram Bot] Antwort zu Ticket ${ticketId} hinzugefügt: ${message.text}`)
      }
    }
  }

  res.json({ ok: true })
})

// 2. Client API: Neues Feedback senden
app.post('/api/feedback', async (req, res) => {
  const { deviceId, project, type, title, description, logs, images } = req.body

  if (!deviceId || !title || !description) {
    return res.status(400).json({ error: 'Fehlende Pflichtfelder (deviceId, title, description).' })
  }

  const os = req.body.os || 'unknown'
  const version = req.body.version || 'unknown'
  const ticketId = crypto.randomUUID()

  // Sammle Screenshots
  let imagesArray = []
  if (Array.isArray(images)) {
    imagesArray = images
  } else if (req.body.image) {
    imagesArray = [req.body.image]
  }

  const newTicket = {
    id: ticketId,
    deviceId,
    os,
    version,
    project: project || 'Omega Wave Editor',
    type: type || 'other',
    title,
    description,
    status: 'open',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    images: imagesArray,
    logs: logs || '',
    chat: []
  }

  const tickets = loadFeedbacks()
  tickets.push(newTicket)
  saveFeedbacks(tickets)

  // Benachrichtigung an Telegram Empfänger
  for (const recipient of RECIPIENTS) {
    try {
      const textMsg = `<b>🎫 NEUES SUPPORT-TICKET</b>\n` +
        `<b>Projekt:</b> ${escapeHTML(newTicket.project)}\n` +
        `<b>Typ:</b> ${escapeHTML(newTicket.type.toUpperCase())}\n` +
        `<b>Status:</b> OFFEN\n` +
        `<b>Device ID:</b> <code>${escapeHTML(deviceId)}</code>\n` +
        `<b>OS:</b> ${escapeHTML(os)} | <b>Version:</b> ${escapeHTML(version)}\n\n` +
        `<b>Titel:</b> ${escapeHTML(title)}\n` +
        `<b>Beschreibung:</b>\n${escapeHTML(description)}`

      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '❌ Schließen',
              callback_data: `close_ticket:${ticketId}`
            }
          ]
        ]
      }

      // Hauptnachricht senden
      const textRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text: textMsg,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      })

      if (textRes.ok) {
        const textData = await textRes.json()
        const messageId = textData.result?.message_id
        if (messageId) {
          const mappings = loadTelegramMappings()
          mappings[`${recipient}:${messageId}`] = ticketId
          saveTelegramMappings(mappings)
        }
      } else {
        console.error(`[Telegram] Fehler beim Senden der Text-Nachricht an ${recipient}:`, await textRes.text())
      }

      // Bilder senden
      if (imagesArray.length > 0) {
        for (let i = 0; i < imagesArray.length; i++) {
          const imgBase64 = imagesArray[i]
          const base64Data = imgBase64.replace(/^data:image\/\w+;base64,/, "")
          const buffer = Buffer.from(base64Data, 'base64')
          const blob = new Blob([buffer], { type: 'image/png' })

          const formData = new FormData()
          formData.append('chat_id', recipient)
          formData.append('photo', blob, `screenshot_${i}.png`)
          formData.append('caption', `Screenshot ${i + 1} für Ticket: ${title}`)

          const photoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
          })
          if (!photoRes.ok) {
            console.error(`[Telegram] Fehler beim Senden des Fotos ${i} an ${recipient}:`, await photoRes.text())
          }
        }
      }

      // Logs senden
      if (logs && logs.trim().length > 0) {
        const blob = new Blob([logs], { type: 'text/plain' })
        const formData = new FormData()
        formData.append('chat_id', recipient)
        formData.append('document', blob, 'logs.txt')
        formData.append('caption', `Logs für Ticket: ${title}`)

        const docRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
          method: 'POST',
          body: formData
        })
        if (!docRes.ok) {
          console.error(`[Telegram] Fehler beim Senden des Log-Dokuments an ${recipient}:`, await docRes.text())
        }
      }
    } catch (err) {
      console.error(`[Telegram] Exception beim Senden an ${recipient}:`, err)
    }
  }

  res.json({ success: true, ticketId })
})

// 3. Client API: Tickets & Chats für eine deviceId holen
app.get('/api/messages', (req, res) => {
  const { deviceId } = req.query
  if (!deviceId) {
    return res.status(400).json({ error: 'Parameter deviceId ist erforderlich.' })
  }

  const tickets = loadFeedbacks()
  const filtered = tickets.filter(t => t.deviceId === deviceId)
  res.json({ success: true, tickets: filtered })
})

// 4. Client API: User-Nachricht senden
app.post('/api/messages', async (req, res) => {
  const { ticketId, text, images, logs } = req.body

  if (!ticketId || !text) {
    return res.status(400).json({ error: 'Ticket ID und Text sind erforderlich.' })
  }

  const tickets = loadFeedbacks()
  const ticket = tickets.find(t => t.id === ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket nicht gefunden.' })
  }

  const newChatMsg = {
    sender: 'user',
    text,
    timestamp: Date.now()
  }

  // Handle images if provided
  let imagesArray = []
  if (Array.isArray(images) && images.length > 0) {
    imagesArray = images
    newChatMsg.images = images // Save images to the chat message
  }

  // Handle logs if provided
  if (logs && logs.trim().length > 0) {
    newChatMsg.logs = logs // Save logs to the chat message
  }

  ticket.chat.push(newChatMsg)
  ticket.updatedAt = Date.now()
  saveFeedbacks(tickets)

  // Benachrichtigung an Telegram Empfänger
  for (const recipient of RECIPIENTS) {
    try {
      const msg = `💬 <b>Antwort von User</b> für Ticket: "<i>${escapeHTML(ticket.title)}</i>"\n` +
        `<b>Nachricht:</b> ${escapeHTML(text)}`
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text: msg,
          parse_mode: 'HTML'
        })
      })

      // Bilder senden
      if (imagesArray.length > 0) {
        for (let i = 0; i < imagesArray.length; i++) {
          const imgObj = imagesArray[i]
          const imgDataUrl = typeof imgObj === 'string' ? imgObj : (imgObj.dataUrl || imgObj.data || '')
          if (!imgDataUrl) continue

          const base64Data = imgDataUrl.replace(/^data:image\/\w+;base64,/, "")
          const buffer = Buffer.from(base64Data, 'base64')
          const blob = new Blob([buffer], { type: 'image/png' })
          const imgName = (typeof imgObj === 'object' && imgObj.name) ? imgObj.name : `screenshot_${i}.png`

          const formData = new FormData()
          formData.append('chat_id', recipient)
          formData.append('photo', blob, imgName)
          formData.append('caption', `Screenshot ${i + 1} aus Antwort für Ticket: ${ticket.title}`)

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
          }).catch(err => console.error('[Telegram] Fehler bei sendPhoto:', err))
        }
      }

      // Logs senden
      if (logs && logs.trim().length > 0) {
        const blob = new Blob([logs], { type: 'text/plain' })
        const formData = new FormData()
        formData.append('chat_id', recipient)
        formData.append('document', blob, 'logs.txt')
        formData.append('caption', `Logs aus Antwort für Ticket: ${ticket.title}`)

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
          method: 'POST',
          body: formData
        }).catch(err => console.error('[Telegram] Fehler bei sendDocument:', err))
      }
    } catch (err) {
      console.error('[Telegram] Fehler bei Benachrichtigung über User-Antwort:', err)
    }
  }

  res.json({ success: true })
})

// 5. Admin API: Alle Tickets laden (geschützt)
app.get('/api/admin/feedback', requireAuth, (req, res) => {
  const tickets = loadFeedbacks()
  const sorted = [...tickets].sort((a, b) => b.updatedAt - a.updatedAt)
  res.json({ success: true, tickets: sorted })
})

// 6. Admin API: Antwort schreiben (geschützt)
app.post('/api/admin/feedback/reply', requireAuth, async (req, res) => {
  const { ticketId, text } = req.body

  if (!ticketId || !text) {
    return res.status(400).json({ error: 'Ticket ID und Text sind erforderlich.' })
  }

  const tickets = loadFeedbacks()
  const ticket = tickets.find(t => t.id === ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket nicht gefunden.' })
  }

  ticket.chat.push({
    sender: 'admin',
    text,
    timestamp: Date.now()
  })
  ticket.updatedAt = Date.now()
  saveFeedbacks(tickets)

  // Telegram-Benachrichtigung, dass der Admin geantwortet hat
  for (const recipient of RECIPIENTS) {
    try {
      const msg = `💬 <b>Admin-Antwort via Web UI</b> für Ticket: "<i>${escapeHTML(ticket.title)}</i>"\n` +
        `<b>Antwort:</b> ${escapeHTML(text)}`
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text: msg,
          parse_mode: 'HTML'
        })
      })
    } catch (err) {
      console.error('[Telegram] Fehler bei Benachrichtigung über Admin-Antwort:', err)
    }
  }

  res.json({ success: true })
})

// 7. Admin API: Ticket schließen (geschützt)
app.post('/api/admin/feedback/close', requireAuth, async (req, res) => {
  const { ticketId } = req.body

  if (!ticketId) {
    return res.status(400).json({ error: 'Ticket ID ist erforderlich.' })
  }

  const tickets = loadFeedbacks()
  const ticket = tickets.find(t => t.id === ticketId)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket nicht gefunden.' })
  }

  ticket.status = 'closed'
  ticket.updatedAt = Date.now()
  saveFeedbacks(tickets)

  // In Telegram melden
  for (const recipient of RECIPIENTS) {
    try {
      const msg = `❌ <b>Ticket geschlossen (Web UI)</b>: "<i>${escapeHTML(ticket.title)}</i>"`
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text: msg,
          parse_mode: 'HTML'
        })
      })
    } catch (err) {
      console.error('[Telegram] Fehler bei Schließen-Meldung:', err)
    }
  }

  res.json({ success: true })
})

// ------------------------------------------------------------------
// Auto-Deploy via Git Pull (no SSH needed)
// ------------------------------------------------------------------
app.post('/api/admin/deploy', (req, res) => {
  const token = req.headers['x-admin-token']
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Nicht authentifiziert' })
  }

  console.log('[Deploy] Git pull gestartet...')
  exec('git pull origin master', { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error('[Deploy] Fehler:', stderr)
      return res.json({ success: false, output: stderr || err.message })
    }
    console.log('[Deploy] Erfolgreich:', stdout)
    res.json({ success: true, output: stdout })
  })
})

app.listen(PORT, () => {
  console.log(`Erweiterter Admin-Telemetrie-Server läuft auf Port ${PORT}`)
  registerTelegramWebhook()
})


