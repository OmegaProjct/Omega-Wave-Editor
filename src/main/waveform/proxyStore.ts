/**
 * proxyStore.ts
 * Persistiert Peak-Pyramiden als kompakte Binaerdateien im Programm-
 * Datenordner ("waveform-proxies"), damit die einmalige Analyse einer Datei
 * nach einem Neustart nicht erneut anfallen muss. Eine index.json ordnet
 * jedem Proxy die Quelldatei und die Projekte zu, die ihn verwenden.
 * Unverknuepfte oder veraltete Proxys werden beim Programmstart automatisch
 * aufgeraeumt (siehe runProxyStoreMaintenance).
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { logger } from '../logger'
import { PeakPyramid, PyramidLevel } from './peakPyramid'

const PROXY_FORMAT_VERSION = 1
const PROXY_MAGIC = 0x4f574550 // "OWEP" als u32-Markierung
const MAX_PROXY_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 Tage
const MAX_PROXY_STORE_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB Gesamtbudget

type ProxyIndexEntry = {
  fingerprint: string
  sourcePath: string
  fileName: string
  createdAt: number
  lastUsedAt: number
  byteSize: number
  // Pfade gespeicherter Projektdateien, die diesen Proxy verwenden.
  // Leer = temporaer (noch keinem gespeicherten Projekt zugeordnet).
  projectPaths: string[]
}

type ProxyIndex = {
  version: number
  entries: Record<string, ProxyIndexEntry>
}

let cachedProxyDir: string | null = null

function getProxyDir(): string {
  if (cachedProxyDir) return cachedProxyDir
  const base = app.getPath('userData')
  cachedProxyDir = path.join(base, 'waveform-proxies')
  if (!fs.existsSync(cachedProxyDir)) {
    fs.mkdirSync(cachedProxyDir, { recursive: true })
  }
  return cachedProxyDir
}

function getIndexPath(): string {
  return path.join(getProxyDir(), 'index.json')
}

function readIndex(): ProxyIndex {
  try {
    const raw = fs.readFileSync(getIndexPath(), 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.entries) return parsed
  } catch {
    // Noch keine Index-Datei vorhanden oder beschaedigt -> frisch beginnen
  }
  return { version: 1, entries: {} }
}

// Schreibt die Index-Datei atomar (Temp-Datei + Rename), damit ein Absturz
// mitten im Schreiben keine kaputte index.json hinterlaesst.
function writeIndexAtomic(index: ProxyIndex): void {
  const indexPath = getIndexPath()
  const tempPath = `${indexPath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(index, null, 2), 'utf-8')
  fs.renameSync(tempPath, indexPath)
}

// Stabiler, dateisystemsicherer Name aus dem Fingerprint (der Schraegstriche
// und Doppelpunkte aus dem Quellpfad enthaelt).
function fingerprintToFileName(fingerprint: string): string {
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    hash = (Math.imul(hash, 31) + fingerprint.charCodeAt(i)) >>> 0
  }
  return `proxy_${hash.toString(16).padStart(8, '0')}.owp`
}

/**
 * Fingerprint aus Pfad, Dateigroesse und Aenderungszeit — identisch zu dem,
 * was der In-Memory-Cache in waveformAnalysisService.ts verwendet, damit
 * beide denselben Datei-Zustand referenzieren.
 */
export function computeFileFingerprint(filePath: string): string {
  const stat = fs.statSync(filePath)
  return `${path.resolve(filePath)}|${stat.size}|${Math.floor(stat.mtimeMs)}`
}

// --- Binaerformat ---
// Header: magic(u32) + version(u32) + sampleRate(u32) + channels(u32)
//         + frames(u32) + filePeak(f32) + levelCount(u32)
// Pro Level: samplesPerPoint(u32) + points(u32)
// Danach je Level, je Kanal: min[points] f32, max[points] f32, rms[points] f32
function serializePyramid(pyramid: PeakPyramid): Buffer {
  let levelHeaderBytes = 0
  let dataBytes = 0
  for (const level of pyramid.levels) {
    levelHeaderBytes += 8
    dataBytes += level.points * 4 * 3 * pyramid.channels
  }
  const totalSize = 4 * 6 + levelHeaderBytes + dataBytes
  const buffer = Buffer.alloc(totalSize)
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  let offset = 0
  view.setUint32(offset, PROXY_MAGIC, true); offset += 4
  view.setUint32(offset, PROXY_FORMAT_VERSION, true); offset += 4
  view.setUint32(offset, pyramid.sampleRate, true); offset += 4
  view.setUint32(offset, pyramid.channels, true); offset += 4
  view.setUint32(offset, pyramid.frames, true); offset += 4
  view.setFloat32(offset, pyramid.filePeak, true); offset += 4
  view.setUint32(offset, pyramid.levels.length, true); offset += 4

  for (const level of pyramid.levels) {
    view.setUint32(offset, level.samplesPerPoint, true); offset += 4
    view.setUint32(offset, level.points, true); offset += 4
  }

  for (const level of pyramid.levels) {
    for (let ch = 0; ch < pyramid.channels; ch++) {
      for (let i = 0; i < level.points; i++) { view.setFloat32(offset, level.min[ch][i], true); offset += 4 }
      for (let i = 0; i < level.points; i++) { view.setFloat32(offset, level.max[ch][i], true); offset += 4 }
      for (let i = 0; i < level.points; i++) { view.setFloat32(offset, level.rms[ch][i], true); offset += 4 }
    }
  }

  return buffer
}

function deserializePyramid(buffer: Buffer): PeakPyramid | null {
  try {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    let offset = 0
    const magic = view.getUint32(offset, true); offset += 4
    if (magic !== PROXY_MAGIC) return null
    const version = view.getUint32(offset, true); offset += 4
    if (version !== PROXY_FORMAT_VERSION) return null
    const sampleRate = view.getUint32(offset, true); offset += 4
    const channels = view.getUint32(offset, true); offset += 4
    const frames = view.getUint32(offset, true); offset += 4
    const filePeak = view.getFloat32(offset, true); offset += 4
    const levelCount = view.getUint32(offset, true); offset += 4

    const levelMeta: { samplesPerPoint: number; points: number }[] = []
    for (let i = 0; i < levelCount; i++) {
      const samplesPerPoint = view.getUint32(offset, true); offset += 4
      const points = view.getUint32(offset, true); offset += 4
      levelMeta.push({ samplesPerPoint, points })
    }

    const levels: PyramidLevel[] = []
    for (const meta of levelMeta) {
      const min: Float32Array[] = []
      const max: Float32Array[] = []
      const rms: Float32Array[] = []
      for (let ch = 0; ch < channels; ch++) {
        const minArr = new Float32Array(meta.points)
        for (let i = 0; i < meta.points; i++) { minArr[i] = view.getFloat32(offset, true); offset += 4 }
        const maxArr = new Float32Array(meta.points)
        for (let i = 0; i < meta.points; i++) { maxArr[i] = view.getFloat32(offset, true); offset += 4 }
        const rmsArr = new Float32Array(meta.points)
        for (let i = 0; i < meta.points; i++) { rmsArr[i] = view.getFloat32(offset, true); offset += 4 }
        min.push(minArr); max.push(maxArr); rms.push(rmsArr)
      }
      levels.push({ samplesPerPoint: meta.samplesPerPoint, points: meta.points, min, max, rms })
    }

    return {
      sampleRate,
      channels,
      frames,
      duration: frames / Math.max(1, sampleRate),
      filePeak,
      levels
    }
  } catch (err) {
    logger.warn('WaveformProxy', 'Proxy-Datei ist beschaedigt oder unlesbar', err)
    return null
  }
}

/**
 * Laedt eine zuvor gespeicherte Pyramide von der Platte, falls vorhanden.
 * Aktualisiert bei Erfolg den "zuletzt genutzt"-Zeitstempel im Index.
 */
export function loadProxyFromDisk(fingerprint: string): PeakPyramid | null {
  try {
    const index = readIndex()
    const entry = index.entries[fingerprint]
    if (!entry) return null

    const filePath = path.join(getProxyDir(), entry.fileName)
    if (!fs.existsSync(filePath)) {
      delete index.entries[fingerprint]
      writeIndexAtomic(index)
      return null
    }

    const buffer = fs.readFileSync(filePath)
    const pyramid = deserializePyramid(buffer)
    if (!pyramid) {
      // Beschaedigte Datei: Eintrag entfernen, damit neu gebaut wird
      try { fs.unlinkSync(filePath) } catch { /* bereits weg */ }
      delete index.entries[fingerprint]
      writeIndexAtomic(index)
      return null
    }

    entry.lastUsedAt = Date.now()
    writeIndexAtomic(index)
    return pyramid
  } catch (err) {
    logger.warn('WaveformProxy', 'Proxy-Datei konnte nicht geladen werden', err)
    return null
  }
}

/**
 * Speichert eine frisch gebaute Pyramide auf Platte (Temp-Datei + Rename)
 * und traegt sie in den Index ein. Fehler hier sind nicht kritisch fuer die
 * Anzeige — die Pyramide bleibt im RAM-Cache nutzbar, auch wenn das
 * Schreiben scheitert (z. B. Datentraeger voll).
 */
export function saveProxyToDisk(fingerprint: string, sourcePath: string, pyramid: PeakPyramid): void {
  try {
    const index = readIndex()
    const existing = index.entries[fingerprint]
    const fileName = existing?.fileName || fingerprintToFileName(fingerprint)
    const targetPath = path.join(getProxyDir(), fileName)
    const tempPath = `${targetPath}.tmp`

    const buffer = serializePyramid(pyramid)
    fs.writeFileSync(tempPath, buffer)
    fs.renameSync(tempPath, targetPath)

    const now = Date.now()
    index.entries[fingerprint] = {
      fingerprint,
      sourcePath,
      fileName,
      createdAt: existing?.createdAt || now,
      lastUsedAt: now,
      byteSize: buffer.byteLength,
      projectPaths: existing?.projectPaths || []
    }
    writeIndexAtomic(index)
    logger.debug('WaveformProxy', 'Proxy-Datei gespeichert', { sourcePath, fileName, byteSize: buffer.byteLength })
  } catch (err) {
    logger.warn('WaveformProxy', 'Proxy-Datei konnte nicht gespeichert werden', err)
  }
}

/**
 * Verknuepft die Proxys der uebergebenen Quelldatei-Fingerprints mit einer
 * gespeicherten Projektdatei. Wird beim erfolgreichen Speichern eines
 * Projekts aufgerufen — dadurch ueberleben diese Proxys die automatische
 * Aufraeumung unabhaengig von ihrem Alter.
 */
export function linkProxiesToProject(fingerprints: string[], projectPath: string): void {
  if (fingerprints.length === 0) return
  try {
    const index = readIndex()
    let changed = false
    for (const fingerprint of fingerprints) {
      const entry = index.entries[fingerprint]
      if (!entry) continue
      if (!entry.projectPaths.includes(projectPath)) {
        entry.projectPaths.push(projectPath)
        changed = true
      }
    }
    if (changed) writeIndexAtomic(index)
  } catch (err) {
    logger.warn('WaveformProxy', 'Projekt-Verknuepfung fuer Proxys fehlgeschlagen', err)
  }
}

/**
 * Beim Programmstart aufzurufen: entfernt Projektverknuepfungen zu nicht
 * mehr existierenden Projektdateien, loescht unverknuepfte Proxys, die
 * aelter als 7 Tage sind, und begrenzt die Gesamtgroesse des Ordners
 * (LRU nach letzter Nutzung, unverknuepfte Eintraege zuerst).
 */
export function runProxyStoreMaintenance(): void {
  try {
    const index = readIndex()
    const now = Date.now()
    let changed = false

    for (const fingerprint of Object.keys(index.entries)) {
      const entry = index.entries[fingerprint]
      const remainingProjects = entry.projectPaths.filter((projectPath) => fs.existsSync(projectPath))
      if (remainingProjects.length !== entry.projectPaths.length) {
        entry.projectPaths = remainingProjects
        changed = true
      }
    }

    const deleteEntry = (fingerprint: string): void => {
      const entry = index.entries[fingerprint]
      if (!entry) return
      const filePath = path.join(getProxyDir(), entry.fileName)
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch { /* ignorieren */ }
      delete index.entries[fingerprint]
      changed = true
    }

    for (const fingerprint of Object.keys(index.entries)) {
      const entry = index.entries[fingerprint]
      const isUnreferenced = entry.projectPaths.length === 0
      const isStale = now - entry.lastUsedAt > MAX_PROXY_AGE_MS
      if (isUnreferenced && isStale) {
        deleteEntry(fingerprint)
      }
    }

    let totalBytes = Object.values(index.entries).reduce((sum, entry) => sum + entry.byteSize, 0)
    if (totalBytes > MAX_PROXY_STORE_BYTES) {
      const byRecency = (a: ProxyIndexEntry, b: ProxyIndexEntry) => a.lastUsedAt - b.lastUsedAt
      const unreferenced = Object.values(index.entries).filter((entry) => entry.projectPaths.length === 0).sort(byRecency)
      const referenced = Object.values(index.entries).filter((entry) => entry.projectPaths.length > 0).sort(byRecency)

      for (const entry of [...unreferenced, ...referenced]) {
        if (totalBytes <= MAX_PROXY_STORE_BYTES) break
        totalBytes -= entry.byteSize
        deleteEntry(entry.fingerprint)
      }
    }

    if (changed) {
      writeIndexAtomic(index)
    }
    logger.info('WaveformProxy', 'Proxy-Speicher aufgeraeumt', {
      entries: Object.keys(index.entries).length,
      totalBytes
    })
  } catch (err) {
    logger.warn('WaveformProxy', 'Aufraeumen des Proxy-Speichers fehlgeschlagen', err)
  }
}
