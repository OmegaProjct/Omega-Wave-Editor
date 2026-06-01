import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ExportModal } from './components/ExportModal'
import { ExportProgressWindow } from './components/ExportProgressWindow'
import { SettingsModal } from './components/SettingsModal'
import { AboutModal } from './components/AboutModal'
import { ManualModal } from './components/ManualModal'
import { UpdateModal } from './components/UpdateModal'
import { VstEditorWindow } from './components/VstEditorWindow'
import { VstPluginRackPopout } from './components/VstPluginRack'
import { VstPluginStorePopout } from './components/VstPluginStore'
import { AudioRecordingModal } from './components/AudioRecordingModal'
import './index.css'

import { initI18n } from './lib/i18n'

// Bootstrap the application routes and handle popout windows dynamically
const params = new URLSearchParams(window.location.search);
const windowParam = params.get('window');

async function bootstrap() {
  let settings: any = { language: 'de', textScale: 'normal' }
  let locales: any = {}

  try {
    settings = await window.api.getSettings()
  } catch (e) {
    console.error('Failed to load settings on boot:', e)
  }

  // Apply typography scaling
  const activeScale = (settings && settings.textScale) || 'normal'
  document.documentElement.className = `text-scale-${activeScale}`

  // Load language packages dynamically via IPC
  try {
    locales = await window.api.getLocales()
  } catch (e) {
    console.error('Failed to load dynamic locales:', e)
  }

  const activeLang = (settings && settings.language) || 'de'
  await initI18n(locales, activeLang)

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

  if (windowParam === 'export') {
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <ExportModal />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'progress') {
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <ExportProgressWindow />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'settings') {
    const payload = JSON.parse(localStorage.getItem('popout_settings_payload') || '{}')
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <SettingsModal 
            onClose={() => window.close()} 
            initialTab={payload.tab || 'Projekteinstellungen'} 
          />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'about') {
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <AboutModal onClose={() => window.close()} />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'manual') {
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <ManualModal onClose={() => window.close()} />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'update') {
    const payload = JSON.parse(localStorage.getItem('popout_update_payload') || '{}')
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <UpdateModal 
            updateInfo={payload} 
            onClose={() => window.close()} 
          />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'vst-editor') {
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <VstEditorWindow />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'vst-rack') {
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <VstPluginRackPopout />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'vst-store') {
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <VstPluginStorePopout />
        </div>
      </React.StrictMode>
    )
  } else if (windowParam === 'audio-recorder') {
    root.render(
      <React.StrictMode>
        <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
          <AudioRecordingModal />
        </div>
      </React.StrictMode>
    )
  } else {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  }
}

bootstrap()