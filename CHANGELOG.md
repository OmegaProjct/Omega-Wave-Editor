# Changelog

The format is based on Keep a Changelog. Dieses Projekt nutzt das klassische Semantic Versioning (`X.Y.Z`).

## [0.6.2] - 2026-05-31

### Changed
- **Export-Selektion (Blauer Balken)**: Ein Linksklick sowie ein Rechtsklick im blauen Selektionsstreifen markieren nun immer konsistent vom Anfang des Projekts (0.0s) bis zur Klickposition. Ein Doppelklick löscht die Selektion weiterhin zuverlässig.

### Fixed
- **Playhead-Diamant perfekt zentriert**: Die vertikale Ausrichtung des roten Abspielkopfs wurde auf `top-[22px]` angepasst, wodurch der gedrehte Diamant nun mathematisch und visuell exakt auf der Mittelachse des Timecode-Rulers zentriert ist und nicht mehr am oberen blauen Streifen klebt.
- **Spur-unabhängiges Lücken schließen**: Die Funktion „Lücken schließen“ wurde komplett überarbeitet und arbeitet nun Spur für Spur unabhängig. Clips auf den einzelnen Spuren werden chronologisch sortiert und lückenlos von 0.0s beginnend aneinandergereiht, anstatt sich durch Clips auf anderen Spuren zu blockieren.

## [0.6.1] - 2026-05-31

### Fixed
- **Blauer Balken läuft nicht mehr mit dem Playhead mit**: Der blaue Streifen ist nun vollständig vom Abspielkopf entkoppelt und dient ausschließlich als eigenständiges Export-Selektionswerkzeug.
- **Ruler-Klick-Verhalten korrigiert**: Ein Linksklick im Zeitlineal setzt nur noch den Startpunkt der Exportmarkierung, ohne den Abspielkopf zu verschieben. Der Abspielkopf wird weiterhin ausschließlich über das rote Diamant-Handle bewegt.
- **Doppelklick löscht Selektion zuverlässig**: Ein `rulerDoubleClickPendingRef`-Guard verhindert, dass der `mouseDown`-Handler beim Doppelklick sofort eine neue Selektion setzt und die Löschung überschreibt.
- **Export-Selektion als Streifen oberhalb des Rulers**: Die Exportmarkierung wird nun als dedizierter 8px-Streifen direkt über dem Timecode-Ruler dargestellt (solider blauer Balken), anstatt als halbtransparente Fläche innerhalb des Rulers. Im Ruler selbst erscheint nur noch ein kompaktes Timecode-Badge mit der Selektionsdauer.
- **Selektions-Overlay auf Trackfläche**: Der markierte Exportbereich wird zusätzlich als halbtransparenter blauer Overlay über allen Tracks visualisiert.

## [0.6.0] - 2026-05-30

### Added
- **Immer sichtbare Fade-Handles**: Die kreisförmigen Anfass-Punkte für Fade-in und Fade-out an jedem Audio-Clip in der Timeline sind nun dauerhaft sichtbar und müssen nicht mehr per Klick aktiviert werden.
- **Halbe Wellenformdarstellung**: Neue Einstellung im Reiter „Import/Audio" der Programmeinstellungen, um die Wellenformdarstellung von Audio-Clips zwischen der vollen (symmetrischen) und der einseitig-halben (unten ausgerichteten) Ansicht zu wechseln.
- **Ruler-Exportmarkierung**: Durch Linksklick auf das Zeitlineal wird der Startpunkt der Exportauswahl gesetzt, per Rechtsklick der Endpunkt. Ein blauer Balken mit Klammer-Markierungen und Dauerzeilanzeige visualisiert den markierten Bereich. Ein Doppelklick löscht die gesamte Auswahl.
- **Selektionsbasierter Export**: Im Export-Dialog gibt es eine neue Checkbox „Nur markierten Bereich exportieren", die den Mixdown auf die im Ruler definierte Zeitspanne begrenzt.
- **Stille-Lücken-Warnung**: Wenn vor dem ersten Audio-Clip eine stille Pause liegt, erscheint beim Exportieren ein Warn-Dialog mit den Optionen „Ignorieren", „Zur Lücke springen" und „Abbrechen". Diese Warnung kann dauerhaft deaktiviert werden.
- **Einzelspur-Export (Mixdown)**: Im Rechtsklick-Kontextmenü einer Spur steht nun ganz oben „Spur exportieren (Mixdown)...", mit dem jede Spur separat in alle unterstützten Formate (inkl. MP3 mit ID3-Tags) exportiert werden kann.
- **Exporteinstellungen-Persistenz**: Alle Exporteinstellungen (Format, Bitrate, Preset, Versionierung, Abspielen nach Export, Selektions-Export, etc.) werden im Projekt gespeichert und beim erneuten Öffnen des Dialogs wiederhergestellt.

### Fixed
- **handleSaveAndClose mit korrekten Projektdaten**: Das Speichern beim Schließen des Fensters delegiert nun an die Timeline-interne SAVE_PROJECT-Aktion, sodass alle Sitzungsdaten (exportSettings, Zoomebene, Abspielkopf-Position, Samplerate) korrekt in der `.owep`-Datei persistiert werden.
- **Seek-Timeline aus Export-Popup**: Klicken auf „Zur Lücke springen" im Stille-Lücken-Warndialog springt nun korrekt zum entsprechenden Zeitpunkt in der Timeline der Hauptapplikation.
- **Signatur-Konsistenz (openExportSettings)**: Alle Aufrufstellen von `openExportSettings` (Tastaturkürzel, Menüleiste, Timeline-Schaltfläche) übergeben nun korrekt Selektion und Exporteinstellungen gemäß der aktualisierten IPC-Schnittstelle.

## [0.5.6] - 2026-05-30

### Fixed
- **Popout-Exportfenster Spurendaten**: Behebung des Fehlers, bei dem die Checkbox „Im Import-Ordner speichern“ im separaten Export-Dialog ausgeblendet war. Durch asynchrones Laden der Spurendaten über IPC (`get-export-tracks`) ist die Import-Quellerkennung nun auch im Popout-Modus voll funktionsfähig.
- **Update-Shutdown-Race-Condition**: Der Updater wartet mit dem Start des Installers/Uninstallers nun sicher ab, bis das Hauptprogramm regulär geschlossen wurde und offene Projekte gespeichert/abgefragt wurden, um störende Überlagerungen zu vermeiden.
- **Sanitisierung des Uninstaller-Dialogs**: Im NSIS-Uninstaller wurde die Abfrage zur Löschung der persönlichen Einstellungen so abgesichert, dass sie bei automatischen (stummen) Updates im Hintergrund übersprungen wird, um Datenverlust und störende Popups zu verhindern.

### Added
- **DAW Performance-Monitor (System-CPU)**: Im Footer wird neben der CPU-Auslastung der App nun auch die Gesamtlast des PCs (System-CPU) symmetrisch und live angezeigt.

## [0.5.5] - 2026-05-30
### Fixed
- **Playhead-Visualisierung (Ziehbereich & Layering)**: Der manuelle Ziehbereich des Markers per Maus wurde mathematisch auf das Spur-Raster eingegrenzt (Drag Clamping), um ein Hinausziehen über die vertikale Scrollleiste zu unterbinden. Zudem wurde die Tiefenebene (Z-Index) der statischen Seiten-Spalten auf `z-[160]` erhöht, um den Playhead beim Scrollen oder Versetzen dahinter perfekt zu maskieren.

### Added
- **Erweiterter Dateiexport (Import-Ordner & Versionierung)**:
  - Checkbox zum dynamischen Ändern des Exportpfades in den Quellordner des ersten importierten Tracks.
  - Checkbox für fortlaufende Dateiversionierung (`_v1`, `_v2` etc.) bei Namensgleichheit im Zielordner.
  - Blockierungsfreies, modernes Sicherheits-Overlay zur Abfrage einer Bestätigung vor dem Überschreiben existierender Dateien (falls keine Versionierung aktiv ist).

## [0.5.4] - 2026-05-30
### Fixed
- **Playhead-Visualisierung (Höhe)**: Die Behebung des Überhangs wurde direkt im aktiven Playhead von `Timeline.tsx` verankert, sodass der rote Marker die untere Toolbar (Zoom-Menü und Buttons) garantiert nicht mehr überlappt.

### Added
- **Live-Seeking während der Wiedergabe**: Das Klicken oder Ziehen auf dem Zeitlineal (Ruler) pausiert die Wiedergabe nun geräuschlos und setzt sie beim Loslassen nahtlos von der neuen Position aus fort, ohne manuell auf Pause drücken zu müssen.

## [0.5.3] - 2026-05-30
### Fixed
- **Playhead-Visualisierung**: Die vertikale rote Abspiellinie wurde so begrenzt, dass sie oberhalb der Scrollbar und der Zoom-Steuerung am unteren Rand endet.
- **Spacebar-Wiedergabeverhalten & Stabilität**: Die Stoppzeit im Audiokontext bei Pausen wird nun präzise ermittelt. Zudem wurde das Spacebar-Wiedergabe-Callback stabilisiert, was die kontinuierliche Neuerstellung des Callbacks und Neuregistrierung der Tastatur-Event-Listener behebt.
- **Präzises Audio-Trimming & Wellenformen**: Beim Dateiexport werden Clip-Trimmings (sourceOffset / duration) nun korrekt berücksichtigt. Zudem wurde ein hochperformanter, PCM-basierter Peak-Extraktor im Hauptprozess und ein verlängertes Timeout im Waveform-Renderer implementiert, um fehlerhafte fiktive Wellenformen zu beheben.

## [0.5.2] - 2026-05-25
### Added
- **Physisches Projekt-Speichern**: Die `project.save`-Aktion im `HeadlessRunner` führt nun das echte Schreiben der `.owep`-Projektdatei mittels `fs.writeFileSync` durch.
- **Automatisierte I/O-Unit-Tests**: Erweiterung der Core-Testsuite um einen automatisierten Integrations-Test (`Test 9`), der den echten Schreibvorgang, die JSON-Strukturintegrität und die anschließende temporäre Dateibereinigung vollautomatisch validiert.

### Changed
- **Markenbereinigung (Brand Sanitization)**: Vollständige Bereinigung verbliebener herstellerspezifischer Markennamen (insb. "Magix") in allen Konzepten, internen Quellcode-Kommentaren (`settingsIpc.ts`, `SaveConfirmationModal.tsx`, `StartDashboard.tsx`) und Dokumenten zugunsten einer neutralen, industrieüblichen Terminologie.
- **Klarstellung zum Plugin-Hosting**: Richtigstellung der Plugin-Hosting-Claims in Marketingmaterialien (`discord_vorstellung.md`); der plattformübergreifende Plugin-Scanner für VST2, VST3, AU und LV2 wird ehrlich als prototypische Registry-Erkennung deklariert (DSP-Routing und natives GUI-Hosting sind als zukünftige Entwicklungsphasen ausgewiesen).

## [0.5.1] - 2026-05-24
### Fixed
- **Projekt-Wiedergabe**: Beim Laden von `.owep`-Projekten werden referenzierte Audiodateien jetzt wieder in die AudioEngine vorgeladen, sodass importierte Regionen nach dem Oeffnen hoerbar abgespielt werden.
- **Echo-Default**: Der neutrale Effektzustand setzt Delay-Feedback jetzt konsequent auf `0`, damit Clips beim Zuruecksetzen, Preset-Laden oder Einfuegen von Effekten kein ungewolltes Echo erhalten.



## [0.5.0] - 2026-05-24
### Added
- **Verlustfreie Projektmodelle**: Regionen und Spuren speichern nun alle Timeline-Attribute (`color`, `groupId`, `fileDuration`, Fades, Gain und Effekte) verlustfrei; unbenutzte oder herstellerspezifische Zusatzfelder werden beim Importieren, Speichern und Validieren (`validateAndMigrateProject`) vollständig erhalten.
- **Sichere Befehlsarchitektur (Command Layer)**: Nicht unterstützte oder unimplemented Stubs (wie `export.render` oder `metadata.write`) brechen nun kontrolliert mit klaren Ausnahmen ab, anstatt stillschweigend ignoriert zu werden.
- **Gehärteter MCP-Server**: Der Headless Model Context Protocol Server validiert nun dynamisch Dateipfade sowie Spuren-IDs und passt seine Versionskennung automatisch an die `package.json` an.
- **Modulare IPC-Brücke**: Die IPC-Handler wurden in übersichtliche Submodule (`audioIpc`, `pluginIpc`, `projectIpc`, `systemIpc`) aufgeteilt, um Registrierungskonflikte zu vermeiden.
- **Asynchroner Plugin-Scanner**: Der "Interface öffnen"-Button im EffectsPanel wertet nun das Rückgabeobjekt der Plugin-Bridge asynchron aus und zeigt dem Benutzer im Fehlerfall eine verständliche `window.alert`-Meldung an.
- **Ehrliche Plugin-UI**: Aktualisierung aller VST-Dokumentationspfade und ehrlicher Hinweis in der UI, dass Plugin-Hosting in diesem Prototyp noch nicht implementiert ist.

### Changed
- **Bearbeitbare Tastaturkürzel**: Programmeinstellungen enthalten jetzt editierbare Shortcuts, die von Menü und Timeline gemeinsam genutzt werden.
- **Programmeinstellungen**: Das Einstellungsfenster startet standardmäßig in den Projekteinstellungen.
- **Wiedergabe-Einstellungen**: Die nicht funktional angebundene Auswahl zwischen Wave-Treiber und Direct-Sound wurde entfernt; die tatsächliche Ausgabe erfolgt weiterhin über die Geräteauswahl.

## [0.4.1] - 2026-05-23
### Added
- **Echtzeit-Download-Statistiken**: Anzeige von Downloadgeschwindigkeit, geladener Datenmenge und verbleibender Restlaufzeit im Update-Dialog.
- **IPC-Optimierung**: Begrenzung der Übertragungsfrequenz für Download-Fortschritts-Events im Hauptprozess zur Schonung von Systemressourcen.

## [0.4.0] - 2026-05-23
### Added
- **Spur-Management**: Neupositionierung der Schaltfläche "Spur hinzufügen" in die horizontale Scrollbar-Leiste zur Verbesserung des Arbeitsflusses.
- **DAW Performance-Monitor**: Live-Ressourcenanzeige für CPU- und RAM-Auslastung mit visuellem LED-Indikator im Timeline-Footer.
- **Explorer-Navigation**: Native Windows-Laufwerkserkennung (A:\ bis Z:\) über virtuellen Ort `'computer'` sowie Tastaturnavigation (Alt+ArrowUp, Backspace) und "Ordner hoch"-Button.
- **Auto-Stop Vorschau**: Automatisches Stoppen der Explorer-Audiovorschau beim Start der Timeline-Wiedergabe.
- **Fokus-Sperre**: Beibehalten der DSP-Effektkontrollen des zuletzt ausgewählten Clips bei Klicks in leere Timeline-Bereiche.
- **Globaler Spacebar-Shortcut**: Zentraler Leertasten-Listener für Wiedergabe und Pause, ausgenommen bei aktiven Modals, Eingabefeldern oder im Import-Tab.
- **Kugel-Fade-Handles**: Ersatz der dreieckigen Eck-Handles durch kreisförmige Fade-Handles mit präziser Sekunden-Tooltip-Anzeige.
- **Viewport-Schutz**: Automatische Positionsanpassung von Kontextmenüs zur Vermeidung von Darstellungsfehlern am Bildschirmrand.
- **Ausgelagerter Export-Prozess**: Auslagerung des Renderings in eigenständige Popout-Fenster inklusive Visualisierung und Fortschrittsanzeige bei gleichzeitiger Sperrung des Hauptfensters.
- **Projekt-Dokumentation**: Bereitstellung der Dateien LICENSE (MIT), CONTRIBUTING und Anforderungen im Hauptverzeichnis.

### Fixed
- **Seamless Cuts**: Automatische Erkennung kontinuierlicher Clips zur sample-genauen Knackser-Vermeidung mittels 1ms Mikro-Fades.
- **Playhead-Interaktion**: Optimierung des Abspielkopfs als breitere, griffigere Zieh-Zone und Blockierung versehentlicher Klicks auf leeren Spurbahnen.

## [0.3.4] - 2026-05-22
### Added
- **Deinstallations-Bereinigung**: Automatische Rückstands-Entfernung von temporären Benutzerdaten bei der Anwendungsdeinstallation.

## [0.3.3] - 2026-05-22
### Added
- **Standard-Exportpfad**: Priorisierung des in den Einstellungen hinterlegten Zielpfads beim Öffnen des Export-Dialogs.

## [0.3.2] - 2026-05-22
### Added
- **UI-Bereinigung**: Entfernung unbenutzter Werbeelemente und Platzhalter-Schaltflächen für ein fokussiertes Design.
- **Icon-Transparenz**: Konvertierung aller Anwendungs-Icons zu transparenten Kreisformen.

## [0.3.1] - 2026-05-22
### Added
- **Explorer-Pfadauflösung**: Dynamische Pfadermittlung für Systemordner (Desktop, Dokumente etc.) im Datei-Explorer.

### Fixed
- **Export-Qualität**: Stabilitätsverbesserung bei der Export-Fortschrittsanzeige und Resampling-Korrekturen für hohe Exportqualität.

## [0.3.0] - 2026-05-22
### Added
- **Audioaufnahme**: Integration einer nativen Aufnahmefunktion zur direkten Spuraufzeichnung im Editor.
- **Time-Stretching**: Verlustfreies Ändern der Wiedergabegeschwindigkeit (Tempo) ohne Beeinflussung der Tonhöhe.
- **Dateizuordnung**: Registrierung des Omega-Wave-Project-Dateiformats (.owp) im Betriebssystem für direkten Projektstart via Doppelklick.

## [0.2.5] - 2026-05-22
### Fixed
- **Track-Aktualisierung**: Stabilisierung der Track-Verlaufshistorie zur Vermeidung von Rendering-Schleifen.
- **Ruler-Referenz**: Korrektur doppelt deklarierter GUI-Komponenten in der Timeline.
- **Verlaufskontrollen**: Verknüpfung der Undo/Redo-Steuerung mit der optimierten Aktualisierungslogik.

### Added
- **Einstellungen**: Globaler Shortcut (Strg+P) und Menüeintrag zum direkten Öffnen des Einstellungsfensters.
- **Projekt-Dashboard**: Automatischer Aufruf des Dashboards beim Erstellen neuer Projekte.
- **Playhead-Scrubbing**: Kontinuierliche Marker-Positionierung bei gedrückter Maustaste auf dem Zeitlineal.
- **Audio-Import**: Direktes Platzieren importierter Dateien an der aktuellen Playhead-Position.
- **Explorer-Navigation**: Ordnerwechsel per Einfachklick im Datei-Explorer.
- **Vorschau-Player**: Dauerhafte Sichtbarkeit des Kompakt-Vorschau-Players während des Datei-Browsings.
- **Sidebar-Erweiterung**: Dauerhafte Fixierung der "Spur hinzufügen"-Schaltfläche am unteren Rand des Spurbereichs.

## [0.2.4] - 2026-05-22
### Fixed
- **Start-Verhalten**: Stabilitätsverbesserung beim Anwendungsstart zur Gewährleistung der korrekten GUI-Initialisierung.

## [0.2.3] - 2026-05-22
### Added
- **Start-Dashboard**: Einführung eines übersichtlichen Startfensters für den Schnellzugriff auf Projekte.
- **Präzisions-Cuts**: Frame-genaue Schnittfunktion mittels Schnelltasten (T, C, U) für ausgewählte Regionen.

### Fixed
- **Audio-Trimming**: Begrenzung der Clip-Verschiebung auf die tatsächliche Länge der Quelldatei.
- **Split-Synchronisation**: Korrekte Berechnung des Audio-Offsets nach dem Zerschneiden von Clips.
- **Wellenform-Anzeige**: Robustere Rendering-Logik zur zuverlässigen Visualisierung von Audio-Wellenformen.
- **Installer-Routine**: Automatische Bereinigung veralteter Installationsordner im Setup-Vorgang.

## [0.2.2] - 2026-05-22
### Added
- **Bilinguale Dokumentation**: Bereitstellung der Projektdokumentation in deutscher und englischer Sprache inklusive Grafiken im Repository.

### Fixed
- **Update-Prüfung**: Fallback bei temporärer Nicht-Erreichbarkeit der Update-Server.

## [0.2.1] - 2026-05-22
### Fixed
- **UI-Konsistenz**: Integration der dynamischen Versionsanzeige im Hauptmenü sowie in der "Über"-Anzeige.

## [0.2.0] - 2026-05-22
### Added
- **Cross-Platform Builds**: Bereitstellung automatischer Build-Pipelines für Windows, macOS und Linux.

### Fixed
- **DevTools**: Deaktivierung des automatischen Öffnens der Entwicklertools in verpackten Versionen.
- **Lautstärkesteuerung**: Unterbindung ungewollter Wiedergabesprünge bei Interaktionen mit Fade- und Lautstärkelinien.

## [0.1.0] - 2026-05-22
### Added
- **Qualitätsrichtlinien**: Einführung einheitlicher Codierungsstandards.
- **Update-Checker**: Implementierung der automatischen und manuellen Update-Prüfung über die App-Oberfläche.
- **CI/CD-Integration**: Einrichtung automatischer Builds bei neuen Release-Tags.
