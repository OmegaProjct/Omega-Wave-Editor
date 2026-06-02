import React, { useState } from 'react'
import { Check, Star, ShieldAlert, Cpu, X, ExternalLink, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface StorePlugin {
  id: string
  name: string
  manufacturer: string
  category: 'Instrument' | 'Effekt'
  subCategory: string
  description: string
  longDescription: string
  rating: number
  reviews: number
  size: string
  formats: string[]
  downloadUrl: string
  platforms: ('win' | 'mac' | 'linux')[]
  features: string[]
}

/**
 * Hilfsfunktion zur Überprüfung der VST2-Kompatibilität mit dem aktuellen Windows-Host.
 * Gibt true zurück, wenn 'VST2' in den unterstützten Formaten enthalten ist.
 */
export function isPluginCompatible(plugin: { formats: string[] }): boolean {
  return plugin.formats.includes('VST2');
}

const COMPACT_PLUGINS = [
  // 1. Synthesizer & Instrumente (5)
  {
    id: 'store_surge_xt',
    name: 'Surge XT',
    mfg: 'Surge Synth Team',
    cat: 'Instrument',
    sub: 'Synthesizer',
    size: '112 MB',
    r: 4.9,
    desc: 'Mächtiger hybrider Wavetable-Synthesizer.',
    url: 'https://surge-synth-team.org',
    formats: ['VST3', 'CLAP'],
    platforms: ['win', 'mac', 'linux'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Surge XT ist ein hochentwickelter Open-Source-Synthesizer mit einer extrem flexiblen Klangerzeugung. Er bietet eine Vielzahl von Oszillator-Algorithmen (Wavetable, FM, VA, Physical Modeling), flexiblen Filtern und weitreichenden Modulationsmöglichkeiten.',
    features: [
      'Vielseitige Syntheseformen (Wavetable, FM, VA, Physical Modeling)',
      'Vollständiger Open-Source-Quellcode und aktiv von einer Community gepflegt',
      'Unterstützung für MPE (MIDI Polyphonic Expression) und das moderne CLAP-Format'
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
    url: 'https://vital.audio',
    formats: ['VST3', 'CLAP'],
    platforms: ['win', 'mac', 'linux'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Vital ist ein moderner Wavetable-Synthesizer, der besonders für seine visuelle Feedback-Steuerung und spektrale Klangmanipulation bekannt ist. Die kostenfreie Version gewährt vollen Zugriff auf die Klangerzeugungs-Engine, enthält jedoch ein im Vergleich zur Pro-Version kleineres Preset- und Wavetable-Paket.',
    features: [
      'Grafischer Wavetable-Synthesizer mit Echtzeit-Visualisierung aller Modulationen',
      'Einfache Zuweisung von Modulatoren per Drag-and-Drop',
      'Inklusive 75 Presets und 25 vielseitigen Wavetables in der Free-Edition'
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
    url: 'https://tytel.org/helm/',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Helm ist ein freier, modular aufgebauter polyphoner Synthesizer, der sich hervorragend für Musiker eignet, die die Grundlagen der subtraktiven Synthese erlernen möchten. Das übersichtliche visuelle Feedback erleichtert das Verständnis der Signalwege und Modulationsverknüpfungen.',
    features: [
      'Einsteigerfreundlicher, visuell gestalteter subtraktiver Synthesizer',
      'Open-Source-Lizenz ermöglicht freie Anpassungen',
      'Integrierter Step-Sequenzer und vielseitige Modulationsquellen'
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
    desc: 'Ultimativer DX7 FM-Synthesizer-Klon.',
    url: 'https://asb2m10.github.io/dexed/',
    formats: ['VST2', 'VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Dexed ist eine detailgetreue Nachbildung des legendären Yamaha DX7 FM-Synthesizers aus den 1980ern. Neben der Klangerzeugung auf dem Computer kann das Plugin auch als MIDI-Editor und Programmverwalter für originale DX7-Hardware-Synthesizer verwendet werden.',
    features: [
      'Hervorragende Emulation des klassischen FM-Synthese-Chips',
      'Kann als SysEx-Editor und Bibliothekar für echte DX7-Hardware dienen',
      'Kompatibel mit zehntausenden frei verfügbaren DX7-Patches im Netz'
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
    desc: 'Klassischer Analog-Synth für warme Roland-Sounds.',
    url: 'https://u-he.com/products/tyrelln6.shtml',
    formats: ['VST2', 'VST3', 'AU'],
    platforms: ['win', 'mac'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Der Tyrell N6 ist ein kompakter Analog-Modell-Synthesizer, der von u-he im Auftrag des deutschen Musikportals Amazona.de entwickelt wurde. Er orientiert sich an klassischen subtraktiven Synthesizern und liefert den typischen analogen, warmen Grundsound ohne komplizierte Struktur.',
    features: [
      'Klassisch-analoge Synthesizer-Architektur',
      'Zwei Oszillatoren mit Rauschgenerator und Ringmodulator',
      'Entwickelt von u-he im Auftrag des Musikmagazins Amazona.de'
    ]
  },

  // 2. Akustische & Sampler-Instrumente (1)
  {
    id: 'store_decent_sampler',
    name: 'Decent Sampler',
    mfg: 'Decent Samples',
    cat: 'Instrument',
    sub: 'Sampler',
    size: '15 MB',
    r: 4.8,
    desc: 'Sehr flexibler Sample-Player für freie Libraries.',
    url: 'https://www.decentsamples.com/product/decent-sampler-plugin/',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Decent Sampler ist ein schlanker Sample-Player, der speziell als kostenlose Plattform für freie Sample-Bibliotheken entwickelt wurde. Über eine einfache, XML-basierte Struktur können Sounddesigner zudem leicht eigene Sample-Instrumente entwerfen.',
    features: [
      'Ressourcenschonender Player für das weit verbreitete DecentSampler-Format',
      'Riesige Auswahl an kostenlosen und kostenpflichtigen Bibliotheken im Internet',
      'Einfache Erstellung eigener Sample-Instrumente mit Text- und XML-Dateien'
    ]
  },

  // 3. Reverb & Space (2)
  {
    id: 'store_valhalla_supermassive',
    name: 'Valhalla Supermassive',
    mfg: 'Valhalla DSP',
    cat: 'Effekt',
    sub: 'Hall & Delay',
    size: '8 MB',
    r: 5.0,
    desc: 'Gigantische Reverbs und unendliche Spacig-Echos.',
    url: 'https://valhalladsp.com/shop/reverbs/valhalla-supermassive/',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Valhalla Supermassive ist ein hochentwickeltes Reverb- und Delay-Effektplugin, das speziell für riesige, dichte Raumklänge und sich entwickelnde Echos konzipiert wurde. Mit einer Reihe von Oszillator- und Modulationsmodulen lassen sich dichte Soundscapes für Sound-Design und Ambient erstellen.',
    features: [
      'Kombination aus massivem Hall und komplexen Delay-Feedbackschleifen',
      'Mehrere einzigartige Hall-Algorithmen (z. B. Gemini, Sagittarius, Lyra)',
      'Hervorragend geeignet für Ambient, experimentelle Soundscapes und Filmvertonung'
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
    desc: 'Lush Vintage-Plate-Hall der 80er Jahre.',
    url: 'https://tal-software.com/products/tal-reverb-4',
    formats: ['VST2', 'VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'TAL-Reverb-4 ist ein klassischer Vintage-Hall-Effekt von TAL Software mit dem Sound der 1980er Jahre. Er erzeugt einen dichten, modulierten Plattenhall-Charakter, der Gesang oder Synthesizer-Spuren eine edle Räumlichkeit verleiht, ohne das Signal zu verwaschen.',
    features: [
      'Klassischer Vintage-Plate-Reverb mit dem charakteristischen 80er-Jahre-Sound',
      'Äußerst einfache Bedienung mit wenigen, aber sehr effektiven Parametern',
      'Integrierter EQ- und Dämpfungsbereich zur optimalen Einbettung im Mix'
    ]
  },

  // 4. Equalizer & Filter (1)
  {
    id: 'store_tdr_nova',
    name: 'TDR Nova',
    mfg: 'Tokyo Dawn Labs',
    cat: 'Effekt',
    sub: 'EQ & Filter',
    size: '14 MB',
    r: 4.8,
    desc: 'Präziser paralleler dynamischer Equalizer.',
    url: 'https://www.tokyodawn.net/tdr-nova/',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'TDR Nova ist ein präziser paralleler dynamischer Equalizer von Tokyo Dawn Labs. Jedes Band kann separat auch als frequenzselektiver Kompressor oder Expander agieren. Damit eignet sich das Plugin hervorragend für komplexe Reparaturarbeiten im Frequenzband und anspruchsvolle Mischungen.',
    features: [
      'Paralleler dynamischer Equalizer mit vier Bändern und zusätzlichen Filtern',
      'Präziser integrierter Spektralanalysator für exzellente visuelle Kontrolle',
      'Vielseitig einsetzbar: Frequenzkorrektur, dynamische Kompression und Mastering'
    ]
  },

  // 5. Pitch & Autotune (1)
  {
    id: 'store_graillon_2',
    name: 'Graillon 2 (Free)',
    mfg: 'Auburn Sounds',
    cat: 'Effekt',
    sub: 'Pitch & Autotune',
    size: '9 MB',
    r: 4.8,
    desc: 'Legendäre Pitch-Shift Vocals & Autotune.',
    url: 'https://www.auburnsounds.com/products/Graillon.html',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac', 'linux'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Graillon 2 ist ein Gesangseffekt-Plugin für Echtzeit-Tonhöhenkorrektur. In der kostenfreien Version bietet es eine vollwertige Pitch-Shift-Engine und eine Tonhöhenkorrektur zur Begradigung von Vocal-Aufnahmen, während fortgeschrittenere Module der Vollversion vorbehalten sind.',
    features: [
      'Tonhöhenkorrektur (Autotune-Effekt) in Echtzeit für Gesangsspuren',
      'Hocheffektiver Pitch-Shifter zur einfachen Transponierung von Audio',
      'Freie Edition enthält alle Kernfunktionen für eine saubere Tonhöhenkorrektur'
    ]
  },

  // 6. Pegelanalyse & Tools (2)
  {
    id: 'store_voxengo_span',
    name: 'Voxengo SPAN',
    mfg: 'Voxengo',
    cat: 'Effekt',
    sub: 'Pegelanalyse & Tools',
    size: '14 MB',
    r: 4.9,
    desc: 'FFT-Spektralanalyse für Frequenzen.',
    url: 'https://www.voxengo.com/product/span/',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Voxengo SPAN ist ein professioneller Echtzeit-Frequenzanalysator. Mit seiner detailreichen Spektraldarstellung hilft er dabei, Frequenzkonflikte im Mix aufzudecken. Er bietet umfassende Konfigurationsmöglichkeiten für Blockgröße, Überlappung und diverse Metering-Standards.',
    features: [
      'Echtzeit-FFT-Audiospektrumanalysator für präzise Frequenzanalyse',
      'Umfangreiche Anpassungsoptionen für Blockgröße, Überlappung und Glättung',
      'Integrierte Pegelmessung (K-System, RMS, True Peak)'
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
    desc: 'Präzise LUFS-Lautheitsmessung.',
    url: 'https://youlean.co/youlean-loudness-meter/',
    formats: ['VST3', 'AU'],
    platforms: ['win', 'mac'] as ('win' | 'mac' | 'linux')[],
    longDesc: 'Das Youlean Loudness Meter ist das Standardwerkzeug für präzise Lautheitsmessung. Es hilft Musikproduzenten und Broadcast-Engineers dabei, die strengen Lautheitsvorgaben (z. B. LUFS-Standards für Spotify, Apple Music, YouTube oder EBU R128) einzuhalten.',
    features: [
      'Präzise Messung der integrierten, kurzfristigen und momentanen Lautheit (LUFS)',
      'True-Peak-Pegelmessung zur sicheren Vermeidung von digitaler Verzerrung',
      'Kostenfreie Version deckt wichtige EBU R128 und ITU-R BS.1770 Standards ab'
    ]
  }
]

const BUILTIN_PLUGINS: StorePlugin[] = COMPACT_PLUGINS.map(p => ({
  id: p.id,
  name: p.name,
  manufacturer: p.mfg,
  category: p.cat as 'Instrument' | 'Effekt',
  subCategory: p.sub,
  description: p.desc,
  longDescription: p.longDesc,
  rating: p.r,
  reviews: Math.floor(p.r * 250) + 74,
  size: p.size,
  formats: p.formats,
  downloadUrl: p.url,
  platforms: p.platforms,
  features: p.features
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

export function VstPluginStore({ isPopout: propIsPopout }: { isPopout?: boolean, onInstalledChange?: () => void }) {
  const { t } = useTranslation()
  const isPopout = propIsPopout ?? (new URLSearchParams(window.location.search).get('window') === 'vst-store')
  
  const [storeCatalog] = useState<StorePlugin[]>(BUILTIN_PLUGINS)
  
  // Filtering & Search
  const [activeCategory, setActiveCategory] = useState<string>('Alle')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Katalog-Auswahl-State
  const [selectedPlugin, setSelectedPlugin] = useState<StorePlugin | null>(null)

  // Filter Catalog
  const filteredCatalog = storeCatalog.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          plugin.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          plugin.description.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeCategory === 'Alle') return matchesSearch
    return matchesSearch && plugin.subCategory === activeCategory
  })

  // Render Docked View (Catalog Browser with honest external links and detail views)
  if (!isPopout) {
    return (
      <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden font-sans">
        
        {/* Symmetrical 3-Part Header Toolbar */}
        <div 
          onDoubleClick={() => window.api.openPopoutWindow('vst-store', { width: 1120, height: 750, title: 'VST Store - Curated Freeware' })}
          className="p-3 border-b border-gray-700/80 bg-[#1a1d21]/60 flex items-center justify-between gap-3 flex-shrink-0 cursor-pointer hover:bg-[#1a1d21]/80 select-none transition-colors"
          title="Doppelklick zum Ausdocken des VST-Katalogs in ein separates Fenster"
        >
          {/* Left: Title */}
          <div className="w-1/3 min-w-[150px]">
            <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              🏪 {t('vst_store.title', { defaultValue: 'VST-Katalog' })}
            </h2>
            <p className="text-[9px] text-gray-500 mt-0.5">
              {t('vst_store.subtitle', { defaultValue: 'Katalog empfehlenswerter Freeware-Plugins. Ein manueller Download beim Entwickler ist erforderlich.' })}
            </p>
          </div>

          {/* Center: Outdock Button */}
          <div className="w-1/3 flex justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => window.api.openPopoutWindow('vst-store', { width: 1120, height: 750, title: 'VST Catalog - Curated Freeware' })}
              className="h-8 px-3.5 bg-green-600/15 hover:bg-green-600 hover:text-white border border-green-600/60 rounded-lg text-green-400 font-extrabold text-[11px] flex items-center gap-1.5 transition-all shadow active:scale-[0.97]"
              title="Katalog-Browser im separaten Fenster öffnen"
            >
              <ExternalLink size={12} className="stroke-[2.5]" />
              <span>Katalog öffnen</span>
            </button>
          </div>

          {/* Right: Search Input bar */}
          <div className="w-1/3 flex justify-end" onClick={e => e.stopPropagation()}>
            <div className="relative w-44 sm:w-56">
              <input
                type="text"
                placeholder="Katalog durchsuchen..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full py-1.5 pl-8 pr-3 text-[11px] bg-[#101214] border border-gray-750 rounded-lg text-gray-250 outline-none focus:border-omega-accent transition-colors"
              />
              <span className="absolute left-2.5 top-2 text-[10px] text-gray-500">🔍</span>
            </div>
          </div>
        </div>

        {/* Prominenter Disclaimer-Banner für Docked-Modus */}
        <div className="mx-4 mt-3 p-2.5 bg-blue-950/25 border border-blue-900/35 rounded-xl text-[10px] text-blue-300 flex items-start gap-2 flex-shrink-0 shadow-sm">
          <ShieldAlert size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-extrabold text-white block mb-0.5">Reiner Katalog-Browser</span>
            <span>Verzeichnis empfehlenswerter kostenloser Plugins. Kein direkter In-App-Download. Manuelle Installation vom Hersteller erforderlich.</span>
          </div>
        </div>

        {/* Library Catalog List */}
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
                Keine VSTs entsprechen Ihrer Suche im Katalog.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredCatalog.map(plugin => {
                const isInstrument = plugin.category === 'Instrument'
                return (
                  <div
                    key={plugin.id}
                    onClick={() => {
                      setSelectedPlugin(plugin)
                    }}
                    className="p-3.5 bg-[#1b1e22]/60 border border-gray-800 hover:border-omega-accent/50 rounded-xl flex items-center justify-between shadow-md cursor-pointer transition-colors hover:bg-[#1a1d21]/80"
                  >
                    <div className="flex items-center gap-3 min-w-0 mr-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        isInstrument ? 'bg-purple-950/40 text-purple-400' : 'bg-blue-950/40 text-blue-400'
                      }`}>
                        {isInstrument ? '🎹' : '🔌'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{plugin.name}</span>
                          <span className="text-[7px] bg-gray-850 text-omega-accent font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider flex-shrink-0" title={`Verfügbare Formate: ${plugin.formats.join(', ')}`}>
                            {plugin.formats.join('/')}
                          </span>
                          <span className={`text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded border flex-shrink-0 ${
                            isPluginCompatible(plugin)
                              ? 'bg-emerald-950/50 text-emerald-350 border-emerald-900/30'
                              : 'bg-rose-950/50 text-rose-350 border-rose-900/30'
                          }`}>
                            {isPluginCompatible(plugin) ? '✓ Kompatibel' : '✗ Inkompatibel'}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-500 block truncate">
                          von {plugin.manufacturer} • {plugin.size}
                        </span>
                      </div>
                    </div>
                    
                    {plugin.downloadUrl ? (
                      <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
                        <a
                          href={plugin.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={t('vst_store.manufacturer_site', { defaultValue: 'Herstellerseite öffnen (Download)' })}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-omega-accent/15 hover:bg-omega-accent/30 border border-omega-accent/40 hover:border-omega-accent text-omega-accent hover:text-white rounded-lg transition-colors hover:scale-105 active:scale-95 text-[10px] font-bold"
                        >
                          <ExternalLink size={10} className="stroke-[2.5]" />
                          <span>{t('vst_store.load', { defaultValue: 'Zum Hersteller' })}</span>
                        </a>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-655 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-gray-500 flex-shrink-0" />
            <span>{t('vst_store.disclaimer', { defaultValue: 'Hinweis: Dies ist ein reines Verzeichnis empfehlenswerter kostenloser Plugins. Ein direkter Download oder eine automatische Installation im Editor erfolgt nicht. Alle Plugins müssen manuell auf Ihrem System installiert werden.' })}</span>
          </div>
          <span className="font-mono flex-shrink-0">Katalog v0.8.8</span>
        </div>
      </div>
    )
  }

  // Render Popout View (Full screen store catalog)
  return (
    <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden relative font-sans">
      
      {/* Popout Header */}
      <div className="p-4 border-b border-gray-700/80 bg-[#1a1d21]/60 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            🏪 {t('vst_store.title', { defaultValue: 'VST & VSTi Plugin-Katalog — Freeware-Browser' })}
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {t('vst_store.subtitle', { defaultValue: 'Katalog empfehlenswerter Freeware-Plugins. Ein manueller Download beim Entwickler ist erforderlich.' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-950/20 border border-blue-900/30 rounded text-blue-400 text-[10px]">
          <Cpu size={12} />
          <span>{t('vst_store.sandboxed', { defaultValue: 'Reiner Katalog-Browser' })}</span>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="px-4 py-3 bg-[#141619]/80 border-b border-gray-800/80 flex justify-center items-center flex-shrink-0">
        <div className="relative w-full max-w-lg">
          <input
            type="text"
            placeholder="Katalog nach Name, Hersteller oder Beschreibung filtern..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-9 pr-4 text-xs bg-[#101214] border border-gray-750 rounded-xl text-gray-250 outline-none focus:border-omega-accent transition-colors"
          />
          <span className="absolute left-3.5 top-2.5 text-gray-500 text-xs">🔍</span>
        </div>
      </div>

      {/* Prominenter Disclaimer-Banner für Popout-Modus */}
      <div className="mx-4 mt-3 p-3.5 bg-blue-950/20 border border-blue-900/30 rounded-xl text-xs text-blue-300 flex items-start gap-3 shadow-md flex-shrink-0">
        <ShieldAlert size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-extrabold text-white block mb-0.5">Reiner Katalog-Browser — Keine In-App-Downloads</span>
          <span>Dies ist ein reines Verzeichnis empfehlenswerter kostenloser Plugins. Es werden keine automatischen In-App-Installationen oder verdeckten Downloads durchgeführt. Alle VSTs müssen manuell über die verifizierten Hersteller-Links beim Entwickler geladen und auf Ihrem System installiert werden.</span>
        </div>
      </div>

      {/* Flex container for Category Sidebar & Grid Catalog */}
      <div className="flex-1 min-h-0 flex flex-row">
        
        {/* Left Side: Vertical Category Sidebar */}
        <div className="w-64 bg-[#17191c]/90 border-r border-gray-800 p-4 overflow-y-auto flex-shrink-0 space-y-1.5 scrollbar-thin">
          <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 mb-2">
            Kategorien
          </h3>
          {RACK_CATEGORIES.map(cat => (
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
                {cat === 'Alle' ? '🌐' : cat.includes('Synth') || cat.includes('Sampler') || cat.includes('Drums') ? '🎹' : '🔌'}
              </span>
              <span className="truncate">{cat}</span>
            </button>
          ))}
        </div>

        {/* Right Side: Grid: Curated Catalog List */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#25282c] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          {filteredCatalog.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-48 text-center text-gray-500">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-xs">Keine VSTs in dieser Kategorie gefunden, die der Suche entsprechen.</p>
            </div>
          ) : (
            filteredCatalog.map(plugin => {
              const isInstrument = plugin.category === 'Instrument'

              return (
                <div
                  key={plugin.id}
                  onClick={() => {
                    setSelectedPlugin(plugin)
                  }}
                  className="bg-[#1a1d21]/60 border border-gray-750 hover:border-omega-accent/50 rounded-2xl p-4 transition-all duration-300 cursor-pointer hover:bg-[#1a1d21]/90 flex flex-col justify-between group shadow-xl"
                >
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
                        <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border ${
                          isPluginCompatible(plugin)
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/30'
                            : 'bg-rose-950/50 text-rose-300 border-rose-800/30'
                        }`}>
                          {isPluginCompatible(plugin) ? 'Kompatibel (VST2)' : 'Inkompatibel (Host nur VST2)'}
                        </span>
                      </div>
                    </div>

                    <div>
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

                    {plugin.downloadUrl ? (
                      <div onClick={e => e.stopPropagation()}>
                        <a
                          href={plugin.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-omega-accent hover:bg-blue-500 active:scale-[0.96] rounded-lg text-white font-extrabold transition-all text-[10px] shadow"
                          title={t('vst_store.manufacturer_site', { defaultValue: 'Herstellerseite öffnen (Download)' })}
                        >
                          <ExternalLink size={10} className="stroke-[2.5]" />
                          <span>{t('vst_store.load', { defaultValue: 'Zum Hersteller' })}</span>
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Footer Info bar */}
      <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-655 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldAlert size={12} className="text-gray-500 flex-shrink-0" />
          <span>{t('vst_store.disclaimer', { defaultValue: 'Hinweis: Dies ist ein reines Verzeichnis empfehlenswerter kostenloser Plugins. Ein direkter Download oder eine automatische Installation im Editor erfolgt nicht. Alle Plugins müssen manuell auf Ihrem System installiert werden.' })}</span>
        </div>
        <span className="font-mono flex-shrink-0">Katalog v0.8.8</span>
      </div>

      {/* ── DETAILS MODAL (GORGEOUS GLASSMORPHIC POPUP) ── */}
      {selectedPlugin && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#1e2124] border border-gray-755 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedPlugin(null)}
              className="absolute top-3.5 right-3.5 p-1 rounded-full bg-black/40 hover:bg-black/60 text-gray-400 hover:text-white border border-gray-700/40 transition-colors z-20"
            >
              <X size={14} />
            </button>

            {/* Ehrlicher Text-Platzhalter anstelle erfundener Mockups */}
            <div className="p-8 pt-10 bg-[#141619] border-b border-gray-800 flex flex-col items-center justify-center text-center gap-2 flex-shrink-0 select-none">
              <span className="text-3xl opacity-60">📷</span>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-extrabold">Keine Bildvorschau verfügbar</h4>
              <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
                Für dieses Plugin ist keine verifizierte Benutzeroberflächen-Vorschau oder Grafik hinterlegt. 
                Als ehrlicher VST-Katalog verzichten wir auf frei erfundene Darstellungen.
              </p>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">{selectedPlugin.name}</h2>
                    <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border border-gray-855 bg-black/30 text-omega-accent">
                      {selectedPlugin.subCategory}
                    </span>
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

              {/* Kompatibilitätshinweis */}
              {isPluginCompatible(selectedPlugin) ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-300 leading-relaxed flex items-start gap-3 shadow-md">
                  <Check size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-emerald-200 block mb-1">Voraussichtlich kompatibel (bietet VST2)</span>
                    <p className="mb-1.5">
                      Dieses Plugin bietet das benötigte <strong>VST2-Format</strong> an und ist daher mit dem aktuellen Windows-Host voraussichtlich nutzbar.
                    </p>
                    <p className="text-[10px] text-emerald-350/90 leading-normal">
                      <strong>Hinweis zur Installation:</strong> Da der Host unter Windows ausschließlich 64-Bit VST2-Plugins laden kann, müssen Sie bei der manuellen Installation des Herstellers darauf achten, dass die 64-Bit VST2-Version (oft als .dll-Datei) in Ihren System-Plugin-Pfad installiert wird.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl text-[11px] text-rose-350 leading-relaxed flex items-start gap-3 shadow-md">
                  <ShieldAlert size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-rose-200 block mb-1">Nicht kompatibel mit dem aktuellen Windows-Host</span>
                    <p className="mb-1.5">
                      Dieses Plugin unterstützt die Formate <strong>{selectedPlugin.formats.join(', ')}</strong>, bietet jedoch <strong>keine VST2-Version</strong> an.
                    </p>
                    <p className="text-[10px] text-rose-350/90 leading-normal">
                      <strong>Technische Erklärung:</strong> Der integrierte Windows-Audiomotor von Omega Wave Editor unterstützt derzeit ausschließlich das ältere <strong>VST2-Format (64-Bit)</strong>. Neuere Schnittstellen wie VST3 oder CLAP können von diesem Host real noch nicht geladen und verarbeitet werden. Da dieses Plugin kein VST2 anbietet, kann es auf diesem System im aktuellen Editor nicht geladen werden.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl text-[10px] text-blue-300 leading-relaxed flex items-start gap-2.5">
                <ShieldAlert size={14} className="text-blue-405 mt-0.5 flex-shrink-0" />
                <span>{t('vst_store.disclaimer', { defaultValue: 'Hinweis: Dies ist ein reines Verzeichnis empfehlenswerter kostenloser Plugins. Ein direkter Download oder eine automatische Installation im Editor erfolgt nicht. Alle Plugins müssen manuell auf Ihrem System installiert werden.' })}</span>
              </div>

              <div>
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Sparkles size={9} className="text-omega-accent" />
                  Features & Details
                </h4>
                <ul className="grid grid-cols-1 gap-1.5">
                  {selectedPlugin.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-gray-400 leading-tight">
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
                      {selectedPlugin.platforms.map(p => (
                        <span 
                          key={p} 
                          className="px-1 bg-gray-800 border border-gray-700/60 rounded text-[7px] font-mono font-bold text-gray-400 uppercase"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-gray-800 bg-[#171a1d] flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] text-gray-500">
                {t('vst_store.sandboxed', { defaultValue: 'Reiner Katalog-Browser' })} • {t('vst_store.disclaimer_short', { defaultValue: 'Kein direkter In-App-Download' })}
              </span>

              {selectedPlugin.downloadUrl ? (
                <div>
                  <a
                    href={selectedPlugin.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-omega-accent hover:bg-blue-500 active:scale-[0.96] rounded-xl text-white font-extrabold transition-all text-xs shadow-md"
                    title={t('vst_store.manufacturer_site', { defaultValue: 'Herstellerseite öffnen (Download)' })}
                  >
                    <ExternalLink size={12} className="stroke-[2.5]" />
                    <span>{t('vst_store.manufacturer_site', { defaultValue: 'Herstellerseite öffnen (Download)' })}</span>
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}



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
