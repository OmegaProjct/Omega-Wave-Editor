import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface AdvancedSettings {
  mono: boolean;
  adaptSampleRate: boolean;
  duckingEnabled: boolean;
  duckingDb: number;
  fadeInSec: number;
  fadeOutSec: number;
  onlyVideoOriginal: boolean;
}

interface AdvancedRecordingSettingsModalProps {
  onClose: () => void;
  onSave: (settings: AdvancedSettings) => void;
  initialSettings: AdvancedSettings;
  deviceLabel: string;
}

export function AdvancedRecordingSettingsModal({
  onClose,
  onSave,
  initialSettings,
  deviceLabel
}: AdvancedRecordingSettingsModalProps) {
  const [mono, setMono] = useState(initialSettings.mono);
  const [adaptSampleRate, setAdaptSampleRate] = useState(initialSettings.adaptSampleRate);
  const [duckingEnabled, setDuckingEnabled] = useState(initialSettings.duckingEnabled);
  const [duckingDb, setDuckingDb] = useState(initialSettings.duckingDb);
  const [fadeInSec, setFadeInSec] = useState<string>(String(initialSettings.fadeInSec));
  const [fadeOutSec, setFadeOutSec] = useState<string>(String(initialSettings.fadeOutSec));
  const [onlyVideoOriginal, setOnlyVideoOriginal] = useState(initialSettings.onlyVideoOriginal);

  const handleSave = () => {
    // Eingaben validieren
    const finalFadeIn = Math.max(0.01, isNaN(Number(fadeInSec)) ? 0.5 : Number(fadeInSec));
    const finalFadeOut = Math.max(0.01, isNaN(Number(fadeOutSec)) ? 0.5 : Number(fadeOutSec));

    onSave({
      mono,
      adaptSampleRate,
      duckingEnabled,
      duckingDb,
      fadeInSec: finalFadeIn,
      fadeOutSec: finalFadeOut,
      onlyVideoOriginal
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] bg-[#282b30] border border-[#3b3e45] text-[#d1d5db] font-sans shadow-2xl flex flex-col rounded-lg overflow-hidden select-none">
        
        {/* Titelzeile */}
        <div className="h-10 bg-[#1e2124] border-b border-[#3b3e45] flex items-center justify-between px-3">
          <span className="font-semibold text-sm text-white">Erweiterte Einstellungen</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Inhalt */}
        <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh] text-xs">
          
          {/* Treiberinfo */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-sky-400">Treiberinfo</span>
            <div className="bg-[#1a1d21] border border-[#3b3e45] rounded p-2.5 font-mono text-[10px] text-gray-300 leading-relaxed">
              <div className="truncate"><span className="text-gray-500">Aktiv:</span> {deviceLabel || 'Standardmikrofon'}</div>
              <div><span className="text-gray-500">Format:</span> 16-Bit PCM, Stereo-fähig</div>
              <div><span className="text-gray-500">Latenz:</span> ~10 ms (ASIO/WASAPI emulation)</div>
            </div>
          </div>

          {/* Allgemeine Optionen */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-sky-400">Allgemeine Optionen</span>
            
            <label className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={mono}
                onChange={(e) => setMono(e.target.checked)}
                className="w-3.5 h-3.5 accent-omega-accent cursor-pointer"
              />
              <span>Monoaufnahme</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={adaptSampleRate}
                onChange={(e) => setAdaptSampleRate(e.target.checked)}
                className="w-3.5 h-3.5 accent-omega-accent cursor-pointer"
              />
              <span>Echtzeitanpassung der Samplerate des aktuellen Projektes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={duckingEnabled}
                onChange={(e) => setDuckingEnabled(e.target.checked)}
                className="w-3.5 h-3.5 accent-omega-accent cursor-pointer"
              />
              <span>Automatische Lautstärkeabsenkung anderer Audiospuren ("Ducking")</span>
            </label>
          </div>

          {/* Absenkungsoptionen (Ducking) */}
          <div className={`flex flex-col gap-3.5 border border-[#3b3e45] rounded p-3 transition-opacity ${duckingEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <span className="font-semibold text-gray-400">Absenkungsoptionen</span>
            
            <div className="flex flex-col gap-2">
              <span className="text-gray-400">Stärke der Absenkung:</span>
              <div className="flex gap-6">
                {[6, 9, 12].map((db) => (
                  <label key={db} className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="radio"
                      name="duckingDb"
                      checked={duckingDb === db}
                      onChange={() => setDuckingDb(db)}
                      disabled={!duckingEnabled}
                      className="w-3.5 h-3.5 accent-omega-accent cursor-pointer"
                    />
                    <span>{db} dB</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-gray-400">Überblendungsdauer [sec]:</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span>Beginn:</span>
                  <input
                    type="text"
                    value={fadeInSec}
                    onChange={(e) => setFadeInSec(e.target.value.replace(/[^0-9.]/g, ''))}
                    disabled={!duckingEnabled}
                    className="w-12 h-5 bg-[#1a1d21] border border-[#3b3e45] rounded text-center text-white outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Ende:</span>
                  <input
                    type="text"
                    value={fadeOutSec}
                    onChange={(e) => setFadeOutSec(e.target.value.replace(/[^0-9.]/g, ''))}
                    disabled={!duckingEnabled}
                    className="w-12 h-5 bg-[#1a1d21] border border-[#3b3e45] rounded text-center text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={onlyVideoOriginal}
                onChange={(e) => setOnlyVideoOriginal(e.target.checked)}
                disabled={!duckingEnabled}
                className="w-3.5 h-3.5 accent-omega-accent cursor-pointer"
              />
              <span>Nur Originalton des Videos absenken</span>
            </label>
          </div>

        </div>

        {/* Fußzeile mit Buttons */}
        <div className="h-12 bg-[#1e2124] border-t border-[#3b3e45] flex items-center justify-end px-3 gap-2">
          <button
            onClick={handleSave}
            className="px-6 py-1 bg-omega-accent hover:bg-blue-500 text-white font-semibold rounded shadow transition-all duration-150 active:scale-95 text-xs"
          >
            OK
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#4a4d52] hover:bg-[#5c5f66] text-[#d1d5db] font-semibold rounded shadow transition-all duration-150 active:scale-95 text-xs"
          >
            Abbrechen
          </button>
        </div>

      </div>
    </div>
  );
}
