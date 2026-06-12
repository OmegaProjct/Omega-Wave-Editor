import { app, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private logFilePath: string = ''
  private initialized: boolean = false

  /**
   * Initialisiert das Logging-System.
   * Bestimmt den Pfad der Logdatei und führt ggf. eine Dateirotation durch.
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
      this.logFilePath = path.join(logDir, 'app.log')

      // Dateirotation bei Dateigröße > 5 MB
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath)
        if (stats.size > 5 * 1024 * 1024) {
          const oldLogPath = path.join(logDir, 'app.log.old')
          if (fs.existsSync(oldLogPath)) {
            try {
              fs.unlinkSync(oldLogPath)
            } catch (err) {
              console.error('Fehler beim Löschen des alten Logs:', err)
            }
          }
          try {
            fs.renameSync(this.logFilePath, oldLogPath)
          } catch (err) {
            console.error('Fehler bei der Dateirotation:', err)
          }
        }
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
  clearLog() {
    if (this.logFilePath) {
      try {
        fs.writeFileSync(this.logFilePath, '', 'utf-8')
        this.info('System', '--- LOG ZURÜCKGESETZT ---')
      } catch (e) {
        this.error('System', 'Fehler beim Leeren der Logdatei', e)
      }
    }
  }

  /**
   * Gibt den vollständigen Dateiinhalt zurück.
   */
  getLogContent(): string {
    if (this.logFilePath && fs.existsSync(this.logFilePath)) {
      try {
        return fs.readFileSync(this.logFilePath, 'utf-8')
      } catch (e) {
        return `Fehler beim Lesen der Log-Datei: ${e}`
      }
    }
    return 'Log-Datei existiert nicht.'
  }
}

export const logger = new Logger()
