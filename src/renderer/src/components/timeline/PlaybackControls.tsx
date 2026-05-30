import React from 'react'
import {
  MousePointer2,
  Scissors,
  Mic,
  RotateCcw,
  RotateCw,
  Magnet,
  Link,
  Unlink,
  ChevronDown,
  MoveHorizontal,
  Maximize2,
  Minus,
  Plus
} from 'lucide-react'
import { Track } from '../Timeline'
import { HistoryManager } from '../../lib/HistoryManager'

// --- TRANSPORT BAR ---
export interface TransportBarProps {
  toolMode: 'select' | 'scissors'
  setToolMode: (mode: 'select' | 'scissors') => void
  showAudioRecording: boolean
  setShowAudioRecording: (show: boolean) => void
  tracks: Track[]
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>
  onTracksChange?: (tracks: Track[]) => void
  isInternalUpdateRef: React.MutableRefObject<boolean>
  snapEnabled: boolean
  setSnapEnabled: React.Dispatch<React.SetStateAction<boolean>>
  groupSelected: () => void
  ungroupSelected: () => void
  closeAllGaps: () => void
  selectedRegionIds: Set<string>
  onOpenExport?: () => void
}

export const GapCloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="inline-block mr-1"
  >
    <rect x="2" y="4" width="7" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
    <rect x="15" y="14" width="7" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
    <path d="M10 7h4M14 7l-2-2M14 7l-2 2" />
    <path d="M14 17h-4M10 17l2-2M10 17l2 2" />
  </svg>
)

export const TransportBar: React.FC<TransportBarProps> = ({
  toolMode,
  setToolMode,
  showAudioRecording,
  setShowAudioRecording,
  tracks,
  setTracks,
  onTracksChange,
  isInternalUpdateRef,
  snapEnabled,
  setSnapEnabled,
  groupSelected,
  ungroupSelected,
  closeAllGaps,
  selectedRegionIds,
  onOpenExport
}) => {
  const triggerTracksChange = (newTracks: Track[]) => {
    setTracks(newTracks)
    if (onTracksChange) {
      isInternalUpdateRef.current = true
      onTracksChange(newTracks)
      Promise.resolve().then(() => {
        isInternalUpdateRef.current = false
      })
    }
  }

  return (
    <div className="h-10 border-b border-omega-border flex items-center bg-omega-panel px-2 gap-2 z-[150]">
      {/* Tools */}
      <div className="flex gap-1 border-r border-gray-700 pr-2">
        <button
          title="Auswahlwerkzeug"
          className={`p-1.5 rounded ${
            toolMode === 'select' ? 'text-white bg-omega-accent' : 'hover:bg-gray-700 text-gray-400'
          }`}
          onClick={() => setToolMode('select')}
        >
          <MousePointer2 size={16} />
        </button>
        <button
          title="Schneidewerkzeug (T)"
          className={`p-1.5 rounded ${
            toolMode === 'scissors' ? 'text-white bg-omega-accent' : 'hover:bg-gray-700 text-gray-400'
          }`}
          onClick={() => setToolMode('scissors')}
        >
          <Scissors size={16} />
        </button>
      </div>

      {/* Recording */}
      <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
        <button
          title="Aufnahme"
          className={`p-1.5 rounded ${
            showAudioRecording ? 'text-red-500 animate-pulse bg-red-500/20' : 'hover:bg-gray-700 text-gray-400'
          }`}
          onClick={() => setShowAudioRecording(true)}
        >
          <Mic size={16} />
        </button>
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
        <button
          title="Rückgängig (Strg+Z)"
          className="p-1.5 hover:bg-gray-700 rounded"
          onClick={() => {
            const prev = HistoryManager.undo(tracks)
            if (prev) triggerTracksChange(prev)
          }}
        >
          <RotateCcw size={16} />
        </button>
        <button
          title="Wiederholen (Strg+Y)"
          className="p-1.5 hover:bg-gray-700 rounded"
          onClick={() => {
            const next = HistoryManager.redo(tracks)
            if (next) triggerTracksChange(next)
          }}
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* Snap + Group */}
      <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
        <button
          title={snapEnabled ? 'Magnet/Snap aktiv – klicken zum Deaktivieren' : 'Magnet/Snap aktivieren'}
          className={`p-1.5 rounded ${
            snapEnabled
              ? 'text-white bg-omega-accent shadow-[0_0_8px_rgba(59,130,246,0.5)]'
              : 'hover:bg-gray-700 text-gray-400'
          }`}
          onClick={() => setSnapEnabled(!snapEnabled)}
        >
          <Magnet size={16} />
        </button>
        <button
          title="Auswahl gruppieren"
          className="p-1.5 hover:bg-gray-700 rounded"
          onClick={groupSelected}
          disabled={selectedRegionIds.size < 2}
        >
          <Link size={16} className={selectedRegionIds.size >= 2 ? 'text-gray-300' : 'text-gray-600'} />
        </button>
        <button
          title="Gruppe auflösen"
          className="p-1.5 hover:bg-gray-700 rounded"
          onClick={ungroupSelected}
          disabled={selectedRegionIds.size === 0}
        >
          <Unlink size={16} className={selectedRegionIds.size > 0 ? 'text-gray-300' : 'text-gray-600'} />
        </button>
      </div>

      {/* Gap Closing */}
      <div className="flex gap-1 text-gray-400 border-r border-gray-700 pr-2">
        <button
          title="Lücken finden und schließen (horizontal über alle Spuren)"
          className="p-1.5 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center hover:text-white"
          onClick={closeAllGaps}
        >
          <GapCloseIcon />
          <span className="text-[10px] ml-1 font-semibold">Lücken schließen</span>
        </button>
      </div>

      <div className="flex-1"></div>
      <button
        className="px-4 py-1 bg-omega-accent hover:bg-blue-500 text-white text-xs rounded shadow transition-colors"
        onClick={onOpenExport}
      >
        Mixdown Export
      </button>
    </div>
  )
}

// --- ZOOM CONTROLS ---
export interface ZoomControlsProps {
  zoomLevel: number
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>
  zoomMenuOpen: boolean
  setZoomMenuOpen: (open: boolean) => void
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  setZoomLevel,
  zoomMenuOpen,
  setZoomMenuOpen
}) => {
  return (
    <div className="flex items-center gap-1.5 px-2 bg-[#282b30] h-full border-l border-omega-border relative z-[150]">
      <div
        className="flex items-center gap-0.5 text-gray-400 hover:text-white cursor-pointer px-1 h-full relative"
        onClick={(e) => {
          e.stopPropagation()
          setZoomMenuOpen(!zoomMenuOpen)
        }}
      >
        <span className="text-[10px] font-semibold min-w-[32px] text-right">
          {Math.round(zoomLevel * 100)}%
        </span>
        <ChevronDown size={10} />
        {zoomMenuOpen && (
          <div className="absolute bottom-full mb-1 left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded text-omega-text flex flex-col w-24">
            {[10, 25, 50, 100, 200, 400].map((z) => (
              <div
                key={z}
                className="px-3 py-1 hover:bg-omega-accent cursor-pointer text-xs"
                onClick={() => setZoomLevel(z / 100)}
              >
                {z}%
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="w-px h-4 bg-gray-700 mx-0.5"></div>
      <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
        <MoveHorizontal size={14} />
      </button>
      <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" onClick={() => setZoomLevel(1)}>
        <Maximize2 size={14} />
      </button>
      <button
        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
        onClick={() => setZoomLevel((z) => Math.max(0.05, z - 0.1))}
      >
        <Minus size={14} />
      </button>
      <button
        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
        onClick={() => setZoomLevel((z) => Math.min(20, z + 0.1))}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// --- STATUS BAR ---
export interface StatusBarProps {
  perfStats: { cpuUsage: number; processRamBytes: number; systemRamPct: number }
  globalProgress: number | null
  globalProgressLabel: string
  playheadPos: number
}

export const StatusBar: React.FC<StatusBarProps> = ({
  perfStats,
  globalProgress,
  globalProgressLabel,
  playheadPos
}) => {
  return (
    <div className="h-5 bg-[#141619] border-t border-black flex items-center px-3 text-[10px] text-gray-500 gap-4 z-[160] select-none font-medium">
      <span className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            perfStats.cpuUsage > 80
              ? 'bg-red-500 shadow-[0_0_4px_#ef4444]'
              : perfStats.cpuUsage > 50
                ? 'bg-yellow-500 shadow-[0_0_4px_#eab308]'
                : 'bg-green-500 shadow-[0_0_4px_#22c55e]'
          }`}
        />
        CPU: {perfStats.cpuUsage}%
      </span>
      <div className="h-2 w-px bg-gray-800"></div>
      <span className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            perfStats.systemRamPct > 90
              ? 'bg-red-500 shadow-[0_0_4px_#ef4444]'
              : perfStats.systemRamPct > 70
                ? 'bg-yellow-500 shadow-[0_0_4px_#eab308]'
                : 'bg-green-500 shadow-[0_0_4px_#22c55e]'
          }`}
        />
        RAM: {(perfStats.processRamBytes / (1024 * 1024)).toFixed(1)} MB (System: {perfStats.systemRamPct}%)
      </span>
      <div className="h-2 w-px bg-gray-800"></div>
      <span>Disk: Bereit</span>

      {globalProgress !== null && (
        <>
          <div className="h-2 w-px bg-gray-800"></div>
          <div className="flex items-center gap-2 flex-1 max-w-[240px] text-omega-text bg-black/35 px-2 py-0.5 rounded border border-gray-800/40">
            <span className="truncate text-[9px] font-semibold text-gray-400">
              {globalProgressLabel || 'Verarbeite...'}
            </span>
            <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden relative border border-gray-700/30">
              <div
                className="h-full bg-omega-accent shadow-[0_0_6px_rgba(59,130,246,0.8)] transition-all duration-300"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-omega-accent font-semibold">
              {Math.round(globalProgress)}%
            </span>
          </div>
        </>
      )}

      <div className="flex-1"></div>
      <span className="font-mono text-omega-accent font-semibold">{playheadPos.toFixed(2)}s</span>
    </div>
  )
}
