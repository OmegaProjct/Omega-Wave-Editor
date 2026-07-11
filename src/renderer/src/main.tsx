import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ExportProgressWindow } from './components/ExportProgressWindow'
import { VstEditorWindow } from './components/VstEditorWindow'
import { VstPluginRackPopout } from './components/VstPluginRack'
import './index.css'

import { initI18n } from './lib/i18n'

const ExportModal = React.lazy(() => import('./components/ExportModal').then(m => ({ default: m.ExportModal })))
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })))
const AboutModal = React.lazy(() => import('./components/AboutModal').then(m => ({ default: m.AboutModal })))
const ManualModal = React.lazy(() => import('./components/ManualModal').then(m => ({ default: m.ManualModal })))
const UpdateModal = React.lazy(() => import('./components/UpdateModal').then(m => ({ default: m.UpdateModal })))
const SymbolManagerModal = React.lazy(() => import('./components/SymbolManagerModal').then(m => ({ default: m.SymbolManagerModal })))
const VstPluginStorePopout = React.lazy(() => import('./components/VstPluginStore').then(m => ({ default: m.VstPluginStorePopout })))
const LogViewerModal = React.lazy(() => import('./components/LogViewerModal').then(m => ({ default: m.LogViewerModal })))
const MessageCenterModal = React.lazy(() => import('./components/MessageCenterModal').then(m => ({ default: m.MessageCenterModal })))
const AudioRecordingModal = React.lazy(() => import('./components/AudioRecordingModal').then(m => ({ default: m.AudioRecordingModal })))

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
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <ExportModal />
          </div>
        </React.Suspense>
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
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <SettingsModal 
              onClose={() => window.close()} 
              initialTab={payload.tab || 'Projekteinstellungen'} 
            />
          </div>
        </React.Suspense>
      </React.StrictMode>
    )
  } else if (windowParam === 'about') {
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <AboutModal onClose={() => window.close()} />
          </div>
        </React.Suspense>
      </React.StrictMode>
    )
  } else if (windowParam === 'symbol-manager') {
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <SymbolManagerModal onClose={() => window.close()} />
          </div>
        </React.Suspense>
      </React.StrictMode>
    )
  } else if (windowParam === 'manual') {
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <ManualModal onClose={() => window.close()} />
          </div>
        </React.Suspense>
      </React.StrictMode>
    )
  } else if (windowParam === 'update') {
    const payload = JSON.parse(localStorage.getItem('popout_update_payload') || '{}')
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <UpdateModal 
              updateInfo={payload} 
              onClose={() => window.close()} 
            />
          </div>
        </React.Suspense>
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
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <VstPluginStorePopout />
          </div>
        </React.Suspense>
      </React.StrictMode>
    )
  } else if (windowParam === 'logs') {
    const payload = JSON.parse(localStorage.getItem('popout_logs_payload') || '{}')
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <LogViewerModal 
              onClose={() => window.close()} 
              mode={payload.tab}
            />
          </div>
        </React.Suspense>
      </React.StrictMode>
    )
  } else if (windowParam === 'messages') {
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <MessageCenterModal onClose={() => window.close()} />
          </div>
        </React.Suspense>
      </React.StrictMode>
    )
  } else if (windowParam === 'audio-recorder') {
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={null}>
          <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
            <AudioRecordingModal />
          </div>
        </React.Suspense>
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