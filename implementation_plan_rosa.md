# Plan ROSA: Objekte schnell umbenennen (F2 + Kontextmenü + Inline-Editor) (→ Version 0.13.17)

Stand: 2026-07-12 · Basis: 0.13.16 (Plan LILA sollte vorher umgesetzt sein, ist aber keine harte Abhängigkeit) · Priorität: MITTEL · Risiko: NIEDRIG-MITTEL (Timeline-JSX + Tastatur-Handler)

---

## 0. Anweisungen für den ausführenden Agenten (WICHTIG, komplett lesen)

**Kontext / Ist-Zustand (vorab verifizieren):**
- Regionen (Audio-Objekte) haben in `src/renderer/src/components/timeline/timelineTypes.ts` bereits ein Feld `name?: string`. Die gelbe Titelleiste jeder Region zeigt `region.name || region.file.name` plus `visualNameSuffix` (Suche in `Timeline.tsx` nach `region.visualNameSuffix`).
- `splitClip` in `src/common/projectCore.ts` kopiert den Namen beim Zerschneiden bereits in beide Teile (rechtes Teil bekommt Suffix "(Teil 2)"). Die Namen sind danach völlig unabhängig — **daran nichts ändern**, das ist gewünschtes Verhalten.
- Umbenennen existiert bereits im Dialog `ObjectPropertiesModal.tsx` (Feld `name`). Dieser Dialog bleibt unverändert bestehen.
- Das Region-Kontextmenü ist in `Timeline.tsx` (Einträge wie "Objekteigenschaften…", "Kopieren", "Objektfarbe"). Vorher lokalisieren.

**Ziel:** Schnelles Umbenennen einer Region auf drei Wegen, die alle denselben Inline-Editor öffnen:
1. Kontextmenü-Eintrag **"Umbenennen"** (en: "Rename") mit Shortcut-Hinweis "F2" rechtsbündig (gleiche Optik wie "Kopieren · Strg+C").
2. Taste **F2**, wenn genau eine Region selektiert ist.
3. (Bestehender Weg über Objekteigenschaften bleibt.)

**Eiserne Regeln:**

1. `justDraggedRef` in `Timeline.tsx` und alles, was ihn berührt, NIEMALS anfassen (`.clinerules`).
2. Zoom-/Scroll-/Drag-Logik nicht verändern. Der Inline-Editor ist eine reine Zusatz-Ebene im JSX.
3. Nur `npm run typecheck` zur Prüfung; kein `npm run build`/`check` (natives VST-Modul).
4. Code-Stil: 2 Leerzeichen, keine Semikolons, deutsche Kommentare. UI-Texte zweisprachig über i18next.
5. Jede Namensänderung über den bestehenden Undo-Mechanismus laufen lassen (`updateTracksWithHistory` bzw. das Muster, das ObjectPropertiesModal beim Speichern nutzt — vorher nachsehen), damit Strg+Z das Umbenennen rückgängig macht.
6. NICHT committen/pushen. Nach Abschluss stoppen und berichten.

---

## 1. Inline-Editor in der Titelleiste

- Neuer State in Timeline.tsx: `renamingRegionId: string | null` (+ ggf. lokaler Textwert).
- Ist `renamingRegionId === region.id`, wird in der Titelleiste der Region statt des Namens-Texts ein `<input type="text">` gerendert:
  - Exakt in der Leiste, nicht größer als die Leiste (Höhe der Leiste übernehmen, volle verfügbare Breite minus Suffix, dezentes Styling passend zum dunklen Theme).
  - Vorbelegt mit dem aktuellen Anzeigenamen OHNE `visualNameSuffix` (der Suffix wie " [Stereo]" ist berechnet und darf nicht in den Namen rutschen).
  - Beim Öffnen: Fokus setzen und gesamten Text vorselektieren (Windows-Verhalten bei F2).
- **Tastatur im Editor:** Enter = übernehmen, Escape = abbrechen, Klick außerhalb (blur) = übernehmen. Leerer Name beim Bestätigen = abbrechen (Name unverändert lassen), kein leerer String als Name.
- **Event-Abschottung (wichtig):** Auf dem Input `onMouseDown`/`onClick`/`onKeyDown` mit `stopPropagation` versehen, damit Tippen und Klicken im Editor keine Timeline-Shortcuts (Leertaste = Play!, Entf = Löschen) und kein Region-Dragging auslösen. Die globalen Timeline-Key-Handler müssen zusätzlich früh aussteigen, wenn das Event-Ziel ein Input ist bzw. `renamingRegionId` gesetzt ist — nachsehen, ob es so eine Input-Prüfung schon gibt (Muster: `e.target instanceof HTMLInputElement`).
- Übernahme: Region per `name`-Feld aktualisieren, über den Undo-fähigen Update-Pfad (Regel 5). `visualNameSuffix` und `file.name` unverändert lassen.

## 2. Kontextmenü-Eintrag "Umbenennen"

- Im Region-Kontextmenü einen Eintrag **"Umbenennen"** (en: "Rename") ergänzen, sinnvoll platziert bei "Objekteigenschaften…", mit rechtsbündigem Shortcut-Label "F2" im selben Stil wie bei "Kopieren"/"Ausschneiden"/"Löschen".
- Klick: Kontextmenü schließen, `renamingRegionId` auf die angeklickte Region setzen.

## 3. F2-Shortcut

- Vorher prüfen, wie die bestehenden Timeline-Shortcuts (Entf, Strg+C …) registriert sind — gibt es ein konfigurierbares `keyboardShortcuts`-System in den Einstellungen, F2 dort als "Objekt umbenennen" einreihen; sonst im selben Key-Handler wie Entf/Strg+C behandeln.
- Verhalten: Genau EINE Region selektiert → Inline-Editor für diese Region öffnen. Keine oder mehrere Regionen selektiert → nichts tun.
- Falls die Region gerade außerhalb des sichtbaren Bereichs liegt, ist kein Auto-Scroll nötig (Nice-to-have, nicht Pflicht).

## 4. Ausdrücklich NICHT Teil dieses Plans

- Keine Änderung an `splitClip` / Namensvergabe beim Schneiden (funktioniert bereits unabhängig, inkl. "(Teil 2)").
- Kein Umbenennen von Spuren (Track-Namen) — nur Regionen/Objekte.
- ObjectPropertiesModal unverändert.

## 5. Test (Pflicht)

`npm run dev`:

1. Rechtsklick auf Region → "Umbenennen" mit F2-Hinweis sichtbar → Klick öffnet Inline-Editor in der Titelleiste, Text vorselektiert.
2. Region anklicken (selektieren) → F2 → Editor öffnet.
3. Enter übernimmt, Escape verwirft, Klick daneben übernimmt; leerer Text ändert nichts.
4. Während der Editor offen ist: Leertaste tippt ein Leerzeichen in den Namen (startet NICHT die Wiedergabe), Entf löscht Zeichen (NICHT die Region).
5. Strg+Z macht das Umbenennen rückgängig.
6. Objekt zerschneiden (Schere) → beide Teile einzeln umbenennen → Namen bleiben unabhängig; Projekt speichern, neu laden → Namen erhalten.
7. Kurzer Regressionstest: zoomen, scrollen, Region verschieben, Play/Pause — alles unverändert.

## 6. Abschluss

1. `npm run typecheck` fehlerfrei.
2. `package.json`: Version → `0.13.17`.
3. `CHANGELOG.md`: neuer Eintrag `## [0.13.17]`, zweisprachig, unter Hinzugefügt sinngemäß: "Objekte können jetzt direkt in der Titelleiste umbenannt werden (F2 oder Kontextmenü → Umbenennen) / Objects can now be renamed inline in their title bar (F2 or context menu → Rename)."
4. `task.md`: Plan-ROSA-Zeile auf erledigt setzen.
5. Stoppen und berichten. NICHT committen/pushen.
