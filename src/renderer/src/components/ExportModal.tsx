import React, { useState, useEffect, useMemo } from 'react'
import { Folder, Save, Tag } from 'lucide-react'
import { AudioEngine } from '../lib/AudioEngine'
import { useTranslation } from 'react-i18next'

const ID3_FORMATS = ['MP3 (Lame Encoder)', 'M4A (AAC Audio)', 'OGG (Vorbis)', 'OPUS (Interactive)', 'FLAC (Free Lossless)']

const EXPORT_PHASES = [
  'Analysiere Spuren...',
  'Mixdown wird berechnet...',
  'Encoding läuft...',
  'Metadaten werden geschrieben...',
  'Fertigstellen...',
]

export function ExportModal({ onClose, tracks: initialTracks = [] }: { onClose?: () => void; tracks?: any[] }) {
  const { t } = useTranslation()
  const isPopout = new URLSearchParams(window.location.search).get('window') === 'export';

  const [tracks, setTracks] = useState<any[]>(initialTracks)
  const [selection, setSelection] = useState<any>(null)
  const [exportSelectionOnly, setExportSelectionOnly] = useState(false)
  const [showExportGapWarning, setShowExportGapWarning] = useState(true)
  const [gapWarningInfo, setGapWarningInfo] = useState<{ gaps: { start: number; end: number }[] } | null>(null)

  useEffect(() => {
    if (isPopout) {
      window.api.getExportTracks().then(loadedTracks => {
        if (loadedTracks) {
          if (Array.isArray(loadedTracks.tracks)) {
            setTracks(loadedTracks.tracks)
          }
          if (loadedTracks.selection) {
            const sel = loadedTracks.selection
            const start = typeof sel.start === 'number' ? sel.start : (typeof sel.selectionStart === 'number' ? sel.selectionStart : null)
            const end = typeof sel.end === 'number' ? sel.end : (typeof sel.selectionEnd === 'number' ? sel.selectionEnd : null)
            const active = typeof sel.active === 'boolean' ? sel.active : (start !== null && end !== null)
            setSelection({ start, end, active })
          }
          if (loadedTracks.exportSettings) {
            const settingsObj = loadedTracks.exportSettings
            // Apply loaded settings to states
            if (settingsObj.format) setFormat(settingsObj.format)
            if (settingsObj.sampleRate) setSampleRate(settingsObj.sampleRate)
            if (settingsObj.bitDepth) setBitDepth(settingsObj.bitDepth)
            if (settingsObj.bitrate) setBitrate(settingsObj.bitrate)
            if (settingsObj.channels) setChannels(settingsObj.channels)
            if (settingsObj.preset) setPresets(settingsObj.preset)
            if (settingsObj.playAfterExport !== undefined) setPlayAfterExport(settingsObj.playAfterExport)
            if (settingsObj.exportToImportDir !== undefined) setExportToImportDir(settingsObj.exportToImportDir)
            if (settingsObj.useVersioning !== undefined) setUseVersioning(settingsObj.useVersioning)
            if (settingsObj.exportSelectionOnly !== undefined) setExportSelectionOnly(settingsObj.exportSelectionOnly)
            
            // Apply ID3 tag settings if present
            if (settingsObj.id3Tags) {
              if (settingsObj.id3Tags.title !== undefined) setId3Title(settingsObj.id3Tags.title)
              if (settingsObj.id3Tags.artist !== undefined) setId3Artist(settingsObj.id3Tags.artist)
              if (settingsObj.id3Tags.album !== undefined) setId3Album(settingsObj.id3Tags.album)
              if (settingsObj.id3Tags.year !== undefined) setId3Year(settingsObj.id3Tags.year)
              if (settingsObj.id3Tags.genre !== undefined) setId3Genre(settingsObj.id3Tags.genre)
              if (settingsObj.id3Tags.comment !== undefined) setId3Comment(settingsObj.id3Tags.comment)
              if (settingsObj.id3Tags.track !== undefined) setId3Track(settingsObj.id3Tags.track)
              if (settingsObj.id3Tags.coverPath !== undefined) setId3CoverPath(settingsObj.id3Tags.coverPath)
            }
          }
        }
      }).catch(err => {
        console.error('Failed to load export tracks:', err)
      })
    }
  }, [isPopout])

  useEffect(() => {
    window.api.getSettings().then(s => {
      if (s && s.showExportGapWarning !== undefined) {
        setShowExportGapWarning(s.showExportGapWarning)
      }
    }).catch(err => console.error(err))
  }, [])

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
  const [exportToImportDir, setExportToImportDir] = useState(false)
  const [useVersioning, setUseVersioning] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [exportPhase, setExportPhase] = useState(0)
  const [exportProgress, setExportProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showId3, setShowId3] = useState(false)

  const firstSource = useMemo(() => uniqueSources[0] || null, [uniqueSources])

  // ID3-Tags States
  const [id3Title, setId3Title] = useState('')
  const [id3Artist, setId3Artist] = useState('')
  const [id3Album, setId3Album] = useState('')
  const [id3Year, setId3Year] = useState('')
  const [id3Genre, setId3Genre] = useState('')
  const [id3Comment, setId3Comment] = useState('')
  const [id3Track, setId3Track] = useState('')
  const [id3CoverPath, setId3CoverPath] = useState('')

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

  const sanitizeFilename = (name: string) => {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim()
  }

  useEffect(() => {
    Promise.all([
      window.api.getHomeDir(),
      window.api.getSettings().catch(() => ({}))
    ]).then(([home, settings]) => {
      const ext = getExt(format)
      let name = 'omega_master'
      if (tracks.length === 1 && tracks[0].name && tracks[0].name.trim() !== '') {
        name = sanitizeFilename(tracks[0].name)
      } else if (firstSource) {
        name = firstSource.replace(/.*[\\\/]/, '').replace(/\.[^.]+$/, '')
      }
      
      // Nutze den Exporte-Ordner aus den Einstellungen, falls gesetzt. Ansonsten Fallback auf den Home-Ordner.
      let baseDir = (settings && typeof settings.expPath === 'string' && settings.expPath.trim() !== '')
        ? settings.expPath
        : home

      if (exportToImportDir && firstSource) {
        baseDir = firstSource.replace(/[\\\/][^\\\/]*$/, '')
      }
        
      setPath(`${baseDir}\\${name}.${ext}`)
    })
  }, [format, firstSource, exportToImportDir, tracks])

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
        setId3CoverPath('')

        // Panel aufklappen, da wir jetzt Metadaten geladen haben
        setShowId3(true)
      }).catch(err => {
        console.error('Fehler beim Laden der Medieninformationen für ID3-Prepopulation:', err)
        // Robuster Fallback bei Fehlern
        const fallbackTitle = singleSource.replace(/.*[\\\/]/, '').replace(/\.[^.]+$/, '')
        setId3Title(fallbackTitle)
        setId3CoverPath('')
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
      setId3CoverPath('')
      setShowId3(false)
    }
  }, [singleSource])

  // Synchronisiere Einstellungen live zurück zum Hauptfenster
  useEffect(() => {
    if (isPopout) {
      const id3Tags = {
        title: id3Title,
        artist: id3Artist,
        album: id3Album,
        year: id3Year,
        genre: id3Genre,
        comment: id3Comment,
        track: id3Track,
        coverPath: id3CoverPath
      }
      const currentSettingsObj = {
        format,
        sampleRate,
        bitDepth,
        bitrate,
        channels,
        preset,
        playAfterExport,
        exportToImportDir,
        useVersioning,
        exportSelectionOnly,
        id3Tags
      }
      window.api.updateExportSettings(currentSettingsObj);
    }
  }, [
    isPopout,
    format,
    sampleRate,
    bitDepth,
    bitrate,
    channels,
    preset,
    playAfterExport,
    exportToImportDir,
    useVersioning,
    exportSelectionOnly,
    id3Title,
    id3Artist,
    id3Album,
    id3Year,
    id3Genre,
    id3Comment,
    id3Track,
    id3CoverPath
  ])

  const findGaps = (tracksList: any[]) => {
    const regions = tracksList.flatMap(t => t.regions)
    if (regions.length === 0) return []
    
    // Sort regions by startPos
    const sorted = [...regions].sort((a, b) => a.startPos - b.startPos)
    const gaps: { start: number; end: number }[] = []
    
    // 1. Check leading gap
    if (sorted[0].startPos > 0.05) {
      gaps.push({ start: 0, end: sorted[0].startPos })
    }
    
    // 2. Check gaps between regions
    let furthestEnd = sorted[0].startPos + sorted[0].duration
    for (let i = 1; i < sorted.length; i++) {
      const r = sorted[i]
      if (r.startPos > furthestEnd + 0.05) {
        gaps.push({ start: furthestEnd, end: r.startPos })
      }
      furthestEnd = Math.max(furthestEnd, r.startPos + r.duration)
    }
    
    return gaps
  }

  const handleSaveNextToSource = () => {
    if (!singleSource) return
    const dir = singleSource.replace(/[^\\\/]*$/, '')
    const baseName = singleSource.replace(/.*[\\\/]/, '').replace(/\.[^.]+$/, '')
    setPath(`${dir}${baseName}_master.${getExt(format)}`)
  }

  const executeActualExport = async (targetPath: string) => {
    const id3Tags = supportsId3 ? {
      title: id3Title, artist: id3Artist, album: id3Album,
      year: id3Year, genre: id3Genre, comment: id3Comment, track: id3Track,
      coverPath: id3CoverPath
    } : undefined

    const settingsPayload = {
      format,
      path: targetPath,
      sampleRate,
      bitDepth,
      bitrate,
      channels,
      playAfterExport,
      preset,
      exportSelectionOnly,
      id3Tags
    };

    window.api.updateExportSettings(settingsPayload);

    if (isPopout) {
      window.api.startOfflineExport({
        format,
        path: targetPath,
        sampleRate,
        bitDepth,
        bitrate,
        channels,
        playAfterExport,
        selection,
        exportSelectionOnly,
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
        year: id3Year, genre: id3Genre, comment: id3Comment, track: id3Track,
        coverPath: id3CoverPath
      } : undefined

      // Phase 0: Spuren analysieren
      setExportPhase(0)
      setExportProgress(10)
      await new Promise(r => setTimeout(r, 200))

      // Phase 1: Mixdown wird berechnet (Offline Audio Context)
      setExportPhase(1)
      setExportProgress(30)
      const parsedSampleRate = parseInt(sampleRate, 10) || 44100
      const audioBuffer = await AudioEngine.getInstance().renderOffline(
        { tracks },
        parsedSampleRate,
        { exportSelectionOnly, selection: selection ? { start: selection.start ?? 0, end: selection.end ?? 0, active: !!(selection.start !== null && selection.end !== null) } : undefined }
      )

      // Phase 2: Encoding läuft (Lossless WAV compiler)
      setExportPhase(2)
      setExportProgress(65)
      const wavBuffer = AudioEngine.getInstance().exportToWav(audioBuffer)

      // Save temporary lossless WAV file
      const tempWavPath = targetPath + '.temp.wav'
      await window.api.saveRecording(tempWavPath, wavBuffer)

      // Phase 3: Metadaten werden geschrieben (Transcoding & Tagging)
      setExportPhase(3)
      setExportProgress(85)
      const ext = getExt(format)
      await window.api.transcodeExport(tempWavPath, targetPath, { format: ext, bitrate, sampleRate: parsedSampleRate }, id3Tags)

      // Phase 4: Fertigstellen
      setExportPhase(4)
      setExportProgress(100)
      setStatus('done')

      // Auto-play the master file if selected
      if (playAfterExport) {
        await window.api.openPath(targetPath)
      }

      setTimeout(() => handleClose(), 2000)
    } catch (err: any) {
      console.error('Export error:', err)
      setStatus('error')
      setErrorMsg(err.message || t('export.failed', { defaultValue: 'Export fehlgeschlagen' }))
    } finally {
      setIsExporting(false)
      setIsBrowsing(false)
    }
  }

  const proceedWithExport = async () => {
    try {
      const exists = await window.api.fileExists(path)

      if (exists) {
        if (useVersioning) {
          // Versionierung: Finde nächsten freien v1, v2... Suffix
          let version = 1
          const ext = getExt(format)
          const dir = path.replace(/[\\\/][^\\\/]*$/, '')
          const baseName = path.replace(/.*[\\\/]/, '').replace(/\.[^.]+$/, '')
          const baseNameClean = baseName.replace(/_v\d+$/, '')

          let targetPath = path
          let existsCheck = true
          while (existsCheck) {
            targetPath = `${dir}\\${baseNameClean}_v${version}.${ext}`
            existsCheck = await window.api.fileExists(targetPath)
            version++
          }

          setPath(targetPath)
          await executeActualExport(targetPath)
        } else {
          // Keine Versionierung: Zeige Sicherheitsdialog vor Überschreiben
          setShowOverwriteConfirm(true)
        }
      } else {
        // Datei existiert nicht, direkt exportieren
        await executeActualExport(path)
      }
    } catch (err: any) {
      console.error('Error during file existence check:', err)
      await executeActualExport(path)
    }
  }

  const handleExport = async () => {
    if (isExporting || isBrowsing) return

    if (showExportGapWarning) {
      const gaps = findGaps(tracks)
      if (gaps.length > 0) {
        setGapWarningInfo({ gaps })
        return
      }
    }

    await proceedWithExport()
  }

  const handleIgnoreWarning = async () => {
    setGapWarningInfo(null)
    await proceedWithExport()
  }

  const handleJumpToGap = (gapStart: number) => {
    window.api.seekTimeline(gapStart)
    handleClose()
  }

  const handleCancelWarning = () => {
    setGapWarningInfo(null)
  }

  const handleToggleDoNotShowAgain = async (checked: boolean) => {
    setShowExportGapWarning(!checked)
    try {
      const currentSettings = await window.api.getSettings()
      currentSettings.showExportGapWarning = !checked
      await window.api.saveSettings(currentSettings)
    } catch (err) {
      console.error('Failed to save showExportGapWarning setting:', err)
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
      <div className={isPopout ? "w-full h-full flex flex-col overflow-hidden relative" : "bg-[#282b30] border border-gray-600 w-[720px] rounded-xl shadow-2xl flex flex-col overflow-hidden relative"}>
        
        {/* Interactive Double-Click Guard Mask */}
        {isBrowsing && !isExporting && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2100] cursor-wait">
            <div className="bg-[#1e2124]/90 border border-gray-700 p-5 rounded-lg shadow-xl flex flex-col items-center gap-3">
              <svg className="animate-spin w-8 h-8 text-omega-accent" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="40" />
              </svg>
              <span className="text-xs font-semibold text-gray-200">
                {isExporting ? t('export.phases.mixdown', { defaultValue: 'Mixdown wird berechnet...' }) : t('common.please_wait', { defaultValue: 'Bitte warten...' })}
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-2 px-3 border-b border-gray-600 flex justify-between items-center bg-[#1e2124]">
          <span className="text-xs font-semibold">{format}-Export</span>
          {!isPopout && (
            <button onClick={handleClose} className="hover:text-red-400 text-sm" disabled={isExporting || isBrowsing}>✖</button>
          )}
        </div>

        <div className="p-3.5 flex flex-col gap-3 overflow-hidden">
          
          {/* FORMAT */}
          <div className="border border-gray-700 p-3 rounded bg-black/5 relative">
            <span className="absolute -top-2.5 left-4 bg-[#282b30] px-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              {t('export.format_title', { defaultValue: 'Export-Format' })}
            </span>
            <div className="flex items-center gap-3 mt-2">
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="flex-1 py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                {formats.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* EXPORTEINSTELLUNGEN */}
          <div className="border border-gray-700 p-3 rounded bg-black/5 relative">
            <span className="absolute -top-2.5 left-4 bg-[#282b30] px-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              {t('export.settings_title', { defaultValue: 'Exporteinstellungen' })}
            </span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase">
                  {t('export.preset_label', { defaultValue: 'Voreinstellung:' })}
                </span>
                <select value={preset} onChange={(e) => setPresets(e.target.value)} className="flex-1 py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                  <option value="Standard (48kHz, Stereo)">{t('export.presets.standard', { defaultValue: 'Standard (48kHz, Stereo)' })}</option>
                  <option value="Hohe Qualität (96kHz)">{t('export.presets.high', { defaultValue: 'Hohe Qualität (96kHz)' })}</option>
                  <option value="Sprache (8kHz)">{t('export.presets.voice', { defaultValue: 'Sprache (8kHz)' })}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-bold">
                  {t('export.samplerate_label', { defaultValue: 'SAMPLERATE (Hz):' })}
                </span>
                <select value={sampleRate} onChange={(e) => setSampleRate(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                  {sampleRates.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-bold">
                  {t('export.channels_label', { defaultValue: 'KANÄLE:' })}
                </span>
                <select value={channels} onChange={(e) => setChannels(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                  <option value="Mono">{t('common.mono', { defaultValue: 'Mono' })}</option>
                  <option value="Stereo">{t('common.stereo', { defaultValue: 'Stereo' })}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase">
                  {isCompressed ? t('export.bitrate_label', { defaultValue: 'Bitrate (kbits):' }) : t('export.resolution_label', { defaultValue: 'Auflösung:' })}
                </span>
                {isCompressed ? (
                  <select value={bitrate} onChange={(e) => setBitrate(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                    {bitrates.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : (
                  <select value={bitDepth} onChange={(e) => setBitDepth(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none rounded" disabled={isExporting || isBrowsing}>
                    <option value="16 Bit">{t('export.res_16bit', { defaultValue: '16 Bit (CD)' })}</option>
                    <option value="24 Bit">{t('export.res_24bit', { defaultValue: '24 Bit (Studio)' })}</option>
                    <option value="32 Bit Float">{t('export.res_32bit', { defaultValue: '32 Bit Float' })}</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* ID3 TAG EDITOR */}
          {supportsId3 && (
            <div className="border border-gray-700 rounded bg-black/5 relative">
              <button
                className="w-full p-2.5 px-3 flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-widest font-bold hover:text-white transition-colors"
                onClick={() => !isExporting && !isBrowsing && setShowId3(s => !s)}
                disabled={isExporting || isBrowsing}
              >
                <span className="flex items-center gap-2"><Tag size={12} /> {t('export.id3.title', { defaultValue: 'ID3-Tags / Metadaten' })}</span>
                <span>{showId3 ? '▲' : '▼'}</span>
              </button>
              {showId3 && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  {[
                    [t('export.id3.title_label', { defaultValue: 'Titel' }), id3Title, setId3Title],
                    [t('export.id3.artist_label', { defaultValue: 'Künstler' }), id3Artist, setId3Artist],
                    [t('export.id3.album_label', { defaultValue: 'Album' }), id3Album, setId3Album],
                    [t('export.id3.year_label', { defaultValue: 'Jahr' }), id3Year, setId3Year],
                    [t('export.id3.genre_label', { defaultValue: 'Genre' }), id3Genre, setId3Genre],
                    [t('export.id3.track_label', { defaultValue: 'Track-Nr.' }), id3Track, setId3Track],
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
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{t('export.id3.comment_label', { defaultValue: 'Kommentar:' })}</span>
                    <input value={id3Comment} onChange={e => setId3Comment(e.target.value)} className="py-1 px-2 text-xs bg-[#1a1d21] border border-gray-600 outline-none focus:border-omega-accent text-white rounded font-sans" disabled={isExporting || isBrowsing} />
                  </div>
                  <div className="col-span-2 border-t border-gray-700/55 pt-3 mt-1 flex flex-col gap-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{t('export.id3.cover_label', { defaultValue: 'Album-Cover:' })}</span>
                    <div className="flex gap-3 items-center">
                      {id3CoverPath ? (
                        <div className="w-16 h-16 border border-gray-600 rounded overflow-hidden flex-shrink-0 bg-black/40 flex items-center justify-center">
                          <img src={`atom://${id3CoverPath}`} alt="Cover Art" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 border border-gray-600 rounded flex-shrink-0 bg-black/40 flex items-center justify-center text-[9px] text-gray-500 font-semibold uppercase text-center p-1 leading-tight select-none">
                          {t('export.id3.no_cover', { defaultValue: 'Kein Cover' })}
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            if (isExporting || isBrowsing) return
                            try {
                              const result = await window.api.showOpenDialog({
                                title: t('export.id3.select_cover_title', { defaultValue: 'Cover-Bild auswählen' }),
                                properties: ['openFile'],
                                filters: [{ name: t('export.id3.images_filter', { defaultValue: 'Bilder' }), extensions: ['jpg', 'jpeg', 'png'] }]
                              })
                              if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                                setId3CoverPath(result.filePaths[0])
                              }
                            } catch (err) {
                              console.error('Fehler bei der Bildauswahl:', err)
                            }
                          }}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-semibold disabled:opacity-50"
                          disabled={isExporting || isBrowsing}
                        >
                          {t('export.id3.import_image', { defaultValue: 'Bild importieren...' })}
                        </button>
                        {id3CoverPath && (
                          <button
                            type="button"
                            onClick={() => setId3CoverPath('')}
                            className="px-3 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-800/40 rounded text-xs font-semibold disabled:opacity-50"
                            disabled={isExporting || isBrowsing}
                          >
                            {t('common.remove', { defaultValue: 'Entfernen' })}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SPEICHERORT */}
          <div className="border border-gray-700 p-3 rounded bg-black/5 relative">
            <span className="absolute -top-2.5 left-4 bg-[#282b30] px-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              {t('export.dest_title', { defaultValue: 'Speicherort und Dateiname' })}
            </span>
            <div className="flex items-center gap-2 mt-2">
              <input type="text" value={path} onChange={(e) => setPath(e.target.value)} className="flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-xs outline-none focus:border-omega-accent text-white font-sans" disabled={isExporting || isBrowsing} />
              <button onClick={handleBrowse} className="bg-gray-700 p-1.5 rounded hover:bg-gray-600 text-white disabled:opacity-50" disabled={isExporting || isBrowsing} title={t('export.select_dest_tooltip', { defaultValue: 'Speicherort wählen' })}><Folder size={14} /></button>
              <button onClick={handleOpenFolder} className="px-3 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600 text-white font-semibold disabled:opacity-50 whitespace-nowrap" disabled={isExporting || isBrowsing || !path} title="Zielordner im Explorer öffnen">
                {t('export.open_folder', { defaultValue: 'Ordner öffnen' })}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 mt-3 border-t border-gray-700/55 pt-3">
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={playAfterExport}
                  onChange={(e) => setPlayAfterExport(e.target.checked)}
                  disabled={isExporting || isBrowsing}
                  className="rounded border-gray-600 bg-[#1a1d21] text-omega-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                {t('export.play_after', { defaultValue: 'Titel nach dem Export abspielen' })}
              </label>

              {firstSource && (
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={exportToImportDir}
                    onChange={(e) => setExportToImportDir(e.target.checked)}
                    disabled={isExporting || isBrowsing}
                    className="rounded border-gray-600 bg-[#1a1d21] text-omega-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                  />
                  {t('export.save_in_import_dir', { defaultValue: 'Im Import-Ordner speichern' })}
                </label>
              )}

              {selection && selection.active && (
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none col-span-2">
                  <input
                    type="checkbox"
                    checked={exportSelectionOnly}
                    onChange={(e) => setExportSelectionOnly(e.target.checked)}
                    disabled={isExporting || isBrowsing}
                    className="rounded border-gray-600 bg-[#1a1d21] text-omega-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                  />
                  {t('export.selection_only', { defaultValue: 'Nur den markierten Bereich exportieren' })}
                </label>
              )}

              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none col-span-2">
                <input
                  type="checkbox"
                  checked={useVersioning}
                  onChange={(e) => setUseVersioning(e.target.checked)}
                  disabled={isExporting || isBrowsing}
                  className="rounded border-gray-600 bg-[#1a1d21] text-omega-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                {t('export.versioning', { defaultValue: 'Fortlaufende Versionierung (v1, v2...)' })}
              </label>
            </div>
          </div>

          {/* EXPORT PROGRESS */}
          {(status === 'running' || status === 'done' || status === 'error') && (
            <div className="border border-gray-700 p-4 rounded bg-black/5 relative">
              <span className="absolute -top-2.5 left-4 bg-[#282b30] px-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                {t('export.progress_title', { defaultValue: 'Export-Fortschritt' })}
              </span>
              <div className="mt-2 space-y-3">
                {/* Phase steps */}
                <div className="flex gap-1">
                  {EXPORT_PHASES.map((phase, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                        i < exportPhase ? 'bg-green-500' :
                        i === exportPhase && status === 'running' ? 'bg-omega-accent' :
                        status === 'done' ? 'bg-green-500' :
                        'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                {/* Phase label */}
                <div className="text-[11px] text-gray-300">
                  {status === 'done' ? (
                    <span className="text-green-400 font-semibold">{t('export.progress.success', { defaultValue: '✓ Export erfolgreich abgeschlossen!' })}</span>
                  ) : status === 'error' ? (
                    <span className="text-red-400">✗ {errorMsg}</span>
                  ) : (
                    <span>
                      {exportPhase === 0 ? t('export.phases.analyzing', { defaultValue: 'Analysiere Spuren...' }) :
                       exportPhase === 1 ? t('export.phases.mixdown', { defaultValue: 'Mixdown wird berechnet...' }) :
                       exportPhase === 2 ? t('export.phases.encoding', { defaultValue: 'Encoding läuft...' }) :
                       exportPhase === 3 ? t('export.phases.metadata', { defaultValue: 'Metadaten werden geschrieben...' }) :
                       t('export.phases.finalizing', { defaultValue: 'Fertigstellen...' })}
                    </span>
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
            {isExporting ? t('export.button_exporting', { defaultValue: 'Exportiert...' }) : t('export.button_start', { defaultValue: 'Export starten' })}
          </button>
          <button onClick={handleClose} className="px-8 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded text-gray-300 transition-colors font-semibold" disabled={isExporting || isBrowsing}>
            {t('common.cancel', { defaultValue: 'Abbrechen' })}
          </button>
        </div>

      </div>

      {/* Overwrite Confirmation Dialog */}
      {showOverwriteConfirm && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[2200]">
          <div className="bg-[#1e2124] border border-gray-600 p-6 rounded shadow-2xl flex flex-col w-[380px] gap-4">
            <span className="text-sm font-semibold text-white">{t('export.overwrite.title', { defaultValue: 'Datei überschreiben?' })}</span>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t('export.overwrite.msg', { defaultValue: 'Die Datei {{filename}} existiert bereits im Zielordner. Möchtest du sie überschreiben?', filename: path.replace(/.*[\\\/]/, '') })}
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={async () => {
                  setShowOverwriteConfirm(false)
                  await executeActualExport(path)
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 rounded text-white text-xs font-semibold shadow transition-colors"
              >
                {t('export.overwrite.confirm', { defaultValue: 'Ja, überschreiben' })}
              </button>
              <button
                onClick={() => {
                  setShowOverwriteConfirm(false)
                }}
                className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-xs font-semibold shadow transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Abbrechen' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAGIX-Style Gap Warning Overlay */}
      {gapWarningInfo && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[2200]">
          <div className="bg-[#1e2124] border border-gray-600 p-6 rounded shadow-2xl flex flex-col w-[420px] gap-4">
            <span className="text-sm font-semibold text-white">{t('export.gaps.title', { defaultValue: 'Leere Bereiche gefunden' })}</span>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t('export.gaps.msg', { defaultValue: 'Es wurden silent Gaps (Lücken von mehr als 0.05s Stille) im Projekt gefunden. Möchtest du diese leeren Bereiche ignorieren oder abbrechen?' })}
            </p>
            
            <div className="flex items-center gap-2 mt-1">
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!showExportGapWarning}
                  onChange={(e) => handleToggleDoNotShowAgain(e.target.checked)}
                  className="rounded border-gray-600 bg-[#1a1d21] text-omega-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                {t('common.do_not_show_again', { defaultValue: 'Diese Meldung nicht mehr anzeigen' })}
              </label>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={handleIgnoreWarning}
                className="w-full py-1.5 bg-omega-accent hover:bg-blue-500 rounded text-white text-xs font-semibold shadow transition-colors"
              >
                {t('export.gaps.ignore', { defaultValue: 'Ignorieren (Export fortsetzen)' })}
              </button>
              <button
                onClick={() => handleJumpToGap(gapWarningInfo.gaps[0].start)}
                className="w-full py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-white text-xs font-semibold shadow transition-colors"
              >
                {t('export.gaps.jump', { defaultValue: 'Zu leeren Bereich springen' })}
              </button>
              <button
                onClick={handleCancelWarning}
                className="w-full py-1.5 bg-gray-650 hover:bg-gray-600 rounded text-gray-300 text-xs font-semibold shadow transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Abbrechen' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

