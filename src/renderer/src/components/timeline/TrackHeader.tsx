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
  toggleVolumeMute?: (trackId: string) => void
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  trackHeight,
  tracks,
  updateTracksWithHistory,
  toggleSolo,
  toggleMute,
  updateTrackVolume,
  toggleVolumeMute
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
      <div className="flex items-center gap-1 px-1 py-1 text-gray-400">
        <button
          type="button"
          title={track.locked ? "Spur entsperren" : "Spur sperren"}
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors duration-150 ${
            track.locked
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
              : 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-300'
          }`}
          onClick={() =>
            updateTracksWithHistory(
              tracks.map((t) => (t.id === track.id ? { ...t, locked: !t.locked } : t))
            )
          }
        >
          {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
        <button
          type="button"
          title="Solo"
          className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-extrabold transition-colors duration-150 ${
            track.solo
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
              : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300'
          }`}
          onClick={() => toggleSolo(track.id)}
        >
          S
        </button>
        <button
          type="button"
          title="Mute"
          className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-extrabold transition-colors duration-150 ${
            track.muted
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
              : 'bg-red-950/60 hover:bg-red-900/80 text-red-300'
          }`}
          onClick={() => toggleMute(track.id)}
        >
          M
        </button>
        <div className="flex-1"></div>
        <span className="text-[10px] font-mono">{track.index}</span>
      </div>
      {trackHeight >= 40 && (
        <div className="flex items-center gap-1.5 px-1 py-0.5 text-gray-400">
          <button
            type="button"
            title="Lautstärkeregler stummschalten/wiederherstellen"
            className="w-5 h-5 flex items-center justify-center rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 flex-shrink-0 transition-colors duration-150"
            onClick={() => {
              if (toggleVolumeMute) {
                toggleVolumeMute(track.id);
              } else {
                const cleanTrackId = track.id.replace(/_[LR]$/, '');
                const targetTrack = tracks.find(t => t.id === cleanTrackId);
                if (!targetTrack) return;
                let newVolume = 0;
                let preMuteVolume = targetTrack.volume;
                if (targetTrack.volume > 0) {
                  newVolume = 0;
                  preMuteVolume = targetTrack.volume;
                  const newTracks = tracks.map(t => t.id === cleanTrackId ? { ...t, volume: 0, preMuteVolume } : t);
                  updateTracksWithHistory(newTracks);
                  updateTrackVolume(cleanTrackId, 0);
                } else {
                  newVolume = targetTrack.preMuteVolume !== undefined ? targetTrack.preMuteVolume : 1.0;
                  const newTracks = tracks.map(t => t.id === cleanTrackId ? { ...t, volume: newVolume } : t);
                  updateTracksWithHistory(newTracks);
                  updateTrackVolume(cleanTrackId, newVolume);
                }
              }
            }}
          >
            <Volume2 size={11} />
          </button>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={track.volume}
            onChange={(e) => updateTrackVolume(track.id, parseFloat(e.target.value))}
            className="w-full h-1 accent-omega-accent bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}
    </div>
  )
}
