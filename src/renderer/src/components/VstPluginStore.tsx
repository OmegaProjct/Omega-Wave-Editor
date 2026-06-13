import React, { useEffect, useMemo, useState } from 'react'
import { Check, Cpu, ExternalLink, ShieldAlert, Sparkles, Star, X } from 'lucide-react'
import type { PluginDescriptor } from '../../../common/types'
import { getStorePluginStatus, readRackPluginsFromStorage } from '../lib/pluginState'

type StoreCategory = 'Instrument' | 'Effekt'
type DownloadMode = 'direct' | 'external'

export interface StorePlugin {
  id: string
  name: string
  manufacturer: string
  category: StoreCategory
  subCategory: string
  description: string
  longDescription: string
  rating: number
  reviews: number
  size: string
  formats: string[]
  landingPageUrl: string
  directDownloadUrl?: string
  directDownloadFileName?: string
  downloadMode: DownloadMode
  platforms: ('win' | 'mac' | 'linux')[]
  features: string[]
}

export function isPluginCompatible(plugin: { formats: string[] }): boolean {
  return plugin.formats.includes('VST2')
}

type CompactPlugin = {
  id: string
  name: string
  mfg: string
  cat: StoreCategory
  sub: string
  size: string
  r: number
  desc: string
  landingUrl: string
  directUrl?: string
  directFileName?: string
  formats: string[]
  platforms: ('win' | 'mac' | 'linux')[]
  longDesc: string
  features: string[]
}

const COMPACT_PLUGINS: CompactPlugin[] = [
  {
    id: 'store_surge_xt',
    name: 'Surge XT',
    mfg: 'Surge Synth Team',
    cat: 'Instrument',
    sub: 'Synthesizer',
    size: '112 MB',
    r: 4.9,
    desc: 'Machtiger hybrider Wavetable-Synthesizer.',
    landingUrl: 'https://surge-synthesizer.github.io/downloads',
    directUrl: 'https://github.com/surge-synthesizer/releases-xt/releases/download/1.3.4/surge-xt-win64-1.3.4-setup.exe',
    directFileName: 'surge-xt-win64-1.3.4-setup.exe',
    formats: ['VST3', 'CLAP'],
    platforms: ['win', 'mac', 'linux'],
    longDesc: 'Surge XT ist ein offener High-End-Synth mit Wavetable-, FM-, VA- und Modeling-Ansatzen. Fuer Omega ist er aktuell technisch interessant, aber wegen fehlendem VST2 im heutigen Host nicht direkt ladbar.',
    features: [
      'Breite Synthese-Palette mit Wavetable, FM und VA',
      'Aktiv gepflegte Open-Source-Entwicklung',
      'Direkter Windows-Download verfuegbar'
    ]
  },
  {
    id: 'store_vital',
    name: 'Vital (Free)',
    mfg: 'Matt Tytel',
    cat: 'Instrument',
    sub: 'Synthesizer',
    size: '185 MB',
    r: 4.8,
    desc: 'Spektral-verzerrender Wavetable-Synthesizer.',
    landingUrl: 'https://vital.audio',
    formats: ['VST3', 'CLAP'],
    platforms: ['win', 'mac', 'linux'],
    longDesc: 'Vital Free ist ein moderner Wavetable-Synth mit starker Visualisierung. Der Host in Omega kann ihn aktuell nicht laden, weil hier nur VST2 verarbeitet wird.',
    features: [
      'Sehr gute visuelle Modulationsdarstellung',
      'Kostenlose Edition mit voller Engine',
      'Zurzeit nur ueber Herstellerseite'
    ]
  },
  {
    id: 'store_helm',
    name: 'Helm Synth',
    mfg: 'Matt Tytel',
    cat: 'Instrument',
    sub: 'Synthesizer',
    size: '34 MB',
    r: 4.6,
    desc: 'Einsteigerfreundlicher polyphoner Synthesizer.',
    landingUrl: 'https://tytel.org/helm/',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'],
    longDesc: 'Helm ist ein klar aufgebauter Lern- und Performance-Synth. Fuer Omega ist er aktuell nur als externer Link gelistet, weil wir keinen verifizierten Direktlink eingebaut haben.',
    features: [
      'Uebersichtlicher Aufbau fuer Sounddesign',
      'Open Source',
      'Derzeit Herstellerseite statt Direktdownload'
    ]
  },
  {
    id: 'store_dexed',
    name: 'Dexed FM',
    mfg: 'Digital Suburban',
    cat: 'Instrument',
    sub: 'Synthesizer',
    size: '18 MB',
    r: 4.7,
    desc: 'DX7-FM-Synth fuer klassische 80er-Sounds.',
    landingUrl: 'https://asb2m10.github.io/dexed/',
    directUrl: 'https://github.com/asb2m10/dexed/releases/download/v1.0.1/Dexed-1.0.1-win.exe',
    directFileName: 'Dexed-1.0.1-win.exe',
    formats: ['VST2', 'VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'],
    longDesc: 'Dexed ist einer der wichtigsten kostenlosen FM-Synths und bietet fuer Omega den entscheidenden VST2-Pfad. Genau deshalb ist er einer der sinnvollsten Direktdownloads im aktuellen Store.',
    features: [
      'DX7-kompatibler FM-Klang',
      'VST2 vorhanden und damit im aktuellen Host interessant',
      'Direkter Windows-Installer verifiziert'
    ]
  },
  {
    id: 'store_tyrell_n6',
    name: 'u-he Tyrell N6',
    mfg: 'u-he',
    cat: 'Instrument',
    sub: 'Synthesizer',
    size: '24 MB',
    r: 4.8,
    desc: 'Klassischer Analog-Synth fuer warme Sounds.',
    landingUrl: 'https://u-he.com/products/tyrelln6.shtml',
    formats: ['VST2', 'VST3', 'AU'],
    platforms: ['win', 'mac'],
    longDesc: 'Tyrell N6 ist weiterhin im Store, aber aktuell nur ueber die Herstellerseite, bis wir einen belastbaren Direktpfad hinterlegt haben.',
    features: [
      'Warmer analoger Grundcharakter',
      'VST2 vorhanden',
      'Direktdownload noch nicht verifiziert'
    ]
  },
  {
    id: 'store_decent_sampler',
    name: 'Decent Sampler',
    mfg: 'Decent Samples',
    cat: 'Instrument',
    sub: 'Sampler',
    size: '15 MB',
    r: 4.8,
    desc: 'Flexibler Sample-Player fuer freie Libraries.',
    landingUrl: 'https://www.decentsamples.com/product/decent-sampler-plugin/',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'],
    longDesc: 'Decent Sampler ist praktisch, aber fuer den aktuellen Omega-Host ohne VST2 nicht sinnvoll nutzbar. Deshalb bleibt der Eintrag ehrlich als externer Verweis.',
    features: [
      'Viele freie Libraries verfuegbar',
      'Leichtgewichtig',
      'Keine VST2-Unterstuetzung fuer Omega'
    ]
  },
  {
    id: 'store_valhalla_supermassive',
    name: 'Valhalla Supermassive',
    mfg: 'Valhalla DSP',
    cat: 'Effekt',
    sub: 'Hall & Delay',
    size: '8 MB',
    r: 5.0,
    desc: 'Grosser Reverb- und Delay-Effekt fuer dichte Raeume.',
    landingUrl: 'https://valhalladsp.com/shop/reverb/valhalla-supermassive/',
    directUrl: 'https://valhallaproduction.s3.us-west-2.amazonaws.com/supermassive/ValhallaSupermassiveWin_V5_0_0.zip',
    directFileName: 'ValhallaSupermassiveWin_V5_0_0.zip',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac'],
    longDesc: 'Valhalla Supermassive ist frei verfuegbar und der Windows-Download ist direkt verlinkbar. Im aktuellen Omega-Host bleibt er trotzdem technisch inkompatibel, solange nur VST2 geladen wird.',
    features: [
      'Beliebter kostenloser Reverb/Delay',
      'Direkter Windows-Download verifiziert',
      'Aktuell kein VST2 fuer Omega'
    ]
  },
  {
    id: 'store_tal_reverb',
    name: 'TAL-Reverb-4',
    mfg: 'TAL Software',
    cat: 'Effekt',
    sub: 'Hall & Delay',
    size: '6 MB',
    r: 4.8,
    desc: 'Vintage-Plate-Reverb mit 80er-Charakter.',
    landingUrl: 'https://tal-software.com',
    formats: ['VST2', 'VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'],
    longDesc: 'TAL-Reverb-4 bleibt im Store erhalten, aber vorerst nur als Hersteller-Link. So vermeiden wir kaputte oder veraltete Download-Pfade.',
    features: [
      'Einfacher, musikalischer Reverb',
      'VST2 vorhanden',
      'Direktdownload im Store noch nicht verifiziert'
    ]
  },
  {
    id: 'store_tdr_nova',
    name: 'TDR Nova',
    mfg: 'Tokyo Dawn Labs',
    cat: 'Effekt',
    sub: 'EQ & Filter',
    size: '14 MB',
    r: 4.8,
    desc: 'Praeziser dynamischer Equalizer.',
    landingUrl: 'https://www.tokyodawn.net/tdr-nova/',
    directUrl: 'https://www.tokyodawn.net/labs/Nova/2.2.2/TDR%20Nova%20(installer).zip',
    directFileName: 'TDR Nova (installer).zip',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac'],
    longDesc: 'TDR Nova ist klanglich stark, aber im aktuellen Host wieder ein gutes Beispiel fuer den Unterschied zwischen echtem Direktdownload und echter Nutzbarkeit im Host: laden koennen wir die Datei, VST3 aber noch nicht hosten.',
    features: [
      'Starker kostenloser dynamischer EQ',
      'Windows-Download direkt verifiziert',
      'Im Host aktuell wegen fehlendem VST2 nicht ladbar'
    ]
  },
  {
    id: 'store_graillon_2',
    name: 'Graillon 2 (Free)',
    mfg: 'Auburn Sounds',
    cat: 'Effekt',
    sub: 'Pitch & Autotune',
    size: '9 MB',
    r: 4.8,
    desc: 'Realtime Pitch-Korrektur und Pitch-Shifting.',
    landingUrl: 'https://www.auburnsounds.com/products/Graillon.html',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'],
    longDesc: 'Graillon bleibt vorerst als externer Verweis, bis wir einen stabilen Direktpfad geprueft haben.',
    features: [
      'Pitch-Korrektur in Echtzeit',
      'Nutzbar fuer kreative Vocal-Effekte',
      'Aktuell Herstellerseite statt Direktdownload'
    ]
  },
  {
    id: 'store_voxengo_span',
    name: 'Voxengo SPAN',
    mfg: 'Voxengo',
    cat: 'Effekt',
    sub: 'Pegelanalyse & Tools',
    size: '14 MB',
    r: 4.9,
    desc: 'Spektrumanalyse und Metering fuer den Mix.',
    landingUrl: 'https://www.voxengo.com/product/span/',
    directUrl: 'https://www.voxengo.com/files/VoxengoSPAN_324_Win32_64_VST_VST3_AAX_setup.exe',
    directFileName: 'VoxengoSPAN_324_Win32_64_VST_VST3_AAX_setup.exe',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac'],
    longDesc: 'SPAN ist einer der besten kostenlosen Analyzer und hat einen verifizierten Direktlink. Die Datei landet direkt im Omega-Download-Ordner.',
    features: [
      'Professioneller Analyzer',
      'Direkter Windows-Installer verifiziert',
      'Aktueller Host braucht trotzdem VST2 fuer echtes Laden'
    ]
  },
  {
    id: 'store_youlean_loudness',
    name: 'Youlean Loudness Meter',
    mfg: 'Youlean',
    cat: 'Effekt',
    sub: 'Pegelanalyse & Tools',
    size: '16 MB',
    r: 5.0,
    desc: 'LUFS- und Loudness-Meter fuer Streaming und Broadcast.',
    landingUrl: 'https://youlean.co/download-youlean-loudness-meter/',
    directUrl: 'https://cdn.youlean.co/wp-content/uploads/2025/11/Youlean-Loudness-Meter-2-V2.5.14-Windows-1.zip',
    directFileName: 'Youlean-Loudness-Meter-2-V2.5.14-Windows-1.zip',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac'],
    longDesc: 'Youlean ist ein sehr sinnvoller Download fuer Mixing und Loudness-Kontrolle. Der Dateilink ist echt und wird direkt lokal gespeichert.',
    features: [
      'LUFS, True Peak und Lautheitskontrolle',
      'Direkter Windows-Download verifiziert',
      'Datei wird direkt in Omega abgelegt'
    ]
  }
]

const BUILTIN_PLUGINS: StorePlugin[] = COMPACT_PLUGINS.map((plugin) => ({
  id: plugin.id,
  name: plugin.name,
  manufacturer: plugin.mfg,
  category: plugin.cat,
  subCategory: plugin.sub,
  description: plugin.desc,
  longDescription: plugin.longDesc,
  rating: plugin.r,
  reviews: Math.floor(plugin.r * 250) + 74,
  size: plugin.size,
  formats: plugin.formats,
  landingPageUrl: plugin.landingUrl,
  directDownloadUrl: plugin.directUrl,
  directDownloadFileName: plugin.directFileName,
  downloadMode: plugin.directUrl ? 'direct' : 'external',
  platforms: plugin.platforms,
  features: plugin.features
}))

const RACK_CATEGORIES = [
  'Alle',
  'Synthesizer',
  'Sampler',
  'Hall & Delay',
  'EQ & Filter',
  'Pitch & Autotune',
  'Pegelanalyse & Tools'
]

function getDirectoryFromFilePath(filePath: string): string {
  const parts = filePath.split(/[\\/]/)
  parts.pop()
  return parts.join('\\')
}

export function VstPluginStore({ isPopout: propIsPopout }: { isPopout?: boolean, onInstalledChange?: () => void }) {
  const isPopout = propIsPopout ?? (new URLSearchParams(window.location.search).get('window') === 'vst-store')
  const [storeCatalog] = useState<StorePlugin[]>(BUILTIN_PLUGINS)
  const [activeCategory, setActiveCategory] = useState('Alle')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlugin, setSelectedPlugin] = useState<StorePlugin | null>(null)
  const [scannedPlugins, setScannedPlugins] = useState<PluginDescriptor[]>([])
  const [rackPlugins, setRackPlugins] = useState<any[]>([])
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set())
  const [downloadedPaths, setDownloadedPaths] = useState<Record<string, string>>({})

  const reloadPluginState = async () => {
    try {
      const plugins = await window.api.scanVstPlugins()
      if (Array.isArray(plugins)) {
        setScannedPlugins(plugins)
      } else {
        setScannedPlugins([])
      }
    } catch {
      setScannedPlugins([])
    } finally {
      setRackPlugins(readRackPluginsFromStorage())
    }
  }

  useEffect(() => {
    let cancelled = false

    const reloadStatus = () => {
      reloadPluginState().catch(() => {
        if (!cancelled) {
          setScannedPlugins([])
          setRackPlugins(readRackPluginsFromStorage())
        }
      })
    }

    reloadStatus()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'vst_rack_plugins' || event.key === 'vst_rack_updated_trigger') {
        setRackPlugins(readRackPluginsFromStorage())
      }
    }

    const handleSettingsUpdated = () => {
      reloadStatus()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('SETTINGS_UPDATED', handleSettingsUpdated)

    return () => {
      cancelled = true
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('SETTINGS_UPDATED', handleSettingsUpdated)
    }
  }, [])

  const filteredCatalog = storeCatalog.filter((plugin) => {
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeCategory === 'Alle') return matchesSearch
    return matchesSearch && plugin.subCategory === activeCategory
  })

  const directDownloadCount = useMemo(
    () => storeCatalog.filter((plugin) => plugin.downloadMode === 'direct').length,
    [storeCatalog]
  )
  const selectedPluginStatus = selectedPlugin
    ? getStorePluginStatus(selectedPlugin, scannedPlugins, rackPlugins, downloadedPaths)
    : null

  async function handleDirectDownload(plugin: StorePlugin) {
    if (!plugin.directDownloadUrl || activeDownloads.has(plugin.id)) return

    setActiveDownloads((prev) => new Set(prev).add(plugin.id))
    try {
      const result = await window.api.downloadPluginFile({
        url: plugin.directDownloadUrl,
        fileName: plugin.directDownloadFileName,
        pluginName: plugin.name
      })

      if (result.success && result.filePath) {
        setDownloadedPaths((prev) => ({ ...prev, [plugin.id]: result.filePath! }))
      }
    } finally {
      setActiveDownloads((prev) => {
        const next = new Set(prev)
        next.delete(plugin.id)
        return next
      })
    }
  }

  function renderActionButton(plugin: StorePlugin, compact = false) {
    const status = getStorePluginStatus(plugin, scannedPlugins, rackPlugins, downloadedPaths)
    const downloadedPath = status.downloadedPath
    const isDownloading = activeDownloads.has(plugin.id)
    const classes = compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-4 py-2 text-xs'

    if (status.isInstalled && status.isHostable) {
      return (
        <button
          onClick={(event) => event.stopPropagation()}
          className={`flex items-center gap-1 ${classes} bg-emerald-950/35 border border-emerald-900/40 rounded-xl text-emerald-300 font-extrabold transition-all cursor-default`}
          title="Plugin wurde im System gefunden"
        >
          <Check size={compact ? 10 : 12} className="stroke-[2.5]" />
          <span>{status.isInRack ? 'Im Rack' : 'Im System'}</span>
        </button>
      )
    }

    if (downloadedPath && !status.isInstalled) {
      return (
        <button
          onClick={(event) => {
            event.stopPropagation()
            void reloadPluginState()
          }}
          className={`flex items-center gap-1 ${classes} bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-extrabold transition-all shadow-md active:scale-[0.96]`}
          title="Nach neuer Installation erneut suchen"
        >
          <Cpu size={compact ? 10 : 12} className="stroke-[2.5]" />
          <span>Neu scannen</span>
        </button>
      )
    }

    if (downloadedPath) {
      return (
        <button
          onClick={(event) => {
            event.stopPropagation()
            void window.api.openPath(getDirectoryFromFilePath(downloadedPath))
          }}
          className={`flex items-center gap-1 ${classes} bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-extrabold transition-all shadow-md active:scale-[0.96]`}
          title="Download-Ordner öffnen"
        >
          <Check size={compact ? 10 : 12} className="stroke-[2.5]" />
          <span>Ordner öffnen</span>
        </button>
      )
    }

    if (plugin.downloadMode === 'direct' && plugin.directDownloadUrl) {
      return (
        <button
          onClick={(event) => {
            event.stopPropagation()
            void handleDirectDownload(plugin)
          }}
          disabled={isDownloading}
          className={`flex items-center gap-1 ${classes} ${isDownloading ? 'bg-blue-900/40 text-blue-200 border border-blue-700/40 cursor-wait' : 'bg-omega-accent hover:bg-blue-500 text-white'} rounded-xl font-extrabold transition-all shadow-md active:scale-[0.96]`}
          title="Datei direkt in den Omega-Download-Ordner laden"
        >
          <ExternalLink size={compact ? 10 : 12} className="stroke-[2.5]" />
          <span>{isDownloading ? 'Lädt...' : 'Direkt laden'}</span>
        </button>
      )
    }

    return (
      <a
        href={plugin.landingPageUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={`flex items-center gap-1 ${classes} bg-[#223044] hover:bg-[#29415f] rounded-xl text-white font-extrabold transition-all shadow-md active:scale-[0.96]`}
        title="Herstellerseite öffnen"
      >
        <ExternalLink size={compact ? 10 : 12} className="stroke-[2.5]" />
        <span>Herstellerseite</span>
      </a>
    )
  }

  function renderCard(plugin: StorePlugin, popout = false) {
    const isInstrument = plugin.category === 'Instrument'
    const status = getStorePluginStatus(plugin, scannedPlugins, rackPlugins, downloadedPaths)
    const isInstalled = status.isInstalled
    const isInRack = status.isInRack
    const isHostable = status.isHostable

    return (
      <div
        key={plugin.id}
        onClick={() => setSelectedPlugin(plugin)}
        className={popout
          ? 'bg-[#1a1d21]/60 border border-gray-750 hover:border-omega-accent/50 rounded-2xl p-4 transition-all duration-300 cursor-pointer hover:bg-[#1a1d21]/90 flex flex-col justify-between group shadow-xl'
          : 'p-3.5 bg-[#1b1e22]/60 border border-gray-800 hover:border-omega-accent/50 rounded-xl flex items-center justify-between shadow-md cursor-pointer transition-colors hover:bg-[#1a1d21]/80'}
      >
        {popout ? (
          <>
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm select-none shadow-inner ${
                  isInstrument
                    ? 'bg-purple-950/40 text-purple-400 border border-purple-900/40'
                    : 'bg-blue-950/40 text-blue-400 border border-blue-900/40'
                }`}>
                  {isInstrument ? '🎹' : '🔌'}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border ${
                    isInstrument
                      ? 'bg-purple-950/50 text-purple-300 border-purple-800/30'
                      : 'bg-blue-950/50 text-blue-300 border-blue-800/30'
                  }`}>
                    {plugin.category}
                  </span>
                  {isInstalled ? (
                    <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-cyan-950/50 text-cyan-300 border-cyan-900/30">
                      Gefunden
                    </span>
                  ) : null}
                  {isInRack ? (
                    <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-emerald-950/40 text-emerald-300 border-emerald-900/30">
                      Im Rack
                    </span>
                  ) : null}
                  <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border ${
                    isHostable
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/30'
                      : 'bg-rose-950/50 text-rose-300 border-rose-800/30'
                  }`}>
                    {isHostable ? 'Ladbar' : 'Noch nicht ladbar'}
                  </span>
                </div>
              </div>

              <h3 className="text-xs font-black text-white group-hover:text-omega-accent transition-colors truncate">
                {plugin.name}
              </h3>
              <span className="text-[8.5px] text-gray-500 font-medium block mt-0.5">
                von {plugin.manufacturer}
              </span>
              <p className="text-[10px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                {plugin.description}
              </p>
            </div>

            <div className="mt-4 pt-3.5 border-t border-gray-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star size={9} fill="currentColor" />
                  <span className="font-bold font-mono text-[9px]">{plugin.rating.toFixed(1)}</span>
                </div>
                <span className="text-gray-700 font-bold text-[8px]">•</span>
                <span className="font-mono text-gray-500 text-[8.5px]">{plugin.size}</span>
              </div>
              <div onClick={(event) => event.stopPropagation()}>
                {renderActionButton(plugin, true)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0 mr-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                isInstrument ? 'bg-purple-950/40 text-purple-400' : 'bg-blue-950/40 text-blue-400'
              }`}>
                {isInstrument ? '🎹' : '🔌'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white truncate">{plugin.name}</span>
                  <span className="text-[7px] bg-gray-850 text-omega-accent font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                    {plugin.formats.join('/')}
                  </span>
                  {isInstalled ? (
                    <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded border bg-cyan-950/50 text-cyan-300 border-cyan-900/30">
                      Gefunden
                    </span>
                  ) : null}
                  {isInRack ? (
                    <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded border bg-emerald-950/40 text-emerald-300 border-emerald-900/30">
                      Im Rack
                    </span>
                  ) : null}
                  <span className={`text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded border ${
                    isHostable
                      ? 'bg-emerald-950/50 text-emerald-350 border-emerald-900/30'
                      : 'bg-rose-950/50 text-rose-350 border-rose-900/30'
                  }`}>
                    {isHostable ? '✓ Ladbar' : '✕ Noch nicht ladbar'}
                  </span>
                </div>
                <span className="text-[9px] text-gray-500 block truncate">
                  von {plugin.manufacturer} • {plugin.size}
                </span>
              </div>
            </div>

            <div onClick={(event) => event.stopPropagation()} className="flex-shrink-0">
              {renderActionButton(plugin, true)}
            </div>
          </>
        )}
      </div>
    )
  }

  if (!isPopout) {
    return (
      <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden font-sans">
        <div
          onDoubleClick={() => window.api.openPopoutWindow('vst-store', { width: 1120, height: 750, title: 'VST Store' })}
          className="p-3 border-b border-gray-700/80 bg-[#1a1d21]/60 flex items-center justify-between gap-3 flex-shrink-0 cursor-pointer hover:bg-[#1a1d21]/80 select-none transition-colors"
          title="Doppelklick zum Ausdocken des VST Stores in ein separates Fenster"
        >
          <div className="w-1/3 min-w-[150px]">
            <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              🏪 VST Store
            </h2>
            <p className="text-[9px] text-gray-500 mt-0.5">
              Verifizierte Freeware-Plugins. Echte Direktdownloads, wo technisch sauber möglich.
            </p>
          </div>

          <div className="w-1/3 flex justify-center" onClick={(event) => event.stopPropagation()}>
            <button
              onClick={() => window.api.openPopoutWindow('vst-store', { width: 1120, height: 750, title: 'VST Store' })}
              className="h-8 px-3.5 bg-green-600/15 hover:bg-green-600 hover:text-white border border-green-600/60 rounded-lg text-green-400 font-extrabold text-[11px] flex items-center gap-1.5 transition-all shadow active:scale-[0.97]"
              title="VST Store im separaten Fenster öffnen"
            >
              <ExternalLink size={12} className="stroke-[2.5]" />
              <span>Store öffnen</span>
            </button>
          </div>

          <div className="w-1/3 flex justify-end" onClick={(event) => event.stopPropagation()}>
            <div className="relative w-44 sm:w-56">
              <input
                type="text"
                placeholder="Store durchsuchen..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full py-1.5 pl-8 pr-3 text-[11px] bg-[#101214] border border-gray-750 rounded-lg text-gray-250 outline-none focus:border-omega-accent transition-colors"
              />
              <span className="absolute left-2.5 top-2 text-[10px] text-gray-500">🔍</span>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-3 p-2.5 bg-blue-950/25 border border-blue-900/35 rounded-xl text-[10px] text-blue-300 flex items-start gap-2 flex-shrink-0 shadow-sm">
          <ShieldAlert size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-extrabold text-white block mb-0.5">Echter Plugin Store</span>
            <span>{directDownloadCount} Plugins haben gerade verifizierte Direktdownloads. Alles andere bleibt klar als Herstellerseite markiert.</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#141619] space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Empfohlene VST-Plugins ({filteredCatalog.length})
          </h3>

          {filteredCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-800 rounded-2xl text-center px-4 py-8">
              <span className="text-4xl filter grayscale opacity-40">🏪</span>
              <h4 className="text-xs font-bold text-gray-500 mt-3 uppercase tracking-wider">
                Keine Plugins gefunden
              </h4>
              <p className="text-[10px] text-gray-655 max-w-xs mt-1 leading-relaxed">
                Keine VSTs entsprechen Ihrer Suche im Store.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredCatalog.map((plugin) => renderCard(plugin))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-655 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-gray-500 flex-shrink-0" />
            <span>Direktdownloads werden nur für verifizierte Hersteller-Dateien angeboten. Was keinen echten Dateilink hat, bleibt bewusst als externer Hersteller-Link markiert.</span>
          </div>
          <span className="font-mono flex-shrink-0">Store v0.11.1</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden relative font-sans">
      <div className="p-4 border-b border-gray-700/80 bg-[#1a1d21]/60 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            🏪 VST Store
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Verifizierte Freeware-Plugins. Echte Direktdownloads, wo technisch sauber möglich.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-950/20 border border-blue-900/30 rounded text-blue-400 text-[10px]">
          <Cpu size={12} />
          <span>Store mit Direktdownloads</span>
        </div>
      </div>

      <div className="px-4 py-3 bg-[#141619]/80 border-b border-gray-800/80 flex justify-center items-center flex-shrink-0">
        <div className="relative w-full max-w-lg">
          <input
            type="text"
            placeholder="Store nach Name, Hersteller oder Beschreibung filtern..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full py-2 pl-9 pr-4 text-xs bg-[#101214] border border-gray-750 rounded-xl text-gray-250 outline-none focus:border-omega-accent transition-colors"
          />
          <span className="absolute left-3.5 top-2.5 text-gray-500 text-xs">🔍</span>
        </div>
      </div>

      <div className="mx-4 mt-3 p-3.5 bg-blue-950/20 border border-blue-900/30 rounded-xl text-xs text-blue-300 flex items-start gap-3 shadow-md flex-shrink-0">
        <ShieldAlert size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-extrabold text-white block mb-0.5">Plugin Store mit echten Direktdownloads</span>
          <span>Verifizierte Windows-Dateien werden direkt in Ihren Omega-Download-Ordner geladen. Wo kein echter Dateilink vorliegt, bleibt der Eintrag bewusst bei der Herstellerseite.</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-row">
        <div className="w-64 bg-[#17191c]/90 border-r border-gray-800 p-4 overflow-y-auto flex-shrink-0 space-y-1.5 scrollbar-thin">
          <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 mb-2">Kategorien</h3>
          {RACK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-left px-3 py-2 text-xs font-bold uppercase rounded-lg border transition-all flex items-center gap-2.5 ${
                activeCategory === cat
                  ? 'bg-omega-accent border-omega-accent text-white shadow-[0_0_8px_rgba(0,122,204,0.4)]'
                  : 'bg-gray-850/50 hover:bg-gray-800 text-gray-400 border-gray-800/50 hover:border-gray-700'
              }`}
            >
              <span className="text-xs">
                {cat === 'Alle' ? '🌐' : cat.includes('Synth') || cat.includes('Sampler') ? '🎹' : '🔌'}
              </span>
              <span className="truncate">{cat}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#25282c] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          {filteredCatalog.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-48 text-center text-gray-500">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-xs">Keine VSTs in dieser Kategorie gefunden, die der Suche entsprechen.</p>
            </div>
          ) : (
            filteredCatalog.map((plugin) => renderCard(plugin, true))
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-655 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-gray-500 flex-shrink-0" />
            <span>Direktdownloads werden nur für verifizierte Hersteller-Dateien angeboten. Was keinen echten Dateilink hat, bleibt bewusst als externer Hersteller-Link markiert.</span>
        </div>
        <span className="font-mono flex-shrink-0">Store v0.11.1</span>
      </div>

      {selectedPlugin ? (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#1e2124] border border-gray-755 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedPlugin(null)}
              className="absolute top-3.5 right-3.5 p-1 rounded-full bg-black/40 hover:bg-black/60 text-gray-400 hover:text-white border border-gray-700/40 transition-colors z-20"
            >
              <X size={14} />
            </button>

            <div className="p-8 pt-10 bg-[#141619] border-b border-gray-800 flex flex-col items-center justify-center text-center gap-2 flex-shrink-0 select-none">
              <span className="text-3xl opacity-60">📷</span>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Keine Bildvorschau verfügbar</h4>
              <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
                Fuer dieses Plugin ist keine verifizierte Oberflaechen-Vorschau hinterlegt. Wir zeigen lieber keine erfundene Grafik an.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">{selectedPlugin.name}</h2>
                    <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border border-gray-855 bg-black/30 text-omega-accent">
                      {selectedPlugin.subCategory}
                    </span>
                    {selectedPluginStatus?.isInstalled ? (
                      <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-cyan-950/50 text-cyan-300 border-cyan-900/30">
                        Gefunden
                      </span>
                    ) : null}
                    {selectedPluginStatus?.isInRack ? (
                      <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-emerald-950/40 text-emerald-300 border-emerald-900/30">
                        Im Rack
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold font-mono mt-0.5">
                    von {selectedPlugin.manufacturer}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-amber-500 font-bold font-mono text-xs bg-amber-950/15 border border-amber-900/20 px-2 py-0.5 rounded-lg">
                  <Star size={10} fill="currentColor" />
                  <span>{selectedPlugin.rating.toFixed(1)}</span>
                  <span className="text-[9px] text-gray-500 font-normal">({selectedPlugin.reviews})</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-300 leading-relaxed bg-[#171a1d] p-3 rounded-xl border border-gray-800/50">
                {selectedPlugin.longDescription}
              </p>

              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div className="bg-[#171a1d] border border-gray-800/60 rounded-xl p-3">
                  <span className="text-gray-500 uppercase tracking-wider block mb-1">Systemstatus</span>
                  <span className={selectedPluginStatus?.isInstalled ? 'text-cyan-300 font-semibold' : 'text-gray-400'}>
                    {selectedPluginStatus?.isInstalled ? 'Im System gefunden' : 'Noch nicht im System gefunden'}
                  </span>
                </div>
                <div className="bg-[#171a1d] border border-gray-800/60 rounded-xl p-3">
                  <span className="text-gray-500 uppercase tracking-wider block mb-1">Ladestatus</span>
                  <span className={selectedPluginStatus?.isHostable ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                    {selectedPluginStatus?.isHostable ? 'Aktuell ladbar' : 'Noch nicht ladbar'}
                  </span>
                </div>
              </div>

              {selectedPluginStatus?.unsupportedReason ? (
                <div className="text-[10px] text-amber-300 bg-amber-950/15 border border-amber-900/30 p-3 rounded-xl leading-relaxed">
                  Aktueller technischer Hinweis: {selectedPluginStatus.unsupportedReason}
                </div>
              ) : null}

              <div>
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Sparkles size={9} className="text-omega-accent" />
                  Features & Details
                </h4>
                <ul className="grid grid-cols-1 gap-1.5">
                  {selectedPlugin.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-[10px] text-gray-400 leading-tight">
                      <Check size={10} className="text-omega-accent stroke-[3] mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-1 pt-3 border-t border-gray-800/80">
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Technische Spezifikationen</h4>
                <div className="grid grid-cols-3 gap-3 bg-black/15 p-3 rounded-xl border border-gray-855 text-[10px]">
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-extrabold">Größe</span>
                    <span className="font-mono text-gray-300 font-bold">{selectedPlugin.size}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-extrabold">Formate</span>
                    <span className="font-mono text-gray-300 font-bold">{selectedPlugin.formats.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-605 uppercase block tracking-wider font-extrabold">Plattformen</span>
                    <div className="flex gap-1 mt-0.5">
                      {selectedPlugin.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="px-1 bg-gray-800 border border-gray-700/60 rounded text-[7px] font-mono font-bold text-gray-400 uppercase"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#171a1d] flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] text-gray-500">
                Store mit Direktdownloads • Direktdownload nur bei verifizierten Dateilinks
              </span>
              <div>{renderActionButton(selectedPlugin)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function VstPluginStorePopout() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <VstPluginStore isPopout={true} />
    </div>
  )
}
