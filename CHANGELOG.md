# Changelog

The format is based on Keep a Changelog. Dieses Projekt nutzt das klassische Semantic Versioning (`X.Y.Z`) als explizite Ausnahme vom Omega Codex Standard.

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
