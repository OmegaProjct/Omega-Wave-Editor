import React, { useState, useEffect } from 'react'
import { Plus, FolderOpen, FileText, Settings, X, Calendar, Music, HelpCircle } from 'lucide-react'
import appIcon from '../assets/app_icon.png'
import { useTranslation } from 'react-i18next'

interface StartDashboardProps {
  onNewProject: (config: { projectName: string; sampleRate: number; tracksCount: number }) => void
  onOpenProject: () => void
  onLoadRecentProject: (path: string) => void
  onClose: () => void
  onOpenSettings?: () => void
}

export function StartDashboard({ 
  onNewProject, 
  onOpenProject, 
  onLoadRecentProject, 
  onClose,
  onOpenSettings
}: StartDashboardProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'new' | 'load'>('new')
  const [showAgain, setShowAgain] = useState(true)
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  
  // Neues Projekt Form-States
  const [projectName, setProjectName] = useState('')
  const [sampleRate, setSampleRate] = useState(48000)
  const [tracksCount, setTracksCount] = useState(32)
  const [defaultProjectsDir, setDefaultProjectsDir] = useState('')
  const [copyMedia, setCopyMedia] = useState(false)

  useEffect(() => {
    // Prefill project name with current date YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]
    setProjectName(today)

    // Einstellungen laden
    window.api.getSettings().then((settings: any) => {
      setShowAgain(settings.showStartScreen !== false)
      if (Array.isArray(settings.recentProjects)) {
        setRecentProjects(settings.recentProjects)
      }
      if (settings.projPath) {
        setDefaultProjectsDir(settings.projPath)
      } else {
        setDefaultProjectsDir('C:\\Users\\Dave1\\Documents\\OmegaProjects\\Omega Wave Editor\\Projects')
      }
    }).catch(e => console.error(e))
  }, [])

  const handleToggleShowAgain = async (checked: boolean) => {
    setShowAgain(checked)
    try {
      const settings = await window.api.getSettings()
      settings.showStartScreen = checked
      await window.api.saveSettings(settings)
    } catch (e) {
      console.error(e)
    }
  }

  const formatPath = (fullPath: string) => {
    if (fullPath.length > 50) {
      return '...' + fullPath.slice(-47)
    }
    return fullPath
  }

  // Relative Date Formatting in DAW Style
  const formatGermanRelativeDate = (timestamp: number) => {
    if (!timestamp) return ''
    const now = Date.now()
    const diffMs = now - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    const dateObj = new Date(timestamp)
    
    const pad = (n: number) => n.toString().padStart(2, '0')
    const timeStr = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`
    const dateStr = `${pad(dateObj.getDate())}.${pad(dateObj.getMonth() + 1)}.${dateObj.getFullYear()}`
    
    const isToday = dateObj.toDateString() === new Date().toDateString()
    
    if (isToday) {
      if (diffMins < 60) {
        const mins = Math.max(1, diffMins)
        return t('dashboard.relative_date.today_ago', { defaultValue: 'Heute, vor {{mins}}min, {{date}} um {{time}}', mins, date: dateStr, time: timeStr })
      }
      return t('dashboard.relative_date.today', { defaultValue: 'Heute, {{date}} um {{time}}', date: dateStr, time: timeStr })
    }
    
    const months = [
      t('months.january', { defaultValue: 'Januar' }),
      t('months.february', { defaultValue: 'Februar' }),
      t('months.march', { defaultValue: 'März' }),
      t('months.april', { defaultValue: 'April' }),
      t('months.may', { defaultValue: 'Mai' }),
      t('months.june', { defaultValue: 'Juni' }),
      t('months.july', { defaultValue: 'Juli' }),
      t('months.august', { defaultValue: 'August' }),
      t('months.september', { defaultValue: 'September' }),
      t('months.october', { defaultValue: 'Oktober' }),
      t('months.november', { defaultValue: 'November' }),
      t('months.december', { defaultValue: 'Dezember' })
    ]
    const monthName = months[dateObj.getMonth()]
    return t('dashboard.relative_date.full', { defaultValue: '{{month}}, {{date}} um {{time}}', month: monthName, date: dateStr, time: timeStr })
  }

  const handleCreateProject = () => {
    onNewProject({
      projectName: projectName.trim() || new Date().toISOString().split('T')[0],
      sampleRate,
      tracksCount
    })
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[4000] animate-in fade-in duration-200">
      <div className="bg-[#24272c] border border-gray-700/60 w-[840px] h-[540px] rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans select-none relative">
        
        {/* Title Bar (Branding analog zu professionellen DAWs) */}
        <div className="bg-[#1a1d21] h-10 px-4 border-b border-gray-800/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white tracking-wide">
              {t('dashboard.title', { defaultValue: 'Omega Wave Editor Start Center' })}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white hover:bg-gray-800/50 p-1 rounded-sm transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dashboard Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Navigation Panel */}
          <div className="w-[200px] bg-[#1a1d21] border-r border-gray-800/80 p-3 flex flex-col justify-between flex-shrink-0">
            <div className="flex flex-col gap-1">
              
              {/* Tab: Neues Projekt */}
              <button 
                onClick={() => setActiveTab('new')}
                className={`w-full py-2.5 px-3 rounded flex items-center gap-3 transition-colors ${
                  activeTab === 'new' 
                    ? 'bg-[#2d3136] text-white font-bold border-l-2 border-omega-accent' 
                    : 'text-gray-400 hover:bg-[#24272c]/50 hover:text-white'
                }`}
              >
                <Plus size={16} className={activeTab === 'new' ? 'text-omega-accent' : 'text-gray-400'} />
                <span className="text-xs">{t('dashboard.new_project', { defaultValue: 'Neues Projekt' })}</span>
              </button>

              {/* Tab: Projekt laden */}
              <button 
                onClick={() => setActiveTab('load')}
                className={`w-full py-2.5 px-3 rounded flex items-center gap-3 transition-colors ${
                  activeTab === 'load' 
                    ? 'bg-[#2d3136] text-white font-bold border-l-2 border-omega-accent' 
                    : 'text-gray-400 hover:bg-[#24272c]/50 hover:text-white'
                }`}
              >
                <FolderOpen size={16} className={activeTab === 'load' ? 'text-omega-accent' : 'text-gray-400'} />
                <span className="text-xs">{t('dashboard.load_project', { defaultValue: 'Projekt laden' })}</span>
              </button>

            </div>

            {/* Bottom Left settings cog */}
            <div className="flex justify-between items-center px-1">
              <button 
                onClick={onOpenSettings}
                className="text-gray-500 hover:text-white p-1.5 rounded hover:bg-[#2d3136]/50 transition-colors flex items-center gap-2 group"
                title={t('dashboard.settings_tooltip', { defaultValue: 'Programmeinstellungen öffnen' })}
              >
                <Settings size={16} className="group-hover:rotate-45 transition-transform duration-300" />
                <span className="text-[10px] font-semibold text-gray-500 group-hover:text-gray-300">
                  {t('dashboard.settings', { defaultValue: 'Einstellungen' })}
                </span>
              </button>
              <span className="text-[8px] text-gray-600 font-mono">v0.2.2</span>
            </div>

          </div>

          {/* Right Content Panel */}
          <div className="flex-1 bg-[#24272c] p-6 overflow-hidden flex flex-col justify-between">
            
            {/* Tab: Neues Projekt Content */}
            {activeTab === 'new' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700/40 pb-2 mb-4">
                  {t('dashboard.project_settings_title', { defaultValue: 'Eigene Projekteinstellungen' })}
                </h3>
                
                <div className="flex flex-col gap-4 flex-1">
                  
                  {/* Name Input */}
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-medium text-gray-400 w-24 text-right">
                      {t('dashboard.project_name', { defaultValue: 'Projektname:' })}
                    </label>
                    <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="flex-1 max-w-sm px-2.5 py-1.5 bg-[#1a1d21] border border-gray-700/60 rounded text-xs text-white focus:outline-none focus:border-omega-accent font-semibold"
                    />
                  </div>

                  {/* Sample Rate Dropdown */}
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-medium text-gray-400 w-24 text-right">
                      {t('dashboard.sample_rate', { defaultValue: 'Samplerate:' })}
                    </label>
                    <select 
                      value={sampleRate}
                      onChange={(e) => setSampleRate(Number(e.target.value))}
                      className="w-[200px] px-2.5 py-1.5 bg-[#1a1d21] border border-gray-700/60 rounded text-xs text-white focus:outline-none focus:border-omega-accent"
                    >
                      <option value={44100}>44100 Hz</option>
                      <option value={48000}>48000 Hz</option>
                      <option value={96000}>96000 Hz</option>
                    </select>
                  </div>

                  {/* Spurenanzahl Dropdown */}
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-medium text-gray-400 w-24 text-right">
                      {t('dashboard.tracks', { defaultValue: 'Spuren:' })}
                    </label>
                    <select 
                      value={tracksCount}
                      onChange={(e) => setTracksCount(Number(e.target.value))}
                      className="w-[200px] px-2.5 py-1.5 bg-[#1a1d21] border border-gray-700/60 rounded text-xs text-white focus:outline-none focus:border-omega-accent"
                    >
                      <option value={4}>{t('dashboard.tracks_count', { defaultValue: '{{count}} Spuren', count: 4 })}</option>
                      <option value={8}>{t('dashboard.tracks_count', { defaultValue: '{{count}} Spuren', count: 8 })}</option>
                      <option value={16}>{t('dashboard.tracks_count', { defaultValue: '{{count}} Spuren', count: 16 })}</option>
                      <option value={32}>{t('dashboard.tracks_count', { defaultValue: '{{count}} Spuren', count: 32 })}</option>
                    </select>
                  </div>

                  {/* Projektordner Pfadanzeige */}
                  <div className="flex items-center gap-4 mt-2">
                    <label className="text-xs font-medium text-gray-400 w-24 text-right">
                      {t('dashboard.project_folder', { defaultValue: 'Projektordner:' })}
                    </label>
                    <span className="text-[11px] text-gray-500 font-mono bg-[#1a1d21]/45 px-2 py-1 border border-gray-800 rounded select-text max-w-md truncate">
                      {defaultProjectsDir || 'C:\\Users\\Dave1\\Documents\\OmegaProjects\\Omega Wave Editor\\Projects'}
                    </span>
                  </div>

                  {/* Medien kopieren Checkbox */}
                  <div className="flex items-center gap-4 mt-3 ml-28">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={copyMedia}
                        onChange={(e) => setCopyMedia(e.target.checked)}
                        className="rounded border-gray-700 bg-[#1a1d21] text-omega-accent focus:ring-omega-accent/30 focus:ring-offset-0 focus:ring-1 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] font-medium text-gray-400 hover:text-gray-200 transition-colors">
                        {t('dashboard.copy_media', { defaultValue: 'Medien in Projektordner kopieren' })}
                      </span>
                    </label>
                  </div>

                </div>

                {/* Neues Projekt Erstellen Button */}
                <div className="flex justify-end border-t border-gray-850 pt-4 mt-4">
                  <button 
                    onClick={handleCreateProject}
                    className="px-6 py-2 bg-omega-accent hover:bg-blue-500 text-white font-bold text-xs rounded transition-all duration-150 active:scale-[0.98] shadow-lg hover:shadow-omega-accent/15"
                  >
                    {t('dashboard.create_project', { defaultValue: 'Projekt erstellen' })}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Projekt laden Content */}
            {activeTab === 'load' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                
                {/* Vorhandenes Projekt Sektion */}
                <div className="flex justify-between items-center border-b border-gray-700/40 pb-3 mb-4 flex-shrink-0">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('dashboard.open_existing_title', { defaultValue: 'Vorhandenes Projekt öffnen' })}
                  </h3>
                  <button 
                    onClick={onOpenProject}
                    className="px-4 py-1.5 bg-[#40454d] hover:bg-[#4d525c] border border-gray-600/45 text-white rounded text-xs font-semibold transition-colors flex items-center gap-2"
                  >
                    <FolderOpen size={12} className="text-omega-accent" />
                    {t('dashboard.open_button', { defaultValue: 'Öffnen...' })}
                  </button>
                </div>

                {/* Zuletzt geöffnete Projekte */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    {t('dashboard.recent_projects_title', { defaultValue: 'Zuletzt geöffnete Projekte' })}
                  </h4>
                  
                  {recentProjects.length === 0 ? (
                    <div className="flex-1 border border-dashed border-gray-800 rounded flex flex-col items-center justify-center text-center p-6 gap-3 bg-[#1a1d21]/15">
                      <div className="h-10 w-10 bg-gray-800/40 rounded-full flex items-center justify-center text-gray-600">
                        <Music size={18} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-gray-400">
                          {t('dashboard.no_recent_projects', { defaultValue: 'Keine letzten Projekte' })}
                        </span>
                        <span className="text-[10px] text-gray-500 max-w-[240px] leading-relaxed">
                          {t('dashboard.no_recent_projects_desc', { defaultValue: 'Hier werden deine zuletzt bearbeiteten Audioprojekte angezeigt.' })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 max-h-[260px]">
                      {recentProjects.map((proj: any, idx: number) => (
                        <div 
                          key={idx}
                          onClick={() => onLoadRecentProject(proj.path)}
                          className="px-3.5 py-2.5 bg-[#2d3136]/50 hover:bg-[#2d3136]/90 border border-gray-800/40 hover:border-gray-700/50 rounded cursor-pointer flex justify-between items-center transition-all group active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-7 w-7 bg-omega-accent/15 rounded flex items-center justify-center text-omega-accent group-hover:scale-105 transition-transform flex-shrink-0">
                              <FileText size={14} />
                            </div>
                            <div className="flex flex-col text-left overflow-hidden">
                              <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors truncate">
                                {proj.name || t('dashboard.untitled_project', { defaultValue: 'Unbenanntes Projekt' })}
                              </span>
                              <span className="text-[9px] text-gray-500 mt-0.5 font-mono truncate select-text">
                                {formatPath(proj.path)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500 font-mono text-[9px] flex-shrink-0 pl-3">
                            <Calendar size={10} className="text-gray-600" />
                            <span>{formatGermanRelativeDate(proj.date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Bottom Dashboard Bar */}
            <div className="border-t border-gray-800/60 pt-3 flex items-center justify-between flex-shrink-0 mt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={!showAgain} 
                  onChange={(e) => handleToggleShowAgain(!e.target.checked)}
                  className="rounded border-gray-700 bg-[#1a1d21] text-omega-accent focus:ring-omega-accent/30 focus:ring-offset-0 focus:ring-1 h-3.5 w-3.5"
                />
                <span className="text-[11px] font-semibold text-gray-400 hover:text-gray-200 transition-colors">
                  {t('dashboard.dont_show_again', { defaultValue: 'Beim Starten nicht noch einmal anzeigen' })}
                </span>
              </label>

              <button 
                onClick={onClose}
                className="px-4 py-1.5 bg-[#2d3136] hover:bg-[#34383e] border border-gray-700/50 text-gray-300 hover:text-white rounded text-xs font-semibold transition-colors shadow"
              >
                {t('dashboard.skip', { defaultValue: 'Überspringen' })}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
