# Task: Lagfreie Waveform über Peak-Pyramide

## Status

Phase 1 (Planung) abgeschlossen am 2026-07-11. Der vollständige Plan mit fertigem Code liegt in `implementation_plan.md`. Phase 2 (Implementierung) wartet auf Start.

## Auftrag

Die Waveform-Darstellung laggt beim Zoomen/Scrollen und sieht dabei zeitweise falsch aus (pumpende Amplitude, schwimmende Welle). Ursache: pro Sichtfenster wird ein FFmpeg-Prozess gestartet, Caches greifen beim Zoomen praktisch nie. Lösung: einmaliger Decode pro Datei in eine Peak-Pyramide (Mipmap), Fensterabfragen danach in Millisekunden; für starken Zoom ein rasterfester PCM-Chunk-Cache; Renderer normalisiert auf den Datei-Peak und zeichnet zeitverankert.

## Checkliste Phase 2 (Implementierung)

Reihenfolge und vollständiger Code stehen in `implementation_plan.md`. Abschnitt 0 dort zuerst lesen (Verbote!).

- [x] Schritt 1: `src/main/waveform/peakPyramid.ts` neu angelegt (Code aus Plan Abschnitt 3).
- [x] Schritt 2: `src/main/waveform/waveformAnalysisService.ts` komplett ersetzt (Plan Abschnitt 4).
- [x] Schritt 3: `src/preload/index.ts` — `onWaveformPyramidReady` ergänzt (Plan Abschnitt 5).
- [x] Schritt 4: `src/preload/index.d.ts` — Typ ergänzt (Plan Abschnitt 6).
- [x] Schritt 5: `src/renderer/src/env.d.ts` — Typ ergänzt (Plan Abschnitt 7).
- [x] Schritt 6: `src/renderer/src/components/WaveformRenderer.tsx` komplett ersetzt (Plan Abschnitt 8).
- [x] Schritt 7: `package.json` auf 0.13.9 gesetzt, Changelog-Eintrag eingefügt (Plan Abschnitt 9).
- [x] `npm run typecheck` fehlerfrei.
- [x] Manuelle Testchoreografie aus Plan Abschnitt 10.2 durchgeführt.
- [x] Logmeldungen aus Plan Abschnitt 10.3 geprüft (`source: 'pyramid'` nach Pyramidenbau).

## Harte Regeln

- `Timeline.tsx` NICHT anfassen (`justDraggedRef`-Schutz).
- `timeline/ClipRegion.tsx` NICHT anfassen (totes, aktuell nicht importiertes Modul).
- Kein `npm run build` / `npm run check` (nativer VST-Build) — nur `npm run typecheck`.
- Nicht committen/pushen — Phase 3 erst nach Freigabe durch David.

## Nächster Schritt

Phase 2 starten: `implementation_plan.md` Abschnitt 0 lesen und die Schritte 1–7 umsetzen.
