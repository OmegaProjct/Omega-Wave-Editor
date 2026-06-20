import { useState, useCallback, useEffect, useRef } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileExplorer } from './components/FileExplorer'
import { Timeline } from './components/Timeline'
import { MenuBar } from './components/MenuBar'
import { SettingsModal, type Tab as SettingsTab } from './components/SettingsModal'
import { EffectsPanel } from './components/EffectsPanel'
import { ExportModal } from './components/ExportModal'
import { MessageModal, ModalType } from './components/MessageModal'
import { ManualModal } from './components/ManualModal'
import { AboutModal } from './components/AboutModal'
import ChangelogModal from './components/ChangelogModal'
import { LogViewerModal } from './components/LogViewerModal'
import { StartDashboard } from './components/StartDashboard'
import { SaveConfirmationModal } from './components/SaveConfirmationModal'
import { UpdateModal } from './components/UpdateModal'
import { SymbolManagerModal } from './components/SymbolManagerModal'
import { useHistory } from './lib/useHistory'
import { ProjectManager } from './lib/ProjectManager'
import { AudioEngine } from './lib/AudioEngine'
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  KeyboardShortcuts,
  matchesShortcut,
  normalizeKeyboardShortcuts
} from './lib/keyboardShortcuts'
import appIcon from './assets/app_icon.png'
import { Loader2, ExternalLink, PanelTopClose, PanelTopOpen, Lock, Unlock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type WindowLayoutPreset = {
  mainVertical: number[]
  topHorizontal: number[]
  panelPopoutState?: Partial<Record<PanelPopoutId, boolean>>
  panelLayoutLocked?: boolean
  popoutBounds?: Record<string, any>
  mainWindowBounds?: { x: number; y: number; width: number; height: number } | null
  savedAt: string
}


const DEFAULT_WINDOW_LAYOUT: WindowLayoutPreset = {
  mainVertical: [50, 50],
  topHorizontal: [30, 70],
  panelPopoutState: {
    'panel-file-explorer': false,
    'panel-effects': false,
    'panel-timeline': false
  },
  panelLayoutLocked: true,
  savedAt: ''
}

const WINDOW_LAYOUTS_STORAGE_KEY = 'omega.windowLayouts.v1'
const CURRENT_WINDOW_LAYOUT_STORAGE_KEY = 'omega.windowLayout.current.v1'
const ACTIVE_WINDOW_LAYOUT_NAME_STORAGE_KEY = 'omega.windowLayout.activeName.v1'
const PANEL_LAYOUT_LOCKED_STORAGE_KEY = 'omega.panelLayout.locked.v1'
const PANEL_POPOUT_SNAPSHOT_STORAGE_KEY = 'omega.panelPopout.snapshot.v1'
const PANEL_POPOUT_ACTION_STORAGE_KEY = 'omega.panelPopout.action.v1'
const PANEL_POPOUT_STATE_STORAGE_KEY = 'omega.panelPopout.state.v1'
const PANEL_LAYOUT_SNAP_THRESHOLD = 3.5
const MAIN_VERTICAL_SNAP_POINTS = [25, 30, 33, 40, 50, 60, 67, 70, 75]
const TOP_HORIZONTAL_SNAP_POINTS = [20, 25, 30, 33, 40, 50, 60, 67, 70, 75, 80]

type PanelPopoutId = 'panel-file-explorer' | 'panel-effects' | 'panel-timeline'
const ALL_PANEL_POPOUT_IDS: PanelPopoutId[] = ['panel-file-explorer', 'panel-effects', 'panel-timeline']

function snapPanelLayout(layout: number[], snapPoints: number[]): number[] {
  if (!Array.isArray(layout) || layout.length !== 2) {
    return layout
  }

  const firstPanelSize = layout[0]
  let bestSnapPoint = firstPanelSize
  let bestDistance = PANEL_LAYOUT_SNAP_THRESHOLD + 1

  snapPoints.forEach((snapPoint) => {
    const distance = Math.abs(firstPanelSize - snapPoint)
    if (distance < bestDistance) {
      bestDistance = distance
      bestSnapPoint = snapPoint
    }
  })

  if (bestDistance > PANEL_LAYOUT_SNAP_THRESHOLD) {
    return layout
  }

  const secondPanelSize = Math.max(0, 100 - bestSnapPoint)
  return [bestSnapPoint, secondPanelSize]
}

function getMinDistanceToSnapPoints(layout: number[], snapPoints: number[]): number {
  if (!Array.isArray(layout) || layout.length !== 2) {
    return Infinity
  }
  const firstPanelSize = layout[0]
  let minDistance = Infinity
  snapPoints.forEach((snapPoint) => {
    const distance = Math.abs(firstPanelSize - snapPoint)
    if (distance < minDistance) {
      minDistance = distance
    }
  })
  return minDistance
}

function getClosestSnapPoint(layout: number[], snapPoints: number[]): number | null {
  if (!Array.isArray(layout) || layout.length !== 2 || snapPoints.length === 0) {
    return null
  }

  const firstPanelSize = layout[0]
  let closestSnapPoint = snapPoints[0]
  let minDistance = Math.abs(firstPanelSize - closestSnapPoint)

  snapPoints.forEach((snapPoint) => {
    const distance = Math.abs(firstPanelSize - snapPoint)
    if (distance < minDistance) {
      minDistance = distance
      closestSnapPoint = snapPoint
    }
  })

  return closestSnapPoint
}

async function captureCurrentWindowLayoutSnapshot(
  getCurrentWindowLayout: () => WindowLayoutPreset,
  api: typeof window.api
): Promise<WindowLayoutPreset> {
  let popoutBounds: Record<string, any> = {}
  let mainWindowBounds: { x: number; y: number; width: number; height: number } | null = null

  try {
    const allBounds = await api.getPopoutBounds()
    const targetPanels = ['panel-file-explorer', 'panel-effects', 'panel-timeline']
    for (const panelId of targetPanels) {
      if (allBounds && allBounds[panelId]) {
        popoutBounds[panelId] = allBounds[panelId]
      }
    }
  } catch (err) {
    console.error('Fehler beim Abrufen der Popout-Bounds:', err)
  }

  try {
    mainWindowBounds = await api.getMainWindowBounds()
  } catch (err) {
    console.error('Fehler beim Abrufen der Hauptfenster-Bounds:', err)
  }

  const layout = getCurrentWindowLayout()
  layout.popoutBounds = popoutBounds
  layout.mainWindowBounds = mainWindowBounds
  return layout
}

function logTimelineChanges(oldTracks: any[], newTracks: any[]) {
  if (!oldTracks || !newTracks) return

  try {
    // 1. Spurenanzahl geändert
    if (newTracks.length !== oldTracks.length) {
      window.api.log('info', 'Timeline', `Spurenanzahl geändert von ${oldTracks.length} auf ${newTracks.length}`)
    }

    // 2. Einzelne Spuren vergleichen
    newTracks.forEach((newTrack, index) => {
      const oldTrack = oldTracks.find(t => t.id === newTrack.id)
      if (!oldTrack) {
        window.api.log('info', 'Timeline', `Neue Spur hinzugefügt: ID=${newTrack.id}, Name=${newTrack.name || 'Unbenannt'}`)
        return
      }

      const trackName = newTrack.name || oldTrack.name || `Spur ${index + 1}`
      if (newTrack.name !== oldTrack.name) {
        window.api.log('info', 'Timeline', `Spur ${index + 1} umbenannt von '${oldTrack.name}' zu '${newTrack.name}'`)
      }
      if (newTrack.muted !== oldTrack.muted) {
        window.api.log('info', 'Timeline', `Spur '${trackName}': Mute geändert von ${oldTrack.muted} auf ${newTrack.muted}`)
      }
      if (newTrack.solo !== oldTrack.solo) {
        window.api.log('info', 'Timeline', `Spur '${trackName}': Solo geändert von ${oldTrack.solo} auf ${newTrack.solo}`)
      }
      if (newTrack.locked !== oldTrack.locked) {
        window.api.log('info', 'Timeline', `Spur '${trackName}': Sperrung geändert von ${oldTrack.locked} auf ${newTrack.locked}`)
      }
      if (Math.abs(newTrack.volume - oldTrack.volume) > 0.001) {
        window.api.log('info', 'Timeline', `Spur '${trackName}': Lautstärke geändert von ${oldTrack.volume.toFixed(2)} auf ${newTrack.volume.toFixed(2)}`)
      }

      // Audio-Objekte (Regions) vergleichen
      const oldRegions = oldTrack.regions || []
      const newRegions = newTrack.regions || []

      // Neue oder geänderte Objekte
      newRegions.forEach((newReg: any) => {
        const oldReg = oldRegions.find((r: any) => r.id === newReg.id)
        const regName = newReg.name || newReg.file?.name || 'Unbekanntes Audio'
        const groupSuffix = newReg.groupId ? ` [Gruppe: ${newReg.groupId}]` : ''
        
        if (!oldReg) {
          // Prüfe, ob dieses Objekt von einer anderen Spur hierher verschoben wurde
          let movedFromTrackName = ''
          oldTracks.forEach(ot => {
            if (ot.id !== newTrack.id && (ot.regions || []).some((r: any) => r.id === newReg.id)) {
              movedFromTrackName = ot.name || `Spur ${ot.index}`
            }
          })

          if (movedFromTrackName) {
            window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} von Spur '${movedFromTrackName}' in Spur '${trackName}' verschoben (bei ${newReg.startPos.toFixed(3)}s)`)
          } else {
            window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} in Spur '${trackName}' hinzugefügt bei ${newReg.startPos.toFixed(3)}s (Dauer: ${newReg.duration.toFixed(3)}s)`)
          }
          return
        }

        // Positions- und Dauer-Änderungen prüfen
        if (Math.abs(newReg.startPos - oldReg.startPos) > 0.0001) {
          const delta = newReg.startPos - oldReg.startPos
          const deltaStr = delta > 0 ? `+${delta.toFixed(3)}s` : `${delta.toFixed(3)}s`
          window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} in Spur '${trackName}' verschoben: ${oldReg.startPos.toFixed(3)}s -> ${newReg.startPos.toFixed(3)}s (Verschiebung: ${deltaStr})`)
        }
        if (Math.abs(newReg.duration - oldReg.duration) > 0.0001) {
          const delta = newReg.duration - oldReg.duration
          const deltaStr = delta > 0 ? `+${delta.toFixed(3)}s` : `${delta.toFixed(3)}s`
          window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} in Spur '${trackName}' Dauer geändert: ${oldReg.duration.toFixed(3)}s -> ${newReg.duration.toFixed(3)}s (Änderung: ${deltaStr})`)
        }
        if (Math.abs((newReg.sourceOffset || 0) - (oldReg.sourceOffset || 0)) > 0.0001) {
          window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} in Spur '${trackName}' Start-Offset geändert: ${(oldReg.sourceOffset || 0).toFixed(3)}s -> ${(newReg.sourceOffset || 0).toFixed(3)}s`)
        }
        if (Math.abs((newReg.gain || 1) - (oldReg.gain || 1)) > 0.001) {
          window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} in Spur '${trackName}' Gain geändert: ${(oldReg.gain || 1.0).toFixed(2)} -> ${(newReg.gain || 1.0).toFixed(2)}`)
        }
        if (Math.abs((newReg.fadeIn || 0) - (oldReg.fadeIn || 0)) > 0.0001 || Math.abs((newReg.fadeOut || 0) - (oldReg.fadeOut || 0)) > 0.0001) {
          window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} in Spur '${trackName}' Fades geändert: Einblenden=${(newReg.fadeIn || 0).toFixed(3)}s, Ausblenden=${(newReg.fadeOut || 0).toFixed(3)}s`)
        }
        if (newReg.stereoMode !== oldReg.stereoMode) {
          window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} in Spur '${trackName}' Stereo-Modus geändert: ${oldReg.stereoMode || 'stereo'} -> ${newReg.stereoMode || 'stereo'}`)
        }
      })

      // Gelöschte Objekte
      oldRegions.forEach((oldReg: any) => {
        const newReg = newRegions.find((r: any) => r.id === oldReg.id)
        if (!newReg) {
          // Nur loggen, wenn das Objekt nicht in eine andere Spur verschoben wurde
          const isMovedToOtherTrack = newTracks.some(nt => (nt.regions || []).some((r: any) => r.id === oldReg.id))
          if (!isMovedToOtherTrack) {
            const regName = oldReg.name || oldReg.file?.name || 'Unbekanntes Audio'
            const groupSuffix = oldReg.groupId ? ` [Gruppe: ${oldReg.groupId}]` : ''
            window.api.log('info', 'Timeline', `Audio-Objekt '${regName}'${groupSuffix} aus Spur '${trackName}' entfernt`)
          }
        }
      })
    })

    // Gelöschte Spuren
    oldTracks.forEach((oldTrack) => {
      const newTrack = newTracks.find(t => t.id === oldTrack.id)
      if (!newTrack) {
        window.api.log('info', 'Timeline', `Spur '${oldTrack.name || 'Unbenannt'}' (ID=${oldTrack.id}) wurde gelöscht`)
      }
    })
  } catch (err) {
    console.error('Fehler bei logTimelineChanges:', err)
  }
}

function App(): JSX.Element {
  const { i18n } = useTranslation()
  const windowType = new URLSearchParams(window.location.search).get('window')
  const isPanelPopoutWindow = windowType === 'panel-file-explorer' || windowType === 'panel-effects' || windowType === 'panel-timeline'
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('Projekteinstellungen')
  const [showExport, setShowExport] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<any | null>(null)
  const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcuts>(DEFAULT_KEYBOARD_SHORTCUTS)
  const [showSymbolManager, setShowSymbolManager] = useState(false)
  
  // Custom Modals & Dashboard States
  const [showStartDashboard, setShowStartDashboard] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [activeUpdateInfo, setActiveUpdateInfo] = useState<any | null>(null)
  
  // Project & System Settings States
  const [isDirty, setIsDirty] = useState(false)
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null)
  const [maxUndoSteps, setMaxUndoSteps] = useState(50)
  const [autoSaveInterval, setAutoSaveInterval] = useState(10)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [windowLayouts, setWindowLayouts] = useState<Record<string, WindowLayoutPreset>>({})
  const [activeWindowLayoutName, setActiveWindowLayoutName] = useState<string | null>(null)
  const [panelLayoutLocked, setPanelLayoutLocked] = useState(true)
  const [panelPopoutState, setPanelPopoutState] = useState<Record<PanelPopoutId, boolean>>({
    'panel-file-explorer': false,
    'panel-effects': false,
    'panel-timeline': false
  })
  const [isDraggingMain, setIsDraggingMain] = useState(false)
  const [isDraggingTop, setIsDraggingTop] = useState(false)
  const [mainLayout, setMainLayout] = useState<number[]>([50, 50])
  const [topLayout, setTopLayout] = useState<number[]>([30, 70])
  // Global Modal State
  const [modalConfig, setModalConfig] = useState<{ 
    type: ModalType, 
    title: string, 
    message: string, 
    onConfirm?: (checkboxChecked?: boolean) => void,
    checkboxLabel?: string,
    defaultCheckboxChecked?: boolean
  } | null>(null)

  // Initial Tracks
  const initialTracks = [
    { id: '1', index: 1, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '2', index: 2, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '3', index: 3, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '4', index: 4, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
  ];

  const { state: tracks, push: pushTracks, undo, redo } = useHistory(initialTracks, maxUndoSteps);

  const tracksRef = useRef(tracks);
  const mainPanelGroupRef = useRef<any>(null)
  const topPanelGroupRef = useRef<any>(null)
  const restoredPanelPopoutsRef = useRef<Set<PanelPopoutId>>(new Set())
  const snappingMainLayoutRef = useRef(false)
  const snappingTopLayoutRef = useRef(false)

  const getCurrentWindowLayout = useCallback((): WindowLayoutPreset => {
    const mainVertical = mainPanelGroupRef.current?.getLayout?.() || DEFAULT_WINDOW_LAYOUT.mainVertical
    const topHorizontal = topPanelGroupRef.current?.getLayout?.() || DEFAULT_WINDOW_LAYOUT.topHorizontal
    return {
      mainVertical,
      topHorizontal,
      panelPopoutState,
      panelLayoutLocked,
      savedAt: new Date().toISOString()
    }
  }, [panelLayoutLocked, panelPopoutState])

  const persistCurrentWindowLayout = useCallback((layout?: WindowLayoutPreset) => {
    const snapshot = layout || getCurrentWindowLayout()
    localStorage.setItem(CURRENT_WINDOW_LAYOUT_STORAGE_KEY, JSON.stringify(snapshot))
  }, [getCurrentWindowLayout])

  const applyWindowLayout = useCallback((layout: WindowLayoutPreset, persistCurrent: boolean = true) => {
    requestAnimationFrame(() => {
      mainPanelGroupRef.current?.setLayout?.(layout.mainVertical)
      topPanelGroupRef.current?.setLayout?.(layout.topHorizontal)
      setMainLayout(layout.mainVertical)
      setTopLayout(layout.topHorizontal)
      if (persistCurrent) {
        persistCurrentWindowLayout(layout)
      }
    })
  }, [persistCurrentWindowLayout, setMainLayout, setTopLayout])

  const handleMainPanelLayout = useCallback((layout: number[]) => {
    setMainLayout(layout)
    if (snappingMainLayoutRef.current) {
      snappingMainLayoutRef.current = false
      persistCurrentWindowLayout()
      return
    }

    const snappedLayout = snapPanelLayout(layout, MAIN_VERTICAL_SNAP_POINTS)
    const shouldSnap = snappedLayout.some((value, index) => Math.abs(value - layout[index]) > 0.01)

    if (shouldSnap) {
      snappingMainLayoutRef.current = true
      requestAnimationFrame(() => {
        mainPanelGroupRef.current?.setLayout?.(snappedLayout)
      })
      persistCurrentWindowLayout({
        ...getCurrentWindowLayout(),
        mainVertical: snappedLayout
      })
      return
    }

    persistCurrentWindowLayout()
  }, [getCurrentWindowLayout, persistCurrentWindowLayout, setMainLayout])

  const handleTopPanelLayout = useCallback((layout: number[]) => {
    setTopLayout(layout)
    if (snappingTopLayoutRef.current) {
      snappingTopLayoutRef.current = false
      persistCurrentWindowLayout()
      return
    }

    const snappedLayout = snapPanelLayout(layout, TOP_HORIZONTAL_SNAP_POINTS)
    const shouldSnap = snappedLayout.some((value, index) => Math.abs(value - layout[index]) > 0.01)

    if (shouldSnap) {
      snappingTopLayoutRef.current = true
      requestAnimationFrame(() => {
        topPanelGroupRef.current?.setLayout?.(snappedLayout)
      })
      persistCurrentWindowLayout({
        ...getCurrentWindowLayout(),
        topHorizontal: snappedLayout
      })
      return
    }

    persistCurrentWindowLayout()
  }, [getCurrentWindowLayout, persistCurrentWindowLayout, setTopLayout])

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    try {
      const rawState = localStorage.getItem(PANEL_POPOUT_STATE_STORAGE_KEY)
      if (rawState) {
        const parsedState = JSON.parse(rawState)
        if (parsedState && typeof parsedState === 'object') {
          setPanelPopoutState(prev => ({ ...prev, ...parsedState }))
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Panel-Pop-out-Status:', error)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(PANEL_POPOUT_STATE_STORAGE_KEY, JSON.stringify(panelPopoutState))
  }, [panelPopoutState])

  useEffect(() => {
    try {
      const savedLayoutsRaw = localStorage.getItem(WINDOW_LAYOUTS_STORAGE_KEY)
      if (savedLayoutsRaw) {
        const parsedLayouts = JSON.parse(savedLayoutsRaw)
        if (parsedLayouts && typeof parsedLayouts === 'object') {
          setWindowLayouts(parsedLayouts)
        }
      }

      const activeLayoutNameRaw = localStorage.getItem(ACTIVE_WINDOW_LAYOUT_NAME_STORAGE_KEY)
      if (activeLayoutNameRaw) {
        setActiveWindowLayoutName(activeLayoutNameRaw)
      }

      const currentLayoutRaw = localStorage.getItem(CURRENT_WINDOW_LAYOUT_STORAGE_KEY)
      if (currentLayoutRaw) {
        const parsedCurrent = JSON.parse(currentLayoutRaw)
        if (parsedCurrent?.mainVertical && parsedCurrent?.topHorizontal) {
          if (parsedCurrent?.panelPopoutState) {
            setPanelPopoutState(prev => ({ ...prev, ...parsedCurrent.panelPopoutState }))
          }
          if (typeof parsedCurrent?.panelLayoutLocked === 'boolean') {
            setPanelLayoutLocked(parsedCurrent.panelLayoutLocked)
          }
          applyWindowLayout(parsedCurrent, false)
          return
        }
      }
    } catch (err) {
      console.error('Fehler beim Laden der Fensterlayouts:', err)
    }

    applyWindowLayout(DEFAULT_WINDOW_LAYOUT, false)
    setPanelPopoutState(DEFAULT_WINDOW_LAYOUT.panelPopoutState as Record<PanelPopoutId, boolean>)
    setPanelLayoutLocked(true)
    setActiveWindowLayoutName(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const currentLayoutRaw = localStorage.getItem(CURRENT_WINDOW_LAYOUT_STORAGE_KEY)
      if (currentLayoutRaw) {
        const parsedCurrent = JSON.parse(currentLayoutRaw)
        if (typeof parsedCurrent?.panelLayoutLocked === 'boolean') {
          return
        }
      }

      const savedLocked = localStorage.getItem(PANEL_LAYOUT_LOCKED_STORAGE_KEY)
      if (savedLocked !== null) {
        setPanelLayoutLocked(savedLocked === 'true')
      }
    } catch (err) {
      console.error('Fehler beim Laden der Panel-Sperre:', err)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(PANEL_LAYOUT_LOCKED_STORAGE_KEY, String(panelLayoutLocked))
  }, [panelLayoutLocked])

  useEffect(() => {
    if (isPanelPopoutWindow) return
    persistCurrentWindowLayout()
  }, [panelLayoutLocked, panelPopoutState, persistCurrentWindowLayout, isPanelPopoutWindow])

  const openModalPopoutOrInline = (
    name: 'settings' | 'manual' | 'about' | 'update' | 'logs' | 'symbol-manager',
    openInline: () => void,
    popoutOptions: { width: number; height: number; title: string; payload?: any }
  ) => {
    const isCropped = window.innerWidth < (popoutOptions.width + 20) || window.innerHeight < (popoutOptions.height + 20);
    if (isCropped) {
      if (popoutOptions.payload) {
        localStorage.setItem(`popout_${name}_payload`, JSON.stringify(popoutOptions.payload));
      }
      window.api.openPopoutWindow(name, popoutOptions);
    } else {
      openInline();
    }
  }

  const openSettings = (tab: SettingsTab = 'Projekteinstellungen') => {
    openModalPopoutOrInline('settings', () => {
      setSettingsTab(tab)
      setShowSettings(true)
    }, {
      width: 900,
      height: 725,
      title: 'Einstellungen',
      payload: { tab }
    });
  }

  const openSymbolManager = () => {
    openModalPopoutOrInline('symbol-manager', () => {
      setShowSymbolManager(true)
    }, {
      width: 480,
      height: 650,
      title: 'Symbol-Manager'
    });
  }

  // Load initial settings on boot
  useEffect(() => {
    window.api.getSettings().then((settings: any) => {
      if (settings.showStartScreen !== false) {
        setShowStartDashboard(true)
      }
      if (settings.maxUndoSteps) {
        setMaxUndoSteps(settings.maxUndoSteps)
      }
      if (typeof settings.autoSave === 'boolean') {
        setAutoSaveEnabled(settings.autoSave)
      }
      if (settings.autoSaveInterval) {
        setAutoSaveInterval(settings.autoSaveInterval)
      }
      setKeyboardShortcuts(normalizeKeyboardShortcuts(settings.keyboardShortcuts))
    }).catch(e => console.error('Fehler beim Laden der Einstellungen:', e))
  }, [])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'settings_updated_trigger' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          const s = payload.settings;
          if (s) {
            if (s.maxUndoSteps) setMaxUndoSteps(s.maxUndoSteps);
            if (typeof s.autoSave === 'boolean') setAutoSaveEnabled(s.autoSave);
            if (s.autoSaveInterval) setAutoSaveInterval(s.autoSaveInterval);
            setKeyboardShortcuts(normalizeKeyboardShortcuts(s.keyboardShortcuts));
            AudioEngine.getInstance().setAudioDriver(s.driverType || 'wave', s.bufferCount || 6);
            if (s.language) {
              i18n.changeLanguage(s.language);
            }
            if (s.textScale) {
              document.documentElement.className = `text-scale-${s.textScale}`;
            }
            window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: s }));
          }
        } catch (err) {
          console.error('Error parsing settings popout trigger:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [i18n]);

  // Listen to live recordings made in the VST standalone popout editor
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vst_live_record_finished' && e.newValue) {
        try {
          const { filePath, durationSec, startPos, pluginName } = JSON.parse(e.newValue)
          const filename = filePath.split(/[\\/]/).pop() || `${pluginName}_recorded.wav`
          const newRegion = {
            id: 'vst_rec_' + Math.random().toString(36).substring(2, 9),
            file: { name: filename, path: filePath, isDirectory: false },
            startPos: typeof startPos === 'number' ? startPos : 0,
            duration: durationSec,
            fileDuration: durationSec,
            sourceOffset: 0,
            color: 'bg-cyan-500' // Neon cyan for VST recordings!
          }
          
          const updated = tracksRef.current.map((t, i) => i === 0 ? { ...t, regions: [...t.regions, newRegion] } : t)
          handleTracksUpdate(updated)
          
          // Preload in AudioEngine
          AudioEngine.getInstance().loadFile(filePath).catch(err => console.error(err))
          
          // Show successful toast
          triggerTimelineAction('SHOW_MODAL', {
            type: 'info',
            title: 'VST-Aufnahme importiert',
            message: `Die Live-Aufnahme von "${pluginName}" (${durationSec.toFixed(1)}s) wurde erfolgreich als Audio-Clip auf Spur 1 importiert.`
          })
        } catch (err) {
          console.error('Failed to parse VST recording payload:', err)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [tracks])

  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<any>
      const s = customEvent.detail
      if (s) {
        setKeyboardShortcuts(normalizeKeyboardShortcuts(s.keyboardShortcuts))
        if (s.language) {
          i18n.changeLanguage(s.language)
        }
        if (s.textScale) {
          document.documentElement.className = `text-scale-${s.textScale}`
        }
      }
    }

    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdated as EventListener)
    return () => window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdated as EventListener)
  }, [i18n])

  // Recent Projects updater utility
  const updateRecentProjects = async (filePath: string) => {
    try {
      const currentSettings = await window.api.getSettings()
      let recent = Array.isArray(currentSettings.recentProjects) ? [...currentSettings.recentProjects] : []
      
      // Filter out existing entries with the same path
      recent = recent.filter((p: any) => p.path !== filePath)
      
      // Extract name from path
      const parts = filePath.split(/[\\/]/)
      const name = parts[parts.length - 1].replace(/\.owep$/, '')
      
      // Prepend the new one
      recent.unshift({
        name,
        path: filePath,
        date: Date.now()
      })
      
      // Limit to 10 entries
      recent = recent.slice(0, 10)
      
      currentSettings.recentProjects = recent
      await window.api.saveSettings(currentSettings)
    } catch (e) {
      console.error('Fehler beim Aktualisieren der letzten Projekte:', e)
    }
  }

  // Listen to project lifecycle custom events from Timeline
  useEffect(() => {
    const handleSaved = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail && customEvent.detail.path) {
        setCurrentProjectPath(customEvent.detail.path)
        setIsDirty(false)
        updateRecentProjects(customEvent.detail.path)
      }
    }

    const handleLoaded = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail && customEvent.detail.path) {
        setCurrentProjectPath(customEvent.detail.path)
        setIsDirty(false)
        updateRecentProjects(customEvent.detail.path)
      }
    }

    const handleReset = () => {
      setCurrentProjectPath(null)
      setIsDirty(false)
    }

    window.addEventListener('PROJECT_SAVED', handleSaved)
    window.addEventListener('PROJECT_LOADED', handleLoaded)
    window.addEventListener('PROJECT_RESET', handleReset)

    return () => {
      window.removeEventListener('PROJECT_SAVED', handleSaved)
      window.removeEventListener('PROJECT_LOADED', handleLoaded)
      window.removeEventListener('PROJECT_RESET', handleReset)
    }
  }, [])

  // Auto-Save Background interval
  useEffect(() => {
    if (!autoSaveEnabled || autoSaveInterval <= 0 || !isDirty) return

    const intervalMs = autoSaveInterval * 60 * 1000
    const timer = setInterval(async () => {
      try {
        let path = currentProjectPath
        if (!path) {
          const settings = await window.api.getSettings()
          const projDir = settings.projPath || ''
          if (projDir) {
            path = `${projDir}/AutoSave_Backup.owep`
          } else {
            return
          }
        } else {
          path = path.replace(/\.owep$/, '_autosave.owep')
        }

        const data = {
          format: 'OWEP',
          version: '1.0.0',
          tracks,
          settings: { zoomLevel: 1, sampleRate: 48000, playheadPos: 0 },
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            author: 'Omega User (Auto-Save)'
          }
        }

        await window.api.saveProject(path, data)
        console.log(`Projekt automatisch zwischengespeichert unter: ${path}`)
      } catch (err) {
        console.error('Automatisches Speichern fehlgeschlagen:', err)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [autoSaveEnabled, autoSaveInterval, isDirty, currentProjectPath, tracks])

  // Window Closing Interception Effect
  useEffect(() => {
    const unsubscribe = window.api.onCloseRequest(() => {
      if (isDirty) {
        setShowSaveConfirm(true)
      } else {
        window.api.confirmClose()
      }
    })
    return () => unsubscribe()
  }, [isDirty])

  // Save and Close routines for interceptor
  const handleSaveAndClose = () => {
    setShowSaveConfirm(false)
    // Delegate to Timeline's SAVE_PROJECT action so that all session state
    // (exportSettings, zoom, playhead, sampleRate) is included in the saved file.
    const handleSaved = () => {
      window.removeEventListener('PROJECT_SAVED', handleSaved)
      window.api.confirmClose()
    }
    window.addEventListener('PROJECT_SAVED', handleSaved)
    // Trigger the Timeline's save routine
    setTimelineAction({ type: 'SAVE_PROJECT' })
    setTimeout(() => setTimelineAction(undefined), 100)
    // Safety timeout: if the save takes too long, remove the listener
    setTimeout(() => window.removeEventListener('PROJECT_SAVED', handleSaved), 15000)
  }

  const handleDiscardAndClose = () => {
    setShowSaveConfirm(false)
    window.api.confirmClose()
  }

  const handleCancelClose = () => {
    setShowSaveConfirm(false)
  }

  // Automatischer Update-Check beim Programmstart
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const result = await window.api.checkForUpdates()
        if (result && result.available) {
          setUpdateAvailable(result)
        }
      } catch (e) {
        console.error('Automatisches Update-Check fehlgeschlagen:', e)
      }
    }, 2500) // 2.5 Sekunden Verzögerung nach Start für eine flüssige UX
    return () => clearTimeout(timer)
  }, [])

  const showModal = (
    type: ModalType, 
    title: string, 
    message: string, 
    onConfirm?: (checkboxChecked?: boolean) => void,
    checkboxLabel?: string,
    defaultCheckboxChecked?: boolean
  ) => {
    setModalConfig({ type, title, message, onConfirm, checkboxLabel, defaultCheckboxChecked })
  }

  const handleModalClose = (result?: boolean, checkboxChecked?: boolean) => {
    const callback = modalConfig?.onConfirm;
    setModalConfig(null)
    if (result && callback) {
      callback(checkboxChecked)
    }
  }
  
  const [selectedRegionIds, setSelectedRegionIds] = useState<Set<string>>(new Set())
  const selectedRegionId = selectedRegionIds.size === 1 ? [...selectedRegionIds][0] : selectedRegionIds.size > 1 ? [...selectedRegionIds][0] : null
  const [popoutTracks, setPopoutTracks] = useState<any[]>(initialTracks)
  const [popoutSelectedRegionIds, setPopoutSelectedRegionIds] = useState<Set<string>>(new Set())

  const [timelineAction, setTimelineAction] = useState<{ type: string; payload?: any } | undefined>()

  const handleTracksUpdate = (updatedTracks: any[]) => {
    logTimelineChanges(tracks, updatedTracks)
    pushTracks(updatedTracks)
    setIsDirty(true)
  }

  const syncTracksFromPopout = useCallback((updatedTracks: any[]) => {
    logTimelineChanges(tracksRef.current, updatedTracks)
    pushTracks(updatedTracks)
    setIsDirty(true)
  }, [pushTracks])

  const sendPanelPopoutAction = useCallback((type: string, payload?: any) => {
    localStorage.setItem(PANEL_POPOUT_ACTION_STORAGE_KEY, JSON.stringify({
      type,
      payload,
      timestamp: Date.now()
    }))
  }, [])

  const restorePanelPopoutState = useCallback((nextState: Partial<Record<PanelPopoutId, boolean>>) => {
    const mergedState: Record<PanelPopoutId, boolean> = {
      'panel-file-explorer': !!nextState['panel-file-explorer'],
      'panel-effects': !!nextState['panel-effects'],
      'panel-timeline': !!nextState['panel-timeline']
    }

    setPanelPopoutState(mergedState)
    localStorage.setItem(PANEL_POPOUT_STATE_STORAGE_KEY, JSON.stringify(mergedState))

    ALL_PANEL_POPOUT_IDS.forEach((panelId) => {
      if (mergedState[panelId]) {
        window.api.openPopoutWindow(panelId, {
          width: panelId === 'panel-file-explorer' ? 620 : panelId === 'panel-effects' ? 980 : 1320,
          height: panelId === 'panel-file-explorer' ? 760 : panelId === 'panel-effects' ? 760 : 860,
          title: `${panelId === 'panel-file-explorer' ? 'Import / Player' : panelId === 'panel-effects' ? 'Effekte' : 'Timeline'} - Omega Wave Editor`
        })
      } else {
        sendPanelPopoutAction('REDOCK_PANEL', { panelId })
      }
    })
  }, [sendPanelPopoutAction])

  const togglePanelPopout = useCallback((panelId: PanelPopoutId, shouldOpen: boolean) => {
    setPanelPopoutState(prev => {
      const nextState = { ...prev, [panelId]: shouldOpen }
      localStorage.setItem(PANEL_POPOUT_STATE_STORAGE_KEY, JSON.stringify(nextState))
      return nextState
    })

    if (shouldOpen) {
      const windowTitles: Record<PanelPopoutId, string> = {
        'panel-file-explorer': 'Import / Player',
        'panel-effects': 'Effekte',
        'panel-timeline': 'Timeline'
      }
      const windowSizes: Record<PanelPopoutId, { width: number; height: number }> = {
        'panel-file-explorer': { width: 620, height: 760 },
        'panel-effects': { width: 980, height: 760 },
        'panel-timeline': { width: 1320, height: 860 }
      }
      const size = windowSizes[panelId]
      window.api.openPopoutWindow(panelId, {
        width: size.width,
        height: size.height,
        title: `${windowTitles[panelId]} - Omega Wave Editor`
      })
    } else {
      sendPanelPopoutAction('REDOCK_PANEL', { panelId })
    }
  }, [sendPanelPopoutAction])

  const redockAllPanels = useCallback(() => {
    setPanelPopoutState({
      'panel-file-explorer': false,
      'panel-effects': false,
      'panel-timeline': false
    })
    localStorage.setItem(PANEL_POPOUT_STATE_STORAGE_KEY, JSON.stringify({
      'panel-file-explorer': false,
      'panel-effects': false,
      'panel-timeline': false
    }))
    ALL_PANEL_POPOUT_IDS.forEach((panelId) => {
      sendPanelPopoutAction('REDOCK_PANEL', { panelId })
    })
  }, [sendPanelPopoutAction])

  const renderPanelHeaderActions = (panelId: PanelPopoutId) => (
    <div className="flex items-center gap-1">
      <button
        className={`p-1 rounded transition-colors ${panelLayoutLocked ? 'bg-omega-accent/20 text-omega-accent hover:bg-omega-accent/30' : 'text-gray-300 hover:bg-gray-700'}`}
        title={panelLayoutLocked ? 'Bereichslayout entsperren' : 'Bereichslayout sperren'}
        onClick={() => setPanelLayoutLocked((current) => !current)}
      >
        {panelLayoutLocked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>
      <button
        className={`p-1 rounded transition-colors ${panelLayoutLocked ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-gray-700 text-gray-300'}`}
        title={
          panelLayoutLocked
            ? 'Bereichslayout ist gesperrt'
            : panelPopoutState[panelId]
              ? 'Bereich andocken'
              : 'Bereich auskoppeln'
        }
        onClick={() => {
          if (panelLayoutLocked) {
            return
          }
          togglePanelPopout(panelId, !panelPopoutState[panelId])
        }}
        disabled={panelLayoutLocked}
      >
        {panelPopoutState[panelId] ? <PanelTopClose size={14} /> : <ExternalLink size={14} />}
      </button>
    </div>
  )

  useEffect(() => {
    if (isPanelPopoutWindow) return
    ALL_PANEL_POPOUT_IDS.forEach((panelId) => {
      if (panelPopoutState[panelId] && !restoredPanelPopoutsRef.current.has(panelId)) {
        restoredPanelPopoutsRef.current.add(panelId)
        togglePanelPopout(panelId, true)
      }
      if (!panelPopoutState[panelId]) {
        restoredPanelPopoutsRef.current.delete(panelId)
      }
    })
  }, [isPanelPopoutWindow, panelPopoutState, togglePanelPopout])

  const triggerTimelineAction = (type: string, payload?: any) => {
    if (type === 'UNDO') {
      const prev = undo();
      if (prev) {
        setTimelineAction({ type: 'SET_TRACKS', payload: prev });
        setIsDirty(true);
      }
      return;
    }
    if (type === 'REDO') {
      const next = redo();
      if (next) {
        setTimelineAction({ type: 'SET_TRACKS', payload: next });
        setIsDirty(true);
      }
      return;
    }
    if (type === 'NEW_PROJECT') {
      if (isDirty) {
        showModal('confirm', 'Neues Projekt', 'Möchten Sie ein neues Projekt erstellen?\nAlle ungespeicherten Änderungen gehen verloren.', () => {
          setShowStartDashboard(true);
        })
      } else {
        setShowStartDashboard(true);
      }
      return;
    }
    if (type === 'SHOW_MODAL' && payload) {
       showModal(payload.type, payload.title, payload.message, payload.onConfirm)
       return;
    }
    if (type === 'CLOSE_MODAL') {
       setModalConfig(null)
       return
    }
    if (type === 'TRIGGER_UPDATE') {
       openModalPopoutOrInline('update', () => setActiveUpdateInfo(payload), {
         width: 980,
         height: 760,
         title: 'Software Update',
         payload: payload
       });
       return
    }
    if (type === 'SHOW_MANUAL') {
       openModalPopoutOrInline('manual', () => setShowManual(true), {
         width: 920,
         height: 820,
         title: 'Benutzerhandbuch'
       });
       return;
    }
    if (type === 'SHOW_ABOUT') {
       openModalPopoutOrInline('about', () => setShowAbout(true), {
         width: 480,
         height: 530,
         title: 'Über Omega Wave Editor'
       });
       return;
    }
    if (type === 'SHOW_LOGS') {
      localStorage.setItem('popout_logs_payload', JSON.stringify({ tab: 'logs' }))
      window.api.openPopoutWindow('logs', { width: 980, height: 750, title: 'Logs' })
      return
    }
    if (type === 'SHOW_FEEDBACK') {
      localStorage.setItem('popout_logs_payload', JSON.stringify({ tab: 'feedback' }))
      window.api.openPopoutWindow('logs', { width: 980, height: 750, title: 'Logs' })
      return
    }
    if (type === 'SHOW_MESSAGES') {
      window.api.openPopoutWindow('messages', { width: 550, height: 700, title: 'Nachrichtencenter' })
      return
    }
    if (type === 'SHOW_CHANGELOG') {
      setShowChangelog(true)
      return
    }
    if (type === 'TOGGLE_PANEL_POPOUT' && payload) {
      if (panelLayoutLocked) {
        showModal('info', 'Layout gesperrt', 'Bitte entsperre zuerst das Bereichslayout, um Fenster aus- oder wieder einzukoppeln.')
        return
      }
      const panelId = payload as PanelPopoutId
      togglePanelPopout(panelId, !panelPopoutState[panelId])
      return
    }
    if (type === 'WINDOW_DOCK_ALL') {
      if (panelLayoutLocked) {
        showModal('info', 'Layout gesperrt', 'Bitte entsperre zuerst das Bereichslayout, um Fenster neu anzuordnen.')
        return
      }
      redockAllPanels()
      return
    }
    if (type === 'WINDOW_LAYOUT_SAVE') {
      const suggestedName = `Ansicht ${Object.keys(windowLayouts).length + 1}`
      const enteredName = window.prompt('Name f?r die aktuelle Fensteransicht:', suggestedName)
      const name = enteredName?.trim()
      if (!name) {
        return
      }
      
      ;(async () => {
        const layout = await captureCurrentWindowLayoutSnapshot(getCurrentWindowLayout, window.api)
        const nextLayouts = {
          ...windowLayouts,
          [name]: layout
        }
        setWindowLayouts(nextLayouts)
        localStorage.setItem(WINDOW_LAYOUTS_STORAGE_KEY, JSON.stringify(nextLayouts))
        localStorage.setItem(ACTIVE_WINDOW_LAYOUT_NAME_STORAGE_KEY, name)
        setActiveWindowLayoutName(name)
        persistCurrentWindowLayout(layout)
        showModal('info', 'Fensteransicht gespeichert', `Die Ansicht "${name}" wurde gespeichert.`)
      })()
      return
    }
    if (type === 'WINDOW_LAYOUT_UPDATE') {
      if (!activeWindowLayoutName) {
        showModal('info', 'Keine aktive Fensteransicht', 'Bitte lade oder speichere zuerst eine Fensteransicht, bevor du sie aktualisierst.')
        return
      }
      if (!windowLayouts[activeWindowLayoutName]) {
        showModal('warn', 'Fensteransicht nicht gefunden', 'Die aktive Fensteransicht existiert nicht mehr und kann nicht aktualisiert werden.')
        localStorage.removeItem(ACTIVE_WINDOW_LAYOUT_NAME_STORAGE_KEY)
        setActiveWindowLayoutName(null)
        return
      }

      ;(async () => {
        const layout = await captureCurrentWindowLayoutSnapshot(getCurrentWindowLayout, window.api)
        const nextLayouts = {
          ...windowLayouts,
          [activeWindowLayoutName]: layout
        }
        setWindowLayouts(nextLayouts)
        localStorage.setItem(WINDOW_LAYOUTS_STORAGE_KEY, JSON.stringify(nextLayouts))
        localStorage.setItem(ACTIVE_WINDOW_LAYOUT_NAME_STORAGE_KEY, activeWindowLayoutName)
        persistCurrentWindowLayout(layout)
        showModal('info', 'Fensteransicht aktualisiert', `Die Ansicht "${activeWindowLayoutName}" wurde aktualisiert.`)
      })()
      return
    }
    if (type === 'WINDOW_LAYOUT_RESET') {
      ;(async () => {
        redockAllPanels()
        try {
          const defaultBounds = await window.api.getDefaultMainWindowBounds()
          if (defaultBounds) {
            await window.api.setMainWindowBounds(defaultBounds)
          }
        } catch (err) {
          console.error('Fehler beim Wiederherstellen der Standard-Hauptfenster-Bounds:', err)
        }
        setPanelLayoutLocked(DEFAULT_WINDOW_LAYOUT.panelLayoutLocked ?? true)
        applyWindowLayout(DEFAULT_WINDOW_LAYOUT)
        localStorage.removeItem(ACTIVE_WINDOW_LAYOUT_NAME_STORAGE_KEY)
        setActiveWindowLayoutName(null)
        showModal('info', 'Fensteransicht zur?ckgesetzt', 'Die Standardansicht wurde wiederhergestellt.')
      })()
      return
    }
    if (type === 'WINDOW_LAYOUT_LOAD') {
      const layoutName = typeof payload === 'string' ? payload : ''
      const layout = layoutName ? windowLayouts[layoutName] : undefined
      if (!layout) {
        showModal('warn', 'Fensteransicht nicht gefunden', 'Die gespeicherte Fensteransicht konnte nicht geladen werden.')
        return
      }

      // Popout-Bounds an den Hauptprozess senden, bevor die Popout-Panels geöffnet/positioniert werden
      ;(async () => {
        if (layout.mainWindowBounds) {
          try {
            await window.api.setMainWindowBounds(layout.mainWindowBounds)
          } catch (err) {
            console.error('Fehler beim Setzen der Hauptfenster-Bounds:', err)
          }
        }

        if (layout.popoutBounds) {
          try {
            await window.api.setPopoutBounds(layout.popoutBounds)
          } catch (err) {
            console.error('Fehler beim Setzen der Popout-Bounds:', err)
          }
        }

        restorePanelPopoutState(layout.panelPopoutState || {})
        if (typeof layout.panelLayoutLocked === 'boolean') {
          setPanelLayoutLocked(layout.panelLayoutLocked)
        }
        applyWindowLayout(layout)
        localStorage.setItem(ACTIVE_WINDOW_LAYOUT_NAME_STORAGE_KEY, layoutName)
        setActiveWindowLayoutName(layoutName)
        showModal('info', 'Fensteransicht geladen', `Die Ansicht "${layoutName}" wurde geladen.`)
      })()
      return
    }
    if (type === 'WINDOW_LAYOUT_DELETE') {
      const layoutName = typeof payload === 'string' ? payload.trim() : ''
      if (!layoutName || !windowLayouts[layoutName]) {
        showModal('warn', 'Fensteransicht nicht gefunden', 'Die gespeicherte Fensteransicht konnte nicht entfernt werden.')
        return
      }
      const nextLayouts = { ...windowLayouts }
      delete nextLayouts[layoutName]
      setWindowLayouts(nextLayouts)
      localStorage.setItem(WINDOW_LAYOUTS_STORAGE_KEY, JSON.stringify(nextLayouts))
      if (activeWindowLayoutName === layoutName) {
        localStorage.removeItem(ACTIVE_WINDOW_LAYOUT_NAME_STORAGE_KEY)
        setActiveWindowLayoutName(null)
      }
      showModal('info', 'Fensteransicht entfernt', `Die Ansicht "${layoutName}" wurde entfernt.`)
      return
    }
    setTimelineAction({ type, payload });
    setTimeout(() => setTimelineAction(undefined), 100);
  }

  useEffect(() => {
    if (isPanelPopoutWindow) return

    const snapshot = {
      tracks,
      selectedRegionIds: [...selectedRegionIds],
      keyboardShortcuts,
      currentProjectPath,
      timestamp: Date.now()
    }
    localStorage.setItem(PANEL_POPOUT_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot))
  }, [tracks, selectedRegionIds, keyboardShortcuts, currentProjectPath, isPanelPopoutWindow])

  useEffect(() => {
    if (!isPanelPopoutWindow) return

    const loadSnapshot = () => {
      try {
        const rawSnapshot = localStorage.getItem(PANEL_POPOUT_SNAPSHOT_STORAGE_KEY)
        if (!rawSnapshot) return
        const parsedSnapshot = JSON.parse(rawSnapshot)
        if (Array.isArray(parsedSnapshot?.tracks)) {
          setPopoutTracks(parsedSnapshot.tracks)
        }
        if (Array.isArray(parsedSnapshot?.selectedRegionIds)) {
          setPopoutSelectedRegionIds(new Set(parsedSnapshot.selectedRegionIds))
        }
        if (parsedSnapshot?.keyboardShortcuts) {
          setKeyboardShortcuts(normalizeKeyboardShortcuts(parsedSnapshot.keyboardShortcuts))
        }
        if (typeof parsedSnapshot?.currentProjectPath === 'string' || parsedSnapshot?.currentProjectPath === null) {
          setCurrentProjectPath(parsedSnapshot.currentProjectPath ?? null)
        }
      } catch (error) {
        console.error('Fehler beim Laden des Panel-Pop-out-Snapshots:', error)
      }
    }

    loadSnapshot()
    const redockPanelId = windowType as PanelPopoutId
    const onStorage = (event: StorageEvent) => {
      if (event.key === PANEL_POPOUT_SNAPSHOT_STORAGE_KEY && event.newValue) {
        loadSnapshot()
      }
    }

    const handleBeforeUnload = () => {
      localStorage.setItem(PANEL_POPOUT_ACTION_STORAGE_KEY, JSON.stringify({
        type: 'REDOCK_PANEL',
        payload: { panelId: redockPanelId },
        timestamp: Date.now()
      }))
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isPanelPopoutWindow, windowType])

  useEffect(() => {
    if (isPanelPopoutWindow) return

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PANEL_POPOUT_ACTION_STORAGE_KEY || !event.newValue) return
      try {
        const action = JSON.parse(event.newValue)
        if (action?.type === 'SYNC_TRACKS' && Array.isArray(action.payload?.tracks)) {
          syncTracksFromPopout(action.payload.tracks)
        }
        if (action?.type === 'SYNC_SELECTED_REGION_IDS' && Array.isArray(action.payload?.ids)) {
          setSelectedRegionIds(new Set(action.payload.ids))
        }
        if (action?.type === 'REDOCK_PANEL' && action.payload?.panelId) {
          setPanelPopoutState(prev => ({ ...prev, [action.payload.panelId]: false }))
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten einer Panel-Pop-out-Aktion:', error)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [isPanelPopoutWindow, syncTracksFromPopout])

  // Handle Keyboard Shortcuts for Undo/Redo and Global Modals
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // 1. Nur bei echten Texteingabefeldern überspringen (damit Leertaste z. B. bei Range-Slidern, Buttons etc. trotzdem funktioniert)
      const isTextInput = 
        (target.tagName === 'INPUT' && ['text', 'number', 'email', 'search', 'password'].includes((target.getAttribute('type') || 'text').toLowerCase())) ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTextInput) {
        return;
      }

      // 2. Modals in App prüfen (Leertaste ignorieren)
      if (
        showSettings ||
        showExport ||
        showManual ||
        showAbout ||
        modalConfig ||
        showStartDashboard ||
        showSaveConfirm ||
        activeUpdateInfo
      ) {
        return;
      }

      // 3. Dropdowns oder Kontextmenüs im DOM prüfen (Leertaste ignorieren)
      const hasOverlay = document.querySelector('.z-\\[1000\\], .z-\\[9999\\], .fixed.bg-\\[\\#e5e5e5\\]') !== null;
      if (hasOverlay) {
        return;
      }

      // 4. Globale Tastenkürzel
      if (matchesShortcut(e, keyboardShortcuts.playPause)) {
        e.preventDefault();
        if (e.repeat) return;
        window.dispatchEvent(new CustomEvent('TIMELINE_ACTION_PLAY'));
        return;
      }

      if (matchesShortcut(e, keyboardShortcuts.newProject)) {
        e.preventDefault();
        triggerTimelineAction('NEW_PROJECT');
      } else if (matchesShortcut(e, keyboardShortcuts.openProject)) {
        e.preventDefault();
        triggerTimelineAction('LOAD_PROJECT');
      } else if (matchesShortcut(e, keyboardShortcuts.saveProject) || matchesShortcut(e, keyboardShortcuts.saveProjectAs)) {
        e.preventDefault();
        triggerTimelineAction('SAVE_PROJECT');
      } else if (matchesShortcut(e, keyboardShortcuts.undo)) {
        e.preventDefault();
        triggerTimelineAction('UNDO');
      } else if (matchesShortcut(e, keyboardShortcuts.redo)) {
        e.preventDefault();
        triggerTimelineAction('REDO');
      } else if (matchesShortcut(e, keyboardShortcuts.openSettings)) {
        e.preventDefault();
        openSettings('Projekteinstellungen');
      } else if (matchesShortcut(e, keyboardShortcuts.exportAudio)) {
        e.preventDefault();
        window.api.openExportSettings(tracks, null, null);
      }
    };

    const handleGlobalModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        showModal(
          customEvent.detail.type,
          customEvent.detail.title,
          customEvent.detail.message,
          customEvent.detail.onConfirm,
          customEvent.detail.checkboxLabel,
          customEvent.detail.defaultCheckboxChecked
        );
      }
    };

    const preventDefault = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('SHOW_GLOBAL_MODAL', handleGlobalModal);
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('SHOW_GLOBAL_MODAL', handleGlobalModal);
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, [undo, redo, showSettings, showExport, showManual, modalConfig, showStartDashboard, showSaveConfirm, activeUpdateInfo, tracks, keyboardShortcuts]);

  const triggerTimelineActionRef = useRef<any>(null);
  useEffect(() => {
    triggerTimelineActionRef.current = triggerTimelineAction;
  }, [triggerTimelineAction]);

  // Handle Startup File and Live File Associations
  useEffect(() => {
    // Check for startup file on boot
    window.api.getStartupFile().then((filePath: string | null) => {
      if (filePath) {
        setShowStartDashboard(false);
        triggerTimelineActionRef.current?.('LOAD_PROJECT_DIRECT', filePath);
      }
    }).catch((e: any) => console.error('Fehler beim Laden der Boot-Projektdatei:', e));

    // Listen to live associations when double-clicked while app is running
    const unsubscribe = window.api.onOpenProjectFromAssociation((filePath: string) => {
      if (filePath) {
        setShowStartDashboard(false);
        triggerTimelineActionRef.current?.('LOAD_PROJECT_DIRECT', filePath);
      }
    });

    return () => unsubscribe();
  }, []);

  const [isWindowLocked, setIsWindowLocked] = useState(false);

  // Pop-out export listeners and controllers
  useEffect(() => {
    const unsubscribeLock = window.api.onLockMainWindow((locked: boolean) => {
      setIsWindowLocked(locked);
      if (locked) {
        window.dispatchEvent(new CustomEvent('TIMELINE_ACTION_STOP'));
      }
    });

    const unsubscribeRender = window.api.onStartOfflineRender(async (settings: any) => {
      try {
        window.dispatchEvent(new CustomEvent('TIMELINE_ACTION_STOP'));
        const parsedSampleRate = parseInt(settings.sampleRate, 10) || 48000;
        
        // 1. Spuren analysieren
        window.api.updateExportProgress(10, 'Analysiere Spuren...');
        await new Promise(r => setTimeout(r, 400));

        // 2. Mixdown berechnen
        window.api.updateExportProgress(20, 'Mixdown wird berechnet...');
        let mixProgress = 20;
        const mixInterval = setInterval(() => {
          if (mixProgress < 70) {
            mixProgress += 2;
            window.api.updateExportProgress(mixProgress, 'Mixdown wird berechnet...');
          }
        }, 120);

        const selectionParsed = settings.selection ? {
          start: typeof settings.selection.start === 'number' ? settings.selection.start : (typeof settings.selection.selectionStart === 'number' ? settings.selection.selectionStart : 0),
          end: typeof settings.selection.end === 'number' ? settings.selection.end : (typeof settings.selection.selectionEnd === 'number' ? settings.selection.selectionEnd : 0),
          active: typeof settings.selection.active === 'boolean' ? settings.selection.active : (typeof settings.selection.start === 'number' && typeof settings.selection.end === 'number')
        } : undefined;

        const audioBuffer = await AudioEngine.getInstance().renderOffline(
          { tracks: settings.tracks },
          parsedSampleRate,
          { exportSelectionOnly: settings.exportSelectionOnly, selection: selectionParsed }
        );
        clearInterval(mixInterval);

        // 3. Encoding läuft
        window.api.updateExportProgress(75, 'Encoding läuft...');
        await new Promise(r => setTimeout(r, 200));
        const wavBuffer = AudioEngine.getInstance().exportToWav(audioBuffer);

        const tempWavPath = settings.path + '.temp.wav';
        await window.api.saveRecording(tempWavPath, wavBuffer);

        // 4. Metadaten schreiben
        window.api.updateExportProgress(85, 'Metadaten werden geschrieben...');
        const lowerFormat = settings.format.toLowerCase();
        const ext = lowerFormat.includes('mp3') ? 'mp3' : lowerFormat.includes('flac') ? 'flac' : lowerFormat.includes('ogg') ? 'ogg'
          : lowerFormat.includes('m4a') ? 'm4a' : lowerFormat.includes('m4r') ? 'm4r' : lowerFormat.includes('aiff') ? 'aiff'
          : lowerFormat.includes('wma') ? 'wma' : lowerFormat.includes('opus') ? 'opus' : lowerFormat.includes('alac') ? 'alac' : 'wav';

        await window.api.transcodeExport(
          tempWavPath,
          settings.path,
          { format: ext, bitrate: settings.bitrate, sampleRate: parsedSampleRate },
          settings.id3Tags
        );

        // 5. Fertigstellen
        window.api.updateExportProgress(100, 'Fertigstellen...');
        await new Promise(r => setTimeout(r, 300));
        
        window.api.notifyExportFinished('done', settings.path);

        if (settings.playAfterExport) {
          await window.api.openPath(settings.path);
        }
      } catch (err: any) {
        console.error('Offline Export failed:', err);
        window.api.notifyExportFinished('error', undefined, err.message || 'Export fehlgeschlagen.');
      }
    });

    // Forward seek-timeline events from the export popup or VST play commands to the main timeline
    const unsubscribeSeek = window.api.onSeekTimeline((position: number) => {
      if (position === -999) {
        triggerTimelineAction('TOGGLE_PLAYBACK')
      } else {
        setTimelineAction({ type: 'SEEK', payload: position })
        setTimeout(() => setTimelineAction(undefined), 100)
      }
    })

    return () => {
      unsubscribeLock();
      unsubscribeRender();
      unsubscribeSeek();
    };
  }, []);

  if (windowType === 'panel-file-explorer') {
    return (
      <div className="h-full w-full flex flex-col bg-omega-dark text-omega-text">
        <div className="h-10 border-b border-omega-border flex items-center justify-between px-3 bg-omega-panel">
          <span className="text-sm font-semibold text-omega-accent">Import / Player</span>
          <button
            className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white"
            onClick={() => {
              sendPanelPopoutAction('REDOCK_PANEL', { panelId: 'panel-file-explorer' })
              window.close()
            }}
          >
            Andocken
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileExplorer />
        </div>
      </div>
    )
  }

  if (windowType === 'panel-effects') {
    return (
      <div className="h-full w-full flex flex-col bg-omega-dark text-omega-text">
        <div className="h-10 border-b border-omega-border flex items-center justify-between px-3 bg-omega-panel">
          <span className="text-sm font-semibold text-omega-accent">Effekte</span>
          <button
            className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white"
            onClick={() => {
              sendPanelPopoutAction('REDOCK_PANEL', { panelId: 'panel-effects' })
              window.close()
            }}
          >
            Andocken
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <EffectsPanel
            selectedRegionId={popoutSelectedRegionIds.size > 0 ? [...popoutSelectedRegionIds][0] : null}
            tracks={popoutTracks}
            onTracksChange={(updatedTracks) => {
              setPopoutTracks(updatedTracks)
              sendPanelPopoutAction('SYNC_TRACKS', { tracks: updatedTracks })
            }}
          />
        </div>
      </div>
    )
  }

  if (windowType === 'panel-timeline') {
    return (
      <div className="h-full w-full flex flex-col bg-omega-dark text-omega-text">
        <div className="h-10 border-b border-omega-border flex items-center justify-between px-3 bg-omega-panel flex-shrink-0">
          <span className="text-sm font-semibold text-omega-accent">Timeline</span>
          <button
            className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white"
            onClick={() => {
              sendPanelPopoutAction('REDOCK_PANEL', { panelId: 'panel-timeline' })
              window.close()
            }}
          >
            Andocken
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Timeline
            onTracksChange={(updatedTracks) => {
              setPopoutTracks(updatedTracks)
              sendPanelPopoutAction('SYNC_TRACKS', { tracks: updatedTracks })
            }}
            onOpenExport={(customTracks, selection, customExportSettings) => {
              window.api.openExportSettings(customTracks || popoutTracks, selection || null, customExportSettings || null)
            }}
            initialTracks={popoutTracks}
            selectedRegionIds={popoutSelectedRegionIds}
            onSelectedRegionIdsChange={(ids) => {
              setPopoutSelectedRegionIds(new Set(ids))
              sendPanelPopoutAction('SYNC_SELECTED_REGION_IDS', { ids: [...ids] })
            }}
            keyboardShortcuts={keyboardShortcuts}
          />
        </div>
      </div>
    )
  }

  const mainDistance = getMinDistanceToSnapPoints(mainLayout, MAIN_VERTICAL_SNAP_POINTS)
  const isMainSnapActive = !panelLayoutLocked && isDraggingMain && mainDistance <= PANEL_LAYOUT_SNAP_THRESHOLD
  const isMainNearActive = !panelLayoutLocked && isDraggingMain && mainDistance > PANEL_LAYOUT_SNAP_THRESHOLD && mainDistance <= 6.0
  const mainClosestSnapPoint = getClosestSnapPoint(mainLayout, MAIN_VERTICAL_SNAP_POINTS)

  const topDistance = getMinDistanceToSnapPoints(topLayout, TOP_HORIZONTAL_SNAP_POINTS)
  const isTopSnapActive = !panelLayoutLocked && isDraggingTop && topDistance <= PANEL_LAYOUT_SNAP_THRESHOLD
  const isTopNearActive = !panelLayoutLocked && isDraggingTop && topDistance > PANEL_LAYOUT_SNAP_THRESHOLD && topDistance <= 6.0
  const topClosestSnapPoint = getClosestSnapPoint(topLayout, TOP_HORIZONTAL_SNAP_POINTS)
  const activeSnapHint = (() => {
    if (panelLayoutLocked) return null

    if ((isDraggingTop || isTopNearActive || isTopSnapActive) && topClosestSnapPoint !== null) {
      return {
        axis: 'horizontal' as const,
        title: isTopSnapActive ? 'Snap aktiv' : 'Snap in Naehe',
        label: `Obere Bereiche ${topClosestSnapPoint}% / ${100 - topClosestSnapPoint}%`,
        distance: topDistance
      }
    }

    if ((isDraggingMain || isMainNearActive || isMainSnapActive) && mainClosestSnapPoint !== null) {
      return {
        axis: 'vertical' as const,
        title: isMainSnapActive ? 'Snap aktiv' : 'Snap in Naehe',
        label: `Workspace / Timeline ${mainClosestSnapPoint}% / ${100 - mainClosestSnapPoint}%`,
        distance: mainDistance
      }
    }

    return null
  })()

  return (
    <div className="h-full w-full flex flex-col bg-omega-dark text-omega-text relative select-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes snapGlowPulse {
          0%, 100% {
            box-shadow: 0 0 6px rgba(0, 120, 215, 0.7), 0 0 15px rgba(0, 120, 215, 0.5);
            background-color: #0078d7;
          }
          50% {
            box-shadow: 0 0 12px rgba(59, 156, 255, 1), 0 0 28px rgba(59, 156, 255, 0.8), 0 0 40px rgba(0, 120, 215, 0.6);
            background-color: #3b9cff;
          }
        }
        .snap-glow-active {
          animation: snapGlowPulse 1.0s infinite ease-in-out;
          background-color: #0078d7 !important;
          z-index: 50 !important;
        }
        .snap-glow-near {
          box-shadow: 0 0 4px rgba(0, 120, 215, 0.45), 0 0 10px rgba(0, 120, 215, 0.25);
          background-color: rgba(0, 120, 215, 0.7) !important;
          z-index: 50 !important;
          transition: box-shadow 0.15s ease, background-color 0.15s ease;
        }
        @keyframes snapHintFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-1px);
          }
        }
        .snap-hint-float {
          animation: snapHintFloat 1.4s ease-in-out infinite;
        }
      ` }} />
      {activeSnapHint && (
        <div className="pointer-events-none absolute right-4 top-12 z-[180]">
          <div
            className={`snap-hint-float min-w-[250px] rounded-lg border px-3 py-2 shadow-2xl backdrop-blur-sm ${
              activeSnapHint.title === 'Snap aktiv'
                ? 'border-cyan-400/60 bg-cyan-500/12 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.18)]'
                : 'border-blue-400/40 bg-slate-900/88 text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.16)]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {activeSnapHint.axis === 'horizontal' ? 'Oberer Bereich' : 'Hauptlayout'}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                activeSnapHint.title === 'Snap aktiv'
                  ? 'bg-cyan-400/18 text-cyan-100'
                  : 'bg-blue-400/18 text-blue-100'
              }`}>
                {activeSnapHint.title}
              </span>
            </div>
            <div className="mt-1 text-sm font-semibold">
              {activeSnapHint.label}
            </div>
            <div className="mt-1 text-[11px] text-white/55">
              Abstand zum Snap-Punkt: {activeSnapHint.distance.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <SettingsModal 
          onClose={() => {
            setShowSettings(false)
            window.api.getSettings().then((s: any) => {
              if (s.maxUndoSteps) setMaxUndoSteps(s.maxUndoSteps)
              if (typeof s.autoSave === 'boolean') setAutoSaveEnabled(s.autoSave)
              if (s.autoSaveInterval) setAutoSaveInterval(s.autoSaveInterval)
              setKeyboardShortcuts(normalizeKeyboardShortcuts(s.keyboardShortcuts))
            })
          }} 
          initialTab={settingsTab} 
          onTriggerUpdate={(updateInfo) => {
            setShowSettings(false)
            openModalPopoutOrInline('update', () => setActiveUpdateInfo(updateInfo), {
              width: 980,
              height: 760,
              title: 'Software Update',
              payload: updateInfo
            });
          }}
        />
      )}
      {showExport && <ExportModal onClose={() => setShowExport(false)} tracks={tracks} />}
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      {showSymbolManager && <SymbolManagerModal onClose={() => setShowSymbolManager(false)} />}
      {modalConfig && (
        <MessageModal 
          type={modalConfig.type} 
          title={modalConfig.title} 
          message={modalConfig.message} 
          checkboxLabel={modalConfig.checkboxLabel}
          defaultCheckboxChecked={modalConfig.defaultCheckboxChecked}
          onClose={handleModalClose} 
        />
      )}
      
      {/* Premium Start Dashboard */}
      {showStartDashboard && (
        <StartDashboard
          onNewProject={(config) => {
            setShowStartDashboard(false)
            // Pre-set project path based on date
            const dateStr = config.projectName || new Date().toISOString().split('T')[0]
            window.api.getSettings().then((settings: any) => {
              const projDir = settings.projPath || ''
              if (projDir) {
                const fullPath = `${projDir}\\${dateStr}.owep`
                setCurrentProjectPath(fullPath)
                ProjectManager.setCurrentPath(fullPath)
              }
            })
            triggerTimelineAction('RESET_PROJECT', { 
              sampleRate: config.sampleRate, 
              tracksCount: config.tracksCount 
            })
          }}
          onOpenProject={async () => {
            const res = await window.api.showOpenDialog({ 
              filters: [{ name: 'Omega Projects', extensions: ['owep'] }], 
              properties: ['openFile'] 
            })
            if (res.canceled || res.filePaths.length === 0) return
            setShowStartDashboard(false)
            triggerTimelineAction('LOAD_PROJECT_DIRECT', res.filePaths[0])
          }}
          onLoadRecentProject={(path) => {
            setShowStartDashboard(false)
            triggerTimelineAction('LOAD_PROJECT_DIRECT', path)
          }}
          onClose={() => setShowStartDashboard(false)}
          onOpenSettings={() => {
            setShowStartDashboard(false)
            openSettings('Projekteinstellungen')
          }}
        />
      )}

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <SaveConfirmationModal
          projectName={currentProjectPath ? currentProjectPath.split(/[\\/]/).pop() || '' : ''}
          onSave={handleSaveAndClose}
          onDiscard={handleDiscardAndClose}
          onCancel={handleCancelClose}
        />
      )}

      {/* Update Download Modal */}
      {activeUpdateInfo && (
        <UpdateModal
          updateInfo={activeUpdateInfo}
          onClose={(deferred) => {
            setActiveUpdateInfo(null)
            if (deferred) {
              showModal('info', 'Update geplant', 'Das Update wurde erfolgreich heruntergeladen und wird ausgeführt, sobald der Editor beendet wird.')
            }
          }}
        />
      )}

      {/* Premium Update Toast */}
      {updateAvailable && (
        <div className="absolute bottom-6 right-6 z-[9999] bg-[#1a1d21]/95 backdrop-blur-md border border-green-500/30 rounded-lg p-4 shadow-2xl max-w-sm flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-5 duration-300 text-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-semibold text-green-400">Software-Update verfügbar</span>
          </div>
          <p className="text-gray-300 text-xs leading-relaxed">
            Eine neuere Version <span className="font-mono text-white font-semibold">v{updateAvailable.latestVersion}</span> ist verfügbar. Möchtest du die Details ansehen und das Update installieren?
          </p>
          <div className="flex gap-3 justify-end mt-1">
            <button 
              onClick={() => setUpdateAvailable(null)}
              className="px-2.5 py-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Später
            </button>
            <button 
              onClick={() => {
                openModalPopoutOrInline('update', () => setActiveUpdateInfo(updateAvailable), {
                  width: 980,
                  height: 760,
                  title: 'Software Update',
                  payload: updateAvailable
                });
                setUpdateAvailable(null)
              }}
              className="px-3 py-1 text-xs bg-omega-accent hover:bg-blue-500 text-white font-semibold rounded shadow transition-colors"
            >
              Jetzt installieren
            </button>
          </div>
        </div>
      )}
      
      {/* Top Bar / Menu */}
      <div className="h-10 bg-omega-panel border-b border-omega-border flex items-center px-4 text-sm z-[999] flex-shrink-0">
        <div className="flex items-center mr-6 gap-2">
            <img src={appIcon} alt="Logo" className="h-6 w-6 object-contain" />
            <span className="font-semibold text-omega-accent">Omega Wave Editor</span>
            {currentProjectPath && (
              <span className="text-xs text-gray-400 font-mono ml-2 border-l border-gray-700 pl-2">
                {currentProjectPath.split(/[\\/]/).pop()} {isDirty ? '*' : ''}
              </span>
            )}
        </div>
        <MenuBar 
          onOpenSettings={() => openSettings('Projekteinstellungen')} 
          onOpenExport={() => window.api.openExportSettings(tracks, null, null)} 
          onFileAction={triggerTimelineAction}
          shortcuts={keyboardShortcuts}
          windowLayouts={Object.keys(windowLayouts).sort((a, b) => a.localeCompare(b, 'de'))}
          activeWindowLayoutName={activeWindowLayoutName}
        />
      </div>

      {/* Main Layout using Split Panes */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup ref={mainPanelGroupRef} direction="vertical" onLayout={handleMainPanelLayout}>
          <Panel defaultSize={50} minSize={20}>
            <PanelGroup ref={topPanelGroupRef} direction="horizontal" onLayout={handleTopPanelLayout}>
              {/* File Explorer (Left) */}
              <Panel defaultSize={30} minSize={15} className="bg-omega-panel border-r border-omega-border">
                <div className="h-full flex flex-col">
                  <div className="h-9 border-b border-omega-border flex items-center justify-between px-3 text-xs uppercase tracking-wider text-gray-400 bg-[#1b1e22]">
                    <span>Import / Player</span>
                    {renderPanelHeaderActions('panel-file-explorer')}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {panelPopoutState['panel-file-explorer'] ? (
                      <div className="h-full flex items-center justify-center text-center text-sm text-gray-400 px-6">
                        <div className="flex flex-col items-center gap-3">
                          <PanelTopOpen size={24} className="text-omega-accent" />
                          <span>Dieser Bereich ist aktuell ausgekoppelt.</span>
                          <button
                            className={`px-3 py-1.5 rounded text-white text-xs ${panelLayoutLocked ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'}`}
                            onClick={() => {
                              if (!panelLayoutLocked) {
                                togglePanelPopout('panel-file-explorer', false)
                              }
                            }}
                            disabled={panelLayoutLocked}
                          >
                            Wieder andocken
                          </button>
                        </div>
                      </div>
                    ) : (
                      <FileExplorer />
                    )}
                  </div>
                </div>
              </Panel>
              
              <PanelResizeHandle
                onDragging={setIsDraggingTop}
                className={`w-1 transition-all duration-150 ${
                  panelLayoutLocked
                    ? 'bg-omega-border/60 cursor-default pointer-events-none'
                    : isTopSnapActive
                      ? 'snap-glow-active cursor-col-resize'
                      : isTopNearActive
                        ? 'snap-glow-near cursor-col-resize'
                        : 'bg-omega-border cursor-col-resize hover:bg-omega-accent'
                }`}
              />
              
              {/* Properties/Preview (Right) */}
              <Panel defaultSize={70} minSize={20} className="bg-omega-dark relative">
                <div className="h-full flex flex-col">
                  <div className="h-9 border-b border-omega-border flex items-center justify-between px-3 text-xs uppercase tracking-wider text-gray-400 bg-[#1b1e22]">
                    <span>Effekte</span>
                    {renderPanelHeaderActions('panel-effects')}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {panelPopoutState['panel-effects'] ? (
                      <div className="h-full flex items-center justify-center text-center text-sm text-gray-400 px-6">
                        <div className="flex flex-col items-center gap-3">
                          <PanelTopOpen size={24} className="text-omega-accent" />
                          <span>Dieser Bereich ist aktuell ausgekoppelt.</span>
                          <button
                            className={`px-3 py-1.5 rounded text-white text-xs ${panelLayoutLocked ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'}`}
                            onClick={() => {
                              if (!panelLayoutLocked) {
                                togglePanelPopout('panel-effects', false)
                              }
                            }}
                            disabled={panelLayoutLocked}
                          >
                            Wieder andocken
                          </button>
                        </div>
                      </div>
                    ) : (
                      <EffectsPanel 
                        selectedRegionId={selectedRegionId}
                        tracks={tracks}
                        onTracksChange={handleTracksUpdate}
                      />
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle
            onDragging={setIsDraggingMain}
            className={`h-1 transition-all duration-150 ${
              panelLayoutLocked
                ? 'bg-omega-border/60 cursor-default pointer-events-none'
                : isMainSnapActive
                  ? 'snap-glow-active cursor-row-resize'
                  : isMainNearActive
                    ? 'snap-glow-near cursor-row-resize'
                    : 'bg-omega-border cursor-row-resize hover:bg-omega-accent'
            }`}
          />

          {/* Timeline (Bottom) */}
          <Panel defaultSize={50} minSize={20} className="bg-omega-panel">
            <div className="h-full flex flex-col">
              <div className="h-9 border-b border-omega-border flex items-center justify-between px-3 text-xs uppercase tracking-wider text-gray-400 bg-[#1b1e22] flex-shrink-0">
                <span>Timeline</span>
                {renderPanelHeaderActions('panel-timeline')}
              </div>
              <div className="flex-1 overflow-hidden">
                {panelPopoutState['panel-timeline'] ? (
                  <div className="h-full flex items-center justify-center text-center text-sm text-gray-400 px-6">
                    <div className="flex flex-col items-center gap-3">
                      <PanelTopOpen size={24} className="text-omega-accent" />
                      <span>Dieser Bereich ist aktuell ausgekoppelt.</span>
                      <button
                        className={`px-3 py-1.5 rounded text-white text-xs ${panelLayoutLocked ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'}`}
                        onClick={() => {
                          if (!panelLayoutLocked) {
                            togglePanelPopout('panel-timeline', false)
                          }
                        }}
                        disabled={panelLayoutLocked}
                      >
                        Wieder andocken
                      </button>
                    </div>
                  </div>
                ) : (
                  <Timeline 
                    onTracksChange={handleTracksUpdate} 
                    onOpenExport={(customTracks, selection, customExportSettings) => {
                      window.api.openExportSettings(
                        customTracks || tracks,
                        selection || null,
                        customExportSettings || null
                      )
                    }}
                    externalAction={timelineAction}
                    initialTracks={tracks}
                    selectedRegionIds={selectedRegionIds}
                    onSelectedRegionIdsChange={setSelectedRegionIds}
                    keyboardShortcuts={keyboardShortcuts}
                    onOpenSymbolManager={openSymbolManager}
                  />
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {isWindowLocked && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[5px] flex items-center justify-center z-[5000] cursor-wait animate-fade-in">
          <div className="bg-[#1e2124]/90 border border-gray-700 p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
            <Loader2 className="animate-spin text-omega-accent w-10 h-10" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-white">Mixdown-Export aktiv</span>
              <span className="text-xs text-gray-400">Das Hauptfenster ist vorübergehend gesperrt, während der Offline-Mixdown gerendert wird. Bitte verfolge den Fortschritt im separaten Fortschrittsfenster.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
