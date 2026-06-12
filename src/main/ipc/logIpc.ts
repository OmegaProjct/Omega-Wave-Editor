import { ipcMain, app, dialog } from 'electron'
import { logger, LogLevel } from '../logger'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Registriert alle IPC-Schnittstellen für das Logging-System und Feedback-System.
 */
export function registerLogIpc() {
  // Schreibt einen Eintrag ins Logfile
  ipcMain.handle('write-log', (_, level: LogLevel, moduleName: string, message: string, details?: any) => {
    logger.write(level, moduleName, message, details)
  })

  // Gibt den Pfad zur Logdatei zurück
  ipcMain.handle('get-log-path', () => {
    return logger.getLogPath()
  })

  // Öffnet den Ordner der Logdatei im Datei-Explorer
  ipcMain.handle('open-log-folder', async () => {
    await logger.openFolder()
  })

  // Gibt den Inhalt der Logdatei zurück (optional für bestimmte Datei)
  ipcMain.handle('get-log-content', (_, filename?: string) => {
    if (filename && path.basename(filename) !== filename) {
      throw new Error('Ungültiger Dateiname')
    }
    return logger.getLogContent(filename)
  })

  // Leert den Inhalt der Logdatei (optional für bestimmte Datei)
  ipcMain.handle('clear-log', (_, filename?: string) => {
    if (filename && path.basename(filename) !== filename) {
      throw new Error('Ungültiger Dateiname')
    }
    logger.clearLog(filename)
  })

  // Gibt alle verfügbaren Sitzungs-Logs zurück
  ipcMain.handle('get-session-logs', () => {
    return logger.listSessionLogs()
  })

  // Löscht ein spezifisches Sitzungs-Log physisch vom PC
  ipcMain.handle('delete-session-log', (_, filename: string) => {
    if (path.basename(filename) !== filename) {
      throw new Error('Ungültiger Dateiname')
    }
    return logger.deleteSessionLog(filename)
  })

  // Exportiert ein spezifisches Log über den Speichern-Dialog
  ipcMain.handle('export-session-log', async (_, filename: string) => {
    if (path.basename(filename) !== filename) {
      throw new Error('Ungültiger Dateiname')
    }
    const logDir = path.dirname(logger.getLogPath())
    const sourcePath = path.join(logDir, filename)
    
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Log-Datei exportieren',
      defaultPath: filename,
      filters: [
        { name: 'Protokolldateien (*.log)', extensions: ['log'] },
        { name: 'Alle Dateien (*.*)', extensions: ['*'] }
      ]
    })
    
    if (canceled || !filePath) return { success: false }
    
    try {
      fs.copyFileSync(sourcePath, filePath)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Speichert Feedback/Fehlerberichte lokal ab
  ipcMain.handle('submit-feedback', async (_, { title, type, text, logFilename, images }) => {
    try {
      const userDataPath = app.getPath('userData')
      const feedbackDir = path.join(userDataPath, 'feedback')
      if (!fs.existsSync(feedbackDir)) {
        fs.mkdirSync(feedbackDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/:/g, '-')
      const reportFolder = path.join(feedbackDir, `feedback_${timestamp}`)
      fs.mkdirSync(reportFolder, { recursive: true })

      // Metadaten als JSON speichern
      const metadata = {
        title,
        type,
        text,
        logFilename,
        timestamp: new Date().toISOString()
      }
      fs.writeFileSync(path.join(reportFolder, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8')

      // Log-Datei kopieren falls ausgewählt
      if (logFilename) {
        if (path.basename(logFilename) !== logFilename) {
          throw new Error('Ungültiger Dateiname für Log')
        }
        const logDir = path.dirname(logger.getLogPath())
        const logSource = path.join(logDir, logFilename)
        if (fs.existsSync(logSource)) {
          fs.copyFileSync(logSource, path.join(reportFolder, logFilename))
        }
      }

      // Bilder dekodieren und speichern
      if (Array.isArray(images)) {
        images.forEach((img: any, idx: number) => {
          const base64Data = img.dataUrl.replace(/^data:image\/\w+;base64,/, '')
          const buffer = Buffer.from(base64Data, 'base64')
          const safeName = `screenshot_${idx}_${path.basename(img.name)}`
          fs.writeFileSync(path.join(reportFolder, safeName), buffer)
        })
      }

      logger.info('System', 'Feedback/Bug-Report erfolgreich gespeichert', { folder: reportFolder })
      return { success: true, folder: reportFolder }
    } catch (err: any) {
      logger.error('System', 'Fehler beim Speichern des Feedbacks', err)
      return { success: false, error: err.message }
    }
  })
}
