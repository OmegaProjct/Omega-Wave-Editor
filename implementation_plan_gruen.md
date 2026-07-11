# Plan GRÜN: Restaufräumung + schnellerer App-Start (→ Version 0.13.14)

Stand: 2026-07-12 · Basis: 0.13.13 (Pläne ROT/ORANGE/GELB sind umgesetzt) · Priorität: NIEDRIG, geringes Risiko.

---

## 0. Anweisungen für den ausführenden Agenten (zuerst lesen)

- Zwei unabhängige Punkte. Punkt 1 zuerst (trivial), dann Punkt 2. Nach jedem Punkt `npm run typecheck`.
- Für Punkt 2 zusätzlich einmalig `npx electron-vite build` erlaubt (nur Bundling). NIEMALS `npm run build`/`npm run check` (baut das native VST-Modul, unnötig).
- Code-Stil: 2 Leerzeichen, keine Semikolons, deutsche Kommentare.
- `src/renderer/src/components/Timeline.tsx`: Der `justDraggedRef`-Schutz darf laut `.clinerules` niemals verändert werden. Dieser Plan braucht in dieser Datei KEINE Änderungen (Ausnahme: falls bei Punkt 2 ein Modal-Import auf lazy umgestellt wird, ist die Import-Zeile erlaubt — sonst nichts).
- Changelog neutral, keine Fremdmarken.
- NICHT committen oder pushen — nach Umsetzung stoppen und berichten.

---

## 1. Drei tote Timeline-Module entfernen

**Problem:** Im Ordner `src/renderer/src/components/timeline/` liegen drei Dateien, die von keiner einzigen anderen Datei importiert werden — Überbleibsel früherer, nie fertig gewordener Aufteilungsversuche (im Repo seit Version 0.9.0 bzw. 0.13.5):
- `PlaybackControls.tsx`
- `TimelineRuler.tsx`
- `TrackHeader.tsx`

Sie sind reine Verwechslungsgefahr: Wer die Timeline ändern will, könnte fälschlich dort arbeiten.

**Vorgehen:**
1. Projektweit nach `PlaybackControls`, `TimelineRuler` und `TrackHeader` suchen (Groß-/Kleinschreibung beachten). Erwartung: Treffer NUR innerhalb der drei Dateien selbst sowie ggf. in Plan-/Doku-Markdown-Dateien (die zählen nicht). Falls doch ein echter Import in einer `.ts`/`.tsx`-Datei existiert: STOPPEN und berichten.
2. Die drei Dateien löschen. Wird der Ordner `timeline/` dadurch leer, auch den Ordner entfernen.
3. `npm run typecheck` — muss fehlerfrei bleiben.

**Hinweis für später:** Plan BLAU (Timeline-Zerlegung) baut NICHT auf diesen Dateien auf — sie sind veraltet und passen nicht mehr zum aktuellen Code. Einfach löschen.

---

## 2. Renderer-Bundle aufteilen (schnellerer Start, kleinere Updates)

**Problem:** Der Produktions-Build erzeugt für die Oberfläche eine einzige JavaScript-Datei von ~1,9 MB. Alles — inklusive selten genutzter Dialoge (Einstellungen, Handbuch, Export, VST-Katalog usw.) — wird beim App-Start geladen und geparst.

**Vorgehen (konservativ, in zwei Stufen — Stufe B nur, wenn Stufe A problemlos läuft):**

**Stufe A — Vendor-Aufteilung (risikoarm):** In `electron.vite.config.ts` im Renderer-Abschnitt über `build.rollupOptions.output.manualChunks` die großen Fremdbibliotheken in eigene Chunks legen, z. B. eine Gruppe für `react`/`react-dom`, eine für `framer-motion`, eine für `lucide-react`, eine für `i18next`/`react-i18next`. Keine App-Module anfassen.

**Stufe B — Lazy-Loading für schwere, selten genutzte Dialoge:** Kandidaten sind eigenständige Modal-Komponenten, die erst auf Nutzeraktion erscheinen (z. B. Handbuch, Einstellungen, Export-Dialog, VST-Katalog — vorher per Suche prüfen, wo sie eingebunden sind und ob sie beim Start gerendert werden). Umstellung des jeweiligen Imports auf `React.lazy(() => import(...))` mit `<Suspense>`-Hülle an der Einbindungsstelle (schlichter Fallback, z. B. nichts oder ein dezenter Lade-Spinner im bestehenden Stil). WICHTIG: Nur Komponenten umstellen, die NICHT im Startpfad hängen; pro umgestelltem Dialog die App starten und den Dialog öffnen.

**Verifikation:**
1. `npx electron-vite build` → in der Ausgabe erscheinen jetzt mehrere Renderer-Chunks statt einer einzigen ~1,9-MB-Datei; keine neuen Warnungen.
2. `npm run dev` → App startet, Timeline funktioniert, jeder umgestellte Dialog öffnet sich fehlerfrei (Einstellungen inkl. Tabs durchklicken, Handbuch öffnen, Export-Dialog öffnen).
3. Auch die Popout-Fenster-Routen prüfen (z. B. Einstellungen als eigenes Fenster öffnen), da diese dieselben Komponenten über eine eigene Route laden.

**Abbruchkriterium:** Wenn Stufe B an einer Komponente Probleme macht (weiße Fläche, Fehler in der Konsole), diese eine Komponente wieder auf statischen Import zurückstellen und im Bericht vermerken — nicht stundenlang kämpfen.

---

## 3. Abschluss

1. `npm run typecheck` fehlerfrei.
2. `package.json`: Version → `0.13.14`.
3. `CHANGELOG.md`: neuer Eintrag `## [0.13.14]` VOR dem 0.13.13-Eintrag, zweisprachig, Muster der Bestandseinträge, sinngemäß: Entfernung ungenutzter Altmodule; Oberflächen-Code wird jetzt in mehreren Teilen geladen, was den Programmstart beschleunigt.
4. `task.md`: Plan-GRÜN-Zeile auf erledigt setzen.
5. Stoppen und berichten. NICHT committen/pushen.
