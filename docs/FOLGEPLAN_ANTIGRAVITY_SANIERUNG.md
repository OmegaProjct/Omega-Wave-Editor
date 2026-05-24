# Folgeplan Für Antigravity: Omega Wave Editor Sanierung Nach Review

## Speicherort Und Arbeitsregel

Dieser Plan soll im Projekt als Datei gespeichert werden unter:

`docs/FOLGEPLAN_ANTIGRAVITY_SANIERUNG.md`

Antigravity muss diese Datei vor Arbeitsbeginn lesen und während der Umsetzung die Checklistenpunkte abhaken. Nach Abschluss muss Antigravity zusätzlich einen neuen Bericht schreiben unter:

`docs/ANTIGRAVITY_FOLGEBERICHT.md`

Der Folgebericht muss enthalten:
- welche Punkte aus diesem Plan erledigt wurden
- welche Dateien geändert wurden
- welche Tests/Befehle ausgeführt wurden
- welche Punkte offen geblieben sind
- ob irgendein Punkt bewusst abweichend umgesetzt wurde und warum

## Ausgangslage

Antigravity hat bereits einen ersten Architektur-Umbau begonnen:
- `src/common/` mit Typen, Project Core, Command Layer, Headless Runner und Test
- modulare IPC-Dateien unter `src/main/ipc/`
- MCP-Prototyp unter `src/main/mcpServer.ts`
- teilweise Anbindung von Timeline-Split an `projectCore.splitClip`
- Plugin-Scanner für Windows/macOS/Linux

Der Stand baut und typprüft aktuell erfolgreich, aber der Bericht übertreibt den tatsächlichen Fortschritt. MCP ist noch nicht vollständig, Headless-Export rendert noch nicht wirklich, der Plugin-Host ist nur vorbereitet, und das neue Projektmodell kann bestehende Timeline-Daten verlieren.

## Strikte Leitplanken

Antigravity darf keine neuen großen Features anfangen, bevor die folgenden Stabilitätsprobleme beseitigt sind.

Nicht erlaubt:
- keine weiteren MCP-Tools hinzufügen, bevor das Projektmodell verlustfrei ist
- keine Version auf `0.5.0` oder höher anheben, solange David das nicht ausdrücklich freigibt
- keine README- oder Release-Aussagen machen, die vollständige MCP- oder Plugin-Unterstützung behaupten
- keine bestehenden Features entfernen
- keine Formatierer oder Massenumbauten ohne konkreten Nutzen
- keine neuen Paketabhängigkeiten ohne zwingenden Grund
- keine Änderung an `.clinerules`, `AGENTS.md` oder `SANIERUNGSPLAN_MCP_PLUGIN_SUPPORT.md`, außer zur Korrektur offensichtlicher Verweise

Pflicht:
- nach jedem abgeschlossenen Block `npm run typecheck` ausführen
- nach jedem größeren Block `npm run build` ausführen
- Tests müssen reale Fehlerfälle abdecken, nicht nur Smoke-Tests
- jeder erledigte Punkt in dieser Datei muss abgehakt werden

## Phase 1: Bericht Und Projektstand Ehrlich Korrigieren

- [x] In `docs/ANTIGRAVITY_UMSETZUNGSBERICHT.md` oder einem neuen Korrekturabschnitt klarstellen, dass der vorherige Bericht zu optimistisch war.
- [x] Festhalten, dass MCP aktuell nur ein Prototyp ist.
- [x] Festhalten, dass `export.render` im Headless Runner aktuell nicht wirklich rendert.
- [x] Festhalten, dass `open-vst-ui` weiterhin Stub is.
- [x] Festhalten, dass die Build-Warnung zu `AudioEngine.ts` weiterhin existiert.
- [x] Versionsaussage korrigieren: Projekt steht laut `package.json` auf `0.4.1`, nicht `0.5.0`.

Akzeptanz:
- Bericht enthält keine Behauptung mehr, MCP sei vollständig.
- Bericht enthält keine Behauptung mehr, ein echter Cross-Plattform Plugin-Host sei fertig.
- `npm run typecheck` läuft erfolgreich.

## Phase 2: Projektmodell Verlustfrei Machen

Aktuelles Risiko: `validateAndMigrateProject` baut Regionen neu auf und übernimmt nicht alle bestehenden Timeline-Felder. Dadurch können Daten wie `color`, `fileDuration` und `groupId` verloren gehen.

Umsetzung:
- [x] `src/common/types.ts` so erweitern, dass alle aktuell in `Timeline.tsx` genutzten Felder vollständig abgebildet sind.
- [x] `Region` muss mindestens erhalten:
  - `id`
  - `file`
  - `startPos`
  - `duration`
  - `sourceOffset`
  - `fileDuration`
  - `color`
  - `fadeIn`
  - `fadeOut`
  - `gain`
  - `groupId`
  - `stereoMode`
  - `effects`
  - `name`
- [x] `Track` muss alle aktuell genutzten Felder erhalten:
  - `id`
  - `index`
  - `name`
  - `regions`
  - `muted`
  - `solo`
  - `locked`
  - `visible`
  - `volume`
  - `height`
  - `automation`
  - optional vorhandene Cleaning-/Analysefelder
- [x] `validateAndMigrateProject` muss unbekannte zusätzliche Felder standardmäßig erhalten, statt sie wegzuwerfen.
- [x] Defaults nur ergänzen, wenn Felder fehlen.
- [x] Keine bestehende Projektdatei darf durch Laden und Speichern Timeline-Farben, Gruppen, Source Offsets oder Waveform-Dauerinformationen verlieren.

Tests:
- [x] Test: Projekt mit `color`, `fileDuration`, `groupId` laden und validieren.
- [x] Test: Validierung erhält unbekannte Zusatzfelder.
- [x] Test: altes Minimalprojekt ohne neue Felder bekommt sichere Defaults.
- [x] Test: Split eines Clips erhält `color`, `fileDuration`, `groupId`, `effects`, `gain`, `fadeIn`, `fadeOut`.
- [x] `npm run typecheck`
- [x] Core-Test ausführen
- [x] `npm run build`

Akzeptanz:
- Roundtrip `validateAndMigrateProject -> saveProject` is verlustfrei für bestehende Timeline-Felder.
- UI-Timeline kann weiterhin Clip-Farben und Gruppierungen anzeigen.

## Phase 3: Command Layer Sicher Machen

Aktuelles Risiko: unbekannte oder noch nicht implementierte Aktionen werden nur gewarnt und ignoriert. Dadurch können Recipes scheinbar erfolgreich laufen, obwohl Schritte nicht ausgeführt wurden.

Umsetzung:
- [x] `executeCommand` muss bei unbekannten Actions einen Fehler werfen.
- [x] Actions, die im Typ `RecipeStep.action` enthalten sind, müssen entweder implementiert sein oder ausdrücklich als nicht unterstützt fehlschlagen.
- [x] `project.save`, `export.render` und `metadata.write` dürfen nicht still ignoriert werden.
- [x] `HeadlessRunner.executeRecipe` muss bei Fehlern abbrechen und den Fehler strukturiert zurückgeben oder werfen.
- [x] Recipe-Ausführung darf Payloads nicht mutieren, wenn das vermeidbar ist. Stattdessen Kopien verwenden.

Tests:
- [x] Test: unbekannte Action schlägt fehl.
- [x] Test: `export.render` ohne echte Render-Implementierung schlägt kontrolliert fehl oder gibt klaren `not_implemented`-Fehler zurück.
- [x] Test: `metadata.write` schlägt kontrolliert fehl, bis echte Umsetzung erfolgt.
- [x] Test: Recipe bricht bei fehlerhaftem Schritt ab.
- [x] `npm run typecheck`
- [x] Core-Test ausführen
- [x] `npm run build`

Akzeptanz:
- Kein Batch-/MCP-Auftrag kann “erfolgreich” wirken, wenn ein Schritt ignoriert wurde.

## Phase 4: MCP-Prototyp Ehrlich Stabilisieren

Ziel ist nicht vollständiges MCP, sondern ein ehrlicher, kleiner, stabiler Prototyp.

Umsetzung:
- [x] MCP-Server-Version muss aus `package.json` kommen oder korrekt zur Projektversion passen.
- [x] `tools/list` darf nur Tools anzeigen, die tatsächlich funktionieren.
- [x] Nicht implementierte Bereiche wie Export, ID3, Analyse, Jobs, Undo, Plugin-Steuerung dürfen nicht als vorhanden erscheinen.
- [x] Tool-Antworten müssen konsistent sein: entweder MCP-kompatibler `content`-Block oder strukturierter Fehler.
- [x] `project_load` muss dieselbe Pfadauflösung/Migration verwenden wie der normale Projekt-Load-Flow.
- [x] `project_save` muss Projektdateien sicher schreiben, aber nicht behaupten, Audio-Medien zu schützen, wenn nur `.owep` geschrieben wird.
- [x] `clip_import` muss prüfen, ob die Datei existiert, außer ein expliziter Test-/Dry-Modus wird eingeführt.
- [x] `clip_import` muss bei ungültiger `trackId` fehlschlagen, statt Erfolg zu melden.
- [x] `track_remove` muss bei unbekannter `trackId` fehlschlagen.

Tests:
- [x] Test: MCP `initialize`.
- [x] Test: MCP `tools/list` enthält nur funktionierende Tools.
- [x] Test: MCP `clip_import` mit falscher Track-ID schlägt fehl.
- [x] Test: MCP `project_save` schreibt gültige `.owep`.
- [x] Test: MCP `batch_execute` mit unbekannter Action schlägt fehl.
- [x] `npm run typecheck`
- [x] `npm run build`

Akzeptanz:
- MCP wird als Prototyp geführt.
- Kein MCP-Tool behauptet Fähigkeiten, die intern nicht ausgeführt werden.

## Phase 5: IPC-Modularisierung Auf Regressions Prüfen

Der alte `ipc.ts` wurde ausgelagert. Jetzt muss überprüft werden, dass alle alten IPC-Kanäle weiterhin vorhanden sind.

Pflichtkanäle:
- [x] `open-external`
- [x] `open-path`
- [x] `show-open-dialog`
- [x] `show-save-dialog`
- [x] `get-home-dir`
- [x] `get-system-path`
- [x] `read-dir`
- [x] `get-media-info`
- [x] `get-peaks`
- [x] `read-file-buffer`
- [x] `extract-audio`
- [x] `save-project`
- [x] `save-project-backup`
- [x] `load-project`
- [x] `save-preset`
- [x] `export-project`
- [x] `transcode-export`
- [x] `scan-vst-plugins`
- [x] `open-vst-ui`
- [x] `save-recording`
- [x] `get-disk-space`
- [x] `check-for-updates`
- [x] `get-app-version`
- [x] `get-performance-stats`, falls von `settingsIpc` registriert

Umsetzung:
- [x] Eine kleine IPC-Kanal-Übersicht in `docs/ANTIGRAVITY_FOLGEBERICHT.md` aufnehmen.
- [x] Keine Handler doppelt registrieren.
- [x] Keine alten Kanäle entfernen.
- [x] Prüfen, ob `get-performance-stats` weiterhin durch `settingsIpc` kommt und nicht versehentlich verloren ging.

Tests:
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] App-Start manuell oder per Smoke-Test prüfen, falls möglich.
- [x] Export-Dialog und Datei-Browser mindestens oberflächlich prüfen, falls App-Start möglich ist.

Akzeptanz:
- Bestehende UI ruft keine fehlenden IPC-Kanäle auf.
- Keine neuen “handler already registered”-Fehler.

## Phase 6: Plugin-Scanner Nur Als Scanner Stabilisieren

Der aktuelle Plugin-Teil darf nicht als echter Host verkauft werden.

Umsetzung:
- [x] `scan-vst-plugins` intern besser benennen oder dokumentieren als allgemeiner Plugin-Scan, auch wenn Preload-API vorerst kompatibel bleibt.
- [x] Windows, macOS und Linux Scanpfade klar im Code kommentieren.
- [x] Keine Behauptung, dass AU/LV2/VST wirklich geladen oder gerendert werden.
- [x] `open-vst-ui` muss eine klare Antwort liefern: `success: false`, `error: "Plugin host not implemented"` oder ähnlich, statt stumpf `true`.
- [x] UI muss diese Antwort als “noch nicht implementiert” anzeigen können, ohne so zu wirken, als sei das Plugin geöffnet worden.
- [x] Registry darf geschrieben werden, aber Crash-Counting darf nicht behauptet werden, solange kein echter Host Crashs meldet.

Tests:
- [x] Test oder manuelle Prüfung: Scan ohne Plugins liefert Built-in-Fallback.
- [x] Test oder manuelle Prüfung: `open-vst-ui` meldet klar “nicht implementiert”.
- [x] `npm run typecheck`
- [x] `npm run build`

Akzeptanz:
- Plugin-Scanner is nützlich, aber ehrlich.
- Kein Codepfad behauptet echten Plugin-Host-Betrieb.

## Phase 7: Tests Verschärfen

Der vorhandene Test ist zu schwach. Beispiel: Recipe importiert in `trackId: "1"`, obwohl neue Track-IDs zufällig sind, und prüft den Import nicht.

Umsetzung:
- [x] Recipe-Test muss echte vorhandene Track-IDs verwenden.
- [x] Recipe-Test muss prüfen, dass `clip.import` wirklich eine Region erzeugt.
- [x] Tests für ungültige IDs ergänzen.
- [x] Tests für fehlende Dateien im MCP-Import ergänzen.
- [x] Tests für verlustfreie Migration ergänzen.
- [x] Tests für unbekannte Actions ergänzen.
- [x] Tests für `HeadlessRunner.getSafeOutputPath` auf Windows- und POSIX-artige Pfade ergänzen.

Akzeptanz:
- Tests können nicht mehr bestehen, wenn Kernaktionen still nichts tun.
- Tests decken mindestens einen Negativfall pro kritischem Modul ab.

## Phase 8: Abschlussbericht Erstellen

Nach Umsetzung muss Antigravity `docs/ANTIGRAVITY_FOLGEBERICHT.md` schreiben.

Pflichtinhalt:
- [x] Zusammenfassung der erledigten Phasen.
- [x] Liste der geänderten Dateien.
- [x] Liste der bewusst nicht umgesetzten Punkte.
- [x] Ergebnis von `npm run typecheck`.
- [x] Ergebnis von `npm run build`.
- [x] Ergebnis der Core-/MCP-Tests.
- [x] Hinweis, dass MCP weiterhin Prototyp ist, falls noch nicht vollständig.
- [x] Hinweis, dass echter Plugin-Host weiterhin offen ist, falls nicht wirklich implementiert.
- [x] Nächste empfohlene Schritte.

## Finale Akzeptanzkriterien Für Diesen Folgeplan

Dieser Folgeplan gilt erst als erledigt, wenn:

- [x] Projektmodell validiert und speichert verlustfrei.
- [x] Unbekannte Recipe-/Command-Actions schlagen fehl.
- [x] MCP listet nur funktionierende Tools.
- [x] Headless Export wird nicht als fertig behauptet, solange kein echter Export passiert.
- [x] Plugin-Host wird nicht als fertig behauptet, solange nur Scan existiert.
- [x] Tests decken positive und negative Fälle ab.
- [x] `npm run typecheck` erfolgreich.
- [x] `npm run build` erfolgreich.
- [x] `docs/ANTIGRAVITY_FOLGEBERICHT.md` existiert.
- [x] Alle erledigten Punkte in `docs/FOLGEPLAN_ANTIGRAVITY_SANIERUNG.md` abgehakt sind.

## Annahmen Und Defaults

- Bestehende Features bleiben erhalten.
- MCP bleibt vorerst Prototyp, bis vollständige Bedienbarkeit wirklich implementiert ist.
- Plugin-Support bedeutet aktuell Scanner/Registry, nicht echter Host.
- Keine öffentliche Release-Aussage zu MCP oder Cross-Plattform Plugins ohne vollständige Tests.
- Version bleibt `0.4.1`, solange David keinen Versionssprung freigibt.
