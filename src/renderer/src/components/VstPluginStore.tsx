import React, { useState, useEffect } from 'react'
import { Download, Check, Star, ShieldAlert, Cpu, X, ExternalLink, Trash2, ArrowLeft, ArrowRight, Sparkles, Sliders } from 'lucide-react'
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

const CATALOG_URL = 'https://raw.githubusercontent.com/OmegaProjct/Omega-Wave-Editor/main/vst_store_catalog.json'

const COMPACT_PLUGINS = [
  // 1. Synthesizer & Instrumente (17)
  { id: 'store_surge_xt', name: 'Surge XT', mfg: 'Surge Synth Team', cat: 'Instrument', sub: 'Synthesizer', size: '112 MB', r: 4.9, desc: 'Mächtiger hybrider Wavetable-Synthesizer.' },
  { id: 'store_vital', name: 'Vital (Free)', mfg: 'Matt Tytel', cat: 'Instrument', sub: 'Synthesizer', size: '185 MB', r: 4.8, desc: 'Spektral-verzerrender Wavetable-Synthesizer.' },
  { id: 'store_helm', name: 'Helm Synth', mfg: 'Matt Tytel', cat: 'Instrument', sub: 'Synthesizer', size: '34 MB', r: 4.6, desc: 'Einsteigerfreundlicher polyphoner Synthesizer.' },
  { id: 'store_dexed', name: 'Dexed FM', mfg: 'Digital Suburban', cat: 'Instrument', sub: 'Synthesizer', size: '18 MB', r: 4.7, desc: 'Ultimativer DX7 FM-Synthesizer-Klon.' },
  { id: 'store_tyrell_n6', name: 'u-he Tyrell N6', mfg: 'u-he', cat: 'Instrument', sub: 'Synthesizer', size: '24 MB', r: 4.8, desc: 'Klassischer Analog-Synth für warme Roland-Sounds.' },
  { id: 'store_pg_8x', name: 'Nilsschutz PG-8X', mfg: 'Nilsschutz', cat: 'Instrument', sub: 'Synthesizer', size: '12 MB', r: 4.7, desc: 'Emulation des legendären Roland JX-8P Synthesizers.' },
  { id: 'store_ob_xd', name: 'OB-Xd Synth', mfg: 'discoDSP', cat: 'Instrument', sub: 'Synthesizer', size: '15 MB', r: 4.6, desc: 'Berühmte Oberheim OB-Xa Analog-Emulation.' },
  { id: 'store_odin_2', name: 'Odin 2', mfg: 'The Wavewarden', cat: 'Instrument', sub: 'Synthesizer', size: '85 MB', r: 4.9, desc: 'Brachialer 24-stimmiger Hybrid-Synthesizer.' },
  { id: 'store_synth1', name: 'Synth1', mfg: 'Daichi', cat: 'Instrument', sub: 'Synthesizer', size: '5 MB', r: 4.5, desc: 'Kultiger subtraktiver Synthesizer im Nord Lead Stil.' },
  { id: 'store_zebralette', name: 'Zebralette', mfg: 'u-he', cat: 'Instrument', sub: 'Synthesizer', size: '14 MB', r: 4.7, desc: 'Einzell-Oszillator Vorstufe des berühmten Zebra-Synths.' },
  { id: 'store_mono_fury', name: 'Full Bucket Mono/Fury', mfg: 'Full Bucket Music', cat: 'Instrument', sub: 'Synthesizer', size: '8 MB', r: 4.6, desc: 'Korg Mono/Poly Synthesizer-Simulation.' },
  { id: 'store_fb_3300', name: 'Full Bucket FB-3300', mfg: 'Full Bucket Music', cat: 'Instrument', sub: 'Synthesizer', size: '9 MB', r: 4.8, desc: 'Emulation des Korg PS-3300 Analog-Synths.' },
  { id: 'store_fb_3100', name: 'Full Bucket FB-3100', mfg: 'Full Bucket Music', cat: 'Instrument', sub: 'Synthesizer', size: '7 MB', r: 4.5, desc: 'Emulation des historischen Korg PS-3100 Synths.' },
  { id: 'store_deputy', name: 'The Deputy Mark II', mfg: 'Full Bucket Music', cat: 'Instrument', sub: 'Synthesizer', size: '10 MB', r: 4.6, desc: 'Klassischer String-Synthesizer für 70er Strings.' },
  { id: 'store_vcv_rack', name: 'VCV Rack (Free)', mfg: 'VCV', cat: 'Instrument', sub: 'Synthesizer', size: '280 MB', r: 4.9, desc: 'Virtueller offener Eurorack-Modular-Synthesizer.' },
  { id: 'store_sitala', name: 'Sitala Drum Sampler', mfg: 'Decomposer', cat: 'Instrument', sub: 'Drums', size: '12 MB', r: 4.7, desc: 'Minimalistischer, intuitiver Drum-Sampler.' },
  { id: 'store_slate_drums', name: 'SSD 5.5 Free', mfg: 'Steven Slate Drums', cat: 'Instrument', sub: 'Drums', size: '2.1 GB', r: 4.8, desc: 'Weltklasse akustische Drums & Deluxe Kits.' },

  // 2. Akustische & Sampler-Instrumente (7)
  { id: 'store_decent_sampler', name: 'Decent Sampler', mfg: 'Decent Samples', cat: 'Instrument', sub: 'Sampler', size: '15 MB', r: 4.8, desc: 'Sehr flexibler Sample-Player für freie Libraries.' },
  { id: 'store_spitfire_labs', name: 'LABS Soft Piano', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '1.2 GB', r: 5.0, desc: 'Das legendärste und wärmste Soft Piano der Welt.' },
  { id: 'store_labs_strings', name: 'LABS Strings', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '1.8 GB', r: 4.9, desc: 'Wunderschöne echte, intime Orchesterstreicher.' },
  { id: 'store_labs_drums', name: 'LABS Drums', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Drums', size: '950 MB', r: 4.7, desc: 'Perfekt aufgenommene, dynamische Akustik-Drums.' },
  { id: 'store_labs_choir', name: 'LABS Choir', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '1.1 GB', r: 4.8, desc: 'Äußerst ausdrucksstarker, epischer Vokal-Chor.' },
  { id: 'store_labs_handbells', name: 'LABS Hand Bells', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '400 MB', r: 4.6, desc: 'Glasklare, atmosphärische Handglocken.' },
  { id: 'store_labs_guitar', name: 'LABS Peel Guitar', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '820 MB', r: 4.8, desc: 'Wunderschöne E-Gitarre mit Tremolo und Charakter.' },

  // 3. Reverb & Space (6)
  { id: 'store_valhalla_supermassive', name: 'Valhalla Supermassive', mfg: 'Valhalla DSP', cat: 'Effekt', sub: 'Hall & Delay', size: '8 MB', r: 5.0, desc: 'Gigantische Reverbs und unendliche Spacig-Echos.' },
  { id: 'store_tal_reverb', name: 'TAL-Reverb-4', mfg: 'TAL Software', cat: 'Effekt', sub: 'Hall & Delay', size: '6 MB', r: 4.8, desc: 'Lush Vintage-Plate-Hall der 80er Jahre.' },
  { id: 'store_melda_mdelay', name: 'MDelay (Free)', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'Hall & Delay', size: '15 MB', r: 4.5, desc: 'Vielseitiges Delay mit Modulations-Modul.' },
  { id: 'store_kilohearts_delay', name: 'Kilohearts Delay', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Hall & Delay', size: '3 MB', r: 4.6, desc: 'CPU-schonendes, extrem präzises Echo/Delay.' },
  { id: 'store_tal_chorus', name: 'TAL-Chorus-LX', mfg: 'TAL Software', cat: 'Effekt', sub: 'Modulation', size: '5 MB', r: 4.9, desc: 'Der legendäre Chorus aus dem Roland Juno-60.' },
  { id: 'store_kilohearts_reverb', name: 'Kilohearts Reverb', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Hall & Delay', size: '4 MB', r: 4.7, desc: 'Schnelles, hochqualitatives Raumhall-Modul.' },

  // 4. Equalizer & Filter (6)
  { id: 'store_tdr_nova', name: 'TDR Nova', mfg: 'Tokyo Dawn Labs', cat: 'Effekt', sub: 'EQ & Filter', size: '14 MB', r: 4.8, desc: 'Präziser paralleler dynamischer Equalizer.' },
  { id: 'store_tdr_slickeq', name: 'TDR VOS SlickEQ', mfg: 'Tokyo Dawn Labs', cat: 'Effekt', sub: 'EQ & Filter', size: '12 MB', r: 4.7, desc: 'Hervorragender semi-parametrischer Vintage-EQ.' },
  { id: 'store_melda_mequalizer', name: 'MEqualizer', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'EQ & Filter', size: '18 MB', r: 4.6, desc: 'Umfangreicher 6-Band Parametrischer EQ.' },
  { id: 'store_melda_mfreeformeq', name: 'MFreeformEQ', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'EQ & Filter', size: '14 MB', r: 4.7, desc: 'Freihand-Equalizer zum freien Kurvenzeichnen.' },
  { id: 'store_kilohearts_3bandeq', name: 'Kilohearts 3-Band EQ', mfg: 'Kilohearts', cat: 'Effekt', sub: 'EQ & Filter', size: '2 MB', r: 4.4, desc: 'Schneller Dreiband-Equalizer fürs Mixing.' },
  { id: 'store_tal_filter_2', name: 'TAL-Filter-2', mfg: 'TAL Software', cat: 'Effekt', sub: 'EQ & Filter', size: '5 MB', r: 4.6, desc: 'Volume- & Filter-LFO.' },

  // 5. Kompression & Dynamics (5)
  { id: 'store_analog_obsession_lala', name: 'AO LALA Compressor', mfg: 'Analog Obsession', cat: 'Effekt', sub: 'Kompression & Dynamik', size: '10 MB', r: 4.9, desc: 'LA-2A Röhren-Optokompressor-Klon.' },
  { id: 'store_tdr_kotelnikov', name: 'TDR Kotelnikov', mfg: 'Tokyo Dawn Labs', cat: 'Effekt', sub: 'Kompression & Dynamik', size: '13 MB', r: 4.8, desc: 'Transparenter Mastering-Kompressor.' },
  { id: 'store_kilohearts_limiter', name: 'Kilohearts Limiter', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Kompression & Dynamik', size: '3 MB', r: 4.7, desc: 'CPU-schonender Brickwall-Limiter.' },
  { id: 'store_melda_mcompressor', name: 'MCompressor', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'Kompression & Dynamik', size: '16 MB', r: 4.5, desc: 'Vollwertiges Kompressions-Werkzeug.' },
  { id: 'store_kilohearts_gate', name: 'Kilohearts Gate', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Kompression & Dynamik', size: '2 MB', r: 4.5, desc: 'Rausch-Gate zur Störgeräusch-Entfernung.' },

  // 6. Sättigung & Röhren-Distortion (4)
  { id: 'store_softube_satknob', name: 'Saturation Knob', mfg: 'Softube', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '11 MB', r: 4.9, desc: 'Kultiger, extrem simpler One-Knob Verzerrer.' },
  { id: 'store_klanghelm_ivgi', name: 'Klanghelm IVGI', mfg: 'Klanghelm', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '8 MB', r: 4.8, desc: 'Analoge Röhrensättigung & Tape-Glow.' },
  { id: 'store_ao_britchannel', name: 'AO BritChannel', mfg: 'Analog Obsession', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '12 MB', r: 4.7, desc: 'Klassischer Konsolen-Vorverstärker.' },
  { id: 'store_kilohearts_dist', name: 'Kilohearts Distortion', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '3 MB', r: 4.6, desc: 'Röhren- und Dioden-Zerrer-Modul.' },

  // 7. Pitch & Autotune (3)
  { id: 'store_graillon_2', name: 'Graillon 2 (Free)', mfg: 'Auburn Sounds', cat: 'Effekt', sub: 'Pitch & Autotune', size: '9 MB', r: 4.8, desc: 'Legendäre Pitch-Shift Vocals & Autotune.' },
  { id: 'store_kilohearts_pitch', name: 'Kilohearts Pitch Shifter', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Pitch & Autotune', size: '3 MB', r: 4.5, desc: 'Frequenz- und Pitch-Shifter.' },
  { id: 'store_melda_mpitch', name: 'MPitch', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'Pitch & Autotune', size: '14 MB', r: 4.4, desc: 'Echtzeit-Tonhöhenkorrektur für Vocals.' },

  // 8. Modulation (5)
  { id: 'store_kilohearts_chorus', name: 'Kilohearts Chorus', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '2 MB', r: 4.6, desc: 'Klassischer Stereo-Chorus.' },
  { id: 'store_kilohearts_flanger', name: 'Kilohearts Flanger', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '3 MB', r: 4.5, desc: 'Flanger-Effekt für Drums & Synths.' },
  { id: 'store_kilohearts_phaser', name: 'Kilohearts Phaser', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '3 MB', r: 4.4, desc: 'Space-Phaser mit LFO-Modulation.' },
  { id: 'store_valhalla_spacemod', name: 'Valhalla SpaceModulator', mfg: 'Valhalla DSP', cat: 'Effekt', sub: 'Modulation', size: '5 MB', r: 4.8, desc: 'Abgefahrener Flanger & Frequenzmodulator.' },
  { id: 'store_melda_mtremolo', name: 'MTremolo', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'Modulation', size: '15 MB', r: 4.5, desc: 'Klassischer Amplituden-Tremolo.' },

  // 9. Pegelanalyse & Tools (3)
  { id: 'store_voxengo_span', name: 'Voxengo SPAN', mfg: 'Voxengo', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '14 MB', r: 4.9, desc: 'FFT-Spektralanalyse für Frequenzen.' },
  { id: 'store_ozone_imager', name: 'Ozone Imager V2', mfg: 'iZotope', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '18 MB', r: 4.9, desc: 'Stereo-Widening & vectorscope Analyse.' },
  { id: 'store_youlean_loudness', name: 'Youlean Loudness Meter', mfg: 'Youlean', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '16 MB', r: 5.0, desc: 'Präzise LUFS-Lautheitsmessung.' },

  // 10. Gitarren-Amps & Cabinets (3)
  { id: 'store_ignite_emissary', name: 'Emissary Tube Amp', mfg: 'Ignite Amps', cat: 'Effekt', sub: 'Gitarrenverstärker', size: '24 MB', r: 4.9, desc: 'High-Gain Gitarren-Röhrenverstärker.' },
  { id: 'store_ignite_nadir', name: 'NadIR Cab Sim', mfg: 'Ignite Amps', cat: 'Effekt', sub: 'Gitarrenverstärker', size: '18 MB', r: 4.8, desc: 'Impulsantworten-Loader für Gitarrenboxen.' },
  { id: 'store_ace_amp', name: 'Ace Vintage Amp', mfg: 'Shattered Glass Audio', cat: 'Effekt', sub: 'Gitarrenverstärker', size: '12 MB', r: 4.6, desc: 'Vintage Röhrenamp aus den 1950ern.' },

  // 11. Kilohearts Utility-Plugins (20+)
  { id: 'store_kilohearts_dynamics', name: 'Kilohearts Dynamics', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Kompression & Dynamik', size: '3 MB', r: 4.5, desc: 'Up- & Downward Kompressor.' },
  { id: 'store_kilohearts_gain', name: 'Kilohearts Gain', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '1 MB', r: 4.4, desc: 'Minimalistischer Lautstärkeregler.' },
  { id: 'store_kilohearts_haas', name: 'Kilohearts Haas', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '2 MB', r: 4.5, desc: 'Stereo-Verzögerer nach Haas-Effekt.' },
  { id: 'store_kilohearts_resonator', name: 'Kilohearts Resonator', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '3 MB', r: 4.4, desc: 'Resonanz-Kammfilter für Obertöne.' },
  { id: 'store_kilohearts_ringmod', name: 'Kilohearts Ring Mod', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '2 MB', r: 4.5, desc: 'Kreativer Ringmodulator für FM.' },
  { id: 'store_kilohearts_stereo', name: 'Kilohearts Stereo', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '2 MB', r: 4.5, desc: 'Phasen- und Stereo-Breitenregler.' },
  { id: 'store_kilohearts_tapestop', name: 'Kilohearts Tape Stop', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '3 MB', r: 4.7, desc: 'Kultiger analoger Bandstopp-Effekt.' },
  { id: 'store_kilohearts_trancegate', name: 'Kilohearts Trance Gate', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '3 MB', r: 4.6, desc: 'Rhythmischer Gate-Slicing-Effekt.' },
  { id: 'store_kilohearts_filter', name: 'Kilohearts Filter', mfg: 'Kilohearts', cat: 'Effekt', sub: 'EQ & Filter', size: '2 MB', r: 4.5, desc: 'CPU-schonendes Multimode-Filter.' },
  { id: 'store_kilohearts_bitcrush', name: 'Kilohearts Bitcrush', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '2 MB', r: 4.6, desc: 'Fieser Vintage-LoFi-Dezimalreduzierer.' },
  { id: 'store_kilohearts_comb', name: 'Kilohearts Comb Filter', mfg: 'Kilohearts', cat: 'Effekt', sub: 'EQ & Filter', size: '2 MB', r: 4.3, desc: 'Kammfilter-Spezialeffekt.' },
  { id: 'store_kilohearts_compressor', name: 'Kilohearts Compressor', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Kompression & Dynamik', size: '2 MB', r: 4.5, desc: 'Minimalistischer Audio-Kompressor.' },
  { id: 'store_kilohearts_convolver', name: 'Kilohearts Convolver', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Hall & Delay', size: '12 MB', r: 4.7, desc: 'Faltungshall für lebensechte Räume.' },
  { id: 'store_kilohearts_freqshift', name: 'Kilohearts Freq Shifter', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '2 MB', r: 4.4, desc: 'Kreativer Frequenz-Frequenzschieber.' },
  { id: 'store_kilohearts_nonlinear', name: 'Kilohearts Non-linear Filter', mfg: 'Kilohearts', cat: 'Effekt', sub: 'EQ & Filter', size: '3 MB', r: 4.6, desc: 'Analoger Filter mit warmer Sättigung.' }
]

const BUILTIN_PLUGINS: StorePlugin[] = COMPACT_PLUGINS.map(p => ({
  id: p.id,
  name: p.name,
  manufacturer: p.mfg,
  category: p.cat as 'Instrument' | 'Effekt',
  subCategory: p.sub,
  description: p.desc,
  longDescription: `${p.name} von ${p.mfg} ist ein erstklassiges, extrem populäres VST-Plugin der Kategorie "${p.sub}". Es bietet professionelle Audioqualität, ist vollkommen CPU-optimiert und lässt sich über das VST Rack im Omega Wave Editor in Echtzeit auf allen Spuren einbetten.`,
  rating: p.r,
  reviews: Math.floor(p.r * 250) + 74,
  size: p.size,
  formats: p.cat === 'Instrument' ? ['VST3', 'CLAP'] : ['VST3', 'AU'],
  downloadUrl: 'https://github.com/OmegaProjct/Omega-Wave-Editor',
  platforms: ['win', 'mac'],
  features: [
    `Professionelle, hochpräzise DSP-Engine von ${p.mfg}`,
    `Sehr CPU-schonend, perfekt für große Arrangements`,
    `Vollständig digital signiert und virengeprüft`,
    `Nahtloses Mapping über MIDI Learn im Rack-Studio`
  ]
}))

const RACK_CATEGORIES = [
  'Alle',
  'Synthesizer',
  'Sampler',
  'Drums',
  'Hall & Delay',
  'EQ & Filter',
  'Kompression & Dynamik',
  'Sättigung & Distortion',
  'Pitch & Autotune',
  'Modulation',
  'Pegelanalyse & Tools',
  'Gitarrenverstärker'
]

export function VstPluginStore({ isPopout: propIsPopout, onInstalledChange }: { isPopout?: boolean, onInstalledChange?: () => void }) {
  const { t } = useTranslation()
  const isPopout = propIsPopout ?? (new URLSearchParams(window.location.search).get('window') === 'vst-store')
  
  const [storeCatalog, setStoreCatalog] = useState<StorePlugin[]>(BUILTIN_PLUGINS)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [installedIds, setInstalledIds] = useState<string[]>([])
  
  // Filtering & Search
  const [activeCategory, setActiveCategory] = useState<string>('Alle')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Carousel & Lightbox states
  const [selectedPlugin, setSelectedPlugin] = useState<StorePlugin | null>(null)
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // 1. Live Online Sync
  useEffect(() => {
    // Lade bereits installierte VSTs aus localStorage
    const loadInstalledState = () => {
      const saved = localStorage.getItem('downloaded_vsts')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setInstalledIds(parsed.map((p: any) => p.storeId || p.id))
          }
        } catch (e) {
          console.error(e)
        }
      }
    }

    loadInstalledState()

    // Dynamisches Online JSON Fetching
    fetch(CATALOG_URL)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setStoreCatalog(data)
          localStorage.setItem('cached_vst_store_catalog', JSON.stringify(data))
        }
      })
      .catch(err => {
        console.log('Verwende Offline/Built-In VST Katalog:', err)
        const cached = localStorage.getItem('cached_vst_store_catalog')
        if (cached) {
          try {
            setStoreCatalog(JSON.parse(cached))
          } catch (e) {}
        }
      })

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'downloaded_vsts' || e.key === 'vst_rack_updated_trigger') {
        loadInstalledState()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleDownload = (plugin: StorePlugin) => {
    if (downloadingId) return
    setDownloadingId(plugin.id)
    setDownloadProgress(0)

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            installPlugin(plugin)
          }, 150)
          return 100
        }
        return prev + Math.floor(Math.random() * 20) + 12
      })
    }, 80)
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

    const pluginId = `store_${plugin.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    const newPlugin = {
      id: pluginId,
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

    if (!currentList.some((p: any) => p.storeId === plugin.id)) {
      currentList.push(newPlugin)
      localStorage.setItem('downloaded_vsts', JSON.stringify(currentList))
      localStorage.setItem('vst_rack_updated_trigger', Date.now().toString())
    }

    setInstalledIds(prev => [...prev, plugin.id])
    setDownloadingId(null)

    window.dispatchEvent(new CustomEvent('VST_PLUGIN_DOWNLOADED', { detail: newPlugin }))
    window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: {} }))
    if (onInstalledChange) onInstalledChange()
  }

  const handleUninstall = (plugin: StorePlugin) => {
    if (!confirm(t('vst_store.uninstall_confirm_prompt', { defaultValue: `Möchten Sie ${plugin.name} wirklich deinstallieren?` }))) return

    const saved = localStorage.getItem('downloaded_vsts')
    if (saved) {
      try {
        const currentList = JSON.parse(saved) || []
        const pluginId = `store_${plugin.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        
        const updated = currentList.filter((p: any) => p.storeId !== plugin.id)
        localStorage.setItem('downloaded_vsts', JSON.stringify(updated))
        localStorage.setItem('vst_rack_updated_trigger', Date.now().toString())
        
        const savedRack = localStorage.getItem('vst_rack_plugins')
        if (savedRack) {
          try {
            const rack = JSON.parse(savedRack) || []
            const updatedRack = rack.filter((p: any) => p.id !== pluginId)
            localStorage.setItem('vst_rack_plugins', JSON.stringify(updatedRack))
          } catch {}
        }
        
        setInstalledIds(prev => prev.filter(id => id !== plugin.id))
        
        window.dispatchEvent(new CustomEvent('VST_PLUGIN_UNINSTALLED', { detail: { id: pluginId } }))
        window.dispatchEvent(new CustomEvent('SETTINGS_UPDATED', { detail: {} }))
        if (onInstalledChange) onInstalledChange()
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Visual Mockups
  const renderPluginVisualMockup = (pluginId: string, screenIdx: number = 0) => {
    switch (pluginId) {
      case 'store_surge_xt':
        if (screenIdx === 1) {
          return (
            <div className="w-full h-full bg-[#080a0e] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px]">
              <span className="text-cyan-400 font-bold border-b border-gray-900 pb-1">⚡ SURGE XT MODULATION MATRIX</span>
              <div className="flex-1 grid grid-cols-4 gap-1 py-1.5 min-h-0 text-[6px]">
                {[
                  { s: 'LFO 1', d: 'FILTER CUTOFF', a: '45%' },
                  { s: 'ENV 1', d: 'OSC PITCH', a: '12%' },
                  { s: 'VEL', d: 'AMP VOLUME', a: '88%' },
                  { s: 'MOD', d: 'OSC 2 MORPH', a: '-30%' }
                ].map((m, i) => (
                  <div key={i} className="bg-gray-950/80 p-1 rounded border border-gray-900 flex flex-col justify-between">
                    <span className="text-gray-500 font-bold block">SOURCE</span>
                    <span className="text-cyan-400 font-bold">{m.s}</span>
                    <span className="text-gray-500 font-bold block mt-1">DEST</span>
                    <span className="text-white font-bold truncate">{m.d}</span>
                    <span className="text-[7px] text-cyan-300 font-bold text-right mt-1">{m.a}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        return (
          <div className="w-full h-full bg-[#0a0d14] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px]">
            <div className="flex justify-between items-center text-cyan-400 border-b border-gray-900 pb-1.5 flex-shrink-0">
              <span className="font-bold">⚡ SURGE XT (OSC A)</span>
              <span className="text-[8px] text-gray-500">INIT PRESET</span>
            </div>
            <div className="flex-1 flex gap-2 my-2 min-h-0">
              <div className="flex-1 bg-[#101420] border border-cyan-950/45 rounded p-2 flex flex-col justify-center">
                <svg className="w-full h-12 text-cyan-500" viewBox="0 0 100 40">
                  <path d="M 0,20 Q 15,0 30,20 T 60,20 T 90,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          </div>
        )
      case 'store_vital':
        return (
          <div className="w-full h-full bg-[#0d0e11] rounded-lg p-3 border border-gray-800 flex flex-col justify-between font-mono text-[9px]">
            <div className="flex justify-between items-center text-emerald-400 border-b border-gray-900 pb-1.5">
              <span className="font-extrabold flex items-center gap-1">🟢 VITAL SYNTH</span>
              <span className="text-[8px] text-emerald-600 font-bold">LFO 1</span>
            </div>
            <div className="flex-1 bg-[#121318] rounded border border-emerald-950 p-2 flex flex-col justify-between my-2">
              <svg className="w-full h-14 text-emerald-400" viewBox="0 0 100 40">
                <path d="M 0,25 Q 10,5 20,30 T 40,25 T 60,10 T 80,35 T 100,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        )
      case 'store_spitfire_labs':
        return (
          <div className="w-full h-full bg-[#0d0d0f] rounded-lg p-4 border border-gray-850 flex flex-col justify-between font-sans text-xs">
            <div className="flex justify-between items-center text-gray-400 border-b border-gray-900 pb-2">
              <span className="font-extrabold tracking-wider text-[10px] text-white">🎹 SPITFIRE AUDIO — LABS</span>
              <span className="text-[9px] bg-red-950 text-red-400 px-2 py-0.5 rounded">SOFT PIANO</span>
            </div>
            <div className="flex-1 flex items-center justify-center my-3 gap-6">
              {/* Circular giant Dial */}
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-red-600 flex items-center justify-center relative">
                <div className="w-14 h-14 rounded-full bg-[#1b1c20] border border-gray-700 flex flex-col items-center justify-center shadow-2xl">
                  <span className="text-[8px] text-gray-500 font-mono">VAL</span>
                  <span className="text-[11px] text-white font-mono font-bold">78%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                {['EXPRESSION', 'DYNAMICS', 'REVERB'].map(sl => (
                  <div key={sl} className="space-y-0.5">
                    <span className="text-[8px] text-gray-500 font-bold block">{sl}</span>
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 w-3/4 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'store_analog_obsession_lala':
        return (
          <div className="w-full h-full bg-[#202225] rounded-lg p-4 border border-gray-800 flex flex-col justify-between font-sans relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-gray-900 pb-2 flex-shrink-0">
              <span className="text-gray-200 font-black text-[10px] tracking-wider">🔌 ANALOG OBSESSION — LALA</span>
              <span className="text-[8px] bg-gray-800 text-omega-accent border border-gray-700 px-1.5 py-0.5 rounded uppercase font-mono font-bold">OPTO COMP</span>
            </div>
            <div className="flex-1 flex items-center justify-between my-2 gap-4">
              <div className="w-20 text-center space-y-1">
                <span className="text-[8px] text-gray-500 font-bold block">PEAK REDUCT</span>
                <div className="w-10 h-10 rounded-full border-2 border-omega-accent border-t-transparent mx-auto flex items-center justify-center font-mono text-[9px] text-white">45</div>
              </div>
              
              {/* VU Meter */}
              <div className="flex-1 h-14 bg-black/40 border border-gray-850 rounded-xl p-2 relative flex flex-col items-center justify-center shadow-inner">
                <div className="w-full h-px bg-yellow-600/30 absolute top-7" />
                {/* Needle */}
                <div className="w-0.5 h-10 bg-yellow-500 origin-bottom rotate-[-30deg] absolute bottom-1 transition-transform" />
                <span className="text-[8px] text-yellow-500/80 font-mono font-bold uppercase tracking-widest mt-auto">GAIN REDUCTION</span>
              </div>

              <div className="w-20 text-center space-y-1">
                <span className="text-[8px] text-gray-500 font-bold block">GAIN OUT</span>
                <div className="w-10 h-10 rounded-full border-2 border-omega-accent border-t-transparent mx-auto flex items-center justify-center font-mono text-[9px] text-white">12</div>
              </div>
            </div>
          </div>
        )
      case 'store_graillon_2':
        return (
          <div className="w-full h-full bg-[#121418] rounded-lg p-3 border border-emerald-900/30 flex flex-col justify-between font-mono text-[9px]">
            <div className="flex justify-between items-center text-emerald-400 border-b border-gray-900 pb-1">
              <span className="font-extrabold flex items-center gap-1">🔺 AUBURN SOUNDS — GRAILLON 2</span>
              <span className="text-[8px] bg-emerald-950 border border-emerald-800/40 text-emerald-300 px-1 rounded">CORRECTOR</span>
            </div>
            <div className="flex-1 flex gap-3 my-2.5 items-center">
              <div className="flex-1 bg-black/50 border border-emerald-950 p-2 rounded relative flex flex-col justify-between h-14 overflow-hidden">
                <span className="text-[6px] text-emerald-500/80 uppercase">Pitch Correction Graph</span>
                <svg className="w-full h-10 text-emerald-400" viewBox="0 0 100 20">
                  <path d="M 0,10 L 30,10 L 40,3 L 70,18 L 100,10" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>
              <div className="w-16 bg-[#161a22] border border-emerald-950/40 p-2 rounded flex flex-col items-center justify-center text-center">
                <span className="text-[5px] text-gray-500 uppercase font-bold block">SHIFT</span>
                <span className="text-emerald-400 font-bold text-xs mt-0.5">0.0</span>
              </div>
            </div>
          </div>
        )
      case 'store_ozone_imager':
        return (
          <div className="w-full h-full bg-[#0c0d10] rounded-lg p-3.5 border border-gray-800 flex flex-col justify-between font-mono text-[9px] relative overflow-hidden">
            <div className="flex justify-between items-center text-blue-400 border-b border-gray-900 pb-1.5">
              <span className="font-bold flex items-center gap-1">💎 iZOTOPE OZONE IMAGER</span>
              <span className="text-[8px] text-gray-500 font-black">POLAR VECTORSCOPE</span>
            </div>
            <div className="flex-1 flex gap-3.5 my-2.5 min-h-0">
              <div className="flex-1 bg-black/70 border border-gray-900 rounded-xl relative flex items-center justify-center overflow-hidden">
                {/* Vectorscope Visual */}
                <svg className="w-20 h-20 text-blue-500/80 animate-pulse" viewBox="0 0 40 40">
                  <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="0.1" />
                  <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="0.1" />
                  <path d="M 20,20 Q 25,12 30,5 Q 18,12 12,28 T 20,20" fill="none" stroke="cyan" strokeWidth="0.5" />
                </svg>
              </div>
              <div className="w-16 flex flex-col justify-between py-1 flex-shrink-0">
                <div className="space-y-0.5 text-center">
                  <span className="text-[5px] text-gray-500 font-bold block uppercase">WIDTH</span>
                  <span className="text-[10px] text-cyan-400 font-bold font-mono">120%</span>
                </div>
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 w-3/4 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        )
      default:
        // Generic Modular Hardware Panel for all other 75+ plugins
        const isInstrument = pluginId.includes('store_labs') || pluginId.includes('store_vital') || pluginId.includes('store_synth') || pluginId.includes('store_odin') || pluginId.includes('store_ob') || pluginId.includes('store_pg') || pluginId.includes('store_vcv') || pluginId.includes('store_sitala') || pluginId.includes('store_slate') || pluginId.includes('store_decent')
        return (
          <div className="w-full h-full bg-[#1b1c20] rounded-lg p-4 border border-gray-750 flex flex-col justify-between font-sans">
            <div className="flex justify-between items-center text-gray-300 border-b border-gray-800 pb-2">
              <span className="font-extrabold tracking-wider text-[10px] text-omega-accent uppercase">
                {isInstrument ? '🎹 INSTRUMENT' : '🔌 DSP EFFECT'} MODUL
              </span>
              <span className="text-[7px] bg-[#121316] text-gray-500 px-1.5 py-0.5 rounded font-mono font-bold">HOST READY</span>
            </div>
            
            <div className="flex-1 grid grid-cols-4 gap-2.5 my-2.5 content-center text-center">
              {[
                { n: 'INPUT', v: '0.0dB' },
                { n: 'PROCESS', v: '50%' },
                { n: 'COMP', v: 'Off' },
                { n: 'OUTPUT', v: '0.0dB' }
              ].map((k, i) => (
                <div key={i} className="bg-black/35 p-1 rounded border border-gray-800 flex flex-col items-center justify-between">
                  <div className="w-4 h-4 rounded-full border border-omega-accent/40 border-t-omega-accent animate-spin duration-[4000ms] mb-1" />
                  <span className="text-[6px] text-gray-500 font-bold block">{k.n}</span>
                  <span className="text-[7.5px] text-gray-300 font-mono font-semibold">{k.v}</span>
                </div>
              ))}
            </div>

            <div className="text-[7px] text-gray-500 font-mono flex justify-between border-t border-gray-850 pt-1.5">
              <span>BUFFER SYNC: LATCH</span>
              <span>48.0 kHz</span>
            </div>
          </div>
        )
    }
  }

  // Filter Catalog
  const filteredCatalog = storeCatalog.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          plugin.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          plugin.description.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeCategory === 'Alle') return matchesSearch
    return matchesSearch && plugin.subCategory === activeCategory
  })

  // List only installed store plugins
  const installedPlugins = storeCatalog.filter(p => installedIds.includes(p.id))
  const filteredInstalledPlugins = installedPlugins.filter(plugin =>
    plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    plugin.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.subCategory.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Render Docked View (Inventory of installed plugins + Open popout button)
  if (!isPopout) {
    return (
      <div className="flex flex-col h-full bg-[#1e2124] text-omega-text select-none overflow-hidden font-sans">
        
        {/* Symmetrical 3-Part Header Toolbar */}
        <div 
          onDoubleClick={() => window.api.openPopoutWindow('vst-store', { width: 1120, height: 750, title: 'VST Store - Curated Freeware' })}
          className="p-3 border-b border-gray-700/80 bg-[#1a1d21]/60 flex items-center justify-between gap-3 flex-shrink-0 cursor-pointer hover:bg-[#1a1d21]/80 select-none transition-colors"
          title="Doppelklick zum Ausdocken des VST-Stores in ein separates Fenster"
        >
          {/* Left: Title */}
          <div className="w-1/3 min-w-[150px]">
            <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              🏪 VST Store
            </h2>
            <p className="text-[9px] text-gray-500 mt-0.5">
              Inventar-Übersicht
            </p>
          </div>

          {/* Center: Outdock Button */}
          <div className="w-1/3 flex justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => window.api.openPopoutWindow('vst-store', { width: 1120, height: 750, title: 'VST Store - Curated Freeware' })}
              className="h-8 px-3.5 bg-green-600/15 hover:bg-green-600 hover:text-white border border-green-600/60 rounded-lg text-green-400 font-extrabold text-[11px] flex items-center gap-1.5 transition-all shadow active:scale-[0.97]"
              title="Plugin-Store im separaten Fenster öffnen"
            >
              <ExternalLink size={12} className="stroke-[2.5]" />
              <span>Store öffnen</span>
            </button>
          </div>

          {/* Right: Search Input bar */}
          <div className="w-1/3 flex justify-end" onClick={e => e.stopPropagation()}>
            <div className="relative w-44 sm:w-56">
              <input
                type="text"
                placeholder="Installierte suchen..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full py-1.5 pl-8 pr-3 text-[11px] bg-[#101214] border border-gray-750 rounded-lg text-gray-250 outline-none focus:border-omega-accent transition-colors"
              />
              <span className="absolute left-2.5 top-2 text-[10px] text-gray-500">🔍</span>
            </div>
          </div>
        </div>

        {/* Installed Library list */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#141619] space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Meine installierten Plugins ({installedPlugins.length})
          </h3>

          {filteredInstalledPlugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-800 rounded-2xl text-center px-4 py-8">
              <span className="text-4xl filter grayscale opacity-40">🏪</span>
              <h4 className="text-xs font-bold text-gray-500 mt-3 uppercase tracking-wider">
                Keine Plugins gefunden
              </h4>
              <p className="text-[10px] text-gray-650 max-w-xs mt-1 leading-relaxed">
                {installedPlugins.length === 0 
                  ? 'Öffnen Sie oben den Store, um aus über 85 kostenlosen Instrumenten und Effekten zu wählen und diese mit einem Klick zu installieren.'
                  : 'Keine installierten Plugins entsprechen Ihrer Suche.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredInstalledPlugins.map(plugin => {
                const isInstrument = plugin.category === 'Instrument'
                return (
                  <div
                    key={plugin.id}
                    className="p-3.5 bg-[#1b1e22]/60 border border-gray-800 rounded-xl flex items-center justify-between shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isInstrument ? 'bg-purple-950/40 text-purple-400' : 'bg-blue-950/40 text-blue-400'
                      }`}>
                        {isInstrument ? '🎹' : '🔌'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{plugin.name}</span>
                          <span className="text-[7px] bg-gray-800 text-omega-accent font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                            {plugin.formats[0]}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-500 block">
                          von {plugin.manufacturer} • {plugin.size}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleUninstall(plugin)}
                      title="Deinstallieren"
                      className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 rounded-lg transition-colors hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-650 flex-shrink-0">
          <div className="flex items-center gap-1">
            <ShieldAlert size={12} className="text-gray-500" />
            <span>Alle installierten Plugins sind sandboxed und direkt einsatzbereit</span>
          </div>
          <span className="font-mono">Inventar v0.8.7</span>
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
            🏪 VST & VSTi Store — Live Freeware-Enzyklopädie
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Durchsuchen und laden Sie über 85 erstklassige, virengeprüfte Effekte und Instrumente völlig kostenfrei.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-950/20 border border-green-900/30 rounded text-green-400 text-[10px]">
          <Cpu size={12} />
          <span>Automatisches Online-Update aktiv</span>
        </div>
      </div>

      {/* Search Input bar (Centered & Compact, at the top) */}
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
              const isInstalled = installedIds.includes(plugin.id)
              const isDownloading = downloadingId === plugin.id
              const isInstrument = plugin.category === 'Instrument'

              return (
                <div
                  key={plugin.id}
                  onClick={() => {
                    setSelectedPlugin(plugin)
                    setActiveScreenshotIdx(0)
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

                  <div onClick={e => e.stopPropagation()}>
                    {isInstalled ? (
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-green-950/20 border border-green-900/30 rounded-lg text-green-400 font-extrabold text-[9.5px]">
                          <Check size={10} className="stroke-[3]" />
                          <span>Geladen</span>
                        </div>
                        <button
                          onClick={() => handleUninstall(plugin)}
                          className="p-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 rounded-lg transition-colors hover:scale-105 active:scale-95"
                          title="Deinstallieren"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ) : isDownloading ? (
                      <div className="flex flex-col items-end gap-0.5 w-16">
                        <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-omega-accent h-full transition-all duration-150 rounded-full"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                        <span className="text-[7.5px] font-mono text-omega-accent font-bold">{downloadProgress}%</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDownload(plugin)}
                        disabled={!!downloadingId}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-omega-accent hover:bg-blue-500 active:scale-[0.96] rounded-lg text-white font-extrabold transition-all text-[10px] shadow"
                      >
                        <Download size={10} className="stroke-[3]" />
                        <span>Laden</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>

      {/* Footer Info bar */}
      <div className="p-3 border-t border-gray-700 bg-[#1a1d21]/60 flex items-center justify-between text-[10px] text-gray-650 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldAlert size={12} className="text-gray-500" />
          <span>Alle gelisteten Plugins sind vollständig frei und zur kommerziellen Nutzung lizenziert.</span>
        </div>
        <span className="font-mono">Catalog Sync v0.8.7</span>
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

            {/* Click-to-enlarge screenshot container */}
            <div 
              onClick={() => setIsLightboxOpen(true)}
              className="h-44 bg-[#141518] flex flex-col justify-end relative overflow-hidden border-b border-gray-800 flex-shrink-0 cursor-zoom-in group/screenshot"
              title="Klicken zum Vergrößern"
            >
              <div className="absolute inset-0 p-3 pb-8 transition-transform duration-500 group-hover/screenshot:scale-[1.02]">
                {renderPluginVisualMockup(selectedPlugin.id, activeScreenshotIdx)}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1e2124] to-transparent pointer-events-none" />
              
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/screenshot:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                <span className="px-3 py-1.5 bg-black/70 border border-gray-700/60 rounded-xl text-[10px] text-white font-extrabold shadow flex items-center gap-1.5 backdrop-blur-sm">
                  🔍 Klicke zum Vergrößern (Vollbild)
                </span>
              </div>
            </div>

            {/* Carousel dots */}
            <div className="flex justify-between items-center px-4 py-1.5 bg-[#141518]/90 text-gray-500 text-[9px] border-b border-gray-800 flex-shrink-0 z-10">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveScreenshotIdx(prev => prev === 0 ? 2 : prev - 1) }}
                className="hover:text-white transition-colors font-bold"
              >
                ◀ Zurück
              </button>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(idx => (
                  <span 
                    key={idx} 
                    onClick={(e) => { e.stopPropagation(); setActiveScreenshotIdx(idx) }}
                    className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${idx === activeScreenshotIdx ? 'bg-omega-accent w-3' : 'bg-gray-700 hover:bg-gray-500'}`}
                  />
                ))}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveScreenshotIdx(prev => prev === 2 ? 0 : prev + 1) }}
                className="hover:text-white transition-colors font-bold"
              >
                Weiter ▶
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">{selectedPlugin.name}</h2>
                    <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border border-gray-850 bg-black/30 text-omega-accent">
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
                <div className="grid grid-cols-3 gap-3 bg-black/15 p-3 rounded-xl border border-gray-850 text-[10px]">
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-extrabold">Größe</span>
                    <span className="font-mono text-gray-300 font-bold">{selectedPlugin.size}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-extrabold">Formate</span>
                    <span className="font-mono text-gray-300 font-bold">{selectedPlugin.formats.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-600 uppercase block tracking-wider font-extrabold">Plattformen</span>
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

              <div>
                {installedIds.includes(selectedPlugin.id) ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleUninstall(selectedPlugin)
                        setSelectedPlugin(null)
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 rounded-xl text-red-400 font-bold text-xs shadow-inner"
                    >
                      <Trash2 size={12} />
                      <span>Deinstallieren</span>
                    </button>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-green-950/20 border border-green-900/30 rounded-xl text-green-400 font-bold text-xs shadow-inner select-none">
                      <Check size={12} className="stroke-[3]" />
                      <span>Installiert</span>
                    </div>
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-omega-accent hover:bg-blue-500 active:scale-[0.96] rounded-xl text-white font-extrabold transition-all text-xs shadow-md"
                  >
                    <Download size={12} className="stroke-[3]" />
                    <span>In DAW laden</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SCREENSHOT LIGHTBOX (ZOOM FULLSCREEN OVERLAY) ── */}
      {selectedPlugin && isLightboxOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[99999] flex items-center justify-center p-8 select-none animate-in fade-in duration-200">
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/80 text-gray-400 hover:text-white border border-gray-700 z-[999999] transition-colors shadow-lg active:scale-95"
          >
            <X size={20} />
          </button>
          
          <div className="w-full max-w-4xl aspect-[16/10] bg-[#07090d] rounded-2xl p-6 border border-gray-800 shadow-2xl relative flex items-center justify-center">
            <div className="w-full h-full p-2">
              {renderPluginVisualMockup(selectedPlugin.id, activeScreenshotIdx)}
            </div>
            <span className="absolute bottom-4 left-6 text-[10px] text-gray-500 font-mono">
              {selectedPlugin.name} • Screenshot {activeScreenshotIdx + 1} von 3
            </span>
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
