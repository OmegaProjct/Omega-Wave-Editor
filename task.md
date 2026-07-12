# Task: Waveform-Nacharbeiten nach Release 0.13.10

## Status

Release 0.13.10 (Peak-Pyramide-Nacharbeiten: Playhead-Zoom, Stretch-then-Refine, Bitmap-Cache, Proxy-Dateien, Trace-Logging) ist am 2026-07-11 committet, getaggt und über den CI-Workflow veröffentlicht worden. Die anschließende Code-Durchsicht plus Auswertung einer Testsession-Logdatei hat 13 Funde ergeben. Diese sind in drei priorisierte, eigenständig abarbeitbare Pläne aufgeteilt:

| Plan | Datei | Inhalt | Zielversion | Status |
|---|---|---|---|---|
| ROT | `implementation_plan_rot.md` | 2 bewiesene Fehler: Proxy-Speicherung schlägt immer fehl (Puffer 4 Bytes zu klein); 14-Sekunden-Einfrierer durch zu früh greifenden Sample-Modus | 0.13.11 | erledigt |
| ORANGE | `implementation_plan_orange.md` | Toten get-peaks-Pfad mit Zufallsdaten-Fallback entfernen; Doppel-Decode beim Start trotz Proxy vermeiden; Renderer-Caches fingerprint-sicher machen; Cache-Budgets nach Bytes | 0.13.12 | erledigt |
| GELB | `implementation_plan_gelb.md` | Punkte 1–3 (Float32Array, ehrliche Fehler, SHA-256-Proxy-Namen) wurden bereits mit ORANGE miterledigt und von Claude nachgeprüft. NUR NOCH offen: totes ClipRegion-Modul löschen (4), MidiEngine-Import-Warnung (5), Gesten-Statistik-Kosmetik (6) | 0.13.13 | erledigt |
| GRÜN | `implementation_plan_gruen.md` | Drei weitere tote Timeline-Altmodule löschen (PlaybackControls, TimelineRuler, TrackHeader); Renderer-Bundle aufteilen (Vendor-Chunks + Lazy-Loading seltener Dialoge) für schnelleren App-Start | 0.13.14 | erledigt |
| BLAU | `implementation_plan_blau.md` | Timeline-Monolith (~6600 Zeilen) in 4 vorsichtigen Scheiben teilzerlegen: Hilfsfunktionen, Typen, Diagnostik-Hook, LiveWaveformCanvas. Reines Verschieben, kein Verhalten ändern; Zoom/Scroll/Drag und justDraggedRef bleiben unangetastet in Timeline.tsx | 0.13.15 | erledigt (Alle 4 Scheiben erfolgreich zerlegt) |
| LILA | `implementation_plan_lila.md` | Waveform-Optik im REAPER-Stil: einheitlicher, deckend gefüllter Look über ALLE Zoomstufen (Sample-Modus bekommt gefüllten Körper, kein Stilbruch mehr); Schatten-Effekt entfernt; neuer Einstellungsbereich "Darstellung" mit Waveform-Farbe, Deckkraft und RMS-Kern an/aus | 0.13.16 | erledigt |
| ROSA | `implementation_plan_rosa.md` | Objekte schnell umbenennen: Inline-Editor in der Region-Titelleiste, Kontextmenü-Eintrag "Umbenennen" mit F2-Hinweis, F2-Shortcut; Undo-fähig; Namen nach dem Zerschneiden bleiben unabhängig (ist bereits so) | 0.13.17 | erledigt |

Jeder Plan enthält in Abschnitt 0 alle Regeln und ist so geschrieben, dass ein Agent ohne weiteres Kontextwissen damit arbeiten kann.

## Regeln für alle Pläne

- `justDraggedRef` in `Timeline.tsx` niemals verändern (`.clinerules`).
- Nur `npm run typecheck` zur Prüfung; kein `npm run build`/`check` (natives VST-Modul), sofern der Plan nichts anderes sagt.
- Pro Plan: Version + Changelog gemäß Plan-Abschluss, dann STOPPEN — kein Commit/Push ohne Davids Freigabe.

## Offene manuelle Tests durch David (aus Release 0.13.10)

- [ ] Playhead-Zoom: sichtbarer Playhead bleibt beim Zoomen stehen; unsichtbarer wird zentriert.
- [x] Zoomen/Scrollen flüssig (Trace-Log vom 2026-07-11 19:46 bestätigt: Median Draw 2 ms, Median IPC 22 ms — bis auf den in Plan ROT adressierten Sample-Modus-Ausreißer).
- [ ] Proxy-Neustart-Test — jetzt testbar (Plan ROT ist umgesetzt): Datei laden, App neu starten, Datei erneut laden → Log muss `Peak-Pyramide von Proxy-Datei geladen` zeigen, ohne neuen Analyse-Durchlauf.

## Nächster Schritt

1. Delegierbar: Plan LILA (`implementation_plan_lila.md`) — Waveform-Optik im REAPER-Stil + Design-Einstellungen (→ 0.13.16).
2. Danach delegierbar: Plan ROSA (`implementation_plan_rosa.md`) — Objekte schnell umbenennen (→ 0.13.17).
3. Release der aufgelaufenen Versionen nach Davids Freigabe (Commit, Tag, Push → CI).
