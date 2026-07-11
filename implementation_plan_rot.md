# Plan ROT: Kritische Waveform-Bugfixes (→ Version 0.13.11)

Stand: 2026-07-11 · Basis: 0.13.10 · Priorität: HOCH — zuerst umsetzen, vor Orange und Gelb.

---

## 0. Anweisungen für den ausführenden Agenten (zuerst lesen)

- Dieser Plan beschreibt zwei bewiesene Fehler und ihre Behebung. Setze GENAU diese zwei Punkte um — keine weiteren Umbauten, keine Verschönerungen nebenbei.
- Beide Fehler sind durch eine Testsession-Logdatei belegt (Zitate unten), nicht spekulativ.
- Nach der Umsetzung: `npm run typecheck` (muss fehlerfrei sein). NICHT `npm run build`/`npm run check` ausführen (baut das native VST-Modul, unnötig lange).
- Code-Stil: 2 Leerzeichen, keine Semikolons, deutsche Kommentare.
- `src/renderer/src/components/Timeline.tsx` wird in diesem Plan NICHT angefasst. Der dortige `justDraggedRef`-Schutz darf laut Projektregeln (`.clinerules`) niemals verändert werden.
- Changelog neutral formulieren, keine Fremdmarken, keine dramatisierenden Begriffe (`.clinerules` Abschnitt 2).
- NICHT committen oder pushen — nach Umsetzung und Typecheck stoppen und berichten. Release macht David separat.

---

## 1. Fehler 1: Proxy-Datei-Speicherung schlägt immer fehl (Puffer 4 Bytes zu klein)

**Beleg aus dem Log (Produktivversion 0.13.10):**
```
[WARN ] [WAVEFORMPROXY] Proxy-Datei konnte nicht gespeichert werden
RangeError: Offset is outside the bounds of the DataView
    at serializePyramid (...)
    at saveProxyToDisk (...)
```

**Auswirkung:** Das Feature "Waveform-Analyse als Proxy-Datei speichern" (eingeführt in 0.13.10) funktioniert effektiv gar nicht. Jeder App-Neustart analysiert jede Datei erneut. Der Fehler wird nur als Warnung geloggt, die Anzeige funktioniert trotzdem — deshalb ist es bisher niemandem aufgefallen.

**Ursache:** In `src/main/waveform/proxyStore.ts`, Funktion `serializePyramid`: Der Header des Binärformats umfasst **7** Felder à 4 Bytes (magic, version, sampleRate, channels, frames, filePeak, levelCount — siehe Kommentar über der Funktion), aber die Größenberechnung reserviert nur Platz für **6**:

```
const totalSize = 4 * 6 + levelHeaderBytes + dataBytes
```

Beim Schreiben des letzten Float32-Werts läuft der Offset dadurch 4 Bytes über das Pufferende hinaus.

**Behebung:**
1. `4 * 6` durch `4 * 7` ersetzen (bzw. besser: eine benannte Konstante `HEADER_FIELD_COUNT = 7` einführen und `4 * HEADER_FIELD_COUNT` rechnen, damit der Fehler bei künftigen Header-Erweiterungen nicht wieder passiert).
2. Zur Absicherung direkt nach `serializePyramid` in `saveProxyToDisk` einen Selbsttest ergänzen: den frisch erzeugten Buffer einmal durch `deserializePyramid` schicken; wenn `null` zurückkommt, NICHT speichern und eine Warnung loggen. Kostet einmalig wenige Millisekunden pro Datei und verhindert, dass jemals eine defekte Proxy-Datei auf Platte landet.

**Hinweis:** Es existieren keine kaputten Altdateien auf Platte (das Speichern ist ja immer fehlgeschlagen, der `index.json`-Eintrag wird bei Schreibfehler nicht angelegt bzw. beim Ladefehler automatisch bereinigt). Keine Migration nötig.

**Verifikation:**
- `npm run dev`, eine Audiodatei laden. Im Session-Log (Menü → Logs) muss `Proxy-Datei gespeichert` erscheinen (statt `konnte nicht gespeichert werden`).
- App beenden, neu starten, dieselbe Datei laden → Log muss `Peak-Pyramide von Proxy-Datei geladen` zeigen, und es darf KEIN neuer `Peak-Pyramide fertig`-Eintrag mit `buildMs` für diese Datei entstehen.
- Ordner prüfen: Im Programm-Datenordner (`%APPDATA%/OmegaProjects/Omega Wave Editor/waveform-proxies/`) liegen jetzt eine `.owp`-Datei und eine `index.json`.

---

## 2. Fehler 2: Einzelne Zeichenvorgänge dauern Sekunden (bis 14 s gemessen)

**Beleg aus dem Log:**
```
"mode":"samples","points":1012105,"channels":2,"widthPx":6656,"drawMs":14244
```

**Auswirkung:** Beim Zoomen in einen bestimmten Bereich friert die Oberfläche sekundenlang ein — über 1 Million Samplepunkte × 2 Kanäle werden als Canvas-Pfad gezeichnet, auf nur 6656 Pixel Breite. Das sind ~152 Samples pro Pixel: Einzelsamples sind da visuell ohnehin nicht unterscheidbar, der Sample-Modus bringt in dieser Zoomstufe null Mehrwert und kostet Sekunden.

**Ursache:** In `src/main/waveform/waveformAnalysisService.ts` steuern zwei Konstanten den Sample-Modus:
- `SAMPLE_MODE_MAX_SPP = 192` — Sample-Modus greift schon ab 192 Samples pro Pixel (viel zu früh; sinnvoll ist er erst, wenn nur noch wenige Samples pro Pixel da sind).
- `MAX_SAMPLE_MODE_POINTS = 1_200_000` — erlaubt Antworten mit bis zu 1,2 Mio Punkten (viel zu viel für einen Canvas-Pfad).

**Behebung** (nur diese zwei Konstanten und die zugehörige Bedingung, keine Umbauten am Zeichencode):
1. `SAMPLE_MODE_MAX_SPP` von `192` auf `4` senken. Begründung: Die Sample-Punkte (Kreise) werden im Renderer ohnehin erst ab ~5 px Abstand zwischen Samples gezeichnet; eine verbundene Sample-Linie ist bis ~4 Samples pro Pixel sinnvoll, darüber sehen Peaks identisch aus und sind hundertfach billiger.
2. `MAX_SAMPLE_MODE_POINTS` von `1_200_000` auf `200_000` senken (Sicherheitsnetz, falls jemand mit sehr breitem Fenster bei spp≈4 landet: 200k Punkte zeichnen sich in wenigen Dutzend Millisekunden).
3. Die bestehende Auswahl-Bedingung in `getWaveformWindow` (`samplesPerPixel <= SAMPLE_MODE_MAX_SPP && frames <= MAX_SAMPLE_MODE_POINTS ? buildSampleResponse : buildPeakResponse`) bleibt strukturell unverändert — sie greift durch die neuen Konstanten nur seltener. Fällt eine Anfrage aus dem Sample-Modus heraus, liefert `buildPeakResponse` automatisch die Peak-Darstellung mit maximal `pixels` Punkten.

**Wichtig:** Der PCM-Chunk-Datenpfad (`getPcmForWindow`) bleibt unangetastet — der ist schnell. Es geht nur um die Modus-Schwelle.

**Verifikation:**
- `npm run dev`, Datei laden, in mehreren Stufen tief hineinzoomen (Strg+Mausrad), dabei zügig scrollen.
- Kein Einfrieren mehr. Im Log (Kategorie `waveformTrace`, Einträge `Waveform gezeichnet`) darf kein `drawMs` über ~200 ms mehr auftauchen, und `"mode":"samples"` darf nur noch mit `points` unter ~200000 erscheinen.
- Ganz tiefer Zoom (einzelne Samples sichtbar): Sample-Punkte mit Verbindungslinie erscheinen weiterhin korrekt.

---

## 3. Abschluss

1. `npm run typecheck` fehlerfrei.
2. `package.json`: Version `0.13.10` → `0.13.11`.
3. `CHANGELOG.md`: neuen Eintrag `## [0.13.11] - <Datum>` VOR `## [0.13.10]` einfügen, zweisprachig (Muster der bestehenden Einträge übernehmen), unter `#### Fixed`/`#### Behoben`, sinngemäß:
   - EN: "Fixed waveform proxy files failing to save due to an undersized binary header, which caused every file to be re-analyzed after each restart." / "Fixed multi-second UI freezes when zooming into a range where the sample-level view was selected far too early; the sample view now activates only at very high zoom levels."
   - DE: "Fehler behoben, durch den Waveform-Proxy-Dateien wegen eines zu klein berechneten Binär-Headers nie gespeichert wurden und jede Datei nach einem Neustart erneut analysiert werden musste." / "Mehrsekündige Einfrierer beim Hineinzoomen behoben: Die Einzelsample-Darstellung wurde viel zu früh aktiviert und musste über eine Million Punkte zeichnen; sie greift jetzt erst bei sehr starkem Zoom."
4. `task.md`: Plan-ROT-Punkte abhaken, Status aktualisieren.
5. Stoppen und berichten. NICHT committen/pushen.
