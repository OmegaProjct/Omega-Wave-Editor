import { useState, useCallback, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileExplorer } from './components/FileExplorer'
import { Timeline } from './components/Timeline'
import { MenuBar } from './components/MenuBar'
import { SettingsModal } from './components/SettingsModal'
import { EffectsPanel } from './components/EffectsPanel'
import { ExportModal } from './components/ExportModal'
import { MessageModal, ModalType } from './components/MessageModal'
import { ManualModal } from './components/ManualModal'
import { useHistory } from './lib/useHistory'
import appIcon from './assets/app_icon.png'

function App(): JSX.Element {
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'Wiedergabe' | 'Ordner' | 'Import/Audio' | 'System' | 'Tastaturkürzel' | 'Projekteinstellungen'>('Ordner')
  const [showExport, setShowExport] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<any | null>(null)
  
  // Global Modal State
  const [modalConfig, setModalConfig] = useState<{ type: ModalType, title: string, message: string, onConfirm?: () => void } | null>(null)

  const openSettings = (tab: 'Wiedergabe' | 'Ordner' | 'Import/Audio' | 'System' | 'Tastaturkürzel' | 'Projekteinstellungen' = 'Ordner') => {
    setSettingsTab(tab)
    setShowSettings(true)
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
        console.error('Automatischer Update-Check fehlgeschlagen:', e)
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
  
  // Initial Tracks
  const initialTracks = [
    { id: '1', index: 1, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '2', index: 2, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '3', index: 3, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
    { id: '4', index: 4, name: '', regions: [], muted: false, solo: false, locked: false, visible: true, volume: 1, height: 64, automation: [] },
  ];

  const { state: tracks, push: pushTracks, undo, redo } = useHistory(initialTracks);
  
  const [selectedRegionIds, setSelectedRegionIds] = useState<Set<string>>(new Set())
  const selectedRegionId = selectedRegionIds.size === 1 ? [...selectedRegionIds][0] : selectedRegionIds.size > 1 ? [...selectedRegionIds][0] : null

  const [timelineAction, setTimelineAction] = useState<{ type: string; payload?: any } | undefined>()

  const handleTracksUpdate = (updatedTracks: any[]) => {
    pushTracks(updatedTracks)
  }

  const triggerTimelineAction = (type: string, payload?: any) => {
    if (type === 'UNDO') {
      const prev = undo();
      if (prev) setTimelineAction({ type: 'SET_TRACKS', payload: prev });
      return;
    }
    if (type === 'REDO') {
      const next = redo();
      if (next) setTimelineAction({ type: 'SET_TRACKS', payload: next });
      return;
    }
    if (type === 'NEW_PROJECT') {
      showModal('confirm', 'Neues Projekt', 'Möchten Sie ein neues Projekt erstellen?\nAlle ungespeicherten Änderungen gehen verloren.', () => {
        setTimelineAction({ type: 'RESET_PROJECT' });
      })
      return;
    }
    if (type === 'SHOW_MODAL' && payload) {
       showModal(payload.type, payload.title, payload.message)
       return;
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
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        triggerTimelineAction('UNDO');
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        triggerTimelineAction('REDO');
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
  }, [undo, redo]);

  return (
    <div className="h-full w-full flex flex-col bg-omega-dark text-omega-text relative">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} initialTab={settingsTab} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} tracks={tracks} />}
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
      {modalConfig && <MessageModal type={modalConfig.type} title={modalConfig.title} message={modalConfig.message} onClose={handleModalClose} />}

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
                setUpdateAvailable(null)
                openSettings('System')
              }}
              className="px-3 py-1 text-xs bg-omega-accent hover:bg-blue-500 text-white font-semibold rounded shadow transition-colors"
            >
              Details anzeigen
            </button>
          </div>
        </div>
      )}
      
      {/* Top Bar / Menu */}
      <div className="h-10 bg-omega-panel border-b border-omega-border flex items-center px-4 text-sm z-[999] flex-shrink-0">
        <div className="flex items-center mr-6 gap-2">
            <img src={appIcon} alt="Logo" className="h-6 w-6 object-contain" />
            <span className="font-semibold text-omega-accent">Omega Wave Editor</span>
        </div>
        <MenuBar 
          onOpenSettings={() => openSettings('Ordner')} 
          onOpenExport={() => setShowExport(true)} 
          onFileAction={triggerTimelineAction}
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
              onOpenExport={() => setShowExport(true)} 
              externalAction={timelineAction}
              initialTracks={tracks}
              selectedRegionIds={selectedRegionIds}
              onSelectedRegionIdsChange={setSelectedRegionIds}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}

export default App

