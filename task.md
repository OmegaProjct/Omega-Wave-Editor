# Task: hochpraezise Waveform-Darstellung

## Status

Phase 2 umgesetzt. Quellcode wurde geaendert und `npm run typecheck` ist erfolgreich durchgelaufen.

## Checkliste

- [x] Projektregeln gelesen: `docs/SANIERUNGSPLAN_MCP_PLUGIN_SUPPORT.md`, `.clinerules`, `CONTRIBUTING.md`.
- [x] Codex-/Antigravity-Export gelesen: `codex/conversation.md`.
- [x] Referenzbilder aus `codex/` gesichtet.
- [x] Aktuellen Waveform-Renderer analysiert.
- [x] Aktuelle Peak-Berechnung im Main-Prozess analysiert.
- [x] Externe technische Quellen recherchiert.
- [x] Umsetzungsplan erstellt: `implementation_plan.md`.
- [x] `WaveformAnalysisService` im Main-Prozess erstellt.
- [x] Neue IPC-Abfrage `waveform:get-window` angebunden.
- [x] `WaveformRenderer` auf sichtfensterbasiertes Rendering mit signierten Min/Max-, RMS- und Sampledaten umgebaut.
- [x] Timeline-Aufruf um Zoom-, Scroll- und Displaydauer-Kontext erweitert.
- [x] Wiederverwendbaren Overview-Cache fuer fluessigeres Zoomen ergaenzt.
- [x] Hohe Zoomgrenze und progressive Zoomschritte fuer feinere Detailansicht erhoeht.
- [x] Version und Changelog neutral aktualisiert.
- [x] TypeScript-Pruefung erfolgreich ausgefuehrt.

## Wichtigste Befunde

- Die aktuelle Peak-Berechnung resampelt auf 8000 Hz und mischt standardmaessig auf Mono.
- Die Daten enthalten nur absolute Peakhoehen, keine signierten Min/Max-Werte.
- Die Renderer-Aufloesung ist pauschal 8000 Punkte pro Datei und dadurch nicht zoomstufenfaehig.
- SVG loest das alte Canvas-Weissproblem teilweise, ersetzt aber keine echten Detaildaten.
- Fuer sehr praezises Schneiden braucht die App signierte Waveform-Daten, Stereo-Trennung, Mipmap-/Cache-Level und einen sichtfensterbasierten Samplemodus.

## Naechster Schritt

1. Live-App starten und die Referenzdateien bei normalem und sehr starkem Zoom visuell pruefen.
2. Bei Bedarf weitere Feineinstellung fuer Linienstaerke, Auto-Fit und Stereo-Lane-Hoehe vornehmen.
3. Optional echte automatisierte Tests fuer synthetische Klick-/Impulsdateien ergaenzen.
