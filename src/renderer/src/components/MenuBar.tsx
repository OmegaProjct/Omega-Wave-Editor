import React, { useState, useRef, useEffect } from 'react'
import { KeyboardShortcuts, formatShortcut, normalizeKeyboardShortcuts } from '../lib/keyboardShortcuts'
import { useTranslation } from 'react-i18next'

export function MenuBar({ 
  onOpenSettings, 
  onOpenExport,
  onFileAction,
  shortcuts
}: { 
  onOpenSettings: () => void, 
  onOpenExport: () => void,
  onFileAction: (type: string, payload?: any) => void,
  shortcuts?: KeyboardShortcuts
}) {
  const { t } = useTranslation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const activeShortcuts = normalizeKeyboardShortcuts(shortcuts)
  
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
    if (action === 'cut') return onFileAction('CUT')
    if (action === 'copy') return onFileAction('COPY')
    if (action === 'paste') return onFileAction('PASTE')
    if (action === 'delete') return onFileAction('DELETE')
    if (action === 'select_all') return onFileAction('SELECT_ALL')

    // Integrated File Actions
    if (action === 'new_project') return onFileAction('NEW_PROJECT')
    if (action === 'save_project') return onFileAction('SAVE_PROJECT')
    if (action === 'save_project_as') return onFileAction('SAVE_PROJECT')
    if (action === 'open_project') return onFileAction('LOAD_PROJECT')
    if (action === 'export_arrangement') return onFileAction('EXPORT_ARRANGEMENT')
    if (action === 'export_layer') return onFileAction('EXPORT_LAYER')
    
    if (action === 'vst_plugins') {
      const plugins = await window.api.scanVstPlugins()
      onFileAction('SHOW_MODAL', { 
        type: 'info', 
        title: 'VST Scan', 
        message: t('menu.vst_scan_finished', { defaultValue: 'VST Scan abgeschlossen. {{count}} Plugins gefunden:\n\n', count: plugins.length }) + plugins.map((p: any) => `- ${p.name} (${p.format})`).join('\n')
      })
      return
    }

    if (action === 'updates') {
      onFileAction('SHOW_MODAL', { 
        type: 'info', 
        title: 'Updates', 
        message: t('menu.checking_updates', { defaultValue: 'Prüfe auf Updates...\n\nBitte warten...' })
      })
      try {
        const updateInfo = await window.api.checkForUpdates()
        onFileAction('CLOSE_MODAL')
        if (updateInfo.error) {
          onFileAction('SHOW_MODAL', {
            type: 'error',
            title: 'Updates',
            message: t('menu.update_check_error', { defaultValue: 'Fehler bei der Update-Prüfung:\n{{error}}', error: updateInfo.error })
          })
          return
        }
        if (updateInfo.available) {
          onFileAction('TRIGGER_UPDATE', updateInfo)
        } else {
          const cleanCurrent = updateInfo.currentVersion.startsWith('v') ? updateInfo.currentVersion : `v${updateInfo.currentVersion}`
          
          // Hilfsfunktion für den Versionsvergleich (SemVer)
          const isNewer = (v1: string, v2: string) => {
            const clean1 = v1.replace(/^v/i, '').split('.').map(Number);
            const clean2 = v2.replace(/^v/i, '').split('.').map(Number);
            for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
              const num1 = clean1[i] || 0;
              const num2 = clean2[i] || 0;
              if (num2 > num1) return true;
              if (num2 < num1) return false;
            }
            return false;
          }

          let latestToDisplay = updateInfo.latestVersion || updateInfo.currentVersion;
          if (!isNewer(updateInfo.currentVersion, latestToDisplay)) {
            latestToDisplay = updateInfo.currentVersion;
          }

          const cleanLatest = latestToDisplay.startsWith('v') ? latestToDisplay : `v${latestToDisplay}`
          onFileAction('SHOW_MODAL', {
            type: 'info',
            title: 'Updates',
            message: t('menu.up_to_date', { defaultValue: 'Deine Software ist auf dem neuesten Stand.\n\nInstallierte Version: {{current}}\nNeueste Version: {{latest}}', current: cleanCurrent, latest: cleanLatest })
          })
        }
      } catch (err: any) {
        onFileAction('CLOSE_MODAL')
        onFileAction('SHOW_MODAL', {
          type: 'error',
          title: 'Updates',
          message: t('menu.update_check_error_msg', { defaultValue: 'Fehler bei der Update-Prüfung: {{message}}', message: err.message })
        })
      }
      return
    }

    if (action === 'about') {
      onFileAction('SHOW_ABOUT')
      return
    }
    if (action === 'open_logs') {
      onFileAction('SHOW_LOGS')
      return
    }
    if (action === 'open_feedback') {
      onFileAction('SHOW_FEEDBACK')
      return
    }
    if (action === 'open_messages') {
      onFileAction('SHOW_MESSAGES')
      return
    }
    if (action === 'help' || action === 'manual') return onFileAction('SHOW_MANUAL')
    if (action === 'changelog') return onFileAction('SHOW_CHANGELOG')
    
    if (action === 'audio_effects') {
       return onFileAction('SHOW_MODAL', { 
         type: 'info', 
         title: t('menu.master_effects', { defaultValue: 'Master-Effekte' }), 
         message: t('menu.effects_active', { defaultValue: 'Das Effekt-Panel auf der rechten Seite ist bereits aktiv und wendet Effekte in Echtzeit an.' }) 
       })
    }

    onFileAction('SHOW_MODAL', { 
      type: 'warn', 
      title: t('common.notice', { defaultValue: 'Hinweis' }), 
      message: t('menu.feature_preparing', { defaultValue: 'Die Funktion "{{action}}" wird derzeit vorbereitet.', action }) 
    })
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
        <span className={`mx-1 px-3 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${openMenu === 'file' ? 'bg-gray-700' : ''}`} onClick={() => handleMenuClick('file')}>{t('menu.file', { defaultValue: 'Datei' })}</span>
        {openMenu === 'file' && (
          <div className="absolute top-full left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded text-omega-text">
            <MenuItem label={t('menu.new_project', { defaultValue: 'Neues Projekt' })} shortcut={formatShortcut(activeShortcuts.newProject)} action="new_project" />
            <MenuItem label={t('menu.open_project', { defaultValue: 'Projekt Öffnen' })} shortcut={formatShortcut(activeShortcuts.openProject)} action="open_project" />
            <MenuItem divider />
            <MenuItem label={t('menu.save_project', { defaultValue: 'Projekt speichern' })} shortcut={formatShortcut(activeShortcuts.saveProject)} action="save_project" />
            <MenuItem label={t('menu.save_project_as', { defaultValue: 'Projekt speichern unter' })} shortcut={formatShortcut(activeShortcuts.saveProjectAs)} action="save_project_as" />
            <MenuItem divider />
            <MenuItem label={t('menu.export_audio', { defaultValue: 'Audio exportieren (Mixdown)' })} shortcut={formatShortcut(activeShortcuts.exportAudio)} action="export" />
            <MenuItem label={t('menu.export_arrangement', { defaultValue: 'Arrangement exportieren (.owea)' })} action="export_arrangement" />
            <MenuItem label={t('menu.export_layer', { defaultValue: 'Layer exportieren (.owel)' })} action="export_layer" />
            <MenuItem divider />
            <MenuItem label={t('menu.settings', { defaultValue: 'Einstellungen' })} shortcut={formatShortcut(activeShortcuts.openSettings)} action="settings" />
            <MenuItem divider />
            <MenuItem label={t('menu.quit', { defaultValue: 'Beenden' })} shortcut="Alt+F4" action="quit" />
          </div>
        )}
      </div>

      {/* Bearbeiten */}
      <div className="relative h-full flex items-center">
        <span className={`mx-1 px-3 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${openMenu === 'edit' ? 'bg-gray-700' : ''}`} onClick={() => handleMenuClick('edit')}>{t('menu.edit', { defaultValue: 'Bearbeiten' })}</span>
        {openMenu === 'edit' && (
          <div className="absolute top-full left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded">
            <MenuItem label={t('menu.undo', { defaultValue: 'Rückgängig' })} shortcut={formatShortcut(activeShortcuts.undo)} action="undo" />
            <MenuItem label={t('menu.redo', { defaultValue: 'Wiederherstellen' })} shortcut={formatShortcut(activeShortcuts.redo)} action="redo" />
            <MenuItem divider />
            <MenuItem label={t('menu.cut', { defaultValue: 'Objekte ausschneiden' })} shortcut={formatShortcut(activeShortcuts.cut)} action="cut" />
            <MenuItem label={t('menu.copy', { defaultValue: 'Objekte kopieren' })} shortcut={formatShortcut(activeShortcuts.copy)} action="copy" />
            <MenuItem label={t('menu.paste', { defaultValue: 'Objekte einfügen' })} shortcut={formatShortcut(activeShortcuts.paste)} action="paste" />
            <MenuItem label={t('menu.delete', { defaultValue: 'Objekte löschen' })} shortcut={formatShortcut(activeShortcuts.deleteSelection)} action="delete" />
            <MenuItem divider />
            <MenuItem label={t('menu.select_all', { defaultValue: 'Alles auswählen' })} shortcut={formatShortcut(activeShortcuts.selectAllRegions)} action="select_all" />
          </div>
        )}
      </div>

      {/* Plugins */}
      <div className="relative h-full flex items-center">
        <span className={`mx-1 px-3 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${openMenu === 'effects' ? 'bg-gray-700' : ''}`} onClick={() => handleMenuClick('effects')}>{t('menu.plugins', { defaultValue: 'Plugins' })}</span>
        {openMenu === 'effects' && (
          <div className="absolute top-full left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded">
            <MenuItem label={t('menu.scan_vst', { defaultValue: 'VST Plugins laden/scannen' })} action="vst_plugins" />
          </div>
        )}
      </div>

      {/* Hilfe */}
      <div className="relative h-full flex items-center">
        <span className={`mx-1 px-3 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${openMenu === 'help' ? 'bg-gray-700' : ''}`} onClick={() => handleMenuClick('help')}>{t('menu.help', { defaultValue: 'Hilfe' })}</span>
        {openMenu === 'help' && (
          <div className="absolute top-full left-0 bg-[#2b2d31] border border-gray-700 shadow-xl py-1 z-[1000] rounded">
            <MenuItem label={t('menu.manual', { defaultValue: 'Benutzerhandbuch' })} action="manual" />
            <MenuItem label={t('menu.changelog', { defaultValue: 'Changelog' })} action="changelog" />
            <MenuItem divider />
            <MenuItem label={t('menu.check_updates', { defaultValue: 'Auf Updates prüfen' })} action="updates" />
            <MenuItem label={t('menu.open_logs', { defaultValue: 'Logs' })} action="open_logs" />
            <MenuItem label={t('menu.open_feedback', { defaultValue: 'Feedback' })} action="open_feedback" />
            <MenuItem label={t('menu.open_messages', { defaultValue: 'Nachrichtencenter' })} action="open_messages" />
            <MenuItem label={t('menu.about', { defaultValue: 'Über Omega Wave Editor' })} action="about" />
            <MenuItem divider />
            <MenuItem label={t('menu.support_paypal', { defaultValue: '❤️ Projekt unterstützen (PayPal)' })} action="paypal" />
          </div>
        )}
      </div>
    </div>
  )
}

