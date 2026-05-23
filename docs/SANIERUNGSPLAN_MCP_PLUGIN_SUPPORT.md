# Sanierungsplan: MCP, Headless-Betrieb und Cross-Plattform Plugin-Support

Dieses Dokument haelt die strategischen Sanierungs- und Erweiterungsziele fuer Omega Wave Editor fest. Es soll von Menschen und KI-Agenten vor groesseren Aenderungen gelesen werden, damit die langfristige Richtung nicht verloren geht.

## Zielbild

Omega Wave Editor soll zuerst technisch stabilisiert und danach zu einer vollstaendig per strukturierter Schnittstelle steuerbaren Audio-Automationsengine erweitert werden.

Die MCP-Schnittstelle soll nicht auf UI-Klicks basieren, sondern auf echten Befehlen. Am Ende soll die gesamte App bedienbar sein:

- Projekte erstellen, laden, speichern und exportieren
- Spuren anlegen, loeschen, umbenennen und konfigurieren
- Clips importieren, schneiden, trimmen, verschieben, gruppieren und benennen
- Fades, Gain, Stereo-Modus und Clip-Eigenschaften setzen
- Effekte und Cleaning-Funktionen vollstaendig steuern
- Effektketten und Presets speichern, laden, kopieren und anwenden
- ID3-/Metadaten lesen und schreiben
- Audio analysieren
- Batch-Jobs und Recipes ausfuehren
- Undo/Redo fuer Einzelbefehle und komplette KI-Auftraege nutzen
- Headless ohne sichtbares App-Fenster arbeiten
- optional eine geoeffnete UI mit einer Session synchronisieren

MCP wird erst veroeffentlicht, wenn die Abdeckung vollstaendig und stabil ist. Interne Meilensteine sind erlaubt, aber kein halber Public-Release.

## Grundarchitektur

Die aktuelle UI-gebundene Logik muss schrittweise in einen gemeinsamen Kern ueberfuehrt werden.

```text
React UI
  -> Command Layer
    -> Project Core
    -> Timeline Core
    -> Audio Engine
    -> Export Engine
    -> Analysis Engine
    -> Metadata Engine
    -> Plugin Engine
    -> Job System

MCP Server
  -> Command Layer

Headless Runner
  -> Command Layer
```

Wichtig: Die React-UI darf langfristig nicht der einzige Ort sein, an dem Schneiden, Verschieben, Effekte, Projektlogik oder Exportlogik passieren.

## Fundament-Sanierung

1. `Timeline.tsx` modularisieren.
   - Timeline-Layout
   - Track-Rendering
   - Clip/Region-Rendering
   - Drag/Drop
   - Selection/Lasso
   - Keyboard-Shortcuts
   - Playback/Recording-Integration

2. `ipc.ts` modularisieren.
   - Projektdateien
   - Export/FFmpeg
   - Datei-/Ordnerzugriff
   - Settings/System
   - Updates
   - Plugin-Scanning
   - Recording

3. Gemeinsame Typen einfuehren.
   - `Project`
   - `Track`
   - `Region`
   - `EffectChain`
   - `ExportSettings`
   - `MetadataTags`
   - `PluginDescriptor`
   - `Session`
   - `Job`
   - `Recipe`

4. Projektformat stabilisieren.
   - klare `.owep`-Versionierung
   - Validierung beim Laden
   - Migrationen fuer spaetere Formatversionen
   - robuste Behandlung fehlender Medien
   - relative/absolute Pfade sauber behandeln

5. Doku und Encoding bereinigen.
   - README-Encoding reparieren
   - vorhandene Features nicht entfernen
   - langfristige Architekturziele dokumentieren

## MCP- und Headless-Modell

MCP soll als strukturierte Befehls-Schnittstelle geplant werden.

Beispielkategorien:

```text
mcp.project.*
mcp.track.*
mcp.clip.*
mcp.timeline.*
mcp.effects.*
mcp.cleaning.*
mcp.export.*
mcp.metadata.*
mcp.analysis.*
mcp.plugin.*
mcp.batch.*
mcp.recipe.*
mcp.session.*
mcp.job.*
mcp.undo.*
```

Jeder Befehl braucht:

- Eingabe-Schema
- Ausgabe-Schema
- Fehlerformat
- Rechteanforderung
- Undo/Redo-Verhalten
- Testfall

## Sicherheitsmodell fuer MCP

MCP soll auftragsbasiert arbeiten.

- Originaldateien werden standardmaessig nie ueberschrieben.
- Jeder Auftrag bekommt erlaubte Input- und Output-Bereiche.
- Dauerhafte App-Einstellungen duerfen nicht veraendert werden.
- Temporaere Session- und Export-Einstellungen sind erlaubt.
- Speichern einer `.owep`-Projektdatei erfolgt nur, wenn Nutzer oder Auftrag das ausdruecklich wollen.

Geplante Rechteprofile:

- `read_only`
- `single_file_edit`
- `batch_process`
- `render_export`
- `project_full_control`

## Sessions, Jobs und Parallelitaet

MCP soll mehrere Sessions und parallele Jobs unterstuetzen.

Ein Job braucht:

- `job_id`
- `session_id`
- Status: `queued`, `running`, `done`, `failed`, `canceled`
- Fortschritt
- aktuelle Datei oder Aktion
- strukturierte Logs
- Warnungen
- Teilresultate
- finale Output-Dateien
- Abbruchmoeglichkeit

Parallelitaet braucht Ressourcenlimits, damit grosse Batch-Jobs RAM und CPU nicht unkontrolliert belasten.

## Undo, Redo und Transaktionen

- Einzelbefehle sollen undo-faehig sein.
- Ganze KI-Auftraege koennen als ein Undo-Schritt zusammengefasst werden.
- Recipes laufen als Transaktion.
- Bei Fehlern soll ein Auftrag zurueckgerollt werden koennen.

## Analyse und Metadaten

Bereits vorhanden oder teilweise vorhanden:

- Dauer per FFprobe
- einfache Medien-Tags
- Waveform-/Pegelwerte
- Projektstruktur
- Live-Pegel beim Recording
- Performance- und Speicherinfos

Fest einplanen:

- Format
- Codec
- Bitrate
- Sample Rate
- Kanaele
- Dauer
- Tags lesen und schreiben
- echte Peaks
- RMS/Lautheit
- Stille-Erkennung
- Clipping-Erkennung

Spaetere Module vorbereiten:

- BPM
- Sprache/Transkript
- Musik-/Stimmen-Erkennung

ID3-/Metadaten-Bearbeitung muss ein eigener MCP-Bereich werden, nicht nur eine Export-Option.

## Effects, Presets und Recipes

MCP soll Effekte vollstaendig bedienen koennen:

- einzelne Parameter setzen
- Presets anwenden
- Effektketten speichern/laden
- Effektketten kopieren/einfuegen
- pro Clip anwenden
- pro Spur anwenden, soweit intern unterstuetzt
- auf mehrere Clips/Dateien anwenden
- Cleaning-Presets verwenden
- mit angewendeter Effektkette exportieren

Recipes koennen temporaer oder gespeichert sein. Beispiel:

```json
{
  "trim_start_seconds": 2,
  "trim_end_seconds": 2,
  "normalize": true,
  "metadata": {
    "artist": "Omega"
  },
  "export": {
    "format": "mp3"
  }
}
```

## Cross-Plattform Plugin-Support

Der aktuelle Stand ist noch keine echte Plugin-Host-Implementierung:

- `scan-vst-plugins` scannt einige Standardpfade.
- Nicht-Windows behandelt Linux derzeit faktisch wie macOS.
- `open-vst-ui` ist ein Stub und hostet noch kein echtes Plugin.

Langfristig darf das System nicht nur "VST Windows" denken. Es braucht eine plattformuebergreifende Plugin-Abstraktion.

### Geplante Plugin-Formate

Windows:

- VST2 (`.dll`)
- VST3 (`.vst3`)

macOS:

- VST2 (`.vst`)
- VST3 (`.vst3`)
- Audio Units / AU (`.component`)

Linux:

- VST3 (`.vst3`)
- LV2 (`.lv2`)
- optional VST2 (`.so`), wenn bewusst unterstuetzt

Spaeter optional:

- CLAP

### Plugin-Registry

Gefundene Plugins sollen in einer stabilen Registry erfasst werden:

- stabile Plugin-ID
- Name
- Hersteller
- Version
- Format
- Plattform
- Pfad
- Kategorie
- Scanstatus
- Fehler/Warnungen
- Crash- oder Blocklist-Status

### Echter Plugin-Host

Electron und Web Audio koennen native VST/AU/LV2-Plugins nicht direkt hosten. Deshalb braucht Omega Wave Editor fuer echten Plugin-Support eine native Bridge oder einen separaten Plugin-Host-Prozess.

Anforderungen:

- separater Host-Prozess
- Audio- und Parameter-Kommunikation zwischen App und Host
- Plugin-UI-Fenster, wo moeglich
- Headless-Rendering fuer MCP/Batch
- Crash-Erkennung
- wiederholt abstuerzende Plugins blockieren
- klare Fehlermeldungen

### MCP-Plugin-Befehle

MCP soll Plugins spaeter ebenfalls steuern koennen:

- Plugins scannen
- Pluginliste lesen
- Plugin auf Clip oder Spur laden
- Parameter lesen
- Parameter setzen
- Plugin-Presets laden/speichern
- Plugin-Ketten anwenden
- Render mit Plugin-Effekten starten

## Empfohlene Umsetzungsreihenfolge

1. Doku-/Encoding-Hinweise und Start-Dokumente korrigieren.
2. Gemeinsame Typen und Projektmodell einfuehren.
3. Timeline-Aktionen in einen Command Layer ueberfuehren.
4. IPC, Export und Analyse modularisieren.
5. Headless Session Runner bauen.
6. Job-System, Rechteprofile und Transaktionen bauen.
7. MCP-Befehlskatalog implementieren.
8. Effekte, ID3, Recipes und Batch anbinden.
9. Plugin-Abstraktion und plattformgerechtes Scanning bauen.
10. Echten Plugin-Host als separates Subsystem planen und implementieren.
11. Erweiterte Analyse ergaenzen.
12. Tests, Release-Check und Dokumentation finalisieren.

## Wichtige Risiken

- Timeline-Logik steckt aktuell stark in der UI.
- Headless-Audio darf nicht vom sichtbaren Browserfenster abhaengen.
- Native Plugins koennen abstuerzen und duerfen die App nicht mitreissen.
- Parallele Jobs koennen RAM und CPU stark belasten.
- MCP darf keine Originaldateien zerstoeren.
- Vollstaendige MCP-Abdeckung ist gross und braucht saubere Tests.

## Pflicht fuer KI-Agenten

Jede KI, die an Omega Wave Editor arbeitet, soll dieses Dokument vor Architektur-, MCP-, Plugin-, Export-, Timeline- oder AudioEngine-Aenderungen lesen und beachten.
