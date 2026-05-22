import React, { useState, useRef, useEffect } from 'react'

export function MenuBar({ 
  onOpenSettings, 
  onOpenExport,
  onFileAction
}: { 
  onOpenSettings: () => void, 
  onOpenExport: () => void,
  onFileAction: (type: string, payload?: any) => void
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMenuClick = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu)
  }

  const handleAction = async (action: string) => {
    setOpenMenu(null)
    
    if (action === 'quit') return window.close()
    if (action === 'settings') return onOpenSettings()
    if (action === 'export') return onOpenExport()
    if (action === 'paypal') return window.api.openExternal('https://www.paypal.com/paypalme/OmegaProjects')
    
    // Undo/Redo
    if (action === 'undo') return onFileAction('UNDO')
    if (action === 'redo') return onFileAction('REDO')

    // Integrated File Actions
    if (action === 'new_project') return onFileAction('NEW_PROJECT')
    if (action === 'save_project') return onFileAction('SAVE_PROJECT')
    if (action === 'save_project_as') return onFileAction('SAVE_PROJECT')
    if (action === 'open_project') return onFileAction('LOAD_PROJECT')
    if (action === 'export_arrangement') return onFileAction('EXPORT_ARRANGEMENT')
    if (action === 'export_layer') return onFileAction('EXPORT_LAYER')
    
    if (action === 'vst_plugins') {
      const plugins = await window.api.scanVstPlugins()
      onFileAction('SHOW_MODAL', { type: 'info', title: 'VST Scan', message: `VST Scan abgeschlossen. ${plugins.length} Plugins gefunden:\n\n${plugins.map((p: any) => `- ${p.name} (${p.type})`).join('\n')}` })
      return
    }

    if (action === 'updates') return onFileAction('SHOW_MODAL', { type: 'info', title: 'Updates', message: 'Prüfe auf Updates...\n\nAktuelle Version: 1.0.0\nIhre Software ist auf dem neuesten Stand.' })
    if (action === 'about') return onFileAction('SHOW_MODAL', { type: 'info', title: 'Info', message: 'Omega Wave Editor\nVersion 1.0.0\n\n© 2026 Omega Projects\n\nEin verlustfreier, schneller Audio-Editor.' })
    if (action === 'help' || action === 'manual') return onFileAction('SHOW_MANUAL')
    
    if (action === 'audio_effects') {
       // Just open the EffectsPanel conceptually, but it's always open on the right in this layout.
       // We can show an info message or focus it.
       return onFileAction('SHOW_MODAL', { type: 'info', title: 'Master-Effekte', message: 'Das Effekt-Panel auf der rechten Seite ist bereits aktiv und wendet Effekte in Echtzeit an.' })
    }

    onFileAction('SHOW_MODAL', { type: 'warn', title: 'Hinweis', message: `Die Funktion "${action}" wird derzeit vorbereitet.` })
  }

  const MenuItem = ({ label, shortcut, action, divider, isParent }: { label?: string, shortcut?: string, action?: string, divider?: boolean, isParent?: boolean }) => {
    if (divider) return <div className="h-px bg-gray-700 my-1 mx-2" />
    return (
      <div 
        className="px-6 py-1.5 hover:bg-omega-accent flex justify-between items-center cursor-pointer min-w-[320px] text-sm text-omega-text group"
        onClick={() => action && handleAction(action)}
      >
        <span className="flex-1">{label}</span>
        {shortcut && <span className="text-gray-500 text-xs ml-4 font-mono group-hover:text-white transition-colors">{shortcut}</span>}
        {isParent && <span className="text-gray-600 text-[10px] ml-4 opacity-50">›</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center h-full relative" ref={menuRef}>
      {/* Datei */}
      <div className="relative h-full flex items-center">
        <span className={`mx-1 px-3 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${openMenu === 'file' ? 'bg-gray-700' : ''}`} onClick={() => handleMenuClick('file')}>Datei</span>
        {openMenu === 'file' && (
          <div className="absolute top-full left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded text-omega-text">
            <MenuItem label="Neues Projekt..." shortcut="Strg+N" action="new_project" />
            <MenuItem label="Projekt Öffnen..." shortcut="Strg+O" action="open_project" />
            <MenuItem divider />
            <MenuItem label="Projekt speichern" shortcut="Strg+S" action="save_project" />
            <MenuItem label="Projekt speichern unter..." shortcut="Strg+Umschalt+S" action="save_project_as" />
            <MenuItem divider />
            <MenuItem label="Audio exportieren (Mixdown)..." shortcut="Strg+E" action="export" />
            <MenuItem label="Arrangement exportieren (.owea)..." action="export_arrangement" />
            <MenuItem label="Layer exportieren (.owel)..." action="export_layer" />
            <MenuItem divider />
            <MenuItem label="Beenden" shortcut="Alt+F4" action="quit" />
          </div>
        )}
      </div>

      {/* Bearbeiten */}
      <div className="relative h-full flex items-center">
        <span className={`mx-1 px-3 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${openMenu === 'edit' ? 'bg-gray-700' : ''}`} onClick={() => handleMenuClick('edit')}>Bearbeiten</span>
        {openMenu === 'edit' && (
          <div className="absolute top-full left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded">
            <MenuItem label="Rückgängig" shortcut="Strg+Z" action="undo" />
            <MenuItem label="Wiederherstellen" shortcut="Strg+Y" action="redo" />
            <MenuItem divider />
            <MenuItem label="Objekte ausschneiden" shortcut="Strg+X" action="cut" />
            <MenuItem label="Objekte kopieren" shortcut="Strg+C" action="copy" />
            <MenuItem label="Objekte einfügen" shortcut="Strg+V" action="paste" />
            <MenuItem label="Objekte löschen" shortcut="Entf" action="delete" />
          </div>
        )}
      </div>

      {/* Effekte */}
      <div className="relative h-full flex items-center">
        <span className={`mx-1 px-3 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${openMenu === 'effects' ? 'bg-gray-700' : ''}`} onClick={() => handleMenuClick('effects')}>Effekte</span>
        {openMenu === 'effects' && (
          <div className="absolute top-full left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded">
            <MenuItem label="Audioeffekte (Master)..." action="audio_effects" />
            <MenuItem label="VST Plugins laden/scannen..." action="vst_plugins" />
          </div>
        )}
      </div>

      {/* Hilfe */}
      <div className="relative h-full flex items-center">
        <span className={`mx-1 px-3 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${openMenu === 'help' ? 'bg-gray-700' : ''}`} onClick={() => handleMenuClick('help')}>Hilfe</span>
        {openMenu === 'help' && (
          <div className="absolute top-full left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded">
            <MenuItem label="Handbuch (PDF) herunterladen" action="manual" />
            <MenuItem divider />
            <MenuItem label="Auf Updates prüfen..." action="updates" />
            <MenuItem label="Über Omega Wave Editor..." action="about" />
            <MenuItem divider />
            <MenuItem label="❤️ Projekt unterstützen (PayPal)" action="paypal" />
          </div>
        )}
      </div>
    </div>
  )
}
