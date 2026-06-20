# Implementierungsplan: hochpraezise Waveform-Darstellung

## Ziel

Die Waveform im Omega Wave Editor soll beim Herauszoomen eine ruhige, professionelle Uebersicht liefern und beim starken Heranzoomen echte kleinteilige Signalformen zeigen, damit Transienten, Knackser, Null-Linien und Schnittpunkte deutlich erkennbar werden.

Der Look bleibt im bestehenden blauen Omega-Stil. Changelog und Patchnotes muessen spaeter neutral formuliert werden und duerfen keine Namen von Vergleichsprogrammen enthalten.

## Ausgangslage

Aktueller Stand:

- `src/main/ipc/audioIpc.ts` berechnet `get-peaks` aus einer auf 8000 Hz heruntergerechneten Mono-Spur.
- `src/renderer/src/components/WaveformRenderer.tsx` fordert pauschal 8000 Peakpunkte pro Datei an.
- Die Darstellung nutzt absolute Peakwerte und spiegelt sie optisch nach oben und unten. Dadurch sieht sie nicht wie das echte positive/negative Sample-Signal aus.
- Stereo wird im Normalfall nicht als zwei getrennte Kanaele im Clip-Body gezeichnet.
- Bei starkem Zoom wird dieselbe feste Punktmenge nur breiter skaliert. Das erzeugt zwar eine fluessige SVG-Flaeche, aber keine echte Detailgenauigkeit.
- Die bisherige Zufalls-/Demo-Fallback-Waveform ist fuer einen Editor riskant, weil sie bei Fehlern eine nicht reale Wellenform vortaeuschen kann.

Wichtige lokale Code-Stellen:

- `src/main/ipc/audioIpc.ts`: `get-peaks`, FFmpeg-Decode, aktuelle Downsampling-Logik.
- `src/renderer/src/components/WaveformRenderer.tsx`: feste 8000-Punkte-Abfrage, SVG-Pfadbau, visuelle Normalisierung.
- `src/renderer/src/components/Timeline.tsx`: Zoomlogik, Clip-Breiten, `justDraggedRef`-Schutz. Dieser Schutz darf nicht veraendert werden.
- `src/renderer/src/components/timeline/ClipRegion.tsx`: modularer Clip-Renderer mit eigener Waveform-Einbindung.

## Recherche-Ergebnis

- Audacity beschreibt die Waveform bei normalem Zoom als Peak pro Pixelgruppe und zeigt bei starkem horizontalem Zoom verbundene Samplepunkte mit Null-Linie. Mit RMS-Anzeige nutzt es dunklere Peak- und hellere RMS-Anteile.
- REAPER dokumentiert fuer `.ReaPeaks` Peak-Dateien mehrere Mipmap-Level. Ein Mipmap-Eintrag beschreibt, wie viele Samples ein Peakwert repraesentiert.
- BBC `audiowaveform` erzeugt wiederverwendbare Waveform-Daten und erlaubt Zoomlevel in Samples pro Pixel sowie getrennte Kanaele.
- BBC `Peaks.js` und `wavesurfer.js` unterscheiden zwischen browserseitigem Decode und vorberechneten Peaks. Fuer lange Dateien werden vorberechnete Peaks empfohlen.
- `wavesurfer.js` vermeidet grosse Canvas-Breiten durch Kacheln, begrenzt einzelne Canvas-Elemente und raeumt Offscreen-Canvases auf.

Quellen:

- https://manual.audacityteam.org/man/audacity_waveform.html
- https://www.reaper.fm/sdk/reapeaks.txt
- https://github.com/bbc/audiowaveform
- https://github.com/bbc/peaks.js/
- https://wavesurfer.xyz/docs/peaks/
- https://wavesurfer.xyz/docs/performance/

## Zielarchitektur

Die Verbesserung wird nicht als reiner UI-Trick umgesetzt, sondern als kleines Waveform-Analyse-Subsystem:

```text
Dateiimport / erster Render
  -> WaveformAnalysisService
    -> FFmpeg/PCM Decode
    -> Peak-/RMS-/Mipmap-Cache
    -> sichtfensterbasierte Detail-Abfrage
  -> IPC/Command-faehige Datenabfrage
  -> WaveformRenderer
    -> Uebersichtsmodus
    -> Detailmodus
    -> Samplemodus
```

Damit bleibt die Richtung aus dem Sanierungsplan erhalten: Analyse- und Datenlogik wandern in einen stabilen Kern bzw. Main/Service-Bereich, nicht in UI-Klicklogik.

## Datenmodell

Neue interne Struktur `WaveformData`:

```ts
type WaveformLevel = {
  samplesPerPoint: number
  channels: Array<{
    min: Float32Array | number[]
    max: Float32Array | number[]
    rms?: Float32Array | number[]
  }>
}

type WaveformData = {
  filePath: string
  fingerprint: {
    size: number
    mtimeMs: number
  }
  duration: number
  sampleRate: number
  channels: number
  levels: WaveformLevel[]
}
```

Wichtig:

- Min/Max muessen signiert bleiben, also Werte von `-1.0` bis `+1.0`.
- RMS ist optional, aber sehr hilfreich fuer eine professionellere, lesbare Innenflaeche.
- Peaks werden nicht kuenstlich mit Zufallsdaten ersetzt. Bei Fehlern zeigt die UI einen klaren Lade-/Fehlerzustand.

## Decode- und Cache-Plan

1. `audioIpc.ts` nicht weiter aufblaehen, sondern einen neuen Service vorbereiten, z. B. `src/main/waveform/waveformAnalysisService.ts`.
2. FFmpeg-Dekodierung auf PCM Float32 statt 16-bit Mono:
   - Format: `f32le`
   - Kanaele: echte Quellkanaele erhalten, mindestens Mono/Stereo sauber trennen.
   - Samplerate: native Samplerate bevorzugen, nicht pauschal 8000 Hz.
3. Mipmap-Level berechnen:
   - sinnvolle Stufen z. B. `1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192`.
   - Fuer sehr lange Dateien kann Level `1` nur sichtfensterweise berechnet werden, damit RAM und Cache nicht explodieren.
4. Cache-Speicher:
   - AppData/UserData, z. B. `app.getPath('userData')/waveform-cache`.
   - Cache-Key aus Pfad, Dateigroesse, `mtimeMs`, Samplerate und Cache-Version.
   - Alte Cache-Versionen sicher ignorieren und neu aufbauen.
5. Progressive Darstellung:
   - zuerst schnelles Overview-Level anzeigen.
   - danach feinere Level nachladen, wenn Zoom/Viewport es erfordern.

## Rendering-Plan

1. `WaveformRenderer` viewport-basiert umbauen:
   - Props: `pixelsPerSecond`, `timelineScrollLeft`, `viewportWidth`, `regionStart`, `sourceOffset`, `duration`, `fileDuration`, `stereoMode`, `gain`.
   - Nur den sichtbaren Clip-Ausschnitt plus kleinen Puffer rendern.
2. Canvas wieder gezielt einsetzen, aber nicht als riesiges Clip-Canvas:
   - Canvas-Breite auf sichtbaren Bereich begrenzen.
   - Bei Bedarf Kacheln bis maximal ca. 8000 px Breite.
   - DevicePixelRatio beachten, aber begrenzen, damit Speicher stabil bleibt.
3. Drei Darstellungsmodi:
   - Uebersicht: gefuellte Min/Max-Huelle, optional RMS-Innenflaeche.
   - Detail: signierte Min/Max-Kurve mit klarer Null-Linie.
   - Samplemodus: echte Sample-Linie, bei ausreichendem Zoom Samplepunkte/Dots und Null-Durchgaenge sichtbar.
4. Stereo:
   - Stereo-Dateien standardmaessig als zwei Lanes im Clip-Body darstellen.
   - `left-only` und `right-only` bleiben als Einzelkanal-Darstellung erhalten.
   - Kleine L/R-Markierung und getrennte Null-Linien optional.
5. Farblook:
   - dunkler Clip-Body beibehalten.
   - Cyan/Blau-Fill mit leichtem Verlauf.
   - helle, feine Kontur fuer Peaks.
   - RMS als dezenter hellerer Innenbereich.
   - Clipping/0-dB optional mit schmaler Warnfarbe, aber nicht in Release-Text mit Fremdvergleichen beschreiben.

## Zoom- und Bedienkonzept

1. Aktuelle maximale Zoomstufe `20` pruefen. Bei `PIXELS_PER_SECOND_BASE = 50` sind das nur `1000 px/s`.
2. Fuer sample-nahe Bearbeitung braucht es entweder:
   - deutlich hoehere Zoomstufen, oder
   - einen speziellen Sample-Detailmodus fuer den sichtbaren Bereich.
3. Vorschlag:
   - normale Zoomstufen fuer Arrangement beibehalten.
   - oberhalb einer Schwelle automatisch Detail-/Samplemodus aktivieren.
   - spaeter optional eine Einstellung "Sample-Detailanzeige beim starken Zoom".
4. Schnittgenauigkeit:
   - Die Anzeige allein reicht nicht; spaeter sollte die Split-/Trim-Logik bereits sample-genau bleiben oder weiter validiert werden.

## Umsetzungsschritte

### Phase 1: Planungsphase

- [x] Projektregeln und Sanierungsplan lesen.
- [x] Antigravity-Konversation und Bilder im `codex`-Ordner auswerten.
- [x] Aktuelle Waveform-Codepfade analysieren.
- [x] Externe technische Referenzen recherchieren.
- [x] Diesen Plan und `task.md` anlegen.

### Phase 2: Implementierungsphase nach Freigabe

Status: umgesetzt, mit manueller UI-Pruefung als offenem Restpunkt.

1. Testspezifikation anlegen:
   - synthetischer Impuls/Klick muss im Downsampling sichtbar bleiben.
   - positiver und negativer Samplewert muessen getrennt erhalten bleiben.
   - Stereo-L/R duerfen nicht versehentlich gemischt werden.
   - sourceOffset/duration muss den richtigen Dateiausschnitt liefern.
2. `WaveformAnalysisService` erstellen. Erledigt.
3. Neuen IPC-Handler vorbereiten, z. B. `waveform:get-window` und `waveform:get-overview`. `waveform:get-window` erledigt.
4. Bestehendes `get-peaks` vorerst kompatibel lassen oder intern auf den neuen Service mappen. Kompatibel gelassen; Timeline nutzt den neuen Handler.
5. `WaveformRenderer` auf viewport- und zoomabhaengige Datenabfrage umbauen. Erledigt.
6. Stereo-Lanes und Samplemodus rendern. Erledigt.
7. Zufalls-Fallback fuer echte Dateien entfernen. Im aktiven Timeline-Renderer erledigt.
8. Settings bei Bedarf erweitern:
   - Stereo-Waveform getrennt anzeigen.
   - RMS-Innenflaeche anzeigen.
   - Waveform vertikal automatisch normalisieren oder echte Amplitude anzeigen.
9. Benutzerhandbuch aktualisieren, falls sichtbare Einstellungen oder neue Bedienung entstehen.
10. Changelog neutral aktualisieren, ohne Fremdmarken.

### Phase 3: Verifikation

- `npm run typecheck`
- `npm run build` oder `npm run check`, soweit native Build-Umgebung verfuegbar ist.
- Manuelle UI-Pruefung:
  - normale Datei und laute Datei nebeneinander.
  - starker Zoom: kein weisser/blanker Clip-Body.
  - Sample-/Transientenbereich: Knackser und Zacken klar sichtbar.
  - Stereo-Datei: L/R getrennt lesbar.
  - Source-Offset/gesplittete Clips: Wellenform startet an korrekter Stelle.
- Screenshot-Vergleich mit den vorhandenen Referenzbildern aus `codex/`.

## Risiken und Gegenmassnahmen

- Performance bei langen Dateien: sichtfensterbasiertes Rendering, Mipmap-Cache, keine Vollbreiten-Canvases.
- Speicherverbrauch: Float32-Rohdaten nicht fuer komplette lange Dateien dauerhaft im Renderer halten.
- UI-Flackern beim Nachladen: zuerst grobes Level, dann feinere Daten ersetzen.
- Falsche Sicherheit durch visuelle Normalisierung: echte Amplitude und Auto-Fit klar trennen.
- Timeline-Klick-Bug: `justDraggedRef` in `Timeline.tsx` nicht anfassen.
- Projektarchitektur: Analyse-Service so bauen, dass er spaeter Command Layer/MCP-faehig wird.

## Empfehlung

Nicht nur den vorhandenen SVG-Pfad feiner machen. Der richtige Schritt ist ein zoomstufenfaehiger Waveform-Cache mit signierten Min/Max-Daten, Stereo-Kanaelen und sichtfensterbasiertem Samplemodus. Damit sieht die Welle besser aus und wird gleichzeitig als Schnittwerkzeug wirklich praezise.
