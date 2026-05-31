import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ExportModal } from './components/ExportModal'
import { ExportProgressWindow } from './components/ExportProgressWindow'
import { SettingsModal } from './components/SettingsModal'
import { AboutModal } from './components/AboutModal'
import { ManualModal } from './components/ManualModal'
import { UpdateModal } from './components/UpdateModal'
import './index.css'

const params = new URLSearchParams(window.location.search);
const windowParam = params.get('window');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

if (windowParam === 'export') {
  root.render(
    <React.StrictMode>
      <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
        <ExportModal />
      </div>
    </React.StrictMode>
  );
} else if (windowParam === 'progress') {
  root.render(
    <React.StrictMode>
      <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
        <ExportProgressWindow />
      </div>
    </React.StrictMode>
  );
} else if (windowParam === 'settings') {
  const payload = JSON.parse(localStorage.getItem('popout_settings_payload') || '{}');
  root.render(
    <React.StrictMode>
      <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
        <SettingsModal 
          onClose={() => window.close()} 
          initialTab={payload.tab || 'Projekteinstellungen'} 
        />
      </div>
    </React.StrictMode>
  );
} else if (windowParam === 'about') {
  root.render(
    <React.StrictMode>
      <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
        <AboutModal onClose={() => window.close()} />
      </div>
    </React.StrictMode>
  );
} else if (windowParam === 'manual') {
  root.render(
    <React.StrictMode>
      <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
        <ManualModal onClose={() => window.close()} />
      </div>
    </React.StrictMode>
  );
} else if (windowParam === 'update') {
  const payload = JSON.parse(localStorage.getItem('popout_update_payload') || '{}');
  root.render(
    <React.StrictMode>
      <div className="h-screen w-screen bg-[#282b30] text-omega-text overflow-hidden select-none">
        <UpdateModal 
          updateInfo={payload} 
          onClose={() => window.close()} 
        />
      </div>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}