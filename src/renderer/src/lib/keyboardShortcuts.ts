export type ShortcutAction =
  | 'newProject'
  | 'openProject'
  | 'saveProject'
  | 'saveProjectAs'
  | 'exportAudio'
  | 'openSettings'
  | 'playPause'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'deleteSelection'
  | 'deleteSelectionAlt'
  | 'splitAtPlayhead'
  | 'trimStart'
  | 'trimStartAlt'
  | 'trimEnd'
  | 'zoomIn'
  | 'zoomOut'
  | 'normalizePeak'
  | 'toggleAutomation'
  | 'resetEffects'
  | 'saveEffectsPreset'
  | 'pasteEffects'
  // Neue Wiedergabe- und Navigationssteuerungen
  | 'setPlaybackStart'
  | 'playAtPosition'
  | 'playBackward'
  | 'playForward'
  | 'jumpBackward'
  | 'jumpForward'
  // Zoom & Scroll Modifikatoren + Alles Markieren
  | 'scrollVertical'
  | 'zoomVertical'
  | 'selectAllRegions'

export type KeyboardShortcuts = Record<ShortcutAction, string>

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  newProject: 'Ctrl+N',
  openProject: 'Ctrl+O',
  saveProject: 'Ctrl+S',
  saveProjectAs: 'Ctrl+Shift+S',
  exportAudio: 'Ctrl+E',
  openSettings: 'Ctrl+P',
  playPause: 'Space',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  cut: 'Ctrl+X',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  deleteSelection: 'Delete',
  deleteSelectionAlt: 'Backspace',
  splitAtPlayhead: 'T',
  trimStart: 'Z',
  trimStartAlt: 'C',
  trimEnd: 'U',
  zoomIn: 'Ctrl+Plus',
  zoomOut: 'Ctrl+Minus',
  normalizePeak: 'Alt+N',
  toggleAutomation: 'Alt+K',
  resetEffects: 'Ctrl+Alt+Plus',
  saveEffectsPreset: 'Shift+Plus',
  pasteEffects: 'Shift+Minus',
  // Standardbelegungen fuer die neuen Steuerungen
  setPlaybackStart: 'ArrowDown',
  playAtPosition: 'K',
  playBackward: 'J',
  playForward: 'L',
  jumpBackward: 'ArrowLeft',
  jumpForward: 'ArrowRight',
  scrollVertical: 'Shift',
  zoomVertical: 'Ctrl+Shift',
  selectAllRegions: 'Shift+A'
}

export const SHORTCUT_DEFINITIONS: { id: ShortcutAction; label: string; group: string }[] = [
  { id: 'newProject', label: 'Neues Projekt', group: 'Datei' },
  { id: 'openProject', label: 'Projekt öffnen', group: 'Datei' },
  { id: 'saveProject', label: 'Projekt speichern', group: 'Datei' },
  { id: 'saveProjectAs', label: 'Projekt speichern unter', group: 'Datei' },
  { id: 'exportAudio', label: 'Audio exportieren', group: 'Datei' },
  { id: 'openSettings', label: 'Einstellungen öffnen', group: 'Datei' },
  { id: 'playPause', label: 'Wiedergabe starten / stoppen', group: 'Transport' },
  { id: 'undo', label: 'Rückgängig', group: 'Bearbeiten' },
  { id: 'redo', label: 'Wiederholen', group: 'Bearbeiten' },
  { id: 'cut', label: 'Auswahl ausschneiden', group: 'Bearbeiten' },
  { id: 'copy', label: 'Auswahl kopieren', group: 'Bearbeiten' },
  { id: 'paste', label: 'Einfügen', group: 'Bearbeiten' },
  { id: 'deleteSelection', label: 'Auswahl löschen', group: 'Bearbeiten' },
  { id: 'deleteSelectionAlt', label: 'Auswahl löschen (Alternative)', group: 'Bearbeiten' },
  { id: 'splitAtPlayhead', label: 'Clip am Playhead teilen', group: 'Timeline' },
  { id: 'trimStart', label: 'Clip-Anfang bis Playhead schneiden', group: 'Timeline' },
  { id: 'trimStartAlt', label: 'Clip-Anfang schneiden (Alternative)', group: 'Timeline' },
  { id: 'trimEnd', label: 'Clip-Ende ab Playhead schneiden', group: 'Timeline' },
  { id: 'zoomIn', label: 'Zoom vergrößern / Effekt-Preset laden', group: 'Timeline' },
  { id: 'zoomOut', label: 'Zoom verkleinern', group: 'Timeline' },
  { id: 'normalizePeak', label: 'Ausgewählten Clip normalisieren', group: 'Effekte' },
  { id: 'toggleAutomation', label: 'Automation ein-/ausblenden', group: 'Effekte' },
  { id: 'resetEffects', label: 'Effekte zurücksetzen', group: 'Effekte' },
  { id: 'saveEffectsPreset', label: 'Effekt-Preset speichern', group: 'Effekte' },
  { id: 'pasteEffects', label: 'Effekte einfügen', group: 'Effekte' },
  // Neue Definitionen fuer die Transport-Gruppe
  { id: 'setPlaybackStart', label: 'Wiedergabe-Startposition setzen', group: 'Transport' },
  { id: 'playAtPosition', label: 'Wiedergabe ab aktueller Position starten', group: 'Transport' },
  { id: 'playBackward', label: 'Rückwärts abspielen', group: 'Transport' },
  { id: 'playForward', label: 'Vorwärts abspielen', group: 'Transport' },
  { id: 'jumpBackward', label: 'Zurückspringen', group: 'Transport' },
  { id: 'jumpForward', label: 'Vorwärtsspringen', group: 'Transport' },
  { id: 'scrollVertical', label: 'Vertikales Scrollen (Mausrad-Modifikator)', group: 'Timeline' },
  { id: 'zoomVertical', label: 'Vertikaler Zoom (Mausrad-Modifikator)', group: 'Timeline' },
  { id: 'selectAllRegions', label: 'Alle Audio-Objekte markieren', group: 'Timeline' }
]

const modifierKeys = new Set(['Control', 'Shift', 'Alt', 'Meta'])

export function normalizeKeyboardShortcuts(saved: unknown): KeyboardShortcuts {
  const normalized: KeyboardShortcuts = { ...DEFAULT_KEYBOARD_SHORTCUTS }
  if (!saved || typeof saved !== 'object') return normalized

  for (const key of Object.keys(DEFAULT_KEYBOARD_SHORTCUTS) as ShortcutAction[]) {
    const value = (saved as Partial<KeyboardShortcuts>)[key]
    if (typeof value === 'string' && value.trim()) {
      normalized[key] = value.trim()
    }
  }

  return normalized
}

function normalizeEventKey(event: KeyboardEvent): string {
  if (event.code === 'Space') return 'Space'
  if (event.code === 'NumpadAdd') return 'Plus'
  if (event.code === 'NumpadSubtract') return 'Minus'
  if (event.code === 'Minus') return 'Minus'

  if (event.key === '+') return 'Plus'
  if (event.key === '=' && event.shiftKey) return 'Plus'
  if (event.key === '-') return 'Minus'
  if (event.key === ' ') return 'Space'

  if (event.key.length === 1) {
    return event.key.toUpperCase()
  }

  return event.key
}

export function eventToShortcut(event: KeyboardEvent): string {
  const key = normalizeEventKey(event)
  if (!key) return ''

  const parts: string[] = []
  const hasCtrl = event.ctrlKey || key === 'Control'
  const hasAlt = event.altKey || key === 'Alt'
  const hasMeta = event.metaKey || key === 'Meta'
  const hasShift = event.shiftKey || key === 'Shift'

  if (hasCtrl) parts.push('Ctrl')
  if (hasAlt) parts.push('Alt')
  
  if (hasShift) {
    if (key !== 'Plus') {
      parts.push('Shift')
    } else if (!hasCtrl && !hasAlt && !hasMeta) {
      parts.push('Shift')
    }
  }
  
  if (hasMeta) parts.push('Meta')
  
  if (!modifierKeys.has(key)) {
    parts.push(key)
  }

  return parts.join('+')
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string | undefined): boolean {
  if (!shortcut) return false
  return eventToShortcut(event).toLowerCase() === shortcut.toLowerCase()
}

export function matchesMouseModifiers(e: MouseEvent | WheelEvent, shortcut: string | undefined): boolean {
  if (!shortcut) return false
  const parts = shortcut.split('+').map(p => p.trim().toLowerCase())
  const requiresCtrl = parts.includes('ctrl')
  const requiresShift = parts.includes('shift')
  const requiresAlt = parts.includes('alt')
  const requiresMeta = parts.includes('meta')
  
  return (
    e.ctrlKey === requiresCtrl &&
    e.shiftKey === requiresShift &&
    e.altKey === requiresAlt &&
    e.metaKey === requiresMeta
  )
}

export function formatShortcut(shortcut: string | undefined): string {
  if (!shortcut) return 'Nicht belegt'

  return shortcut
    .split('+')
    .filter(Boolean)
    .map(part => {
      switch (part) {
        case 'Ctrl':
          return 'Strg'
        case 'Shift':
          return 'Umschalt'
        case 'Alt':
          return 'Alt'
        case 'Meta':
          return 'Meta'
        case 'Space':
          return 'Leertaste'
        case 'Delete':
          return 'Entf'
        case 'Plus':
          return '+'
        case 'Minus':
          return '-'
        case 'ArrowUp':
          return 'Pfeil hoch'
        case 'ArrowDown':
          return 'Pfeil runter'
        case 'ArrowLeft':
          return 'Pfeil links'
        case 'ArrowRight':
          return 'Pfeil rechts'
        default:
          return part
      }
    })
    .join(' + ')
}
