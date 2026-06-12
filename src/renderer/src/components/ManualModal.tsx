import React from 'react'
import { useTranslation } from 'react-i18next'

export function ManualModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const isPopout = new URLSearchParams(window.location.search).get('window') === 'manual';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[5000] p-8 animate-in fade-in duration-200">
      <div className="bg-[#24272c] border border-gray-700/60 w-full max-w-4xl h-full rounded-xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md">
        
        {/* Header */}
        <div className="bg-[#1a1d21]/60 px-6 py-4 border-b border-gray-800/80 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white tracking-wide">
                {t('manual.title', { defaultValue: 'Omega Wave Editor – Benutzerhandbuch' })}
              </span>
           </div>
           {!isPopout && (
             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">✖</button>
           )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 text-gray-300 space-y-8 bg-[#1e2124]/30 custom-scrollbar">
          
          {/* 1. Einführung */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec1_title', { defaultValue: '1. Einführung' })}
            </h2>
            <p className="leading-relaxed text-gray-300 text-sm">
              {t('manual.sec1_text', { defaultValue: 'Willkommen beim Omega Wave Editor. Dieses Handbuch erklärt die grundlegenden Konzepte und professionellen Workflows für die verlustfreie Audiobearbeitung. Der Editor ist für maximale Effizienz gebaut und nutzt im Hintergrund FFmpeg für schnelles, re-encode-freies Arbeiten.' })}
            </p>
          </section>

          {/* 2. Die Oberfläche */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec2_title', { defaultValue: '2. Die Oberfläche (Workspace)' })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-black/20 p-4.5 rounded border border-gray-800/85">
                  <h3 className="font-bold text-white text-sm mb-2">
                    {t('manual.sec2_panel1_title', { defaultValue: 'Der Datei-Browser (Links)' })}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t('manual.sec2_panel1_desc', { defaultValue: 'Navigieren Sie durch Ihre lokalen Festplatten. Ziehen Sie Audiodateien (WAV, MP3, FLAC etc.) oder Videodateien (MP4, MKV) per Drag & Drop direkt auf die Zeitleiste. Bei Videos wird die Audiospur automatisch verlustfrei extrahiert.' })}
                  </p>
               </div>
               <div className="bg-black/20 p-4.5 rounded border border-gray-800/85">
                  <h3 className="font-bold text-white text-sm mb-2">
                    {t('manual.sec2_panel2_title', { defaultValue: 'Die Zeitleiste / Timeline (Unten)' })}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t('manual.sec2_panel2_desc', { defaultValue: 'Ihr Haupt-Arbeitsbereich. Hier arrangieren, schneiden und mischen Sie Ihre Audio-Objekte auf beliebig vielen Spuren. Nutzen Sie die Fading-Punkte am Anfang und Ende jedes Clips für nahtlose Ein- und Ausblendungen.' })}
                  </p>
               </div>
               <div className="bg-black/20 p-4.5 rounded border border-gray-800/85">
                  <h3 className="font-bold text-white text-sm mb-2">
                    {t('manual.sec2_panel3_title', { defaultValue: 'Das Effekte-Panel (Rechts)' })}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t('manual.sec2_panel3_desc', { defaultValue: 'Echtzeit-DSP-Effekte (Digital Signal Processing). Hier finden Sie den 10-Band Equalizer, Kompressor, Hall, Delay und mehr. Effekte werden in Echtzeit berechnet und lassen sich spurenweise regeln.' })}
                  </p>
               </div>
               <div className="bg-black/20 p-4.5 rounded border border-gray-800/85">
                  <h3 className="font-bold text-white text-sm mb-2">
                    {t('manual.sec2_panel4_title', { defaultValue: 'Das VU-Meter & Mixer' })}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t('manual.sec2_panel4_desc', { defaultValue: 'Die Aussteuerungsanzeige oben rechts zeigt den Master-Pegel. Nutzen Sie die Mute- und Solo-Schalter an den Spurköpfen sowie die Lautstärkenfader für eine feine Balance Ihres Mixdowns.' })}
                  </p>
               </div>
            </div>
          </section>

          {/* 3. Schneiden und Arrangieren */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec3_title', { defaultValue: '3. Schneiden und Arrangieren (Workflow)' })}
            </h2>
            <p className="mb-4 text-gray-300 text-sm">
              {t('manual.sec3_subtitle', { defaultValue: 'Der Omega Wave Editor ist optimiert für blitzschnelles Arbeiten. Nutzen Sie diese essenziellen Tastenkürzel:' })}
            </p>
            <ul className="space-y-3 bg-[#16181b]/90 p-5 rounded-lg border border-gray-800/80 font-sans text-xs">
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">T</span> <span><strong>{t('manual.sec3_kcheck1_bold', { defaultValue: 'Objekt Zerschneiden:' })}</strong> {t('manual.sec3_kcheck1_text', { defaultValue: 'Teilt das angewählte Objekt exakt am roten Playhead. Ist kein Objekt selektiert, werden alle übereinanderliegenden Clips unter dem Playhead zerschnitten.' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">Z</span> <span><strong>{t('manual.sec3_kcheck2_bold', { defaultValue: 'Anfang trimmen:' })}</strong> {t('manual.sec3_kcheck2_text', { defaultValue: 'Löscht alles vom Anfang des Objekts bis zur Position des Playheads.' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">U</span> <span><strong>{t('manual.sec3_kcheck3_bold', { defaultValue: 'Ende trimmen:' })}</strong> {t('manual.sec3_kcheck3_text', { defaultValue: 'Löscht alles ab der Position des Playheads bis zum Ende des Objekts.' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">Entf</span> <span><strong>{t('manual.sec3_kcheck4_bold', { defaultValue: 'Löschen:' })}</strong> {t('manual.sec3_kcheck4_text', { defaultValue: 'Entfernt das angewählte Objekt oder die ausgewählte Spur komplett aus dem Projekt.' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">Leertaste</span> <span><strong>{t('manual.sec3_kcheck5_bold', { defaultValue: 'Start / Stopp:' })}</strong> {t('manual.sec3_kcheck5_text', { defaultValue: 'Startet oder pausiert das Playback global (auch wenn Regler oder Equalizer fokussiert sind).' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">Strg + Z</span> <span><strong>{t('manual.sec3_kcheck6_bold', { defaultValue: 'Rückgängig:' })}</strong> {t('manual.sec3_kcheck6_text', { defaultValue: 'Macht den letzten Schnitt oder die letzte Verschiebung rückgängig.' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">Pfeil runter</span> <span><strong>{t('manual.sec3_kcheck7_bold', { defaultValue: 'Anhalten und verbleiben / Start setzen:' })}</strong> {t('manual.sec3_kcheck7_text', { defaultValue: 'Stoppt die Wiedergabe sofort und hält den Playhead an dieser Position (während Wiedergabe). Setzt den Rücksprungpunkt im Stillstand.' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">K</span> <span><strong>{t('manual.sec3_kcheck8_bold', { defaultValue: 'Start / Pause ab Position:' })}</strong> {t('manual.sec3_kcheck8_text', { defaultValue: 'Startet das Abspielen ab der aktuellen Position oder pausiert die Wiedergabe.' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">J</span> <span><strong>{t('manual.sec3_kcheck9_bold', { defaultValue: 'Rückwärts / Bremsen:' })}</strong> {t('manual.sec3_kcheck9_text', { defaultValue: 'Rückwärts abspielen (erhöht Tempo bis -5.0x). Wenn vorwärts abgespielt wird, bremst J das Tempo stufenweise ab (5x -> 4x -> 3x -> 2x -> 1.5x -> 1x -> Rückwärts).' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">L</span> <span><strong>{t('manual.sec3_kcheck10_bold', { defaultValue: 'Vorwärts / Bremsen:' })}</strong> {t('manual.sec3_kcheck10_text', { defaultValue: 'Vorwärts abspielen (erhöht Tempo bis 5.0x). Wenn rückwärts abgespielt wird, bremst L das Tempo stufenweise ab (-5x -> -4x -> -3x -> -2x -> -1.5x -> -1x -> Vorwärts).' })}</span></li>
               <li className="flex items-center gap-4"><span className="bg-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono w-14 text-center select-none font-bold">Pfeil L / R</span> <span><strong>{t('manual.sec3_kcheck11_bold', { defaultValue: 'Vor- & Zurückspringen:' })}</strong> {t('manual.sec3_kcheck11_text', { defaultValue: 'Springt im Projekt vor oder zurück. Sprungweiten sind in den Einstellungen konfigurierbar.' })}</span></li>
            </ul>
          </section>

          {/* 4. Selektions-Export & Metadaten */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec4_title', { defaultValue: '4. Selektions-Export & Metadaten (ID3 / Vorbis)' })}
            </h2>
            <p className="leading-relaxed text-gray-300 text-sm mb-4">
              {t('manual.sec4_subtitle', { defaultValue: 'Für einen maßgeschneiderten Mixdown-Export stehen Ihnen hochentwickelte Werkzeuge direkt zur Verfügung:' })}
            </p>
            <div className="space-y-4">
              <div className="bg-black/20 p-4 rounded border border-gray-800">
                <h4 className="font-bold text-white text-xs mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-sm inline-block"></span>
                  {t('manual.sec4_block1_title', { defaultValue: 'Selektionsbasierter Export (Blauer Balken)' })}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('manual.sec4_block1_desc', { defaultValue: 'Durch Klicken und Ziehen am oberen Rand des Zeitlineals (Ruler) können Sie eine Export-Markierung definieren (visualisiert als blauer Balken über der Timeline). Aktivieren Sie im Export-Dialog die Option „Nur markierten Bereich exportieren“, um den Mixdown mathematisch exakt auf diese Spanne zu beschränken. Ein Doppelklick auf das Lineal löscht die Selektion wieder.' })}
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded border border-gray-800">
                <h4 className="font-bold text-white text-xs mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-sm inline-block"></span>
                  {t('manual.sec4_block2_title', { defaultValue: 'Formatgerechte Metadaten & Cover-Art-Import' })}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('manual.sec4_block2_desc', { defaultValue: 'Beim Exportieren können Sie Metadaten (Titel, Interpret, Album, Jahr, Genre) eintragen. Das Programm schreibt automatisch das formatkonforme Tag-System (ID3v2 für MP3/WAV, Vorbis Comments für FLAC/OGG/OPUS/M4A). Sie können zudem lokale Bilddateien (.jpg, .png) als Album-Cover importieren, welche ohne Qualitätsverlust der Zieldatei beigefügt werden.' })}
                </p>
              </div>
            </div>
          </section>

          {/* 5. Audioaufnahme */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec5_title', { defaultValue: '5. Audioaufnahme (Recording)' })}
            </h2>
            <p className="leading-relaxed text-gray-300 text-sm">
              {t('manual.sec5_text', { defaultValue: 'Klicken Sie in der Werkzeugleiste auf das Mikrofon-Symbol. Der Editor fragt gegebenenfalls nach Berechtigungen für Ihr System-Mikrofon. Während der Aufnahme pulsiert das Symbol rot. Ein erneuter Klick beendet die Aufnahme. Die erzeugte Audio-Datei wird auf Ihrem Desktop gespeichert und sofort als neues Objekt an den Beginn von Spur 1 gelegt.' })}
            </p>
          </section>

          {/* 6. MIDI-Steuerung */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec6_title', { defaultValue: '6. MIDI-Steuerung & MIDI-Learn Pro' })}
            </h2>
            <p className="leading-relaxed text-gray-300 text-sm mb-4">
              {t('manual.sec6_subtitle', { defaultValue: 'Steuern Sie den Omega Wave Editor bequem mit externer Hardware (Keyboards, Pad-Controller, Mischpulte) über die integrierte Web MIDI API:' })}
            </p>
            <ul className="space-y-3 bg-[#16181b]/90 p-5 rounded-lg border border-gray-800/80 font-sans text-xs">
              <li className="leading-relaxed">
                <strong>{t('manual.sec6_li1_bold', { defaultValue: 'Zuweisbare Funktionen:' })}</strong> {t('manual.sec6_li1_text', { defaultValue: 'Neben klassischen Transport-Tasten und Kanal-Lautstärken können Sie nun auch die Timeline fernsteuern: Timeline Spulen (Jog-Wheel), Timeline Zoom, Timeline Scrubbing sowie Metronom Ein/Aus.' })}
              </li>
              <li className="leading-relaxed">
                <strong>{t('manual.sec6_li2_bold', { defaultValue: 'MIDI-Ausgangsrouting:' })}</strong> {t('manual.sec6_li2_text', { defaultValue: 'Im MIDI-Einstellungsmenü können Sie neben dem Eingang auch ein MIDI-Ausgangsgerät auswählen, um visuelles Feedback, Motorfader-Steuerungen oder MIDI-Clock Signale an Ihre Hardware zurückzugeben.' })}
              </li>
              <li className="leading-relaxed">
                <strong>{t('manual.sec6_li3_bold', { defaultValue: 'MIDI-Learn (Einfache Zuweisung):' })}</strong> {t('manual.sec6_li3_text', { defaultValue: 'Öffnen Sie das Einstellungsfenster (Reiter „MIDI“). Klicken Sie neben einer Funktion auf den Button „Learn“ (blinkt rot) und bewegen Sie einfach das gewünschte Rädchen, den Fader oder die Taste an Ihrem Hardware-Gerät. Die Zuweisung wird sofort erkannt und dauerhaft gespeichert.' })}
              </li>
              <li className="leading-relaxed">
                <strong>{t('manual.sec6_li4_bold', { defaultValue: 'Echtzeit-Feedback:' })}</strong> {t('manual.sec6_li4_text', { defaultValue: 'Alle Mappings arbeiten absolut verzögerungsfrei und spiegeln Ihre Handbewegungen präzise in der Benutzeroberfläche wider.' })}
              </li>
            </ul>
          </section>

          {/* 7. Software-Updates */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec7_title', { defaultValue: '7. Automatische Software-Updates' })}
            </h2>
            <p className="leading-relaxed text-gray-300 text-sm">
              {t('manual.sec7_text', { defaultValue: 'Der integrierte Software-Updater sucht bei jedem Programmstart im Hintergrund nach Aktualisierungen. Ist eine neue Version vorhanden, öffnet sich ein übersichtlicher Dialog. Dank der HandBrake-Style Changelog-Aggregation werden Ihnen alle Versionsnotizen der übersprungenen Zwischenversionen übersichtlich aufgelistet, so dass Sie immer genau wissen, welche Features hinzugekommen sind, während der Download im Hintergrund läuft.' })}
            </p>
          </section>

          {/* 8. Audio-Einstellungen, VST-Rack & VST-Store */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec8_title', { defaultValue: '8. Audio-Einstellungen, VST-Rack & VST-Store' })}
            </h2>
            <div className="space-y-4">
              <div className="bg-black/20 p-4 rounded border border-gray-800">
                <h4 className="font-bold text-white text-xs mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-sm inline-block"></span>
                  {t('manual.sec8_block1_title', { defaultValue: 'Audiotreiberauswahl (ASIO, Direct-Sound, Wave)' })}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('manual.sec8_block1_desc', { defaultValue: 'Öffnen Sie das Einstellungsfenster (Reiter „Wiedergabe“). Hier können Sie Ihren bevorzugten Treibertyp festlegen. Nutzen Sie ASIO-Treiber für professionelle Hardware mit extrem geringer Latenz. Zusätzlich können Sie die Anzahl der Audiopuffer (Buffer Count) präzise anpassen, um Knackser und Aussetzer bei anspruchsvollen Projekten zu eliminieren.' })}
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded border border-gray-800">
                <h4 className="font-bold text-white text-xs mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-sm inline-block"></span>
                  {t('manual.sec8_block2_title', { defaultValue: '🎛️ VST Signal Chain & Parameter MIDI Learn' })}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('manual.sec8_block2_desc', { defaultValue: 'Über das neue VST Rack im rechten Effekte-Panel können Sie geladene Synthesizer und Mixing-Effekte in einer Signal-Chain verketten. Jeder Parameter (wie z. B. Cutoff, Resonance, Attack, Dry/Wet) besitzt einen eigenen „Lernen“ (MIDI Learn) Button. Klicken Sie darauf und bewegen Sie einen Regler an Ihrem Controller, um diesen Parameter in Echtzeit zu steuern! Fader-Bewegungen werden flüssig in der UI animiert. Ein Klick auf das Zurücksetzen-Symbol ↺ setzt den Parameter auf seinen Standardwert zurück.' })}
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded border border-gray-800">
                <h4 className="font-bold text-white text-xs mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-sm inline-block"></span>
                  {t('manual.sec8_block3_title', { defaultValue: '🏪 VST Store (Kuratierte Freeware)' })}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t('manual.sec8_block3_desc', { defaultValue: 'Keine Plugins installiert? Der integrierte VST-Katalog zeigt empfohlene kostenlose Plugins mit ehrlicher Kompatibilitätsanzeige. Downloads und Installationen laufen nicht in der App, sondern manuell über die verlinkten Herstellerseiten.' })}
                </p>
              </div>
            </div>
          </section>

          {/* 9. Diagnose & Fehleranalyse */}
          <section>
            <h2 className="text-xl font-bold text-omega-accent mb-4 border-b border-gray-800 pb-2">
              {t('manual.sec9_title', { defaultValue: '9. Diagnose & Fehleranalyse' })}
            </h2>
            <p className="leading-relaxed text-gray-300 text-sm">
              {t('manual.sec9_text', { defaultValue: 'Der Editor verfügt über ein integriertes Diagnose-Protokollierungssystem (Logging). Alle Hintergrundprozesse, FFmpeg-Aufrufe, VST-Bridge-Interaktionen und Timeline-Änderungen (Verschiebungen um Millisekunden, Splits, Gain-Änderungen) werden lückenlos aufgezeichnet. Über das Hilfe-Menü -> „Diagnose-Protokolle...“ können Sie das Protokollfenster öffnen, um Logs zu filtern, in die Zwischenablage zu kopieren oder den Speicherordner zu öffnen.' })}
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="bg-[#1a1d21]/60 px-6 py-4 flex justify-end gap-2 border-t border-gray-800/80 select-none">
          <button 
            onClick={onClose} 
            className="px-8 py-2 bg-omega-accent hover:bg-blue-500 text-white text-xs rounded-lg shadow-lg hover:shadow-omega-accent/20 transition-all font-bold active:scale-[0.98]"
          >
            {t('common.understood', { defaultValue: 'Verstanden' })}
          </button>
        </div>
      </div>
    </div>
  )
}
