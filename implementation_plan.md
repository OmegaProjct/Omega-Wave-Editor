# Implementierungsplan: Waveform-Performance Runde 2 — Trace-Logging, flüssiger Zeichenweg, Playhead-Zoom, Proxy-Dateien

Stand: 2026-07-11 · Basisversion: 0.13.9 · Drei Phasen, getrennt umsetzbar und testbar.

---

## 0. Anweisungen für den ausführenden Agenten

- Dieser Plan beschreibt **Architektur und Schritte, keinen fertigen Code**. Setze die Schritte im Sinne der Beschreibung um und halte dich an die bestehenden Code-Muster im Projekt (Stil: 2 Leerzeichen, keine Semikolons, deutsche Kommentare).
- Die Phasen A → B → C **in dieser Reihenfolge** umsetzen. Nach jeder Phase: `npm run typecheck` und die Verifikation der Phase durchführen. NICHT `npm run build`/`npm run check` (baut das native VST-Modul).
- Ausgangslage: Version 0.13.9 enthält bereits eine Peak-Pyramide im Hauptprozess (`src/main/waveform/peakPyramid.ts`, `waveformAnalysisService.ts`). Die Logs beweisen: Datenanfragen werden in 1–3 ms beantwortet. Der spürbare Lag liegt im Zeichenweg des Renderers und in der gedrosselten Scroll-/Zoom-Weitergabe.

**Harte Regeln:**

- Der `justDraggedRef`-Klickschutz in `Timeline.tsx` darf NIEMALS verändert werden (`.clinerules` Abschnitt 4). Änderungen an der Zoom-Anker-Logik (Phase B) sind erlaubt, dürfen diesen Mechanismus aber nicht berühren.
- `src/renderer/src/components/timeline/ClipRegion.tsx` ist ein totes, nicht importiertes Modul — nicht anfassen.
- Changelog neutral, keine Fremdmarken (`.clinerules` Abschnitt 2). Versionierung: Phase A = 0.13.10 (Patch), Phase B = 0.14.0 (sichtbares Verhalten), Phase C = 0.15.0 (neues Feature).
- Neue sichtbare Funktionen (Phase C: Analyse-Fortschritt) erfordern eine kurze Ergänzung im Benutzerhandbuch `ManualModal.tsx`.
- Nicht committen/pushen ohne Freigabe von David (Drei-Phasen-Workflow).

---

## Phase A: Waveform-Trace-Logging (zuerst! Messen statt raten)

**Ziel:** Eine Testsession soll auf die Millisekunde zeigen, wo die Zeit beim Zoomen/Scrollen verloren geht. Das ist Davids wichtigstes Anliegen: alles mitloggen können, was passiert (kann später wieder reduziert werden).

**Bestehende Infrastruktur nutzen:** `src/main/logger.ts` (Session-Logdateien), `src/renderer/src/lib/diagnosticLogging.ts` (Kategorie-Toggles, `shouldLogDiagnostic`), Logs-Tab in `SettingsModal.tsx` mit Kategorie-Schaltern, `settingsIpc.ts` für die Persistenz.

**Schritte:**

1. **Request-ID durch die ganze Kette.** Der `WaveformRenderer` erzeugt pro Anfrage eine laufende ID (z. B. `wf-<zähler>`), gibt sie über `getWaveformWindow` als zusätzliches Options-Feld mit; `audioIpc.ts` und `waveformAnalysisService.ts` loggen sie in jeder zugehörigen Zeile mit. Antwort enthält die ID ebenfalls.
2. **Renderer-Timing pro Anfrage.** Im `WaveformRenderer` mit `performance.now()` messen und pro ID als EIN Log-Eintrag schreiben: Zeitpunkt Anfrage gestellt, Antwort empfangen (=IPC-Rundreise), Canvas fertig gezeichnet (=Draw-Dauer separat), plus: Cache-Hit oder Miss, provisional ja/nein, Fensterbreite px, Punktezahl, mode, source.
3. **Gesten-Statistik.** In `Timeline.tsx` (nur Diagnostik-Bereich, existierende `queueTimelineDiagnostic`-Infrastruktur erweitern): pro Zoom-/Scroll-Geste (Beginn bis 300 ms Ruhe) einen Sammel-Eintrag: Anzahl Schritte, Dauer, daraus effektive Schritte/Sekunde, min/max/mittlere Zeit zwischen Scroll-Commit und fertigem Waveform-Draw.
4. **Main-Timing.** In `waveformAnalysisService.ts` pro Anfrage loggen: Wartezeit bis Start, Dauer Decode (falls PCM-Chunk-Pfad), Dauer Aggregation/Pyramidenabfrage, Gesamtdauer. Beim Pyramidenbau: Start, Dauer, Fehler MIT Stack (existiert), plus automatischer **einmaliger Retry** bei Fehlschlag (Log heute zeigt einen "Output stream closed"-Fehlschlag beim ersten Bauversuch).
5. **Schalter.** Neue Log-Kategorie `waveformTrace` im Logs-Tab der Settings (gleiches Muster wie bestehende Kategorien). Vorerst standardmäßig AN (Davids Wunsch: aktuell alles mitloggen; späteres Abschalten ist ein Ein-Zeilen-Default).

**Verifikation A:** App starten, Datei laden, 10 s zoomen/scrollen, Log öffnen: pro Anfrage ein Timing-Eintrag mit ID, pro Geste ein Sammel-Eintrag. Typecheck grün. Version 0.13.10 + neutraler Changelog-Eintrag.

---

## Phase B: Flüssiger Zeichenweg + Playhead-verankerter Zoom

**Ziel:** Zoomen/Scrollen fühlt sich sofort an; der Playhead bleibt beim Zoomen an Ort und Stelle sichtbar.

### B1. Playhead-verankerter Zoom (Davids explizite Anforderung)

Ist-Zustand: Im Mausrad-Zoom-Handler von `Timeline.tsx` (Bereich um den Wheel-Handler, der `zoomAnchorRef` setzt) wird als Anker die **Mausposition** verwendet; der `useLayoutEffect` für Zoom-Commits (Bereich mit `zoomAnchorRef`/`playheadXOld`) nutzt den Playhead nur als Fallback. Folge: Beim Heranzoomen wandert der Playhead aus dem Bild.

Soll-Zustand (Referenzverhalten wie in gängigen Video-/Audioeditoren):

- **Jeder Zoom** (Mausrad, Tastatur, Buttons, Zoom-Menü) verankert sich an der **Playhead-Zeit**: Die Millisekunde, auf der der Playhead steht, behält ihre Bildschirm-X-Position bei; der Zoom "spreizt" sich um sie herum.
- Ist der Playhead beim Zoom-Beginn **außerhalb des Sichtbereichs**, wird er zuerst in die Bildschirmmitte geholt und dort verankert.
- Umsetzung: Im Wheel-Handler `zoomAnchorRef` mit Playhead-Zeit und dessen aktueller (bzw. zentrierter) Bildschirm-X befüllen statt mit der Mausposition; die bestehende Commit-Logik im `useLayoutEffect` kann dann unverändert weiterarbeiten. Gleiches Anker-Verhalten für alle anderen Zoom-Eingänge sicherstellen.
- `justDraggedRef` und die Scroll-Synchronisation nicht anfassen; nur die Anker-Bestimmung ändern.

### B2. Sofort-Reaktion beim Zoomen (Stretch-then-Refine)

Beim Zoomschritt soll das vorhandene Waveform-Bild **synchron im selben Frame** per CSS-Transform horizontal gestreckt/gestaucht werden (Canvas-Element: `transform: scaleX(faktor)` mit passendem `transform-origin` bzw. kompensiertem `left`), sodass optisch nie ein leerer/veralteter Zustand sichtbar ist. Erst wenn die frischen Daten da sind (dank Pyramide ~1–3 ms später plus IPC), wird scharf neu gezeichnet und die Transform zurückgesetzt. Das zeitverankerte Zeichnen (`DrawMapping`) existiert bereits und bleibt als zweite Verteidigungslinie.

### B3. Kachel-Cache im Renderer (Davids "einmal erstellen, dann nur laden" — render-seitig)

Ist-Zustand: Pro Datenantwort wird ein bis zu ~8000 px breiter Canvas komplett neu gemalt (Gradient-Füllung + 3 Strichpfade × Kanäle) — pro Zoomschritt und pro Clip. Das ist der teuerste Posten im Zeichenweg.

Soll-Zustand:

- **Zoom-Stufen quantisieren:** Datenanfragen und Kacheln an diskreten Zoom-Buckets ausrichten (z. B. Faktor √2 oder 2 zwischen Buckets). Zwischen Buckets wird nur skaliert (B2), nicht neu angefragt → Renderer-Cache und Fenster-Cache treffen endlich, statt bei jeder Pixeländerung neu zu rechnen.
- **Kacheln statt Monolith:** Das Waveform-Bild in Offscreen-Canvas-Kacheln fester Breite (z. B. 512 px, `TILE_SIZE_PX` existiert schon) pro (Datei, Kanalmodus, Zoom-Bucket, Kachelindex) rendern und in einem LRU-Cache halten (Budget begrenzen, z. B. einige hundert Kacheln). Sichtbarer Bereich = Kacheln per `drawImage` zusammenkopieren (Blitting, Mikrosekunden) statt Pfade neu zu malen. Scrollen wird damit reines Kopieren.
- **Entkopplung von React:** Das Zusammenkopieren der Kacheln in einem `requestAnimationFrame`-Loop direkt aus `scrollLeftRef` speisen (die Refs existieren in `Timeline.tsx` bereits), statt auf den gedrosselten React-State-Commit (~72 ms) zu warten. Datenanfragen dürfen weiter über den gedrosselten Pfad laufen — nur das Bild muss sofort folgen.
- Amplituden-Normalisierung auf Datei-Peak und Gain-Verhalten unverändert übernehmen. Achtung: Gain-Änderung einer Region invalidiert deren Kacheln (oder Gain als reine Zeichen-Skalierung beim Blitting anwenden, dann keine Invalidierung nötig — bevorzugt).

**Verifikation B:** Trace-Logs aus Phase A vergleichen (vorher/nachher): Zeit Scroll-Commit→Bild und Draw-Dauern müssen deutlich sinken; Zoom-Geste visuell ohne Springen/Leerstellen; Playhead bleibt beim Zoomen exakt stehen (Test: Playhead mittig setzen, 10 Zoomstufen rein/raus — Marker darf nicht wandern; Playhead außerhalb → erster Zoomschritt zentriert ihn). Version 0.14.0 + Changelog.

---

## Phase C: Proxy-Dateien (Analyse beim Import, auf Platte, projektverknüpft)

**Ziel (Davids Anforderung):** Beim Reinladen eines Tracks wird einmal analysiert (kurze, sichtbare Ladezeit), das Ergebnis als "Proxy-Datei" im Nutzerordner des Programms abgelegt und bei jedem weiteren Laden nur noch gelesen. Proxys sind mit Quellpfad und Projekt verknüpft; ohne gespeichertes Projekt sind sie temporär und werden wieder aufgeräumt.

**Schritte:**

1. **Speicherort:** Unterordner `waveform-proxies` im selben Basisordner, den `logger.ts` als Datenordner auflöst (dort liegen auch `logs` u. a.). Dateiname = stabiler Hash des bestehenden Datei-Fingerprints (Pfad+Größe+mtime, existiert in `waveformAnalysisService.ts`).
2. **Format:** Eigenes kompaktes Binärformat mit kleinem Header (Formatversion, Samplerate, Kanäle, Frames, filePeak, Levelanzahl, je Level samplesPerPoint und Punktzahl) gefolgt von den Float32-Leveldaten der Pyramide. Beim Lesen Formatversion prüfen; bei Abweichung neu bauen. Kein JSON für die Nutzdaten (zu groß/langsam).
3. **Index:** Eine `index.json` im Proxy-Ordner: pro Proxy Fingerprint, Quellpfad, Erstellzeit, letzte Nutzung, Liste der Projektdateien, die ihn referenzieren. Index-Updates atomar schreiben (Temp-Datei + Rename).
4. **Lebenszyklus:**
   - Erzeugt beim **Import** einer Datei (nicht erst beim ersten Anzeigen): Pyramidenbau startet sofort, mit Fortschritt (siehe 5). Nach Fertigstellung → auf Platte schreiben, Index-Eintrag anlegen (zunächst ohne Projektreferenz = temporär).
   - Beim **Projekt speichern** (`save-project`-Pfad im Main): alle Proxys der im Projekt verwendeten Dateien im Index mit dem Projektpfad verknüpfen.
   - **Aufräumen beim App-Start** (nicht beim Beenden, das ist robuster gegen Abstürze): Proxys ohne Projektreferenz und älter als 7 Tage löschen; Proxys, deren referenzierte Projektdateien nicht mehr existieren, dereferenzieren; Gesamtgröße des Ordners auf ein Budget begrenzen (z. B. 2 GB, LRU nach letzter Nutzung).
   - Beim **Laden** einer Datei: erst Index/Platte prüfen (Fingerprint-Treffer → Pyramide von Platte lesen, Sekundenbruchteil), sonst bauen. RAM-LRU (`pyramidCache`) bleibt als erste Ebene bestehen.
5. **Sichtbarer Fortschritt beim Import:** Der Pyramidenbau kennt die Gesamtframezahl (aus ffprobe-Dauer) und meldet Fortschritt per IPC-Event (Muster von `waveform:pyramid-ready` erweitern, z. B. `waveform:pyramid-progress` mit Prozent). Der Clip in der Timeline zeigt während der Analyse einen dezenten Fortschrittszustand im bestehenden blauen Stil ("Analysiere… n %"); der Übergangs-Waveform-Pfad (Overview) bleibt darunter sichtbar wie bisher.
6. **Robustheit:** Der einmalige Bau-Retry aus Phase A greift auch hier; fehlgeschlagene Proxys hinterlassen keine halben Dateien (erst in Temp-Datei schreiben, dann umbenennen).
7. **Handbuch:** Kurzer Absatz in `ManualModal.tsx` (Analyse beim Import, Speicherort, automatisches Aufräumen).

**Verifikation C:** Datei importieren → Fortschritt sichtbar, danach Log `Peak-Pyramide fertig` + Proxy-Datei existiert. App neu starten, gleiche Datei laden → KEIN neuer Pyramidenbau im Log, Waveform sofort scharf. Projekt speichern → Index enthält Projektreferenz. Projekt-Datei löschen + App-Neustart (Alter simulieren oder Schwelle testweise auf 0) → Proxy wird aufgeräumt. Version 0.15.0 + Changelog + Handbuch.

---

## Bekannte Grenzen / bewusst außen vor

- Sample-Zoom-Pfad (PCM-Chunks) bleibt wie in 0.13.9; die Chunk-Zeiten (30–140 ms beim Erstzugriff) sind akzeptabel und werden durch Phase A messbar.
- Exakter Sample-Seek bei komprimierten Formaten bleibt ein mögliches Folgethema.

## Reihenfolge und Freigaben

A umsetzen → David testet mit Trace-Logs → B umsetzen → David testet → C umsetzen → David testet. Kein Push ohne separate Freigabe.
