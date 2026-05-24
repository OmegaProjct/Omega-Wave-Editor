import { useState, useCallback, useEffect, useRef } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileExplorer } from './components/FileExplorer'
import { Timeline } from './components/Timeline'
import { MenuBar } from './components/MenuBar'
import { SettingsModal } from './components/SettingsModal'
import { EffectsPanel } from './components/EffectsPanel'
import { ExportModal } from './components/ExportModal'
import { MessageModal, ModalType } from './components/MessageModal'
import { ManualModal } from './components/ManualModal'
import { StartDashboard } from './components/StartDashboard'
import { SaveConfirmationModal } from './components/SaveConfirmationModal'
import { UpdateModal } from './components/UpdateModal'
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
import { Loader2 } from 'lucide-react'

function App(): JSX.Element {
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'Wiedergabe' | 'Ordner' | 'Import/Audio' | 'System' | 'Tastaturkürzel' | 'Projekteinstellungen'>('Projekteinstellungen')
  const [showExport, setShowExport] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<any | null>(null)
  const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcuts>(DEFAULT_KEYBOARD_SHORTCUTS)
  
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
  // Global Modal State
  const [modalConfig, setModalConfig] = useState<{ type: ModalType, title: string, message: string, onConfirm?: () => void } | null>(null)

  // Initial Tracks
  const initialTracks = [
    { id: '1', index: 1, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '2', index: 2, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '3', index: 3, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '4', index: 4, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
  ];

  const { state: tracks, push: pushTracks, undo, redo } = useHistory(initialTracks, maxUndoSteps);

  const openSettings = (tab: 'Wiedergabe' | 'Ordner' | 'Import/Audio' | 'System' | 'Tastaturkürzel' | 'Projekteinstellungen' = 'Projekteinstellungen') => {
    setSettingsTab(tab)
    setShowSettings(true)
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
    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<any>
      setKeyboardShortcuts(normalizeKeyboardShortcuts(customEvent.detail?.keyboardShortcuts))
    }

    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdated as EventListener)
    return () => window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdated as EventListener)
  }, [])

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
  const handleSaveAndClose = async () => {
    setShowSaveConfirm(false)
    let path = currentProjectPath
    if (!path) {
      const res = await window.api.showSaveDialog({ filters: [{ name: 'Omega Projects', extensions: ['owep'] }] })
      if (res.canceled || !res.filePath) {
        return // User canceled saving, do not close the window
      }
      path = res.filePath
    }
    
    const saveResult = await ProjectManager.saveProject(path, tracks, { zoomLevel: 1, sampleRate: 48000, playheadPos: 0 })
    if (saveResult.success) {
      setIsDirty(false)
      window.api.confirmClose()
    } else {
      showModal('error', 'Fehler beim Speichern', 'Das Projekt konnte nicht gespeichert werden.')
    }
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

  const showModal = (type: ModalType, title: string, message: string, onConfirm?: () => void) => {
    setModalConfig({ type, title, message, onConfirm })
  }

  const handleModalClose = (result?: boolean) => {
    if (result && modalConfig?.onConfirm) {
      modalConfig.onConfirm()
    }
    setModalConfig(null)
  }
  
  const [selectedRegionIds, setSelectedRegionIds] = useState<Set<string>>(new Set())
  const selectedRegionId = selectedRegionIds.size === 1 ? [...selectedRegionIds][0] : selectedRegionIds.size > 1 ? [...selectedRegionIds][0] : null

  const [timelineAction, setTimelineAction] = useState<{ type: string; payload?: any } | undefined>()

  const handleTracksUpdate = (updatedTracks: any[]) => {
    pushTracks(updatedTracks)
    setIsDirty(true)
  }

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
       setActiveUpdateInfo(payload)
       return
    }
    if (type === 'SHOW_MANUAL') {
       setShowManual(true);
       return;
    }
    setTimelineAction({ type, payload });
    setTimeout(() => setTimelineAction(undefined), 100);
  }

  // Handle Keyboard Shortcuts for Undo/Redo and Global Modals
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // 1. Eingabefelder und editierbare Elemente überspringen
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable
      ) {
        return;
      }

      // 2. Modals in App prüfen (Leertaste ignorieren)
      if (
        showSettings ||
        showExport ||
        showManual ||
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
        setSettingsTab('Projekteinstellungen');
        setShowSettings(true);
      } else if (matchesShortcut(e, keyboardShortcuts.exportAudio)) {
        e.preventDefault();
        window.api.openExportSettings(tracks);
      }
    };

    const handleGlobalModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        showModal(customEvent.detail.type, customEvent.detail.title, customEvent.detail.message);
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

        const audioBuffer = await AudioEngine.getInstance().renderOffline(
          { tracks: settings.tracks },
          parsedSampleRate
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

    return () => {
      unsubscribeLock();
      unsubscribeRender();
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-omega-dark text-omega-text relative">
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
            setActiveUpdateInfo(updateInfo)
          }}
        />
      )}
      {showExport && <ExportModal onClose={() => setShowExport(false)} tracks={tracks} />}
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
      {modalConfig && <MessageModal type={modalConfig.type} title={modalConfig.title} message={modalConfig.message} onClose={handleModalClose} />}
      
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
                setActiveUpdateInfo(updateAvailable)
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
          onOpenExport={() => window.api.openExportSettings(tracks)} 
          onFileAction={triggerTimelineAction}
          shortcuts={keyboardShortcuts}
        />
      </div>

      {/* Main Layout using Split Panes */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          <Panel defaultSize={50} minSize={20}>
            <PanelGroup direction="horizontal">
              {/* File Explorer (Left) */}
              <Panel defaultSize={30} minSize={15} className="bg-omega-panel border-r border-omega-border">
                <FileExplorer />
              </Panel>
              
              <PanelResizeHandle className="w-1 bg-omega-border cursor-col-resize hover:bg-omega-accent transition-colors" />
              
              {/* Properties/Preview (Right) */}
              <Panel defaultSize={70} minSize={20} className="bg-omega-dark relative">
                <EffectsPanel 
                  selectedRegionId={selectedRegionId}
                  tracks={tracks}
                  onTracksChange={handleTracksUpdate}
                />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="h-1 bg-omega-border cursor-row-resize hover:bg-omega-accent transition-colors" />

          {/* Timeline (Bottom) */}
          <Panel defaultSize={50} minSize={20} className="bg-omega-panel">
            <Timeline 
              onTracksChange={handleTracksUpdate} 
              onOpenExport={() => window.api.openExportSettings(tracks)} 
              externalAction={timelineAction}
              initialTracks={tracks}
              selectedRegionIds={selectedRegionIds}
              onSelectedRegionIdsChange={setSelectedRegionIds}
              keyboardShortcuts={keyboardShortcuts}
            />
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
