import React, { useState, useEffect, useRef } from 'react'
import { AudioEngine } from '../lib/AudioEngine'
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  SHORTCUT_DEFINITIONS,
  ShortcutAction,
  eventToShortcut,
  formatShortcut,
  normalizeKeyboardShortcuts
} from '../lib/keyboardShortcuts'
import { MidiEngine } from '../lib/MidiEngine'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

export type Tab = 'Wiedergabe' | 'Ordner' | 'Ansicht' | 'System' | 'Tastaturkuerzel' | 'Projekteinstellungen' | 'MIDI' | 'Sprache & Anzeige'

export function SettingsModal({ onClose, initialTab = 'Projekteinstellungen', onTriggerUpdate }: { onClose: () => void; initialTab?: Tab; onTriggerUpdate?: (info: any) => void }) {
  const { t, i18n } = useTranslation()
  const isPopout = new URLSearchParams(window.location.search).get('window') === 'settings';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [settings, setSettings] = useState<any>({
    defaultExplorerPath: '',
    autoScroll: 'Schnell',
    spacebarStops: false,
    autoSave: true,
    autoSaveInterval: 10,
    sampleRate: 48000,
    tracksCount: 32,
    maxUndoSteps: 50,
    halfWaveform: false,
    showVerticalGuidelines: false,
    videoAudioOnOneTrack: true,
    midiMappings: [],
    midiInputDeviceId: '',
    midiOutputDeviceId: '',
    midiChannel: 0,
    driverType: 'wave',
    bufferCount: 6,
    vstPaths: [],
    keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
    language: 'de',
    textScale: 'normal',
    // Standard-Sprungweiten fuer Pfeiltasten Links/Rechts
    jumpSizePlayback: 3.0,
    jumpSizeStopped: 1.0,
    showDiscardWarning: true,
    discardBehavior: 'discard'
  })
  const initialSettingsRef = useRef<any>(null)
  const [showUnsavedConfirmDialog, setShowUnsavedConfirmDialog] = useState(false)
  const [dontShowUnsavedAgain, setDontShowUnsavedAgain] = useState(false)

  const hasUnsavedChanges = (current: any, initial: any): boolean => {
    if (!initial) return false
    
    const keysToCompare = [
      'defaultExplorerPath', 'driverType', 'bufferCount', 'midiInputDeviceId', 
      'midiOutputDeviceId', 'midiChannel', 'autoScroll', 'spacebarStops', 
      'autoSave', 'autoSaveInterval', 'sampleRate', 'tracksCount', 
      'maxUndoSteps', 'showStartScreen', 'halfWaveform', 'showExportGapWarning', 
      'showDeleteConfirmation', 'importOverlapBehavior', 'language', 'textScale',
      'showDiscardWarning', 'discardBehavior'
    ]
    
    for (const key of keysToCompare) {
      if (current[key] !== initial[key]) {
        return true
      }
    }
    
    if (JSON.stringify(current.vstPaths) !== JSON.stringify(initial.vstPaths)) {
      return true
    }
    
    if (JSON.stringify(current.midiMappings) !== JSON.stringify(initial.midiMappings)) {
      return true
    }
    
    if (JSON.stringify(current.keyboardShortcuts) !== JSON.stringify(initial.keyboardShortcuts)) {
      return true
    }
    
    return false
  }

  const handleConfirmSave = async () => {
    const finalSettings = {
      ...settings,
      showDiscardWarning: !dontShowUnsavedAgain,
      discardBehavior: dontShowUnsavedAgain ? 'save' : (settings.discardBehavior || 'discard')
    }
    const settingsToSave = {
      ...finalSettings,
      keyboardShortcuts: normalizeKeyboardShortcuts(finalSettings.keyboardShortcuts)
    }
    await window.api.saveSettings(settingsToSave)
    initialSettingsRef.current = settingsToSave
    AudioEngine.getInstance().setAudioDriver(settingsToSave.driverType || 'wave', settingsToSave.bufferCount || 6)
    
    localStorage.setItem('settings_updated_trigger', JSON.stringify({ 
      timestamp: Date.now(), 
      settings: settingsToSave 
    }))
    window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: settingsToSave }))
    
    setShowUnsavedConfirmDialog(false)
    onClose()
  }

  const handleConfirmDiscard = async () => {
    if (dontShowUnsavedAgain) {
      const currentSaved = await window.api.getSettings()
      const updatedSaved = {
        ...currentSaved,
        showDiscardWarning: false,
        discardBehavior: 'discard'
      }
      await window.api.saveSettings(updatedSaved)
      window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: updatedSaved }))
    }
    
    document.documentElement.className = `text-scale-${originalScale}`
    if (i18n.language !== originalLanguage) {
      i18n.changeLanguage(originalLanguage)
    }
    
    setShowUnsavedConfirmDialog(false)
    onClose()
  }

  const handleConfirmCancel = () => {
    setShowUnsavedConfirmDialog(false)
  }

  const handleCancelClick = () => {
    const hasChanges = hasUnsavedChanges(settings, initialSettingsRef.current)
    if (hasChanges && settings.showDiscardWarning !== false) {
      setShowUnsavedConfirmDialog(true)
    } else {
      if (hasChanges && settings.showDiscardWarning === false) {
        if (settings.discardBehavior === 'save') {
          handleSave()
        } else {
          handleCancel()
        }
      } else {
        handleCancel()
      }
    }
  }
  const [capturingShortcut, setCapturingShortcut] = useState<ShortcutAction | null>(null)
  const [tempShortcut, setTempShortcut] = useState<string | null>(null)

  const [midiDevices, setMidiDevices] = useState<{ id: string; name: string }[]>([])
  const [midiOutputDevices, setMidiOutputDevices] = useState<{ id: string; name: string }[]>([])
  const [learningAction, setLearningAction] = useState<{ action: string; trackIndex?: number } | null>(null)

  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [updateInfo, setUpdateInfo] = useState<any | null>(null)
  const [currentVersion, setCurrentVersion] = useState<string>('0.1.0')

  const [originalScale, setOriginalScale] = useState<string>('normal')
  const [originalLanguage, setOriginalLanguage] = useState<string>('de')
  const [availableLocales, setAvailableLocales] = useState<string[]>(['de', 'en'])

  const [asioDetails, setAsioDetails] = useState<any | null>(null)
  const [loadingAsio, setLoadingAsio] = useState(false)
  const [asioError, setAsioError] = useState<string | null>(null)

  const fetchAsioDetails = (driverName: string) => {
    if (!driverName || driverName === 'default') {
      setAsioDetails(null)
      return
    }
    setLoadingAsio(true)
    setAsioError(null)
    window.api.getAsioDriverDetails(driverName).then((details) => {
      setAsioDetails(details)
      setLoadingAsio(false)
    }).catch((err) => {
      console.error(`Failed to fetch details for ASIO driver ${driverName}:`, err)
      setAsioError(err.message || 'Fehler beim Laden der ASIO-Details')
      setAsioDetails(null)
      setLoadingAsio(false)
    })
  }

  useEffect(() => {
    if (settings.driverType === 'asio' && settings.asioDriver) {
      fetchAsioDetails(settings.asioDriver)
    } else {
      setAsioDetails(null)
    }
  }, [settings.driverType, settings.asioDriver])

  useEffect(() => {
    window.api.getLocales().then((locs: any) => {
      if (locs) {
        setAvailableLocales(Object.keys(locs))
      }
    }).catch((e: any) => console.error('Failed to fetch locales in settings:', e))
  }, [])

  const handleCheckForUpdates = async () => {
    setCheckingUpdates(true)
    setUpdateStatus(t('settings.checking_updates', { defaultValue: 'Pruefe auf Updates...' }))
    setUpdateInfo(null)
    try {
      const result = await window.api.checkForUpdates()
      if (result.error) {
        setUpdateStatus(`${t('common.error', { defaultValue: 'Fehler' })}: ${result.error}`)
      } else if (result.available) {
        setUpdateStatus(t('settings.update_available', { defaultValue: 'Update verfuegbar: v{{version}}', version: result.latestVersion }))
        setUpdateInfo(result)
      } else {
        setUpdateStatus(t('settings.up_to_date', { defaultValue: 'App ist auf dem neuesten Stand (v{{version}}).', version: result.currentVersion }))
      }
    } catch (e: any) {
      setUpdateStatus(`${t('settings.update_error', { defaultValue: 'Fehler beim Update-Check' })}: ${e.message}`)
    } finally {
      setCheckingUpdates(false)
    }
  }

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [asioDrivers, setAsioDrivers] = useState<{ name: string; description: string }[]>([])

  useEffect(() => {
    window.api.getSettings().then(s => {
      setSettings((prev: any) => {
        const merged = {
          ...prev,
          language: 'de',
          textScale: 'normal',
          showDiscardWarning: true,
          discardBehavior: 'discard',
          ...s,
          keyboardShortcuts: normalizeKeyboardShortcuts(s?.keyboardShortcuts)
        }
        setOriginalScale(merged.textScale || 'normal')
        setOriginalLanguage(merged.language || 'de')
        initialSettingsRef.current = merged
        if (merged.activeDeviceId && merged.activeDeviceId !== 'default' && merged.driverType !== 'asio') {
          AudioEngine.getInstance().setOutputDevice(merged.activeDeviceId)
        }
        return merged
      })
    })
    window.api.getAppVersion().then((v: string) => {
      setCurrentVersion(v)
    }).catch((e: any) => console.error('Fehler beim Abrufen der App-Version:', e))

    navigator.mediaDevices.enumerateDevices().then(devs => {
      const outputs = devs.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default')
      setDevices(outputs)
    }).catch(err => {
      console.error('Error enumerating audio output devices:', err)
    })

    window.api.getAsioDrivers().then((drivers: any[]) => {
      setAsioDrivers(drivers)
    }).catch((err: any) => {
      console.error('Error fetching ASIO drivers:', err)
    })
  }, [])

  useEffect(() => {
    const updateMidiDevices = () => {
      setMidiDevices(MidiEngine.getInputs())
      setMidiOutputDevices(MidiEngine.getOutputs())
    }

    updateMidiDevices()
    window.addEventListener('MIDI_DEVICES_CHANGED', updateMidiDevices)
    return () => {
      window.removeEventListener('MIDI_DEVICES_CHANGED', updateMidiDevices)
      MidiEngine.stopLearnMode()
    }
  }, [])

  const handleSave = async () => {
    const settingsToSave = {
      ...settings,
      keyboardShortcuts: normalizeKeyboardShortcuts(settings.keyboardShortcuts)
    }
    await window.api.saveSettings(settingsToSave)
    initialSettingsRef.current = settingsToSave
    AudioEngine.getInstance().setAudioDriver(settingsToSave.driverType || 'wave', settingsToSave.bufferCount || 6)
    
    // Write trigger to localStorage so the main window can synchronize instantly
    localStorage.setItem('settings_updated_trigger', JSON.stringify({ 
      timestamp: Date.now(), 
      settings: settingsToSave 
    }))

    window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: settingsToSave }))
    onClose()
  }

  const handleCancel = () => {
    document.documentElement.className = `text-scale-${originalScale}`
    if (i18n.language !== originalLanguage) {
      i18n.changeLanguage(originalLanguage)
    }
    onClose()
  }

  const handleTextScaleChange = (scale: string) => {
    setSettings((prev: any) => ({ ...prev, textScale: scale }))
    document.documentElement.className = `text-scale-${scale}`
  }

  const handleLanguageChange = async (lang: string) => {
    setSettings((prev: any) => ({ ...prev, language: lang }))
    try {
      i18n.changeLanguage(lang)
    } catch (e) {
      console.error('Failed to change language in real-time:', e)
    }
  }

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case 'de': return t('settings.lang_de', { defaultValue: 'Deutsch (Standard)' })
      case 'en': return t('settings.lang_en', { defaultValue: 'English' })
      default: return code.toUpperCase() + ' (Custom)'
    }
  }

  const renderSpracheAnzeige = () => (
    <div className="flex gap-4 h-full">
      {/* Sprachauswahl & Locale-Pakete */}
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124] flex flex-col justify-between">
        <div>
          <h3 className="text-center font-semibold mb-4 text-sm flex items-center gap-1.5 justify-center">
            🌐 {t('settings.language', { defaultValue: 'Sprachauswahl' })}
          </h3>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t('settings.language_active', { defaultValue: 'Aktive Sprache:' })}</span>
              <select 
                value={settings.language || 'de'} 
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-44 outline-none text-xs text-white"
              >
                {availableLocales.map(code => (
                  <option key={code} value={code}>
                    {getLanguageLabel(code)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mt-2 text-xs text-gray-400 border-t border-gray-700/50 pt-3 leading-relaxed">
              <p className="font-semibold text-gray-300 mb-1">
                ℹ️ {t('settings.custom_locales_info_title', { defaultValue: 'Eigene Sprachpakete' })}
              </p>
              <p className="text-[11px] text-gray-400 leading-normal">
                {t('settings.custom_locales_info_body', { 
                  defaultValue: 'Du kannst eigene Uebersetzungsdateien (.json) im Locales-Ordner ablegen, um die App in andere Sprachen zu uebersetzen oder Texte anzupassen. Sie werden beim App-Start automatisch geladen.' 
                })}
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={async () => {
            try {
              const home = await window.api.getHomeDir();
              const localesDir = `${home}\\Documents\\OmegaProjects\\Omega Wave Editor\\Locales`;
              await window.api.openPath(localesDir);
            } catch (e) {
              console.error('Failed to open locales path:', e);
            }
          }}
          className="w-full py-2 mt-4 bg-gray-750 hover:bg-gray-700 active:scale-[0.98] border border-gray-700 text-white rounded text-xs font-semibold tracking-wide transition-all shadow flex items-center justify-center gap-1.5"
        >
          <span>📁 {t('settings.open_locales_folder', { defaultValue: 'Locales-Ordner oeffnen' })}</span>
        </button>
      </div>

      {/* Skalierung der Benutzeroberflaeche */}
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124] flex flex-col justify-between">
        <div>
          <h3 className="text-center font-semibold mb-4 text-sm flex items-center gap-1.5 justify-center">
            🔎 {t('settings.text_scale', { defaultValue: 'Schriftgroesse' })}
          </h3>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t('settings.text_size', { defaultValue: 'Schriftgroesse:' })}</span>
              <select 
                value={settings.textScale || 'normal'} 
                onChange={(e) => handleTextScaleChange(e.target.value)}
                className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-44 outline-none text-xs text-white"
              >
                <option value="normal">{t('settings.text_scale_normal', { defaultValue: 'Normal (100%)' })}</option>
                <option value="medium">{t('settings.text_scale_medium', { defaultValue: 'Mittel (+10%)' })}</option>
                <option value="large">{t('settings.text_scale_large', { defaultValue: 'Gross (+20%)' })}</option>
                <option value="xlarge">{t('settings.text_scale_xlarge', { defaultValue: 'Sehr gross (+30%)' })}</option>
              </select>
            </div>

            <div className="mt-2 text-xs text-gray-400 border-t border-gray-700/50 pt-3 leading-relaxed">
              <p className="font-semibold text-gray-300 mb-1">
                ⚡ {t('settings.scale_preview_title', { defaultValue: 'Echtzeit-Vorschau' })}
              </p>
              <p className="text-[11px] text-gray-400 leading-normal">
                {t('settings.scale_preview_body', { 
                  defaultValue: 'Die Skalierung wird sofort auf alle Menues, Editor-Bereiche und Beschriftungen angewendet. So kannst du direkt pruefen, ob die Textgroesse angenehm ist.' 
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#131517] border border-gray-800 rounded-lg text-center text-xs text-omega-accent select-none">
          Aa Bb Cc Dd Ee Ff Gg
        </div>
      </div>
    </div>
  )

  const renderWiedergabe = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
        <h3 className="text-center font-semibold mb-4 text-sm">{t('settings.playback.audio_output', { defaultValue: 'Audioausgabe' })}</h3>
        <div className="flex flex-col gap-4 text-sm">
          {/* Treiberauswahl */}
          <div className="flex justify-between items-start gap-4">
            <span className="text-gray-400">{t('settings.playback.driver_choice', { defaultValue: 'Treiberauswahl:' })}</span>
            <div className="flex flex-col gap-2 w-48">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                <input 
                  type="radio" 
                  name="driverType" 
                  value="wave" 
                  checked={settings.driverType === 'wave' || !settings.driverType} 
                  onChange={() => setSettings({ ...settings, driverType: 'wave', activeDeviceId: 'default' })} 
                  className="text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 w-3.5 h-3.5"
                />
                {t('settings.playback.driver_wave', { defaultValue: 'Wave-Treiber' })}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                <input 
                  type="radio" 
                  name="driverType" 
                  value="directsound" 
                  checked={settings.driverType === 'directsound'} 
                  onChange={() => setSettings({ ...settings, driverType: 'directsound', activeDeviceId: 'default' })} 
                  className="text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 w-3.5 h-3.5"
                />
                {t('settings.playback.driver_directsound', { defaultValue: 'Direct-Sound' })}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                <input 
                  type="radio" 
                  name="driverType" 
                  value="asio" 
                  checked={settings.driverType === 'asio'} 
                  onChange={() => {
                    const firstAsio = asioDrivers[0]?.name || '';
                    setSettings({ ...settings, driverType: 'asio', asioDriver: firstAsio })
                  }} 
                  className="text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 w-3.5 h-3.5"
                />
                {t('settings.playback.driver_asio', { defaultValue: 'ASIO-Treiber' })}
              </label>
            </div>
          </div>

          {settings.driverType === 'asio' && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t('settings.playback.driver_asio_label', { defaultValue: 'ASIO-Treiber:' })}</span>
              <select 
                value={settings.asioDriver || (asioDrivers[0]?.name || 'default')} 
                onChange={(e) => {
                  const driverName = e.target.value
                  setSettings({ ...settings, asioDriver: driverName })
                }}
                className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-48 outline-none text-xs text-white"
              >
                {asioDrivers.map(drv => (
                  <option key={drv.name} value={drv.name}>
                    {drv.description}
                  </option>
                ))}
                {asioDrivers.length === 0 && (
                  <option value="default">{t('settings.playback.no_asio_driver', { defaultValue: 'Kein ASIO Treiber gefunden' })}</option>
                )}
              </select>
            </div>
          )}

          {settings.driverType === 'asio' ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">{t('settings.playback.asio_channel', { defaultValue: 'Ausgangskanal (Stereo):' })}</span>
                <select 
                  value={settings.asioOutputChannel || 'default'} 
                  onChange={(e) => {
                    setSettings({ ...settings, asioOutputChannel: e.target.value })
                  }}
                  className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-48 outline-none text-xs text-white"
                  disabled={!asioDetails || asioDetails.outputChannels.length === 0}
                >
                  <option value="default">{t('settings.playback.asio_default_channel', { defaultValue: 'Kanal 1 & 2 (Standard)' })}</option>
                  {asioDetails && asioDetails.outputChannels.length > 0 && (
                    (() => {
                      const pairs: { label: string; value: string }[] = [];
                      for (let i = 0; i < asioDetails.outputChannels.length; i += 2) {
                        const ch1 = asioDetails.outputChannels[i];
                        const ch2 = asioDetails.outputChannels[i + 1] || 'Stereo R';
                        pairs.push({
                          label: `${ch1} + ${ch2}`,
                          value: `${i}`
                        });
                      }
                      return pairs.map(p => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ));
                    })()
                  )}
                </select>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">{t('settings.playback.asio_buffer_size', { defaultValue: 'Puffergroesse:' })}</span>
                <select 
                  value={settings.asioBufferSize || '512'} 
                  onChange={(e) => {
                    setSettings({ ...settings, asioBufferSize: parseInt(e.target.value) })
                  }}
                  className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-48 outline-none text-xs text-white"
                >
                  {[64, 128, 256, 512, 1024, 2048].map(size => {
                    let infoStr = '';
                    if (asioDetails) {
                      if (size < asioDetails.minBufferSize || size > asioDetails.maxBufferSize) {
                        return null; // Skip if out of range for this driver
                      }
                      if (size === asioDetails.preferredBufferSize) {
                        infoStr = ' (Bevorzugt)';
                      }
                    }
                    return (
                      <option key={size} value={size}>
                        {size} Samples{infoStr}
                      </option>
                    );
                  })}
                </select>
              </div>

              {settings.asioDriver && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-400 text-xs">{t('settings.playback.asio_control_panel_label', { defaultValue: 'Hersteller-Einstellungen:' })}</span>
                  <button 
                    onClick={async () => {
                      if (settings.asioDriver) {
                        await window.api.openAsioControlPanel(settings.asioDriver)
                        // Refresh driver details after delay
                        setTimeout(() => {
                          fetchAsioDetails(settings.asioDriver)
                        }, 2000)
                      }
                    }}
                    className="bg-omega-accent/15 border border-omega-accent/30 hover:bg-omega-accent/25 text-omega-accent hover:text-white px-3 py-1 rounded text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
                  >
                    ⚙️ {t('settings.playback.open_control_panel', { defaultValue: 'Control Panel oeffnen' })}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">{t('settings.playback.output_device', { defaultValue: 'Ausgabegeraet:' })}</span>
                <select 
                  value={settings.activeDeviceId || 'default'} 
                  onChange={async (e) => {
                    const deviceId = e.target.value
                    setSettings({ ...settings, activeDeviceId: deviceId })
                    await AudioEngine.getInstance().setOutputDevice(deviceId)
                  }}
                  className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-48 outline-none text-xs text-white"
                >
                  <option value="default">{t('settings.playback.system_default', { defaultValue: 'System (Standard)' })}</option>
                  {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || t('settings.playback.output_device_id', { defaultValue: 'Ausgabegeraet ({{id}})', id: d.deviceId.slice(0, 8) })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400">{t('settings.playback.audio_buffer', { defaultValue: 'Audiopuffer:' })}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('common.count', { defaultValue: 'Anzahl:' })}</span>
                  <input 
                    type="number" 
                    min={2}
                    max={64}
                    value={settings.bufferCount !== undefined ? settings.bufferCount : 6} 
                    onChange={(e) => setSettings({ ...settings, bufferCount: parseInt(e.target.value) || 6 })}
                    className="w-12 bg-[#1a1d21] border border-gray-600 rounded px-1.5 py-0.5 text-center text-xs text-white outline-none focus:border-omega-accent" 
                  />
                </div>
              </div>
            </>
          )}

          {settings.driverType === 'asio' && loadingAsio && (
            <div className="mt-4 py-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-omega-accent/60 border-t-transparent rounded-full animate-spin"></div>
              <span>Lade ASIO-Details...</span>
            </div>
          )}

          {settings.driverType === 'asio' && asioError && !loadingAsio && (
            <div className="mt-4 p-3 bg-red-950/20 border border-red-900/30 rounded text-red-400 text-xs">
              ❌ {asioError}
            </div>
          )}

          {settings.driverType === 'asio' && asioDetails && !loadingAsio && (
            <div className="mt-4 border border-gray-700/60 rounded bg-[#16181b] p-3 text-xs leading-relaxed">
              <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-1.5">
                <span className="font-semibold text-omega-accent flex items-center gap-1">
                  ⚡ ASIO Latenz-Uebersicht
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  SR: {asioDetails.sampleRate} Hz
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#1e2124] border border-gray-800/40 p-2 rounded">
                  <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">Eingang</div>
                  <div className="font-bold text-gray-200">
                    {((asioDetails.inputLatencySamples / asioDetails.sampleRate) * 1000).toFixed(3)} ms
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono">
                    {asioDetails.inputLatencySamples} Spls
                  </div>
                </div>

                <div className="bg-[#1e2124] border border-gray-800/40 p-2 rounded">
                  <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">Ausgang</div>
                  <div className="font-bold text-gray-200">
                    {((asioDetails.outputLatencySamples / asioDetails.sampleRate) * 1000).toFixed(3)} ms
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono">
                    {asioDetails.outputLatencySamples} Spls
                  </div>
                </div>

                <div className="bg-[#1e2124]/80 border border-omega-accent/25 p-2 rounded shadow-inner">
                  <div className="text-omega-accent text-[10px] uppercase tracking-wider mb-0.5 font-semibold">Roundtrip</div>
                  <div className="font-bold text-omega-accent">
                    {(((asioDetails.inputLatencySamples + asioDetails.outputLatencySamples) / asioDetails.sampleRate) * 1000).toFixed(3)} ms
                  </div>
                  <div className="text-[9px] text-omega-accent/70 font-mono">
                    {asioDetails.inputLatencySamples + asioDetails.outputLatencySamples} Spls
                  </div>
                </div>
              </div>
              
              <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
                <span>Kanaele: {asioDetails.inputsCount} in / {asioDetails.outputsCount} out</span>
                <span className="text-gray-500 italic text-[9px]">Live-Werte direkt vom COM-Client</span>
              </div>
            </div>
          )}

          {settings.driverType === 'asio' && asioDrivers.length === 0 && (
            <div className="mt-3 p-3 bg-red-950/20 border border-red-900/30 rounded text-red-450 text-[11px] leading-relaxed">
              ⚠️ <strong className="text-red-400">{t('settings.playback.no_asio_found_title', { defaultValue: 'Kein ASIO-Treiber vorhanden!' })}</strong><br />
              {t('settings.playback.no_asio_found_body', { 
                defaultValue: 'Es wurden keine ASIO-Treiber auf diesem System registriert. Bitte installiere einen passenden ASIO-Treiber (z. B. ASIO4ALL oder den offiziellen ASIO-Treiber deines Audio-Interfaces wie Steinberg/Yamaha ASIO), um diesen Modus zu nutzen.' 
              })}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
        <h3 className="text-center font-semibold mb-4 text-sm">{t('settings.playback.arranger', { defaultValue: 'Arranger' })}</h3>
        <div className="flex flex-col gap-4 text-sm">
           <div>
             <span className="text-gray-400 block mb-2">{t('settings.playback.autoscroll', { defaultValue: 'Autoscroll waehrend des Abspielens:' })}</span>
              <div className="flex flex-wrap gap-4">
               <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="scroll" checked={settings.autoScroll === 'Aus'} onChange={() => setSettings({...settings, autoScroll: 'Aus'})} /> {t('common.off', { defaultValue: 'Aus' })}</label>
               <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="scroll" checked={settings.autoScroll === 'Langsam'} onChange={() => setSettings({...settings, autoScroll: 'Langsam'})} /> {t('common.slow', { defaultValue: 'Langsam' })}</label>
               <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="scroll" checked={settings.autoScroll === 'Schnell'} onChange={() => setSettings({...settings, autoScroll: 'Schnell'})} /> {t('common.fast', { defaultValue: 'Schnell' })}</label>
               <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="scroll" checked={settings.autoScroll === 'Zentriert'} onChange={() => setSettings({...settings, autoScroll: 'Zentriert'})} /> {t('settings.playback.centered', { defaultValue: 'Zentriert' })}</label>
              </div>
            </div>
           <div className="mt-4">
             <span className="text-gray-400 block mb-2">{t('settings.playback.spacebar_behavior', { defaultValue: 'Verhalten Leertaste:' })}</span>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={settings.spacebarStops} onChange={(e) => setSettings({...settings, spacebarStops: e.target.checked})} />
               {t('settings.playback.spacebar_stops', { defaultValue: 'Leertaste stoppt an aktueller Abspielposition' })}
             </label>
           </div>
            
            {/* Sprungweiten fuer Links-/Rechtspfeiltasten */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <span className="text-gray-400 block mb-2 font-semibold">{t('settings.playback.jump_sizes', { defaultValue: 'Sprungweiten (Pfeiltasten Links/Rechts)' })}</span>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{t('settings.playback.jump_playback', { defaultValue: 'Waehrend der Wiedergabe:' })}</span>
                  <select
                    value={settings.jumpSizePlayback !== undefined ? settings.jumpSizePlayback : 3}
                    onChange={(e) => setSettings({ ...settings, jumpSizePlayback: parseFloat(e.target.value) })}
                    className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-32 outline-none text-xs text-white"
                  >
                    <option value="0.5">0.5 Sekunden</option>
                    <option value="1">1 Sekunde</option>
                    <option value="3">3 Sekunden</option>
                    <option value="5">5 Sekunden</option>
                    <option value="10">10 Sekunden</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{t('settings.playback.jump_stopped', { defaultValue: 'Im Stillstand:' })}</span>
                  <select
                    value={settings.jumpSizeStopped !== undefined ? settings.jumpSizeStopped : 1}
                    onChange={(e) => setSettings({ ...settings, jumpSizeStopped: parseFloat(e.target.value) })}
                    className="bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 w-32 outline-none text-xs text-white"
                  >
                    <option value="0.5">0.5 Sekunden</option>
                    <option value="1">1 Sekunde</option>
                    <option value="3">3 Sekunden</option>
                    <option value="5">5 Sekunden</option>
                    <option value="10">10 Sekunden</option>
                  </select>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  )

  const renderOrdner = () => (
    <div className="border border-gray-700 p-4 rounded bg-[#1e2124] h-full overflow-y-auto">
      <h3 className="text-center font-semibold mb-6 text-sm">{t('settings.folders.title', { defaultValue: 'Ordnerpfade' })}</h3>
      <div className="flex flex-col gap-3 text-sm">
        {[
          { label: t('settings.folders.projects', { defaultValue: 'Projekte:' }), key: 'projPath' },
          { label: t('settings.folders.exports', { defaultValue: 'Exporte:' }), key: 'expPath' },
          { label: t('settings.folders.import_default', { defaultValue: 'Import (Standard):' }), key: 'defaultExplorerPath' },
          { label: t('settings.folders.recordings', { defaultValue: 'Aufnahmen:' }), key: 'recPath' },
          { label: t('settings.folders.downloads', { defaultValue: 'Downloads:' }), key: 'dlPath' }
        ].map((f, i) => (
          <div key={i} className="flex justify-between items-center gap-4">
            <span className="text-gray-400 w-32">{f.label}</span>
            <input 
              type="text" 
              value={settings[f.key] || ''}
              onChange={(e) => setSettings({...settings, [f.key]: e.target.value})}
              className="flex-1 bg-[#1a1d21] border border-gray-600 rounded px-2 py-1 text-sm outline-none focus:border-omega-accent"
              placeholder="C:\Users\..."
            />
            <button className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded" onClick={async () => {
              const res = await window.api.showOpenDialog({ properties: ['openDirectory'] })
              if (!res.canceled && res.filePaths.length > 0) setSettings({...settings, [f.key]: res.filePaths[0]})
            }}>📁</button>
          </div>
        ))}
        
        {/* Zusaetzliche VST Pfade */}
        <div className="mt-4 border-t border-gray-700/60 pt-4">
          <span className="text-gray-400 block mb-2 font-bold uppercase text-[10px] tracking-wider">{t('settings.folders.vst_paths', { defaultValue: 'Zusaetzliche VST2- & VST3-Suchpfade:' })}</span>
          {(!settings.vstPaths || settings.vstPaths.length === 0) ? (
            <div className="text-xs text-gray-500 italic mb-3">{t('settings.folders.no_vst_paths', { defaultValue: 'Keine zusaetzlichen Pfade konfiguriert (es werden nur die System-Standardpfade gescannt).' })}</div>
          ) : (
            <div className="flex flex-col gap-2 mb-3 bg-[#1a1d21] p-2.5 rounded border border-gray-800">
              {(settings.vstPaths || []).map((path: string, idx: number) => (
                <div key={idx} className="flex justify-between items-center gap-2 text-xs">
                  <span className="text-gray-300 font-mono break-all">{path}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      const updated = settings.vstPaths.filter((_: any, i: number) => i !== idx)
                      setSettings({ ...settings, vstPaths: updated })
                    }}
                    className="text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-[10px] transition-colors"
                  >
                    {t('common.remove', { defaultValue: 'Entfernen' })}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center">
            <button 
              type="button"
              className="bg-omega-accent hover:bg-blue-500 px-4 py-1.5 rounded text-xs text-white font-semibold flex items-center gap-1.5 transition-colors shadow" 
              onClick={async () => {
                const res = await window.api.showOpenDialog({ properties: ['openDirectory'], title: t('settings.folders.select_vst_title', { defaultValue: 'VST Plug-in-Pfad auswaehlen' }) })
                if (!res.canceled && res.filePaths.length > 0) {
                  const pathToAdd = res.filePaths[0]
                  const currentPaths = settings.vstPaths || []
                  if (!currentPaths.includes(pathToAdd)) {
                    const updated = [...currentPaths, pathToAdd]
                    setSettings({ ...settings, vstPaths: updated })
                  } else {
                    alert(t('settings.folders.path_already_added', { defaultValue: 'Dieser Pfad wurde bereits hinzugefuegt.' }))
                  }
                }
              }}
            >
              <span>+ {t('settings.folders.add_vst_path', { defaultValue: 'VST Plug-in-Pfad hinzufuegen...' })}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAnsicht = () => (
    <div className="border border-gray-700 p-4 rounded bg-[#1e2124] h-full">
      <h3 className="text-center font-semibold mb-4 text-sm">{t('settings.view.title', { defaultValue: 'Ansicht Einstellungen' })}</h3>
      <div className="flex flex-col gap-3 text-sm">
         <label className="flex items-center gap-2 cursor-pointer">
           <input 
             type="checkbox" 
             checked={!!settings.halfWaveform} 
             onChange={(e) => setSettings({ ...settings, halfWaveform: e.target.checked })} 
           /> 
           {t('settings.import.half_waveform', { defaultValue: 'Halbe Wellenformdarstellung' })}
         </label>
         <label className="flex items-center gap-2 cursor-pointer">
           <input 
             type="checkbox" 
             checked={!!settings.showVerticalGuidelines} 
             onChange={(e) => setSettings({ ...settings, showVerticalGuidelines: e.target.checked })} 
           /> 
           {t('settings.view.show_vertical_guidelines', { defaultValue: 'Hilfslinien vertikal' })}
         </label>
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-700/40">
            <span className="text-gray-400 block text-xs font-semibold">{t('settings.view.stereo_display', { defaultValue: 'Stereo-Spur Darstellung:' })}</span>
            <div className="flex flex-col gap-2 pl-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                <input 
                  type="radio" 
                  name="stereoDisplay" 
                  value="oneTrack" 
                  checked={settings.videoAudioOnOneTrack !== false} 
                  onChange={() => setSettings({ ...settings, videoAudioOnOneTrack: true })} 
                  className="text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                {t('settings.view.stereo_on_one_track', { defaultValue: 'Stereo auf einer Spur' })}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                <input 
                  type="radio" 
                  name="stereoDisplay" 
                  value="twoTracks" 
                  checked={settings.videoAudioOnOneTrack === false} 
                  onChange={() => setSettings({ ...settings, videoAudioOnOneTrack: false })} 
                  className="text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                {t('settings.view.stereo_on_two_tracks', { defaultValue: 'Stereo auf zwei Spuren' })}
              </label>
            </div>
          </div>
      </div>
    </div>
  )

  const handleReactivateWarnings = () => {
    setSettings((prev: any) => ({
      ...prev,
      showStartScreen: true,
      showExportGapWarning: true,
      showDeleteConfirmation: true,
      showDiscardWarning: true
    }))
    window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_MODAL', {
      detail: {
        type: 'info',
        title: t('common.success', { defaultValue: 'Erfolg' }),
        message: t('settings.system.warnings_restored', { defaultValue: 'Alle ausgeblendeten Warn- und Hinweisdialoge wurden wiederhergestellt.' })
      }
    }))
  }

  const renderSystem = () => (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4">
        <div className="border border-gray-700 p-4 rounded bg-[#1e2124]">
          <h3 className="text-center font-semibold mb-3 text-sm">{t('settings.system.ui', { defaultValue: 'Programmoberflaeche' })}</h3>
          <button 
            className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors text-white mb-3" 
            onClick={handleReactivateWarnings}
          >
            {t('settings.system.reactivate_warnings', { defaultValue: 'Hinweisdialoge reaktivieren' })}
          </button>
          <div className="border-t border-gray-750 pt-3 flex flex-col gap-1.5 text-xs text-gray-300">
            <span className="text-gray-400 font-semibold">{t('settings.system.discard_warning_label', { defaultValue: 'Ungespeicherte Aenderungen beim Schliessen:' })}</span>
            <select
              value={
                settings.showDiscardWarning === false
                  ? (settings.discardBehavior || 'discard')
                  : 'ask'
              }
              onChange={(e) => {
                const val = e.target.value
                if (val === 'ask') {
                  setSettings({ ...settings, showDiscardWarning: true })
                } else {
                  setSettings({ ...settings, showDiscardWarning: false, discardBehavior: val })
                }
              }}
              className="bg-[#1a1d21] border border-gray-650 rounded px-2 py-1 outline-none text-white focus:border-omega-accent cursor-pointer"
            >
              <option value="ask">{t('settings.system.discard_warning_ask', { defaultValue: 'Nachfragen' })}</option>
              <option value="save">{t('settings.system.discard_warning_save', { defaultValue: 'Speichern und Schliessen' })}</option>
              <option value="discard">{t('settings.system.discard_warning_discard', { defaultValue: 'Aenderungen verwerfen' })}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124] h-full flex flex-col justify-between">
        <div>
          <h3 className="text-center font-semibold mb-4 text-sm">{t('settings.system.autosave', { defaultValue: 'Automatisches Speichern' })}</h3>
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={settings.autoSave} onChange={(e) => setSettings({...settings, autoSave: e.target.checked})} /> {t('settings.system.autosave_enable', { defaultValue: 'Projekt wird automatisch gespeichert' })}
            </label>
            <div className="flex items-center gap-2 ml-6 text-gray-400">
              <span>{t('settings.system.autosave_interval_prefix', { defaultValue: 'Speichern alle' })}</span>
              <input type="number" value={settings.autoSaveInterval} onChange={(e) => setSettings({...settings, autoSaveInterval: parseInt(e.target.value) || 10})} className="w-12 bg-[#1a1d21] border border-gray-600 rounded px-1 text-center text-white outline-none" />
              <span>{t('settings.system.autosave_interval_suffix', { defaultValue: 'Minuten' })}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-750 pt-4 mt-2">
          <h3 className="text-center font-semibold mb-3 text-sm">{t('settings.system.undo_history', { defaultValue: 'Undo-Verlauf' })}</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{t('settings.system.max_undo', { defaultValue: 'Maximale Undo-Schritte:' })}</span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min={5} 
                max={500} 
                value={settings.maxUndoSteps || 50} 
                onChange={(e) => setSettings({...settings, maxUndoSteps: parseInt(e.target.value) || 50})} 
                className="w-16 bg-[#1a1d21] border border-gray-600 rounded px-2 py-0.5 text-center text-white outline-none focus:border-omega-accent" 
              />
              <span className="text-xs text-gray-500">{t('settings.system.undo_steps', { defaultValue: 'Schritte' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTastaturkuerzel = () => {
    const keyboardShortcuts = normalizeKeyboardShortcuts(settings.keyboardShortcuts)
    const groupedShortcuts = SHORTCUT_DEFINITIONS.reduce<Record<string, typeof SHORTCUT_DEFINITIONS>>((groups, item) => {
      groups[item.group] = groups[item.group] || []
      groups[item.group].push(item)
      return groups
    }, {})

    const setShortcut = (id: ShortcutAction, shortcut: string) => {
      setSettings({
        ...settings,
        keyboardShortcuts: {
          ...keyboardShortcuts,
          [id]: shortcut
        }
      })
    }

    const handleShortcutKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: ShortcutAction) => {
      if (capturingShortcut !== id) return
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setCapturingShortcut(null)
        setTempShortcut(null)
        return
      }

      const shortcut = eventToShortcut(event.nativeEvent)
      if (shortcut) {
        setTempShortcut(shortcut)
      }
    }

    const handleShortcutKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>, id: ShortcutAction) => {
      if (capturingShortcut !== id) return
      event.preventDefault()
      event.stopPropagation()

      if (tempShortcut) {
        setShortcut(id, tempShortcut)
      }
      setCapturingShortcut(null)
      setTempShortcut(null)
    }

    return (
      <div className="border border-gray-700 p-4 rounded bg-[#1e2124] h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="font-semibold text-sm text-gray-300">{t('settings.shortcuts.title', { defaultValue: 'Tastaturkuerzel' })}</h3>
          <button
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setSettings({ ...settings, keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS })}
          >
            {t('settings.shortcuts.restore_defaults', { defaultValue: 'Standard wiederherstellen' })}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {Object.entries(groupedShortcuts).map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1.5">{group}</div>
              <div className="divide-y divide-gray-800 border border-gray-800 rounded overflow-hidden">
                {items.map(item => (
                  <div key={item.id} className="grid grid-cols-[1fr_190px_70px] items-center gap-2 px-3 py-2 bg-[#1a1d21]">
                    <span className="text-xs text-gray-300 truncate">{item.label}</span>
                    <button
                      className={`h-8 px-2 rounded border text-xs font-mono transition-colors ${
                        capturingShortcut === item.id
                          ? 'border-omega-accent bg-omega-accent/15 text-white'
                          : 'border-gray-700 bg-[#101215] text-omega-accent hover:border-gray-500'
                      }`}
                      onClick={() => {
                        setCapturingShortcut(item.id)
                        setTempShortcut(null)
                      }}
                      onKeyDown={(event) => handleShortcutKeyDown(event, item.id)}
                      onKeyUp={(event) => handleShortcutKeyUp(event, item.id)}
                    >
                      {capturingShortcut === item.id 
                        ? (tempShortcut ? formatShortcut(tempShortcut) : t('settings.shortcuts.press_key', { defaultValue: 'Taste druecken...' }))
                        : formatShortcut(keyboardShortcuts[item.id])}
                    </button>
                    <button
                      className="h-8 px-2 rounded bg-gray-700 hover:bg-gray-600 text-[11px] text-gray-200"
                      onClick={() => setShortcut(item.id, DEFAULT_KEYBOARD_SHORTCUTS[item.id])}
                    >
                      {t('common.reset', { defaultValue: 'Reset' })}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderFilmeinstellungen = () => (
    <div className="flex gap-4 h-full">
      {/* Spurenanzahl */}
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
         <h3 className="text-center font-semibold mb-4 text-sm">{t('settings.project.track_count', { defaultValue: 'Anzahl der Spuren' })}</h3>
         <div className="flex flex-col gap-2 text-sm pl-4">
           {[4, 16, 32, 64, 99, 200].map(num => (
             <label key={num} className="flex items-center gap-2 cursor-pointer">
               <input type="radio" name="tracks" checked={settings.tracksCount === num} onChange={() => setSettings({...settings, tracksCount: num})} />
               {t('settings.project.tracks', { defaultValue: '{{num}} Spuren', num })}
             </label>
           ))}
         </div>
      </div>

      {/* Import-Verhalten bei Ueberlappungen */}
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
         <h3 className="text-center font-semibold mb-4 text-sm">{t('settings.project.import_behavior_title', { defaultValue: 'Import-Verhalten' })}</h3>
         <div className="flex flex-col gap-2 text-sm pl-4">
           {[
             { value: 'ask', label: t('settings.project.import_behavior.ask', { defaultValue: 'Jedes Mal fragen' }) },
             { value: 'overlap', label: t('settings.project.import_behavior.overlap', { defaultValue: 'Ueberlagern (Layer)' }) },
             { value: 'newTrack', label: t('settings.project.import_behavior.newTrack', { defaultValue: 'Untereinander (Freie Spur)' }) },
             { value: 'sequential', label: t('settings.project.import_behavior.sequential', { defaultValue: 'Hintereinander (Anhaengen)' }) }
           ].map(item => (
             <label key={item.value} className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
               <input 
                 type="radio" 
                 name="importOverlapBehavior" 
                 checked={(settings.importOverlapBehavior || 'ask') === item.value} 
                 onChange={() => setSettings({...settings, importOverlapBehavior: item.value})} 
                 className="accent-omega-accent"
               />
               {item.label}
             </label>
           ))}
         </div>
      </div>

      {/* Audio-Samplerate */}
      <div className="flex-1 border border-gray-700 p-4 rounded bg-[#1e2124]">
         <h3 className="text-center font-semibold mb-4 text-sm">{t('settings.project.samplerate_title', { defaultValue: 'Audio-Samplerate' })}</h3>
         <div className="flex flex-col gap-2 text-sm pl-4">
           {[48000, 44100, 32000, 22050, 11025].map(rate => (
             <label key={rate} className="flex items-center gap-2 cursor-pointer">
               <input type="radio" name="samplerate" checked={settings.sampleRate === rate} onChange={() => setSettings({...settings, sampleRate: rate})} />
               {rate} Hz
             </label>
           ))}
         </div>
      </div>
    </div>
  )

  const renderMidi = () => {
    const CONFIGURABLE_ACTIONS: { action: string; label: string; trackIndex?: number }[] = [
      { action: 'transport_play', label: t('midi.actions.play', { defaultValue: 'Transport: Wiedergabe' }) },
      { action: 'transport_stop', label: t('midi.actions.stop', { defaultValue: 'Transport: Stopp' }) },
      { action: 'transport_record', label: t('midi.actions.record', { defaultValue: 'Transport: Aufnahme' }) },
      { action: 'timeline_scroll', label: t('midi.actions.scroll', { defaultValue: 'Timeline: Spulen (Jog-Wheel)' }) },
      { action: 'timeline_zoom', label: t('midi.actions.zoom', { defaultValue: 'Timeline: Zoom' }) },
      { action: 'timeline_scrub', label: t('midi.actions.scrub', { defaultValue: 'Timeline: Scrubben' }) },
      { action: 'metronome_toggle', label: t('midi.actions.metronome', { defaultValue: 'System: Metronom Umschalten' }) },
      { action: 'master_volume', label: t('midi.actions.master_vol', { defaultValue: 'Mixer: Master Lautstaerke' }) },
      ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap(idx => [
        { action: 'track_volume', trackIndex: idx, label: t('midi.actions.track_vol', { defaultValue: 'Mixer: Spur {{num}} Lautstaerke', num: idx + 1 }) },
        { action: 'track_mute', trackIndex: idx, label: t('midi.actions.track_mute', { defaultValue: 'Mixer: Spur {{num}} Mute', num: idx + 1 }) },
        { action: 'track_solo', trackIndex: idx, label: t('midi.actions.track_solo', { defaultValue: 'Mixer: Spur {{num}} Solo', num: idx + 1 }) },
      ])
    ];

    const getMappingForAction = (action: string, trackIndex?: number) => {
      return (settings.midiMappings || []).find(
        (m: any) => m.action === action && m.trackIndex === trackIndex
      );
    };

    const startLearn = (action: string, trackIndex?: number) => {
      setLearningAction({ action, trackIndex });
      MidiEngine.startLearnMode((event) => {
        const currentMappings = [...(settings.midiMappings || [])];
        const existingIdx = currentMappings.findIndex(
          (m: any) => m.action === action && m.trackIndex === trackIndex
        );

        const newMapping = {
          action,
          trackIndex,
          type: event.type,
          number: event.number
        };

        if (existingIdx >= 0) {
          currentMappings[existingIdx] = newMapping;
        } else {
          currentMappings.push(newMapping);
        }

        setSettings((prev: any) => ({
          ...prev,
          midiMappings: currentMappings
        }));
        setLearningAction(null);
      });
    };

    const stopLearn = () => {
      MidiEngine.stopLearnMode();
      setLearningAction(null);
    };

    const clearMapping = (action: string, trackIndex?: number) => {
      const currentMappings = (settings.midiMappings || []).filter(
        (m: any) => !(m.action === action && m.trackIndex === trackIndex)
      );
      setSettings((prev: any) => ({
        ...prev,
        midiMappings: currentMappings
      }));
    };

    return (
      <div className="border border-gray-700 p-4 rounded bg-[#1e2124] h-full flex flex-col overflow-hidden">
        {/* Device & Channel Selector */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">{t('settings.midi.input_device', { defaultValue: 'MIDI-Eingangsgeraet' })}</label>
            <select
              value={settings.midiInputDeviceId || ''}
              onChange={(e) => setSettings({ ...settings, midiInputDeviceId: e.target.value })}
              className="w-full bg-[#1a1d21] border border-gray-750 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-omega-accent"
            >
              <option value="">{t('settings.midi.no_device', { defaultValue: 'Kein Gerät ausgewählt' })}</option>
              {midiDevices.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">{t('settings.midi.output_device', { defaultValue: 'MIDI-Ausgangsgeraet' })}</label>
            <select
              value={settings.midiOutputDeviceId || ''}
              onChange={(e) => setSettings({ ...settings, midiOutputDeviceId: e.target.value })}
              className="w-full bg-[#1a1d21] border border-gray-750 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-omega-accent"
            >
              <option value="">{t('settings.midi.no_device', { defaultValue: 'Kein Gerät ausgewählt' })}</option>
              {midiOutputDevices.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-400 mb-1">{t('settings.midi.channel', { defaultValue: 'MIDI-Kanal' })}</label>
            <select
              value={settings.midiChannel}
              onChange={(e) => setSettings({ ...settings, midiChannel: parseInt(e.target.value) })}
              className="w-full bg-[#1a1d21] border border-gray-750 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-omega-accent"
            >
              <option value={0}>{t('settings.midi.omni', { defaultValue: 'Omni (Alle)' })}</option>
              {[...Array(16)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{t('settings.midi.channel_n', { defaultValue: 'Kanal {{num}}', num: i + 1 })}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mappings Table */}
        <h3 className="font-semibold text-xs text-gray-300 mb-2">{t('settings.midi.mappings_title', { defaultValue: 'MIDI-Aktionszuweisungen' })}</h3>
        <div className="flex-1 overflow-y-auto border border-gray-750 rounded bg-[#1a1d21]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#202225] text-gray-400 border-b border-gray-750">
                <th className="p-2 font-medium">{t('settings.midi.action', { defaultValue: 'Aktion' })}</th>
                <th className="p-2 font-medium">{t('settings.midi.assignment', { defaultValue: 'Zuweisung' })}</th>
                <th className="p-2 font-medium text-right">{t('settings.midi.options', { defaultValue: 'Optionen' })}</th>
              </tr>
            </thead>
            <tbody>
              {CONFIGURABLE_ACTIONS.map(cfg => {
                const mapping = getMappingForAction(cfg.action, cfg.trackIndex);
                const isLearning = learningAction?.action === cfg.action && learningAction?.trackIndex === cfg.trackIndex;
                
                let assignmentText = t('settings.midi.not_assigned', { defaultValue: 'Nicht zugewiesen' });
                if (mapping) {
                  const typeLabel = mapping.type === 'cc' ? 'Control Change' : (mapping.type === 'note' ? 'Note' : mapping.type.toUpperCase());
                  assignmentText = `${typeLabel} #${mapping.number}`;
                }

                return (
                  <tr key={`${cfg.action}-${cfg.trackIndex ?? 'none'}`} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="p-2 text-gray-300 font-medium">{cfg.label}</td>
                    <td className="p-2 text-gray-400">
                      {isLearning ? (
                        <span className="text-omega-accent font-semibold">{t('settings.midi.learning', { defaultValue: 'Lerne... (Bewege Regler / Druecke Taste)' })}</span>
                      ) : (
                        <span className={mapping ? 'text-green-400 font-medium' : ''}>{assignmentText}</span>
                      )}
                    </td>
                    <td className="p-2 text-right space-x-1.5">
                      {isLearning ? (
                        <button
                          onClick={stopLearn}
                          className="px-2.5 py-1 text-[11px] bg-red-600 hover:bg-red-500 rounded text-white font-medium shadow-sm transition-colors"
                        >
                          {t('common.cancel', { defaultValue: 'Abbrechen' })}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => startLearn(cfg.action, cfg.trackIndex)}
                            className="px-2.5 py-1 text-[11px] bg-omega-accent hover:bg-blue-500 rounded text-white font-medium shadow-sm transition-colors"
                          >
                            {t('settings.midi.learn', { defaultValue: 'Lernen' })}
                          </button>
                          {mapping && (
                            <button
                              onClick={() => clearMapping(cfg.action, cfg.trackIndex)}
                              className="px-2.5 py-1 text-[11px] bg-gray-750 hover:bg-gray-700 rounded text-gray-400 font-medium shadow-sm transition-colors"
                            >
                              {t('common.delete', { defaultValue: 'Loeschen' })}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleApply = async () => {
    const settingsToSave = {
      ...settings,
      keyboardShortcuts: normalizeKeyboardShortcuts(settings.keyboardShortcuts)
    }
    await window.api.saveSettings(settingsToSave)
    initialSettingsRef.current = settingsToSave
    AudioEngine.getInstance().setAudioDriver(settingsToSave.driverType || 'wave', settingsToSave.bufferCount || 6)
    
    // Write trigger to localStorage so other windows synchronize instantly
    localStorage.setItem('settings_updated_trigger', JSON.stringify({ 
      timestamp: Date.now(), 
      settings: settingsToSave 
    }))

    window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: settingsToSave }))
    
    // Update checkpoints for reversion in case Cancel is clicked *after* applying
    setOriginalScale(settings.textScale || 'normal')
    setOriginalLanguage(settings.language || 'de')
  }

  const tabs: Tab[] = ['Projekteinstellungen', 'Wiedergabe', 'Ordner', 'Ansicht', 'System', 'Tastaturkuerzel', 'MIDI', 'Sprache & Anzeige']

  const getTabLabel = (tab: Tab) => {
    switch (tab) {
      case 'Projekteinstellungen': return t('settings.tabs.project', { defaultValue: 'Projekteinstellungen' })
      case 'Wiedergabe': return t('settings.tabs.playback', { defaultValue: 'Wiedergabe' })
      case 'Ordner': return t('settings.tabs.folders', { defaultValue: 'Ordner' })
      case 'Ansicht': return t('settings.tabs.view', { defaultValue: 'Ansicht' })
      case 'System': return t('settings.tabs.system', { defaultValue: 'System' })
      case 'Tastaturkuerzel': return t('settings.tabs.shortcuts', { defaultValue: 'Tastaturkuerzel' })
      case 'MIDI': return t('settings.tabs.midi', { defaultValue: 'MIDI' })
      case 'Sprache & Anzeige': return t('settings.lang_display_tab', { defaultValue: 'Sprache & Anzeige' })
      default: return tab
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]" data-settings-modal="true">
      <div className="bg-[#282b30] border border-gray-700 w-[890px] h-[700px] rounded shadow-2xl flex flex-col relative">
        <div className="p-3 border-b border-gray-700 font-semibold flex justify-between items-center bg-[#1e2124] rounded-t text-sm">
          <span>{t('settings.title', { defaultValue: 'Programmeinstellungen' })}</span>
          {!isPopout && (
            <button onClick={handleCancelClick} className="hover:text-red-400">✖</button>
          )}
        </div>
        
        {/* Tab Header */}
        <div className="flex border-b border-gray-700 bg-[#1a1d21] overflow-x-auto">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-omega-accent text-omega-accent bg-[#282b30]' : 'border-transparent text-gray-400 hover:text-white hover:bg-[#282b30]'}`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-hidden">
          {activeTab === 'Wiedergabe' && renderWiedergabe()}
          {activeTab === 'Ordner' && renderOrdner()}
          {activeTab === 'Ansicht' && renderAnsicht()}
          {activeTab === 'System' && renderSystem()}
          {activeTab === 'Tastaturkuerzel' && renderTastaturkuerzel()}
          {activeTab === 'Projekteinstellungen' && renderFilmeinstellungen()}
          {activeTab === 'MIDI' && renderMidi()}
          {activeTab === 'Sprache & Anzeige' && renderSpracheAnzeige()}
        </div>

        {/* Footer Buttons */}
        <div className="p-3 border-t border-gray-700 flex justify-end gap-2 bg-[#1e2124] rounded-b text-sm">
          <button onClick={handleCancelClick} className="px-6 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white">{t('common.cancel', { defaultValue: 'Abbrechen' })}</button>
          <button onClick={handleApply} className="px-6 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white font-semibold shadow-sm">{t('common.apply', { defaultValue: 'Uebernehmen' })}</button>
          <button onClick={handleSave} className="px-6 py-1.5 text-xs bg-omega-accent hover:bg-blue-500 rounded text-white shadow font-semibold">{t('common.ok', { defaultValue: 'OK' })}</button>
          <button className="px-6 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 rounded ml-4 text-white" onClick={() => window.api.openExternal('https://github.com/OmegaProjct/Omega-Wave-Editor/issues')}>{t('common.help', { defaultValue: 'Hilfe' })}</button>
        </div>

        {/* Unsaved Changes Confirmation Modal Overlay */}
        {showUnsavedConfirmDialog && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-[3000] rounded animate-fade-in">
            <div className="bg-[#1e2124] border border-gray-700 p-6 rounded-lg shadow-2xl max-w-md w-full flex flex-col gap-4 text-omega-text">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-sm text-white">{t('settings.unsaved.title', { defaultValue: 'Ungespeicherte Aenderungen' })}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t('settings.unsaved.message', { defaultValue: 'Sie haben Aenderungen an den Einstellungen vorgenommen. Moechten Sie diese Aenderungen speichern oder verwerfen?' })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pl-1">
                <input 
                  id="dont-show-unsaved-again"
                  type="checkbox" 
                  checked={dontShowUnsavedAgain}
                  onChange={(e) => setDontShowUnsavedAgain(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-omega-accent bg-[#1a1d21] border-gray-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="dont-show-unsaved-again" className="text-xs text-gray-400 select-none cursor-pointer hover:text-white">
                  {t('settings.unsaved.dont_show_again', { defaultValue: 'Diese Meldung in Zukunft nicht mehr anzeigen' })}
                </label>
              </div>
              
              <div className="flex justify-end gap-2 border-t border-gray-800 pt-3 mt-1 text-xs">
                <button 
                  onClick={handleConfirmCancel}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-650 rounded text-white font-medium transition-colors"
                >
                  {t('common.cancel', { defaultValue: 'Abbrechen' })}
                </button>
                <button 
                  onClick={handleConfirmDiscard}
                  className="px-4 py-1.5 bg-red-650 hover:bg-red-600 rounded text-white font-medium transition-colors"
                >
                  {t('settings.unsaved.discard', { defaultValue: 'Verwerfen' })}
                </button>
                <button 
                  onClick={handleConfirmSave}
                  className="px-4 py-1.5 bg-omega-accent hover:bg-blue-500 rounded text-white font-bold transition-colors"
                >
                  {t('common.save', { defaultValue: 'Speichern' })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
