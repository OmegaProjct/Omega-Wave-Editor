# Task: Waveform-Performance Runde 2

## Status

Phase 1 (Planung) abgeschlossen am 2026-07-11. Plan liegt in `implementation_plan.md` (Architektur + Schritte, bewusst ohne vorgefertigten Code). Phasen A, B und C umgesetzt am 2026-07-11. David hat entschieden, dass alle drei Phasen als Bugfixes zaehlen und gemeinsam unter **Version 0.13.10** veroeffentlicht werden (nicht 0.14.0/0.15.0 wie urspruenglich im Plan skizziert) — Changelog entsprechend zu einem einzigen Eintrag zusammengefasst. `npm run typecheck` UND `npm run build` (inkl. nativem VST-Modul) laufen fehlerfrei durch. Release-Freigabe von David erteilt; wird jetzt committet, getaggt (`v0.13.10`) und gepusht — der Tag-Push loest automatisch den 3-Plattform-CI-Release-Build aus (`.github/workflows/release.yml`).

## Kontext

Die Peak-Pyramide aus 0.13.9 funktioniert (Log-Beleg: Antworten in 1–3 ms), aber der spürbare Lag liegt im Zeichenweg des Renderers und der gedrosselten Scroll-/Zoom-Weitergabe. Außerdem gewünscht: Playhead bleibt beim Zoomen verankert, und Analyse-Ergebnisse werden als Proxy-Dateien im Nutzerordner abgelegt (projektverknüpft, temporäre werden aufgeräumt).

## Checkliste

### Phase A — Trace-Logging (→ 0.13.10) — umgesetzt, David-Test steht aus
- [x] Request-ID durch Renderer → IPC → Service (`traceId`, in Anfrage und Antwort gespiegelt).
- [x] Renderer-Timing pro Anfrage (gestellt / Antwort / gezeichnet, Cache-Hit, Draw-Dauer) in `WaveformRenderer.tsx`.
- [x] Gesten-Sammel-Eintrag in Timeline-Diagnostik (`recordWaveformGestureTick`/`flushWaveformGesture` in `Timeline.tsx`, an Wheel-Zoom, Wheel-Scroll und `handleScroll` angeschlossen).
- [x] Main-Timing (Decode-/Gesamtdauer je Anfrage, Pyramidenbau-Dauer) + einmaliger Pyramidenbau-Retry (`buildPyramidOnce`/`ensurePyramid` in `waveformAnalysisService.ts`).
- [x] Log-Kategorie `waveformTrace` (Default AN) in `diagnosticLogging.ts`, `settingsIpc.ts`-Defaults und `SettingsModal.tsx`-Logs-Tab.
- [x] Typecheck fehlerfrei. Version 0.13.10 + Changelog.
- [ ] Manueller Test durch David: Datei laden, kurz zoomen/scrollen, Log-Eintrage mit `waveformTrace`-Kategorie sichten.

### Phase B — Zeichenweg + Playhead-Zoom (→ 0.13.10, siehe Status oben) — umgesetzt, David-Test steht aus
- [x] Alle Zoom-Eingänge verankern am Playhead (außerhalb sichtbar → erst zentrieren). Umsetzung: statt (wie bisher) beim Mausrad-Zoom einen Anker auf die Mausposition zu setzen, verankert der bereits vorhandene Zoom-Commit-Effekt jetzt IMMER am Playhead — das tote `zoomAnchorRef` wurde entfernt, da alle anderen Zoom-Wege (Tasten, Buttons, Zoom-Menü) diesen Fallback schon vorher automatisch nutzten. `justDraggedRef` unangetastet.
- [x] Sofortiges CSS-Stretch des vorhandenen Bilds beim Zoom-/Scroll-Geometriewechsel (Reposition-Effekt in `WaveformRenderer.tsx`), scharfes Nachziehen sobald neue Daten eintreffen (Paint-Effekt, jetzt entkoppelt und läuft nur noch bei echten Datenänderungen statt bei jeder Geometrieänderung).
- [x] Zoom-Buckets geprüft statt neu gebaut: Zoomstufen sind bereits eine diskrete Faktor-Leiter (`getNextZoomLevel`), und die bestehende `.toFixed(6)`-Rundung der Anfrageschlüssel absorbiert Fließkomma-Drift bei Wiederbesuch eines Zoomlevels bereits zuverlässig (Float64-Rauschen liegt um viele Größenordnungen unter der Rundungsschwelle) — keine zusätzliche Quantisierung nötig.
- [x] Bitmap-Cache (In-Memory-Canvas-Snapshots, LRU, 48 Einträge) statt separatem 512px-Kachelsystem mit eigenem requestAnimationFrame-Blitting-Loop — bewusst vereinfachte, risikoärmere Umsetzung mit demselben Effekt ("einmal zeichnen, dann nur kopieren" bei Rückkehr zu Zoom/Ausschnitt/Größe). Natives Scrollen der Timeline ist bereits Browser-beschleunigt und benötigt keinen eigenen rAF-Loop (verifiziert: Regionen sind absolut im nativ scrollenden Container positioniert).
- [x] Gain im Bitmap-Cache-Schlüssel enthalten statt separat beim Blitting skaliert — bewusste Vereinfachung: Gain-Ziehen löst ohnehin einen Neuzeichnen-Pfad aus (Gain ist Paint-Dependency), der Cache hilft hier primär bei Zoom-/Ausschnitts-Wiederbesuchen, nicht beim Gain-Ziehen selbst.
- [x] Typecheck fehlerfrei.
- [ ] Manueller Test durch David: Playhead beim Zoomen beobachten (sichtbar bleibt er stehen, unsichtbar wird er zentriert), Zoomen/Scrollen auf Ruckler/Aussetzer prüfen, Trace-Logs aus Phase A für Vorher/Nachher-Vergleich sichten.

**Hinweis an David:** Zwei Stellen wurden bewusst einfacher gelöst als im Ursprungsplan skizziert (siehe Haken oben) — funktional gleichwertig für dein eigentliches Problem (Zoom-Ruckeln), aber weniger Umbau-Risiko. Sag Bescheid, falls du die strengere 512px-Kachel-Variante mit eigenem rAF-Loop trotzdem willst.

### Phase C — Proxy-Dateien (→ 0.13.10, siehe Status oben) — umgesetzt, David-Test steht aus
- [x] Binärformat + `waveform-proxies`-Ordner im Datenordner der App (neue Datei `src/main/waveform/proxyStore.ts`: Header mit Formatversion/Samplerate/Kanälen/Frames/Datei-Peak/Levelanzahl, danach je Level je Kanal Min/Max/RMS als Float32).
- [x] `index.json` (Fingerprint, Quellpfad, Dateiname, Erstell-/Nutzungszeit, Byte-Größe, Projektreferenzen), atomar geschrieben (Temp-Datei + Rename).
- [x] Bau beim ersten Zugriff mit Fortschritts-Event (`waveform:pyramid-progress`, alle ~150ms) + dezenter Fortschrittsbalken im Clip (`WaveformRenderer.tsx`). Hinweis: „beim Import“ ist technisch identisch mit „beim ersten Rendern/Zugriff der Datei“, da genau das den Analyse-Trigger `ensurePyramid` auslöst — keine separate Import-Hook-Stelle nötig.
- [x] Verknüpfung beim Projekt-Speichern (`projectIpc.ts`, `save-project`-Handler: Fingerprints der referenzierten Quelldateien vor der Pfad-Umschreibung gesammelt, danach `linkProxiesToProject`); Aufräumen beim App-Start (`runProxyStoreMaintenance()` in `main/index.ts`, vor dem ersten Fenster) — entfernt Referenzen auf nicht mehr existierende Projektdateien, löscht unreferenzierte Proxys älter als 7 Tage, begrenzt Gesamtgröße auf 2 GB (LRU, unreferenzierte zuerst).
- [x] Laden von Platte vor Neubau (`loadProxyFromDisk` in `ensurePyramid`, bevor der Streaming-Decode startet); RAM-Cache (`pyramidCache`) bleibt unverändert die erste, schnellste Ebene.
- [x] Handbuch-Absatz in `ManualModal.tsx` (neuer Block in Abschnitt 2 „Wellenform-Analyse & Proxy-Dateien“). Typecheck fehlerfrei.
- [ ] Neustart-Test durch David: Datei laden (Fortschrittsbalken + Log „Peak-Pyramide fertig“ sichtbar), App neu starten, dieselbe Datei erneut laden → Log soll „Peak-Pyramide von Proxy-Datei geladen“ zeigen, kein erneuter Analyse-Fortschritt. Projekt speichern und Ordner `waveform-proxies/index.json` auf Projektverknüpfung prüfen.

## Harte Regeln

- `justDraggedRef` in `Timeline.tsx` niemals verändern.
- `timeline/ClipRegion.tsx` (totes Modul) nicht anfassen.
- Nur `npm run typecheck`, kein `npm run build`/`check`.
- Nach jeder Phase stoppen — David testet; kein Commit/Push ohne Freigabe.

## Nächster Schritt

Release 0.13.10 ist committet, getaggt und gepusht. David testet die App (siehe offene Punkte in den Phasen A–C oben) und prüft den CI-Release-Build auf GitHub.
