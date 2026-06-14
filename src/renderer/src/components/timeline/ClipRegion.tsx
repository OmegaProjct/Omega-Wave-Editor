import React from 'react'
import { WaveformRenderer } from '../WaveformRenderer'
import { HistoryManager } from '../../lib/HistoryManager'
import { Region, Track } from '../Timeline'

export interface ClipRegionProps {
  region: Region
  track: Track
  pixelsPerSecond: number
  selectedRegionIds: Set<string>
  hoveredRegionId: string | null
  setHoveredRegionId: (id: string | null) => void
  draggingGain: { regionId: string; containerTop: number; containerHeight: number; startY?: number; startGain?: number } | null
  draggingFade: { regionId: string; edge: 'in' | 'out'; startX: number; startValue: number } | null
  tracks: Track[]
  setDraggingGain: React.Dispatch<React.SetStateAction<{ regionId: string; containerTop: number; containerHeight: number; startY?: number; startGain?: number } | null>>
  setDraggingFade: React.Dispatch<React.SetStateAction<{ regionId: string; edge: 'in' | 'out'; startX: number; startValue: number } | null>>
  handleRegionMouseDown: (e: React.MouseEvent, trackId: string, regionId: string, action?: 'move' | 'trimStart' | 'trimEnd') => void
  handleRegionClick: (e: React.MouseEvent, trackId: string, regionId: string) => void
  handleRegionContextMenu: (e: React.MouseEvent, regionId: string) => void
}

export const ClipRegion: React.FC<ClipRegionProps> = ({
  region,
  track,
  pixelsPerSecond,
  selectedRegionIds,
  hoveredRegionId,
  setHoveredRegionId,
  draggingGain,
  draggingFade,
  tracks,
  setDraggingGain,
  setDraggingFade,
  handleRegionMouseDown,
  handleRegionClick,
  handleRegionContextMenu
}) => {
  const regionWidthPx = region.duration * pixelsPerSecond
  const fadeInPx = (region.fadeIn || 0) * pixelsPerSecond
  const fadeOutPx = (region.fadeOut || 0) * pixelsPerSecond
  const gainLinear = region.gain !== undefined ? region.gain : 1.0
  const gainDb = gainLinear > 0 ? 20 * Math.log10(gainLinear) : -Infinity
  let gainYPercent = 50
  if (gainLinear <= 1.0) {
    gainYPercent = 100 - gainLinear * 50
  } else {
    gainYPercent = 50 - ((gainLinear - 1.0) / 3.0) * 50
  }
  gainYPercent = Math.max(8, Math.min(92, gainYPercent))
  const isHovered = hoveredRegionId === region.id
  const isSelected = selectedRegionIds.has(region.id)

  // Crossfade: same-track overlap detection
  const sortedOnTrack = [...track.regions].sort((a, b) => a.startPos - b.startPos)
  const prevOnTrack = sortedOnTrack.find(
    (r) => r.id !== region.id && r.startPos + r.duration > region.startPos && r.startPos < region.startPos
  )
  const nextOnTrack = sortedOnTrack.find(
    (r) => r.id !== region.id && r.startPos < region.startPos + region.duration && r.startPos > region.startPos
  )
  const xfadeInPx = prevOnTrack
    ? Math.max(0, (prevOnTrack.startPos + prevOnTrack.duration - region.startPos) * pixelsPerSecond)
    : 0
  const xfadeOutPx = nextOnTrack
    ? Math.max(0, (region.startPos + region.duration - nextOnTrack.startPos) * pixelsPerSecond)
    : 0

  // Manual fades shown only when no crossfade is active on that side
  const showFadeIn = fadeInPx > 1 && xfadeInPx < 1
  const showFadeOut = fadeOutPx > 1 && xfadeOutPx < 1

  return (
    <div
      data-region-id={region.id}
      onMouseDown={(e) => handleRegionMouseDown(e, track.id, region.id, 'move')}
      onClick={(e) => handleRegionClick(e, track.id, region.id)}
      onContextMenu={(e) => handleRegionContextMenu(e, region.id)}
      onMouseEnter={() => setHoveredRegionId(region.id)}
      onMouseLeave={() => setHoveredRegionId(null)}
      className={`absolute top-0.5 bottom-0.5 border rounded overflow-hidden cursor-grab active:cursor-grabbing flex flex-col shadow-md ${
        isSelected
          ? 'border-[#ffbe00] shadow-[0_0_8px_rgba(255,190,0,0.3)] z-10'
          : 'border-black/50 z-1'
      }`}
      style={{ left: `${region.startPos * pixelsPerSecond}px`, width: `${regionWidthPx}px` }}
    >
      {/* Namensleiste (Header) */}
      <div
        className={`h-[18px] select-none flex-shrink-0 font-semibold flex items-center justify-between px-2 text-[10px] truncate ${
          isSelected ? 'bg-[#ffbe00] text-black font-bold' : `${region.color} text-white`
        }`}
      >
        <span className="truncate flex-1 pr-2">{region.file.name}</span>
        {region.groupId && (
          <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full flex-shrink-0 shadow" title="Gruppiert" />
        )}
      </div>

      {/* Körper (Body) */}
      <div className="flex-1 bg-[#15171a] relative overflow-hidden pointer-events-auto">
        {/* z-[1]: Waveform — always at bottom */}
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <WaveformRenderer
            filePath={region.file.path}
            sourceOffset={region.sourceOffset}
            duration={region.duration}
            fileDuration={region.fileDuration}
            displayDuration={region.duration}
            channel={region.stereoMode === 'left-only' ? 'left' : (region.stereoMode === 'right-only' ? 'right' : undefined)}
            gain={region.gain}
            pixelsPerSecond={pixelsPerSecond}
            regionStart={region.startPos}
            scrollLeft={region.startPos * pixelsPerSecond}
            viewportWidth={regionWidthPx}
            sourceChannels={region.channels}
          />
        </div>

        {/* z-[2]: Crossfade-In (left side) */}
        {xfadeInPx > 1 && (
          <div className="absolute left-0 top-0 bottom-0 z-[2] pointer-events-none" style={{ width: `${xfadeInPx}px` }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
              <polygon points={`0,0 100,0 100,${gainYPercent} 0,100`} fill="rgba(0,0,0,0.28)" />
              <line
                x1="0"
                y1="100"
                x2="100"
                y2={gainYPercent}
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        )}

        {/* z-[2]: Crossfade-Out (right side) */}
        {xfadeOutPx > 1 && (
          <div className="absolute right-0 top-0 bottom-0 z-[2] pointer-events-none" style={{ width: `${xfadeOutPx}px` }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
              <polygon points={`0,0 100,0 100,100 0,${gainYPercent}`} fill="rgba(0,0,0,0.28)" />
              <line
                x1="0"
                y1={gainYPercent}
                x2="100"
                y2="100"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        )}

        {/* z-[2]: Manual Fade-In (only when no crossfade on left) */}
        {showFadeIn && (
          <div className="absolute left-0 top-0 bottom-0 z-[2] pointer-events-none" style={{ width: `${fadeInPx}px` }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
              <polygon points={`0,0 100,0 100,${gainYPercent} 0,100`} fill="rgba(0,0,0,0.30)" />
              <line
                x1="0"
                y1="100"
                x2="100"
                y2={gainYPercent}
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        )}

        {/* z-[2]: Manual Fade-Out (only when no crossfade on right) */}
        {showFadeOut && (
          <div className="absolute right-0 top-0 bottom-0 z-[2] pointer-events-none" style={{ width: `${fadeOutPx}px` }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
              <polygon points={`0,0 100,0 100,100 0,${gainYPercent}`} fill="rgba(0,0,0,0.30)" />
              <line
                x1="0"
                y1={gainYPercent}
                x2="100"
                y2="100"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        )}

        {/* z-[4]: Volume gain line (interactive, 14px hit area) */}
        <div
          className="absolute left-0 right-0 z-[4]"
          style={{
            top: `${gainYPercent}%`,
            transform: 'translateY(-50%)',
            height: '14px',
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center'
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            const bodyEl = e.currentTarget.parentElement
            if (bodyEl) {
              const rect = bodyEl.getBoundingClientRect()
              HistoryManager.pushState(tracks)
              setDraggingGain({
                regionId: region.id,
                startY: e.clientY,
                startGain: gainLinear,
                containerTop: rect.top,
                containerHeight: rect.height
              })
            }
          }}
        >
          <div
            className={`w-full pointer-events-none transition-all ${
              isHovered || draggingGain?.regionId === region.id
                ? 'h-0.5 bg-white opacity-100'
                : 'h-px bg-white/45 opacity-80'
            }`}
          />
          {(isHovered || draggingGain?.regionId === region.id) && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-6 bg-black/90 text-white text-[9px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-[50] shadow">
              {gainDb === -Infinity ? '-∞' : gainDb.toFixed(1)} dB
            </div>
          )}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 shadow pointer-events-none transition-all ${
              isHovered || draggingGain?.regionId === region.id ? 'w-3 h-3 bg-white' : 'w-2.5 h-2.5 bg-white/75'
            }`}
          />
        </div>

        {/* z-[10]: Fade-In circular handle (Kugel - only shown on hover or drag) */}
        {(isHovered || (draggingFade?.regionId === region.id && draggingFade?.edge === 'in')) && (
          <div
            className="absolute z-[10] cursor-ew-resize flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group/fadein"
            style={{
              left: `${fadeInPx}px`,
              top: `${gainYPercent}%`,
              width: '18px',
              height: '18px'
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              HistoryManager.pushState(tracks)
              setDraggingFade({
                regionId: region.id,
                edge: 'in',
                startX: e.clientX,
                startValue: region.fadeIn || 0
              })
            }}
          >
            <div
              className={`rounded-full border border-white/60 shadow transition-all ${
                draggingFade?.regionId === region.id && draggingFade?.edge === 'in'
                  ? 'w-3.5 h-3.5 bg-omega-accent'
                  : 'w-2.5 h-2.5 bg-white hover:bg-omega-accent group-hover/fadein:w-3.5 group-hover/fadein:h-3.5'
              }`}
            />
            <div className="absolute -top-7 bg-black/90 text-white text-[9px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-[50] shadow border border-gray-700/50">
              Einblenden: {(region.fadeIn || 0).toFixed(2)}s
            </div>
          </div>
        )}

        {/* z-[10]: Fade-Out circular handle (Kugel - only shown on hover or drag) */}
        {(isHovered || (draggingFade?.regionId === region.id && draggingFade?.edge === 'out')) && (
          <div
            className="absolute z-[10] cursor-ew-resize flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group/fadeout"
            style={{
              left: `${regionWidthPx - fadeOutPx}px`,
              top: `${gainYPercent}%`,
              width: '18px',
              height: '18px'
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              HistoryManager.pushState(tracks)
              setDraggingFade({
                regionId: region.id,
                edge: 'out',
                startX: e.clientX,
                startValue: region.fadeOut || 0
              })
            }}
          >
            <div
              className={`rounded-full border border-white/60 shadow transition-all ${
                draggingFade?.regionId === region.id && draggingFade?.edge === 'out'
                  ? 'w-3.5 h-3.5 bg-omega-accent'
                  : 'w-2.5 h-2.5 bg-white hover:bg-omega-accent group-hover/fadeout:w-3.5 group-hover/fadeout:h-3.5'
              }`}
            />
            <div className="absolute -top-7 bg-black/90 text-white text-[9px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-[50] shadow border border-gray-700/50">
              Ausblenden: {(region.fadeOut || 0).toFixed(2)}s
            </div>
          </div>
        )}

        {/* z-[6]: Trim handles (left/right resize) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 z-[6] cursor-w-resize hover:bg-white/20"
          onMouseDown={(e) => handleRegionMouseDown(e, track.id, region.id, 'trimStart')}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-2 z-[6] cursor-e-resize hover:bg-white/20"
          onMouseDown={(e) => handleRegionMouseDown(e, track.id, region.id, 'trimEnd')}
        />
      </div>
    </div>
  )
}
