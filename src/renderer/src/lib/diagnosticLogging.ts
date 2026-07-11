export type DiagnosticLoggingCategory =
  | 'timeline'
  | 'performance'
  | 'menus'
  | 'settings'
  | 'modals'
  | 'popouts'
  | 'toolbar'

export type DiagnosticLoggingSettings = Record<DiagnosticLoggingCategory | 'enabled', boolean>

export const DEFAULT_DIAGNOSTIC_LOGGING_SETTINGS: DiagnosticLoggingSettings = {
  enabled: true,
  timeline: true,
  performance: true,
  menus: true,
  settings: true,
  modals: true,
  popouts: true,
  toolbar: true
}

let currentSettings: DiagnosticLoggingSettings = { ...DEFAULT_DIAGNOSTIC_LOGGING_SETTINGS }
let initialized = false

export function normalizeDiagnosticLoggingSettings(source: any): DiagnosticLoggingSettings {
  const candidate = source?.diagnosticLogging && typeof source.diagnosticLogging === 'object'
    ? source.diagnosticLogging
    : source

  return {
    ...DEFAULT_DIAGNOSTIC_LOGGING_SETTINGS,
    ...(candidate && typeof candidate === 'object' ? candidate : {})
  }
}

export function updateDiagnosticLoggingFromAppSettings(appSettings: any) {
  currentSettings = normalizeDiagnosticLoggingSettings(appSettings?.diagnosticLogging)
}

export function initDiagnosticLogging() {
  if (initialized) return
  initialized = true

  window.api?.getSettings?.()
    .then(updateDiagnosticLoggingFromAppSettings)
    .catch(() => {})

  window.addEventListener('SETTINGS_UPDATED', ((event: CustomEvent<any>) => {
    updateDiagnosticLoggingFromAppSettings(event.detail)
  }) as EventListener)
}

export function shouldLogDiagnostic(category: DiagnosticLoggingCategory): boolean {
  return currentSettings.enabled !== false && currentSettings[category] !== false
}

export function writeDiagnosticLog(
  category: DiagnosticLoggingCategory,
  message: string,
  details?: Record<string, unknown>,
  level: 'debug' | 'info' | 'warn' | 'error' = 'debug'
) {
  if (!shouldLogDiagnostic(category)) return

  window.api?.log?.(level, 'UI-Diagnostics', message, {
    category,
    at: new Date().toISOString(),
    ...details
  }).catch(() => {})
}
