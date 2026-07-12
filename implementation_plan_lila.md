# Plan LILA: Waveform-Optik im Stil professioneller DAWs (REAPER) + Design-Einstellungen (→ Version 0.13.16)

Stand: 2026-07-12 · Basis: 0.13.15 · Priorität: MITTEL · Risiko: NIEDRIG-MITTEL (Zeichenroutinen + ein neuer Einstellungsblock, keine Daten-/Analyse-Logik)

---

## 0. Anweisungen für den ausführenden Agenten (WICHTIG, komplett lesen)

**Kontext:** Die Waveform im Omega Wave Editor wird aktuell aus drei übereinanderliegenden Schichten gezeichnet: (a) Peak-Hüllkurven-Füllung mit einem vertikalen Farbverlauf, dessen Mitte fast durchsichtig ist, (b) RMS-Fläche, (c) zwei helle Konturlinien auf Min- und Max-Kante. Ergebnis: Die fast durchsichtige Füllmitte wirkt wie ein grauer "Schatten" hinter einer separaten hellen Linie. Zusätzlich sieht die Waveform je nach Zoomstufe komplett unterschiedlich aus: weit herausgezoomt ein dicker Körper, weit hineingezoomt (Sample-Modus) plötzlich nur noch eine dünne helle Linie ohne Füllung.

**Die zwei Kernziele dieses Plans (vom Nutzer so gefordert):**

- **A) Einheitlicher Look über ALLE Zoomstufen.** Von ganz weit raus bis ganz weit rein (Sample-Modus) muss die Waveform wie EIN durchgehendes Design aussehen: gleiche Farbe, gleiche Helligkeit, gefüllter Körper in beiden Modi. Der Übergang beim Zoomen darf nicht wie ein Themenwechsel wirken. Das ist das wichtigste Abnahmekriterium.
- **B) Farbe und Deckkraft einstellbar.** Ein neuer Einstellungsbereich "Darstellung/Design" mit: Waveform-Farbe (Color-Picker), Deckkraft (Slider), RMS-Kern an/aus. KEIN "Klassisch"-Preset — der alte Look wird ersatzlos ersetzt.

**So sieht REAPER (und die meisten Profi-DAWs) die Waveform — das ist die Ziel-Optik:**
- Ein **einziger, gleichmäßig deckend gefüllter Peak-Körper** (Min-bis-Max-Hüllkurve) in EINER Farbe — kein vertikaler Verlauf, keine durchsichtige Mitte.
- Darin optional eine **hellere RMS-Fläche** in derselben Farbfamilie, als "Kern" im Körper.
- **Keine dicken Konturlinien** auf den Kanten.
- Dünne, dezente Null-Linie.
- Im Sample-Modus dieselbe Farbwelt: Linie + Punkte in der Kernfarbe, darunter eine gefüllte Fläche zur Null-Linie in der Körperfarbe.

**Eiserne Regeln:**

1. **Zeichenlogik nur in** `src/renderer/src/components/WaveformRenderer.tsx` (`drawPeakChannel`, `drawSampleChannel`, `drawZeroLine`) **ändern.** NICHTS an Datenbeschaffung, Mapping (`mapX`/DrawMapping), Effekt-Struktur, IPC oder `waveformAnalysisService.ts` ändern.
2. **Bitmap-Cache beachten (kritisch!):** Der Bitmap-Cache in WaveformRenderer.tsx speichert fertige Canvas-Kacheln unter einem String-Schlüssel. Die neuen Design-Werte (Farbe, Deckkraft, RMS an/aus) MÜSSEN in diesen Schlüssel aufgenommen werden, sonst zeigt die App nach einer Design-Änderung alte Kacheln im alten Look. Ebenso müssen die Design-Werte in die Abhängigkeiten des Paint-Effekts, damit eine Änderung ein Neuzeichnen auslöst.
3. `justDraggedRef` in `Timeline.tsx` niemals anfassen (`.clinerules`).
4. Nur `npm run typecheck` zur Prüfung; kein `npm run build`/`check` (natives VST-Modul).
5. Code-Stil: 2 Leerzeichen, keine Semikolons, deutsche Kommentare. UI-Texte zweisprachig über i18next (wie die restlichen Einstellungen).
6. NICHT committen/pushen. Nach Abschluss stoppen und berichten.

**Standard-Farbwelt:** Beim Omega-Cyan/Blau bleiben (Akzent `#0078d7`, bisherige Cyan-Töne). Der Nutzer kann sie danach selbst umstellen.

---

## 1. Design-Einstellungen definieren und durchreichen

Die App hat bereits ein Settings-System: `window.api.getSettings()` / `window.api.saveSettings()`, Änderungen werden per `SETTINGS_UPDATED`-CustomEvent verteilt; `halfWaveform` ist ein existierendes Beispiel für eine Einstellung, die bis in den WaveformRenderer durchgereicht wird. **Genau diesem Muster folgen.**

Neue Einstellungsfelder (Namen sinngemäß, an vorhandene Konventionen anpassen):

| Feld | Typ | Standard | Bedeutung |
|---|---|---|---|
| `waveformColor` | string (Hex) | ein sattes Cyan-Blau, Richtwert `#0096cd` | Grundfarbe des Peak-Körpers |
| `waveformOpacity` | number 0.3–1.0 | 0.9 | Deckkraft des Körpers |
| `waveformShowRms` | boolean | true | hellerer RMS-Kern an/aus |

Abgeleitete Werte (im Renderer berechnen, NICHT als eigene Einstellungen): Kern-/RMS-Farbe = aufgehellte Variante von `waveformColor` (z. B. Richtung Weiß mischen), Sample-Linie/Punkte = Kernfarbe, Null-Linie = Grundfarbe stark transparent. So bleibt alles automatisch in einer Farbfamilie, egal was der Nutzer wählt.

Vorgehen:
1. Felder mit Standardwerten in die Settings-Defaults aufnehmen (dort, wo `halfWaveform` & Co. definiert sind — vorher suchen).
2. In `SettingsModal.tsx` einen neuen Abschnitt/Reiter "Darstellung" (en: "Appearance") anlegen: Color-Picker (`<input type="color">` reicht), Deckkraft-Slider mit Prozentanzeige, RMS-Checkbox. Felder in die `keysToCompare`-Liste für die Ungespeichert-Warnung aufnehmen.
3. Durchreichen wie `halfWaveform`: App/Timeline liest die Werte aus den Settings und gibt sie als Props an `WaveformRenderer` weiter.
4. **Live-Übernahme OHNE App-Neustart (Pflicht):** Timeline.tsx hat bereits einen `SETTINGS_UPDATED`-Listener, der einzelne Einstellungen sofort in React-State übernimmt (Beispiel: `videoAudioOnOneTrack`). Die drei Design-Werte dort ergänzen. Da sie in den Paint-Effekt-Abhängigkeiten und im Bitmap-Cache-Schlüssel stecken (Regel 2), zeichnet sich die Waveform nach dem Speichern sofort im neuen Look — ein Neustart darf NICHT nötig sein.

## 2. Peak-Modus: `drawPeakChannel` umbauen

1. **Füllung → ein deckender Körper:** Den `fillGradient` (drei Stops, Mitte fast durchsichtig) ersetzen durch eine flache Farbe aus `waveformColor` + `waveformOpacity`. Gilt für beide Zweige (Voll-Waveform und `halfWaveform`).
2. **RMS → hellerer Kern:** Wenn `waveformShowRms`, die RMS-Fläche in der abgeleiteten helleren Kernfarbe deckend über den Körper zeichnen. Im `halfWaveform`-Zweig gibt es bisher keine RMS-Zeichnung — dort nach gleichem Prinzip ergänzen (Amplitude von der Baseline aus); falls das unsauber wird, weglassen und im Bericht vermerken.
3. **Konturlinien entfernen:** Die zwei separaten Stroke-Durchläufe (lineWidth 1.35, `strokeGradient`) ersatzlos streichen, `strokeGradient` löschen. Wirkt die Kante ohne Kontur zu weich, ist EIN dünner Saum (lineWidth 1, gleiche Farbe leicht aufgehellt, Deckkraft ≤0.35) auf dem Hüllkurvenpfad erlaubt — keine getrennten Min-/Max-Läufe mit eigener Optik.
4. **Null-Linie:** `drawZeroLine` auf die stark transparente Grundfarbe umstellen (Deckkraft ~0.10–0.14).

## 3. Sample-Modus: `drawSampleChannel` an den Peak-Look angleichen (Kernziel A!)

1. **Gefüllte Fläche ergänzen:** Unter der Sample-Kurve eine Fläche bis zur Null-Linie füllen, in der Körperfarbe aus Abschnitt 2 (ggf. leicht reduzierte Deckkraft, damit die Linie lesbar bleibt). Ein einziger zusätzlicher Fill-Pfad — keine Per-Punkt-Extraarbeit, die Draw-Zeiten müssen einstellig bleiben.
2. **Linie + Punkte umfärben:** von fast-weiß auf die Kernfarbe; Punktradius 2 und Abstandsschwelle 5 px unverändert.
3. **Abnahmekriterium:** Beim langsamen Durchzoomen über die Peak↔Sample-Grenze (Log zeigt den Moduswechsel) darf optisch kein Bruch erkennbar sein — gleiche Farbe, gleicher "gefüllter Körper"-Eindruck, nur mehr Detail.

## 4. Sichttest (Pflicht)

`npm run dev`, eine Musikdatei laden und prüfen:

1. **Durchzoom-Test (wichtigster Test):** Von ganz weit raus bis Maximalzoom langsam hineinzoomen — durchgehend einheitlicher Look, kein Stilbruch am Peak↔Sample-Übergang.
2. Kein Schatten-Effekt mehr: ein satter Körper, optional hellerer Kern, keine separate helle Linie.
3. Einstellungen testen: Farbe ändern und speichern → Waveform übernimmt sie SOFORT ohne App-Neustart, überall (auch bereits gecachte Bereiche — Bitmap-Cache-Schlüssel!); Deckkraft-Slider wirkt; RMS aus → Kern verschwindet.
4. App-Neustart: Design-Einstellungen bleiben erhalten.
5. Zoomen/Scrollen bleibt flüssig (Trace-Log: drawMs weiterhin einstellig).
6. Halb-Waveform-Modus einmal prüfen; leise Datei laden (Normalisierung) → Optik bleibt konsistent.

## 5. Abschluss

1. `npm run typecheck` fehlerfrei.
2. `package.json`: Version → `0.13.16`.
3. `CHANGELOG.md`: neuer Eintrag `## [0.13.16]`, zweisprachig, sinngemäß — Geändert: "Waveform-Darstellung überarbeitet: durchgehend einheitlicher, deckend gefüllter Look über alle Zoomstufen im Stil professioneller DAWs; Schatten-Effekt entfernt." Hinzugefügt: "Neuer Einstellungsbereich Darstellung: Waveform-Farbe, Deckkraft und RMS-Kern anpassbar."
4. `task.md`: Plan-LILA-Zeile auf erledigt setzen.
5. Stoppen und berichten (inkl. final gewählter Standard-Farbwerte). NICHT committen/pushen.
