import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, Play, Square, AlertTriangle } from 'lucide-react';
import { RecordingEngine, RecordingOptions } from '../lib/RecordingEngine';
import { AdvancedRecordingSettingsModal, AdvancedSettings } from './AdvancedRecordingSettingsModal';
import { useTranslation } from 'react-i18next';

interface AudioRecordingModalProps {
  onClose?: () => void;
  onSaveRecord?: (filePath: string, durationSec: number) => void;
  playheadPos?: number;
}

interface Preset {
  name: string;
  sampleRate: number;
  mono: boolean;
  label: string;
}

const PRESETS: Record<string, Preset> = {
  DAT: { name: 'DAT', sampleRate: 48000, mono: false, label: 'DAT' },
  'CD-Audio': { name: 'CD-Audio', sampleRate: 44100, mono: false, label: 'CD-Audio' },
  'FM Radio': { name: 'FM Radio', sampleRate: 22050, mono: false, label: 'FM Radio' },
  'AM Tuner': { name: 'AM Tuner', sampleRate: 11025, mono: true, label: 'AM Tuner' },
};

export function AudioRecordingModal({
  onClose,
  onSaveRecord,
  playheadPos
}: AudioRecordingModalProps) {
  const { t } = useTranslation();
  const isPopout = !onClose || !onSaveRecord;
  const [syncPlayback, setSyncPlayback] = useState<boolean>(false);

  useEffect(() => {
    if (!isPopout) return;
    const cleanup = () => {
      localStorage.setItem('audio_recording_state', JSON.stringify({ active: false }));
    };
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [isPopout]);

  // Dynamically resize popout window to perfectly fit contents
  useEffect(() => {
    if (!isPopout) return;

    const resizeToFit = () => {
      const contentEl = document.getElementById('audio-recording-modal-content');
      if (contentEl) {
        const titleBarHeight = 40;
        const contentHeight = contentEl.scrollHeight;
        const totalHeight = titleBarHeight + contentHeight + 16; // 16px safety padding
        console.log(`[AudioRecordingModal] Dynamic content sizing: title(40) + content(${contentHeight}) + pad(16) = ${totalHeight}px`);
        try {
          window.api.resizeWindow(560, Math.max(350, Math.min(800, totalHeight)));
        } catch (e) {
          console.warn('Failed to dynamically resize audio recorder window:', e);
        }
      }
    };

    // Run after DOM has settled
    const timer = setTimeout(resizeToFit, 150);
    return () => clearTimeout(timer);
  }, [isPopout]);
  // Option States
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [normalize, setNormalize] = useState<boolean>(false);
  const [saveDirectory, setSaveDirectory] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  
  // Quality & Presets
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('DAT');
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [mono, setMono] = useState<boolean>(false);
  
  // Monitoring & Flow
  const [playthrough, setPlaythrough] = useState<boolean>(false);
  const [pegelAnzeigen, setPegelAnzeigen] = useState<boolean>(true);
  
  // Advanced Settings
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    mono: false,
    adaptSampleRate: true,
    duckingEnabled: false,
    duckingDb: 9,
    fadeInSec: 0.5,
    fadeOutSec: 0.5,
    onlyVideoOriginal: false
  });
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Recording State & Engine
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTimeMs, setRecordingTimeMs] = useState<number>(0);
  const [freeBytes, setFreeBytes] = useState<number>(500 * 1024 * 1024 * 1024); // Default 500GB fallback
  const [microphoneLabel, setMicrophoneLabel] = useState<string>('');

  const engineRef = useRef<RecordingEngine>(new RecordingEngine());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Level Meter Canvas Refs
  const canvasLRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Load Microphones & Default Directories
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const devs = await RecordingEngine.getMicrophones();
        if (!active) return;
        setMicrophones(devs);
        if (devs.length > 0) {
          setSelectedDeviceId(devs[0].deviceId);
          setMicrophoneLabel(devs[0].label || t('recording.default_mic', { defaultValue: 'Standardmikrofon' }));
        }
      } catch (err) {
        console.error('Fehler bei der Mikrofonabfrage:', err);
      }

      // Default recording directory from settings
      try {
        const settings = await window.api.getSettings();
        if (!active) return;
        if (settings.recPath) {
          setSaveDirectory(settings.recPath);
        } else {
          const home = await window.api.getHomeDir();
          if (!active) return;
          setSaveDirectory(`${home}\\Documents\\Omega Wave Editor\\My Record`);
        }
      } catch (err) {
        console.error('Fehler beim Laden des Pfads:', err);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  // Update selected mic label
  useEffect(() => {
    const mic = microphones.find(m => m.deviceId === selectedDeviceId);
    if (mic) {
      setMicrophoneLabel(mic.label || t('recording.active_mic', { defaultValue: 'Aktiviertes Mikrofon' }));
    }
  }, [selectedDeviceId, microphones]);

  // Update Disk Space
  const updateDiskSpace = async (dirPath: string) => {
    if (!dirPath) return;
    try {
      const res = await window.api.getDiskSpace(dirPath);
      if (res && res.success && typeof res.freeBytes === 'number') {
        setFreeBytes(res.freeBytes);
      }
    } catch (err) {
      console.warn('Fehler beim Abfragen des Festplattenspeichers:', err);
    }
  };

  useEffect(() => {
    if (saveDirectory) {
      updateDiskSpace(saveDirectory);
    }
  }, [saveDirectory]);

  // Generate Date-based Filename
  useEffect(() => {
    if (!saveDirectory) return;

    let active = true;
    async function generateFilename() {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      let nextIndex = 1;
      try {
        const files = await window.api.readDir(saveDirectory);
        if (!active) return;
        
        // Scan for files matching dateStr - xxxx.wav
        const regex = new RegExp(`^${dateStr} - (\\d{4})\\.wav$`, 'i');
        let maxIndex = 0;
        
        for (const file of files) {
          if (!file.isDirectory) {
            const match = file.name.match(regex);
            if (match) {
              const idx = parseInt(match[1], 10);
              if (idx > maxIndex) maxIndex = idx;
            }
          }
        }
        nextIndex = maxIndex + 1;
      } catch (err) {
        // Directory may not exist yet, which is fine
        console.log(t('recording.dir_not_found', { defaultValue: 'Zielverzeichnis existiert noch nicht oder konnte nicht gelesen werden.' }));
      }

      if (active) {
        setFilename(`${dateStr} - ${String(nextIndex).padStart(4, '0')}.wav`);
      }
    }

    generateFilename();
    return () => {
      active = false;
    };
  }, [saveDirectory]);

  // Sync quality options with selected preset dropdown
  const handlePresetChange = (presetKey: string) => {
    setSelectedPresetKey(presetKey);
    const preset = PRESETS[presetKey];
    if (preset) {
      setSampleRate(preset.sampleRate);
      setMono(preset.mono);
      setAdvancedSettings(prev => ({
        ...prev,
        mono: preset.mono
      }));
    }
  };

  // Reset to DAT Preset
  const handleReset = () => {
    handlePresetChange('DAT');
    setNormalize(false);
    setPlaythrough(false);
    setPegelAnzeigen(true);
    setAdvancedSettings({
      mono: false,
      adaptSampleRate: true,
      duckingEnabled: false,
      duckingDb: 9,
      fadeInSec: 0.5,
      fadeOutSec: 0.5,
      onlyVideoOriginal: false
    });
  };

  // Directory Chooser
  const handleChooseFolder = async () => {
    try {
      const res = await window.api.showOpenDialog({
        properties: ['openDirectory']
      });
      if (res && !res.canceled && res.filePaths.length > 0) {
        setSaveDirectory(res.filePaths[0]);
      }
    } catch (e) {
      console.error('Fehler bei der Ordnerauswahl:', e);
    }
  };

  // Start Recording
  const handleRecord = async () => {
    if (isRecording) return;

    try {
      const options: RecordingOptions = {
        deviceId: selectedDeviceId,
        mono: mono || advancedSettings.mono,
        sampleRate: sampleRate,
        normalize: normalize,
        playthrough: playthrough,
        ducking: {
          enabled: advancedSettings.duckingEnabled,
          attenuationDb: advancedSettings.duckingDb,
          fadeInSec: advancedSettings.fadeInSec,
          fadeOutSec: advancedSettings.fadeOutSec
        }
      };

      await engineRef.current.startRecording(options);

      startTimeRef.current = Date.now();
      setRecordingTimeMs(0);
      setIsRecording(true);

      // Start state in localStorage for real-time growing block in timeline
      localStorage.setItem('audio_recording_state', JSON.stringify({
        active: true,
        startTime: Date.now(),
        filename: filename
      }));

      // Send action to play DAW if coupled
      if (syncPlayback) {
        localStorage.setItem('vst_recording_action', JSON.stringify({
          action: 'play_daw',
          timestamp: Date.now()
        }));
      }

      // Start Timer
      timerRef.current = setInterval(() => {
        setRecordingTimeMs(Date.now() - startTimeRef.current);
      }, 40); // 25 FPS refresh
    } catch (err) {
      console.error('Fehler beim Starten der Aufnahme:', err);
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', {
        detail: {
          type: 'error',
          title: t('recording.error_title', { defaultValue: 'Aufnahmefehler' }),
          message: t('recording.error_start', { defaultValue: 'Aufnahme konnte nicht gestartet werden: ' }) + (err as Error).message
        }
      }));
    }
  };

  // Stop Recording
  const handleStop = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    localStorage.setItem('audio_recording_state', JSON.stringify({ active: false }));

    try {
      const result = await engineRef.current.stopRecording();
      
      // Save recorded wav file
      const finalPath = `${saveDirectory}\\${filename}`;
      const saveRes = await window.api.saveRecording(finalPath, result.arrayBuffer);
      
      if (saveRes && saveRes.success) {
        if (isPopout) {
          const dawStartPlayhead = parseFloat(localStorage.getItem('audio_recording_start_playhead') || '0');
          const payload = {
            filePath: finalPath,
            durationSec: result.durationSec,
            startPos: dawStartPlayhead,
            filename: filename
          };
          localStorage.setItem('audio_recorded_finished', JSON.stringify(payload));
          localStorage.removeItem('audio_recorded_finished'); // clear right after to trigger event
          window.close();
        } else if (onSaveRecord) {
          onSaveRecord(finalPath, result.durationSec);
        }
        
        // Trigger a fresh directory scan to increment the index for the next recording
        updateDiskSpace(saveDirectory);
        
        // Dynamic filename increment
        const parts = filename.match(/^(.* - )(\d{4})(\.wav)$/i);
        if (parts) {
          const nextIdx = parseInt(parts[2], 10) + 1;
          setFilename(`${parts[1]}${String(nextIdx).padStart(4, '0')}${parts[3]}`);
        }
      } else {
        throw new Error(saveRes?.error || 'Unbekannter Speicherfehler');
      }
    } catch (err) {
      console.error('Fehler beim Beenden der Aufnahme:', err);
      window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', {
        detail: {
          type: 'error',
          title: t('recording.error_save_title', { defaultValue: 'Fehler beim Speichern' }),
          message: t('recording.error_save', { defaultValue: 'Die Aufnahme konnte nicht gespeichert werden: ' }) + (err as Error).message
        }
      }));
    }
  };

  // Render Live Canvas Level Meters
  useEffect(() => {
    const drawMeter = () => {
      const peaks = engineRef.current.getLivePeaks();
      const canvasL = canvasLRef.current;
      const canvasR = canvasRRef.current;

      const drawChannel = (canvas: HTMLCanvasElement | null, val: number) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const totalSegments = 45;
        const segmentWidth = (canvas.width - (totalSegments - 1) * 1.5) / totalSegments;
        const segmentHeight = canvas.height;

        // Convert linear peak 0.0 - 1.0 to a logarithmic/dB scale
        // -60 dB to 0 dB
        let db = -60;
        if (val > 0) {
          db = 20 * Math.log10(val);
        }
        
        // Map dB to active segments count (linear mapping of -60..0 to 0..totalSegments)
        let activeSegments = 0;
        if (db > -60) {
          activeSegments = Math.round(((db + 60) / 60) * totalSegments);
        }
        activeSegments = Math.max(0, Math.min(totalSegments, activeSegments));

        // If stopped and not recording, we override activeSegments to 0
        const isCurrentlyRecording = isRecording;
        const activeCount = isCurrentlyRecording && pegelAnzeigen ? activeSegments : 0;

        for (let i = 0; i < totalSegments; i++) {
          const x = i * (segmentWidth + 1.5);
          
          // Determine color class: green (0-31), yellow (32-39), red (40-44)
          let color = '#2e7d32'; // dark green for background ticks
          let activeColor = '#4caf50'; // bright green

          if (i >= 38) {
            color = '#b71c1c'; // dark red
            activeColor = '#f44336'; // bright red
          } else if (i >= 30) {
            color = '#e65100'; // dark orange/yellow
            activeColor = '#ff9800'; // bright orange/yellow
          }

          const isActive = i < activeCount;
          ctx.fillStyle = isActive ? activeColor : '#25282d'; // Dim background color if inactive
          ctx.fillRect(x, 0, segmentWidth, segmentHeight);
        }
      };

      drawChannel(canvasL, peaks.left);
      drawChannel(canvasR, peaks.right);

      animFrameRef.current = requestAnimationFrame(drawMeter);
    };

    drawMeter();

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, pegelAnzeigen]);

  // Format Helper: Milliseconds to HHH:MM:SS:FF (25 Frames/Sec)
  const formatTime = (totalMs: number): string => {
    const totalSecs = Math.floor(totalMs / 1000);
    const msRemainder = totalMs % 1000;
    
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const frames = Math.floor(msRemainder / 40); // 25 frames per second

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Format Helper: Disk Capacity remaining time
  const getCapacityText = (): string => {
    const driveLetter = saveDirectory.match(/^[a-zA-Z]:/)?.[0] || 'C:';
    
    // Bytes per second for selected quality
    const byteRate = sampleRate * (mono ? 1 : 2) * 2;
    
    // Calculate total seconds left
    const elapsedSecs = recordingTimeMs / 1000;
    const currentFreeBytes = Math.max(0, freeBytes - (isRecording ? elapsedSecs * byteRate : 0));
    
    const remainingSecs = byteRate > 0 ? currentFreeBytes / byteRate : 0;
    
    const hrs = Math.floor(remainingSecs / 3600);
    const mins = Math.floor((remainingSecs % 3600) / 60);
    const secs = Math.floor(remainingSecs % 60);
    const frames = Math.floor((remainingSecs % 1) * 25);

    return `${driveLetter} ${String(hrs).padStart(3, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Byte rate string display
  const getPresetByteRateString = (): string => {
    const byteRate = sampleRate * (mono ? 1 : 2) * 2;
    const kbps = byteRate / 1024;
    return t('recording.quality_description', {
      defaultValue: '{{rate}} kHz, {{channels}}, {{kbps}} Kilobyte/s',
      rate: (sampleRate / 1000).toFixed(1),
      channels: mono ? t('common.mono', { defaultValue: 'Mono' }) : t('common.stereo', { defaultValue: 'Stereo' }),
      kbps: kbps.toFixed(1)
    });
  };

  return (
    <div className={isPopout ? "h-screen w-screen bg-[#282b30] text-[#d1d5db] font-sans flex flex-col overflow-hidden select-none" : "fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm"}>
      <div className={isPopout ? "flex-1 flex flex-col bg-[#282b30] w-full h-full" : "w-[540px] bg-[#282b30] border border-[#3b3e45] text-[#d1d5db] font-sans shadow-2xl flex flex-col rounded-lg overflow-hidden select-none"}>
        
        {/* Title bar */}
        <div className="h-10 bg-[#1e2124] border-b border-[#3b3e45] flex items-center justify-between px-3" style={{ WebkitAppRegion: isPopout ? 'drag' : 'no-drag' } as any}>
          <span className="font-semibold text-sm text-white">{t('recording.title', { defaultValue: 'Audioaufnahme' })}</span>
          <button
            onClick={isRecording ? handleStop : (onClose || (() => window.close()))}
            className="text-gray-400 hover:text-white transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div id="audio-recording-modal-content" className="p-4 flex flex-col gap-4 text-xs">
          
          {/* Column 1: Audiotreiber */}
          <div className="flex gap-4">
            <div className="text-3xl font-bold text-gray-500/80 w-6 select-none flex justify-center items-start pt-1">1</div>
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[#4da3ff] font-semibold">{t('recording.audio_driver', { defaultValue: 'Audiotreiber:' })}</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={isRecording}
                className="w-full h-7 bg-[#1a1d21] border border-[#3b3e45] rounded text-white px-2 outline-none cursor-pointer text-xs"
              >
                {microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Eingang ${mic.deviceId.slice(0, 5)}`}
                  </option>
                ))}
                {microphones.length === 0 && (
                  <option value="">{t('recording.no_mics', { defaultValue: 'Keine Mikrofone gefunden' })}</option>
                )}
              </select>

              <label className="flex items-center gap-2 cursor-pointer w-fit py-0.5 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={normalize}
                  onChange={(e) => setNormalize(e.target.checked)}
                  disabled={isRecording}
                  className="w-3.5 h-3.5 accent-omega-accent cursor-pointer"
                />
                <span>{t('recording.normalize', { defaultValue: 'Normalisieren nach der Aufnahme' })}</span>
              </label>
            </div>
          </div>

          <hr className="border-t border-[#3b3e45] opacity-60" />

          {/* Column 2: Save as */}
          <div className="flex gap-4">
            <div className="text-3xl font-bold text-gray-500/80 w-6 select-none flex justify-center items-start pt-1">2</div>
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[#4da3ff] font-semibold">{t('recording.save_as', { defaultValue: 'Audiodatei speichern als:' })}</span>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                disabled={isRecording}
                className="w-[200px] h-7 bg-[#1a1d21] border border-[#3b3e45] rounded text-white px-2 font-mono text-xs outline-none focus:border-omega-accent"
              />

              <span className="text-[#4da3ff] font-semibold mt-1">{t('recording.save_dir', { defaultValue: 'In folgendem Ordner speichern:' })}</span>
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  value={saveDirectory}
                  readOnly
                  className="flex-1 h-7 bg-[#1a1d21]/60 border border-[#3b3e45] rounded text-gray-400 px-2 text-xs truncate outline-none select-all"
                />
                <button
                  onClick={handleChooseFolder}
                  disabled={isRecording}
                  className="w-8 h-7 bg-[#4a4d52] hover:bg-[#5c5f66] disabled:opacity-40 text-white rounded flex items-center justify-center border border-[#3b3e45] active:scale-95 transition-all"
                  title={t('recording.choose_folder', { defaultValue: 'Ordner auswählen' })}
                >
                  <Folder size={14} />
                </button>
              </div>
            </div>
          </div>

          <hr className="border-t border-[#3b3e45] opacity-60" />

          {/* Column 3: Aufnahmequalität & Pegel */}
          <div className="flex gap-4">
            <div className="text-3xl font-bold text-gray-500/80 w-6 select-none flex justify-center items-start pt-1">3</div>
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[#4da3ff] font-semibold">{t('recording.quality', { defaultValue: 'Aufnahmequalität:' })}</span>
              
              <div className="flex gap-3 items-center justify-between">
                <div className="flex items-center gap-3">
                  <select
                    value={selectedPresetKey}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    disabled={isRecording}
                    className="w-28 h-7 bg-[#1a1d21] border border-[#3b3e45] rounded text-white px-2 outline-none cursor-pointer text-xs font-semibold"
                  >
                    {Object.keys(PRESETS).map((key) => (
                      <option key={key} value={key}>
                        {PRESETS[key].label}
                      </option>
                    ))}
                  </select>

                  <span className="text-gray-300 font-mono text-[11px]">
                    {getPresetByteRateString()}
                  </span>
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={handleReset}
                    disabled={isRecording}
                    className="px-3 h-7 bg-[#4a4d52] hover:bg-[#5c5f66] disabled:opacity-40 text-[#d1d5db] font-semibold rounded border border-[#3b3e45] active:scale-95 transition-all"
                  >
                    {t('common.reset', { defaultValue: 'Zurücksetzen' })}
                  </button>
                  <button
                    onClick={() => setShowAdvanced(true)}
                    disabled={isRecording}
                    className="px-3 h-7 bg-[#4a4d52] hover:bg-[#5c5f66] disabled:opacity-40 text-[#d1d5db] font-semibold rounded border border-[#3b3e45] active:scale-95 transition-all"
                  >
                    {t('common.advanced', { defaultValue: 'Erweitert...' })}
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer w-fit py-0.5 hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={playthrough}
                      onChange={(e) => setPlaythrough(e.target.checked)}
                      disabled={isRecording}
                      className="w-3.5 h-3.5 accent-omega-accent cursor-pointer"
                    />
                    <span>{t('recording.play_through', { defaultValue: 'Abspielen während der Aufnahme' })}</span>
                  </label>

                  {playthrough && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-500 pr-1 animate-pulse" title="Vorsicht: Kann Rückkopplung erzeugen! Verwenden Sie bitte Kopfhörer.">
                      <AlertTriangle size={12} />
                      <span>{t('recording.headphones_recommended', { defaultValue: 'Kopfhörer empfohlen' })}</span>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer w-fit py-0.5 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={pegelAnzeigen}
                    onChange={(e) => setPegelAnzeigen(e.target.checked)}
                    className="w-3.5 h-3.5 accent-omega-accent cursor-pointer"
                  />
                  <span>{t('recording.show_level_meter', { defaultValue: 'Aussteuerung anzeigen' })}</span>
                </label>
              </div>

              {/* Pegelanzeige (Aussteuerung) */}
              <div className="bg-[#1a1d21]/60 border border-[#3b3e45] rounded p-2.5 flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-3">
                  <button
                    disabled
                    className="w-24 h-6 bg-[#3b3e45]/50 border border-[#4a4d52]/50 text-gray-400 font-semibold rounded text-[10px] flex items-center justify-center"
                  >
                    {t('recording.level_meter', { defaultValue: 'Aussteuerung...' })}
                  </button>

                  {/* Level Meters */}
                  <div className="flex-1 flex flex-col gap-2 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 w-3 text-right">L:</span>
                      <div className="flex-1 h-2 bg-[#25282d] rounded-sm overflow-hidden relative border border-[#3b3e45]/20">
                        <canvas ref={canvasLRef} width={260} height={8} className="w-full h-full block" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 w-3 text-right">R:</span>
                      <div className="flex-1 h-2 bg-[#25282d] rounded-sm overflow-hidden relative border border-[#3b3e45]/20">
                        <canvas ref={canvasRRef} width={260} height={8} className="w-full h-full block" />
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-gray-400 w-8 text-right font-mono pr-1">0 dB</span>
                </div>
              </div>

            </div>
          </div>

          <hr className="border-t border-[#3b3e45] opacity-60" />

          {/* Bottom Area: Info & Transport */}
          <div className="flex justify-between items-end mt-1.5">
            {/* Info */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[#4da3ff] font-semibold">{t('recording.info', { defaultValue: 'Aufnahmeinformationen:' })}</span>
              <div className="flex flex-col gap-1 font-mono text-[11px] pl-1 text-gray-300">
                <div className="flex gap-4">
                  <span className="text-gray-400 w-24">{t('recording.time', { defaultValue: 'Aufnahmezeit:' })}</span>
                  <span className="text-white font-bold">{formatTime(recordingTimeMs)}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-gray-400 w-24">{t('recording.capacity', { defaultValue: 'Aufnahmekapazität:' })}</span>
                  <span className="text-white font-bold">{getCapacityText()}</span>
                </div>
              </div>
            </div>

            {/* Transport Panel & Close */}
            <div className="flex items-center gap-6">
              {/* DAW Sync coupling */}
              <div className="flex flex-col gap-1">
                <span className="text-[#4da3ff] font-semibold block text-center">{t('recording.daw_sync', { defaultValue: 'DAW-Sync:' })}</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#d1d5db] py-1 select-none hover:text-white" title="Startet bei Klick auf Aufnahme automatisch die DAW-Wiedergabe synchron mit.">
                  <input
                    type="checkbox"
                    checked={syncPlayback}
                    onChange={(e) => setSyncPlayback(e.target.checked)}
                    disabled={isRecording}
                    className="w-3.5 h-3.5 rounded bg-gray-900 border-[#3b3e45] text-omega-accent focus:ring-0 cursor-pointer"
                  />
                  <span>{t('recording.sync_playback', { defaultValue: 'DAW mitstarten' })}</span>
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[#4da3ff] font-semibold text-center w-full block">{t('recording.recording_label', { defaultValue: 'Aufnahme:' })}</span>
                <div className="bg-[#1a1d21] border border-[#3b3e45] rounded px-3 py-1.5 flex gap-4 items-center justify-center w-24 h-9 shadow-inner">
                  {/* Stop button */}
                  <button
                    onClick={handleStop}
                    disabled={!isRecording}
                    className={`w-4 h-4 bg-gray-500 rounded-sm hover:bg-white active:scale-90 transition-all ${!isRecording ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
                    title={t('recording.stop_tooltip', { defaultValue: 'Aufnahme stoppen' })}
                  />
                  {/* Record button */}
                  <button
                    onClick={handleRecord}
                    disabled={isRecording}
                    className={`w-4 h-4 rounded-full hover:brightness-125 active:scale-90 transition-all ${isRecording ? 'bg-red-500 animate-pulse cursor-default' : 'bg-[#e53935] cursor-pointer shadow-red-500/50 shadow'}`}
                    title={t('recording.start_tooltip', { defaultValue: 'Aufnahme starten' })}
                  />
                </div>
              </div>

              <button
                onClick={isRecording ? handleStop : (onClose || (() => window.close()))}
                className="px-6 h-8 bg-[#4a4d52] hover:bg-[#5c5f66] text-[#d1d5db] hover:text-white font-semibold rounded border border-[#3b3e45] active:scale-95 transition-all text-xs flex items-center justify-center"
              >
                {t('common.close', { defaultValue: 'Schließen' })}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Advanced Settings Modal */}
      {showAdvanced && (
        <AdvancedRecordingSettingsModal
          onClose={() => setShowAdvanced(false)}
          onSave={(settings) => {
            setAdvancedSettings(settings);
            // Apply mono overlay if toggled
            setMono(settings.mono);
          }}
          initialSettings={advancedSettings}
          deviceLabel={microphoneLabel}
        />
      )}
    </div>
  );
}
