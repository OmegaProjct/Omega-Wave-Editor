import React, { useState, useEffect, useMemo } from 'react'
import { Folder, Save, Tag } from 'lucide-react'
import { AudioEngine } from '../lib/AudioEngine'

const ID3_FORMATS = ['MP3 (Lame Encoder)', 'M4A (AAC Audio)', 'OGG (Vorbis)', 'OPUS (Interactive)']

const EXPORT_PHASES = [
  'Analysiere Spuren...',
  'Mixdown wird berechnet...',
  'Encoding läuft...',
  'Metadaten werden geschrieben...',
  'Fertigstellen...',
]

export function ExportModal({ onClose, tracks = [] }: { onClose?: () => void; tracks?: any[] }) {
  const isPopout = new URLSearchParams(window.location.search).get('window') === 'export';

  const handleClose = () => {
    if (isPopout) {
      window.close();
    } else if (onClose) {
      onClose();
    }
  };

  // Derive source path: if all regions come from one file
  const allRegions = useMemo(() => tracks.flatMap(t => t.regions), [tracks])
  const uniqueSources = useMemo(() => [...new Set(allRegions.map(r => r.file?.path).filter(Boolean))], [allRegions])
  const singleSource = useMemo(() => uniqueSources.length === 1 ? uniqueSources[0] : null, [uniqueSources])

  const [format, setFormat] = useState(() => {
    if (singleSource) {
      const lower = singleSource.toLowerCase()
      if (lower.endsWith('.mp3')) return 'MP3 (Lame Encoder)'
      if (lower.endsWith('.m4a')) return 'M4A (AAC Audio)'
      if (lower.endsWith('.ogg')) return 'OGG (Vorbis)'
      if (lower.endsWith('.opus')) return 'OPUS (Interactive)'
    }
    return 'WAV (Microsoft PCM)'
  })
  const [path, setPath] = useState('')
  const [sampleRate, setSampleRate] = useState('48000')
  const [bitDepth, setBitDepth] = useState('24 Bit')
  const [bitrate, setBitrate] = useState('320')
  const [channels, setChannels] = useState('Stereo')
  const [preset, setPresets] = useState('Standard (48kHz, Stereo)')
  const [isExporting, setIsExporting] = useState(false)
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [playAfterExport, setPlayAfterExport] = useState(false)
  const [exportPhase, setExportPhase] = useState(0)
  const [exportProgress, setExportProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showId3, setShowId3] = useState(false)

  // ID3-Tags States
  const [id3Title, setId3Title] = useState('')
  const [id3Artist, setId3Artist] = useState('')
  const [id3Album, setId3Album] = useState('')
  const [id3Year, setId3Year] = useState('')
  const [id3Genre, setId3Genre] = useState('')
  const [id3Comment, setId3Comment] = useState('')
  const [id3Track, setId3Track] = useState('')

  // Synchronisiere das Export-Format, wenn sich die Quelldatei ändert
  useEffect(() => {
    if (singleSource) {
      const lower = singleSource.toLowerCase()
      if (lower.endsWith('.mp3')) {
        setFormat('MP3 (Lame Encoder)')
      } else if (lower.endsWith('.m4a')) {
        setFormat('M4A (AAC Audio)')
      } else if (lower.endsWith('.ogg')) {
        setFormat('OGG (Vorbis)')
      } else if (lower.endsWith('.opus')) {
        setFormat('OPUS (Interactive)')
      } else {
        setFormat('WAV (Microsoft PCM)')
      }
    } else {
      setFormat('WAV (Microsoft PCM)')
    }
  }, [singleSource])

  useEffect(() => {
    Promise.all([
      window.api.getHomeDir(),
      window.api.getSettings().catch(() => ({}))
    ]).then(([home, settings]) => {
      const ext = getExt(format)
      let name = 'omega_master'
      if (singleSource) {
        name = singleSource.replace(/.*[\\\/]/, '').replace(/\.[^.]+$/, '')
      }
      
      // Nutze den Exporte-Ordner aus den Einstellungen, falls gesetzt. Ansonsten Fallback auf den Home-Ordner.
      const baseDir = (settings && typeof settings.expPath === 'string' && settings.expPath.trim() !== '')
        ? settings.expPath
        : home
        
      setPath(`${baseDir}\\${name}.${ext}`)
    })
  }, [format, singleSource])

  const getExt = (f: string) =>
    f.match(/MP3/i) ? 'mp3' : f.match(/FLAC/i) ? 'flac' : f.match(/OGG/i) ? 'ogg'
    : f.match(/M4A/i) ? 'm4a' : f.match(/M4R/i) ? 'm4r' : f.match(/AIFF/i) ? 'aiff'
    : f.match(/WMA/i) ? 'wma' : f.match(/OPUS/i) ? 'opus' : f.match(/ALAC/i) ? 'alac' : 'wav'

  const formats = [
    'WAV (Microsoft PCM)', 'MP3 (Lame Encoder)', 'FLAC (Free Lossless)',
    'OGG (Vorbis)', 'M4A (AAC Audio)', 'M4R (Ringtone)',
    'AIFF (Apple PCM)', 'WMA (Windows Audio)', 'OPUS (Interactive)', 'ALAC (Apple Lossless)'
  ]
  const sampleRates = ['8000', '11025', '16000', '22050', '32000', '44100', '48000', '88200', '96000', '192000']
  const bitrates = ['64', '96', '128', '160', '192', '256', '320']
  const isCompressed = format.match(/(MP3|OGG|M4A|M4R|WMA|OPUS)/i)
  const supportsId3 = ID3_FORMATS.includes(format)

  // Wenn das gewählte Format ID3-Tags unterstützt, klappe das ID3-Panel automatisch auf
  useEffect(() => {
    if (supportsId3) {
      setShowId3(true)
    }
  }, [supportsId3])

  // Lade Medieninformationen/Tags aus der Quelldatei, wenn vorhanden
  useEffect(() => {
    if (singleSource) {
      window.api.getMediaInfo(singleSource).then((info: any) => {
        const tags = (info && info.tags) ? info.tags : {}
        
        // Tags extrahieren oder leeren String als Fallback nutzen
        const artist = tags.artist || ''
        const album = tags.album || ''
        const year = tags.year || ''
        const genre = tags.genre || ''
        const comment = tags.comment || ''
        const track = tags.track || ''
        
        // Titel-Fallback auf den Dateinamen (ohne Endung)
        const fallbackTitle = singleSource.replace(/.*[\\\/]/, '').replace(/\.[^.]+$/, '')
        const title = tags.title || fallbackTitle

        setId3Title(title)
        setId3Artist(artist)
        setId3Album(album)
        setId3Year(year)
        setId3Genre(genre)
        setId3Comment(comment)
        setId3Track(track)

        // Panel aufklappen, da wir jetzt Metadaten geladen haben
        setShowId3(true)
      }).catch(err => {
        console.error('Fehler beim Laden der Medieninformationen für ID3-Prepopulation:', err)
        // Robuster Fallback bei Fehlern
        const fallbackTitle = singleSource.replace(/.*[\\\/]/, '').replace(/\.[^.]+$/, '')
        setId3Title(fallbackTitle)
        setShowId3(true)
      })
    } else {
      // Wenn keine Quelle geladen ist, alle ID3-States zurücksetzen
      setId3Title('')
      setId3Artist('')
      setId3Album('')
      setId3Year('')
      setId3Genre('')
      setId3Comment('')
      setId3Track('')
      setShowId3(false)
    }
  }, [singleSource])

  const handleSaveNextToSource = () => {
    if (!singleSource) return
    const dir = singleSource.replace(/[^\\\/]*$/, '')
    const baseName = singleSource.replace(/.*[\\\/]/, '').replace(/\.[^.]+$/, '')
    setPath(`${dir}${baseName}_master.${getExt(format)}`)
  }

  const handleExport = async () => {
    if (isExporting || isBrowsing) return

    if (isPopout) {
      const id3Tags = supportsId3 ? {
        title: id3Title, artist: id3Artist, album: id3Album,
        year: id3Year, genre: id3Genre, comment: id3Comment, track: id3Track
      } : undefined

      window.api.startOfflineExport({
        format,
        path,
        sampleRate,
        bitDepth,
        bitrate,
        channels,
        playAfterExport,
        id3Tags
      })
      return
    }

    setIsExporting(true)
    setIsBrowsing(true) // lock UI during export
    setStatus('running')
    setExportPhase(0)
    setExportProgress(0)

    try {
      const id3Tags = supportsId3 ? {
        title: id3Title, artist: id3Artist, album: id3Album,
        year: id3Year, genre: id3Genre, comment: id3Comment, track: id3Track
      } : undefined

      // Phase 0: Spuren analysieren
      setExportPhase(0)
      setExportProgress(10)
      await new Promise(r => setTimeout(r, 200))

      // Phase 1: Mixdown wird berechnet (Offline Audio Context)
      setExportPhase(1)
      setExportProgress(30)
      const parsedSampleRate = parseInt(sampleRate, 10) || 44100
      const audioBuffer = await AudioEngine.getInstance().renderOffline({ tracks }, parsedSampleRate)

      // Phase 2: Encoding läuft (Lossless WAV compiler)
      setExportPhase(2)
      setExportProgress(65)
      const wavBuffer = AudioEngine.getInstance().exportToWav(audioBuffer)

      // Save temporary lossless WAV file
      const tempWavPath = path + '.temp.wav'
      await window.api.saveRecording(tempWavPath, wavBuffer)

      // Phase 3: Metadaten werden geschrieben (Transcoding & Tagging)
      setExportPhase(3)
      setExportProgress(85)
      const ext = getExt(format)
      await window.api.transcodeExport(tempWavPath, path, { format: ext, bitrate, sampleRate: parsedSampleRate }, id3Tags)

      // Phase 4: Fertigstellen
      setExportPhase(4)
      setExportProgress(100)
      setStatus('done')

      // Auto-play the master file if selected
      if (playAfterExport) {
        await window.api.openPath(path)
      }

      setTimeout(() => handleClose(), 2000)
    } catch (err: any) {
      console.error('Export error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'Export fehlgeschlagen')
    } finally {
      setIsExporting(false)
      setIsBrowsing(false)
    }
  }

  const handleBrowse = async () => {
    if (isBrowsing) return
    setIsBrowsing(true)
    try {
      const ext = getExt(format)
      const result = await window.api.showSaveDialog({
        defaultPath: path,
        filters: [{ name: 'Audio Files', extensions: [ext] }]
      })
      if (!result.canceled && result.filePath) {
        setPath(result.filePath)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsBrowsing(false)
    }
  }

  const handleOpenFolder = async () => {
    if (isBrowsing || !path) return
    setIsBrowsing(true)
    try {
      // Resolve directory from path
      const dir = path.replace(/[\\\/][^\\\/]*$/, '')
      await window.api.openPath(dir)
    } catch (err) {
      console.error('Failed to open folder:', err)
    } finally {
      setIsBrowsing(false)
    }
  }

  return (
    <div className={isPopout ? "w-screen h-screen bg-[#282b30] flex flex-col overflow-hidden relative font-sans text-omega-text select-none" : "fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] font-sans text-omega-text select-none"}>
      <div className={isPopout ? "w-full h-full flex flex-col overflow-hidden relative" : "bg-[#282b30] border border-gray-600 w-[700px] rounded shadow-2xl flex flex-col overflow-hidden max-h-[90vh] relative"}>
        
        {/* Interactive Double-Click Guard Mask */}
        {isBrowsing && !isExporting && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2100] cursor-wait">
            <div className="bg-[#1e2124]/90 border border-gray-700 p-5 rounded-lg shadow-xl flex flex-col items-center gap-3">
              <svg className="animate-spin w-8 h-8 text-omega-accent" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="40" />
              </svg>
              <span className="text-xs font-semibold text-gray-200">
                {isExporting ? 'Master-Mixdown wird berechnet...' : 'Bitte warten...'}
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-2 px-3 border-b border-gray-600 flex justify-between items-center bg-[#1e2124]">
          <span className="text-xs font-semibold">{format}-Export</span>
          <button onClick={handleClose} className="hover:text-red-400 text-sm" disabled={isExporting || isBrowsing}>✖</button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
          
          {/* FORMAT */}
          <div className="border border-gray-700 p-4 rounded bg-black/5 relative">
            <span className="absolute -top-2.5 left-4 bg-[#282b30] px-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Export-Format</span>
            <div className="flex items-center gap-3 mt-2">
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="flex-1 py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                {formats.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* EXPORTEINSTELLUNGEN */}
          <div className="border border-gray-700 p-4 rounded bg-black/5 relative">
            <span className="absolute -top-2.5 left-4 bg-[#282b30] px-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Exporteinstellungen</span>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Voreinstellung:</span>
                <select value={preset} onChange={(e) => setPresets(e.target.value)} className="flex-1 py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                  <option>Standard (48kHz, Stereo)</option>
                  <option>Hohe Qualität (96kHz)</option>
                  <option>Sprache (8kHz)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-bold">SAMPLERATE (Hz):</span>
                <select value={sampleRate} onChange={(e) => setSampleRate(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                  {sampleRates.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-bold">KANÄLE:</span>
                <select value={channels} onChange={(e) => setChannels(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                  <option>Mono</option>
                  <option>Stereo</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase">{isCompressed ? 'Bitrate (kbits):' : 'Auflösung:'}</span>
                {isCompressed ? (
                  <select value={bitrate} onChange={(e) => setBitrate(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                    {bitrates.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : (
                  <select value={bitDepth} onChange={(e) => setBitDepth(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                    <option>16 Bit (CD)</option>
                    <option>24 Bit (Studio)</option>
                    <option>32 Bit Float</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* ID3 TAG EDITOR */}
          {supportsId3 && (
            <div className="border border-gray-700 rounded bg-black/5 relative">
              <button
                className="w-full p-3 px-4 flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-widest font-bold hover:text-white transition-colors"
                onClick={() => !isExporting && !isBrowsing && setShowId3(s => !s)}
                disabled={isExporting || isBrowsing}
              >
                <span className="flex items-center gap-2"><Tag size={12} /> ID3-Tags / Metadaten</span>
                <span>{showId3 ? '▲' : '▼'}</span>
              </button>
              {showId3 && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                  {[
                    ['Titel', id3Title, setId3Title],
                    ['Künstler', id3Artist, setId3Artist],
                    ['Album', id3Album, setId3Album],
                    ['Jahr', id3Year, setId3Year],
                    ['Genre', id3Genre, setId3Genre],
                    ['Track-Nr.', id3Track, setId3Track],
                  ].map(([label, val, setter]: any) => (
                    <div key={label} className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{label}:</span>
                      <input
                        value={val}
                        onChange={e => setter(e.target.value)}
                        className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none focus:border-omega-accent text-white rounded font-sans"
                        disabled={isExporting || isBrowsing}
                      />
                    </div>
                  ))}
                  <div className="col-span-2 flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Kommentar:</span>
                    <input value={id3Comment} onChange={e => setId3Comment(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none focus:border-omega-accent text-white rounded font-sans" disabled={isExporting || isBrowsing} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SPEICHERORT */}
          <div className="border border-gray-700 p-4 rounded bg-black/5 relative">
            <span className="absolute -top-2.5 left-4 bg-[#282b30] px-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Speicherort und Dateiname</span>
            <div className="flex items-center gap-2 mt-2">
              <input type="text" value={path} onChange={(e) => setPath(e.target.value)} className="flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-xs outline-none focus:border-omega-accent text-white font-sans" disabled={isExporting || isBrowsing} />
              <button onClick={handleBrowse} className="bg-gray-700 p-1.5 rounded hover:bg-gray-600 text-white disabled:opacity-50" disabled={isExporting || isBrowsing} title="Speicherort wählen"><Folder size={14} /></button>
              <button onClick={handleOpenFolder} className="px-3 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600 text-white font-semibold disabled:opacity-50 whitespace-nowrap" disabled={isExporting || isBrowsing || !path} title="Zielordner im Explorer öffnen">
                Ordner öffnen
              </button>
            </div>
            
            <div className="flex items-center gap-2 mt-3 justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={playAfterExport}
                  onChange={(e) => setPlayAfterExport(e.target.checked)}
                  disabled={isExporting || isBrowsing}
                  className="rounded border-gray-600 bg-[#1a1d21] text-omega-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                Titel nach dem Export abspielen
              </label>

              {singleSource && (
                <button
                  onClick={handleSaveNextToSource}
                  className="text-[10px] text-omega-accent hover:text-blue-300 underline disabled:text-gray-500"
                  disabled={isExporting || isBrowsing}
                >
                  → Neben Quelldatei speichern ({singleSource.replace(/.*[\\\/]/, '')})
                </button>
              )}
            </div>
          </div>

          {/* EXPORT PROGRESS */}
          {(status === 'running' || status === 'done' || status === 'error') && (
            <div className="border border-gray-700 p-4 rounded bg-black/5 relative">
              <span className="absolute -top-2.5 left-4 bg-[#282b30] px-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Export-Fortschritt</span>
              <div className="mt-2 space-y-3">
                {/* Phase steps */}
                <div className="flex gap-1">
                  {EXPORT_PHASES.map((phase, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                        i < exportPhase ? 'bg-green-500' :
                        i === exportPhase && status === 'running' ? 'bg-omega-accent animate-pulse' :
                        status === 'done' ? 'bg-green-500' :
                        'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                {/* Phase label */}
                <div className="text-[11px] text-gray-300">
                  {status === 'done' ? (
                    <span className="text-green-400 font-semibold">✓ Export erfolgreich abgeschlossen!</span>
                  ) : status === 'error' ? (
                    <span className="text-red-400">✗ {errorMsg}</span>
                  ) : (
                    <span>{EXPORT_PHASES[exportPhase]}</span>
                  )}
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${status === 'done' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-omega-accent'}`}
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-500 text-right">{exportProgress}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-600 flex justify-end gap-2 bg-[#1e2124] flex-shrink-0">
          <button
            onClick={handleExport}
            disabled={isExporting || isBrowsing || status === 'done' || (!isPopout && tracks.flatMap(t => t.regions).length === 0)}
            className="px-10 py-1.5 text-sm bg-omega-accent hover:bg-blue-500 rounded text-white shadow flex items-center gap-2 disabled:bg-gray-600 disabled:text-gray-400 transition-colors font-semibold"
          >
            {isExporting && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="40" />
              </svg>
            )}
            {isExporting ? 'Exportiert...' : 'Export starten'}
          </button>
          <button onClick={handleClose} className="px-8 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded text-gray-300 transition-colors font-semibold" disabled={isExporting || isBrowsing}>Abbrechen</button>
        </div>

      </div>
    </div>
  )
}

