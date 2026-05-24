# Folgeplan 2 Fuer Antigravity: Nachkorrektur Plugin-UI, Typen und Berichtspflicht

## Zweck

Dieser Plan ist eine harte Nachkorrektur zum ersten Folgeplan. Antigravity hat die Kernsanierung groesstenteils umgesetzt, aber mindestens ein Punkt ist als erledigt markiert, obwohl die Umsetzung in der UI und in den TypeScript-Signaturen noch nicht stimmt.

Antigravity muss diesen Plan exakt abarbeiten, die Checkboxes in dieser Datei abhaken und danach einen neuen Bericht schreiben:

`docs/ANTIGRAVITY_NACHKORREKTURBERICHT.md`

Der Bericht muss so geschrieben sein, dass Codex ihn spaeter pruefen kann.

## Strikte Regeln

- Keine neuen Features anfangen.
- Keine MCP-Tools hinzufuegen.
- Keine Version aendern.
- Keine README-/Release-Aussage zu fertigem MCP oder fertigem Plugin-Host machen.
- Keine bestehenden Features entfernen.
- Keine neuen Abhaengigkeiten installieren.
- Keine Formatierer/Massenumbauten ausfuehren.
- Nur die unten genannten Dateien anfassen, ausser ein Test zwingt eine minimal begruendete Typkorrektur:
  - `src/renderer/src/components/EffectsPanel.tsx`
  - `src/renderer/src/env.d.ts`
  - `src/preload/index.d.ts`
  - `src/common/projectCore.test.ts` oder neuer kleiner Test, falls fuer Nachweis gebraucht
  - `docs/FOLGEPLAN_ANTIGRAVITY_NACHKORREKTUR.md`
  - `docs/ANTIGRAVITY_NACHKORREKTURBERICHT.md`

## Aktuell Gefundene Restluecke

In `src/main/ipc/pluginIpc.ts` gibt `open-vst-ui` inzwischen korrekt ein Objekt zurueck:

```ts
{
  success: false,
  error: 'Plugin Host und Bridge sind in diesem Prototyp noch nicht implementiert.'
}
```

Aber die Renderer-Seite ist noch nicht angepasst:

- `src/renderer/src/components/EffectsPanel.tsx` Zeile um 711 ruft nur `window.api.openVstUi(vst.path)` auf und ignoriert das Ergebnis.
- `src/renderer/src/env.d.ts` deklariert `openVstUi` noch als `Promise<boolean>`.
- `src/preload/index.d.ts` deklariert `openVstUi` ebenfalls noch als `Promise<boolean>`.

Dadurch wirkt der Button weiterhin so, als koenne ein Plugin-Interface geoeffnet werden, obwohl der Host bewusst noch nicht implementiert ist.

## Phase 1: Gemeinsamen Rueckgabetyp Definieren

- [x] In `src/renderer/src/env.d.ts` direkt vor oder innerhalb der `Window.api`-Definition einen passenden Typ einfuehren oder inline verwenden:

```ts
type VstUiOpenResult = {
  success: boolean;
  error?: string;
};
```

- [x] In `src/renderer/src/env.d.ts` die Signatur exakt von:

```ts
openVstUi: (path: string) => Promise<boolean>;
```

auf:

```ts
openVstUi: (path: string) => Promise<VstUiOpenResult>;
```

aendern.

- [x] In `src/preload/index.d.ts` denselben Rueckgabetyp einfuehren oder inline verwenden:

```ts
type VstUiOpenResult = {
  success: boolean
  error?: string
}
```

- [x] In `src/preload/index.d.ts` die Signatur exakt von:

```ts
openVstUi: (pluginPath: string) => Promise<boolean>
```

auf:

```ts
openVstUi: (pluginPath: string) => Promise<VstUiOpenResult>
```

aendern.

Akzeptanz:

- [x] `rg "openVstUi:.*Promise<boolean>" src` findet keinen Treffer mehr.
- [x] `npm run typecheck` laeuft erfolgreich.

## Phase 2: EffectsPanel Muss Die Fehlermeldung Anzeigen

In `src/renderer/src/components/EffectsPanel.tsx` muss der Button "Interface oeffnen" das Ergebnis von `openVstUi` auswerten.

### Konkrete Anweisung

Die Stelle um Zeile 711 ist aktuell sinngemaess:

```tsx
onClick={() => window.api.openVstUi(vst.path)}
```

Diese Stelle muss durch eine kleine async-Behandlung ersetzt werden.

Pflichtverhalten:

- [x] `openVstUi(vst.path)` muss awaited werden.
- [x] Wenn `result.success === false`, muss die Fehlermeldung fuer den Nutzer sichtbar werden.
- [x] Wenn `result.error` fehlt, muss ein Fallback-Text verwendet werden:

```text
Plugin Host und Bridge sind in diesem Prototyp noch nicht implementiert.
```

- [x] Die UI darf nicht so wirken, als sei das Interface erfolgreich geoeffnet worden.
- [x] Es reicht fuer diese Nachkorrektur, `window.alert(...)` zu verwenden. Keine neue Modal-Architektur bauen.
- [x] Fehler beim Aufruf selbst muessen ebenfalls abgefangen werden.

Empfohlene genaue Implementierung:

```tsx
onClick={async () => {
  try {
    const result = await window.api.openVstUi(vst.path)
    if (!result.success) {
      window.alert(result.error || 'Plugin Host und Bridge sind in diesem Prototyp noch nicht implementiert.')
    }
  } catch (err: any) {
    window.alert(err?.message || 'Plugin Interface konnte nicht geoeffnet werden.')
  }
}}
```

Wenn der bestehende Code ESLint-/TypeScript-Probleme mit `any` vermeidet, darf `err` als `unknown` behandelt werden. Keine groessere Refaktorierung.

Akzeptanz:

- [x] Der Button ignoriert das Ergebnis nicht mehr.
- [x] Bei `success: false` sieht der Nutzer eine klare Meldung.
- [x] Keine falsche Erfolgsmeldung.
- [x] `npm run typecheck` laeuft erfolgreich.

## Phase 3: UI-Text Fuer Plugin-Support Ehrlicher Machen

Der aktuelle leere Zustand sagt sinngemaess:

```text
Klicken Sie auf "Scannen", um VST2/VST3-Plugins auf Ihrem Windows-System zu lokalisieren.
```

Das ist nach dem neuen Cross-Plattform-Scanner nicht mehr korrekt.

Umsetzung in `src/renderer/src/components/EffectsPanel.tsx`:

- [x] Den Text ersetzen durch:

```text
Klicken Sie auf "Scannen", um installierte Audio-Plugins zu lokalisieren. Plugin-Hosting ist in diesem Prototyp noch nicht implementiert.
```

- [x] Optional den Abschnittstitel von:

```text
Installierte VST Instrumente & Effekte
```

auf:

```text
Installierte Audio-Plugins
```

aendern.

- [x] Den Button-Text `Interface oeffnen` darf bleiben, aber nur wenn Phase 2 die Fehlermeldung korrekt anzeigt. Alternativ darf er auf `Interface testen` oder `Interface anfragen` geaendert werden. Keine anderen UI-Umbauten.

Akzeptanz:

- [x] Der leere Zustand nennt nicht mehr nur Windows.
- [x] Der Text behauptet keinen fertigen Plugin-Host.
- [x] `npm run typecheck` laeuft erfolgreich.

## Phase 4: Dokumente Nicht Schoenreden

In `docs/ANTIGRAVITY_NACHKORREKTURBERICHT.md` muss Antigravity ehrlich festhalten:

- [x] Was genau an `openVstUi` falsch war.
- [x] Welche TypeScript-Signaturen geaendert wurden.
- [x] Welche UI-Stelle geaendert wurde.
- [x] Dass der echte Plugin-Host weiterhin offen ist.
- [x] Dass MCP weiterhin Prototyp ist.
- [x] Dass die `AudioEngine.ts` Build-Warnung weiterhin offen ist, falls sie nach `npm run build` noch erscheint.

Nicht erlaubt im Bericht:

- [x] Keine Formulierung "vollstaendig realisiert" fuer MCP.
- [x] Keine Formulierung "Plugin Host fertig".
- [x] Keine Formulierung "alle Plugin-Funktionen umgesetzt".

## Phase 5: Checks Und Nachweis

Antigravity muss nach der Nachkorrektur ausfuehren:

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

Und zusaetzlich diesen Suchbefehl:

```powershell
rg "openVstUi:.*Promise<boolean>" src
```

Erwartung:

- [x] `npm run typecheck` erfolgreich.
- [x] Core-Test erfolgreich.
- [x] MCP-Test erfolgreich.
- [x] `npm run build` erfolgreich.
- [x] Falls die bekannte `AudioEngine.ts` Warnung erscheint, must sie im Bericht als weiterhin offen genannt werden.
- [x] `rg "openVstUi:.*Promise<boolean>" src` liefert keinen Treffer.

## Finale Akzeptanzkriterien

Dieser Nachkorrekturplan ist erst erledigt, wenn:

- [x] `openVstUi` in allen Renderer-/Preload-Typen kein `Promise<boolean>` mehr ist.
- [x] `EffectsPanel.tsx` das Ergebnis von `openVstUi` awaited und `success: false` sichtbar meldet.
- [x] Die Plugin-UI nicht mehr Windows-only formuliert ist.
- [x] Der echte Plugin-Host weiterhin klar als offen dokumentiert ist.
- [x] MCP weiterhin klar als Prototyp dokumentiert ist.
- [x] Alle Tests und Checks aus Phase 5 gelaufen sind.
- [x] `docs/ANTIGRAVITY_NACHKORREKTURBERICHT.md` existiert.
- [x] Diese Datei vollstaendig abgehakt wurde.

## Berichtsvorlage Fuer Antigravity

Antigravity muss den Bericht unter `docs/ANTIGRAVITY_NACHKORREKTURBERICHT.md` mindestens so strukturieren:

```md
# ANTIGRAVITY NACHKORREKTURBERICHT

## Zusammenfassung

## Geaenderte Dateien

## Umgesetzte Punkte Aus FOLGEPLAN_ANTIGRAVITY_NACHKORREKTUR.md

## Tests Und Befehle

## Weiterhin Offene Punkte

## Abweichungen Vom Plan
```

Wenn es keine Abweichungen gibt, muss dort stehen:

```text
Keine Abweichungen.
```
