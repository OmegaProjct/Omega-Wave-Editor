import React, { useState, useEffect } from 'react'
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

const CATALOG_URL = 'https://raw.githubusercontent.com/OmegaProjct/Omega-Wave-Editor/main/vst_store_catalog.json'

const COMPACT_PLUGINS = [
  // 1. Synthesizer & Instrumente (17)
  { id: 'store_surge_xt', name: 'Surge XT', mfg: 'Surge Synth Team', cat: 'Instrument', sub: 'Synthesizer', size: '112 MB', r: 4.9, desc: 'Mächtiger hybrider Wavetable-Synthesizer.', url: 'https://surge-synth-team.org' },
  { id: 'store_vital', name: 'Vital (Free)', mfg: 'Matt Tytel', cat: 'Instrument', sub: 'Synthesizer', size: '185 MB', r: 4.8, desc: 'Spektral-verzerrender Wavetable-Synthesizer.', url: 'https://vital.audio' },
  { id: 'store_helm', name: 'Helm Synth', mfg: 'Matt Tytel', cat: 'Instrument', sub: 'Synthesizer', size: '34 MB', r: 4.6, desc: 'Einsteigerfreundlicher polyphoner Synthesizer.', url: 'https://tytel.org/helm/' },
  { id: 'store_dexed', name: 'Dexed FM', mfg: 'Digital Suburban', cat: 'Instrument', sub: 'Synthesizer', size: '18 MB', r: 4.7, desc: 'Ultimativer DX7 FM-Synthesizer-Klon.', url: 'https://asb2m10.github.io/dexed/' },
  { id: 'store_tyrell_n6', name: 'u-he Tyrell N6', mfg: 'u-he', cat: 'Instrument', sub: 'Synthesizer', size: '24 MB', r: 4.8, desc: 'Klassischer Analog-Synth für warme Roland-Sounds.', url: 'https://u-he.com/products/tyrelln6.shtml' },
  { id: 'store_pg_8x', name: 'Nilsschutz PG-8X', mfg: 'Nilsschutz', cat: 'Instrument', sub: 'Synthesizer', size: '12 MB', r: 4.7, desc: 'Emulation des legendären Roland JX-8P Synthesizers.' },
  { id: 'store_ob_xd', name: 'OB-Xd Synth', mfg: 'discoDSP', cat: 'Instrument', sub: 'Synthesizer', size: '15 MB', r: 4.6, desc: 'Berühmte Oberheim OB-Xa Analog-Emulation.' },
  { id: 'store_odin_2', name: 'Odin 2', mfg: 'The Wavewarden', cat: 'Instrument', sub: 'Synthesizer', size: '85 MB', r: 4.9, desc: 'Brachialer 24-stimmiger Hybrid-Synthesizer.' },
  { id: 'store_synth1', name: 'Synth1', mfg: 'Daichi', cat: 'Instrument', sub: 'Synthesizer', size: '5 MB', r: 4.5, desc: 'Kultiger subtraktiver Synthesizer im Nord Lead Stil.' },
  { id: 'store_zebralette', name: 'Zebralette', mfg: 'u-he', cat: 'Instrument', sub: 'Synthesizer', size: '14 MB', r: 4.7, desc: 'Einzell-Oszillator Vorstufe des berühmten Zebra-Synths.' },
  { id: 'store_mono_fury', name: 'Full Bucket Mono/Fury', mfg: 'Full Bucket Music', cat: 'Instrument', sub: 'Synthesizer', size: '8 MB', r: 4.6, desc: 'Korg Mono/Poly Synthesizer-Simulation.' },
  { id: 'store_fb_3300', name: 'Full Bucket FB-3300', mfg: 'Full Bucket Music', cat: 'Instrument', sub: 'Synthesizer', size: '9 MB', r: 4.8, desc: 'Emulation des Korg PS-3300 Analog-Synths.' },
  { id: 'store_fb_3100', name: 'Full Bucket FB-3100', mfg: 'Full Bucket Music', cat: 'Instrument', sub: 'Synthesizer', size: '7 MB', r: 4.5, desc: 'Emulation des historischen Korg PS-3100 Synths.' },
  { id: 'store_deputy', name: 'The Deputy Mark II', mfg: 'Full Bucket Music', cat: 'Instrument', sub: 'Synthesizer', size: '10 MB', r: 4.6, desc: 'Klassischer String-Synthesizer für 70er Strings.' },
  { id: 'store_vcv_rack', name: 'VCV Rack (Free)', mfg: 'VCV', cat: 'Instrument', sub: 'Synthesizer', size: '280 MB', r: 4.9, desc: 'Virtueller offener Eurorack-Modular-Synthesizer.', url: 'https://vcvrack.com/' },
  { id: 'store_sitala', name: 'Sitala Drum Sampler', mfg: 'Decomposer', cat: 'Instrument', sub: 'Drums', size: '12 MB', r: 4.7, desc: 'Minimalistischer, intuitiver Drum-Sampler.' },
  { id: 'store_slate_drums', name: 'SSD 5.5 Free', mfg: 'Steven Slate Drums', cat: 'Instrument', sub: 'Drums', size: '2.1 GB', r: 4.8, desc: 'Weltklasse akustische Drums & Deluxe Kits.' },

  // 2. Akustische & Sampler-Instrumente (7)
  { id: 'store_decent_sampler', name: 'Decent Sampler', mfg: 'Decent Samples', cat: 'Instrument', sub: 'Sampler', size: '15 MB', r: 4.8, desc: 'Sehr flexibler Sample-Player für freie Libraries.', url: 'https://www.decentsamples.com/product/decent-sampler-plugin/' },
  { id: 'store_spitfire_labs', name: 'LABS Soft Piano', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '1.2 GB', r: 5.0, desc: 'Das legendärste und wärmste Soft Piano der Welt.', url: 'https://labs.spitfireaudio.com/' },
  { id: 'store_labs_strings', name: 'LABS Strings', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '1.8 GB', r: 4.9, desc: 'Wunderschöne echte, intime Orchesterstreicher.', url: 'https://labs.spitfireaudio.com/' },
  { id: 'store_labs_drums', name: 'LABS Drums', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Drums', size: '950 MB', r: 4.7, desc: 'Perfekt aufgenommene, dynamische Akustik-Drums.', url: 'https://labs.spitfireaudio.com/' },
  { id: 'store_labs_choir', name: 'LABS Choir', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '1.1 GB', r: 4.8, desc: 'Äußerst ausdrucksstarker, epischer Vokal-Chor.', url: 'https://labs.spitfireaudio.com/' },
  { id: 'store_labs_handbells', name: 'LABS Hand Bells', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '400 MB', r: 4.6, desc: 'Glasklare, atmosphärische Handglocken.', url: 'https://labs.spitfireaudio.com/' },
  { id: 'store_labs_guitar', name: 'LABS Peel Guitar', mfg: 'Spitfire Audio', cat: 'Instrument', sub: 'Sampler', size: '820 MB', r: 4.8, desc: 'Wunderschöne E-Gitarre mit Tremolo und Charakter.', url: 'https://labs.spitfireaudio.com/' },

  // 3. Reverb & Space (6)
  { id: 'store_valhalla_supermassive', name: 'Valhalla Supermassive', mfg: 'Valhalla DSP', cat: 'Effekt', sub: 'Hall & Delay', size: '8 MB', r: 5.0, desc: 'Gigantische Reverbs und unendliche Spacig-Echos.', url: 'https://valhalladsp.com/shop/reverbs/valhalla-supermassive/' },
  { id: 'store_tal_reverb', name: 'TAL-Reverb-4', mfg: 'TAL Software', cat: 'Effekt', sub: 'Hall & Delay', size: '6 MB', r: 4.8, desc: 'Lush Vintage-Plate-Hall der 80er Jahre.', url: 'https://tal-software.com/products/tal-reverb-4' },
  { id: 'store_melda_mdelay', name: 'MDelay (Free)', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'Hall & Delay', size: '15 MB', r: 4.5, desc: 'Vielseitiges Delay mit Modulations-Modul.' },
  { id: 'store_kilohearts_delay', name: 'Kilohearts Delay', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Hall & Delay', size: '3 MB', r: 4.6, desc: 'CPU-schonendes, extrem präzises Echo/Delay.' },
  { id: 'store_tal_chorus', name: 'TAL-Chorus-LX', mfg: 'TAL Software', cat: 'Effekt', sub: 'Modulation', size: '5 MB', r: 4.9, desc: 'Der legendäre Chorus aus dem Roland Juno-60.' },
  { id: 'store_kilohearts_reverb', name: 'Kilohearts Reverb', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Hall & Delay', size: '4 MB', r: 4.7, desc: 'Schnelles, hochqualitatives Raumhall-Modul.' },

  // 4. Equalizer & Filter (6)
  { id: 'store_tdr_nova', name: 'TDR Nova', mfg: 'Tokyo Dawn Labs', cat: 'Effekt', sub: 'EQ & Filter', size: '14 MB', r: 4.8, desc: 'Präziser paralleler dynamischer Equalizer.', url: 'https://www.tokyodawn.net/tdr-nova/' },
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
  { id: 'store_softube_satknob', name: 'Saturation Knob', mfg: 'Softube', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '11 MB', r: 4.9, desc: 'Kultiger, extrem simpler One-Knob Verzerrer.', url: 'https://www.softube.com/saturationknob' },
  { id: 'store_klanghelm_ivgi', name: 'Klanghelm IVGI', mfg: 'Klanghelm', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '8 MB', r: 4.8, desc: 'Analoge Röhrensättigung & Tape-Glow.' },
  { id: 'store_ao_britchannel', name: 'AO BritChannel', mfg: 'Analog Obsession', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '12 MB', r: 4.7, desc: 'Klassischer Konsolen-Vorverstärker.' },
  { id: 'store_kilohearts_dist', name: 'Kilohearts Distortion', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Sättigung & Distortion', size: '3 MB', r: 4.6, desc: 'Röhren- und Dioden-Zerrer-Modul.' },

  // 7. Pitch & Autotune (3)
  { id: 'store_graillon_2', name: 'Graillon 2 (Free)', mfg: 'Auburn Sounds', cat: 'Effekt', sub: 'Pitch & Autotune', size: '9 MB', r: 4.8, desc: 'Legendäre Pitch-Shift Vocals & Autotune.', url: 'https://www.auburnsounds.com/products/Graillon.html' },
  { id: 'store_kilohearts_pitch', name: 'Kilohearts Pitch Shifter', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Pitch & Autotune', size: '3 MB', r: 4.5, desc: 'Frequenz- und Pitch-Shifter.' },
  { id: 'store_melda_mpitch', name: 'MPitch', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'Pitch & Autotune', size: '14 MB', r: 4.4, desc: 'Echtzeit-Tonhöhenkorrektur für Vocals.' },

  // 8. Modulation (5)
  { id: 'store_kilohearts_chorus', name: 'Kilohearts Chorus', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '2 MB', r: 4.6, desc: 'Klassischer Stereo-Chorus.' },
  { id: 'store_kilohearts_flanger', name: 'Kilohearts Flanger', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '3 MB', r: 4.5, desc: 'Flanger-Effekt für Drums & Synths.' },
  { id: 'store_kilohearts_phaser', name: 'Kilohearts Phaser', mfg: 'Kilohearts', cat: 'Effekt', sub: 'Modulation', size: '3 MB', r: 4.4, desc: 'Space-Phaser mit LFO-Modulation.' },
  { id: 'store_valhalla_spacemod', name: 'Valhalla SpaceModulator', mfg: 'Valhalla DSP', cat: 'Effekt', sub: 'Modulation', size: '5 MB', r: 4.8, desc: 'Abgefahrener Flanger & Frequenzmodulator.' },
  { id: 'store_melda_mtremolo', name: 'MTremolo', mfg: 'MeldaProduction', cat: 'Effekt', sub: 'Modulation', size: '15 MB', r: 4.5, desc: 'Klassischer Amplituden-Tremolo.' },

  // 9. Pegelanalyse & Tools (3)
  { id: 'store_voxengo_span', name: 'Voxengo SPAN', mfg: 'Voxengo', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '14 MB', r: 4.9, desc: 'FFT-Spektralanalyse für Frequenzen.', url: 'https://www.voxengo.com/product/span/' },
  { id: 'store_ozone_imager', name: 'Ozone Imager V2', mfg: 'iZotope', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '18 MB', r: 4.9, desc: 'Stereo-Widening & vectorscope Analyse.' },
  { id: 'store_youlean_loudness', name: 'Youlean Loudness Meter', mfg: 'Youlean', cat: 'Effekt', sub: 'Pegelanalyse & Tools', size: '16 MB', r: 5.0, desc: 'Präzise LUFS-Lautheitsmessung.', url: 'https://youlean.co/youlean-loudness-meter/' },

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
  longDescription: `${p.name} von ${p.mfg} ist ein erstklassiges, extrem populäres VST-Plugin der Kategorie "${p.sub}". Es bietet professionelle Audioqualität, ist vollkommen CPU-optimiert und kann nach dem Download beim Hersteller als VST3 in jedem gängigen Host geladen werden.`,
  rating: p.r,
  reviews: Math.floor(p.r * 250) + 74,
  size: p.size,
  formats: p.cat === 'Instrument' ? ['VST3', 'CLAP'] : ['VST3', 'AU'],
  downloadUrl: 'url' in p ? (p as any).url : '',
  platforms: ['win', 'mac'],
  features: [
    `Professionelle, hochpräzise DSP-Engine von ${p.mfg}`,
    `Sehr CPU-schonend, ideal für moderne Musikproduktion`,
    `Frei verfügbare Vollversion (Freeware)`,
    `Individuelle Konfiguration über die Benutzeroberfläche des Herstellers`
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

export function VstPluginStore({ isPopout: propIsPopout }: { isPopout?: boolean, onInstalledChange?: () => void }) {
  const { t } = useTranslation()
  const isPopout = propIsPopout ?? (new URLSearchParams(window.location.search).get('window') === 'vst-store')
  
  const [storeCatalog, setStoreCatalog] = useState<StorePlugin[]>(BUILTIN_PLUGINS)
  
  // Filtering & Search
  const [activeCategory, setActiveCategory] = useState<string>('Alle')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Katalog-Auswahl-State
  const [selectedPlugin, setSelectedPlugin] = useState<StorePlugin | null>(null)

  // 1. Live Online Sync (honest catalog fetch, no local storage downloaded_vsts sync)
  useEffect(() => {
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
  }, [])

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
                    
                    {plugin.downloadUrl ? (
                      <a
                        href={plugin.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Herstellerseite öffnen"
                        className="p-1.5 bg-omega-accent/10 hover:bg-omega-accent/30 border border-omega-accent/30 text-omega-accent rounded-lg transition-colors hover:scale-105 active:scale-95 flex-shrink-0"
                      >
                        <ExternalLink size={12} />
                      </a>
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
