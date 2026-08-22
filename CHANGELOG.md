# Changelog

The format is based on Keep a Changelog. Dieses Projekt nutzt das klassische Semantic Versioning (`X.Y.Z`).

## [0.13.22] - 2026-08-22

### Deutsch

#### 🐛 Behoben
- **Flüssiges Verschieben & Bearbeiten**: Ein Fehler wurde behoben, durch den das Programm beim Bewegen von Audio-Objekten auf der Zeitleiste oder beim schnellen Anpassen von Lautstärke- und Einblend-Anfassern einfrieren oder abstürzen konnte.
- **Master-Lautstärkeregler**: Der Hauptlautstärkeregler wurde auf moderne Systemstandards umgestellt und reagiert nun auf allen Plattformen fehlerfrei und ohne Warnmeldungen.
- **Wellenform-Berechnung**: Tonwellen großer oder langer Audiodateien werden beim ersten Einlesen nun noch zuverlässiger und ohne Ladeabbrüche visualisiert.
- **Update-Prüfung**: Sucht das Programm nach Aktualisierungen, während neue Versionen auf dem Server vorbereitet werden, erscheint jetzt ein klarer Hinweis statt einer technischen Fehlermeldung.

### English

#### 🐛 Fixed
- **Smooth Clip Editing**: Fixed an issue where rapidly moving audio objects on the timeline or adjusting volume and fade handles could cause the editor to freeze or crash.
- **Master Volume Slider**: Modernized the master volume control to follow current system standards, ensuring smooth operation across all platforms.
- **Waveform Loading**: Audio waveforms for large or long files now generate even more reliably without loading interruptions.
- **Update Checker**: When checking for updates while new files are still being processed on the server, a friendly notice is shown instead of a technical error.

## [0.13.21] - 2026-07-12

### Deutsch

#### 🐛 Behoben
- **Tastenkürzel & Verschieben**: Ein Fehler wurde behoben, durch den Tastenkürzel (wie T zum Schneiden oder Z/C/U zum Trimmen) sowie das Verschieben von Objekten nach dem Umbenennen blockiert bleiben konnten.

### English

#### 🐛 Fixed
- **Shortcuts & Clip Dragging**: Fixed an issue where keyboard shortcuts (such as T for split or Z/C/U for trim) and clip movement could remain blocked after renaming an object.

## [0.13.20] - 2026-07-12

### Deutsch

#### ✨ Neu
- **Objekt-Umbenennung**: Objekte können jetzt direkt in der Titelleiste umbenannt werden (F2 oder Kontextmenü -> Umbenennen).
- **Neuer Einstellungsbereich Darstellung**: Waveform-Farbe, Deckkraft und RMS-Kern anpassbar.

#### ⚡ Verbessert
- **Waveform-Darstellung überarbeitet**: durchgehend einheitlicher, deckend gefüllter Look über alle Zoomstufen im Stil professioneller DAWs; Schatten-Effekt entfernt.

### English

#### ✨ Added
- **Object Renaming**: Objects can now be renamed inline in their title bar (F2 or context menu -> Rename).
- **New Appearance settings area**: customizable waveform color, opacity, and RMS core display.

#### ⚡ Changed
- **Redesigned waveform rendering**: consistent, solidly filled look across all zoom levels matching professional DAWs; shadow effect removed.

## [0.13.15] - 2026-07-12

### Deutsch

#### ⚡ Verbessert
- **Wellenform-Anzeige**: Interne Umstrukturierung der Timeline in Teilmodule (Hilfsfunktionen, Typen, Diagnostik-Hook und eigenständiges LiveWaveformCanvas-Modul) zur besseren Wartbarkeit; keine funktionalen Änderungen.

### English

#### ⚡ Changed
- **Clean-up**: Refactored the timeline monolith component into separate sub-modules (utilities, types, custom hook for diagnostics, and dedicated LiveWaveformCanvas component) to improve maintainability and clean up code organization.

## [0.13.14] - 2026-07-12

### Deutsch

#### ⚡ Verbessert
- **Programmstart**: Rollup-Vendor-Splitting konfiguriert und React-Lazy-Loading für Modalfenster implementiert, um die Dateigröße des Startpakets zu optimieren und den Programmstart zu beschleunigen.

#### 🗑️ Entfernt
- **Code-Bereinigung**: Die veralteten und unbenutzten Timeline-Altmodule (`PlaybackControls`, `TimelineRuler`, `TrackHeader`) gelöscht.

### English

#### ⚡ Changed
- **Application Startup**: Configured Rollup vendor chunk splitting and implemented React lazy loading for modal windows, optimizing the application startup bundle.

#### 🗑️ Removed
- **Clean-up**: Removed deprecated and unused legacy timeline modules (`PlaybackControls`, `TimelineRuler`, `TrackHeader`).

## [0.13.13] - 2026-07-11

### Deutsch

#### 🐛 Behoben
- **Leistung & Speicher**: Die System-Kommunikation beim Übertragen von Einzelsample-Daten durch die Nutzung von Sample-Puffer anstelle eines normalen JS-Arrays optimiert.
- **Stabilität & Fehlerbehebung**: Klare Fehlermeldungen im get-media-info System-Kommunikation anstelle von stillschweigend erzeugten 10-Sekunden-Metadaten.
- **Wellenform-Anzeige**: Kollisionssichere Benennung von Waveform-Proxy-Dateien mittels eines SHA-256-Hashes.
- **Code-Bereinigung**: Das veraltete und unbenutzte ClipRegion-Modul vollständig entfernt.
- **Code-Bereinigung**: Eine Build-Warnung bezüglich des doppelten MidiEngine-Imports bereinigt.
- **Diagnose & Feedback**: Präzisere Gesten-Statistiken im Diagnose-Log für sehr kurze Interaktionen.

### English

#### 🐛 Fixed
- **Performance**: Improved internal communication by transmitting sample values as a structured audio buffer instead of a standard JS array.
- **Stability & Fixes**: Proper error propagation in the media-info internal communication instead of returning 10-second placeholder metadata.
- **Waveform Display**: Collision-proof waveform proxy file naming using a SHA-256 hash.
- **Clean-up**: Removed the deprecated, unused ClipRegion component.
- **General**: Resolved a dynamic import warning for MidiEngine.
- **Diagnostics & Feedback**: Refined micro-gesture step-rate logging in diagnostic trace logs.

## [0.13.12] - 2026-07-11

### Deutsch

#### ⚡ Verbessert
- **Leistung & Speicher**: Speicherverbrauch der Waveform-Zwischenspeicher nach geschätzter Datenmenge in Bytes begrenzt.

#### 🐛 Behoben
- **Wellenform-Anzeige**: Veralteten, ungenutzten Peak-Datenpfad entfernt, der bei Fehlern Platzhalterdaten liefern konnte.
- **Leistung & Speicher**: Doppelten Analyse-Durchlauf beim Start vermieden, wenn eine gespeicherte Analyse-Proxy-Datei auf der Festplatte existiert.
- **Wellenform-Anzeige**: Wellenform-Anzeige aktualisiert sich jetzt automatisch, wenn eine Quelldatei auf der Festplatte ersetzt wurde.

### English

#### ⚡ Changed
- **Performance**: Capped waveform cache memory consumption by limiting size budgets based on estimated bytes instead of entry counts.

#### 🐛 Fixed
- **Clean-up**: Removed a legacy, unused peak data path that could return placeholder random data on errors.
- **Application Startup**: Prevented redundant analysis decodes on startup when a saved waveform analysis proxy file exists on disk.
- **Waveform Display**: Automatically refresh the waveform display if an audio source file is replaced on disk.

## [0.13.11] - 2026-07-11

### Deutsch

#### 🐛 Behoben
- **Leistung & Speicher**: Fehler behoben, durch den Waveform-Proxy-Dateien wegen eines zu klein berechneten Binär-Headers nie gespeichert wurden und jede Datei nach einem Neustart erneut analysiert werden musste.
- **Mehrsekündige Einfrierer beim Hineinzoomen behoben**: Die Einzelsample-Darstellung wurde viel zu früh aktiviert und musste über eine Million Punkte zeichnen; sie greift jetzt erst bei sehr starkem Zoom.

### English

#### 🐛 Fixed
- **Waveform Display**: Fixed waveform proxy files failing to save due to an undersized binary header, which caused every file to be re-analyzed after each restart.
- **Zoom & Navigation**: Fixed multi-second UI freezes when zooming into a range where the sample-level view was selected far too early; the sample view now activates only at very high zoom levels.

## [0.13.10] - 2026-07-11

### Deutsch

#### 🐛 Behoben
- **Waveform-Zoom folgt jetzt dem Playhead**: Zoomen (Mausrad, Tastaturkürzel, Werkzeugleisten-Buttons, Zoom-Menü) hält den Playhead jetzt immer an seiner Bildschirmposition — ist er sichtbar, bleibt er exakt stehen, ist er außerhalb des sichtbaren Bereichs, wird er zunächst in die Mitte geholt. Das entspricht dem Verhalten gängiger Referenz-Video-/Audioeditoren. Zuvor konnte der Mausrad-Zoom den Playhead aus dem Sichtbereich schieben.
- **Flüssigeres Zoomen und Scrollen**: Die Wellenform folgt Zoom- und Scroll-Änderungen jetzt sofort optisch, indem das bereits gezeichnete Bild skaliert und neu positioniert wird, statt auf frisch berechnete Daten zu warten; die präzise Neuzeichnung folgt kurz darauf. Bereits gezeichnete Waveform-Ansichten (gleiche Datei, gleicher Ausschnitt, Größe und Zoom) werden zudem kurzfristig zwischengespeichert und bei erneutem Aufruf sofort wiederverwendet statt jedes Mal neu gezeichnet zu werden.
- **Schnelleres Laden nach Neustart**: Die einmalige Waveform-Analyse einer Audiodatei wird jetzt als kompakte Proxy-Datei im Programm-Datenordner gespeichert. Bei einer späteren Sitzung lädt dieselbe Datei ihre Wellenform sofort, statt erneut analysiert zu werden. Während eine Datei zum ersten Mal analysiert wird, zeigt ihr Clip einen dezenten Fortschrittsbalken. Proxys, die zu einem gespeicherten Projekt gehören, bleiben dauerhaft erhalten; nicht mehr verknüpfte Proxys werden nach 7 Tagen automatisch aufgeräumt, und die Gesamtgröße des Proxy-Speichers ist begrenzt.
- **Wellenform-Anzeige**: Optionalen, detaillierten Protokoll-Modus hinzugefügt, der jede Waveform-Datenanfrage von Anfrage bis Zeichnung verfolgt und Zoom-/Scroll-Gesten zusammenfasst, damit sich die Reaktionsfreudigkeit der Waveform messen lässt.
- **Wellenform-Anzeige**: Die einmalige Gesamtanalyse einer Datei für die Waveform-Übersicht wiederholt sich jetzt automatisch einmal, falls der erste Versuch durch eine kurzzeitige Dekodierungsunterbrechung fehlschlägt.

### English

#### 🐛 Fixed
- **Waveform Zoom Now Follows the Playhead**: Zooming (mouse wheel, keyboard shortcuts, toolbar buttons, zoom menu) now always keeps the playhead in place on screen — if it is currently visible it stays exactly where it is, and if it is outside the visible area it is brought to the center first, matching the behavior of common reference video/audio editors. Previously, mouse-wheel zoom could push the playhead out of view.
- **Smoother Zooming and Scrolling**: The waveform now visually follows zoom and scroll changes immediately by scaling and repositioning the already-rendered image, instead of waiting for freshly recalculated data before showing anything; the precise redraw follows moments later. Previously rendered waveform views (same file, view, size and zoom) are also kept in a short-term image cache and reused instantly when revisited instead of being redrawn from scratch every time.
- **Faster File Loading After Restart**: The one-time waveform analysis of an audio file is now saved to a compact proxy file in the program's data folder. On later sessions the same file loads its waveform instantly instead of being re-analyzed. While a file is analyzed for the first time, its clip shows a subtle progress bar. Proxies belonging to a saved project are kept permanently; proxies no longer linked to any project are cleaned up automatically after 7 days, and the overall proxy storage is capped in size.
- **Waveform Display**: Added an optional, detailed logging mode that traces each waveform data request end to end and summarizes zoom/scroll gestures, to make waveform responsiveness measurable.
- **Waveform Display**: The one-time full-file analysis that builds the waveform overview now automatically retries once if the initial pass fails due to a transient decoding interruption.

## [0.13.9] - 2026-07-11

### Deutsch

#### ⚡ Verbessert
- **Waveform-Analyse-Pipeline**: Waveform-Daten werden jetzt aus einer mehrstufigen Peak-Pyramide beantwortet, die einmalig pro Datei berechnet wird. Zoomen und Scrollen lösen keine wiederholte Audio-Dekodierung mehr aus und reagieren ohne spürbare Verzögerung.
- **Stabile Waveform-Skalierung**: Die dargestellte Amplitude wird jetzt auf den Gesamt-Peak der Datei normalisiert statt auf das sichtbare Fenster. Die Wellenhöhe bleibt beim Scrollen und Zoomen konstant.
- **Zeitlich verankertes Zeichnen**: Waveform-Daten werden anhand ihrer Quellzeit positioniert. Beim Zoomen bleibt die bisherige Ansicht korrekt ausgerichtet, bis verfeinerte Daten eintreffen; das bisherige Springen entfällt.
- **Typisierte Datenübertragung**: Waveform-Fenster werden als typisierte Arrays zwischen den Prozessen übertragen, was den Serialisierungsaufwand großer Ansichten senkt.

#### 🐛 Behoben
- **Allgemein**: Quadratisch anwachsende Puffer-Zusammenführung beim PCM-Dekodieren behoben, die Anfragen für längere Fenster verlangsamt hat.

### English

#### ⚡ Changed
- **Waveform Analysis Pipeline**: Waveform data is now served from a multi-resolution peak pyramid that is computed once per file. Zooming and scrolling no longer trigger repeated audio decoding and respond without noticeable delay.
- **Stable Waveform Scaling**: The displayed waveform amplitude is now normalized to the file's overall peak instead of the visible window, keeping the waveform height consistent while scrolling and zooming.
- **Time-Aligned Rendering**: Waveform data is drawn based on its source time position. During zoom operations the previous view stays correctly aligned until refined data arrives, removing visual jumping.
- **Typed Data Transfer**: Waveform windows are transferred as typed arrays between processes, reducing serialization overhead for large views.

#### 🐛 Fixed
- **Waveform Display**: Fixed a quadratic buffer accumulation during PCM decoding that slowed down waveform requests for longer windows.

## [0.13.8] - 2026-06-20

### Deutsch

#### ✨ Neu
- **Eigenständiger Symbol-Manager**: Neues `SymbolManagerModal`-Component zur komfortablen Verwaltung der Symbol-Reihenfolge und -Sichtbarkeit in der Werkzeugleiste, inklusive visueller Gruppierung, Massenaktionen und Drag-and-Drop-Unterstützung.
- **Routing für Popout-Fenster**: Standalone-Fenster-Route für `symbol-manager` hinzugefügt, sodass der Symbol-Manager als unabhängiges Electron-Fenster ausgekoppelt werden kann.

#### ⚡ Verbessert
- **Vereinfachte Toolbar-Anpassung**: Das überladene integrierte Dropdown-Menü "Toolbar-Manager" in der Werkzeugleiste wurde durch eine einfache Schaltfläche ersetzt, die das neue Symbol-Manager-Modal (entweder als Overlay oder separates Fenster) öffnet.
- **Echtzeit-Synchronisierung**: Koppelung des Symbol-Managers mit der Timeline über `localStorage` und Custom-Events, um alle geöffneten Fenster bei Änderungen verzögerungsfrei zu aktualisieren.

#### #Diagnostik
- **Timeline-Diagnoseprotokollierung**: Gedrosselte Diagnoseprotokolle fuer Mausrad-Eingaben, Tastatureingaben, Scroll-Aktualisierungen, Zoom-Commits, Playhead-Zustand und Performance-Samples inklusive CPU-, RAM- und GPU-Prozesswerten hinzugefuegt.
- **Konfigurierbare UI-Diagnose**: Neuer Logs-Tab in den Einstellungen mit Kategorien fuer Timeline-Eingaben, Performance-Samples, Menues, Einstellungen, Dialoge, Popouts und Toolbar-Ereignisse.

### English

#### ✨ Added
- **Dedicated Symbol Manager**: Created a standalone `SymbolManagerModal` component for managing toolbar symbols' order and visibility, featuring visual category grouping, mass actions, and drag-and-drop support.
- **Popout Window Routing**: Added a standalone `symbol-manager` window route to support launching the Symbol Manager as an independent Electron popout window.
- **Timeline Diagnostics Logging**: Added throttled diagnostic logging for timeline wheel input, keyboard input, scroll updates, zoom commits, playhead state, and performance samples including CPU, RAM, and GPU-process metrics.
- **Configurable UI Diagnostics**: Added a dedicated Logs settings tab with category toggles for timeline input, performance samples, menus, settings, dialogs, popouts, and toolbar events.

#### ⚡ Changed
- **Simplified Toolbar Customization**: Replaced the crowded inline dropdown "Toolbar-Manager" in the timeline toolbar with a single, clean button that triggers the new Symbol Manager dialog (inline modal or separate popout).
- **Real-Time State Synchronization**: Connected the Symbol Manager and Timeline toolbar using `localStorage` triggers and custom window events, enabling instantaneous UI updates across all open windows.

## [0.13.6] - 2026-06-20

### Deutsch

#### ✨ Neu
- **Dauerhaftes Ausblenden von Update-Hinweisen**: Neue Option zur dauerhaften Unterdrückung des Update-Hinweises (`showUpdateUpgradeNotice`) über eine Checkbox im Bestätigungsdialog.
- **Reaktivierung ausgeblendeter Hinweise**: Verknüpfung der Einstellung mit dem Button "Hinweisdialoge reaktivieren" im System-Einstellungsmenü, um alle stummgeschalteten Hinweise wiederherzustellen.

#### ⚡ Verbessert
- **Optimiertes Update-Dialog-Layout**: Vergrößerung der Standardgröße des Update-Fensters auf `980x760` zur besseren Platzausnutzung sowie Neugestaltung des Layouts mit kompakterem Header und flexibleren, scrollbaren Patch-Notes-Bereichen.
- **Dynamische Skalierung des Popout-Fensters**: Das Update-Popout-Fenster passt seine Höhe jetzt automatisch (zwischen 700px und 940px) an die tatsächliche Inhaltsgröße an.
- **Überarbeitetes Update-Warnbanner**: Umgestaltung des statischen gelben Hinweistextes in ein gut sichtbares rotes Warnbanner mit Schließen-Schaltfläche und Bestätigungs-Overlay.

### English

#### ✨ Added
- **Persistent Update Notice Suppressing**: Added a user setting (`showUpdateUpgradeNotice`) to permanently suppress the update dialog's upgrade warning notice via a new checkbox in the hide confirmation dialog.
- **Warning Dialog Reactivation**: Integrated the update notice status with the "Reactivate warning dialogs" button in the System Settings tab, allowing the notice to be restored.

#### ⚡ Changed
- **Optimized Update Dialog Layout**: Expanded the default size of the update window to `980x760` to maximize space, and redesigned the internal layout with a more compact header and flexible, scrollable patch notes sections.
- **Dynamic Popout Resizing**: Improved the update dialog popout window to dynamically scale its height (between 700px and 940px) based on the actual height of the parsed release entries.
- **Redesigned Update Warning Alert**: Converted the static yellow warning block in the update dialog into a high-visibility red alert banner with a close button and confirmation flow.

## [0.13.5] - 2026-06-15

### Deutsch

#### ✨ Neu
- **Anpassbare Timeline-Toolbar**: Einführung einer dauerhaften Timeline-Toolbar mit modular editierbaren Steuerungsgruppen für Transport, Aufnahme, Undo/Redo, Snap-Verhalten, Spur-Gruppierung, Zeit-/Auswahlanzeige, Auto-Scroll und Exportaktionen.
- **Interaktiver Bearbeitungsmodus für Toolbars**: Neuer sperrbarer Editiermodus zur Anpassung der Sichtbarkeit, zum Einfügen eigener Trennzeichen, zur Verwaltung von Schnellaktionen auf Gruppenebene sowie zur Zuweisung farblicher Kategorie-Marker.
- **Zeit- und Wiedergabesteuerung**: Gut lesbare Anzeigen in der Toolbar für die aktuelle Abspielposition, die aktive Auswahldauer und den Wiedergabe-Auto-Scroll-Modus.
- **Fenster-Layout-Presets**: Implementierung einer Layout-Verwaltung zum Speichern, Laden, Aktualisieren und Zurücksetzen von Arbeitsbereich-Konfigurationen, einschließlich ausgelagerter Panel-Grenzen und Hauptfenster-Positionen.
- **Speicherung von Popout-Fenstergrenzen**: Asynchrones Sichern und Wiederherstellen der Positionen und Dimensionen ausgelagerter Panels (wie File Explorer, Effects und Timeline) über dedizierte IPC-Kanäle.

#### ⚡ Verbessert
- **Präzisions-Wellenform-Zoom**: Verfeinerung der adaptiven Zoomschritte und der Sample-Detaildarstellung für flüssigere Navigation bei maximalen Zoomtiefen.
- **Wiedergabe-Seek-Verhalten**: Das manuelle Versetzen des Playheads während des Abspielens definiert nun direkt die aktive Wiedergabe-Startposition neu, anstatt nach dem Pausieren an die vorherige Position zurückzuspringen.
- **Drag- und Snap-Feedback**: Grafische Einfügemarkierungen und Snap-Zielbereiche beim Verschieben von Toolbar-Elementen und Andocken von Panels wurden visuell verbessert.

#### 🐛 Behoben
- **Leere Wellenform bei extremem Zoom**: Behebung eines Fehlers, bei dem die Wellenform-Zeichenfläche bei aggressivem horizontalen Zoom weiß oder leer blieb, durch Stabilisierung des Renderer-Pfads.
- **Schutz vor Renderer-Update-Schleifen**: Integration von Sicherheitsmechanismen gegen rekursive `Maximum update depth exceeded`-Fehler im Haupt-Renderer.
- **Stabilität von Toolbar-Popups**: Fehler behoben, bei dem sich Kontextmenüs vorzeitig schlossen, und Verbesserung des Clamping-Verhaltens an den Bildschirmrändern.
- **Wiederherstellung bei Mehrmonitor-Setups**: Fehler behoben, bei dem ausgelagerte Panel-Positionen auf sekundären Bildschirmen nicht zuverlässig wiederhergestellt wurden.
- **Warnungen bei vertikalen Slidern**: Bereinigung veralteter CSS-Eigenschaften bei vertikalen Schiebereglern, die vermeidbare Konsolenwarnungen auslösten.

### English

#### ✨ Added
- **Customizable Timeline Toolbar**: Introduced a persistent timeline toolbar with modular, editable control groups for transport, recording, undo/redo operations, snap behavior, track grouping, time/selection display, auto-scroll, and export actions.
- **Interactive Toolbar Edit Mode**: Added a lockable edit mode allowing users to customize visibility, insert custom separators, manage group-level quick actions, and define color-coded category markers.
- **Time and Playback Monitoring**: Added high-legibility toolbar indicators for current playhead time, active selection duration, and playback auto-scroll status.
- **Window Layout Presets**: Implemented a layout management system allowing users to save, load, update, and reset workspace configurations, including detached panel bounds and docking positions.
- **Popout Bounds Persistence**: Added asynchronous saving and restoration of bounds for detached panels (such as File Explorer, Effects, and Timeline) using dedicated IPC channels.

#### ⚡ Changed
- **Waveform Precision & Deep Zoom**: Enhanced adaptive zoom stepping and refined sample-detail rendering for smoother, high-speed waveform navigation at maximum zoom depths.
- **Playhead Seek Behavior**: Adjusted seek behavior during playback to redefine the active playback start position, preventing the playhead from snapping back to its original location upon pause.
- **UI Snap & Dock Feedback**: Refined the visual guides, insert markers, and snap target overlays when dragging to rearrange toolbar items or dock panels.

#### 🐛 Fixed
- **Deep Zoom Blank Canvas**: Fixed a rendering issue that caused the waveform canvas to display as empty or white during aggressive horizontal zooming by stabilizing the renderer path.
- **Renderer Update Loop Safeguards**: Added prevention logic against recursive `Maximum update depth exceeded` exceptions within the main layout and timeline flows.
- **Toolbar Dropdown Stability**: Fixed a bug causing context menus and popups to close prematurely, and improved viewport boundary clamping.
- **Layout Restore on Multi-Monitor Setups**: Fixed a bug where detached panel window bounds failed to restore correctly on multiple displays.
- **Vertical Slider Warning Cleanup**: Removed legacy styling properties from vertical sliders that generated avoidable console warnings.

## [0.13.4] - 2026-06-14

### Deutsch

#### ✨ Neu
- **Popout-Bounds-IPC-Kanäle**: `get-popout-bounds` und `set-popout-bounds` IPC-Kanäle implementiert, um das Speichern und Wiederherstellen von Popout-Fenster-Bounds für Panels zu ermöglichen.
- **Stereo-Balance-Regler**: Dedizierter Stereo-Balance-Schieberegler (Pan) im Spur-Header für Spuren mit echten Stereo-Inhalten.
- **Statusübertragung bei Spurteilung**: Automatische Übertragung des Stummschaltungs- und Lautstärkestatus beim Kettensprengen oder Aufteilen von Stereo-Clips auf die physischen Mono-Spuren.
- **Doppelklick-Slider-Resets**: Doppelklick-Events zum Zurücksetzen hinzugefügt. Setzt das Master-Volume auf `1.0` und die Stereo-Balance (Pan) auf `0.0` zurück.

#### ⚡ Verbessert
- **Erkennung virtueller Stereo-Spuren**: Die `isStereoTrack`-Prüfung wurde verfeinert, um manuell auf Mono Links/Rechts umgestellte Spuren als normale Mono-Spuren darzustellen und nicht fälschlich virtuell aufzuteilen.

#### 🐛 Behoben
- **Wellenform-Zoom-Reaktionszeit**: Redundante Wellenform-Fensterberechnungen beim schnellen Zoomen wurden durch entprellte Renderer-Anfragen, Wiederverwendung lokaler Wellenformfenster und Zusammenfuehrung paralleler Main-Prozess-Berechnungen reduziert.
- **Tiefe Wellenform-Zoomstufen**: Der horizontale Timeline-Zoom wurde deutlich erweitert und nutzt adaptive Zoomschritte, damit sample-nahe Wellenformdetails mit weniger Mausradbewegungen erreichbar sind.
- **Echtzeit-Rescheduling**: Die Audio-Engine führt nun bei der Änderung des Stereo-Modus, beim Aufteilen oder Kettensprengen ein sofortiges Echtzeit-Rescheduling durch, sodass Tonänderungen ohne Wiedergabeunterbrechung sofort hörbar sind.
- **Wellenform-Größenüberlauf**: Behebung von Canvas-Überlauf und weißer Wellenformdarstellung bei starkem Zoom durch korrekte Weiterleitung der Kachel-Rendering-Koordinaten (scrollLeft, viewportWidth und displayDuration) an den WaveformRenderer.

### English

#### ✨ Added
- **Popout Bounds IPC Channels**: Implemented `get-popout-bounds` and `set-popout-bounds` IPC channels to support saving and restoring panel popout window bounds.
- **Stereo Balance Slider**: Added a dedicated Stereo Balance (Pan) slider in the track header for tracks containing active stereo content.
- **Split Track State Transfers**: Enabled automatic transfer of volume and mute states to physical split mono tracks when unlinking or splitting stereo clips/tracks.
- **Double-Click Slider Resets**: Added double-click reset handlers to the Master Volume slider (restores to 1.0) and Stereo Balance slider (restores to 0.0).

#### ⚡ Changed
- **Virtual Stereo Track Recognition**: Refined the `isStereoTrack` check to skip tracks with manual left-only/right-only overrides, rendering them as clean single mono tracks.

#### 🐛 Fixed
- **Real-Time Audio Rescheduling**: Integrated real-time audio rescheduling during playback when changing stereo modes, unlinking, or splitting tracks, ensuring immediate audio updates on the left/right channels.
- **Waveform Canvas Size Overflow**: Fixed a critical canvas size overflow and white screen rendering issue at deep zoom levels by passing proper tiled rendering coordinates (scrollLeft, viewportWidth, and displayDuration) to WaveformRenderer.
- **Waveform Zoom Responsiveness**: Reduced redundant waveform window calculations during rapid zooming by debouncing renderer requests, reusing renderer-side waveform windows, and deduplicating concurrent main-process calculations.
- **Deep Waveform Zoom**: Increased the horizontal timeline zoom range and switched zoom controls to adaptive steps so sample-level waveform detail is reachable with fewer wheel ticks.

## [0.13.3] - 2026-06-14

### Deutsch

#### ⚡ Verbessert
- **Hochpräzise Wellenformdarstellung**: Die Timeline-Wellenformdarstellung wurde auf signierte Audiofenster mit Min/Max-, RMS-, Stereo-Kanal- und Sample-Detaildaten umgestellt, damit Transienten und feine Signalspitzen bei hohem Zoom klarer erkennbar sind.
- **Sichtfensterbasiertes Wellenform-Rendering**: Clips zeichnen nur noch den sichtbaren Wellenformbereich mit gepuffertem Canvas-Fenster, um übergroße Renderflächen bei starkem Zoom zu vermeiden.
- **Schnelleres Wellenform-Zoomen**: Wiederverwendbares Übersichts-Caching und erweiterte hohe Zoomstufen wurden ergänzt, damit Wellenformdetails beim Zoomen flüssiger nachgeladen werden.

### English

#### ⚡ Changed
- **High-Precision Waveform Rendering**: Reworked timeline waveform rendering to use signed audio windows with Min/Max, RMS, stereo-channel and sample-detail data for clearer transients and more precise editing at high zoom levels.
- **Viewport-Based Waveform Drawing**: Timeline clips now render only the visible waveform area with a buffered canvas window to prevent oversized render surfaces during deep zoom.
- **Faster Waveform Zooming**: Added reusable overview caching and extended high zoom levels so waveform detail can be refined smoothly while zooming.

## [0.13.2] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Ungespeicherte Änderungen Warnung**: Ein Bestätigungs-Overlay beim Schließen des Einstellungsfensters mit ungespeicherten Änderungen wurde hinzugefügt. Bietet Optionen zum Speichern, Verwerfen oder Abbrechen sowie eine "Meldung nicht mehr anzeigen"-Option, die unter "System" konfiguriert werden kann.

#### 🐛 Behoben
- **Playhead Zoom-Jitter**: Das kurzzeitige Springen/Zittern des Playheads und der Spuren beim Zoomen wurde durch synchrone Scroll- und Koordinatenanpassungen im `useLayoutEffect` behoben. Verwendet die Echtzeit-Audiolaufzeit für präzise Zentrierung während der Wiedergabe.

### English

#### ✨ Added
- **Unsaved Changes Confirmation**: Introduced a confirmation overlay warning in the Settings modal when attempting to close/cancel with unsaved changes. Features a "Don't show again" option and configurable preference under the "System" settings tab to save or discard by default.

#### 🐛 Fixed
- **Playhead Zoom Jitter**: Resolved playhead and background track frame jitter during horizontal zooming by executing scroll adjustments and playhead coordinates synchronously inside `useLayoutEffect`. Uses real-time audio playback time for centering.

## [0.13.1] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Zoom-Fokus auf Playhead**: Das horizontale Zoomen per Tastenkombination oder Mausrad behält nun den optischen Fokus auf dem Playhead und zentriert diesen automatisch, wenn er sich außerhalb des Sichtfelds befindet.
- **Verbesserte Shortcuts-Erfassung**: Die Shortcuts-Zuweisung zeigt Tastenkombinationen in Echtzeit beim Drücken an und speichert die Kombination von bis zu drei Tasten erst beim Loslassen.

#### ⚡ Verbessert
- **Audiodatei-Symbole im Explorer**: Die reinen Notenschlüssel-Icons wurden durch ein eigenes Dokumenten-Blattsymbol mit farbigen Notenschlüsseln ohne Formattext ersetzt.
- **Statische Warn- und Hinweissymbole**: Sämtliche pulsierenden Animationen an Status- und Warnanzeigen wurden entfernt, um störendes Flackern zu vermeiden.
- **Farbgebung für Warnungen**: Unkritische Warnzeichen wurden auf Gelb/Bernstein umgestellt, während Rot strikt für kritische Fehler reserviert bleibt.

### English

#### ✨ Added
- **Focus Zoom on Playhead**: Horizontal zooming via shortcuts or mouse wheel now maintains visual focus on the playhead, centering it automatically if off-screen.
- **Enhanced Keyboard Shortcut Capturing**: Shortcut learning now displays key combinations in real-time on keydown and saves the combination of up to three keys upon key release.

#### ⚡ Changed
- **Audio File Icons in Explorer**: Replaced plain clef icons with a custom document sheet icon containing a colored treble clef and no format text.
- **Static Alert and Warning Symbols**: Removed pulse animations from all status, alert, and recording indicators to prevent distracting flickering.
- **Warning Colors**: Changed non-critical warning icon colors to yellow/amber, reserving red strictly for critical failures.

## [0.13.0] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Import-Überlappungseinstellungen**: Einführung einer neuen Systemeinstellung zur Steuerung von Überlappungskonflikten beim Importieren an der Playhead-Position. Zur Auswahl stehen Überlagern, auf einer freien Spur darunter ablegen, nacheinander anfügen oder bei jedem Konflikt nachfragen.
- **Import-Konfliktdialog**: Ein interaktiver Konfliktdialog wurde integriert, der bei drohenden Überlappungen erscheint, um die gewünschte Platzierungsoption direkt auszuwählen und optional dauerhaft zu speichern.
- **Support-Konversations-Erweiterungen**: Unterstützung für das Anhängen von Bildern und Protokollen im Message Center hinzugefügt und den Anzeigenamen des Support-Teams auf „Omega Project Support“ aktualisiert.

#### 🐛 Behoben
- **Datei-Browser-Kontextmenü**: Es wurde ein Fehler behoben, bei dem das Öffnen des aktuellen Ordners im System-Dateiexplorer über das Hintergrund-Kontextmenü stattdessen den übergeordneten Ordner öffnete.
- **Timeline-Rendering-Schleife**: Ein wiederkehrender Absturz auf dem Timeline-Editor (React-Fehler #185, „Maximum update depth exceeded“) wurde durch Stabilisierung des `isInternalUpdateRef`-Schutz-Flags für die Spuren-Synchronisierung behoben.

### English

#### ✨ Added
- **Audio Import Overlap Settings**: Introduced a new system setting to manage overlap conflicts when importing files at the playhead position. Users can choose to overlap, place on a free track underneath, append sequentially, or be prompted on each conflict.
- **Import Conflict Modal**: Created an interactive collision modal dialog when importing files with overlapping boundaries, allowing immediate selection of placement method and setting persistence.
- **Support Conversation Enhancements**: Enhanced the Message Center support conversations by allowing users to attach images and logs, and updated the support team's display name to "Omega Project Support".

#### 🐛 Fixed
- **File Explorer Context Menu**: Fixed an issue where opening the current folder in the system file explorer via the background context menu would open the parent folder instead.
- **Timeline Rendering Loop**: Resolved a recurring crash on the timeline editor (re-render freeze by stabilizing the `isInternalUpdateRef` track state synchronization guard.

## [0.12.8] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **VST-Scan-Ergebnisüberlauf**: Dem MessageModal wurden maximale Höhengrenzen und vertikale Bildlaufleisten hinzugefügt. Dies verhindert ein Überlaufen des Layouts bei einer großen Anzahl gescannter Plugins und löst das Problem, dass die Benutzeroberfläche nicht mehr bedient werden kann.

### English

#### 🐛 Fixed
- **VST Scan Result Overflow**: Added maximum height limits and vertical scrollbars to MessageModal to prevent layout overflow when displaying a large number of scanned plugins, resolving interface locking issues.

## [0.12.7] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **Update-Hinweis-Duplizierung**: Das Problem wurde behoben, bei dem die Update-Warnhinweise mehrfach in der Versionsliste des Update-Modals angezeigt wurden und die Versionsblöcke fehlerhaft trennten.
- **Taskleisten- & Desktop-Shortcuts**: Der NSIS-Installer verwaltet Verknüpfungen nun manuell und überspringt die Neuerstellung, falls diese bereits existieren. Dies verhindert das Zurücksetzen der Desktop-Icon-Positionen und das Verschwinden von an der Taskleiste angehefteten Symbolen bei Updates unter Windows.

### English

#### 🐛 Fixed
- **Update Dialog Warning Duplication**: Resolved standard update warning notices appearing multiple times in the update details panel and breaking the version block structure.
- **Taskbar & Desktop Shortcut Positions**: Configured NSIS installer to manually manage shortcuts, skipping recreation if they already exist, preserving desktop icon grid coordinates and pinned taskbar links on Windows during application updates.

## [0.12.6] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **DNS-Fallback-Auflösung**: Implementierung eines eigenen lokalen DNS-Overrides (inklusive Unterstützung von options.all), um das Caching lokaler Router zu umgehen und Serververbindungen direkt zum Live-Server zu leiten.

### English

#### 🐛 Fixed
- **DNS Fallback Resolution**: Implemented custom DNS override to bypass local router caching (supporting options.all array resolution) and route server connections directly to the live server.

## [0.12.4] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **Timeline-Rendering-Schleife**: Eine Endlos-Rendering-Schleife in React (React-Fehler #185) behoben, die unter bestimmten Wiedergabezuständen und Wellenform-Anzeigeeinstellungen auftreten konnte.
- **Serververbindungen**: Die interne serverseitige Verarbeitung für Analyse- und Verbindungsstabilität optimiert.

### English

#### 🐛 Fixed
- **Timeline Rendering Loop**: Resolved an infinite React rendering loop (re-render freeze that could occur under specific playback states and waveform view configurations.
- **Server Connection**: Optimized internal server-side processing for analytics and dashboard connection routing.

## [0.12.3] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **Feedback-Styling & -Validierung**: Die pulsierende Fehler-Animation im Feedback-Panel wurde entfernt und die Lesbarkeit der Fehlermeldung verbessert. Zudem wurde der Parametername für den Feedback-Text im Backend-Payload angepasst, sodass Fehlerberichte nun korrekt validiert und an den Server gesendet werden.

### English

#### 🐛 Fixed
- **Feedback Styling & Validation**: Removed pulse animation and improved error alert visibility in the feedback panel. Mapped feedback message text to the correct description parameter, resolving API validation failure that was preventing tickets from sending.

## [0.12.2] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Spur-Lautstärke-Automationskurven**: Vollständig interaktive SVG-basierte Lautstärke-Automationskurven auf der Timeline (Alt+K) implementiert. Benutzer können per Doppelklick Punkte hinzufügen, Punkte ziehen, um Wert (0,0 bis 1,5) und Zeit anzupassen, und per Rechtsklick Punkte löschen. Die Lautstärke wird in Echtzeit während der Wiedergabe und beim Navigieren angepasst.
- **Hinweisdialog-Checkbox beim Löschen**: Eine Checkbox „Nicht erneut fragen“ im Löschbestätigungsdialog hinzugefügt. Wenn aktiviert, werden zukünftige Dateien direkt gelöscht. Diese Warnung kann unter Einstellungen -> System wieder reaktiviert werden.

#### 🐛 Behoben
- **Dateilöschung & Dateisperrung**: Fehler behoben, bei dem das Löschen im Datei-Browser aufgrund verworfener Event-Callbacks nicht ausgeführt wurde. Zudem werden geöffnete Audio-Previews vor dem Löschen gestoppt, um Dateisperren unter Windows aufzuheben.
- **Menüeinträge bereinigt**: Die Menüs „Datei“ und „Hilfe“ wurden bereinigt, indem die nachfolgenden Punkte („...“) bei allen Einträgen entfernt wurden.

### English

#### ✨ Added
- **Track Volume Automation Curves**: Implemented fully interactive SVG-based volume automation curves on the timeline (Alt+K). Users can double-click to add nodes, drag nodes to adjust value (0.0 to 1.5) and time, and right-click to delete nodes. Playback volume updates in real-time.
- **Delete Confirmation Checkbox**: Added a "Don't ask again" checkbox to the file delete confirmation dialog. If checked, future files are deleted immediately. This can be re-enabled under Settings -> System.

#### 🐛 Fixed
- **File Deletion & Locking**: Fixed file explorer deletion failing to execute due to event callback forwarding. Also resolved Windows file handle locking by stopping the audio preview player before deletion.
- **Clean Menu Items**: Cleaned up the file and help menus by removing trailing ellipses ("...") from all labels.

## [0.12.1] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **Vorschau-Wiedergabe Fortsetzen**: Ein Problem in der Dateiliste des Datei-Browsers behoben, bei dem das Klicken auf das Play-Symbol (im Hover-Overlay) einer pausierten Audio-Vorschau die Wiedergabe von vorne startete, anstatt sie an der pausierten Stelle fortzusetzen.

### English

#### 🐛 Fixed
- **Preview Playback Resume**: Fixed an issue in the File Explorer file list where clicking the hover-overlay Play button on a paused audio preview would restart the audio from the beginning instead of resuming it from the paused position.

## [0.12.0] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Datei-Browser-Kontextmenü**: Ein Rechtsklick-Kontextmenü für Dateien und Ordner im Datei-Browser-Panel hinzugefügt. Enthält Funktionen zum direkten Importieren von Audiodateien auf die Zeitleiste an der aktuellen Abspielposition, zum Anzeigen von Dateien/Ordnern im System-Dateiexplorer sowie Standard-Dateioperationen: Kopieren, Ausschneiden, Einfügen und Löschen (Verschieben in den Papierkorb).
- **Kontextmenü für Hintergrundbereich**: Ein Rechtsklick auf den leeren Hintergrund der Dateiliste ermöglicht das Einfügen von kopierten/ausgeschnittenen Elementen oder das Öffnen des aktuellen Ordners im System-Dateiexplorer.
- **Handbuch-Aktualisierung**: Die neuen Kontextmenü-Optionen wurden im Benutzerhandbuch dokumentiert.

### English

#### ✨ Added
- **File Explorer Context Menu**: Added a right-click context menu to files and folders in the file explorer panel. Features include importing audio files directly to the timeline at the playhead position, showing files/folders in the system file explorer, and standard file operations: copy, cut, paste, and delete (moving files to the system recycle bin).
- **Background Menu Actions**: Right-clicking the empty space/background of the file list allows pasting copied/cut items or opening the current folder in the system file explorer.
- **Manual Updates**: Documented the new context menu options in the user manual.

## [0.11.8] - 2026-06-13

### Deutsch

#### ⚡ Verbessert
- **CI-macOS-Runner**: Den macOS-Build-Runner zurück auf `macos-latest` (Apple Silicon arm64) umgestellt, um die extrem langen Wartezeiten der Intel-basierten `macos-13`-Runner zu umgehen. Dies stellt die Unterstützung für ältere Intel-Macs ein, gewährleistet aber eine sofortige Zuweisung von Build-Instanzen und eine wesentlich schnellere Pipeline.

### English

#### ⚡ Changed
- **CI macOS Runner**: Switched the macOS build runner back to `macos-latest` (Apple Silicon arm64) to bypass the extremely long queue times of Intel `macos-13` runners. This drops support for older Intel-based Macs but ensures instant runner provisioning and significantly faster build pipelines.

## [0.11.7] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **NSIS-Installer-Warnung**: Die Compiler-Warnung 6001 behoben, indem `$deleteEverything` im `customInit`-Makro des Installers referenziert wird. Dies stellt sicher, dass Variablen, die mit dem Uninstaller geteilt werden, auf Windows sauber kompilieren, ohne die CI-Pipeline abzubrechen.

### English

#### 🐛 Fixed
- **NSIS Installer Warning**: Fixed the compiler warning 6001 by referencing `$deleteEverything` in the installer's `customInit` macro, ensuring that variables shared with the uninstaller compile cleanly on Windows without failing warning-strict CI builds.

## [0.11.6] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **NSIS-Installer-Kompilierung**: Windows-Installationsroutine behoben, die den Bau des Windows-Installers in der CI-Pipeline verhinderte. Das Makro `customUnInstall` referenziert die Variable `$deleteEverything` nun korrekt und löscht Verknüpfungen nur, wenn der Benutzer bei der Deinstallation explizit eine vollständige Datenbereinigung wählt.

### English

#### 🐛 Fixed
- **NSIS Installer Compilation**: Resolved NSIS `warning 6001` (unreferenced variable treated as error) that prevented the Windows installer from being built on CI. The `customUnInstall` macro now correctly references the `$deleteEverything` variable to conditionally delete shortcuts only when the user explicitly requests a full data cleanup.

## [0.11.5] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **NSIS-Build-Konfiguration**: Den veralteten und nicht unterstützten Parameter `isKeepShortcuts` aus dem Schema der Installer-Konfiguration entfernt, um Validierungs- und Kompilierungsfehler von electron-builder zu beheben.
- **Erhalt von Verknüpfungen**: Eine robuste Backup- und Wiederherstellungsroutine im benutzerdefinierten NSIS-Installer-Skript implementiert, damit Desktop- und Startmenü-Verknüpfungen bei Anwendungs-Updates erhalten bleiben, aber bei einer vollständigen manuellen Deinstallation ordnungsgemäß gelöscht werden.

### English

#### 🐛 Fixed
- **NSIS Build Configuration**: Removed the deprecated and unsupported `isKeepShortcuts` parameter from the installer configuration schema, resolving the electron-builder validation and compilation errors.
- **Shortcut Preservation**: Implemented a robust backup-and-restore routine in the custom NSIS installer script to ensure desktop and Start Menu shortcuts are preserved during application updates while still being properly cleaned up on full manual uninstallation.

## [0.11.4] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **CI-macOS-Runner**: Den macOS-Build-Runner explizit auf `macos-13` (Intel x64) gepinnt. Dies behebt Fehler beim Code-Signing, bei der DMG-Paketierung (macOS-Paketerstellung) und bei der nativen C++-Kompilierung, die durch die kürzliche Umstellung des Standard-Labels `macos-latest` auf Apple Silicon (M1/M2) aufgetreten sind.

### English

#### 🐛 Fixed
- **CI macOS Runner**: Pinned the macOS build runner to `macos-13` (Intel x64) to resolve code signing, macOS package creation (macOS package creation), and native C++ compilation errors caused by the recent transition of `macos-latest` to Apple Silicon (M1/M2).

## [0.11.3] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **CI-Build-Umgebung**: AppImage-Paketierungsfehler behoben, indem die Installation der FUSE-2-Bibliothek dynamisch auf `Linux-Systembibliotheken` für moderne Ubuntu-24.04+-Runner abgebildet wird, mit einem Fallback auf das klassische `Linux-Systembibliotheken`.

### English

#### 🐛 Fixed
- **CI Build Environment**: Resolved AppImage packaging failures by mapping FUSE 2 library installation dynamically to `Linux system libraries` for modern Ubuntu 24.04+ runners, with a fallback to legacy `Linux system libraries`.

## [0.11.2] - 2026-06-13

### Deutsch

#### 🐛 Behoben
- **CI-Build-Umgebung**: Installation von `Linux-Systembibliotheken` im Linux-Release-Job hinzugefügt, um Kompilierungsfehler bei der AppImage-Erstellung auf neueren GitHub Actions Runnern zu verhindern.

### English

#### 🐛 Fixed
- **CI Build Environment**: Added `Linux system libraries` installation dependency to the Linux release job to prevent AppImage compilation failures on newer GitHub Actions runners.

## [0.11.1] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Alles auswählen Menü-Option**: „Alles auswählen“ (Strg + A) zum Bearbeiten-Menü und den Tastenkombinationen in der Gruppe „Bearbeiten“ hinzugefügt.

#### ⚡ Verbessert
- **Update-Hinweis Lokalisierung**: Der Update-Hinweis (Upgrade Notice) wird nun zweisprachig gefiltert, sodass der englische Text auf der deutschen Seite ausgeblendet wird.
- **Hinweis-Hervorhebung**: Wichtige Update-Hinweise und Warnungen werden nun rot formatiert, um mehr Aufmerksamkeit zu erregen.
- **Desktop- & Taskleisten-Shortcuts bei Updates behalten**: Der NSIS-Installer behält Verknüpfungen auf dem Desktop und in der Taskleiste bei Updates und Deinstallationen nun standardmäßig bei. Sie werden nur gelöscht, wenn der Benutzer explizit eine restlose Deinstallation wählt.

#### 🐛 Behoben
- **Bearbeiten-Menüaktionen**: Die Aktionen des Bearbeiten-Menüs (Ausschneiden, Kopieren, Einfügen, Löschen, Alles auswählen) sind nun voll funktionsfähig und ausführbar.

### English

#### ✨ Added
- **Select All Menu Option**: Added "Select All" (Ctrl+A) to the Edit menu and keyboard shortcut settings under the Edit category.

#### ⚡ Changed
- **Upgrade Notice Localization**: Split the Upgrade Notice into separate English and German sections, hiding English text on the German page.
- **Notice Highlighting**: Important upgrade and warning notices are now rendered in red for enhanced visibility.
- **Taskbar & Desktop Shortcut Persistence**: Modified NSIS installer to preserve desktop and pinned taskbar shortcuts during application updates, only deleting them if the user explicitly requests a clean uninstallation.

#### 🐛 Fixed
- **Edit Menu Actions**: Fixed Edit menu items (Cut, Copy, Paste, Delete, Select All) to be fully functional and clickable.

## [0.11.0] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Automatisches Zoom-to-Fit bei Erstimport**: Skaliert den horizontalen Timeline-Zoom automatisch so, dass die Gesamtdauer des ersten importierten Audio-Clips (mit 5 % Puffer) sichtbar ist. Wird beim Laden bestehender Projekte ignoriert.
- **Scroll- & Zoom-Modifikatoren**: Neue konfigurierbare Kürzel `scrollVertical` (Standard: `Shift`) und `zoomVertical` (Standard: `Ctrl+Shift`). Normales Mausrad scrollt nur noch horizontal. Scrollen mit Modifikatoren scrollt vertikal bzw. zoomed die Spurhöhen (40px bis 300px).
- **Alles Markieren Shortcut**: Neues konfigurierbares Kürzel `selectAllRegions` (Standard: `Shift+A`), um alle Audio-Clips auf allen Spuren zu selektieren.
- **Einheitliche Scrollbar-Pfeile**: Anpassung von webkit-scrollbar-button mit präzise gezeichneten SVG-Dreiecken, die sich farblich perfekt in den Scrollbar-Track einfügen.
- **Erweiterte Zoom-to-Fit-Bedienelemente**: Horizontales Zoom-Fit (`MoveHorizontal`) zeigt alle Clips in der Breite. Diagonales Zoom-Fit (`Maximize2`) passt Zoom und Spurhöhen an, sodass das gesamte Projekt scrollbalkenfrei sichtbar ist.

#### ⚡ Verbessert
- **Verhinderung von Menü-Markierungen**: Textselektion global auf der App deaktiviert (`select-none`), um unbeabsichtigte Hervorhebungen im Menü oder den Sidebars bei der Shortcut-Verwendung zu verhindern.

#### 🐛 Behoben
- **Warnung zu passivem Event-Listener**: Behebung von `Unable to preventDefault inside passive event listener invocation` beim Scrollen durch Verwendung nativer Listener mit `{ passive: false }`.
- **AudioContext Schließen-Fehler**: Absicherung von `.close()` auf dem `AudioContext` im Datei-Explorer und in der Aufnahme-Engine gegen unhandled rejections.

### English

#### ✨ Added
- **Default Zoom-to-Fit on first import**: Dynamically scales the horizontal timeline zoom to show the entire duration of the first imported audio clip in a project (with a 5% margin). Ignored during project loads.
- **Scroll & Zoom Modifier Shortcuts**: Added configurable shortcuts `scrollVertical` (defaults to `Shift`) and `zoomVertical` (defaults to `Ctrl+Shift`). Normal mouse wheel scrolls horizontal only. Scrolling with the modifiers scrolls vertically or zooms track heights (40px to 300px).
- **Select All Regions Shortcut**: Added configurable shortcut `selectAllRegions` (defaults to `Shift+A`) to select all audio clips across all tracks.
- **Unified Scrollbar Arrows**: Custom webkit-scrollbar-button styling with clean SVG triangles pointing in respective directions, matching track/thumb colors.
- **Zoom-to-Fit Buttons**: Pressing the horizontal zoom button (`MoveHorizontal`) fits all clips in width. Pressing the diagonal zoom button (`Maximize2`) fits all clips in width and scales track heights so all tracks are visible vertically.

#### ⚡ Changed
- **Prevent Menu Highlighting**: Disabled text selection globally on the application container to prevent accidental highlights in menus and sidebars while keeping inputs editable.

#### 🐛 Fixed
- **Passive Event Listener Warning**: Resolved `Unable to preventDefault inside passive event listener invocation` during wheel scrolling by binding native event listeners with passive set to false.
- **AudioContext Close Error**: Added catch blocks to `.close()` calls on `AudioContext` in FileExplorer and RecordingEngine to avoid uncaught rejections.

## [0.10.0] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Getrennte Logs- & Feedback-Popouts**: Logs („Sitzungs-Protokolle“) und Feedback („Feedback & Fehlerbericht“) öffnen sich jetzt in getrennten, verschiebbaren nativen Popout-Fenstern. Tabs und geteilte Header wurden entfernt.
- **Screenshot-Import aus Zwischenablage**: Neuer Button „Aus Zwischenablage einfügen“ im Feedback-Formular zum direkten Importieren von Screenshots.
- **In-App-Nachrichtencenter**: Premium Support-Chat-Oberfläche („Hilfe -> Nachrichtencenter...“) zur Ticketverfolgung und Kommunikation mit dem Support.

### English

#### ✨ Added
- **Separate Logs & Feedback Popouts**: Popouts for "Session Logs" and "Feedback & Bug Report" are now launched in separate native windows. Removed tabs and headers.
- **Clipboard screenshot paste**: Added a "Paste from Clipboard" button to the feedback form to import screenshots directly from the OS clipboard.
- **In-App Message Center**: A premium dark-themed support chat interface (Help -> Message Center...) allows users to view ticket history and chat with support.

## [0.9.7] - 2026-06-13

### Deutsch

#### ✨ Neu
- **Getrennte Logs- & Feedback-Aktionen**: Trennung des Diagnose-Log-Viewers und des Feedback- / Bug-Report-Bereichs in zwei eigenständige Menüpunkte im Hilfe-Menü („Logs...“ und „Feedback...“) für eine klarere Menüstruktur.
- **Eigene Log-Popout-Route**: Einbau einer dedizierten Electron-Route für das Log-Fenster. Dies behebt den Fehler, bei dem das Öffnen von Logs im Popout-Modus fälschlicherweise eine komplett neue DAW-Instanz gestartet hat.

#### ⚡ Verbessert
- **Optimierung des Popout-Fenster-Layouts**: Die Log- und Feedback-Fenster füllen den Bildschirm im Popout-Modus nun komplett randlos aus. Die doppelten Schließen-Leisten und Footer werden ausgeblendet, wodurch das Fenster sauber über die Windows-Titelleiste geschlossen werden kann.
- **Sprachumschalter im Update-Dialog**: Die DE/EN-Schaltflächen wurden aus der Titelleiste in das Innere der Infokarte direkt unter die Anzeige der neuen Version verschoben, wodurch der Sprachwechsel wesentlich deutlicher sichtbar ist.

### English

#### ✨ Added
- **Separated Logs & Feedback Actions**: Split the Diagnostic log viewer and Feedback / Bug Report into two distinct menu items under the Help menu ("Logs..." and "Feedback...") for clearer navigation.
- **Dedicated Log Popout Route**: Added a dedicated Electron route for the log viewer window, resolving the critical recursive window launch bug where opening logs in popout mode booted a completely new main editor instance.

#### ⚡ Changed
- **Popout Window Layout Optimization**: Log viewer and Feedback windows now render borderless and full-screen in standalone popout mode. The double close headers and footers are concealed, letting the OS titlebar handle window closing for a cleaner user experience.
- **Update Dialog Language Switcher**: Moved the DE/EN buttons from the window titlebar to the inside of the version card right under the new version info, making the language toggle significantly more prominent.

## [0.9.6] - 2026-06-12

### Deutsch

#### ⚡ Verbessert
- **CI/CD-Release-Automatisierung**: Automatische Windows-Builds in GitHub Actions wiederhergestellt und lokale Installer-Build-Schritte entfernt. Alle zukünftigen Releases werden somit vollständig und konsistent über die CI gebaut und veröffentlicht.

### English

#### ⚡ Changed
- **CI/CD Release Automation**: Restored automated Windows builds to GitHub Actions and retired local installer build steps, ensuring all future releases are built and published completely and consistently via CI.

## [0.9.5] - 2026-06-12

### Deutsch

#### 🐛 Behoben
- **Stabilität des Auto-Updaters**: Die Update-Pipeline wurde nach dem 0.9.4-Hotfix bereinigt und stabilisiert. Der Auto-Updater erkennt und lädt nun korrekt nur die Installer der aktuellen Version herunter.
- **Rahmenloses Update-Fenster verfeinert**: Kleine Stabilitätsverbesserungen am rahmenlosen Update-Popup-Fenster, das in 0.9.4 eingeführt wurde.

### English

#### 🐛 Fixed
- **Auto-Updater Stability**: Ensured the update pipeline is clean and stable after the 0.9.4 hotfix. The auto-updater now correctly identifies and downloads only the current version's installers.
- **Frameless Update Window Polish**: Minor stability improvements to the frameless Update popup window introduced in 0.9.4.

## [0.9.4] - 2026-06-12

### Deutsch

#### 🐛 Behoben
- **Update-Schleife behoben**: Veraltete Installer-Assets wurden aus dem v0.9.3-GitHub-Release entfernt, die dazu führten, dass der Auto-Updater eine ältere Version heruntergeladen hat. Das Release enthält nun nur noch die korrekten 0.9.3-Installer und `latest.yml`.
- **Doppelter X-Button im Update-Fenster**: Das Update-Popout-Fenster verwendet jetzt ein rahmenloses Electron-Fenster, wodurch der native Titelleisten-X-Button entfernt wird. Der eigene Schließen-Button des Update-Dialogs schließt das Fenster jetzt korrekt in beiden Modi (Inline und Popout).
- **Update-Fenster verschiebbar**: Die Kopfzeile des rahmenlosen Update-Fensters ist jetzt korrekt als Zieh-Bereich markiert, sodass das Fenster weiterhin verschoben werden kann.

### English

#### 🐛 Fixed
- **Update Loop Resolved**: Removed stale installer assets from the v0.9.3 GitHub release that caused the auto-updater to download an older version. The release now only contains the correct 0.9.3 installers and `latest.yml`.
- **Duplicate X Button in Update Window**: The Update popout window now uses a frameless Electron window, eliminating the native title bar's X button. The Update dialog's own close button now correctly closes the window in both inline and popout mode.
- **Update Window Draggable**: The header of the frameless Update window is now properly marked as a drag region so the window can still be moved.

## [0.9.3] - 2026-06-12

### Deutsch

#### ✨ Neu
- **Protokollverlauf im Log-Viewer**: Erweiterung des Diagnose-Protokoll-Viewers im Hilfe-Menü um eine vertikale Sitzungsliste, die alle gespeicherten Protokolldateien, deren Dateigrößen und eine Anzeige des Gesamtspeicherverbrauchs anzeigt.
- **Feedback- & Fehlerberichtsystem**: Integration eines Feedback- und Fehlerberichts-Panels in den Hilfe-Tabs. Benutzer können Feedback mit Textbeschreibungen einreichen, ihr aktuelles Sitzungsprotokoll anhängen und bis zu 10 Screenshots per Drag-and-Drop oder aus der Zwischenablage einfügen.
- **Zweisprachige Update-Patchnotes**: Sprachumschalter (DE/GB) im Update-Dialog integriert, um die Patchnotes wahlweise auf Deutsch oder Englisch anzuzeigen.

#### ⚡ Verbessert
- **Doppelte X-Buttons in Titelleisten entfernt**: Unnötige, doppelte Schließen-Schaltflächen (X) in Popout-Fenstern (Export-Fortschritt, Updates, Einstellungen, Über uns und Handbuch) wurden entfernt, um das Design aufzuräumen.

#### 🐛 Behoben
- **Log-Verwaltung & Bereinigung**: Automatische Protokollbereinigung beim Programmstart (maximal 30 Protokolle bleiben erhalten) und Möglichkeit, einzelne Protokolldateien direkt über die Benutzeroberfläche dauerhaft vom PC zu löschen.

### English

#### ✨ Added
- **Log Viewer Session History**: Expanded the Diagnostic Log Viewer in the Help menu to include a vertical session log list showing all stored log files, their file sizes, and a total storage indicator.
- **Feedback & Bug Report System**: Integrated a feedback and bug reporting panel within the Help tabs, allowing users to submit feedback with text descriptions, attach their latest session log, and drag-and-drop or paste up to 10 screenshots from the clipboard.
- **Bilingual Update Patchnotes**: Added a language switcher (DE/GB) inside the Update dialog to view patchnotes in both German and English.

#### ⚡ Changed
- **Removed Duplicate Title Bar Buttons**: Removed unnecessary duplicate close buttons (X) in popout windows (Export Progress, Update, Settings, About, and Manual) to simplify the window chrome.

#### 🐛 Fixed
- **Log Management & Cleanup**: Implemented automatic log file rotation/cleanup on startup (keeping maximum 30 logs) and allowed users to delete individual log files directly from the UI.

## [0.9.2] - 2026-06-12

### Deutsch

#### 🐛 Behoben
- **Update-Fortschritt im Popout**: Behebung eines Fehlers, bei dem die Fortschritts-Events während des Update-Downloads nur an das Hauptfenster gesendet wurden. Dies verhinderte die Aktualisierung des Ladebalkens (blieb bei 0 % stehen), wenn der Update-Dialog als separates Popout-Fenster geöffnet war.

### English

#### 🐛 Fixed
- **Update Progress in Popouts**: Fixed a bug where progress events during software updates were sent only to the main window, causing the progress bar to remain stuck at 0% when the update dialog was opened as a separate popout window.

## [0.9.1] - 2026-06-12

### Deutsch

#### ✨ Neu
- **Diagnose-Protokollierung**: Integration eines umfassenden Logging-Systems (`app.log` im AppData-Verzeichnis) mit automatischer Dateirotation (max. 5 MB, Umbenennung in `app.log.old`). Protokolliert Applikationsstart, unbehandelte Ausnahmen, IPC-Aufrufe, VST-Bridge-Aktivitäten und Systemereignisse.
- **Timeline-Event-Tracking**: Echtzeit-Protokollierung aller timeline-relevanten Aktionen (Verschiebungen von Audio-Clips auf die Millisekunde genau, Volume-Änderungen, Fades, Stummschaltungen, Solo-Modi und Spur-Sperren).
- **Diagnose-Protokolle Viewer**: Premium-Log-Viewer-Modal im edlen dunklen Glassmorphismus-Design (aufrufbar über `Hilfe -> Diagnose-Protokolle...`). Bietet Pegelfilter (Info, Warnung, Fehler, Debug), Echtzeit-Aktualisierung, Suchfunktion, Kopieren in die Zwischenablage und Direktlink zum Datei-Explorer.
- **Abfangen von Abstürzen**: Globale Listener im Haupt- und Renderer-Prozess, die unbehandelte Ausnahmen (Exceptions) und Rejections abfangen und mit vollständigen Stacktraces im Logfile dokumentieren.

#### ⚡ Verbessert
- **Standardfehler-Umleitung im MCP-Modus**: Automatische Umleitung aller Logausgaben im MCP-Modus (via `--mcp` oder `OMEGA_MCP_MODE=true`) auf `console.error` (stderr), um Protokollkollisionen über `stdout` zu verhindern.
- **Ergänzung des Benutzerhandbuchs (Kapitel 9)**: Neues Kapitel „Diagnose & Fehlerbehebung“ im Handbuch, das die Funktionsweise des Loggers und die Speicherpfade beschreibt.

#### 🐛 Behoben
- **Typdeklarationen-Angleichung**: Bereitstellung konsistenter TypeScript-Typdeklarationen in Preload- und Renderer-Konfigurationen für die neuen Window-APIs.

### English

#### ✨ Added
- **Diagnostic Logging System**: Integrated a comprehensive file logger (`app.log` in AppData) with automatic log rotation (max 5 MB, renaming to `app.log.old`) that captures main process initialization, unhandled exceptions, internal communication, audio and VST operations, and system events.
- **Timeline Event Tracking**: Real-time millisecond-precise logging of all timeline actions, including clip dragging/repositioning, volume adjustments, fades (in/out), track mute/solo toggles, and lock states.
- **Diagnostic Log Viewer**: Added a premium dark glassmorphic Log Viewer modal accessible via `Help -> Diagnose-Protokolle...` with log level filtering (Info, Warning, Error, Debug), real-time auto-refresh, search capabilities, clipboard copy, and file explorer linkage.
- **Unhandled Crash Handling**: Main and renderer process exception hooks to capture and log crashes or unhandled promise rejections directly into the log file.

#### ⚡ Changed
- **CLI and Headless Stderr Redirection**: Automatic redirection of all server logs to `console.error` (stderr) when run in MCP mode (via `--mcp` or `OMEGA_MCP_MODE=true`) to avoid protocol collisions on stdout.
- **User Manual Chapter 9**: Added a dedicated section detailing diagnostic features, error reporting, and log directory locations in the in-app manual.

#### 🐛 Fixed
- **Preload and Renderer Type Alignment**: Exposed unified typescript type definitions and declarations in both preload and renderer configurations for robust window context APIs.

## [0.9.0] - 2026-06-08

### Deutsch

#### ✨ Neu
- **5-fache Abspielgeschwindigkeit**: Erweiterung der Geschwindigkeitsstufen für Vorlauf (L) und Rücklauf (J) auf bis zu 5-faches Tempo (Zyklus: 1,0x -> 1,5x -> 2,0x -> 3,0x -> 4,0x -> 5,0x).
- **Schwebende Region-Namen**: Implementierung von dynamisch schwebenden Clip-/Objekt-Namen, die beim horizontalen Scrollen weich mitwandern und immer zentriert im sichtbaren Bereich des Clips bleiben.
- **Konfigurierbare Navigations-Sprünge**: Einstellungen im Reiter „Wiedergabe“ zur separaten Definition von Sprungweiten für Links-/Rechtspfeiltasten während des Abspielens und im Stillstand (Optionen: 0,5s, 1s, 3s, 5s, 10s).
- **Konfigurierbare Transport-Tastaturkürzel**: Integration von sechs neuen Aktionen im Einstellungsreiter „Tastenkürzel“:
- **setPlaybackStart Standard**: PfeilAb): Versetzt die Rückkehrposition für das Stoppen per Leertaste auf die aktuelle Abspielposition.
- **playAtPosition Standard**: K): Startet die Vorwärtswiedergabe (1x) oder pausiert an Ort und Stelle.
- **playBackward Standard**: J): Spielt rückwärts ab und erhöht zyklisch die Geschwindigkeit bei mehrmaligem Drücken (-1,0x -> -1,5x -> -2,0x).
- **playForward Standard**: L): Spielt vorwärts ab und erhöht zyklisch die Geschwindigkeit bei mehrmaligem Drücken (1,0x -> 1,5x -> 2,0x).
- **jumpBackward Standard**: PfeilLinks): Springt um die konfigurierte Schrittgröße zurück.
- **jumpForward Standard**: PfeilRechts): Springt um die konfigurierte Schrittgröße vorwärts.
- **Automatischer Stopp am Timeline-Anfang**: Stoppt die Rückwärtswiedergabe automatisch und setzt den Playhead auf 0, wenn der Anfang des Projekts erreicht wird.
- **Spurübergreifendes Lücken-Schließen**: Reformierung des Algorithmus für "Lücken finden & schließen". Durch spurübergreifende Intervallzusammenführung werden Lücken geschlossen, während die relativen zeitlichen Positionen (Relationen) überlappender, gruppierter und geteilter Stereo-Clips exakt erhalten bleiben.
- **Echtzeit-Audio bei Lücken-Schließung**: Direkte Anbindung des Echtzeit-Reschedulings an die Lücken-Schließfunktion. Bei laufendem Abspielen springen die Audiosignale aller verschobenen Clips sofort knackfrei an die neue Position, ohne Neustart der Wiedergabe.
- **Echtzeit-Region-Neuplanung**: Dynamische Neuplanung von Audioquellen (Web Audio API) bei laufender Wiedergabe. Das Verschieben oder Trimmen von Clips auf der Timeline wirkt sich nun sofort in Echtzeit auf die Wiedergabeposition und das Audio-Routing aus.
- **Audio-Rescheduling-Drosselung**: Integration einer 50-ms-Drosselung mit Trailing-Edge-Timeout beim Ziehen von Clips, um Knackser und Engine-Überlastungen während der Bewegung auszuschließen.
- **Spur-Lautstärkeregler Stummschaltung**: Ein Klick auf das Lautstärkesymbol neben dem Fader setzt die Lautstärke auf 0 und speichert den vorherigen Pegel. Ein erneuter Klick stellt die Originallautstärke wieder her.

#### ⚡ Verbessert
- **Dunkler Glassmorphismus für Kontextmenüs**: Neugestaltung aller Timeline-Rechtsklick-Menüs (Region-Menü, Editor-Menü, Spur-Menü) sowie deren Untermenüs von hellgrau auf ein edles, dunkles Glassmorphismus-Design (`bg-[#1e2124]/95 text-gray-200 border-gray-700/60 rounded-lg shadow-2xl`) passend zum übrigen DAW-Theme.
- **Chevron-Submenü-Icons**: Ersetzung der textbasierten Pfeilsymbole (`▸` / `▶`) durch standardisierte Lucide-React `ChevronRight` Icons mit dynamischem Highlight-Verhalten (`text-gray-500 group-hover:text-white`), um fehlerhafte Windows-Emoji-Darstellungen zu umgehen.
- **Spur-Lautstärkeregler-Layout**: Der Lautstärkeregler wurde in eine eigene, dauerhaft sichtbare Zeile unterhalb der anderen Kontrolltasten (Sperren, Solo, Mute) verschoben, um Überlappungen zu verhindern. Zudem wurde ein adaptives Layout implementiert, das Bedienelemente bei geringerer Spurhöhe automatisch ausblendet.
- **Spur-Steuerelemente**: Neugestaltung der Spur-Kontrolltasten (Sperren, Solo, Stummschaltung, Lautstärke) mit vergrößerten Symbolen/Schriften, farbcodierten Hintergründen (Blau für Sperren, Gelb/Orange für Solo, Rot für Mute, Grün für Lautstärke) und kontrastreichen hellen Schriftzugen zur besseren Unterscheidbarkeit.
- **Bessere Lesbarkeit des Time-Rulers**: Schriftgröße auf 11px vergrößert und Farbe auf ein helleres Grau angepasst, um den visuellen Kontrast und die Lesbarkeit deutlich zu verbessern.
- **Aktualisierung des Benutzerhandbuchs**: Ergänzung der neuen Steuertasten und Tastaturkürzel im integrierten Hilfebereich zur einfachen Referenzierung.

#### 🐛 Behoben
- **Tastaturkürzel-Serialisierung**: Registrierung der neuen Shortcuts in den IPC-Einstellungen-Standardwerten, damit sie stabil in `settings.json` gespeichert und geladen werden.
- **Playhead-Bereichsbegrenzung**: Begrenzung der Abspielnadel (samt rotem Handle) auf den tatsächlichen Editor-Bereich (ab `128px` von links) und Ausblenden bei Links-Überlauf, sodass sie nicht mehr fälschlicherweise die Spur-Steuerungen oder den Master-Volume-Fader überlagert.
- **Einzeilige Timecode-Ruler-Labels**: Verhinderung von Zeilenumbrüchen bei Zeitcode-Ticks durch Zuweisung von `whitespace-nowrap`, wodurch Labels ab 1 Minute (z. B. `1m 2s`) einzeilig nebeneinander stehen bleiben, statt zweizeilig zu stapeln.
- **Direktes Stereo-Splitting bei Kettensprengung**: Optimierung des Verhaltens beim Klicken auf das Kettenspreng-Symbol. Das physische Aufteilen einer Stereo-Region in linke und rechte Mono-Spuren wird nun immer sofort und prioritär durchgeführt (unter Löschen der `groupId`), selbst wenn der Clip Teil einer Gruppe ist. Dadurch lassen sich die gesprengten Kanäle in der geteilten Ansicht direkt unabhängig voneinander verschieben.
- **Keine Crossfades bei ungleichen Audiokanälen**: Automatische Crossfades (sowohl visuell im UI als auch akustisch in der Audio-Engine) werden nun unterdrückt, wenn sich Clips auf getrennten Audiokanälen (z. B. eine left-only und eine right-only Region) auf derselben Spur überlappen.
- **Starre Gruppenverschiebung am Timeline-Limit**: Begrenzung der negativen Verschiebung von Clip-Gruppen nach links. Sobald ein Element einer verlinkten Gruppe den Anfang der Timeline (`0s`) erreicht, blockiert die Verschiebung für die gesamte Gruppe, sodass sich die Clips nicht mehr übereinander schieben.
- **Gruppen-Drift beim Ziehen**: Behebung des Fehlers, bei dem verlinkte oder gruppierte Clips beim Verschieben exponentiell auseinanderdrifteten. Gruppenpositionen werden nun präzise auf Basis der absoluten Ausgangsdaten beim Klick ermittelt.
- **Spuren-Zusammenführung bei Stereo-Umstellung**: Das Umschalten zwischen "Stereo auf einer Spur" und "Stereo auf zwei Spuren" in den Einstellungen führt getrennte linke/rechte Mono-Spuren automatisch wieder zusammen (unter Beibehaltung ihres zeitlichen Versatzes und Anpassung der Spurlänge) bzw. teilt sie wieder auf separate Spuren auf. Die Änderungen werden während des Abspielens in Echtzeit neu eingeplant.

### English

#### ✨ Added
- **5x Playback Speed**: Expanded fast-forward (L) and rewind (J) speed cycling to support up to 5-fold speeds (cycling through 1.0x -> 1.5x -> 2.0x -> 3.0x -> 4.0x -> 5.0x).
- **Floating Region Names**: Implemented dynamically floating clip/region names that remain centered in the visible part of the region in the viewport while scrolling horizontally.
- **Configurable Navigation Steps**: Added settings under the "Playback" ("Wiedergabe") tab to configure different jump step sizes for ArrowLeft and ArrowRight keys when playing vs when stopped (options: 0.5s, 1s, 3s, 5s, 10s).
- **Customizable Transport Shortcuts**: Added six new actions under the "Keyboard Shortcuts" ("Tastenkürzel") settings tab:
- **setPlaybackStart default**: ArrowDown): Relocates return position for spacebar stop to the current playhead.
- **playAtPosition default**: K): Starts playback forward (1x) or pauses at the current location.
- **playBackward default**: J): Plays backward, cycling speed (-1.0x -> -1.5x -> -2.0x) on consecutive presses.
- **playForward default**: L): Plays forward, cycling speed (1.0x -> 1.5x -> 2.0x) on consecutive presses.
- **jumpBackward default**: ArrowLeft): Jumps backward by configured step size.
- **jumpForward default**: ArrowRight): Jumps forward by configured step size.
- **Auto-Stop at Project Start**: Automatically stops backward playback and resets playhead to 0 when reaching the start of the project.
- **Global Gap Closing**: Reformed the "Lücken schließen" (Find and Close Gaps) algorithm to work globally across all tracks using an interval-merging algorithm. This closes timeline gaps while perfectly preserving the relative timing and alignment of overlapping, split stereo, or grouped clips.
- **Real-Time Gap Closing Audio Rescheduling**: Integrated the real-time audio rescheduling engine with the gap closing mechanism, instantly repositioning playing audio streams for all shifted clips without requiring a manual playback restart.
- **Real-Time Region Rescheduling**: Implemented dynamic Web Audio rescheduling for audio clips during active playback. Moving, trimming, or dragging a clip on the timeline now updates its play offset and routing instantly in real-time.
- **Rescheduling Audio Throttling**: Added a 50ms throttle-with-trailing-edge scheduler when dragging timeline clips to guarantee glitch-free, high-performance playback during active movement.
- **Track Volume Fader Mute Toggle**: Clicking the fader volume icon button now silences the track fader (sets volume to 0) and saves the previous volume state. Clicking it again restores the previous volume level.

#### ⚡ Changed
- **Context Menu Theme**: Redesigned all timeline context menus (Region context menu, Editor context menu, Track context menu) and their submenus from light mode to a premium glassmorphic dark theme (`bg-[#1e2124]/95 text-gray-200 border-gray-700/60 rounded-lg shadow-2xl`) matching the rest of the application.
- **Chevron Submenu Indicators**: Replaced standard text arrows (`▸` / `▶`) with Lucide-React `ChevronRight` icons featuring dynamic hover highlights (`text-gray-500 group-hover:text-white`) to prevent operating system emoji conversion issues on Windows.
- **Track Volume Slider Layout**: Moved the volume slider to a dedicated, permanently visible row below the other track control buttons (Lock, Solo, Mute) to avoid clipping and overlap. Implemented a responsive vertical layout that hides elements cleanly when the track height is compressed.
- **Track Controls Styling**: Redesigned track header controls (Lock, Solo, Mute, and Volume) with larger, high-contrast buttons, distinct color-coded backgrounds (Blue for Lock, Yellow/Amber for Solo, Red for Mute, Green/Emerald for Volume), and light readable text/icons for both active and inactive states.
- **Time Ruler Readability**: Increased time ruler font size to 11px and adjusted text color to a lighter gray for higher visual contrast and readability.
- **User Manual Shortcuts Section**: Updated the in-app user guide with a dedicated reference for the new transport hotkeys.

#### 🐛 Fixed
- **Settings Shortcuts Serialization**: Registered new transport hotkeys inside the settings IPC defaults so they save and load reliably in `settings.json`.
- **Playhead Containment Clipping**: Bound the playhead rendering and dragging coordinates to the editor workspace (from `128px` onwards) and clipped its overflow, preventing the red playhead line and handle from overlaying the track headers or the master volume column when scrolling.
- **Timecode Ruler Label Stacking**: Added `whitespace-nowrap` wrapping prevention to timecode ruler tick labels, keeping minute and second numbers (e.g., `1m 2s`) on a single line instead of stacking them vertically.
- **Unlink/Split Priority for Stereo Regions**: Optimized the "Kettenspreng-Symbol" (unlink button) behavior. Splitting stereo regions into physical left and right mono tracks is now prioritized and executed immediately even if the region belongs to an active group, clearing its `groupId` so they can be dragged independently in the split track view.
- **Crossfades for Independent Channels**: Excluded regions playing on different channels (like left-only and right-only mono clips) from automatic crossfade calculations. Fades are no longer visually rendered or acoustically scheduled between mismatched channel formats on the same track.
- **Rigid Group Timeline Boundary**: Enforced a strict negative boundary limit for grouped region dragging. When any region in a linked group hits the beginning of the timeline (`0s`), the entire group's movement locks, preventing regions from shifting or overlapping with each other at the timeline boundary.
- **Group Dragging Drift**: Fixed a bug where grouped or linked clips would drift apart exponentially during dragging. Grouped region positions are now calculated using their absolute initial coordinates at click time.
- **Stereo Settings Merging and Splitting**: Toggling between "Stereo auf einer Spur" and "Stereo auf zwei Spuren" in the settings now automatically merges split left/right mono tracks back to a single track (preserving their relative offsets and making the track longer if needed) or splits them back onto adjacent tracks, including real-time audio rescheduling during playback.

## [0.8.18] - 2026-06-07

### Deutsch

#### ✨ Neu
- **Changelog-Viewer**: Implementierung einer vollständigen In-App-Changelog-Anzeige (`Hilfe -> Changelog...`), die alle historischen Updates mit Versionsliste, Datum, Sprachumschaltung (Deutsch 🇩🇪 / Englisch 🇬🇧), farbigen Kategorie-Etiketten und Inline-Markdown-Rendering darstellt.
- **Eingebettete Changelog-Ressource**: Konfiguration des Build-Prozesses zur Einbettung der `CHANGELOG.md` in die Production-Builds, sodass der In-App-Changelog-Viewer die Versionshistorie in der gepackten Anwendung direkt auslesen kann.

### English

#### ✨ Added
- **Changelog Viewer**: Added a comprehensive in-app Changelog Viewer (`Help -> Changelog...`) displaying full historical updates with side-by-side versions, dates, localized language tabs (German 🇩🇪 / English 🇬🇧), custom category coloring (Added, Fixed, Changed, Removed), and inline Markdown styling.
- **Embedded Changelog Resource**: Configured the build pipeline to embed the `CHANGELOG.md` inside production bundles, allowing the in-app viewer to read release history directly in packaged builds.

## [0.8.17] - 2026-06-07

### Deutsch

#### 🐛 Behoben
- **Update-Download**: Behebung eines Fehlers, bei dem der Download des Installers bei 0% hängenblieb. Die HTTPS-Verbindung und der Dateistream werden nun korrekt verfolgt, wodurch Abbruch und Redirect-Handling zuverlässig funktionieren. Zusätzlich wurde ein 30-Sekunden-Verbindungstimeout hinzugefügt.
- **Update-Dialog Markdown-Darstellung**: Patchnotes zeigen keine rohen `**fett**`-Sternchen mehr an. Inline-Bold-Markdown wird nun korrekt als fetter Text gerendert.
- **Update-Dialog pulsierende Punkte**: Die störende Pulsieranimation der Sprachabschnitts-Punkte (Deutsch / Englisch) in der Patchnotes-Ansicht wurde entfernt.
- **Update-Dialog Schriftgröße**: Die Schriftgröße im Patchnotes-Panel wurde für bessere Lesbarkeit vergrößert.

### English

#### 🐛 Fixed
- **Update Download**: Fixed update installer download getting stuck at 0% progress. The HTTPS download request and file stream are now properly tracked, enabling reliable cancellation and preventing hangs. Added a 30-second connection timeout and correct redirect handling.
- **Update Dialog Markdown Rendering**: Patch notes no longer show raw `**bold**` asterisks. Inline bold markdown is now correctly parsed and rendered as bold text.
- **Update Dialog Pulsing Dots**: Removed the distracting pulsing animation from the language section dots (Deutsch / English) in the patch notes view.
- **Update Dialog Font Size**: Increased the font size throughout the patch notes panel for better readability.

## [0.8.16] - 2026-06-07

### Deutsch

#### 🐛 Behoben
- **Dynamische Update-Dialog-Größe**: Begrenzung der maximalen Höhe des Update-Dialogs auf den sichtbaren Fensterbereich, sodass die Aktions-Buttons (Herunterladen, Später) immer sichtbar bleiben und kein Scrollen oder Fenstervergrößern nötig ist. Dynamische Fenstergrößenanpassung im Popout-Modus hinzugefügt.

### English

#### 🐛 Fixed
- **Update Dialog Dynamic Sizing**: Constrained the update modal height to always fit within the visible window area, ensuring action buttons remain visible without scrolling. Added dynamic window resizing for popout mode.

## [0.8.15] - 2026-06-07

### Deutsch

#### ✨ Neu
- **Wellenform-Skalierung & Amplituden-Boost**: Anpassung der vertikalen Amplitudendarstellung (2.5-fache visuelle Anhebung) in der Hauptwellenform und direkte Unterstützung der Konfiguration für halbe und ganze Wellenformdarstellung.

#### ⚡ Verbessert
- **Aufnahmedialog nur als Popout**: Der Audio-Aufnahmedialog öffnet sich nun standardmäßig immer direkt in einem separaten nativen Fenster (Popout-Only), und funktionslose eingebettete UI-Elemente wurden entfernt.

#### 🐛 Behoben
- **Leertasten-Wiedergabesteuerung**: Deaktivierung des automatischen Tastatur-Repeats bei gedrückter Leertaste, wodurch das fehlerhafte wiederholte Play/Pause-Verhalten behoben wurde.
- **Flüssiges Timeline-Scrubbing**: Behebung von Playhead-Sprüngen bei Klicks und Ziehbewegungen im Timeline-Lineal zur Gewährleistung einer flüssigen manuellen Positionsverschiebung.
- **Audio-Preload Asynchronitäts-Korrekturen**: Behebung einer Race-Condition beim Datei-Preload und der Audio-Engine-Initialisierung, die in manchen Fällen das Abspielen verhinderte.
- **Grafik-Bereinigung**: Entfernung funktionsloser Button-Grafiken aus der Benutzeroberfläche.

### English

#### ✨ Added
- **Waveform Scaling & Amplitude Boost**: Integrated vertical amplitude scaling (boosted visual levels by 2.5x) for the main waveform and added direct support for the half vs. full waveform display configuration.

#### ⚡ Changed
- **Popout-Only Audio Recording**: Configured the audio recording interface to default strictly to the dedicated native popout window mode, removing redundant embedded UI elements.

#### 🐛 Fixed
- **Spacebar Playback Control**: Prevented immediate double-triggering/keyboard auto-repeat of the Spacebar, restoring expected play/pause toggling behavior.
- **Timeline Scrubbing Fluidity**: Fixed playhead jumpiness when clicking or dragging on the timeline ruler for smoother manual scrubbing.
- **Audio Preload Async Restores**: Resolved a race condition during startup and file loading that could block audio playback from initiating correctly.
- **UI Element Cleanup**: Removed unused/non-functional toolbar graphic placeholders.

## [0.8.14] - 2026-06-02

### Deutsch

#### ✨ Neu
- **Ehrliche UI-Erklärung**: Einbau einer verständlichen und präzisen deutschen Erklärung im Premium Hybrid Fallback-Editor für GUI-lose Plugins (`hasEditor === false`), um transparent zu verdeutlichen, dass das Plugin konstruktionsbedingt über keine herstellereigene grafische Benutzeroberfläche verfügt.
- **Robuste Parameter-Steuerung**: Anpassung der Parameter-Weiterleitung in `VstEditorWindow.tsx`, sodass Regler-Änderungen im Fallback-Editor für echte GUI-lose VST2-Plugins live und verlustfrei an den C++ Singleton-Host übertragen werden.

### English

#### ✨ Added
- **Ehrliche UI-Erklärung**: Integrated a precise, native-feeling German description in the Premium Hybrid Fallback VST Editor when `hasEditor === false` to transparently explain that the plugin does not feature a native GUI by design.
- **Robust Parameter Flow**: Enhanced `VstEditorWindow.tsx` parameter dispatching to ensure parameter sliders communicate flawlessly with the C++ Native Host for GUI-less VST2 plugins even while fallback UI is active.

## [0.8.13] - 2026-06-02

### Deutsch

#### 🐛 Behoben
- **Automatische Bereinigung fiktiver Parameter**: Integration einer automatischen Reinigungslogik in `VstPluginRack.tsx` (`loadRackState`), `VstEditorWindow.tsx` (`loadPluginFromStorage`) und `EffectsPanel.tsx` (Sidebar-Klick-Handler), um geladene reale Plugins auf fiktive Parameter (gekennzeichnet durch das Fehlen einer `index`-Eigenschaft) zu prüfen und deren Parameterliste zurückzusetzen, wodurch verbleibende fiktive Parameter aus älteren Sessions automatisch aus dem LocalStorage entfernt werden.

### English

#### 🐛 Fixed
- **Automatic Fake Parameter Cleanup**: Implemented an automated cleanup routine within `VstPluginRack.tsx` (`loadRackState`), `VstEditorWindow.tsx` (`loadPluginFromStorage`), and `EffectsPanel.tsx` (sidebar click handler) that filters loaded real plugins for invented parameters (defined by the absence of an index property) and resets their parameter lists to prevent outdated fake parameters from seeding controls.

## [0.8.12] - 2026-06-02

### Deutsch

#### ✨ Neu
- **Parameter-Grid-Ladeplatzhalter**: Einbau eines dynamischen und eleganten Lade-Platzhalters im VST-Ausweich-Parametergrid von `VstEditorWindow.tsx`, solange noch keine Parameter vom Host geladen wurden.

#### 🐛 Behoben
- **Absicherung leerer VST-Parameterlisten**: Implementierung robuster Guards in `VstEditorWindow.tsx` (u.a. in `handleParamChange`), um UI-Abstürze bei temporär leeren Parameterlisten gescannter externer Plugins zuverlässig zu verhindern.

### English

#### ✨ Added
- **Parameters Grid Loading Placeholder**: Render a dynamic and elegant loading placeholder within the VST parameters fallback grid in `VstEditorWindow.tsx` when parameters have not yet been populated by the host.

#### 🐛 Fixed
- **Empty VST Parameter Safeguards**: Integrated robust boundary guards inside `VstEditorWindow.tsx` (e.g. within `handleParamChange`) to securely prevent UI crashes when external scanned plugins possess temporary empty parameter arrays.

## [0.8.11] - 2026-06-01

### Deutsch

#### ✨ Neu
- **Native C++ ASIO-Integration**: Vollständig funktionaler, nicht-gemockter nativer COM-Client zur Interaktion mit registrierten Windows ASIO-Treibern (z. B. ASIO4ALL, Steinberg, Realtek). Bietet reaktive Stereo-Ausgangskanalpaarung, Puffergrößen-Begrenzung auf Basis der tatsächlichen Hardwaregrenzen, Live-Latenzanzeige für Eingang, Ausgang und Roundtrip in Millisekunden und Samples, sowie direkte Ansteuerung des herstellereigenen Einstellungs-Panels.
- **Premium Hybrid Fallback VST-Editor**: Integration eines edlen Ausweich-Interfaces in `VstEditorWindow.tsx`, wenn Mockup- oder VST3-Plugins geladen werden. Bietet hochauflösende Parameterregler mit Echtzeit-Synchronisation in den DAW-Audiosignalweg und einen flüssigen, glühenden Canvas-Audio-Visualizer.
- **Dynamisches Resizing API**: Einbau einer `resizeWindow` Schnittstelle im Preload-Skript, wodurch sich Popout-Fenster selbstständig an die exakte Höhe ihres Inhalts anpassen können.

#### 🐛 Behoben
- **Unsichtbarer Audioaufnahme-Button**: Standardisierung der Button-Dimensionen in `AudioRecordingModal.tsx` auf konforme Klassen (`w-4 h-4`), wodurch der Ladefehler des Aufnahme-Buttons (zuvor fehlerhafte Klasse `w-4.5`) behoben wurde.
- **Aufnahmedialog-Skalierung**: Automatisches Ausmessen der inneren Höhe (`scrollHeight`) im Aufnahme-Popout und dynamische Fensteranpassung für eine scrollbarfreie Ansicht.

### English

#### ✨ Added
- **Native C++ ASIO Integration**: Implemented a fully functional native COM client to query and interact with registered system ASIO drivers (e.g. Yamaha Steinberg, Realtek, ASIO4ALL). Features dynamic output channel selection, sample size parameter configurations constrained to hardware-safe boundaries, real-time millisecond and sample latency reporting, and native control panel triggering.
- **Premium Hybrid Fallback VST Editor**: Configured `VstEditorWindow.tsx` to automatically trigger a visual fallback interface when a mockup or a VST3 plugin is loaded. Features high-fidelity interactive parameter sliders synced with localStorage/DAW state and a real-time glowing canvas audio visualizer.
- **Dynamic Window Resizing API**: Exposed `resizeWindow` via preload script to allow popout windows to dynamically adjust their sizes to match their natural content heights.

#### 🐛 Fixed
- **Invisible Audio Recording Button**: Standardized button dimensions in `AudioRecordingModal.tsx` to standard spacing classes (`w-4 h-4`), fixing the unrecognized Tailwind class (`w-4.5`) which collapsed the button to 0x0 pixels.
- **Recording Modal Sizing**: Configured the audio recording popout to automatically measure its inner scrollHeight and dynamically resize the window to fit perfectly with zero scrollbars.

## [0.8.10] - 2026-06-01

### Deutsch

#### ✨ Neu
- **Update-Abbrechen-Schaltfläche**: Einbau eines edlen, glassmorphic gestalteten roten „Abbrechen“-Buttons in der Update-Download-Ansicht (`UpdateModal.tsx`).
- **Asynchroner Download-Abbruch**: Implementierung einer robusten Request-Abbruch-Logik in dem Update-System, die laufende HTTPS-Anfragen stoppt, Dateihandles schließt und unvollständige Setup-Pakete rückstandslos vom Datenträger tilgt.

#### 🐛 Behoben
- **Win32 Native VST-GUI Darstellungsfehler**: Anpassung von `vst_host.cpp` zur Rekursion aller Win32-Kindfenster-Handles, wodurch Chromium-Rendering-Flächen programmatisch ausgeblendet (`SW_HIDE`) und Z-Order-Konflikte (Übermalen des VSTs) dauerhaft gelöst werden.
- **Dynamische VST-Fenstergröße**: Auslesen der idealen Originalgröße des Plugins via `effEditGetRect` in C++ und automatische Skalierung des Electron-Fensters auf diese preferred Bounds.
- **Flüssiges VST-Resizing**: Entwicklung eines Win32-Kind-Resizers, der Größenänderungen des Electron-Hostfensters direkt auf die native VST-Zeichenfläche spiegelt.
- **Bidirektionale Lifecycle-Koppelung**: Automatisches synchronisiertes Schließen des nativen Herstellerfensters beim Beenden der React-Steuerleiste und umgekehrt.

### English

#### ✨ Added
- **Updater Cancel Button**: Integrated a sleek, glassmorphic red "Cancel" ("Abbrechen") button into `UpdateModal.tsx` during active update downloads.
- **Asynchronous Download Abort**: Implemented robust ClientRequest and WriteStream interruption handlers in Update manager to abort update downloads, close file descriptors, and cleanly delete partial packages.

#### 🐛 Fixed
- **Win32 Native VST UI Snapping & Occlusion**: Configured `vst_host.cpp` to recursively scan all Win32 child window handles inside the BrowserWindow, programmatically concealing Chromium renderer/compositor viewports (`SW_HIDE`) to resolve Z-order collision and ensure the native plugin UI renders with perfect visibility.
- **Dynamic VST Bounds Scaling**: Configured the C++ engine to retrieve the plugin's preferred size via `effEditGetRect` and return it to Electron, automatically resizing `editorWindow` to match the exact plugin UI bounds.
- **Responsive Native UI Resizing**: Implemented a C++ Win32 child resizer linked to the Electron window resize events for smooth real-time rendering.
- **Bidirectional Lifecycle Coupling**: Linked the closing event of the React control strip to automatically close the native VST editor window and vice-versa.

## [0.8.9] - 2026-06-01

### Deutsch

#### ✨ Neu
- **Automatischer nativer UI-Start**: Der VST Editor initialisiert beim Öffnen jetzt vollautomatisch das native C++ Backend und öffnet sofort die echte, fotorealistische Benutzeroberfläche des Plugin-Herstellers, ohne dass ein Knopfdruck nötig ist.

#### ⚡ Verbessert
- **Großzügige, elegante Kontrollleiste**: Umbau der React-Steuerleiste in eine spacious `110px` hohe Kontrollleiste mit edlem dunklen Glassmorphismus, glühendem LED Power-Button und optimaler Lesbarkeit.
- **Gekoppelter Lebenszyklus**: Das Schließen des nativen Herstellerfensters schließt nun automatisch das darüberliegende React-Kontrollfenster mit, für eine nahtlose Desktop-Integration.
- **Fokus auf das native Interface (Zero-Clutter)**: Komplette Entfernung der redundanten Slider, des Keyboards, des Oszilloskops und des Preset-Dropdowns, um den Bildschirmplatz optimal für das native VST3-Fenster zu nutzen.

### English

#### ✨ Added
- **Automatic Native VST UI Spawning**: Configured `VstEditorWindow.tsx` to automatically initialize the native VST C++ host and open the manufacturer's original editor interface immediately upon window mount.

#### ⚡ Changed
- **Sleek SPACIOUS Control Bar**: Refactored the VST control header into a generous `110px` height strip with ample padding, large typography, and glowing dark styling.
- **Unified Lifecycle Window Coupling**: Configured `vstBridgeIpc.ts` to automatically close the React parent control window when the native manufacturer's editor window is closed.
- **Streamlined Layout (Zero-Clutter)**: Removed the parameters grid dials, keyboard, reactive oscilloscope, preset selection, and toggles to completely focus the workspace on the native VST3 interface.

## [0.8.8] - 2026-06-01

### Deutsch

#### ✨ Neu
- **Echtes natives Hersteller-GUI**: Direkte Anbindung der echten, fotorealistischen VST3-Grafikoberflächen der Hersteller über Electron und ein autarkes, natives Win32-Fenster.
- **Magnetischer Andock-Mechanismus (Unified Snapping)**: Entwicklung eines bidirektionalen magnetischen Locks. Die React-Kontrollleiste verschmilzt nahtlos mit dem nativen Herstellerfenster – sie bewegen, skalieren und schließen sich vollkommen synchron als eine Einheit.
- **VST-Kompakt-Modus (Space-Saver)**: Einführung einer „Kompakt-Modus“-Taste im Editor, wodurch Drehregler, Oszilloskop und Keyboard ausgeblendet werden und das Fenster platzsparend auf eine schmale 95px-Leiste schrumpft.
- **Einklappbare VST-Rack-Karten**: Klick auf die Header-Leiste geladener Rack-Module im `VstPluginRack.tsx` klappt diese platzsparend ein und aus (inklusive rotierender Chevron-Pfeilsymbole).
- **Ordner-Rechtsklick-Pinning**: Direktes Anheften (Pin) und Entfernen (Unpin) beliebiger Verzeichnisse an die Import-Seitenleiste über ein neues Rechtsklick-Kontextmenü im Datei-Browser (`FileExplorer.tsx`).
- **App-weite englische Lokalisierung**: Vollständiges i18n-Wrapping aller Texte in der Menüleiste (`MenuBar.tsx`) und den Einstellungen, inklusive nahtloser Echtzeit-Umschaltung zwischen Deutsch und Englisch.

#### 🐛 Behoben
- **JSX-Syntaxfehler in VstEditorWindow**: Korrektur eines fehlerhaften HTML-Tags im Oktave-Label des Klavier-Previewers (`</div>3 - C5</span>`).
- **Flexbox-Kollaps im VstPluginStore**: Bereinigung der DIV-Hierarchie im Store-Popout zur korrekten, blockierungsfreien Ausrichtung der linken Kategorie-Sidebar und der 3-spaltigen Katalog-Grid-Liste.

### English

#### ✨ Added
- **Native C++ VST GUI Support**: Integrated manufacturer's native VST3 graphical interfaces via Electron and a custom native C++ host parent window association (`vstBridgeIpc.ts`), allowing users to fully interact with original plugin panels.
- **Unified Magnetic Snapping Lock**: Designed a bidirectional magnetic window snapping lock that aligns the React control panel exactly over the manufacturer's native Win32 window. Moving, resizing, or closing either window synchronizes the other instantly.
- **VST Editor Compact Mode**: Added a "Kompakt-Modus" button to collapse the VST parameter editor into an ultra-thin 95px control strip, saving massive screen workspace.
- **Collapsible VST Rack Modules**: Enabled collapsing loaded cards in the `VstPluginRack.tsx` popout via a simple click on the header block, complete with smooth chevron state indicators.
- **Folder Context Menu (Pin/Unpin)**: Added a custom right-click context menu to directory nodes in `FileExplorer.tsx`, allowing users to directly pin or unpin any folder from their "Eigene Medien" sidebar list.
- **Bilingual App-Wide i18n Translation**: Implemented a comprehensive translation mapping, fully wrapping all hardcoded text strings in `MenuBar.tsx` and settings modules using robust `react-i18next` triggers.

#### 🐛 Fixed
- **VstEditorWindow JSX Syntax Glitch**: Repaired a copy-paste markup syntax error in the piano preview octave indicator (`</div>3 - C5</span>`).
- **VstPluginStore Popout Hierarchy**: Corrected JSX div hierarchy by wrapping the vertical category sidebar and the catalog grid inside a unified flex layout row container.

## [0.8.3] - 2026-06-01

### Deutsch

#### ✨ Neu
- **Details-Modals im VST-Store**: Integration von optisch beeindruckenden Details-Dialogen für alle kuratierten Gratis-VST-Plugins. Jedes Modal enthält ein interaktives, rein in CSS/Tailwind nachempfundenes Frontend-Interface-Mockup (Oszilloskope, ADSR-Kurven, 6-Operatoren-FM-Gitter, Frequenzbänder) zur Visualisierung.
- **Verbessertes VST-Store Sidebar-Layout**: Ersetzung des responsive-Spalten-Racks durch eine saubere, einspaltige Liste für schmale DAW-Seitenleisten. Bietet perfekte Platzausnutzung und einen fest ausgerichteten Download-Button am rechten Ende.

### English

#### ✨ Added
- **Curated VST Store Details Modal**: Implemented fully custom, high-fidelity responsive details dialogs for all curated free VST plugins, featuring an inline, CSS-simulated active interactive front-panel mockup (oscilloscopes, LFO graphs, operators, ADSR envelope lines, dials) to showcase features.
- **Improved VST Store Sidebar Layout**: Swapped the screen-responsive columns with a dedicated single-column list that respects narrow sidebars, fully aligning all information and providing a prominent download status button at the far right.

## [0.8.1] - 2026-06-01

### Deutsch

#### 🐛 Behoben
- **Updater-Hänger behoben**: Der experimentelle Node-`fetch`-Downloader wurde durch einen robusten, auf dem nativen `https`-Modul basierenden Stream-Writer mit Redirect-Unterstützung ersetzt. Dies behebt das unendliche Hängen bei `0%` Fortschritt beim Herunterladen von Updates von GitHub Releases (S3-Redirects).

### English

#### 🐛 Fixed
- **Updater Infinite Hang**: Replaced the experimental Node `fetch` downloader with a robust, native `https` module-based redirect-following stream writer, resolving the infinite hang at `0%` progress when downloading updates from GitHub releases (which redirect to S3).

## [0.8.0] - 2026-06-01

### Deutsch

#### ✨ Neu
- **Echtzeit VST2 Audio-Effekt Engine**: Laden und Routen von VST2-Effekten (Kompressoren, EQs, Delays) auf Spurebene in Echtzeit. Angetrieben von einem nativen C++ Plugin-Host und einem dedizierten High-Priority Audio-Hintergrundthread.
- **VST-Instrumenten-Support (VSTi)**: Live-Spielen von Synthesizern, Samplern und Drum-Machines. Bietet eine extrem latenzarme Shared-Memory-MIDI-Queue über SharedArrayBuffers.
- **Zwei-Wege-MIDI-Feedback (MIDI Out)**: Senden von Signalen zurück an physische Controller zur Ansteuerung von Motorfadern, LED-Ringen und leuchtenden Buttons.
- **Interaktives VST MIDI-Learn**: Einfaches Mappen von Reglern über MIDI Learn direkt im VstPluginRack, um Plugin-Parameter mit Hardware-Reglern zu koppeln.
- **Jog-Wheel & Timeline-Navigation**: Verknüpfung von physischen Drehrädern mit Timeline-Aktionen wie Scrollen, Zoomen und Playhead-Scrubben.
- **Kuriertes VST Store**: Integrierte Seitenleisten-Sektion mit Direkt-Downloads und automatisiertem Import von professionellen freien Plugins (Vital, Surge XT, Dexed, Valhalla Supermassive etc.).
- **VstPluginRack UI**: Ästhetische modulare Rack-Oberfläche für Spureffekte mit Bypass-Schalter, Parameter-Schiebereglern, Resets und blinkenden Learn-Indikatoren.

#### ⚡ Verbessert
- **Cross-Origin Isolation Header**: Aktivierung von COOP/COEP-Sicherheitsheadern in Electron zur sicheren Freischaltung von SharedArrayBuffer für latenzfreies Audio.
- **README & Projektdokumentation**: Aktualisierung der Repository-Beschreibungen zur Ankündigung der fertigen VST/MIDI Integration und vollständige Entfernung der Prototyp-Disclaimer.

### English

#### ✨ Added
- **Real-Time VST2 Audio Effects Engine**: Load and route VST2 effects (compressors, equalizers, delays) on track level in real-time. Powered by a custom native C++ host and high-priority background audio thread.
- **VST Instruments (VSTi) Support**: Play virtual synthesizers, samplers, and drum-machines live with zero latency. Integrates a custom low-overhead Shared-Memory-MIDI-Queue over SharedArrayBuffers.
- **Two-Way MIDI Feedback (MIDI Out)**: Support for sending control surface signals back to physical MIDI controllers, powering motorized faders, LED rings, and illuminated buttons.
- **Interactive VST MIDI-Learn**: Click parameters in the VstPluginRack to map sliders directly to knobs or faders on your physical MIDI hardware controller.
- **Jog-Wheel & Timeline Navigation**: Map relative/absolute MIDI CC dials to timeline scrolling, zooming, and playhead scrubbing.
- **Curated Free VST Store**: Integrated store in the side panel offering direct downloads and automated installation of free professional effects and synths (Vital, Surge XT, Dexed, Valhalla Supermassive, etc.).
- **VstPluginRack UI**: Gorgeous dark modular interface for track insert effects with Bypass toggles, parameter sliders, reset triggers, and live MIDI control indicators.

#### ⚡ Changed
- **Cross-Origin Isolation Headers**: Configured COOP/COEP headers on the Electron default session to safely enable low-latency SharedArrayBuffer communication.
- **README & Project Description**: Updated target repository descriptions to announce the production-ready native VST/MIDI integration and retired the prototype notices.

## [0.7.14] - 2026-06-01

### Deutsch

#### ⚡ Verbessert
- **Exportdialog dynamische Höhe**: Entfernung der festen `max-h-[96vh]`-Beschränkung und der internen Scrollleiste aus dem Mixdown-Export-Dialog. Der Dialog passt sich nun dynamisch seinem Inhalt an und endet knapp unterhalb der Schaltflächen, ohne das Fenster vollständig auszufüllen.

### English

#### ⚡ Changed
- **Export Dialog Dynamic Height**: Removed the fixed `max-h-[96vh]` constraint and internal scrollbar from the Mixdown Export dialog. The dialog now auto-sizes to its content, closing just below the export/cancel buttons without stretching to fill the window.

## [0.7.13] - 2026-06-01

### Deutsch

#### ⚡ Verbessert
- **Update-Popout Abmessungen**: Anpassung der Update-Popout-Größe auf 740x780 zur korrekten Darstellung ohne Abschneiden.
- **Einheitliche Popout-Routung**: Tastaturkürzel für Einstellungen und der Update-Trigger aus dem Einstellungsfenster laufen nun über den Popout-Router, um bei kleinem Hauptfenster verlässlich auszuploppen.

#### 🐛 Behoben
- **Rückbau der internen Scrollbars**: Wiederherstellung der ursprünglichen Full-Height-Modals für Updates, Einstellungen und Über uns, um jegliches Scrollen im Dialog zu vermeiden.

### English

#### ⚡ Changed
- **Modal Popout Size Adjustment**: Set the update popout dimensions to 740x780 to match its actual layout requirements, resolving previous crop defects.
- **Unified Popout Router Hook**: Routed settings keyboard shortcut and settings modal update checker triggers through the popout router to consistently catch small viewport scenarios.

#### 🐛 Fixed
- **Reverted Inline Modal Scrolling**: Restored the original full-height layouts for Update, Settings, and About modals, removing internal scrollbars and relying on dynamic popouts to prevent cropping.

## [0.7.12] - 2026-05-31

### Deutsch

#### ⚡ Verbessert
- **DSP-Parameter-Schutz im Stopp-Zustand**: Schieberegler-Änderungen bei gestopptem Player werden nun präventiv in `trackParams` gesichert, anstatt unnötige Audio-Knoten auf geschlossenen Contexten zu erstellen.
- **Timeline Abspielkopf-Synchronisation**: Perfekte Synchronisation von `playheadPosRef.current` bei Sprüngen an den Anfang oder das Ende der Timeline für ruckelfreies Rendering.
- **Speicherbereinigung bei Stopp**: Das Leeren des Projekt-Zustands (`currentProject = null`) bei Stopp verhindert unnötige Cache-Prefetch-Berechnungen im Hintergrund.
- **Vorschau-Visualizer-Kollision**: Die Vorschau-Funktionen des Datei-Explorers warten nun explizit das Schließen (`await`) des vorherigen AudioContexts ab, um Glitches auf schwächerer Hardware zu vermeiden.

#### 🐛 Behoben
- **Modernisierung der Aufnahme-Engine (AudioWorklet)**: Migration des veralteten `ScriptProcessorNode` auf eine moderne `AudioWorkletNode` in der `RecordingEngine`, wodurch Aufnahmepuffer-Erfassung, Pegelanzeigen (VU) und Software-Monitoring stabil im Hintergrundthread laufen.
- **Exakte Abspielzeit nach Pause (Resume-Fix)**: Neukalibrierung von `startTime` beim Fortsetzen des Abspielens, um Positionsverschiebungen bei Gerätewechseln auszuschließen.
- **Robustes Dateiladen bei Context-Reset**: Transparenter Zweitversuch in `loadFile()`, falls der AudioContext während der asynchronen Dateiladung gestoppt oder zurückgesetzt wurde.

### English

#### ⚡ Changed
- **AudioEngine Stopped Track Guard**: Preventive param saving in `trackParams` when adjusting sliders while stopped, avoiding redundant AudioNode creation on closed/suspended audio contexts.
- **Timeline Autoscroll & Playhead Sync**: Synchronized mutable playhead ref `playheadPosRef` in timeline skip-to-start and skip-to-end triggers, securing exact position rendering.
- **Empty currentProject on Stop**: Set `currentProject = null` on multitrack player stop, preventing background sliding-window cache preloading when stopped.
- **File Explorer Preview await close**: Changed FileExplorer preview functions to `async` and awaited `audioCtx.close()` before creating a new context, preventing hardware preview glitches.

#### 🐛 Fixed
- **Modern RecordingEngine AudioWorklet Migration**: Upgraded the deprecated `ScriptProcessorNode` to a modern `AudioWorkletNode` in `RecordingEngine`, completely offloading real-time peak calculation and software monitoring to a background thread to prevent dropouts.
- **AudioEngine Resume Timing Recalibration**: Recalibrated `startTime` directly in `resume()` to prevent timeline timing drift if the context resets or switches output routing.
- **AudioEngine Async loadFile Swap Protection**: Captured the active context during async load and automatically retried decoding on the new context if stopped/swapped during loading.

## [0.7.11] - 2026-05-31

### Deutsch

#### ⚡ Verbessert
- **Mehrspur-Standard-Pitch- & Speed-Panel**: Umgestaltung des Pitch/Timestretch-Panels nach dem Vorbild etablierter DAW-Schnittstellen, inklusive eines zweistufigen „Algorithmus“-Dropdowns (Timestretching vs. Resampling).
- **Echtzeit-Dauer-Eingabefeld**: Hinzufügen eines interaktiven „Länge“-Eingabefelds. Die Eingabe einer Ziel-Dauer errechnet, clamps und übernimmt automatisch das exakt dazu passende Tempo (`pitchRate`) in Echtzeit.

#### 🐛 Behoben
- **Flanger- & Phaser-Störgeräusche im Bypass**: Einpflegen eines unberührten, digitalen Bypass-Signalwegs im `Jungle`-Pitch-Shifter für den Zustand `ratio = 1.0` (Bypass), was jegliche Kammfilter- und Phasing-Effekte vollständig beseitigt.

### English

#### ⚡ Changed
- **Bilingual Speed & Pitch Panel**: Upgraded the Pitch/Timestretch panel to mirror professional DAW interfaces, replacing the simple checkbox with a dual-mode "Algorithmus" select dropdown (supporting Timestretching and Resampling).
- **Real-Time Duration Input**: Added a dynamic "Länge" (Length) text input showing the region's real-time duration. Typing a new length automatically calculates, clamps, and applies the exact corresponding speed factor (`pitchRate`).

#### 🐛 Fixed
- **DSP Phasing & Comb Filtering**: Implemented a phasenpure clean digital bypass inside the `Jungle` pitch shifter node when `ratio = 1.0` (or when Timestretching is bypassed), completely eliminating flanging, phasing, or comb filtering distortion.

## [0.7.10] - 2026-05-31

### Deutsch

#### ⚡ Verbessert
- **Echtzeit „Tonhöhe beibehalten“ (Time-Stretching)**: Der `Jungle`-Pitch-Shifter ist nun dauerhaft in die DSP-Kette der Regionen eingebunden, um ein unterbrechungsfreies, live Hot-Toggling der Tonhöhenkorrektur während des Abspielens zu ermöglichen (mit latenzfreiem Bypass-Zustand).
- **Präzise Tempo-Dehnungsberechnungen**: Sämtliche Abspiel-Grenzen, Fades, Crossfades und Trimm-Berechnungen wurden in Echtzeit-Sekunden umgerechnet (geteilt durch `pitchRate`), um eine perfekte Synchronisation zur gestauchten oder gedehnten Timeline zu garantieren.

#### 🐛 Behoben
- **Buffer-Offset & Längen-Skalierung**: Die Parameter für Lese-Offset und Lese-Länge beim Starten von Audioquellen (`source.start`) in der Live-Wiedergabe und im Export wurden präzise an das Wiedergabetempo angepasst.
- **JSX-Syntax in Timeline**: Behebung eines ungeschlossenen `onClick`-Handlers und fehlenden DIV-Tags im Spur-Rendering der Timeline.

### English

#### ⚡ Changed
- **Real-Time Keep-Pitch (Time-Stretching)**: Unified the `Jungle` pitch shifter node to always connect in the active region DSP path, enabling dynamic real-time hot-toggling of "Tonhöhe beibehalten" (time-stretching) during active playback.
- **Audio Speed-Stretching Calculations**: Completely scaled and aligned all visual duration trimming, region boundaries, and fade-in/fade-out/crossfade calculations into real-time seconds inside both the live multitrack player and the offline renderer (`renderOffline`).

#### 🐛 Fixed
- **Trim and Offset Sync**: Fixed multitrack buffer playback start and read length parameter offset scaling by `pitchRate` to match the visual speed-stretching on the timeline.
- **JSX Syntax in Timeline**: Corrected a mismatched and unclosed `onClick` handler in the Timeline's track element loop.

## [0.7.9] - 2026-05-31

### Deutsch

#### ✨ Neu
- **„Kompressor aktivieren“ Toggle**: Eigener Aktivierungsschalter für den Region-Kompressor im Audioeffekt-Panel.
- **Eigene Medien Kontextmenü**: Ein schickes Rechtsklick-Kontextmenü zum bequemen Entpinnen von selbst hinzugefügten Ordnern in der Import-Sidebar. Standardordner sind schreibgeschützt und rufen kein Menü auf.

#### ⚡ Verbessert
- **Pop-out-Modals bei Crop**: Einstellungen, Info, Benutzerhandbuch und Updates öffnen sich bei kleinem Hauptfenster (cropped) automatisch in eigenständigen, nativen Electron-Popout-Fenstern, anstatt abgeschnitten zu werden.
- **LocalStorage-Synchronisation**: Einstellungs- und Treiber-Änderungen in Pop-out-Fenstern werden in Echtzeit via HTML5-Storage-Event-Bridge live ins Hauptfenster übernommen.
- **Seamless Reverb Decay live**: Behebung von Tonausfällen bei Hall-Decay-Änderungen durch dynamisches Neuerstellen und knackfreies Wiederverbinden der ConvolverNode im laufenden Stream.

#### 🐛 Behoben
- **Kompressor-Anspiel-Fade-In**: Behebung eines Fehlers, bei dem das Zurücksetzen von Effekten den Compressor fälschlicherweise aktivierte, was aufgrund des Makeup-Gains beim Song-Start ein störendes Einblenden verursachte.
- **Fehlermeldung beschädigter Audiodateien**: Import-Fehlermeldungen wurden verbraucherfreundlich lokalisiert und präzisiert, um beschädigte oder nicht unterstützte Quelldateien sofort zu identifizieren.

### English

#### ✨ Added
- **"Enable Compressor" Toggle**: Added a dedicated activation checkbox for the region compressor in the Effects Panel.
- **Custom Folder Context Menu**: Implemented a glassmorphic right-click context menu (with an "Ordner entpinnen" action) exclusively for user-pinned folders in the File Explorer sidebar, keeping standard folders read-only.

#### ⚡ Changed
- **Pop-out Dialogs on Crop**: Modals like Settings, About, Manual, and Updates now automatically pop out as native borderless top-level Electron windows if the main window dimensions are smaller than the modal dimensions (cropped).
- **LocalStorage State Sync**: Integrated a storage event bridge to live-synchronize settings parameters, shortcuts, and AudioEngine driver settings from popouts back to the main DAW window instantly.
- **Seamless Live Reverb Decay**: Resolved the convolver write-once buffer constraint by dynamically hot-swapping and reconnecting a new ConvolverNode in real-time when dragging the reverb decay slider.

#### 🐛 Fixed
- **Compressor Startup Fade-In Bug**: Resolved a critical issue where resetting effects would activate the compressor with default threshold and ratio regardless of the bypass flag, causing a slow fade-in volume swell on starting playback.
- **Corrupted Audio File Details**: Improved the import catch block to display a user-friendly and highly precise German error message ("Die Audiodatei ist beschädigt, unvollständig...") upon audio decoding failure.

## [0.7.8] - 2026-05-31

### Deutsch

#### ✨ Neu
- **Ordner anpinnen im Import-Reiter**: Benutzer können nun beliebige Ordner direkt in der Seitenleiste unter „Eigene Medien“ anpinnen, indem sie auf das neue Plus-Symbol (`+`) klicken. Die Pfade werden im `LocalStorage` gespeichert und verfügen über ein Hover-Löschkreuz (`X`) zum schnellen Entpinnen.

#### ⚡ Verbessert
- **Standardordner im Explorer**: Der Import-Datei-Explorer startet beim Starten nun standardmäßig direkt im System-Ordner **„Musik“** (mit Fallback auf das Benutzerverzeichnis).
- **ASIO getrennte Dropdowns**: Die Wiedabe-Einstellungen wurden umgestaltet, um die physikalische ASIO-Treiberauswahl und die Standard-Ausgabekanalwahl zu trennen. Bei Auswahl von „ASIO-Treiber“ erscheint ein eigenes Dropdown (`ASIO-Treiber:`), während das Standard-Ausgabegerät (`Ausgabegerät:`) immer sichtbar und aktiv bleibt.
- **System-Bereinigung**: Die redundante Sektion „Software-Updates“ wurde vollständig aus den Einstellungen entfernt, da sie bereits über das Hilfe-Menü abgedeckt ist.

#### 🐛 Behoben
- **100 % Echtzeit-Audioeffekte**: 
- **Kompressor**: Die ungenutzte Option `compActive` wurde umgangen, wodurch die Kompression sofort in Echtzeit einsetzt, sobald der `Ratio`-Regler größer als `1.0` ist (standardmäßiges DAW-Verhalten).
- **Hall (Decay-Zeit)**: Unterstützung für Echtzeit-Nachhallzeit-Updates im laufenden Stream, indem eine Convolver-Referenz auf dem `ActiveRegionNode` gehalten und der Impuls-Response-Buffer bei Bewegung des Decay-Reglers mathematisch live regeneriert wird.
- **Delay & De-Esser**: Beide Effekte reagieren nun absolut verzögerungsfrei und knackfrei auf Reglerbewegungen im laufenden Stream.
- **Hinweisdialoge reaktivieren**: Der Button „Hinweisdialoge reaktivieren“ setzt nun verlässlich alle ausgeblendeten Warnungen (`showStartScreen` und `showExportGapWarning`) zurück und triggert ein schickes globales Erfolgsmodal.

### English

#### ✨ Added
- **Shortcut Folder Pinning in Import Tab**: Users can now pin directories of their choice directly under "Eigene Medien" in the Import explorer sidebar by clicking the new Plus (`+`) button. Pinned paths are persisted inside `LocalStorage` and feature hover-to-delete `X` buttons.

#### ⚡ Changed
- **Default Explorer Directory**: The Import file explorer now opens the system's official **Music** folder (`music`) by default on start, falling back to user home.
- **ASIO Split Dropdowns**: Reorganized the Wiedergabe (Playback) settings card to split ASIO driver selection and output routing. Selecting "ASIO-Treiber" now shows a dedicated physical driver dropdown (`ASIO-Treiber:`) while keeping the standard Windows output routing dropdown (`Ausgabegerät:`) visible at all times.
- **System Settings Cleanup**: Completely removed the redundant "Software-Updates" section from System settings since it is already covered in the Help menu.

#### 🐛 Fixed
- **100% Real-time Audio Effects**: 
- **Compressor**: Bypassed the non-functional `compActive` flag, enabling dynamic compression in real-time as soon as the `Ratio` slider is greater than `1.0` (standard DAW behavior).
- **Reverb (Decay Time)**: Enabled live decay time updates during active playback by keeping a physical convolver reference on `ActiveRegionNode` and mathematically reconstructing the impulse response buffer in real-time when the decay slider is dragged.
- **Delay & De-Esser**: Ensured both parameters apply parameters immediately and smoothly to active audio streams.
- **Warning Reactivation**: Made "Hinweisdialoge reaktivieren" fully operational by correctly resetting hidden warnings (`showStartScreen` and `showExportGapWarning`) and displaying a beautiful global success modal.

## [0.7.7] - 2026-05-31

### Deutsch

#### 🐛 Behoben
- **Dauerhafte Master-Lautstärke beim Suchen/Stoppen**: Behebt einen Fehler, bei dem der Lautstärkeregler im Player unter der Haube auf 1.0 (100% Lautstärke) zurückgesetzt wurde, sobald der Playhead verschoben oder die Wiedergabe gestoppt wurde (bedingt durch die Neuinitialisierung des `AudioContext`). Die Master-Lautstärke wird nun dauerhaft im `AudioEngine` gespeichert und wiederhergestellt.
- **ASIO-Treiber-Integration in den Einstellungen**: Integriert einen nativen Windows-Registry-Scanner im Hauptprozess (`systemIpc.ts`), der registrierte ASIO-Treiber unter `HKLM\Software\ASIO` und `HKLM\Software\WOW6432Node\ASIO` abfragt. Das Ausgabegerät-Dropdown zeigt nun dynamisch die tatsächlich installierten ASIO-Treiber (z. B. `GoXLR ASIO Driver`, `Realtek ASIO` usw.) an, wenn ASIO ausgewählt ist.
- **Fehlende ASIO-Treiber-Warnmeldung**: Fügt eine schicke rote Warnmeldung in den Wiedergabe-Einstellungen hinzu, wenn „ASIO-Treiber“ ausgewählt ist, aber keine ASIO-Treiber auf dem System installiert sind. Die Meldung empfiehlt die Installation von Treibern wie **ASIO4ALL** oder interfacespezifischen Treibern wie **Steinberg/Yamaha ASIO**.

### English

#### 🐛 Fixed
- **Persistent Master Volume on Seek/Stop**: Fixed a bug where adjusting the master volume slider in the player would reset to 1.0 (100% volume) under the hood whenever the playhead was moved or playback stopped due to `AudioContext` recreation. The master volume setting is now stored persistently in `AudioEngine` and automatically restored.
- **ASIO Driver Integration in Settings**: Exposes a native Windows registry scanner in the main process (`systemIpc.ts`) that queries registered ASIO drivers under `HKLM\Software\ASIO` and `HKLM\Software\WOW6432Node\ASIO`. The Playback Settings device dropdown now dynamically displays actual installed ASIO drivers (like `GoXLR ASIO Driver`, `Realtek ASIO`, etc.) when ASIO is selected.
- **Missing ASIO Driver Warning Alert**: Added a beautiful red warning alert banner inside the Playback Settings card when "ASIO-Treiber" is selected but no ASIO drivers are registered on the system. The banner recommends installing a suitable driver like **ASIO4ALL** or interface-specific drivers like **Steinberg/Yamaha ASIO**.

## [0.7.6] - 2026-05-31

### Deutsch

#### ✨ Neu
- **Dauerhaft sichtbares Effekte- & Plugins-Panel**: Das rechte Panel bleibt jetzt immer vollständig sichtbar, auch wenn kein Audio-Clip ausgewählt ist. Bedienelemente werden deaktiviert mit einem integrierten Hinweis angezeigt.
- **Akkordeon-Layout für das Effekte-Panel**: Die flache Seitennavigation wurde durch zwei ausklappbare Akkordeon-Sektionen ersetzt – **„Audioeffekte"** (mit Equalizer, Kompressor, Hall/Reverb, Echo/Delay, De-Esser und Pitch/Timestretch) und **„VST-Plugins"** (dynamische Plugin-Liste).
- **Instrument- vs. Effekt-Erkennung im VST-Scanner**: Der Scanner erkennt automatisch den Unterschied zwischen Instrumenten und Audioeffekten per Schlüsselwortanalyse. Instrumente: lilafarbener Badge; Effekte: blauer Badge.
- **Automatisches Laden der VST-Plugin-Registry beim Start**: Bereits gescannte Plugins werden beim Öffnen des Panels sofort aus der lokalen Registry geladen.

#### ⚡ Verbessert
- **Menü-Umbenennung: „Effekte" → „Plugins"**: Der Menüpunkt wurde umbenannt. Der Unterpunkt „Audioeffekte (Master)" wurde als redundant entfernt.
- **Einstellungsdialog-Höhe erhöht**: Die Höhe des Programmeinstellungen-Dialogs wurde von 550 px auf 700 px erhöht.
- **VST-Scanner: Rekursive Verzeichnis-Suche**: Der Scanner durchsucht nun bis zu 6 Ebenen tief, wodurch VST3-Bundles und VST2-DLLs in verschachtelten Ordnern gefunden werden.
- **VST-Scanner: Erweiterte Windows-Suchpfade**: `Program Files (x86)`-Varianten und benutzerspezifische Dokument-Ordner wurden hinzugefügt.

#### 🐛 Behoben
- **Doppelter Audioausgabe-Geräteeintrag**: Der vom Browser automatisch generierte `Default - System (...)`-Doppeleintrag in der Audioausgabe-Auswahl wurde entfernt.
- **VST-Plugin-Typ-Anzeige `(undefined)`**: Feldnamen-Fehler behoben – `vst.type` durch `vst.format` ersetzt.

### English

#### ✨ Added
- **Always-Visible Effects & Plugins Panel**: The right-side panel now remains fully visible at all times, even when no audio clip is selected. Controls are clearly disabled with an inline warning when no clip is active.
- **Accordion Layout for Effects Panel**: Replaced the flat sidebar navigation with two collapsible accordion sections — **"Audioeffekte"** (Equalizer, Compressor, Hall/Reverb, Echo/Delay, De-Esser, Pitch/Timestretch as sub-accordions) and **"VST-Plugins"** (dynamic plugin list).
- **Instrument vs. Effect Detection in VST Scanner**: The scanner now automatically distinguishes between virtual instruments and audio effects via keyword analysis. Instruments shown with a purple badge; effects with a blue badge.
- **Auto-Load VST Plugin Registry on Startup**: Previously scanned plugins load immediately from the local registry when the panel opens, without requiring a manual scan trigger.

#### ⚡ Changed
- **Menu Rename: "Effekte" → "Plugins"**: Top menu bar entry renamed for clarity. The redundant "Audioeffekte (Master)" sub-item has been removed.
- **Settings Dialog Height Increased**: Programmeinstellungen dialog height increased from 550 px to 700 px, preventing scrolling in content-heavy tabs such as "Ordner".
- **VST Scanner: Recursive Directory Scanning**: Plugin scanner now traverses subdirectories up to 6 levels deep, correctly discovering nested VST3 bundles and VST2 DLLs.
- **VST Scanner: Extended Windows Search Paths**: Added `Program Files (x86)` variants and user Documents folders to the Windows scan path list.

#### 🐛 Fixed
- **Duplicate Audio Output Device Entry**: Removed the browser-injected `Default - System (...)` duplicate from the audio output device dropdown in Playback settings.
- **VST Plugin Type Display `(undefined)`**: Fixed field name mismatch — `vst.type` corrected to `vst.format`, resolving the `(undefined)` label in scan results.

## [0.7.5] - 2026-05-31

### Deutsch

#### ✨ Neu
- **ASIO- & Treiberauswahl**: Integration einer professionellen Audiotreiberauswahl (Wave-Treiber, Direct-Sound, ASIO-Treiber) im Reiter „Wiedergabe“ der Programmeinstellungen, inklusive vollständiger Speicherung der Treibertypen und simulierter Echtzeit-Latenzoptimierung.
- **Dynamische Audiopuffer-Größe**: Möglichkeit zur manuellen Anpassung der Pufferanzahl direkt im Einstellungsfenster für feinste Latenzjustierungen.
- **Funktionale VST2- & VST3-Suchpfade (Bugfix)**: Behebung des ehemals funktionslosen "VST-Pfad hinzufügen" Buttons. Hinzugefügt wurde eine ästhetische Auflistung und ein "Entfernen"-Button für VST-Ordnerpfade im Reiter „Ordner“. Der Dateiscanner liest diese zusätzlichen Pfade nun aus der Konfiguration und scannt sie gezielt nach VST2 (`.dll`/`.vst`) und VST3 (`.vst3`) Effekten.

#### 🐛 Behoben
- **Korrektur der unsinnigen Update-Anzeige**: Behebung eines Logikfehlers beim manuellen Update-Check in der Menüleiste. Falls deine installierte lokale Version neuer ist als die öffentliche Version auf dem GitHub-Server (z.B. installierte `v0.7.4` vs. server `v0.7.3`), zeigt der Update-Bildschirm nun logisch und konsistent beide Versionen als `v0.7.4` an.

### English

#### ✨ Added
- **ASIO & Driver Selection**: Implemented professional audio driver selection support (Wave, Direct-Sound, ASIO) inside the "Playback" settings tab, including full persistent settings storage and live simulated latency optimization reports.
- **Tuning of Audio Buffer Size**: Added an editable input field to customize the playback audio buffer count directly in the preferences.
- **Functional VST2 & VST3 Search Paths**: Fixed the previously non-functional "Add VST plug-in path..." button. Added an elegant list display and removal buttons to visually configure VST folders. The backend scanner has been updated to scan these user-defined directories recursively for VST2 (`.dll`/`.vst`) and VST3 (`.vst3`) plugins.

#### 🐛 Fixed
- **Nonsensical Update Version Logic**: Resolved a logical bug in the update check modal. When the installed local version is newer than the public version on the server (e.g., installed `v0.7.4` vs server `v0.7.3`), the check screen now logically renders both as `v0.7.4` instead of stating a lower "latest version".

## [0.7.4] - 2026-05-31

### Deutsch

#### 🐛 Behoben
- **Logo-Wiederherstellung im Info-Modal**: Ersetzung des animierten Wellen-Platzhalters durch die offizielle, starre Version des Markenlogos (`app_icon.png`) für eine konsistente Corporate Identity.
- **Metadaten- & Cover-Art-Unterstützung für FLAC**: ID3-Tags- & Album-Cover-Panel vollständig für das Exportformat `FLAC (Free Lossless)` freigeschaltet, sodass native, standardkonforme Vorbis-Comments und Cover-Bilder fehlerfrei geschrieben werden.
- **Export-Mixdown Layout & Höhe**: Erhöhung der Höhe des Popout-Exportfensters auf `940px` sowie Optimierung aller Abstände und Ränder, damit alle Exportoptionen, Metadaten-Felder und Cover-Bilder lückenlos auf einer einzigen Seite ohne lästiges Scrollen Platz finden.

### English

#### 🐛 Fixed
- **About Logo Restoration**: Replaced the custom animated wave placeholder with the official static brand logo image (`app_icon.png`) for a clean, consistent corporate identity.
- **FLAC Metadata & Cover Art Support**: Fully enabled the ID3/Metadata and cover art panel for `FLAC (Free Lossless)` format exports, ensuring native format-compliant Vorbis Comments and embedded pictures are written perfectly.
- **Export Mixdown Layout & Size**: Increased popout export window height to `940px` and optimized layout paddings/gaps to ensure all settings, inputs, and cover art fit completely on a single page without requiring any scrolling.

## [0.7.3] - 2026-05-31

### Deutsch

#### ✨ Neu
- **Premium Über-Modal (Info)**: Einbindung einer optisch herausragenden custom `AboutModal`-Komponente mit Urheberrechtsangaben, detaillierter Beschreibung, Support-Mailbox und klickbaren Direkt-Verknüpfungen zu PayPal und dem offiziellen GitHub-Repository.
- **Zweisprachiges Benutzerhandbuch**: Umfassende Überarbeitung und Erweiterung des integrierten Benutzerhandbuchs (`ManualModal`) zur lückenlosen Dokumentation des Selektions-Exports, der Metadaten- & Cover-Art-Einbettung, des MIDI-Steuerungs-Setups mit MIDI-Learn und des neuen Software-Updaters.
- **Entwickler-Richtlinien**: Etablierung einer dauerhaften Regel in den `.clinerules`, welche alle zukünftigen KIs dazu verpflichtet, das integrierte Handbuch bei jedem Feature-Release automatisch auf dem neuesten Stand zu halten.

#### ⚡ Verbessert
- **Handbuch-Menübeschriftung**: Den Hilfeeintrag „Handbuch (PDF) herunterladen“ in „Benutzerhandbuch“ umbenannt, da dieser eine interne HTML-Seite innerhalb der App öffnet.

### English

#### ✨ Added
- **Premium About Modal**: Implemented a visually stunning custom `AboutModal` component with copyright, a detailed description, support email link, and clickable dynamic links to PayPal and the official GitHub Repository.
- **Bilingual User Manual**: Extensively updated and expanded the built-in Benutzerhandbuch (`ManualModal`) to cover selection-based export, cover art metadata tagging, Web MIDI control with MIDI-Learn, and the aggregated software updater.
- **Developer Guidelines**: Established a permanent guideline in `.clinerules` requiring that all future feature releases automatically maintain and update the built-in manual.

#### ⚡ Changed
- **Manual Label Correction**: Renamed the Help menu item from "Handbuch (PDF) herunterladen" to "Benutzerhandbuch" to accurately reflect that it opens a custom local HTML manual page.

## [0.7.2] - 2026-05-31

### Deutsch

#### ✨ Neu
- **UI-Feinschliff**: Wiederherstellung des sauberen, zweizeiligen Listen-Layouts für installierte und verfügbare Versionen, um jegliche Quetschungen oder Randausrichtungsprobleme zu eliminieren.
- **Typografie- & Parser-Politur**: Optimierung der Markdown-Überschriftenhierarchie (Level 2, 3 und 4) sowie Erhöhung des Textkontrasts und der Schriftgröße (`text-xs` / `12px` und hellere Grautöne) für eine herausragende Lesbarkeit der zweisprachigen Versionshinweise.

### English

#### ✨ Added
- **UI Polish**: Restored the clean vertical two-row list layout for current and available versions to eliminate all top-padding squishing and alignment issues.
- **Typography & Parser Polish**: Optimized markdown heading hierarchy (Level 2, 3, and 4) and increased text contrast and size (`text-xs` / `12px` and brighter gray colors) to make bilingual release notes exceptionally readable.

## [0.7.1] - 2026-05-31

### Deutsch

#### ✨ Neu
- **UI-Verbesserungen**: Breite des Update-Modals auf `720px` vergrößert und scrollbare Höhen der Changelogs (auf bis zu 380px) für optimalen Lesekomfort während der Prüfung und des Downloads erhöht.
- **Zweisprachige Release-Notes**: Vollständig zweisprachige (EN/DE) Unterstützung für alle zukünftigen Versionshinweise und Update-Fenster.

#### 🐛 Behoben
- **Doppel-v-Präfix**: Kosmetisches Formatierungsproblem behoben, bei dem die neueste Version irrtümlich als `vv0.7.0` in der Menüleiste und in den Update-Schritten dargestellt wurde.
- **UTF-8-Codierung**: Klassischen Windows-PowerShell-Ausgabeumleitungsfehler (Standard-UTF-16LE bei `>`) korrigiert, indem das Extraktionsskript Ausgabedateien direkt als UTF-8 schreibt.

### English

#### ✨ Added
- **UI Adjustments**: Expanded the Update Modal width to `720px` and increased scrollable changelog display box heights (up to 380px) for maximum reading comfort during checking and installation.
- **Bilingual Release Notes**: Full dual English and German support for all future release notes, upgrade notifications, and update screens.

#### 🐛 Fixed
- **Double v Prefix**: Resolved a cosmetic formatting issue where the latest version was rendered with a double `v` (e.g. `vv0.7.0`) in the menu bar and update process screens.
- **UTF-8 Encoding**: Fixed a standard Windows PowerShell redirection encoding issue (defaulting to UTF-16LE in `>`) by rewriting release notes files directly in UTF-8 format within the extraction utility.

## [0.7.0] - 2026-05-31

### Deutsch

#### ✨ Neu
- **MIDI-Unterstützung**: Vollständige, treiberlose Integration der Web MIDI API in den Renderer. Bietet eine flexible MIDI-Learn-Oberfläche zur Belegung beliebiger CC/Note-Befehle für Transport-Aktionen (Play, Stop, Record) und Mixer-Spursteuerungen (Lautstärke, Mute, Solo basierend auf dem sichtbaren Spur-Index statt dynamischen Track-UUIDs).
- **Formatgerechtes Audio-Tagging & Cover-Bilder**: Unterstützung für natives Metadaten-Tagging je nach Format (ID3 für MP3/WAV, Vorbis Comments für FLAC/OGG/OPUS/M4A) inklusive Cover-Bild-Import und Live-Vorschau direkt im Export-Dialog.
- **Premium Changelog-Updater**: Leistungsstarker Software-Updater nach Vorbild des HandBrake-Repositories. Aggregiert automatisch alle Patchnotes übersprungener Versionen chronologisch, bereitet sie leserlich mit Kategorie-Hervorhebungen (`Core:`, `Added:` etc.) auf und hält sie während des gesamten Download- und Update-Prozesses sichtbar.

#### 🐛 Behoben
- **Präziser Selektions-Export**: Mixdown-Export beschränkt sich bei aktiviertem blauen Selektionsbalken nun mathematisch exakt auf das markierte Zeitintervall der Timeline.

### English

#### ✨ Added
- **MIDI Support**: Full, driverless integration of the Web MIDI API in the renderer. Features a flexible MIDI-Learn interface to assign any CC/note command to transport actions (Play, Stop, Record) and mixer channel controls (Volume, Mute, Solo based on visual track index instead of dynamic track UUIDs).
- **Format-compliant Audio Tagging & Cover Art**: Support for native metadata tagging depending on the format (ID3 for MP3/WAV, Vorbis Comments for FLAC/OGG/OPUS/M4A), including cover art image import and live preview directly in the export dialog.
- **Premium Changelog Updater**: High-performance software updater inspired by the HandBrake repository. Automatically aggregates all patch notes of skipped intermediate versions chronologically, renders them readable with category bolding (e.g. `Core:`, `Added:` etc.), and displays them visibly throughout the entire download and update process.

#### 🐛 Fixed
- **Precise Selection Export**: The mixdown export is now mathematically limited to the exact marked time interval on the timeline when the blue selection bar is active.

## [0.6.3] - 2026-05-31

### Deutsch

#### ⚡ Verbessert
- **Tastatur-Fokus bei Reglern**: Die Leertaste zum Starten und Stoppen der Wiedergabe funktioniert nun auch dann zuverlässig, wenn Schieberegler (wie Lautstärken oder Equalizer-Bänder) aktiv sind.
#### 🐛 Behoben
- **Schnitt- & Split-Genauigkeit**: Schnitte an Clip-Grenzen teilen Audio-Objekte noch exakter ohne unerwünschte Stille-Artefakte.

### English

#### ⚡ Changed
- **Spacebar Playback on Controls**: Pressing spacebar to start or stop playback now works seamlessly even while slider controls (such as track volume or equalizer bands) are focused.
#### 🐛 Fixed
- **Precision Splitting**: Splitting and trimming audio objects now operates with sample-accurate precision without gaps.

## [0.6.2] - 2026-05-31

### Deutsch

#### ⚡ Verbessert
- **Export-Auswahl (Blauer Bereich)**: Ein Klick in den blauen Markierungsbereich setzt die Start- und Endpunkte für den Export konsistent und nachvollziehbar. Ein Doppelklick setzt die Auswahl zurück.

### English

#### ⚡ Changed
- **Export Selection Range**: Clicking within the export selection bar reliably defines the export start and end boundaries. Double-clicking clears the selection.

## [0.6.1] - 2026-05-31

### Deutsch

#### 🐛 Behoben
- **Export-Markierung & Abspielkopf**: Der blaue Export-Auswahlbereich bewegt sich beim Abspielen nicht mehr ungewollt mit dem Abspielkopf mit, sondern bleibt fest definiert.
- **Zeitlineal-Navigation**: Klicks ins obere Zeitlineal setzen den Abspielkopf sofort und verzögerungsfrei an die gewünschte Position.

### English

#### 🐛 Fixed
- **Export Range Decoupling**: The export selection marker no longer moves along with the playhead during playback and stays fixed to its designated range.
- **Timeline Ruler Seeking**: Clicking in the timeline ruler instantly positions the playhead at the selected point without delay.

## [0.6.0] - 2026-05-30

### Deutsch

#### ✨ Neu
- **Dauerhafte Ein-/Ausblend-Anfasser**: Die runden Anfasser für Lautstärke-Fades an jedem Tonstück sind nun permanent sichtbar und lassen sich ohne vorheriges Anklicken sofort ziehen.
- **Halbe Wellenform-Ansicht**: Neue Darstellungsoption in den Einstellungen für eine kompakte, nach oben ausgerichtete Wellenformanzeige.

### English

#### ✨ Added
- **Always-Visible Fade Handles**: Circular fade-in and fade-out handles on audio clips are now permanently visible for instant adjustments.
- **Half Waveform View**: Added an option in Appearance settings to display single-sided, compact waveforms.

## [0.5.6] - 2026-05-30

### Deutsch

#### 🐛 Behoben
- **Export in Quellordner**: Die Option „Im Quellordner speichern“ im separaten Exportfenster erkennt nun auch bei komplexen Projekten stets den korrekten Ordner der Originaldatei.

### English

#### 🐛 Fixed
- **Export to Source Directory**: The "Save in import directory" option in the export window now reliably resolves the original audio folder across all setups.

## [0.5.5] - 2026-05-30

### Deutsch

#### 🐛 Behoben
- **Abspielkopf-Grenzen**: Das manuelle Verschieben des Abspielkopfs mit der Maus wurde exakt auf den sichtbaren Spurbereich begrenzt, um ein Hinausrutschen über die Ränder zu verhindern.

### English

#### 🐛 Fixed
- **Playhead Drag Boundaries**: Manually dragging the playhead is now precisely clamped to the track area, preventing accidental over-scrolling.

## [0.5.4] - 2026-05-30

### Deutsch

#### ✨ Neu
- **Live-Positionierung bei Wiedergabe**: Der Abspielkopf kann auch während der laufenden Wiedergabe durch Klick ins Lineal nahtlos und unterbrechungsfrei versetzt werden.
#### 🐛 Behoben
- **Menü-Überlappung**: Der rote Abspielkopf überdeckt die unteren Steuerungsleisten nicht mehr.

### English

#### ✨ Added
- **Seamless Live Seeking**: The playhead can now be clicked and repositioned during playback without audio interruptions.
#### 🐛 Fixed
- **Toolbar Overlay**: The vertical playhead line no longer overlaps bottom toolbars and zoom controls.

## [0.5.3] - 2026-05-30

### Deutsch

#### 🐛 Behoben
- **Wiedergabe-Stopp**: Pausieren mit der Leertaste stoppt die Audioausgabe nun sofort und exakt an der aktuellen Position.

### English

#### 🐛 Fixed
- **Accurate Playback Pause**: Pausing playback with the spacebar now immediately halts audio at the exact playback position.

## [0.5.2] - 2026-05-25

### Deutsch

#### ✨ Neu
- **Zuverlässiges Projektspeichern**: Projektdateien (`.owep`) werden nun mit allen Clip-Positionen, Lautstärken und Schnittpunkten sicher auf der Festplatte abgelegt.

### English

#### ✨ Added
- **Reliable Project Saving**: Audio project files (`.owep`) are saved reliably with all clip positions, volume parameters, and edit points.

## [0.5.1] - 2026-05-24

### Deutsch

#### 🐛 Behoben
- **Projekt-Laden**: Beim Öffnen gespeicherter Projekte werden alle Audiodateien sofort geladen und stehen ohne Verzögerung zur Wiedergabe bereit.
- **Effekt-Grundeinstellungen**: Neutrale Standardwerte für Echo- und Hall-Effekte sorgen für unverfälschten Klang beim Deaktivieren.

### English

#### 🐛 Fixed
- **Project Loading**: Opening saved projects immediately preloads all audio files for instant playback.
- **Default Effect States**: Neutral default parameters for reverb and echo ensure clean audio when bypassing effects.

## [0.5.0] - 2026-05-24

### Deutsch

#### ✨ Neu
- **Verlustfreie Projektmodelle**: Alle Einstellungen wie Spurfarben, Gruppierungen, Lautstärken, Fades und Effekte bleiben beim Speichern und Laden vollständig erhalten.

### English

#### ✨ Added
- **Lossless Project Format**: Full preservation of track colors, clip groups, volumes, fades, and audio effects when saving and reopening projects.

## [0.4.1] - 2026-05-23

### Deutsch

#### ✨ Neu
- **Download-Statistiken im Updater**: Anzeige von Downloadgeschwindigkeit, geladenen Megabytes und verbleibender Restzeit bei Programm-Updates.

### English

#### ✨ Added
- **Update Download Progress**: Real-time display of download speed, transferred file size, and remaining estimated time during updates.

## [0.4.0] - 2026-05-23

### Deutsch

#### ✨ Neu
- **Schnellzugriff Spur hinzufügen**: Die Schaltfläche „Spur hinzufügen“ wurde für einen schnelleren Arbeitsfluss direkt in die Leiste integriert.
- **System-Leistungsanzeige**: Dezente Live-Anzeige für CPU- und RAM-Auslastung im Editor.

### English

#### ✨ Added
- **Quick Track Creation**: Moved the "Add Track" button into the main workspace bar for quicker workflow.
- **System Performance Indicator**: Real-time CPU and memory load indicators in the status bar.

## [0.3.4] - 2026-05-22

### Deutsch

#### ✨ Neu
- **Saubere Deinstallation**: Temporäre Cache-Dateien werden bei der Deinstallation auf Wunsch vollständig bereinigt.

### English

#### ✨ Added
- **Clean Uninstallation**: Option to automatically remove temporary application cache files during uninstallation.

## [0.3.3] - 2026-05-22

### Deutsch

#### ✨ Neu
- **Standard-Exportpfad**: Der in den Einstellungen hinterlegte Speicherpfad wird beim Öffnen des Export-Dialogs automatisch vorausgewählt.

### English

#### ✨ Added
- **Default Export Location**: The configured export directory from settings is automatically selected when opening the export dialog.

## [0.3.2] - 2026-05-22

### Deutsch

#### ⚡ Verbessert
- **Aufgeräumte Benutzeroberfläche**: Design-Optimierungen und transparente App-Icons für eine noch modernere Arbeitsumgebung.

### English

#### ⚡ Changed
- **Interface Polish**: Streamlined UI elements and modern transparent application icons.

## [0.3.1] - 2026-05-22

### Deutsch

#### ✨ Neu
- **Schnellzugriff auf Systemordner**: Direkte Verknüpfungen zu Desktop, Dokumente und Musik im Datei-Browser.
#### 🐛 Behoben
- **Export-Fortschritt**: Verbesserte Fortschrittsanzeige und höchste Audioqualität beim Resampling.

### English

#### ✨ Added
- **Quick System Folders**: Direct shortcuts to Desktop, Documents, and Music folders in the file browser.
#### 🐛 Fixed
- **Export Stability**: Improved progress reporting and pristine audio resampling during exports.

## [0.3.0] - 2026-05-22

### Deutsch

#### ✨ Neu
- **Audioaufnahme**: Direkte Aufnahme über Mikrofon oder Soundkarte auf eine ausgewählte Spur im Editor.
- **Geschwindigkeit anpassen**: Ändern des Wiedergabetempos ohne Beeinflussung der Tonhöhe (Time-Stretching).
- **Dateizuordnung**: Doppelklick auf `.owep`-Projektdateien im System-Explorer öffnet diese direkt im Omega Wave Editor.

### English

#### ✨ Added
- **Audio Recording**: Native recording from microphone or line-in directly onto a timeline track.
- **Time Stretching**: Adjust playback speed without altering the pitch.
- **File Association**: Double-clicking `.owep` project files in the OS file manager opens them directly in the editor.

## [0.2.5] - 2026-05-22

### Deutsch

#### 🐛 Behoben
- **Rückgängig / Wiederholen**: Schnelle Undo- und Redo-Aktionen über Strg+Z und Strg+Y laufen nun vollkommen ruckelfrei und stabil.

### English

#### 🐛 Fixed
- **Undo / Redo Reliability**: Rapid undo and redo actions (Ctrl+Z / Ctrl+Y) now run smoothly and reliably.

## [0.2.4] - 2026-05-22

### Deutsch

#### ⚡ Verbessert
- **Programmstart**: Schnellere Initialisierung und zuverlässiger Start der Arbeitsumgebung.

### English

#### ⚡ Changed
- **Application Startup**: Faster initialization and rock-solid workspace loading on launch.

## [0.2.3] - 2026-05-22

### Deutsch

#### ✨ Neu
- **Start-Dashboard**: Praktisches Startfenster für schnellen Zugriff auf letzte Projekte und Vorlagen.
- **Präzisions-Schnitte**: Schnelltasten (T, C, U) zum sekundengenauen Schneiden und Kürzen ausgewählter Tonstücke.

### English

#### ✨ Added
- **Start Dashboard**: Convenient startup panel for quick access to recent projects.
- **Precision Cuts**: Keyboard shortcuts (T, C, U) for quick frame-accurate splitting and trimming.

## [0.2.2] - 2026-05-22

### Deutsch

#### ✨ Neu
- **Zweisprachiges Handbuch**: Ausführliche Benutzerhilfe auf Deutsch und Englisch direkt in der Anwendung verfügbar.
#### 🐛 Behoben
- **Update-Prüfung**: Zuverlässiger Verbindungsaufbau zum Update-Server.

### English

#### ✨ Added
- **Bilingual User Guide**: Comprehensive built-in help manual in both English and German.
#### 🐛 Fixed
- **Update Connection**: Improved resilience when checking for application updates.

## [0.2.1] - 2026-05-22

### Deutsch

#### ⚡ Verbessert
- **Versionsanzeige**: Aktuelle Versionsnummer wird transparent im Hauptmenü und im Über-Dialog dargestellt.

### English

#### ⚡ Changed
- **Version Display**: Version number clearly indicated in the main menu and About dialog.

## [0.2.0] - 2026-05-22

### Deutsch

#### ✨ Neu
- **Multi-Plattform Unterstützung**: Volle Unterstützung für Windows, macOS und Linux.
#### 🐛 Behoben
- **Lautstärkeregelung**: Exakte Skalierung und weiche Übergänge ohne Tonsprünge.

### English

#### ✨ Added
- **Cross-Platform Support**: Complete builds and features for Windows, macOS, and Linux.
#### 🐛 Fixed
- **Volume Regulation**: Smooth gain scaling and responsive fader adjustments.

## [0.1.0] - 2026-05-22

### Deutsch

#### ✨ Neu
- **Verlustfreier Audio-Editor**: Initiales Release mit Mehrspur-Zeitleiste, verlustfreiem Schnitt, Echtzeit-Effekten und automatischer Update-Prüfung.

### English

#### ✨ Added
- **Lossless Audio Editor**: Initial release featuring multi-track timeline, lossless editing, real-time effects, and automatic update checking.
