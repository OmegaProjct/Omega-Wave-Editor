import React, { useState, useEffect } from 'react'
import { Github, Heart, Info, X } from 'lucide-react'
import appIcon from '../assets/app_icon.png'

interface AboutModalProps {
  onClose: () => void
}

export function AboutModal({ onClose }: AboutModalProps) {
  const [version, setVersion] = useState('0.7.5')

  useEffect(() => {
    async function loadVersion() {
      try {
        const ver = await window.api.getAppVersion()
        if (ver) setVersion(ver)
      } catch (e) {
        console.error('Fehler beim Laden der App-Version:', e)
      }
    }
    loadVersion()
  }, [])

  const handleOpenLink = (url: string) => {
    window.api.openExternal(url)
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[5000] animate-in fade-in duration-200">
      <div className="bg-[#24272c]/95 border border-gray-700/60 w-[460px] rounded-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md">
        
        {/* Header */}
        <div className="bg-[#1a1d21]/60 px-5 py-3.5 border-b border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="text-omega-accent" size={18} />
            <span className="text-xs font-bold uppercase tracking-wider text-omega-accent">Über das Programm</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-7 flex flex-col items-center text-center">
          {/* Logo / Icon */}
          <img
            src={appIcon}
            alt="Omega Wave Editor Logo"
            className="h-16 w-16 object-contain rounded-xl mb-4 select-none shadow-[0_0_15px_rgba(30,144,255,0.15)]"
          />

          <h2 className="font-bold text-xl text-white tracking-tight mb-1 select-none">Omega Wave Editor</h2>
          <span className="text-xs font-mono bg-[#16181b] border border-gray-800 text-gray-400 px-2.5 py-0.5 rounded-full select-none mb-5">
            v{version}
          </span>

          <p className="text-xs text-gray-300 leading-relaxed mb-6 px-3">
            Ein verlustfreier, schneller Audio-Editor für professionelles Arrangieren, präzises Schneiden und effektives Spuren-Mischen.
          </p>

          {/* Links & Buttons */}
          <div className="w-full flex flex-col gap-2.5 mt-2">
            {/* GitHub Repository Link */}
            <button
              onClick={() => handleOpenLink('https://github.com/OmegaProjct/Omega-Wave-Editor')}
              className="w-full py-2 px-4 bg-[#16181b] hover:bg-gray-800 text-white text-xs rounded-lg border border-gray-800/80 shadow-md flex items-center justify-center gap-2 font-medium transition-all duration-150 active:scale-[0.98]"
            >
              <Github size={14} className="text-gray-300" />
              <span>GitHub Repository öffnen</span>
            </button>

            {/* Support PayPal Link */}
            <button
              onClick={() => handleOpenLink('https://www.paypal.com/paypalme/OmegaProjects')}
              className="w-full py-2 px-4 bg-[#1d273a] hover:bg-[#233149] text-blue-300 hover:text-blue-200 text-xs rounded-lg border border-[#2b3c58] shadow-md flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.98]"
            >
              <Heart size={14} className="text-pink-400 fill-pink-500/20" />
              <span>Projekt unterstützen (PayPal)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a1d21]/60 px-5 py-3.5 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500 font-sans select-none">
          <span>© 2026 Omega Projects</span>
          <span className="hover:text-omega-accent cursor-pointer transition-colors" onClick={() => handleOpenLink('mailto:omegaproject1337@gmail.com')}>
            Support kontaktieren
          </span>
        </div>

      </div>
    </div>
  )
}
