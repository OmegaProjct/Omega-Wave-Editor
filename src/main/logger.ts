import { app, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private logFilePath: string = ''
  private initialized: boolean = false

  private getFormattedTimestamp(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  }

  /**
   * Initialisiert das Logging-System.
   * Bestimmt den Pfad der Logdatei (sitzungsbasiert) und bereinigt alte Logs.
   */
  init() {
    if (this.initialized) return
    try {
      let userDataPath = ''
      try {
        userDataPath = app.getPath('userData')
      } catch {
        // Fallback für Tests oder unvollständig initialisierte Umgebungen
        userDataPath = path.join(
          process.env.APPDATA || os.homedir(),
          'OmegaProjects',
          'Omega Wave Editor'
        )
      }

      const logDir = path.join(userDataPath, 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }

      // Sitzungsbasierter Logpfad
      this.logFilePath = path.join(logDir, `session_${this.getFormattedTimestamp()}.log`)

      // Bereinigung alter Log-Dateien (behalte nur die neuesten 30)
      try {
        const files = fs.readdirSync(logDir)
          .filter(f => f.startsWith('session_') && f.endsWith('.log'))
          .map(f => ({
            name: f,
            path: path.join(logDir, f),
            mtime: fs.statSync(path.join(logDir, f)).mtimeMs
          }))
          .sort((a, b) => b.mtime - a.mtime)
        
        if (files.length > 30) {
          const toDelete = files.slice(30)
          for (const file of toDelete) {
            try {
              fs.unlinkSync(file.path)
            } catch (err) {
              console.error(`Fehler beim Löschen des alten Logs ${file.name}:`, err)
            }
          }
        }
      } catch (err) {
        console.error('Fehler bei der automatischen Log-Bereinigung:', err)
      }

      this.initialized = true
      this.info('System', '--- LOGGING SYSTEM INITIALIZED ---')
    } catch (e) {
      console.error('Logging-System konnte nicht initialisiert werden:', e)
    }
  }

  getLogPath(): string {
    if (!this.initialized) this.init()
    return this.logFilePath
  }

  /**
   * Schreibt einen Log-Eintrag in die Log-Datei und gibt diesen auf der Konsole aus.
   */
  write(level: LogLevel, moduleName: string, message: string, details?: any) {
    if (!this.initialized) {
      this.init()
    }

    const timestamp = new Date().toISOString()
    const levelStr = level.toUpperCase().padEnd(5)
    const moduleStr = moduleName.toUpperCase()

    let detailStr = ''
    if (details !== undefined) {
      if (details instanceof Error) {
        detailStr = `\n${details.stack || details.message}`
      } else if (typeof details === 'object') {
        try {
          detailStr = ` | Details: ${JSON.stringify(details)}`
        } catch {
          detailStr = ` | Details: [Unserialisierbares Objekt]`
        }
      } else {
        detailStr = ` | Details: ${details}`
      }
    }

    const logLine = `[${timestamp}] [${levelStr}] [${moduleStr}] ${message}${detailStr}\n`

    // Ausgabe auf der Standardkonsole (im MCP-Modus auf stderr umleiten, um stdout nicht zu stören)
    const isMcp = process.argv.includes('--mcp') || process.env.OMEGA_MCP_MODE === 'true'
    if (level === 'error' || isMcp) {
      console.error(logLine.trim())
    } else if (level === 'warn') {
      console.warn(logLine.trim())
    } else {
      console.log(logLine.trim())
    }

    // In die Datei schreiben
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, logLine, 'utf-8')
      } catch (e) {
        console.error('Fehler beim Schreiben in die Log-Datei:', e)
      }
    }
  }

  debug(moduleName: string, message: string, details?: any) {
    this.write('debug', moduleName, message, details)
  }

  info(moduleName: string, message: string, details?: any) {
    this.write('info', moduleName, message, details)
  }

  warn(moduleName: string, message: string, details?: any) {
    this.write('warn', moduleName, message, details)
  }

  error(moduleName: string, message: string, details?: any) {
    this.write('error', moduleName, message, details)
  }

  /**
   * Öffnet den Ordner, der die Logdatei enthält, im System-Explorer.
   */
  async openFolder() {
    if (this.logFilePath) {
      const logDir = path.dirname(this.logFilePath)
      if (fs.existsSync(logDir)) {
        await shell.openPath(logDir)
      }
    }
  }

  /**
   * Setzt den Inhalt der Logdatei zurück.
   */
  clearLog(filename?: string) {
    if (filename && path.basename(filename) !== filename) {
      throw new Error('Ungültiger Dateiname')
    }
    const targetFile = filename ? path.join(path.dirname(this.logFilePath), filename) : this.logFilePath
    if (targetFile && fs.existsSync(targetFile)) {
      try {
        fs.writeFileSync(targetFile, '', 'utf-8')
        this.info('System', `--- LOG ZURÜCKGESETZT: ${path.basename(targetFile)} ---`)
      } catch (e) {
        this.error('System', `Fehler beim Leeren der Logdatei ${path.basename(targetFile)}`, e)
      }
    }
  }

  /**
   * Gibt den vollständigen Dateiinhalt zurück.
   */
  getLogContent(filename?: string): string {
    if (filename && path.basename(filename) !== filename) {
      throw new Error('Ungültiger Dateiname')
    }
    const targetFile = filename ? path.join(path.dirname(this.logFilePath), filename) : this.logFilePath
    if (targetFile && fs.existsSync(targetFile)) {
      try {
        return fs.readFileSync(targetFile, 'utf-8')
      } catch (e) {
        return `Fehler beim Lesen der Log-Datei: ${e}`
      }
    }
    return 'Log-Datei existiert nicht.'
  }

  /**
   * Gibt eine Liste aller Sitzungs-Logdateien zurück.
   */
  listSessionLogs(): { filename: string; size: number; mtime: number }[] {
    if (!this.initialized) this.init()
    const logDir = path.dirname(this.logFilePath)
    if (!fs.existsSync(logDir)) return []
    try {
      const files = fs.readdirSync(logDir)
      return files
        .filter(f => f.startsWith('session_') && f.endsWith('.log'))
        .map(f => {
          const filePath = path.join(logDir, f)
          const stats = fs.statSync(filePath)
          return {
            filename: f,
            size: stats.size,
            mtime: stats.mtimeMs
          }
        })
        .sort((a, b) => b.mtime - a.mtime) // Newest first
    } catch (e) {
      console.error('Failed to list session logs:', e)
      return []
    }
  }

  /**
   * Löscht eine Protokolldatei physisch vom PC.
   */
  deleteSessionLog(filename: string): boolean {
    if (!this.initialized) this.init()
    const logDir = path.dirname(this.logFilePath)
    const targetPath = path.join(logDir, filename)
    
    // Sicherheitsprüfung
    if (path.basename(filename) !== filename || !filename.endsWith('.log')) {
      return false
    }

    try {
      if (fs.existsSync(targetPath)) {
        if (targetPath === this.logFilePath) {
          this.clearLog()
          return true
        }
        fs.unlinkSync(targetPath)
        return true
      }
      return false
    } catch (e) {
      console.error(`Failed to delete log ${filename}:`, e)
      return false
    }
  }
}

export const logger = new Logger()
