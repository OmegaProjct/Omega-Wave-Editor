# Plan GELB: Aufräumen und Feinschliff (→ Version 0.13.13)

Stand: 2026-07-11 · Basis: 0.13.12 (Pläne ROT und ORANGE müssen vorher umgesetzt sein) · Priorität: NIEDRIG.

---

## 0. Anweisungen für den ausführenden Agenten (zuerst lesen)

- Sechs unabhängige, kleine Verbesserungen. Reihenfolge egal, aber nach jedem Punkt `npm run typecheck`.
- NICHT `npm run build`/`npm run check` ausführen (baut das native VST-Modul). Ausnahme: Punkt 5 verlangt einmalig `npx electron-vite build` zur Prüfung der Build-Warnung — NICHT das npm-Skript `build` (das würde zusätzlich das native Modul bauen).
- Code-Stil: 2 Leerzeichen, keine Semikolons, deutsche Kommentare.
- `Timeline.tsx`: `justDraggedRef`-Schutz niemals verändern (`.clinerules`). Punkt 6 dieses Plans ändert in Timeline.tsx NUR die Gesten-Statistik-Funktion, sonst nichts.
- Changelog neutral, keine Fremdmarken.
- NICHT committen oder pushen — nach Umsetzung stoppen und berichten.

**Bewusst NICHT in diesem Plan enthalten** (zu groß für Feinschliff, nur auf separaten Auftrag von David):
- Aufteilung des Timeline-Monolithen (~6700 Zeilen) in Teilmodule.
- Renderer-Code-Splitting des 1,9-MB-Bundles (Punkt 5 behebt nur die Import-Warnung).

**WICHTIG — Stand nach Umsetzung von Plan ORANGE (0.13.12): Die Punkte 1, 2 und 3 dieses Plans wurden bereits miterledigt und nachgeprüft** (Float32Array in `buildSampleResponse`; `get-media-info` wirft jetzt Fehler statt Platzhalterdaten, alle vier Renderer-Aufrufer haben verifizierte catch-Pfade; Proxy-Dateinamen nutzen SHA-256). **NUR noch die Punkte 4, 5 und 6 umsetzen.** Im Changelog für 0.13.13 entsprechend nur diese drei Punkte erwähnen.

---

## 1. Sample-Antworten als Float32Array übertragen

**Problem:** `buildSampleResponse` in `src/main/waveform/waveformAnalysisService.ts` baut `samples` als `number[]` (nach Plan ROT bis zu 200 000 Zahlen pro Kanal) und schickt sie so über IPC. Der Pyramidenpfad nutzt längst `Float32Array` (schnellere Struktured-Clone-Übertragung, weniger GC-Druck).

**Vorgehen:** In `buildSampleResponse` das `samples`-Array pro Kanal als `Float32Array(frames)` anlegen und befüllen. Der Typ `WaveformSeries = Float32Array | number[]` deckt das bereits ab — auf Renderer-Seite ist keine Änderung nötig (dort wird nur per Index und `.length` zugegriffen; das selbst prüfen: in `WaveformRenderer.tsx` nach Verwendungen von `.samples` suchen und sicherstellen, dass keine Array-only-Methoden wie `.map`/`.push` darauf laufen).

**Verifikation:** Tief zoomen bis zur Sample-Ansicht — Darstellung unverändert (Linie + Punkte).

---

## 2. `get-media-info` soll bei Fehlern keinen Fake-Wert liefern

**Problem:** Der Handler `get-media-info` in `src/main/ipc/audioIpc.ts` liefert bei ungültigem Pfad und bei ffprobe-Fehlern stillschweigend `{ duration: 10, tags: {} }` — eine erfundene 10-Sekunden-Angabe, mit der der Aufrufer dann falsch weiterarbeitet.

**Vorgehen:**
1. Alle Renderer-Aufrufer von `getMediaInfo` suchen (`window.api.getMediaInfo`) und notieren, wie sie mit einer Ablehnung (rejected Promise) umgehen würden.
2. Handler ändern: bei ungültigem Pfad und bei ffprobe-Fehler eine aussagekräftige Fehlermeldung werfen (`throw new Error(...)` bzw. `reject`), statt Platzhalterdaten zu liefern.
3. Bei jedem Aufrufer sicherstellen, dass die Ablehnung sauber behandelt wird (mindestens: Fehler-Log über die bestehende Logging-Infrastruktur plus verständliche Nutzer-Rückmeldung an der Stelle, an der der Import/Ladevorgang scheitert — vorhandene Fehlerpfade der jeweiligen Komponente wiederverwenden, keine neuen Dialog-Systeme erfinden).

**Verifikation:** Normale Datei laden → funktioniert. Absichtlich eine nicht-Audio-Datei (z. B. `.txt` in `.mp3` umbenannt) importieren → verständliche Fehlermeldung statt eines 10-Sekunden-Geisterclips.

---

## 3. Proxy-Dateinamen kollisionssicher machen

**Problem:** `fingerprintToFileName` in `src/main/waveform/proxyStore.ts` bildet den Dateinamen aus einem selbstgebauten 32-Bit-Hash. Bei vielen Dateien sind Kollisionen möglich (Geburtstagsparadoxon) — zwei Quelldateien würden sich dieselbe Proxy-Datei gegenseitig überschreiben, der Index bliebe inkonsistent.

**Vorgehen:** Hash durch Node-Bordmittel ersetzen: `crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 24)` (Import `crypto` aus `node:crypto`). Dateiname: `proxy_<hash>.owp`. Alte Namenskonvention muss nicht migriert werden: vorhandene Einträge behalten ihren im Index gespeicherten `fileName`; nur NEUE Einträge bekommen den neuen Namen (der Code nutzt bereits `existing?.fileName || fingerprintToFileName(...)` — dieses Verhalten beibehalten).

**Verifikation:** Neue Datei laden → `.owp`-Datei mit langem Hash-Namen entsteht, Neustart lädt sie korrekt.

---

## 4. Totes Modul `ClipRegion.tsx` entfernen

**Problem:** `src/renderer/src/components/timeline/ClipRegion.tsx` wird nirgends importiert (vor dem Löschen selbst per Suche nach `ClipRegion` verifizieren!). Es ist eine veraltete Kopie des Region-Renderings mit inzwischen falscher Waveform-Anbindung — reine Verwechslungsgefahr für künftige Arbeiten.

**Vorgehen:** Projektweit nach `ClipRegion` suchen. Erwartung: Treffer nur in der Datei selbst (und ggf. in Plan-/Doku-Dateien, die zählen nicht). Dann die Datei löschen; falls der Ordner `timeline/` dadurch leer wird, auch den Ordner entfernen. Falls doch ein Import existiert: STOPPEN und berichten.

**Verifikation:** Typecheck fehlerfrei, App startet, Regionen werden normal gerendert.

---

## 5. Doppelten MidiEngine-Import bereinigen (Build-Warnung)

**Problem:** Der Produktions-Build warnt: `MidiEngine.ts` wird von `AudioEngine.ts` dynamisch importiert, aber von `SettingsModal.tsx`, `Timeline.tsx` und `VstPluginRack.tsx` statisch — der dynamische Import bringt dadurch nichts (Modul landet sowieso im Hauptbundle).

**Vorgehen:**
1. In `src/renderer/src/lib/AudioEngine.ts` die dynamischen `import('./MidiEngine')`-Stellen suchen und verstehen, WARUM sie dynamisch sind (Zirkularität? Ladezeitpunkt?).
2. Wenn kein Zirkular-Import entsteht (prüfen: importiert `MidiEngine.ts` seinerseits `AudioEngine.ts`?): auf normalen statischen Import umstellen — Warnung verschwindet, Verhalten identisch.
3. Wenn doch Zirkularität besteht: Finger weg vom Import, stattdessen nur einen kurzen deutschen Kommentar an die dynamischen Import-Stellen schreiben, der die Zirkularität dokumentiert, und die Warnung als bekannt/akzeptiert in diesem Plan-Dokument vermerken. In Timeline.tsx in diesem Fall NICHTS ändern.
4. Prüfung per `npx electron-vite build` (nur Bundling, ohne natives Modul): Warnung weg bzw. dokumentiert.

**Verifikation:** App starten, MIDI-Einstellungen öffnen (Settings → MIDI) — keine Fehler in der Konsole/im Log.

---

## 6. Gesten-Statistik: unsinnige Schrittraten bei Mini-Gesten vermeiden

**Problem:** Die Trace-Log-Funktion `flushWaveformGesture` in `Timeline.tsx` rechnet `steps / durationMs`. Bei einer Geste aus nur einem Eingabe-Tick ist die Dauer ~1 ms → im Log stehen absurde `stepsPerSecond: 1000`.

**Vorgehen:** In `flushWaveformGesture`: Wenn `gesture.steps < 3` oder die Dauer unter 50 ms liegt, das Feld `stepsPerSecond` weglassen (oder `null` loggen) und nur `steps`/`durationMs` schreiben. Nichts anderes in der Funktion ändern.

**Verifikation:** Einmal kurz und einmal lang zoomen; Log-Einträge `Zoom-/Scroll-Geste abgeschlossen` prüfen — plausible Raten, keine 1000er-Ausreißer mehr.

---

## 7. Abschluss

1. `npm run typecheck` fehlerfrei.
2. `package.json`: Version → `0.13.13`.
3. `CHANGELOG.md`: neuer Eintrag `## [0.13.13]` VOR dem 0.13.12-Eintrag, zweisprachig, Muster der Bestandseinträge, sinngemäß: schnellere Übertragung der Einzelsample-Daten; klare Fehlermeldung statt Platzhalterwerten bei unlesbaren Mediendateien; robustere Benennung der Waveform-Proxy-Dateien; Entfernung eines ungenutzten Altmoduls; Bereinigung einer Build-Warnung; präzisere Gesten-Statistik im Diagnose-Log.
4. `task.md`: Plan-GELB-Punkte abhaken.
5. Stoppen und berichten. NICHT committen/pushen.
