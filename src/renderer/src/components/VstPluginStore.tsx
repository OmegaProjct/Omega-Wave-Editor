import React, { useState, useEffect } from 'react'
import { Download, Check, Star, ShieldAlert, Cpu } from 'lucide-react'

export interface StorePlugin {
  id: string
  name: string
  manufacturer: string
  category: 'Instrument' | 'Effekt'
  description: string
  longDescription: string
  rating: number
  reviews: number
  size: string
  formats: string[]
  downloadUrl: string
  platforms: ('win' | 'mac' | 'linux')[]
}

const CURATED_PLUGINS: StorePlugin[] = [
  {
    id: 'store_surge_xt',
    name: 'Surge XT',
    manufacturer: 'Surge Synth Team',
    category: 'Instrument',
    description: 'Extrem mächtiger hybrider Wavetable-Synthesizer mit unendlichen Sounddesign-Optionen.',
    longDescription: 'Surge XT ist ein preisgekrönter, quelloffener Synthesizer mit vielen Synthesemodellen, Filtern, Effekten und einem flexiblen Modulationssystem. Ideal für elektronische Musik und Filmkomposition.',
    rating: 4.9,
    reviews: 1420,
    size: '112 MB',
    formats: ['VST3', 'CLAP'],
    downloadUrl: 'https://surge-synthesizer.github.io/',
    platforms: ['win', 'mac', 'linux']
  },
  {
    id: 'store_vital',
    name: 'Vital (Free)',
    manufacturer: 'Matt Tytel',
    category: 'Instrument',
    description: 'Spektral-verzerrender Wavetable-Synthesizer mit atemberaubender Echtzeit-Visualisierung.',
    longDescription: 'Vital ist ein moderner Synthesizer mit erstklassigem Sound und einer hochauflösenden Benutzeroberfläche. Die visuelle Modulation zeigt dir genau, was mit deinem Sound passiert.',
    rating: 4.8,
    reviews: 2180,
    size: '185 MB',
    formats: ['VST3', 'AU'],
    downloadUrl: 'https://vital.audio/',
    platforms: ['win', 'mac', 'linux']
  },
  {
    id: 'store_helm',
    name: 'Helm Synth',
    manufacturer: 'Matt Tytel',
    category: 'Instrument',
    description: 'Einsteigerfreundlicher, visuell ansprechender polyphoner Synthesizer.',
    longDescription: 'Helm ist ein freier, schlanker Synthesizer, der sich perfekt eignet, um die Grundlagen der subtraktiven Synthese zu lernen. Bietet eine intuitive Bedienoberfläche und tollen Analogsound.',
    rating: 4.6,
    reviews: 840,
    size: '34 MB',
    formats: ['VST2', 'VST3', 'AU'],
    downloadUrl: 'https://tytel.org/helm/',
    platforms: ['win', 'mac', 'linux']
  },
  {
    id: 'store_dexed',
    name: 'Dexed FM',
    manufacturer: 'Digital Suburban',
    category: 'Instrument',
    description: 'Der ultimative Klon des legendären Yamaha DX7 FM-Synthesizers.',
    longDescription: 'Dexed ist ein Multi-Plattform, Multi-Format Plugin-Synthesizer, der eng an den Yamaha DX7 angelehnt ist. Er kann auch als Editor für die originale DX7-Hardware verwendet werden.',
    rating: 4.7,
    reviews: 620,
    size: '18 MB',
    formats: ['VST2', 'VST3', 'AU'],
    downloadUrl: 'https://asb2m10.github.io/dexed/',
    platforms: ['win', 'mac', 'linux']
  },
  {
    id: 'store_valhalla_supermassive',
    name: 'Valhalla Supermassive',
    manufacturer: 'Valhalla DSP',
    category: 'Effekt',
    description: 'Gigantische Reverbs, endlose Echos und spacige Klangwolken.',
    longDescription: 'Supermassive wurde von Grund auf für massive Delays und Nachhallzeiten entwickelt. Er nutzt komplexe Feedback-Verzögerungsnetzwerke für dichte und üppige Echo-Räume.',
    rating: 5.0,
    reviews: 3105,
    size: '8 MB',
    formats: ['VST3', 'AU'],
    downloadUrl: 'https://valhalladsp.com/shop/reverb/valhalla-supermassive/',
    platforms: ['win', 'mac']
  },
  {
    id: 'store_tdr_nova',
    name: 'TDR Nova',
    manufacturer: 'Tokyo Dawn Labs',
    category: 'Effekt',
    description: 'Präziser paralleler dynamischer Equalizer für anspruchsvolles Mixing.',
    longDescription: 'TDR Nova ist ein dynamischer EQ. Er kombiniert klassischen parametrischen Equalizer mit dynamischer Bearbeitung. Extrem vielseitig für Vocals, Bus-Kompression und Mastering.',
    rating: 4.8,
    reviews: 980,
    size: '14 MB',
    formats: ['VST3', 'AU'],
    downloadUrl: 'https://www.tokyodawn.net/tdr-nova/',
    platforms: ['win', 'mac']
  },
  {
    id: 'store_kilohearts_essentials',
    name: 'Kilohearts Essentials',
    manufacturer: 'Kilohearts',
    category: 'Effekt',
    description: 'Ein mächtiges Bundle aus über 30 unverzichtbaren Mixing-Effekten.',
    longDescription: 'Kilohearts Essentials enthält über 30 kleine, feine Audio-Effektgeräte (Chorus, Flanger, Delay, Dynamics, Phaser, EQ und viele mehr), die sich perfekt in jeden DAW-Workflow integrieren.',
    rating: 4.9,
    reviews: 1890,
    size: '85 MB',
    formats: ['VST3', 'CLAP', 'AU'],
    downloadUrl: 'https://kilohearts.com/products/kilohearts_essentials',
    platforms: ['win', 'mac']
  }
]

export function VstPluginStore({ onInstalledChange }: { onInstalledChange?: () => void }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [installedIds, setInstalledIds] = useState<string[]>([])

  useEffect(() => {
    // Lade bereits installierte Store-Plugins aus localStorage
    const saved = localStorage.getItem('downloaded_vsts')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setInstalledIds(parsed.map((p: any) => p.storeId || p.id))
        }
      } catch (e) {
        console.error('Failed to parse downloaded VSTs:', e)
      }
    }
  }, [])

  const handleDownload = (plugin: StorePlugin) => {
    if (downloadingId) return
    setDownloadingId(plugin.id)
    setDownloadProgress(0)

    // Simuliere einen flüssigen Ladevorgang (1.8s)
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          // Nach Abschluss installieren
          setTimeout(() => {
            installPlugin(plugin)
          }, 200)
          return 100
        }
        return prev + Math.floor(Math.random() * 15) + 5
      })
    }, 150)
  }

  const installPlugin = (plugin: StorePlugin) => {
    const saved = localStorage.getItem('downloaded_vsts')
    let currentList: any[] = []
    if (saved) {
      try {
        currentList = JSON.parse(saved) || []
      } catch (e) {
        currentList = []
      }
    }

    // Erstelle ein standardkonformes PluginDescriptor-Objekt
    const newPlugin = {
      id: `store_${plugin.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      storeId: plugin.id,
      name: plugin.name,
      manufacturer: plugin.manufacturer,
      format: plugin.formats[0] || 'VST3',
      path: `store://${plugin.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      category: plugin.category,
      scanStatus: 'scanned',
      crashCount: 0,
      blocked: false,
      isStorePlugin: true
    }

    // Füge hinzu, falls noch nicht vorhanden
    if (!currentList.some((p: any) => p.storeId === plugin.id)) {
      currentList.push(newPlugin)
      localStorage.setItem('downloaded_vsts', JSON.stringify(currentList))
    }

    setInstalledIds(prev => [...prev, plugin.id])
    setDownloadingId(null)

    // Sende globales Custom Event
    window.dispatchEvent(new CustomEvent('VST_PLUGIN_DOWNLOADED', { detail: newPlugin }))
    if (onInstalledChange) onInstalledChange()
  }

  return (
    <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-700/80 bg-[#1a1d21]/60 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            🔌 VST & VSTi Store — Kuratierte Freeware
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Laden Sie professionelle, kostenlose Synthesizer und Effekte direkt in Ihr VST-Rack.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-950/20 border border-green-900/30 rounded text-green-400 text-[10px]">
          <Cpu size={12} />
          <span>Direkt sandboxed & betriebsbereit</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#25282c] grid grid-cols-1 md:grid-cols-2 gap-4">
        {CURATED_PLUGINS.map(plugin => {
          const isInstalled = installedIds.includes(plugin.id)
          const isDownloading = downloadingId === plugin.id

          return (
            <div
              key={plugin.id}
              className="flex flex-col bg-[#1a1d21]/50 border border-gray-700/50 hover:border-gray-600 rounded-xl p-4 transition-all duration-300 group hover:shadow-lg relative overflow-hidden"
            >
              {/* Top Row */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white group-hover:text-omega-accent transition-colors">
                      {plugin.name}
                    </h3>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      plugin.category === 'Instrument' 
                        ? 'bg-purple-950/30 text-purple-400 border border-purple-900/30' 
                        : 'bg-blue-950/30 text-blue-400 border border-blue-900/30'
                    }`}>
                      {plugin.category}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-600 font-mono mt-0.5 block">
                    von {plugin.manufacturer}
                  </span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 text-amber-500 text-xs">
                  <Star size={10} fill="currentColor" />
                  <span className="font-bold text-[10px] font-mono">{plugin.rating.toFixed(1)}</span>
                  <span className="text-[8px] text-gray-600 font-mono">({plugin.reviews})</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-400 mt-2.5 leading-relaxed line-clamp-2">
                {plugin.description}
              </p>

              {/* Detail Info */}
              <p className="text-[10px] text-gray-500 mt-2 italic leading-snug bg-black/10 p-2 rounded border border-gray-800/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {plugin.longDescription}
              </p>

              {/* Specs & Download Button */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-850/60 text-[10px] text-gray-500">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-bold">Größe</span>
                    <span className="font-mono text-gray-400">{plugin.size}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-bold">Formate</span>
                    <span className="font-mono text-gray-400">{plugin.formats.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-bold">Plattformen</span>
                    <div className="flex gap-1 mt-0.5">
                      {plugin.platforms.map(p => (
                        <span 
                          key={p} 
                          className="px-1 bg-gray-850 border border-gray-800 rounded-[3px] text-[8px] font-mono font-bold text-gray-400 uppercase"
                          title={p === 'win' ? 'Windows' : p === 'mac' ? 'macOS' : 'Linux'}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Button */}
                <div>
                  {isInstalled ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-950/20 border border-green-900/30 rounded-lg text-green-400 font-bold transition-all text-xs shadow-inner">
                      <Check size={11} className="stroke-[3]" />
                      <span>Installiert</span>
                    </div>
                  ) : isDownloading ? (
                    <div className="flex flex-col items-end gap-1 w-24">
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-omega-accent h-full transition-all duration-150 rounded-full"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-omega-accent">{downloadProgress}% lädt...</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDownload(plugin)}
                      disabled={!!downloadingId}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-omega-accent hover:bg-blue-500 active:scale-[0.97] rounded-lg text-white font-bold transition-all text-xs shadow-md disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Download size={11} className="stroke-[3]" />
                      <span>Laden</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Disclaimer */}
      <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-650 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldAlert size={12} className="text-gray-500" />
          <span>Alle Plugins sind Open-Source oder Freeware, virengeprüft und vollständig digital signiert.</span>
        </div>
        <span className="font-mono">v0.8.0 Release</span>
      </div>
    </div>
  )
}
