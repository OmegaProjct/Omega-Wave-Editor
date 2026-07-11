# Plan ORANGE: Unsauberkeiten mit realem Risiko (→ Version 0.13.12)

Stand: 2026-07-11 · Basis: 0.13.11 (Plan ROT muss vorher umgesetzt sein) · Priorität: MITTEL.

---

## 0. Anweisungen für den ausführenden Agenten (zuerst lesen)

- Vier voneinander unabhängige Aufräum-/Robustheitspunkte. In der angegebenen Reihenfolge umsetzen, nach jedem Punkt `npm run typecheck`.
- NICHT `npm run build`/`npm run check` ausführen (baut das native VST-Modul).
- Code-Stil: 2 Leerzeichen, keine Semikolons, deutsche Kommentare.
- `src/renderer/src/components/Timeline.tsx`: Der `justDraggedRef`-Schutz darf laut `.clinerules` niemals verändert werden. Dieser Plan benötigt in dieser Datei keine Änderungen.
- `src/renderer/src/components/timeline/ClipRegion.tsx` NICHT anfassen (totes Modul, wird in Plan GELB behandelt).
- Changelog neutral, keine Fremdmarken (`.clinerules`).
- NICHT committen oder pushen — nach Umsetzung stoppen und berichten.

---

## 1. Toten `get-peaks`-Pfad entfernen (inkl. Zufallsdaten-Fallback)

**Problem:** Es existiert eine komplette, von niemandem mehr aufgerufene Alt-Kette für Waveform-Peaks. Besonders kritisch: Bei ungültigem Pfad liefert sie **erfundene Zufallswerte** (`Math.random() * 0.8`) als Wellenform zurück — für einen Audio-Editor inakzeptabel, weil eine nicht existierende Welle echt aussieht. Außerdem enthält sie noch die alte, quadratisch langsame `Buffer.concat`-Schleife.

**Bestandsaufnahme (vor dem Löschen selbst per Suche verifizieren!):**
- `src/main/ipc/audioIpc.ts`: `ipcMain.handle('get-peaks', ...)` — kompletter Handler inkl. Inline-FFmpeg-Decode auf 8 kHz.
- `src/preload/index.ts`: Zeile `getPeaks: (filePath, samples?, channel?) => ipcRenderer.invoke('get-peaks', ...)`.
- `src/preload/index.d.ts` und `src/renderer/src/env.d.ts`: die jeweilige `getPeaks`-Typsignatur.
- `src/main/waveform/waveformAnalysisService.ts`: exportierte Funktion `getLegacyPeaks` (wird nirgends importiert).

**Vorgehen:**
1. Projektweit nach `getPeaks` und `get-peaks` und `getLegacyPeaks` suchen. Erwartung: Treffer NUR an den oben gelisteten Definitionsstellen, keine Aufrufer im Renderer. Falls doch ein Aufrufer existiert: STOPPEN und berichten statt löschen.
2. Alle gelisteten Stellen ersatzlos entfernen.
3. Typecheck.

**Verifikation:** App starten, Datei laden, zoomen — Waveform funktioniert unverändert (läuft komplett über `waveform:get-window`).

---

## 2. Unnötigen Übersichts-Decode vermeiden, wenn ein Proxy auf Platte existiert

**Problem:** In `src/main/waveform/waveformAnalysisService.ts` prüft `getWaveformWindow` den Pyramiden-Status synchron direkt nach `ensurePyramid()`. Der Platten-Ladeversuch (`loadProxyFromDisk`) passiert aber erst innerhalb der asynchronen Promise-Kette — im Moment der Statusprüfung ist der Status daher immer noch `'building'`, selbst wenn der Proxy in Millisekunden von Platte geladen würde. Folge: Die erste Anfrage pro Datei und Sitzung startet IMMER zusätzlich den teuren Übersichts-Volldecode (`getOverviewPcm`, kompletter FFmpeg-Durchlauf der Datei) — auch wenn er gleich darauf überflüssig ist.

**Vorgehen:** In `ensurePyramid` (gleiche Datei) den Platten-Ladeversuch VOR dem Anlegen des `'building'`-Zustands **synchron** ausführen (`loadProxyFromDisk` ist bereits eine synchrone Funktion):
- Treffer → `PyramidState` sofort mit `status: 'ready'`, geladener Pyramide und einem bereits aufgelösten Promise anlegen, `broadcastPyramidReady(filePath)` senden, in den Cache legen, zurückgeben. Der Decode-Pfad wird gar nicht erst gestartet.
- Kein Treffer → bisheriges Verhalten (Streaming-Decode mit Retry, danach `saveProxyToDisk`), aber den jetzt doppelten `loadProxyFromDisk`-Aufruf aus der Promise-Kette (`buildAndPersist`) entfernen.

Der synchrone Dateiread blockiert den Main-Prozess einmalig pro Datei um typischerweise wenige Millisekunden (Proxy-Dateien sind wenige MB groß) — akzeptabel; genau dieser Weg macht den Status-Race komplett zu.

**Verifikation:** App neu starten, bekannte Datei laden. Im Log darf für diese Datei KEIN `"source":"overview-fallback"`-Eintrag mehr erscheinen; die erste Antwort kommt direkt mit `"source":"pyramid"`.

---

## 3. Renderer-Caches gegen auf Platte veränderte Dateien absichern

**Problem:** Die Main-Prozess-Caches erkennen über einen Fingerprint (Pfad + Dateigröße + Änderungszeit), wenn eine Datei ersetzt wurde. Die beiden Renderer-Caches in `src/renderer/src/components/WaveformRenderer.tsx` (`rendererWaveformCache` für Datenfenster, `waveformTileBitmapCache` für fertige Bilder) schlüsseln aber nur über den Dateipfad. Wird eine Datei bei laufender App überschrieben (z. B. neu exportiert), zeigt die Timeline bis zum App-Neustart die alte Wellenform.

**Vorgehen:**
1. Main-Seite: In `waveformAnalysisService.ts` das Feld `fingerprint: string` in die `WaveformWindowResponse` aufnehmen (Wert: `info.fingerprint`, steht in `getWaveformWindow` bereits zur Verfügung). Typ `WaveformWindowResponse` entsprechend erweitern.
2. Renderer-Seite (`WaveformRenderer.tsx`):
   - Lokalen Typ `WaveformWindowData` um `fingerprint?: string` erweitern.
   - Modul-weite Map `lastKnownFingerprintByPath: Map<string, string>` anlegen.
   - Beim Eintreffen jeder Antwort: Ist für `filePath` bereits ein anderer Fingerprint bekannt, ALLE Einträge beider Caches löschen, deren Schlüssel mit diesem `filePath` beginnen (beide Schlüssel beginnen mit dem Dateipfad; beim Bitmap-Cache-Schlüssel den Aufbau prüfen und ggf. sicherstellen, dass `filePath` das erste Segment ist). Danach neuen Fingerprint merken.
3. Kein neues IPC-Ereignis nötig — die Erkennung läuft passiv über die nächste Antwort nach der Dateiänderung (die Main-Seite liefert wegen ihres eigenen Fingerprint-Cachings dann ohnehin frische Daten).

**Verifikation:** Datei laden, Wellenform ansehen. Datei außerhalb der App durch eine andere gleichnamige Audiodatei ersetzen. In der Timeline scrollen/zoomen → nach kurzem Moment erscheint die Wellenform der NEUEN Datei, ohne App-Neustart.

---

## 4. Cache-Budgets nach Bytes statt Eintragszahl

**Problem:** Zwei Caches sind nur über die Eintragszahl begrenzt, ihre Einträge sind aber extrem unterschiedlich groß — im Worst Case summiert sich das auf mehrere hundert MB RAM:
- `waveformTileBitmapCache` in `WaveformRenderer.tsx`: max. 48 Canvas-Snapshots; ein Snapshot kann bei maximaler Bitmap-Breite (16384 px) mehrere Dutzend MB belegen.
- `windowCache` in `waveformAnalysisService.ts`: max. 120 Antworten; eine Antwort kann bei 120 000 Punkten × 3 Reihen × 2 Kanälen mehrere MB Float32-Daten enthalten.

**Vorgehen:**
1. Bitmap-Cache: Pro Eintrag Bytes schätzen (`canvas.width * canvas.height * 4`), Modul-Konstante `MAX_TILE_BITMAP_BYTES` (Vorschlag: 96 MB) einführen, laufende Summe mitführen. Beim Einfügen so lange die ältesten Einträge entfernen (Map-Iterationsreihenfolge = LRU, wie bisher), bis die Summe unter dem Budget liegt. Die bestehende Stückzahl-Grenze (48) als zweite Schranke beibehalten.
2. `windowCache`: Pro Antwort Bytes schätzen (Summe über alle Kanäle: Länge von `min`/`max`/`rms`/`samples` × 4 Bytes, unabhängig davon ob `Float32Array` oder `number[]` — bei `number[]` denselben Schätzwert verwenden, es geht um die Größenordnung). Budget-Konstante (Vorschlag: 64 MB), gleiche LRU-Logik. Stückzahl-Grenze (120) beibehalten.
3. Die Schätzfunktion jeweils als kleine Hilfsfunktion neben dem Cache implementieren, mit deutschem Kommentar, warum geschätzt statt exakt gemessen wird.

**Verifikation:** Typecheck; App starten, mehrere große Dateien laden, viel zoomen/scrollen — Verhalten unverändert flüssig. (Die Budget-Wirkung selbst ist ohne Speicherprofiler schwer sichtbar; entscheidend ist, dass nichts bricht.)

---

## 5. Abschluss

1. `npm run typecheck` fehlerfrei.
2. `package.json`: Version → `0.13.12`.
3. `CHANGELOG.md`: neuer Eintrag `## [0.13.12]` VOR dem 0.13.11-Eintrag, zweisprachig, Muster der Bestandseinträge. Inhaltlich unter `#### Fixed`/`#### Behoben` bzw. `#### Changed`/`#### Geändert`, sinngemäß: Entfernung eines veralteten, ungenutzten Peak-Datenpfads, der bei Fehlern Platzhalterdaten liefern konnte; kein doppelter Analyse-Durchlauf mehr beim Start, wenn eine gespeicherte Analyse existiert; Wellenform-Anzeige aktualisiert sich jetzt automatisch, wenn eine Quelldatei auf der Festplatte ersetzt wurde; Speicherverbrauch der Waveform-Zwischenspeicher nach Datenmenge begrenzt.
4. `task.md`: Plan-ORANGE-Punkte abhaken.
5. Stoppen und berichten. NICHT committen/pushen.
