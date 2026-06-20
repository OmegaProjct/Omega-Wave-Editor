# Omega Wave Editor – Masterplan Umsetzungsstand

Stand: 2026-06-20

Diese Datei dient als kompakter, token-sparender Projektanker fuer die weitere Umsetzung der anpassbaren Omega-Oberflaeche.  
Checkboxen zeigen den aktuell lokal belegten Stand im Worktree.

## 1. Waveform, Zoom und Editor-Praezision

- [x] Waveform-Rendering wurde praeziser und performanter gemacht
  - Renderer-Cache in `src/renderer/src/components/WaveformRenderer.tsx`
  - Debounce fuer Waveform-Requests
  - Schutz vor zu grossen Canvas-Bitmaps
- [x] Horizontaler Zoom wurde deutlich erweitert
  - sehr hohe Zoomstufen vorbereitet
  - Zoom-Skalierung vergroessert sich mit zunehmendem Zoom staerker
- [x] Zoom-Requests fuer die Waveform wurden deutlich feiner aufgeloest
  - Request-Pixel-Limit im Renderer angehoben
  - Analyse-Service kann mehr Punkte pro Fenster liefern
- [x] Sample-Modus springt jetzt deutlich frueher in die feinere Darstellung
  - aggressiverer Native-Window-Pfad
  - groesseres Limit fuer echte Sample-Antworten
- [x] Playhead-zentriertes Zoom-Verhalten wurde begonnen und fuer Playback-Scrollmodus vorbereitet
- [x] Auto-Scroll-Modus `Zentriert` ist im Timeline-Code eingebaut
- [ ] Feinschliff fuer maximale Sample-/Detailansicht ist verbessert, aber noch nicht endgueltig abgeschlossen
- [ ] Endgueltige visuelle Verifikation gegen Reaper / MAGIX / Audacity steht noch aus

## 2. Playback- und Playhead-Fixes

- [x] Seek waehrend laufender Wiedergabe setzt den Wiedergabe-Startpunkt jetzt neu
- [x] Playhead-Verschieben waehrend laufender Wiedergabe setzt beim Weiterlaufen den neuen Startpunkt
- [x] Centered-Playhead-Scrolllogik wurde im Playback-Pfad angebunden
- [x] `Zentriert` ist jetzt auch im sichtbaren Einstellungsdialog auswaehlbar
- [ ] Kompletter Runtime-Check aller Transportfaelle steht noch aus

## 3. Regler-Reset

- [x] Doppelklick auf Lautstaerke-Regler setzt auf Standardlautstaerke zurueck
- [x] Doppelklick auf Stereo-/Pan-Regler setzt auf Mitte zurueck
- [x] Gilt fuer Track-Regler und Master-Bereich

## 4. Toolbar-Manager in der Timeline

- [x] Sichtbare Toolbar oben in der Timeline ist wieder aktiv
- [x] Schloss fuer Sperr-/Bearbeitungsmodus ist sichtbar
- [x] Entsperrter Bearbeitungsmodus zeigt verschiebbare Griffe
- [x] Toolbar-Elemente koennen per Drag-and-Drop umsortiert werden
- [x] Trennlinien sind als eigene verschiebbare Toolbar-Tokens umgesetzt
- [x] Toolbar-Zustand wird lokal gespeichert
- [x] Eigene Toolbar-Elemente fuer `Play/Pause`, `Stop`, `Record`, `Zeit`, `Auswahl`, `Snap`, `Auto-Scroll`, `Gruppieren`, `Loesen`, `Gap-Close`, `Export`
- [x] Record ist als roter Punkt im Player-Bereich dargestellt
- [x] Sichtbarer Player-Bereich im aktuellen Timeline-Toolbar-Pfad enthaelt jetzt `Play/Pause`, `Stop` und `Record`
- [x] `Stop` setzt im sichtbaren Toolbar-Player direkt auf den Projektanfang zurueck
- [x] Der bisher grobe Player-/Aufnahmeblock wurde im sichtbaren Toolbar-Pfad jetzt in `Transport` und `Aufnahme` aufgeteilt
- [x] `Transport` und `Aufnahme` koennen damit sichtbar getrennt ein-/ausgeblendet, sortiert und mit Trennern versehen werden
- [x] Die bisherige History-Gruppe wurde im sichtbaren Toolbar-Pfad jetzt in `Undo` und `Redo` aufgeteilt
- [x] `Undo` und `Redo` koennen damit sichtbar getrennt ein-/ausgeblendet, sortiert und mit Trennern versehen werden
- [x] Die bisherige Snap-/Gruppierungsgruppe wurde im sichtbaren Toolbar-Pfad jetzt in `Snap`, `Gruppieren` und `Loesen` aufgeteilt
- [x] `Snap`, `Gruppieren` und `Loesen` koennen damit sichtbar getrennt ein-/ausgeblendet, sortiert und mit Trennern versehen werden
- [x] Der bisherige Zeit-/Auswahl-/Auto-Scroll-Block wurde im sichtbaren Toolbar-Pfad jetzt in `Zeit`, `Auswahl` und `Auto-Scroll` aufgeteilt
- [x] `Zeit`, `Auswahl` und `Auto-Scroll` koennen damit sichtbar getrennt ein-/ausgeblendet, sortiert und mit Trennern versehen werden
- [x] Die bisherige Werkzeug-Gruppe wurde im sichtbaren Toolbar-Pfad jetzt in `Auswahl` und `Schneiden` aufgeteilt
- [x] `Auswahl` und `Schneiden` koennen damit sichtbar getrennt ein-/ausgeblendet, sortiert und mit Trennern versehen werden
- [x] Rechtsklick-Kontextmenues fuer Toolbar-Elemente sind am sichtbaren Render-Pfad angebunden
- [x] Eigene Trennstriche koennen ueber Toolbar-Rechtsklick vor/nach Elementen eingeblendet werden
- [x] Toolbar-Farbzuweisungen werden lokal gespeichert
- [x] Sichtbare Trennstriche koennen per Rechtsklick wieder ausgeblendet werden
- [x] Toolbar-Kontextmenue bietet Reset auf Standardzustand
- [x] Toolbar-Elemente koennen gezielt ausgeblendet und wieder eingeblendet werden
- [x] Sichtbarer Toolbar-Manager-Button fuer die Symbolauswahl ist vorhanden
- [x] Toolbar-Manager zum Ein-/Ausblenden einzelner Symbole ist vorhanden
- [x] Im aktuellen Timeline-Renderpfad gibt es jetzt wieder einen sichtbaren `Symbole`-Button fuer die Bereichsauswahl
- [x] Die Reihenfolge der sichtbaren Toolbar-Bereiche kann im aktuellen `Symbole`-Manager jetzt bereits angepasst werden
- [x] Drop-Ziel beim Verschieben wird jetzt deutlich markiert
- [x] Gezogene Toolbar-Elemente werden waehrend des Verschiebens visuell abgesetzt
- [x] Toolbar-Manager wird relativ am `Symbole`-Button positioniert und im Viewport gehalten
- [x] `Symbole`-Button zeigt einen kompakten Sichtbarkeitszaehler als sichtbar/gesamt
- [x] Toolbar-Manager-Header zeigt sichtbare/gesamte Symbolanzahl
- [x] Sichtbarer Laufzeitcheck des `Symbole`-Buttons und des Toolbar-Managers wurde an der laufenden Electron-App durchgefuehrt
- [x] Reset ueber `Standard` schliesst den Toolbar-Manager jetzt sauber
- [x] Toolbar-Manager schliesst jetzt auch sauber per Klick ausserhalb und `Escape`
- [x] Toolbar-Popups sind gegen vorzeitiges Schliessen durch den globalen `mousedown`-Handler abgesichert
- [x] Toolbar-Kontextmenue wird jetzt im Viewport gehalten und nicht mehr so leicht abgeschnitten
- [x] Toolbar-Manager ist jetzt in logische Funktionsgruppen gegliedert
- [x] Toolbar-Manager zeigt pro Symbol eine kurze, besser verstaendliche Beschreibung
- [x] Toolbar-Manager zeigt jetzt pro Funktionsgruppe eigene Sichtbarkeitszaehler
- [x] Toolbar-Manager bietet jetzt Gruppen-Schnellaktionen fuer `Alle`, `Aus` und `Nur diese`
- [x] Langer Flaechentext im Bearbeitungsmodus wurde durch kompaktere Symbolverwaltung ersetzt
- [x] `Symbole`-Button zeigt jetzt sichtbar/gesamt direkt am Button
- [x] Toolbar-Manager bietet jetzt Schnellaktionen fuer `Alle einblenden`, `Reihenfolge Standard` und `Standard`
- [x] Symbolgruppen im sichtbaren Toolbar-Manager koennen jetzt direkt per Drag-and-Drop umsortiert werden
- [x] Der sichtbare Toolbar-Manager zeigt jetzt klare Einfuegelinien und ein hervorgehobenes Drag-Element waehrend des Verschiebens
- [x] Die sichtbare obere Timeline-Toolbar hat jetzt einen echten Sperr-/Bearbeitungsmodus mit Schloss
- [x] Im entsperrten Modus lassen sich die sichtbaren Toolbar-Gruppen jetzt direkt oben in der Toolbar ziehen
- [x] Die sichtbare obere Toolbar blendet im Bearbeitungsmodus Griffe und klare vertikale Drop-Markierungen ein
- [x] Toolbar-Buttons sind im entsperrten Modus gegen versehentliches Ausloesen gesichert und dienen nur dem Verschieben
- [x] Sichtbare Toolbar-Gruppen haben im Bearbeitungsmodus jetzt ein eigenes Rechtsklick-Kontextmenue
- [x] Das Toolbar-Kontextmenue kann Gruppen direkt ausblenden sowie an Anfang, Ende oder auf Standardposition setzen
- [x] Sichtbare Toolbar-Gruppen koennen jetzt direkte Trenner vor und nach der Gruppe einblenden oder entfernen
- [x] Trennerzustand der sichtbaren oberen Toolbar wird lokal gespeichert
- [x] Sichtbare Toolbar-Bausteine koennen jetzt im Bearbeitungsmodus direkt farblich markiert werden
- [x] Toolbar-Farbzuweisungen der sichtbaren oberen Toolbar werden lokal gespeichert
- [ ] Vollstaendige Einzelverschiebbarkeit aller zusaetzlichen Symbolgruppen ist noch nicht endgueltig abgeschlossen
- [ ] Laufzeitverifikation der Toolbar-Kontextmenues steht noch aus

## 5. Zeit- und Auswahlformate in der Toolbar

- [x] Handbuchtext in `src/renderer/src/components/ManualModal.tsx` beschreibt Zeit-/Auswahlformate bereits
- [x] Grundlegende Formatlogik fuer Zeit-/Auswahlanzeige ist in `src/renderer/src/components/Timeline.tsx` angelegt
- [x] Eigene Format-Auswahlzustände fuer `Zeit` und `Auswahl` werden lokal gespeichert
- [x] Dropdown-Renderlogik fuer die Toolbar ist im Code vorhanden
- [x] Sichtbare Toolbar-Felder fuer `Zeit`, `Auswahl` und `Auto-Scroll` sind jetzt im aktuellen Timeline-Toolbar-Renderpfad vorhanden
- [x] Sichtbarer `Auto-Scroll`-Modus `Zentriert` ist jetzt im aktuellen Timeline-Toolbar-Renderpfad auswaehlbar
- [x] Geplante Formate im Code:
  - Sekunden
  - Sekunden + Millisekunden
  - `hh:mm:ss`
  - `dd:hh:mm:ss`
  - `hh:mm:ss + Hundertstel`
  - `hh:mm:ss + Millisekunden`
  - `hh:mm:ss + Samples`
  - Samples
  - Film-/NTSC-/PAL-/CDDA-Frames
- [x] Lokaler `npm run typecheck` nach der Zeitformat-Implementierung ist erfolgreich
- [ ] Laufzeitverifikation der Dropdown-Menues steht noch aus
- [ ] Eventuelles Feintuning fuer NTSC-Dropframe-Darstellung steht noch aus

## 6. Docking, Pop-outs und Layout-Presets

- [x] Pop-out-Fenster fuer Import/Player, Effekte und Timeline sind vorhanden
- [x] Gespeicherte Pop-out-Bounds werden geladen und wiederhergestellt
- [x] Hauptfenster-Bounds koennen gelesen und gesetzt werden
- [x] Layout-Presets speichern Panel-Splits, Pop-out-Zustaende und Fenster-Bounds
- [x] Fenster-Menue fuer Speichern / Laden / Reset / Dock-All ist vorhanden
- [x] Layout-Presets sichern jetzt auch die Bounds des Hauptfensters fuer Mehrmonitor-Setups
- [x] Die aktive gespeicherte Fensteransicht wird jetzt im `Fenster`-Menue sichtbar markiert
- [x] Der aktive Name einer geladenen oder gespeicherten Fensteransicht wird lokal mitgefuehrt
- [x] Die aktive gespeicherte Fensteransicht kann direkt aus dem `Fenster`-Menue heraus aktualisiert werden
- [x] Fenster-Bounds werden beim Wiederherstellen auf sichtbare Monitore begrenzt
- [x] Mehrmonitor-faehige Bounds-Sanitisierung ist eingebaut
- [x] Snap-/Andocklogik fuer externe Fenster wurde begonnen und erweitert
- [x] Interne Resize-Handles zeigen jetzt sichtbares Snap-Feedback beim Andocken der Hauptbereiche
- [x] Live-Andockhilfe zeigt beim Ziehen jetzt auch die naechste Zielaufteilung der Hauptbereiche
- [ ] Magnetisches internes Andocken der drei Hauptbereiche braucht weiteren UX-Feinschliff
- [ ] Endgueltiger Mehrmonitor-Runtime-Test steht noch aus

## 7. Stabilitaet und technische Nacharbeiten

- [x] Endlosschleife / `Maximum update depth exceeded` in `App.tsx` wurde abgesichert
- [x] Veraltete `slider-vertical`-Warnungen wurden entfernt
- [x] Lokaler `npm run typecheck` lief erfolgreich nach den letzten Toolbar-/Timeline-Aenderungen
- [x] Renderer-seitige Waveform-Caches und Debounce helfen gegen weisse Canvas beim schnellen Zoomen
- [x] Voller `npm run build` laeuft wieder erfolgreich durch
- [x] Native `omega_vst_host.node` liess sich wieder neu bauen

## 8. Dokumentation

- [x] Handbuch (`ManualModal.tsx`) enthaelt bereits Workspace-/Toolbar-/Pop-out-Hinweise
- [ ] Nach finaler Toolbar- und Zeitformat-Verifikation Handbuchtext nochmals auf Ist-Stand abgleichen

## 9. Empfohlene naechste Schritte

1. Laufzeitcheck der neuen Zeit-/Auswahlformat-Dropdowns
2. Toolbar- und Zeitformat-Wege weiter zur Laufzeit verifizieren
3. Internes Docking-/Snap-Feintuning fuer Panels und Pop-outs weiter verifizieren
4. Letzte Zoom-/Waveform-Feinabstimmung fuer maximale Detailansicht machen
5. Handbuch nach finaler UI-Verifikation auf den echten Ist-Stand nachziehen
