import React from 'react'

export function ManualModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[5000] p-8 animate-in fade-in duration-200">
      <div className="bg-[#282b30] border border-omega-border w-full max-w-4xl h-full rounded-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#1e2124] px-6 py-4 border-b border-gray-700 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white tracking-wide">Omega Wave Editor – Benutzerhandbuch</span>
           </div>
           <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✖</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 text-omega-text space-y-8 bg-[#1e2124]/50">
          
          <section>
            <h2 className="text-2xl font-bold text-omega-accent mb-4 border-b border-gray-700 pb-2">1. Einführung</h2>
            <p className="leading-relaxed text-gray-300">
              Willkommen beim <strong>Omega Wave Editor</strong>. Dieses Handbuch erklärt die grundlegenden Konzepte 
              und professionellen Workflows für die verlustfreie Audiobearbeitung.
              Der Editor ist für maximale Effizienz gebaut und nutzt im Hintergrund FFmpeg für schnelles, re-encode-freies Arbeiten.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-omega-accent mb-4 border-b border-gray-700 pb-2">2. Die Oberfläche (Workspace)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-black/20 p-4 rounded border border-gray-700">
                  <h3 className="font-bold text-white mb-2">Der Datei-Browser (Links)</h3>
                  <p className="text-sm text-gray-400">Navigieren Sie durch Ihre lokalen Festplatten. Ziehen Sie Audiodateien (WAV, MP3) oder Videodateien (MP4, MKV) per Drag & Drop direkt auf die Timeline. Bei Videos wird die Audiospur automatisch extrahiert.</p>
               </div>
               <div className="bg-black/20 p-4 rounded border border-gray-700">
                  <h3 className="font-bold text-white mb-2">Die Zeitleiste / Timeline (Unten)</h3>
                  <p className="text-sm text-gray-400">Ihr Haupt-Arbeitsbereich. Hier arrangieren, schneiden und mischen Sie Ihre Audio-Objekte auf beliebig vielen Spuren.</p>
               </div>
               <div className="bg-black/20 p-4 rounded border border-gray-700">
                  <h3 className="font-bold text-white mb-2">Das Effekte-Panel (Rechts)</h3>
                  <p className="text-sm text-gray-400">Echtzeit-DSP-Effekte (Digital Signal Processing). Hier finden Sie den 10-Band Equalizer, Kompressor, Hall, Delay und mehr. Effekte werden in Echtzeit berechnet.</p>
               </div>
               <div className="bg-black/20 p-4 rounded border border-gray-700">
                  <h3 className="font-bold text-white mb-2">Das VU-Meter</h3>
                  <p className="text-sm text-gray-400">Die Aussteuerungsanzeige oben rechts zeigt den Master-Pegel. Achten Sie darauf, dass der Balken nicht dauerhaft im roten Bereich ist, um Clipping zu vermeiden.</p>
               </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-omega-accent mb-4 border-b border-gray-700 pb-2">3. Schneiden und Arrangieren (Workflow)</h2>
            <p className="mb-4 text-gray-300">Der Omega Wave Editor ist optimiert für blitzschnelles Arbeiten. Nutzen Sie diese essenziellen Tastenkürzel:</p>
            <ul className="space-y-3 bg-[#1a1d21] p-6 rounded-lg border border-gray-800">
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono w-12 text-center">T</span> <span><strong>Objekt Zerschneiden:</strong> Teilt das angewählte Objekt exakt an der Position des roten Playheads.</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono w-12 text-center">Z</span> <span><strong>Anfang Entfernen:</strong> Löscht alles vom Anfang des Objekts bis zum Playhead.</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono w-12 text-center">U</span> <span><strong>Ende Entfernen:</strong> Löscht alles vom Playhead bis zum Ende des Objekts.</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono w-12 text-center">Entf</span> <span><strong>Löschen:</strong> Entfernt das angewählte Objekt komplett.</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono w-12 text-center">Space</span> <span><strong>Wiedergabe / Pause:</strong> Startet oder stoppt das Playback.</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono w-12 text-center">Strg+Z</span> <span><strong>Rückgängig:</strong> Macht den letzten Schnitt oder die letzte Bewegung rückgängig.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-omega-accent mb-4 border-b border-gray-700 pb-2">4. Audioaufnahme (Recording)</h2>
            <p className="leading-relaxed text-gray-300">
              Klicken Sie in der Werkzeugleiste auf das Mikrofon-Symbol. Der Editor fragt gegebenenfalls nach Berechtigungen für Ihr System-Mikrofon. 
              Während der Aufnahme pulsiert das Symbol rot. Ein erneuter Klick beendet die Aufnahme. Die erzeugte Audio-Datei wird auf Ihrem Desktop gespeichert und sofort als neues Objekt an den Beginn von Spur 1 gelegt.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-omega-accent mb-4 border-b border-gray-700 pb-2">5. Mixdown & Export</h2>
            <p className="leading-relaxed text-gray-300">
              Wenn Ihr Arrangement fertig ist, klicken Sie oben rechts auf <strong>"Mixdown Export"</strong>. 
              Wählen Sie Ihr gewünschtes Zielformat (WAV für höchste Qualität, MP3 für kompakte Dateigrößen) und die Bitrate. 
              Der Editor rechnet alle Spuren inklusive Lautstärkeanpassungen zusammen und rendert eine fertige Master-Datei auf Ihren Desktop.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="bg-[#1e2124] px-6 py-4 flex justify-end gap-2 border-t border-gray-700">
          <button 
            onClick={onClose} 
            className="px-8 py-2 bg-omega-accent hover:bg-blue-500 text-white text-sm rounded shadow transition-all font-bold"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  )
}
