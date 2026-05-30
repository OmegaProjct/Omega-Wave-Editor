import React from 'react'
import { Lock, Unlock, Volume2, ChevronDown, Plus } from 'lucide-react'
import { Track } from '../Timeline'

export interface TrackHeaderProps {
  track: Track
  trackHeight: number
  tracks: Track[]
  updateTracksWithHistory: (newTracks: Track[]) => void
  toggleSolo: (trackId: string) => void
  toggleMute: (trackId: string) => void
  updateTrackVolume: (trackId: string, value: number) => void
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  trackHeight,
  tracks,
  updateTracksWithHistory,
  toggleSolo,
  toggleMute,
  updateTrackVolume
}) => {
  return (
    <div
      className="border-b border-[#282b30] bg-omega-panel flex flex-col justify-center px-1 overflow-hidden"
      style={{ height: trackHeight }}
    >
      {trackHeight >= 55 && (
        <div className="flex items-center gap-1 mb-1 px-1">
          <input
            value={track.name}
            placeholder="kein Name"
            onChange={(e) =>
              updateTracksWithHistory(
                tracks.map((t) => (t.id === track.id ? { ...t, name: e.target.value } : t))
              )
            }
            className="flex-1 h-4 bg-[#1a1d21] border border-gray-600 rounded-sm px-1 text-[9px] text-gray-300 outline-none focus:border-omega-accent"
          />
          <ChevronDown size={8} className="text-gray-500" />
          <Plus size={10} className="text-gray-400 hover:text-white cursor-pointer" />
        </div>
      )}
      <div className="flex items-center gap-0.5 px-1 py-1 text-gray-400">
        {track.locked ? (
          <Lock
            size={10}
            className="cursor-pointer hover:text-white"
            onClick={() =>
              updateTracksWithHistory(
                tracks.map((t) => (t.id === track.id ? { ...t, locked: false } : t))
              )
            }
          />
        ) : (
          <Unlock
            size={10}
            className="cursor-pointer hover:text-white"
            onClick={() =>
              updateTracksWithHistory(
                tracks.map((t) => (t.id === track.id ? { ...t, locked: true } : t))
              )
            }
          />
        )}
        <span
          className={`text-[10px] font-bold px-0.5 cursor-pointer hover:text-white ${
            track.solo ? 'text-yellow-400' : ''
          }`}
          onClick={() => toggleSolo(track.id)}
        >
          S
        </span>
        <span
          className={`text-[10px] font-bold px-0.5 cursor-pointer hover:text-white ${
            track.muted ? 'text-red-400' : ''
          }`}
          onClick={() => toggleMute(track.id)}
        >
          M
        </span>
        <div className="relative group flex items-center">
          <Volume2 size={10} className="ml-1 cursor-pointer hover:text-white" />
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={track.volume}
            onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))}
            className="absolute hidden group-hover:block w-16 h-1 top-0 left-4 z-50 accent-omega-accent"
          />
        </div>
        <div className="flex-1"></div>
        <span className="text-[10px] font-mono">{track.index}</span>
      </div>
    </div>
  )
}
