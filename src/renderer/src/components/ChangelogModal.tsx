import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface ChangelogEntry {
  version: string
  date: string
  english: string
  deutsch: string
}

// Parse CHANGELOG.md text into structured entries with DE/EN sections
function parseChangelog(raw: string): ChangelogEntry[] {
  const normalized = raw.replace(/\r\n/g, '\n')
  const entries: ChangelogEntry[] = []
  // Split by version headers ## [X.Y.Z]
  const versionBlocks = normalized.split(/\n(?=## \[)/)

  for (const block of versionBlocks) {
    const versionMatch = block.match(/^## \[([^\]]+)\]\s*-\s*(.+)/)
    if (!versionMatch) continue

    const version = versionMatch[1].trim()
    const date = versionMatch[2].trim()

    // Extract ### English block
    const englishMatch = block.match(/### English\n([\s\S]*?)(?=\n### |\n## |\n---|\s*$)/)
    // Extract ### Deutsch block
    const deutschMatch = block.match(/### Deutsch\n([\s\S]*?)(?=\n### |\n## |\n---|\s*$)/)

    // Falls Abschnitte fehlen, nutzen wir den restlichen Block (ohne Header) als Fallback
    const fallbackText = block.replace(/^## \[([^\]]+)\]\s*-\s*.+/, '').trim()

    entries.push({
      version,
      date,
      english: englishMatch ? englishMatch[1].trim() : fallbackText,
      deutsch: deutschMatch ? deutschMatch[1].trim() : fallbackText,
    })
  }

  return entries
}

// Render inline markdown: **bold** and `code`
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/)
    if (boldMatch) return <strong key={i} className="text-white font-bold">{boldMatch[1]}</strong>
    const codeMatch = part.match(/^`(.+)`$/)
    if (codeMatch) return <code key={i} className="bg-gray-800 text-omega-accent px-1 rounded text-sm font-mono">{codeMatch[1]}</code>
    return <span key={i}>{part}</span>
  })
}

// Render a markdown block (#### headers + bullet lists)
function renderMarkdownBlock(text: string) {
  if (!text) return <p className="text-gray-500 italic text-sm">No details available.</p>
  return text.split('\n').map((line, idx) => {
    if (line.startsWith('#### ')) {
      const label = line.slice(5)
      let color = 'text-gray-300'
      if (label === 'Added' || label === 'Hinzugefügt') color = 'text-green-400'
      if (label === 'Fixed' || label === 'Behoben') color = 'text-blue-400'
      if (label === 'Changed' || label === 'Geändert') color = 'text-yellow-400'
      if (label === 'Removed' || label === 'Entfernt') color = 'text-red-400'
      return (
        <h5 key={idx} className={`${color} font-bold text-xs uppercase tracking-widest mt-4 mb-2 first:mt-0`}>
          {label}
        </h5>
      )
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2)
      return (
        <div key={idx} className="flex items-start gap-2 mb-2">
          <span className="text-omega-accent mt-1 shrink-0 text-xs">•</span>
          <p className="text-gray-200 text-sm leading-relaxed">{renderInline(content)}</p>
        </div>
      )
    }
    if (line.trim() === '') return <div key={idx} className="h-1" />
    return <p key={idx} className="text-gray-400 text-sm">{renderInline(line)}</p>
  })
}

interface Props {
  onClose: () => void
}

export default function ChangelogModal({ onClose }: Props) {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState<'de' | 'en'>(i18n.language?.startsWith('de') ? 'de' : 'en')
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load CHANGELOG.md via the IPC bridge
    const loadChangelog = async () => {
      try {
        const raw = await window.api.readChangelog()
        const parsed = parseChangelog(raw)
        setEntries(parsed)
      } catch (e) {
        console.error('Failed to load changelog:', e)
      } finally {
        setLoading(false)
      }
    }
    loadChangelog()
  }, [])

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-[#1e2025] border border-gray-700/60 rounded-xl shadow-2xl flex flex-col"
           style={{ width: 760, height: 580, maxWidth: '95vw', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-omega-accent text-lg">📋</span>
            <h2 className="text-white font-bold text-base tracking-tight">Changelog</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-0.5 border border-gray-700/50">
              <button
                onClick={() => setLang('de')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                  lang === 'de'
                    ? 'bg-omega-accent text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                🇩🇪 Deutsch
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                  lang === 'en'
                    ? 'bg-omega-accent text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg p-1.5 transition-colors ml-1"
              title="Schließen"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Content area */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            {loading ? (
              <div className="text-gray-500 text-sm text-center mt-16">
                {lang === 'de' ? 'Lade Changelog...' : 'Loading changelog...'}
              </div>
            ) : entries.length > 0 ? (
              entries.map(entry => {
                const content = lang === 'de' ? entry.deutsch : entry.english
                return (
                  <div key={entry.version} className="border-b border-gray-700/40 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-baseline gap-3 mb-4">
                      <h3 className="text-omega-accent font-black text-lg">v{entry.version}</h3>
                      <span className="text-gray-500 text-sm">{entry.date}</span>
                    </div>
                    <div>
                      {renderMarkdownBlock(content || (lang === 'de' ? 'Keine Details verfügbar.' : 'No details available.'))}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-gray-500 text-sm text-center mt-16">
                {lang === 'de' ? 'Kein Changelog verfügbar.' : 'No changelog available.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
