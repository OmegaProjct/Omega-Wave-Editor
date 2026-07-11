# Plan BLAU: Timeline-Monolith schrittweise zerlegen (→ Version 0.13.15)

Stand: 2026-07-12 · Basis: 0.13.14 (Plan GRÜN muss vorher umgesetzt sein) · Priorität: NIEDRIG, aber HOHES RISIKO — sorgfältigster Plan von allen.

---

## 0. Anweisungen für den ausführenden Agenten (WICHTIG, komplett lesen)

`src/renderer/src/components/Timeline.tsx` hat ~6600 Zeilen und ist das Herz der App: Zoom, Scroll, Playhead, Drag & Drop, Schnitt, Diagnostik, Rendering — alles in einer Datei. Ziel dieses Plans ist es, **gefahrlos herauslösbare Teile** in eigene Module zu verschieben, damit künftige Änderungen weniger riskant sind.

**Eiserne Regeln:**

1. **Reines Verschieben, null Verhaltensänderung.** Kein Umbenennen von Funktionen/Variablen, kein "Verbessern" von Logik im Vorbeigehen, keine neuen Abstraktionen. Jede Scheibe muss ein mechanischer Umzug sein, dessen Korrektheit man durch Lesen des Diffs prüfen kann.
2. **Der `justDraggedRef`-Klickschutz und ALLES, was ihn berührt, bleibt in Timeline.tsx.** Er darf laut `.clinerules` niemals verändert werden — deshalb wird er auch nicht verschoben.
3. **Ebenfalls NICHT verschieben** (zu eng verflochten, Umzug wäre Umbau): die gesamte Zoom-/Scroll-Commit-Logik (`syncScrollState`, `commitScrollState`, `applyScrollVisuals`, der Zoom-`useLayoutEffect`, der Wheel-Handler), die Drag-/Trim-/Fade-Handler und das Region-Rendering im JSX.
4. **Nach JEDER Scheibe:** `npm run typecheck` fehlerfrei UND `npm run dev` mit kurzem Funktionstest (Datei laden, zoomen, scrollen, Region verschieben, Play drücken). Erst dann die nächste Scheibe.
5. Wenn eine Scheibe nicht sauber herausgeht (Typfehler-Kaskade, zirkulärer Import, unklare Abhängigkeit): diese Scheibe ZURÜCKROLLEN, im Bericht vermerken, mit der nächsten weitermachen. Kein Erzwingen.
6. Kein `npm run build`/`check` (natives VST-Modul). Code-Stil: 2 Leerzeichen, keine Semikolons, deutsche Kommentare. NICHT committen/pushen.

**Zielstruktur:** neue Dateien unter `src/renderer/src/components/timeline/` (der Ordner ist nach Plan GRÜN leer bzw. entfernt — neu anlegen). Die drei früher dort liegenden Altdateien sind gelöscht und dürfen NICHT als Vorlage benutzt werden.

---

## Scheibe 1: Reine Hilfsfunktionen und Konstanten → `timeline/timelineUtils.ts`

Kandidaten sind Funktionen/Konstanten auf Modulebene von Timeline.tsx, die **keinen React-State und keine Refs** benutzen, z. B. (vorher im Code verifizieren): `formatTime`, `getNextZoomLevel`, `clampZoomLevel`, `MIN_ZOOM_LEVEL`, `MAX_ZOOM_LEVEL`, `ZOOM_MENU_LEVELS`, `PIXELS_PER_SECOND_BASE` sowie weitere reine Helfer, die bei der Durchsicht auffallen (Kriterium: keine Verwendung von `useState`/`useRef`/Props, keine DOM-Zugriffe auf Timeline-interne Refs).

Vorgehen: Funktionen unverändert in die neue Datei verschieben, dort `export`ieren, in Timeline.tsx importieren. Sucht andere Dateien, die dieselben Konstanten evtl. schon aus Timeline.tsx importieren — falls ja, Importpfade dort mit umstellen.

## Scheibe 2: Typen → `timeline/timelineTypes.ts`

Die in Timeline.tsx definierten und teils exportierten Typen (`Track`, `Region`, `TimelineDiagnosticEvent`, `TimelinePerformanceStats` u. ä. — vorher verifizieren) in die neue Datei verschieben. **Wichtig:** Andere Dateien importieren `Track`/`Region` heute aus `'../Timeline'` bzw. `'./Timeline'` — damit deren Importe nicht alle angefasst werden müssen, in Timeline.tsx Re-Exports stehen lassen (`export type { Track, Region } from './timeline/timelineTypes'`). So bleibt der Diff klein und rückwärtskompatibel.

## Scheibe 3: Diagnostik-Infrastruktur → `timeline/useTimelineDiagnostics.ts`

Die zusammenhängende Diagnostik-Maschinerie als ein eigener React-Hook: Puffer/Sequenz-Refs, `flushTimelineDiagnostics`, `queueTimelineDiagnostic`, `sampleDiagnosticPerformance`, `keepDiagnosticPerformanceSampling`, die Gesten-Statistik (`recordWaveformGestureTick`, `flushWaveformGesture`) und die zugehörigen Cleanup-Effekte. Der Hook gibt die Funktionen zurück, die Timeline.tsx weiterhin aufruft — Aufrufstellen in Timeline.tsx bleiben unverändert (gleiche Funktionsnamen).

Das ist die anspruchsvollste Scheibe: vorher ALLE Verwendungen der beteiligten Refs/Funktionen in Timeline.tsx auflisten und sicherstellen, dass nichts außerhalb der Diagnostik sie benutzt. Benutzt etwas anderes eine dieser Refs direkt, diese Ref NICHT mit umziehen, sondern als Parameter in den Hook geben — oder die Scheibe gemäß Regel 5 abbrechen.

## Scheibe 4: `LiveWaveformCanvas` → `timeline/LiveWaveformCanvas.tsx`

Die Komponente `LiveWaveformCanvas` (Aufnahme-Vorschau, oben in Timeline.tsx definiert) ist bereits eigenständig (eigene Props, kein Zugriff auf Timeline-State). Unverändert in eine eigene Datei verschieben und importieren.

## Bewusst NICHT Teil dieses Plans

- Aufteilen des Timeline-JSX in Unterkomponenten (Ruler, Track-Header, Clips) — das erfordert echte Prop-Schnittstellen-Entwürfe und ist ein eigener, späterer Auftrag.
- Jegliche Performance- oder Logikänderungen.

---

## Abschluss

1. Finaler Gesamttest: `npm run typecheck`; `npm run dev` → Datei laden, zoomen (Playhead bleibt verankert), scrollen, Region verschieben/trimmen/löschen, Undo, Play/Pause, Aufnahme-Dialog öffnen. Timeline.tsx sollte um grob 500–900 Zeilen geschrumpft sein — Zahl im Bericht nennen.
2. `package.json`: Version → `0.13.15`.
3. `CHANGELOG.md`: neuer Eintrag `## [0.13.15]`, zweisprachig, sinngemäß unter Geändert: "Interne Umstrukturierung der Timeline in Teilmodule zur besseren Wartbarkeit; keine funktionalen Änderungen."
4. `task.md`: Plan-BLAU-Zeile auf erledigt setzen, inkl. Angabe, welche Scheiben umgesetzt bzw. gemäß Regel 5 zurückgestellt wurden.
5. Stoppen und berichten. NICHT committen/pushen.
