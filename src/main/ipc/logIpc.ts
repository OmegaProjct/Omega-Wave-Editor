import { ipcMain } from 'electron'
import { logger, LogLevel } from '../logger'

/**
 * Registriert alle IPC-Schnittstellen für das Logging-System.
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

  // Gibt den Inhalt der Logdatei zurück
  ipcMain.handle('get-log-content', () => {
    return logger.getLogContent()
  })

  // Leert den Inhalt der Logdatei
  ipcMain.handle('clear-log', () => {
    logger.clearLog()
  })
}
