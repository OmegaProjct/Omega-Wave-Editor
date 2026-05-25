# Changelog

The format is based on Keep a Changelog. Dieses Projekt nutzt das klassische Semantic Versioning (`X.Y.Z`).

## [0.5.1] - 2026-05-25
### Added
- **Physisches Projekt-Speichern**: Die `project.save`-Aktion im `HeadlessRunner` führt nun das echte Schreiben der `.owep`-Projektdatei mittels `fs.writeFileSync` durch.
- **Automatisierte I/O-Unit-Tests**: Erweiterung der Core-Testsuite um einen automatisierten Integrations-Test (`Test 9`), der den echten Schreibvorgang, die JSON-Strukturintegrität und die anschließende temporäre Dateibereinigung vollautomatisch validiert.

### Changed
- **Markenbereinigung (Brand Sanitization)**: Vollständige Bereinigung verbliebener herstellerspezifischer Markennamen (insb. "Magix") in allen Konzeptdokumenten (`concepts/OMEGA_PLAN.md`, `concepts/ui-advanced-completion.md`) zugunsten einer neutralen, industrieüblichen Terminologie.
- **Klarstellung zum Plugin-Hosting**: Richtigstellung der Plugin-Hosting-Claims in Marketingmaterialien (`discord_vorstellung.md`); der plattformübergreifende Plugin-Scanner für VST2, VST3, AU und LV2 wird ehrlich als prototypische Registry-Erkennung deklariert (DSP-Routing und natives GUI-Hosting sind als zukünftige Entwicklungsphasen ausgewiesen).

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
