# Changelog

The format is based on Keep a Changelog. Dieses Projekt nutzt das klassische Semantic Versioning (`X.Y.Z`) als explizite Ausnahme vom Omega Codex Standard.

## [0.2.5] - 2026-05-22
### Fixed
- **Endlos-Renderschleife (Maximum update depth exceeded)**: Kritischer React-Fehler in `Timeline.tsx` behoben, bei dem `updateTracksWithHistory` → `onTracksChange` → `initialTracks`-Prop-Update → `useEffect` → `setTracks` eine Endlosschleife auslöste. Gelöst mit dem `isInternalUpdateRef`-Flag, das interne von externen Track-Updates unterscheidet.
- **Doppelte `rulerRef`-Deklaration**: Compile-Fehler behoben, bei dem `rulerRef` zweimal in `Timeline.tsx` deklariert wurde (Zeile 107 und Zeile 684). Das Duplikat wurde entfernt.
- **Undo/Redo-Toolbar-Buttons**: Die Undo/Redo-Schaltflächen in der Timeline-Toolbar setzen jetzt ebenfalls den `isInternalUpdateRef`-Flag, um keine Rückkopplungsschleife auszulösen.

### Added
- **Datei → Einstellungen (Strg+P)**: Menüeintrag „Einstellungen" im Datei-Menü sowie globaler Tastaturkürzel `Strg+P` zum direkten Öffnen des Einstellungs-Dialogs.
- **Neues Projekt öffnet Start-Dashboard**: Klick auf „Neues Projekt..." öffnet nun wieder das Start-Center zur Konfiguration (Spuranzahl, Sample-Rate etc.), statt direkt auf 4 Spuren zurückzusetzen.
- **Playhead-Scrubbing**: Klicken und Ziehen auf dem Zeitlineal bewegt den Abspiel-Marker kontinuierlich (Scrubbing-Funktion mit globalen mousemove/mouseup-Events).
- **Audio-Import auf Playhead-Position**: Drag & Drop von Audiodateien auf die Timeline platziert die Region direkt an der aktuellen Playhead-Position.
- **Einzel-Klick-Navigation im Datei-Explorer**: Ordner im Import-Tab öffnen sich jetzt per Einzel-Klick statt Doppelklick.
- **Kompakter Vorschau-Player bleibt sichtbar**: Das Abspielen einer Datei im Import-Tab wechselt nicht mehr automatisch zum Player-Tab — der Mini-Player wird direkt unter der Dateiliste angezeigt.
- **Sidebar „+ Spur"-Button**: Schaltfläche zum Hinzufügen weiterer Spuren ist jetzt dauerhaft am unteren Rand der Spur-Sidebar fixiert und wird nicht mehr durch Inhalte überdeckt.

## [0.2.4] - 2026-05-22
### Fixed
- **Start-Crash (Blank Screen)**: Behebung eines kritischen Temporal-Dead-Zone-Fehlers in der Hauptkomponente `App.tsx`, bei dem auf das State-Objekt `tracks` in Hooks vor seiner Deklaration zugegriffen wurde. Dies führte zum Absturz des Render-Prozesses und einem "Blank Screen" (weißer Bildschirm) sowohl in der Entwicklungs- als auch in der Produktions-Version.

## [0.2.3] - 2026-05-22
### Added
- **Start-Dashboard**: Eleganter Dialog zum schnellen Öffnen bestehender und Neuerstellen neuer Projekte mit Pfadauswahl beim Programmstart.
- **Präzisions-Cuts (TCU)**: Tastaturkurzschnitte `T`, `C`/`Z`, `U` auf frame-genaue Abspielposition umgestellt. Funktioniert auf allen Spuren (wenn nichts selektiert ist) oder exakt auf der/den ausgewählten Region(en).

### Fixed
- **Audio-Trimming-Begrenzung**: Physische Begrenzung der Verschiebung von Audio-Regionen nach rechts, sodass sie nicht über die eigentliche Länge der Mediendatei hinaus verlängert werden können.
- **Scheren-Split Audio-Sync**: Korrekte Berechnung des `sourceOffset` beim Zerteilen mit der Schere, damit geschnittene Audio-Objekte synchron weiterspielen.
- **Wellenform-Visualisierung**: 150ms-Timeout-Fallback zur garantierten und sofortigen Anzeige der Wellenformen unter allen Bedingungen (z.B. bei blockiertem FFmpeg).
- **Installer-Ordnerbereinigung**: Altes Installationsverzeichnis wird im Setup automatisch deinstalliert/verschoben, um Altlasten sauber zu bereinigen.

## [0.2.2] - 2026-05-22
### Added
- Vollständig zweisprachige Dokumentation (Deutsch & Englisch) in der README.md mit hochauflösender Screenshot-Galerie und dem offiziellen Logo.

### Fixed
- Robustere Fehlerbehandlung im Software-Updater: HTTP 404-Meldungen von der GitHub API (z.B. bei privaten Repositories oder noch nicht erstellten Releases) werden nun abgefangen. Anstelle eines unschönen Fehlerdialogs wird dem Benutzer nun wie gewohnt gemeldet, dass die Software auf dem neuesten Stand ist.
- Veraltete, durchgestrichene Logo-Entwürfe aus dem Repository gelöscht.

## [0.2.1] - 2026-05-22
### Fixed
- Fehlerhafter mock-updater im Hauptmenü (MenuBar) durch echten dynamischen Update-Check über GitHub-Releases-API ersetzt.
- "Über"-Menü zeigt jetzt dynamisch die tatsächliche installierte Version der Anwendung an statt statisch Version 1.0.0.

## [0.2.0] - 2026-05-22
### Added
- Cross-Platform-Releases: Automatische Builds für Windows, macOS (DMG/ZIP) und Linux (AppImage/DEB) via GitHub Actions.
- Portable-Versionsname standardisiert auf `Omega-Wave-Editor-Portable-X.Y.Z.exe`.
### Fixed
- DevTools öffnen sich in der fertigen (verpackten) Installation nicht mehr automatisch.
- Portable-Version startet jetzt korrekt: ffmpeg und ffprobe werden aus `app.asar.unpacked` geladen.
- Klick-Event nach Gain/Fade/Regions-Dragging unterdrückt, um ungewollte Wiedergabesprünge zu verhindern.

## [0.1.0] - 2026-05-22
### Added
- Etablierung der Omega Codex Standards via `.clinerules` im Projekt-Root.
- Integration des "Omega Wave Editor" in die PROJECTS.md des Omega Codex Home.
- Implementierung des IPC-Update-Checkers über die GitHub Releases API im Main-Prozess.
- Hinzufügen der Versionierung und des "Auf Updates prüfen"-Buttons im Einstellungsfenster (Tab "System").
- Automatischer, lautloser Update-Check beim Programmstart mit edler Toast-Benachrichtigung und Direkteinstieg in die System-Details.
- CI/CD-Pipeline via GitHub Actions zur automatischen Release-Kompilierung und Veröffentlichung bei Tag-Pushes.
