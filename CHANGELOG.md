# Changelog

The format is based on Keep a Changelog. Dieses Projekt nutzt das klassische Semantic Versioning (`X.Y.Z`) als explizite Ausnahme vom Omega Codex Standard.

## [0.1.0] - 2026-05-22
### Added
- Etablierung der Omega Codex Standards via `.clinerules` im Projekt-Root.
- Integration des "Omega Wave Editor" in die PROJECTS.md des Omega Codex Home.
- Implementierung des IPC-Update-Checkers über die GitHub Releases API im Main-Prozess.
- Hinzufügen der Versionierung und des "Auf Updates prüfen"-Buttons im Einstellungsfenster (Tab "System").
- Automatischer, lautloser Update-Check beim Programmstart mit edler Toast-Benachrichtigung und Direkteinstieg in die System-Details.
- CI/CD-Pipeline via GitHub Actions zur automatischen Release-Kompilierung und Veröffentlichung bei Tag-Pushes.
