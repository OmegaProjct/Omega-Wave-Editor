import React, { useState, useEffect } from 'react'
import { Download, Check, Star, ShieldAlert, Cpu, X, ExternalLink, Music, Info, Sparkles, Sliders, HelpCircle } from 'lucide-react'

// Extended interface for curated store plugins
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
  features: string[]
}

const CURATED_PLUGINS: StorePlugin[] = [
  {
    id: 'store_surge_xt',
    name: 'Surge XT',
    manufacturer: 'Surge Synth Team',
    category: 'Instrument',
    description: 'Extrem mächtiger hybrider Wavetable-Synthesizer mit unendlichen Sounddesign-Optionen.',
    longDescription: 'Surge XT ist ein preisgekrönter, quelloffener Synthesizer mit vielen Synthesemodellen, Filtern, Effekten und einem flexiblen Modulationssystem. Ideal für elektronische Musik, kraftvolle Bässe, Cinematic Pads und komplexe Arpeggios.',
    rating: 4.9,
    reviews: 1420,
    size: '112 MB',
    formats: ['VST3', 'CLAP'],
    downloadUrl: 'https://surge-synthesizer.github.io/',
    platforms: ['win', 'mac', 'linux'],
    features: [
      '3 mächtige Oszillator-Blöcke pro Szene',
      'Dual-Synthesizer-Architektur (Szene A & B)',
      '12 vielseitige Oszillator-Algorithmen (FM, Wavetable, String etc.)',
      'Umfangreiches Modulationsnetzwerk (LFOs, Hüllkurven, Formeln)',
      'Über 50 integrierte, hochwertige Effekte'
    ]
  },
  {
    id: 'store_vital',
    name: 'Vital (Free)',
    manufacturer: 'Matt Tytel',
    category: 'Instrument',
    description: 'Spektral-verzerrender Wavetable-Synthesizer mit atemberaubender Echtzeit-Visualisierung.',
    longDescription: 'Vital ist ein moderner Wavetable-Synthesizer mit erstklassigem, kristallklarem Sound und einer hochauflösenden 60 FPS Benutzeroberfläche. Die visuelle Modulation zeigt dir exakt in Echtzeit, was mit deiner Wellenform passiert.',
    rating: 4.8,
    reviews: 2180,
    size: '185 MB',
    formats: ['VST3', 'AU'],
    downloadUrl: 'https://vital.audio/',
    platforms: ['win', 'mac', 'linux'],
    features: [
      'Hochauflösende spektrale Wavetable-Synthese',
      '3 vollvisuelle Wavetable-Oszillatoren',
      'Extrem flexible LFO-Zeichnung und Modulations-Routing',
      'Echtzeit-Wellenformverzerrung und spektrale Filterung',
      'Stereo-Effektkette mit intuitivem Drag-and-Drop'
    ]
  },
  {
    id: 'store_helm',
    name: 'Helm Synth',
    manufacturer: 'Matt Tytel',
    category: 'Instrument',
    description: 'Einsteigerfreundlicher, visuell ansprechender polyphoner Synthesizer.',
    longDescription: 'Helm ist ein freier, schlanker Synthesizer, der sich perfekt eignet, um die Grundlagen der subtraktiven Synthese zu lernen. Er glänzt mit einer absolut übersichtlichen, animierten Benutzeroberfläche und warmem Analogsound.',
    rating: 4.6,
    reviews: 840,
    size: '34 MB',
    formats: ['VST2', 'VST3', 'AU'],
    downloadUrl: 'https://tytel.org/helm/',
    platforms: ['win', 'mac', 'linux'],
    features: [
      'Klassischer subtraktiver Dual-Oszillator-Aufbau',
      'Bis zu 32-stimmige Polyphonie mit Unisono-Breite',
      'Grafischer Filter-Envelope und ADSR-Visualisierung',
      'Eingebauter Step-Sequenzer, Arpeggiator und Stutter-Effekt',
      'Komplett freie Open-Source-Lizenz'
    ]
  },
  {
    id: 'store_dexed',
    name: 'Dexed FM',
    manufacturer: 'Digital Suburban',
    category: 'Instrument',
    description: 'Der ultimative Klon des legendären Yamaha DX7 FM-Synthesizers.',
    longDescription: 'Dexed ist ein Multi-Plattform, Multi-Format Plugin-Synthesizer, der originalgetreu die Synthese-Engine des ikonischen Yamaha DX7 simuliert. Perfekt für 80er-Jahre-E-Pianos, knackige Glocken-Sounds und schneidende FM-Bässe.',
    rating: 4.7,
    reviews: 620,
    size: '18 MB',
    formats: ['VST2', 'VST3', 'AU'],
    downloadUrl: 'https://asb2m10.github.io/dexed/',
    platforms: ['win', 'mac', 'linux'],
    features: [
      'Präzise Emulation der DX7 FM-Klangerzeugung',
      '6 FM-Operatoren mit individuellen Feedback-Algorithmen',
      'Vollständiger Support von originalen DX7-Sysex-Presets',
      'Echtzeit-Editor zur Fernsteuerung physischer DX7-Hardware',
      'Klassische Vintage-Digital-Aktivität'
    ]
  },
  {
    id: 'store_valhalla_supermassive',
    name: 'Valhalla Supermassive',
    manufacturer: 'Valhalla DSP',
    category: 'Effekt',
    description: 'Gigantische Reverbs, endlose Echos und spacige Klangwolken.',
    longDescription: 'Supermassive wurde von Grund auf für massive Delays, dichte Nachhallzeiten und psychedelische Klanglandschaften entwickelt. Es nutzt extrem komplexe Feedback-Verzögerungsnetzwerke für üppige Echo-Räume.',
    rating: 5.0,
    reviews: 3105,
    size: '8 MB',
    formats: ['VST3', 'AU'],
    downloadUrl: 'https://valhalladsp.com/shop/reverb/valhalla-supermassive/',
    platforms: ['win', 'mac'],
    features: [
      '18 einzigartige, astronomisch inspirierte Hall- und Delay-Modi',
      'Unendliche Feedback-Schleifen für massive Drohnen',
      'Phasen- und Dichte-Modulation für lebendigen, schwebenden Sound',
      'Analog-Style Low-Pass und High-Pass Filter integriert',
      'Weltweit gefeierter Standard für Ambient und Sounddesign'
    ]
  },
  {
    id: 'store_tdr_nova',
    name: 'TDR Nova',
    manufacturer: 'Tokyo Dawn Labs',
    category: 'Effekt',
    description: 'Präziser paralleler dynamischer Equalizer für anspruchsvolles Mixing.',
    longDescription: 'TDR Nova ist ein paralleler dynamischer EQ. Er kombiniert das präzise Handling eines klassischen parametrischen Equalizers mit der flexiblen Kraft von Mehrband-Kompression. Ideal für präzises Vocalkorrekturen, Schlagzeug-Busse und Mastering.',
    rating: 4.8,
    reviews: 980,
    size: '14 MB',
    formats: ['VST3', 'AU'],
    downloadUrl: 'https://www.tokyodawn.net/tdr-nova/',
    platforms: ['win', 'mac'],
    features: [
      '4 parametrische EQ-Bänder mit High- und Low-Cut-Filtern',
      'Volle Dynamikbearbeitung pro Band (Kompressor/Expander)',
      'Echtzeit-Frequenzspektrumanzeige mit extrem hoher Auflösung',
      'Parallele Equalizer-Architektur für höchste Phasentreue',
      'Intuitive Drag-und-Drop Bedienung auf der Filterkurve'
    ]
  },
  {
    id: 'store_kilohearts_essentials',
    name: 'Kilohearts Essentials',
    manufacturer: 'Kilohearts',
    category: 'Effekt',
    description: 'Ein mächtiges Bundle aus über 30 unverzichtbaren Mixing-Effekten.',
    longDescription: 'Kilohearts Essentials ist ein fantastisches Paket aus über 30 schlanken, extrem schnellen Audioeffekten (wie Chorus, Delay, Distortion, Dynamics, Flanger, Limiter, Reverb etc.). Sie verbrauchen fast keine CPU und klingen hervorragend.',
    rating: 4.9,
    reviews: 1890,
    size: '85 MB',
    formats: ['VST3', 'CLAP', 'AU'],
    downloadUrl: 'https://kilohearts.com/products/kilohearts_essentials',
    platforms: ['win', 'mac'],
    features: [
      'Bundle aus über 30 separat ladbaren Utility-Effekt-Plugins',
      'Umfasst Delay, Chorus, Reverb, Limiter, De-Esser, Distortion uvm.',
      'Extrem CPU-schonende und optimierte DSP-Algorithmen',
      'Minimalistische, übersichtliche Bedienoberfläche',
      'Perfekt als Ergänzung zum internen DAW-Mischer-Workflow'
    ]
  }
]

export function VstPluginStore({ onInstalledChange }: { onInstalledChange?: () => void }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [installedIds, setInstalledIds] = useState<string[]>([])
  const [selectedPlugin, setSelectedPlugin] = useState<StorePlugin | null>(null)

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

    // Simuliere einen flüssigen Ladevorgang (1.5s)
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
        return prev + Math.floor(Math.random() * 18) + 6
      })
    }, 120)
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

  // Renders a high-fidelity visual mockup panel for a VST UI inside the details modal
  const renderPluginVisualMockup = (pluginId: string) => {
    switch (pluginId) {
      case 'store_surge_xt':
        return (
          <div className="w-full h-full bg-[#0a0d14] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden">
            {/* Top row */}
            <div className="flex justify-between items-center text-cyan-400 border-b border-gray-900 pb-1.5 flex-shrink-0">
              <span className="font-bold flex items-center gap-1">⚡ SURGE XT <span className="text-[7px] bg-cyan-950 text-cyan-400 border border-cyan-850 px-1 rounded">OSC B</span></span>
              <span className="text-[8px] text-gray-500">Preset: INIT</span>
            </div>
            {/* Main content grid */}
            <div className="flex-1 flex gap-2 my-2 min-h-0">
              {/* Left: Wavetable Screen */}
              <div className="flex-1 bg-[#101420] border border-cyan-950/40 rounded p-1.5 flex flex-col justify-between relative overflow-hidden">
                <span className="text-gray-500 uppercase tracking-widest text-[7px] font-bold">Wavetable</span>
                {/* Visual Sine/Saw wave path */}
                <div className="flex-1 flex items-center justify-center py-2">
                  <svg className="w-full h-12 text-cyan-500" viewBox="0 0 100 40">
                    <path d="M 0,20 Q 15,0 30,20 T 60,20 T 90,20 L 100,20" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-pulse" />
                    <path d="M 0,20 Q 15,10 30,20 T 60,10 T 90,20" fill="none" stroke="cyan" strokeWidth="0.5" strokeDasharray="2,2" />
                  </svg>
                </div>
                <div className="flex justify-between text-[7px] text-cyan-600">
                  <span>SHAPE</span><span>MORPH</span><span>MORPH LFO</span>
                </div>
              </div>
              {/* Right: Knobs */}
              <div className="w-24 grid grid-cols-2 gap-1.5 content-center text-center">
                {[
                  { n: 'CUTOFF', v: '64%' },
                  { n: 'RESO', v: '22%' },
                  { n: 'FAT', v: '0dB' },
                  { n: 'OCT', v: '0' }
                ].map(k => (
                  <div key={k.n} className="bg-gray-950/60 p-1 rounded border border-gray-900 flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full border-2 border-cyan-600 border-t-transparent animate-spin duration-1000 rotate-45 mb-1" />
                    <span className="text-[6px] text-gray-500 font-bold block">{k.n}</span>
                    <span className="text-[8px] text-cyan-300 font-bold font-mono">{k.v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Bottom Row */}
            <div className="flex justify-between items-center text-[7px] text-gray-600 border-t border-gray-950 pt-1.5 flex-shrink-0">
              <div className="flex gap-2"><span>ENV 1</span><span>LFO 1</span><span>FM MATRIX</span></div>
              <span className="text-cyan-600">44.1 kHz</span>
            </div>
          </div>
        )
      case 'store_vital':
        return (
          <div className="w-full h-full bg-[#0d0e11] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden">
            {/* Oscilloscope background effect */}
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-emerald-500 rounded-full animate-ping" />
            </div>
            {/* Top row */}
            <div className="flex justify-between items-center text-emerald-400 border-b border-gray-900 pb-1.5 flex-shrink-0 relative z-10">
              <span className="font-extrabold flex items-center gap-1">🟢 VITAL <span className="text-[7px] bg-emerald-950 text-emerald-400 px-1 rounded uppercase tracking-widest font-black">Spectral</span></span>
              <span className="text-[8px] text-emerald-600 font-bold">LFO 1 ACTIVE</span>
            </div>
            {/* Main content grid */}
            <div className="flex-1 flex gap-2 my-2 min-h-0 relative z-10">
              {/* Left: Waveform morph */}
              <div className="flex-1 bg-[#121318]/90 border border-emerald-950 rounded p-1.5 flex flex-col justify-between">
                <span className="text-gray-500 uppercase tracking-widest text-[7px] font-bold">OSC 1 - Spectral Wave</span>
                {/* 3D looking wave graph */}
                <div className="flex-1 flex items-center justify-center py-1">
                  <svg className="w-full h-14 text-emerald-400" viewBox="0 0 100 40">
                    <path d="M 0,25 Q 10,5 20,30 T 40,25 T 60,10 T 80,35 T 100,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M 0,27 Q 10,7 20,32 T 40,27 T 60,12 T 80,37 T 100,22" fill="none" stroke="emerald" strokeWidth="0.5" className="opacity-30" />
                    <path d="M 0,29 Q 10,9 20,34 T 40,29 T 60,14 T 80,39 T 100,24" fill="none" stroke="emerald" strokeWidth="0.2" className="opacity-10" />
                  </svg>
                </div>
                <div className="flex justify-between text-[7px] text-emerald-600">
                  <span>MORPH</span><span>BEND</span><span>DRIVE</span>
                </div>
              </div>
              {/* Right: visual ADSR envelope */}
              <div className="w-20 bg-[#121318]/90 border border-emerald-950 rounded p-1.5 flex flex-col justify-between">
                <span className="text-gray-500 uppercase tracking-widest text-[7px] font-bold">Envelope</span>
                {/* ADSR visual line */}
                <div className="h-10 flex items-end">
                  <svg className="w-full h-8 text-emerald-500" viewBox="0 0 40 20">
                    <path d="M 0,20 L 8,3 L 18,8 L 32,8 L 40,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="8" cy="3" r="1.5" fill="emerald" />
                  </svg>
                </div>
                <div className="flex justify-between text-[6px] text-gray-500">
                  <span>A:12ms</span><span>R:250ms</span>
                </div>
              </div>
            </div>
            {/* Bottom Row */}
            <div className="flex justify-between items-center text-[7px] text-gray-600 border-t border-gray-950 pt-1.5 flex-shrink-0 relative z-10">
              <div className="flex gap-2"><span>OVERSAMPLING 2X</span><span>VOICES: 8</span></div>
              <span className="text-emerald-700">60 FPS GRID</span>
            </div>
          </div>
        )
      case 'store_helm':
        return (
          <div className="w-full h-full bg-[#111618] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden">
            {/* Top row */}
            <div className="flex justify-between items-center text-teal-400 border-b border-gray-900 pb-1.5 flex-shrink-0">
              <span className="font-bold flex items-center gap-1">🔺 HELM SYNTH <span className="text-[7px] bg-teal-950 text-teal-400 px-1 rounded">POLYPHONIC</span></span>
              <span className="text-[8px] text-gray-500">32 Voices</span>
            </div>
            {/* Main content grid */}
            <div className="flex-1 flex gap-2 my-2 min-h-0">
              {/* Left: Standard subtractive panel */}
              <div className="flex-1 bg-[#141b1e] border border-teal-950 rounded p-1.5 flex flex-col justify-between">
                <span className="text-gray-500 uppercase tracking-widest text-[7px] font-bold">OSC - Sawtooth</span>
                {/* Sharp Sawtooth visual */}
                <div className="flex-1 flex items-center justify-center py-2">
                  <svg className="w-full h-10 text-teal-500" viewBox="0 0 100 20">
                    <path d="M 0,15 L 20,5 L 20,15 L 40,5 L 40,15 L 60,5 L 60,15 L 80,5 L 80,15 L 100,5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="flex justify-between text-[7px] text-teal-600">
                  <span>DETUNE: 12%</span><span>SUB OCTAVE: -1</span>
                </div>
              </div>
              {/* Right: filter visual */}
              <div className="w-20 bg-[#141b1e] border border-teal-950 rounded p-1.5 flex flex-col justify-between">
                <span className="text-gray-500 uppercase tracking-widest text-[7px] font-bold">Filter</span>
                <div className="h-10 flex items-center justify-center">
                  <svg className="w-full h-8 text-teal-400 font-bold" viewBox="0 0 30 20">
                    <path d="M 0,3 L 15,3 Q 22,3 30,18" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <span className="text-[6px] text-center text-teal-600 uppercase tracking-widest">LOW-PASS 12dB</span>
              </div>
            </div>
            {/* Bottom Keyboard Representation */}
            <div className="h-3 flex border-t border-gray-900 pt-1 flex-shrink-0">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(k => (
                <div key={k} className="flex-1 bg-gray-300 border-r border-gray-950/40 relative">
                  {[1, 3, 6, 8, 10, 13].includes(k) && (
                    <div className="absolute w-[60%] h-[60%] bg-gray-950 left-[-30%] top-0 z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      case 'store_dexed':
        return (
          <div className="w-full h-full bg-[#1b1c1e] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden">
            {/* Top row */}
            <div className="flex justify-between items-center text-amber-500 border-b border-gray-800 pb-1.5 flex-shrink-0">
              <span className="font-bold flex items-center gap-1">🎹 DEXED FM <span className="text-[7px] bg-amber-950 text-amber-500 px-1 rounded">ALG 5</span></span>
              <span className="text-[8px] text-gray-500">Cartridge: 80s EP</span>
            </div>
            {/* Main content grid */}
            <div className="flex-1 flex gap-2 my-2 min-h-0">
              {/* Left: 6 Operators representation */}
              <div className="flex-1 grid grid-cols-3 gap-1 bg-[#202124] border border-gray-800 rounded p-1">
                {[1, 2, 3, 4, 5, 6].map(op => (
                  <div key={op} className="bg-gray-950 border border-gray-850 p-1 flex flex-col justify-between rounded text-[6px]">
                    <div className="flex justify-between text-gray-600 font-extrabold text-[5px]">
                      <span>OP {op}</span>
                      <span className="text-amber-500">1.00</span>
                    </div>
                    <div className="w-full bg-gray-900 h-1 rounded-full overflow-hidden my-0.5">
                      <div className={`h-full bg-amber-500`} style={{ width: op % 2 === 0 ? '70%' : '40%' }} />
                    </div>
                    <span className="text-gray-500 text-[5px] text-right font-mono">F: {op}.00</span>
                  </div>
                ))}
              </div>
              {/* Right: FM Algorithm diagram */}
              <div className="w-16 bg-[#202124] border border-gray-800 rounded p-1 flex flex-col justify-between items-center text-center">
                <span className="text-gray-600 uppercase tracking-widest text-[5px] font-bold">Algorithm</span>
                {/* Alg diagram representation */}
                <div className="w-8 h-10 flex flex-col items-center justify-center gap-0.5">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 bg-amber-900/40 border border-amber-600 rounded flex items-center justify-center text-[5px]">6</div>
                    <div className="w-2.5 h-2.5 bg-amber-900/40 border border-amber-600 rounded flex items-center justify-center text-[5px]">5</div>
                  </div>
                  <div className="w-[1px] h-1.5 bg-gray-600" />
                  <div className="w-2.5 h-2.5 bg-amber-900/40 border border-amber-600 rounded flex items-center justify-center text-[5px]">4</div>
                  <div className="w-[1px] h-1.5 bg-gray-600" />
                  <div className="w-4 h-2.5 bg-amber-600/80 border border-amber-400 rounded flex items-center justify-center text-[5px] text-white font-bold">OUT</div>
                </div>
                <span className="text-[6px] text-amber-500 font-bold">ALG 05</span>
              </div>
            </div>
            {/* Bottom Row */}
            <div className="flex justify-between items-center text-[6px] text-gray-600 border-t border-gray-900 pt-1.5 flex-shrink-0">
              <span>FEEDBACK: 7</span>
              <span className="text-amber-600">DX7 FULL SYSEX FORMAT</span>
            </div>
          </div>
        )
      case 'store_valhalla_supermassive':
        return (
          <div className="w-full h-full bg-[#050608] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden">
            {/* Constellation background animation */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg className="w-full h-full text-indigo-400" viewBox="0 0 100 100">
                <line x1="10" y1="20" x2="30" y2="40" stroke="currentColor" strokeWidth="0.5" />
                <line x1="30" y1="40" x2="60" y2="30" stroke="currentColor" strokeWidth="0.5" />
                <line x1="60" y1="30" x2="85" y2="70" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="10" cy="20" r="1.5" fill="indigo" className="animate-ping" />
                <circle cx="30" cy="40" r="1" fill="indigo" />
                <circle cx="60" cy="30" r="1.5" fill="indigo" />
                <circle cx="85" cy="70" r="2" fill="indigo" />
              </svg>
            </div>
            {/* Top row */}
            <div className="flex justify-between items-center text-indigo-400 border-b border-gray-900 pb-1.5 flex-shrink-0 relative z-10">
              <span className="font-extrabold flex items-center gap-1">🌌 VALHALLA SUPERMASSIVE <span className="text-[7px] bg-indigo-950 text-indigo-400 px-1 rounded uppercase tracking-wider font-bold">Hydra</span></span>
              <span className="text-[8px] text-gray-500">Mode: CENTAURUS</span>
            </div>
            {/* Main content grid */}
            <div className="flex-1 flex gap-2 my-2 min-h-0 relative z-10">
              {/* Left: Reverb parameters */}
              <div className="flex-1 bg-black/40 border border-indigo-950 rounded p-1.5 flex flex-col justify-between text-center">
                <span className="text-gray-500 uppercase tracking-widest text-[7px] font-bold">Space Coordinate</span>
                <div className="grid grid-cols-3 gap-1 my-1">
                  {[
                    { n: 'WARP', v: '78%' },
                    { n: 'DENSITY', v: '95%' },
                    { n: 'WIDTH', v: '120%' }
                  ].map(k => (
                    <div key={k.n} className="bg-indigo-950/20 border border-indigo-900/30 p-1 rounded flex flex-col items-center">
                      <span className="text-[5px] text-gray-500 font-bold block">{k.n}</span>
                      <span className="text-[7px] text-indigo-300 font-bold font-mono">{k.v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[6px] text-indigo-600">
                  <span>MOD RATE: 0.12Hz</span><span>DEPTH: 40%</span>
                </div>
              </div>
              {/* Right: space-time circular dial */}
              <div className="w-20 bg-black/40 border border-indigo-950 rounded p-1.5 flex flex-col justify-between items-center">
                <span className="text-gray-500 uppercase tracking-widest text-[7px] font-bold">Feedback</span>
                {/* Concentric rings */}
                <div className="relative w-10 h-10 flex items-center justify-center my-1">
                  <div className="absolute w-8 h-8 rounded-full border border-indigo-500/30 border-t-indigo-400 animate-spin duration-[4000ms]" />
                  <div className="absolute w-6 h-6 rounded-full border border-indigo-500/20 border-b-indigo-400 animate-spin duration-[2000ms] animate-reverse" />
                  <span className="text-[8px] text-indigo-300 font-bold font-mono">99%</span>
                </div>
                <span className="text-[6px] text-indigo-600 uppercase font-bold tracking-widest">DECAY</span>
              </div>
            </div>
            {/* Bottom Row */}
            <div className="flex justify-between items-center text-[7px] text-gray-600 border-t border-gray-900 pt-1.5 flex-shrink-0 relative z-10">
              <div className="flex gap-2"><span>HP FILTER: 20Hz</span><span>LP FILTER: 8.5kHz</span></div>
              <span className="text-indigo-800">COSMIC ECHO ENGINE</span>
            </div>
          </div>
        )
      case 'store_tdr_nova':
        return (
          <div className="w-full h-full bg-[#131416] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden">
            {/* Top row */}
            <div className="flex justify-between items-center text-blue-400 border-b border-gray-800 pb-1.5 flex-shrink-0">
              <span className="font-bold flex items-center gap-1">📊 TDR NOVA <span className="text-[7px] bg-blue-950 text-blue-400 px-1 rounded">DYNAMIC EQ</span></span>
              <span className="text-[8px] text-gray-500">Preset: Vocal De-ess</span>
            </div>
            {/* Main content grid */}
            <div className="flex-1 flex flex-col my-2 min-h-0">
              {/* Spectrum Display */}
              <div className="flex-1 bg-[#0a0b0d] border border-blue-950/40 rounded p-1.5 flex flex-col justify-between relative overflow-hidden">
                <span className="text-gray-600 uppercase tracking-widest text-[6px] font-bold">Spectrum Analyzer</span>
                {/* Active EQ curve */}
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <svg className="w-full h-full text-blue-900/30" viewBox="0 0 100 40">
                    {/* Grid lines */}
                    <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="0.2" />
                    <line x1="40" y1="0" x2="40" y2="40" stroke="currentColor" strokeWidth="0.2" />
                    <line x1="60" y1="0" x2="60" y2="40" stroke="currentColor" strokeWidth="0.2" />
                    <line x1="80" y1="0" x2="80" y2="40" stroke="currentColor" strokeWidth="0.2" />
                    <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeWidth="0.2" />
                  </svg>
                </div>
                {/* Active curve and nodes */}
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <svg className="w-full h-full text-blue-500" viewBox="0 0 100 40">
                    <path d="M 0,20 Q 15,20 25,12 T 45,28 T 75,5 T 100,20" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M 0,20 Q 15,20 25,12 T 45,28 T 75,5 T 100,20 L 100,40 L 0,40 Z" fill="rgba(59, 130, 246, 0.05)" />
                    {/* EQ Nodes */}
                    <circle cx="25" cy="12" r="2.5" fill="cyan" stroke="white" strokeWidth="0.5" className="animate-pulse" />
                    <circle cx="45" cy="28" r="2.5" fill="blue" stroke="white" strokeWidth="0.5" />
                    <circle cx="75" cy="5" r="2.5" fill="cyan" stroke="white" strokeWidth="0.5" />
                  </svg>
                </div>
                <div className="flex justify-between text-[6px] text-blue-700 mt-auto z-10">
                  <span>100Hz</span><span>500Hz</span><span>2kHz</span><span>10kHz</span>
                </div>
              </div>
            </div>
            {/* Bottom Row */}
            <div className="flex justify-between items-center text-[6px] text-gray-600 border-t border-gray-900 pt-1.5 flex-shrink-0">
              <div className="flex gap-2"><span>BAND 1 DYN: ON</span><span>THRESHOLD: -18dB</span></div>
              <span className="text-blue-700">PARALLEL DSP MODE</span>
            </div>
          </div>
        )
      case 'store_kilohearts_essentials':
        return (
          <div className="w-full h-full bg-[#111113] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden">
            {/* Top row */}
            <div className="flex justify-between items-center text-red-500 border-b border-gray-900 pb-1.5 flex-shrink-0">
              <span className="font-bold flex items-center gap-1">📦 KILOHEARTS ESSENTIALS <span className="text-[7px] bg-red-950 text-red-400 px-1 rounded">32 IN 1</span></span>
              <span className="text-[8px] text-gray-500">Rack Active</span>
            </div>
            {/* Main content grid */}
            <div className="flex-1 flex gap-2 my-2 min-h-0">
              {/* Mini-rack representation */}
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
                {[
                  { n: 'CHORUS', c: 'border-red-900/60', bg: 'bg-red-950/10', t: 'Delay: 12ms | Mix: 50%' },
                  { n: 'LIMITER', c: 'border-amber-900/60', bg: 'bg-amber-950/10', t: 'Thresh: -1.2dB | Out: 0dB' },
                  { n: 'REVERB', c: 'border-blue-900/60', bg: 'bg-blue-950/10', t: 'Decay: 1.8s | Mix: 15%' }
                ].map(mod => (
                  <div key={mod.n} className={`border ${mod.c} ${mod.bg} p-1.5 rounded flex justify-between items-center text-[7px]`}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-bold text-gray-300">{mod.n}</span>
                    </div>
                    <span className="text-gray-500 font-mono">{mod.t}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Bottom Row */}
            <div className="flex justify-between items-center text-[6px] text-gray-600 border-t border-gray-900 pt-1.5 flex-shrink-0">
              <span>SNAP-HEAP INTEGRATION READY</span>
              <span className="text-red-700">V3 DSP</span>
            </div>
          </div>
        )
      default:
        return (
          <div className="w-full h-full bg-[#1a1d21] rounded-lg border border-gray-800 flex items-center justify-center text-gray-600 text-xs">
            Keine Vorschau verfügbar
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden relative">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-700/80 bg-[#1a1d21]/60 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            🏪 VST & VSTi Store — Kuratierte Freeware
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

      {/* Grid: Changed from grid-cols-2 md-viewport hack to clean single-column list that respects small sidebars */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#25282c] flex flex-col gap-3.5">
        {CURATED_PLUGINS.map(plugin => {
          const isInstalled = installedIds.includes(plugin.id)
          const isDownloading = downloadingId === plugin.id

          return (
            <div
              key={plugin.id}
              onClick={() => setSelectedPlugin(plugin)}
              className="flex items-center justify-between bg-[#1a1d21]/60 border border-gray-700/50 hover:border-omega-accent/50 rounded-xl p-3.5 transition-all duration-300 cursor-pointer hover:bg-[#1a1d21]/90 group shadow-md"
            >
              {/* Left Section: Info & Badge */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Visual Thumbnail */}
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-lg select-none shadow-inner ${
                  plugin.category === 'Instrument'
                    ? 'bg-purple-950/40 text-purple-400 border border-purple-900/40'
                    : 'bg-blue-950/40 text-blue-400 border border-blue-900/40'
                }`}>
                  {plugin.category === 'Instrument' ? '🎹' : '🔌'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-white group-hover:text-omega-accent transition-colors">
                      {plugin.name}
                    </h3>
                    <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] ${
                      plugin.category === 'Instrument'
                        ? 'bg-purple-950/50 text-purple-300 border border-purple-800/30'
                        : 'bg-blue-950/50 text-blue-300 border border-blue-800/30'
                    }`}>
                      {plugin.category}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-medium block mt-0.5">
                    von {plugin.manufacturer}
                  </span>
                  {/* Rating & Size & Trigger details link */}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <Star size={9} fill="currentColor" />
                      <span className="font-bold font-mono text-[9px]">{plugin.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-gray-700 font-bold">•</span>
                    <span className="font-mono text-gray-500 text-[9px]">{plugin.size}</span>
                  </div>
                </div>
              </div>

              {/* Middle Section: Short Description */}
              <div className="hidden sm:block text-[11px] text-gray-400 px-4 max-w-[200px] truncate">
                {plugin.description}
              </div>

              {/* Right Section: Download Button / Progress */}
              <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {isInstalled ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-950/20 border border-green-900/30 rounded-lg text-green-400 font-extrabold text-[11px] shadow-sm select-none">
                    <Check size={11} className="stroke-[3]" />
                    <span>Installiert</span>
                  </div>
                ) : isDownloading ? (
                  <div className="flex flex-col items-end gap-1 w-20">
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-omega-accent h-full transition-all duration-150 rounded-full"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-mono text-omega-accent font-bold">{downloadProgress}%</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(plugin)}
                    disabled={!!downloadingId}
                    className="flex items-center gap-1 px-3 py-1.5 bg-omega-accent hover:bg-blue-500 active:scale-[0.96] rounded-lg text-white font-extrabold transition-all text-[11px] shadow-md disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Download size={11} className="stroke-[3]" />
                    <span>Laden</span>
                  </button>
                )}
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

      {/* ── DETAILS MODAL (GORGEOUS GLASSMORPHIC POPUP) ── */}
      {selectedPlugin && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#1e2124] border border-gray-750 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedPlugin(null)}
              className="absolute top-3.5 right-3.5 p-1 rounded-full bg-black/40 hover:bg-black/60 text-gray-400 hover:text-white border border-gray-700/40 transition-colors z-20"
            >
              <X size={14} />
            </button>

            {/* Simulated Live UI Screen / Visual Mockup Header (Top Half) */}
            <div className="h-44 bg-[#141518] p-4 flex flex-col justify-end relative overflow-hidden border-b border-gray-800 flex-shrink-0">
              {/* Simulated active background visualizer */}
              <div className="absolute inset-0 p-3 pb-8">
                {renderPluginVisualMockup(selectedPlugin.id)}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1e2124] to-transparent pointer-events-none" />
            </div>

            {/* Content Body (Bottom Half) */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              
              {/* Header Details Info */}
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">{selectedPlugin.name}</h2>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] ${
                      selectedPlugin.category === 'Instrument'
                        ? 'bg-purple-950/50 text-purple-300 border border-purple-800/30'
                        : 'bg-blue-950/50 text-blue-300 border border-blue-800/30'
                    }`}>
                      {selectedPlugin.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold font-mono mt-0.5">
                    von {selectedPlugin.manufacturer}
                  </p>
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-1 text-amber-500 font-bold font-mono text-xs bg-amber-950/15 border border-amber-900/20 px-2 py-0.5 rounded-lg">
                  <Star size={10} fill="currentColor" />
                  <span>{selectedPlugin.rating.toFixed(1)}</span>
                  <span className="text-[9px] text-gray-500 font-normal">({selectedPlugin.reviews})</span>
                </div>
              </div>

              {/* Long Description */}
              <p className="text-[11px] text-gray-300 leading-relaxed bg-[#171a1d] p-3 rounded-xl border border-gray-800/50">
                {selectedPlugin.longDescription}
              </p>

              {/* Core Features List */}
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

              {/* Technical Specifications Specs Grid */}
              <div className="mt-1 pt-3 border-t border-gray-800/80">
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Technische Spezifikationen</h4>
                <div className="grid grid-cols-3 gap-3 bg-black/15 p-3 rounded-xl border border-gray-850 text-[10px]">
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-extrabold">Plugin-Größe</span>
                    <span className="font-mono text-gray-300 font-bold">{selectedPlugin.size}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-extrabold">Formate</span>
                    <span className="font-mono text-gray-300 font-bold">{selectedPlugin.formats.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-extrabold">Kompatibilität</span>
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
              <a 
                href={selectedPlugin.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors"
              >
                <ExternalLink size={11} />
                <span>Herstellerseite öffnen</span>
              </a>

              {/* Install flow controls */}
              <div>
                {installedIds.includes(selectedPlugin.id) ? (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-green-950/20 border border-green-900/30 rounded-xl text-green-400 font-bold text-xs shadow-inner select-none">
                    <Check size={12} className="stroke-[3]" />
                    <span>In DAW VST-Rack geladen</span>
                  </div>
                ) : downloadingId === selectedPlugin.id ? (
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-omega-accent h-full transition-all duration-150 rounded-full"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-omega-accent font-bold">{downloadProgress}%</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(selectedPlugin)}
                    disabled={!!downloadingId}
                    className="flex items-center gap-1.5 px-4 py-2 bg-omega-accent hover:bg-blue-500 active:scale-[0.96] rounded-xl text-white font-extrabold transition-all text-xs shadow-md disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Download size={12} className="stroke-[3]" />
                    <span>Dieses Plugin herunterladen & aktivieren</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
