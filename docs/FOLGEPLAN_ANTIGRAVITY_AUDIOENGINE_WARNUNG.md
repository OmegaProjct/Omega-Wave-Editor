# Folgeplan 3 Fuer Antigravity: AudioEngine Build-Warnung Endgueltig Beseitigen

## Zweck

Dieser Plan behandelt den letzten von Codex bestaetigten offenen Punkt nach der Nachkorrektur:

Die Build-Warnung zu `src/renderer/src/lib/AudioEngine.ts` bleibt bestehen, weil `AudioEngine.ts` gleichzeitig dynamisch und statisch importiert wird.

Antigravity muss diesen Plan exakt abarbeiten, alle Checkboxen in dieser Datei abhaken und danach einen neuen Bericht schreiben:

`docs/ANTIGRAVITY_AUDIOENGINE_WARNUNG_BERICHT.md`

## Strikte Regeln

- Keine neuen Features.
- Keine MCP-Aenderungen.
- Keine Plugin-Host-Aenderungen.
- Keine Headless-Rendering-Aenderungen.
- Keine Versionserhoehung.
- Keine neuen Abhaengigkeiten.
- Keine Formatierer oder Massenumbauten.
- Keine Umstellung der gesamten AudioEngine-Architektur.
- Nur diese Dateien duerfen fuer Code geaendert werden:
  - `src/renderer/src/App.tsx`
  - `src/renderer/src/components/SettingsModal.tsx`
- Fuer Dokumentation duerfen nur diese Dateien geaendert/angelegt werden:
  - `docs/FOLGEPLAN_ANTIGRAVITY_AUDIOENGINE_WARNUNG.md`
  - `docs/ANTIGRAVITY_AUDIOENGINE_WARNUNG_BERICHT.md`

## Ursache

`AudioEngine.ts` wird bereits statisch importiert von:

- `src/renderer/src/components/AudioCleaningModal.tsx`
- `src/renderer/src/components/EffectsPanel.tsx`
- `src/renderer/src/components/ExportModal.tsx`
- `src/renderer/src/components/FileExplorer.tsx`
- `src/renderer/src/components/Timeline.tsx`
- `src/renderer/src/lib/RecordingEngine.ts`

Gleichzeitig wird `AudioEngine.ts` dynamisch importiert in:

- `src/renderer/src/App.tsx`
- `src/renderer/src/components/SettingsModal.tsx`

Dadurch meldet Vite/Rollup:

```text
AudioEngine.ts is dynamically imported ... but also statically imported ... dynamic import will not move module into another chunk.
```

Da `AudioEngine.ts` ohnehin bereits statisch im Renderer-Bundle ist, ist der richtige Fix fuer diesen Projektstand:

**Die dynamischen Imports in `App.tsx` und `SettingsModal.tsx` entfernen und durch statische Imports ersetzen.**

Nicht versuchen, alle anderen statischen Imports in dynamische Imports umzubauen.

## Phase 1: `App.tsx` Auf Statischen Import Umstellen

Datei:

`src/renderer/src/App.tsx`

Aktuell gibt es um Zeile 438 sinngemaess:

```ts
const { AudioEngine } = await import('./lib/AudioEngine');
const audioBuffer = await AudioEngine.getInstance().renderOffline(
  { tracks: settings.tracks },
  parsedSampleRate
);
```

Umsetzung:

- [x] Oben bei den bestehenden Imports einen statischen Import ergaenzen:

```ts
import { AudioEngine } from './lib/AudioEngine'
```

- [x] Den dynamischen Import in der Export-/Offline-Render-Logik entfernen:

```ts
const { AudioEngine } = await import('./lib/AudioEngine');
```

- [x] Die bestehenden Aufrufe unveraendert lassen:

```ts
AudioEngine.getInstance().renderOffline(...)
AudioEngine.getInstance().exportToWav(...)
```

- [x] Keine andere Exportlogik veraendern.
- [x] Keine Fortschrittslogik veraendern.
- [x] Keine Settings-/Track-Datenstruktur veraendern.

Akzeptanz:

- [x] `rg "import\\('./lib/AudioEngine'\\)" src/renderer/src/App.tsx` liefert keinen Treffer.
- [x] `rg "from './lib/AudioEngine'" src/renderer/src/App.tsx` findet den statischen Import.

## Phase 2: `SettingsModal.tsx` Auf Statischen Import Umstellen

Datei:

`src/renderer/src/components/SettingsModal.tsx`

Aktuell gibt es dynamische Imports sinngemaess:

```ts
import('../lib/AudioEngine').then(({ AudioEngine }) => {
  AudioEngine.getInstance().setOutputDevice(merged.activeDeviceId)
})
```

und:

```ts
const { AudioEngine } = await import('../lib/AudioEngine')
await AudioEngine.getInstance().setOutputDevice(deviceId)
```

Umsetzung:

- [x] Oben bei den bestehenden Imports einen statischen Import ergaenzen:

```ts
import { AudioEngine } from '../lib/AudioEngine'
```

- [x] Den `.then(...)`-Import ersetzen durch direkten Aufruf:

```ts
AudioEngine.getInstance().setOutputDevice(merged.activeDeviceId)
```

- [x] Den `await import('../lib/AudioEngine')`-Import entfernen.
- [x] Den bestehenden Aufruf behalten:

```ts
await AudioEngine.getInstance().setOutputDevice(deviceId)
```

- [x] Keine UI-Struktur im Settings-Modal veraendern.
- [x] Keine Settings-Speicherlogik veraendern.
- [x] Keine Audio-Device-Logik veraendern, ausser der Importform.

Akzeptanz:

- [x] `rg "import\\('../lib/AudioEngine'\\)" src/renderer/src/components/SettingsModal.tsx` liefert keinen Treffer.
- [x] `rg "await import\\('../lib/AudioEngine'\\)" src/renderer/src/components/SettingsModal.tsx` liefert keinen Treffer.
- [x] `rg "from '../lib/AudioEngine'" src/renderer/src/components/SettingsModal.tsx` findet den statischen Import.

## Phase 3: Suchpruefung Fuer Dynamische AudioEngine-Imports

Antigravity muss danach ausfuehren:

```powershell
rg "import\\(['\"].*AudioEngine['\"]\\)" src/renderer/src
```

Erwartung:

- [x] Der Suchbefehl liefert keinen Treffer mehr.

Falls doch ein Treffer bleibt:

- [x] Nur pruefen, ob es wirklich ein dynamischer `import(...)` ist.
- [x] Falls ja, in diesem Bericht nennen und nicht heimlich andere Dateien umbauen, ausser es ist exakt dieselbe Warnungsursache.

## Phase 4: Pflichtchecks

Antigravity muss ausfuehren:

```powershell
npm run typecheck
```

```powershell
$env:TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}'; npx ts-node src/common/projectCore.test.ts
```

```powershell
$env:TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}'; npx ts-node src/common/mcpServer.test.ts
```

```powershell
npm run build
```

Akzeptanz:

- [x] `npm run typecheck` erfolgreich.
- [x] Core-Test erfolgreich.
- [x] MCP-Test erfolgreich.
- [x] `npm run build` erfolgreich.
- [x] Die vorherige `AudioEngine.ts is dynamically imported ... but also statically imported ...`-Warnung erscheint nicht mehr.
- [x] Falls eine andere Warnung erscheint, exakt im Bericht dokumentieren.

## Phase 5: Bericht Schreiben

Antigravity muss den Bericht schreiben unter:

`docs/ANTIGRAVITY_AUDIOENGINE_WARNUNG_BERICHT.md`

Pflichtinhalt:

- [x] Welche dynamischen Imports entfernt wurden.
- [x] Welche statischen Imports ergaenzt wurden.
- [x] Ergebnis des Suchbefehls:

```powershell
rg "import\\(['\"].*AudioEngine['\"]\\)" src/renderer/src
```

- [x] Ergebnis von `npm run typecheck`.
- [x] Ergebnis von `projectCore.test.ts`.
- [x] Ergebnis von `mcpServer.test.ts`.
- [x] Ergebnis von `npm run build`.
- [x] Explizite Aussage, ob die AudioEngine-Build-Warnung verschwunden ist.
- [x] Falls weiterhin offen: exakte Warnung und betroffene Dateien nennen.

Nicht erlaubt im Bericht:

- [x] Keine Behauptung, MCP sei vollstaendig.
- [x] Keine Behauptung, Plugin-Host sei fertig.
- [x] Keine neuen Architekturversprechen.

## Finale Akzeptanzkriterien

Dieser Plan gilt erst als erledigt, wenn:

- [x] Es keine dynamischen `AudioEngine`-Imports im Renderer mehr gibt.
- [x] `App.tsx` verwendet `AudioEngine` statisch.
- [x] `SettingsModal.tsx` verwendet `AudioEngine` statisch.
- [x] `npm run typecheck` erfolgreich ist.
- [x] Core-Test erfolgreich ist.
- [x] MCP-Test erfolgreich ist.
- [x] `npm run build` erfolgreich ist.
- [x] Die alte `AudioEngine.ts`-Build-Warnung verschwunden ist.
- [x] `docs/ANTIGRAVITY_AUDIOENGINE_WARNUNG_BERICHT.md` existiert.
- [x] Alle erledigten Punkte in dieser Datei abgehakt sind.


