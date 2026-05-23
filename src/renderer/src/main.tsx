import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ExportModal } from './components/ExportModal'
import { ExportProgressWindow } from './components/ExportProgressWindow'
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
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}