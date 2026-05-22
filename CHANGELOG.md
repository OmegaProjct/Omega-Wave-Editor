# Changelog

The format is based on Keep a Changelog. Dieses Projekt nutzt das klassische Semantic Versioning (`X.Y.Z`) als explizite Ausnahme vom Omega Codex Standard.

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
