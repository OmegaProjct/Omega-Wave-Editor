# Changelog

The format is based on Keep a Changelog. Dieses Projekt nutzt das klassische Semantic Versioning (`X.Y.Z`).

## [0.9.4] - 2026-06-12

### English

#### Fixed
- **Update Loop Resolved**: Removed stale installer assets from the v0.9.3 GitHub release that caused the auto-updater to download an older version. The release now only contains the correct 0.9.3 installers and `latest.yml`.
- **Duplicate X Button in Update Window**: The Update popout window now uses a frameless Electron window, eliminating the native title bar's X button. The Update dialog's own close button now correctly closes the window in both inline and popout mode.
- **Update Window Draggable**: The header of the frameless Update window is now properly marked as a drag region so the window can still be moved.

### Deutsch

#### Behoben
- **Update-Schleife behoben**: Veraltete Installer-Assets wurden aus dem v0.9.3-GitHub-Release entfernt, die dazu führten, dass der Auto-Updater eine ältere Version heruntergeladen hat. Das Release enthält nun nur noch die korrekten 0.9.3-Installer und `latest.yml`.
- **Doppelter X-Button im Update-Fenster**: Das Update-Popout-Fenster verwendet jetzt ein rahmenloses Electron-Fenster, wodurch der native Titelleisten-X-Button entfernt wird. Der eigene Schließen-Button des Update-Dialogs schließt das Fenster jetzt korrekt in beiden Modi (Inline und Popout).
- **Update-Fenster verschiebbar**: Die Kopfzeile des rahmenlosen Update-Fensters ist jetzt korrekt als Zieh-Bereich markiert, sodass das Fenster weiterhin verschoben werden kann.

---

## [0.9.3] - 2026-06-12

### English

#### Added
- **Log Viewer Session History**: Expanded the Diagnostic Log Viewer in the Help menu to include a vertical session log list showing all stored log files, their file sizes, and a total storage indicator.
- **Feedback & Bug Report System**: Integrated a feedback and bug reporting panel within the Help tabs, allowing users to submit feedback with text descriptions, attach their latest session log, and drag-and-drop or paste up to 10 screenshots from the clipboard.
- **Bilingual Update Patchnotes**: Added a language switcher (DE/GB) inside the Update dialog to view patchnotes in both German and English.

#### Changed
- **Removed Duplicate Title Bar Buttons**: Removed unnecessary duplicate close buttons (X) in popout windows (Export Progress, Update, Settings, About, and Manual) to simplify the window chrome.

#### Fixed
- **Log Management & Cleanup**: Implemented automatic log file rotation/cleanup on startup (keeping maximum 30 logs) and allowed users to delete individual log files directly from the UI.

### Deutsch

#### Hinzugefügt
- **Protokollverlauf im Log-Viewer**: Erweiterung des Diagnose-Protokoll-Viewers im Hilfe-Menü um eine vertikale Sitzungsliste, die alle gespeicherten Protokolldateien, deren Dateigrößen und eine Anzeige des Gesamtspeicherverbrauchs anzeigt.
- **Feedback- & Fehlerberichtsystem**: Integration eines Feedback- und Fehlerberichts-Panels in den Hilfe-Tabs. Benutzer können Feedback mit Textbeschreibungen einreichen, ihr aktuelles Sitzungsprotokoll anhängen und bis zu 10 Screenshots per Drag-and-Drop oder aus der Zwischenablage einfügen.
- **Zweisprachige Update-Patchnotes**: Sprachumschalter (DE/GB) im Update-Dialog integriert, um die Patchnotes wahlweise auf Deutsch oder Englisch anzuzeigen.

#### Geändert
- **Doppelte X-Buttons in Titelleisten entfernt**: Unnötige, doppelte Schließen-Schaltflächen (X) in Popout-Fenstern (Export-Fortschritt, Updates, Einstellungen, Über uns und Handbuch) wurden entfernt, um das Design aufzuräumen.

#### Behoben
- **Log-Verwaltung & Bereinigung**: Automatische Protokollbereinigung beim Programmstart (maximal 30 Protokolle bleiben erhalten) und Möglichkeit, einzelne Protokolldateien direkt über die Benutzeroberfläche dauerhaft vom PC zu löschen.

## [0.9.2] - 2026-06-12

### English

#### Fixed
- **Update Progress in Popouts**: Fixed a bug where progress events during software updates were sent only to the main window, causing the progress bar to remain stuck at 0% when the update dialog was opened as a separate popout window.

### Deutsch

#### Behoben
- **Update-Fortschritt im Popout**: Behebung eines Fehlers, bei dem die Fortschritts-Events während des Update-Downloads nur an das Hauptfenster gesendet wurden. Dies verhinderte die Aktualisierung des Ladebalkens (blieb bei 0 % stehen), wenn der Update-Dialog als separates Popout-Fenster geöffnet war.

## [0.9.1] - 2026-06-12

### English

#### Added
- **Diagnostic Logging System**: Integrated a comprehensive file logger (`app.log` in AppData) with automatic log rotation (max 5 MB, renaming to `app.log.old`) that captures main process initialization, unhandled exceptions, IPC communication, audio and VST operations, and system events.
- **Timeline Event Tracking**: Real-time millisecond-precise logging of all timeline actions, including clip dragging/repositioning, volume adjustments, fades (in/out), track mute/solo toggles, and lock states.
- **Diagnostic Log Viewer**: Added a premium dark glassmorphic Log Viewer modal accessible via `Help -> Diagnose-Protokolle...` with log level filtering (Info, Warning, Error, Debug), real-time auto-refresh, search capabilities, clipboard copy, and file explorer linkage.
- **Unhandled Crash Handling**: Main and renderer process exception hooks to capture and log crashes or unhandled promise rejections directly into the log file.

#### Changed
- **CLI and Headless Stderr Redirection**: Automatic redirection of all server logs to `console.error` (stderr) when run in MCP mode (via `--mcp` or `OMEGA_MCP_MODE=true`) to avoid protocol collisions on stdout.
- **User Manual Chapter 9**: Added a dedicated section detailing diagnostic features, error reporting, and log directory locations in the in-app manual.

#### Fixed
- **Preload and Renderer Type Alignment**: Exposed unified typescript type definitions and declarations in both preload and renderer configurations for robust window context APIs.

### Deutsch

#### Hinzugefügt
- **Diagnose-Protokollierung**: Integration eines umfassenden Logging-Systems (`app.log` im AppData-Verzeichnis) mit automatischer Dateirotation (max. 5 MB, Umbenennung in `app.log.old`). Protokolliert Applikationsstart, unbehandelte Ausnahmen, IPC-Aufrufe, VST-Bridge-Aktivitäten und Systemereignisse.
- **Timeline-Event-Tracking**: Echtzeit-Protokollierung aller timeline-relevanten Aktionen (Verschiebungen von Audio-Clips auf die Millisekunde genau, Volume-Änderungen, Fades, Stummschaltungen, Solo-Modi und Spur-Sperren).
- **Diagnose-Protokolle Viewer**: Premium-Log-Viewer-Modal im edlen dunklen Glassmorphismus-Design (aufrufbar über `Hilfe -> Diagnose-Protokolle...`). Bietet Pegelfilter (Info, Warnung, Fehler, Debug), Echtzeit-Aktualisierung, Suchfunktion, Kopieren in die Zwischenablage und Direktlink zum Datei-Explorer.
- **Abfangen von Abstürzen**: Globale Listener im Haupt- und Renderer-Prozess, die unbehandelte Ausnahmen (Exceptions) und Rejections abfangen und mit vollständigen Stacktraces im Logfile dokumentieren.

#### Geändert
- **Standardfehler-Umleitung im MCP-Modus**: Automatische Umleitung aller Logausgaben im MCP-Modus (via `--mcp` oder `OMEGA_MCP_MODE=true`) auf `console.error` (stderr), um Protokollkollisionen über `stdout` zu verhindern.
- **Ergänzung des Benutzerhandbuchs (Kapitel 9)**: Neues Kapitel „Diagnose & Fehlerbehebung“ im Handbuch, das die Funktionsweise des Loggers und die Speicherpfade beschreibt.

#### Behoben
- **Typdeklarationen-Angleichung**: Bereitstellung konsistenter TypeScript-Typdeklarationen in Preload- und Renderer-Konfigurationen für die neuen Window-APIs.

## [0.9.0] - 2026-06-08

### English

#### Added
- **5x Playback Speed**: Expanded fast-forward (L) and rewind (J) speed cycling to support up to 5-fold speeds (cycling through 1.0x -> 1.5x -> 2.0x -> 3.0x -> 4.0x -> 5.0x).
- **Floating Region Names**: Implemented dynamically floating clip/region names that remain centered in the visible part of the region in the viewport while scrolling horizontally.
- **Configurable Navigation Steps**: Added settings under the "Playback" ("Wiedergabe") tab to configure different jump step sizes for ArrowLeft and ArrowRight keys when playing vs when stopped (options: 0.5s, 1s, 3s, 5s, 10s).
- **Customizable Transport Shortcuts**: Added six new actions under the "Keyboard Shortcuts" ("Tastenkürzel") settings tab:
  - `setPlaybackStart` (default: ArrowDown): Relocates return position for spacebar stop to the current playhead.
  - `playAtPosition` (default: K): Starts playback forward (1x) or pauses at the current location.
  - `playBackward` (default: J): Plays backward, cycling speed (-1.0x -> -1.5x -> -2.0x) on consecutive presses.
  - `playForward` (default: L): Plays forward, cycling speed (1.0x -> 1.5x -> 2.0x) on consecutive presses.
  - `jumpBackward` (default: ArrowLeft): Jumps backward by configured step size.
  - `jumpForward` (default: ArrowRight): Jumps forward by configured step size.
- **Auto-Stop at Project Start**: Automatically stops backward playback and resets playhead to 0 when reaching the start of the project.
- **Global Gap Closing**: Reformed the "Lücken schließen" (Find and Close Gaps) algorithm to work globally across all tracks using an interval-merging algorithm. This closes timeline gaps while perfectly preserving the relative timing and alignment of overlapping, split stereo, or grouped clips.
- **Real-Time Gap Closing Audio Rescheduling**: Integrated the real-time audio rescheduling engine with the gap closing mechanism, instantly repositioning playing audio streams for all shifted clips without requiring a manual playback restart.
- **Real-Time Region Rescheduling**: Implemented dynamic Web Audio rescheduling for audio clips during active playback. Moving, trimming, or dragging a clip on the timeline now updates its play offset and routing instantly in real-time.
- **Rescheduling Audio Throttling**: Added a 50ms throttle-with-trailing-edge scheduler when dragging timeline clips to guarantee glitch-free, high-performance playback during active movement.
- **Track Volume Fader Mute Toggle**: Clicking the fader volume icon button now silences the track fader (sets volume to 0) and saves the previous volume state. Clicking it again restores the previous volume level.

#### Changed
- **Context Menu Theme**: Redesigned all timeline context menus (Region context menu, Editor context menu, Track context menu) and their submenus from light mode to a premium glassmorphic dark theme (`bg-[#1e2124]/95 text-gray-200 border-gray-700/60 rounded-lg shadow-2xl`) matching the rest of the application.
- **Chevron Submenu Indicators**: Replaced standard text arrows (`▸` / `▶`) with Lucide-React `ChevronRight` icons featuring dynamic hover highlights (`text-gray-500 group-hover:text-white`) to prevent operating system emoji conversion issues on Windows.
- **Track Volume Slider Layout**: Moved the volume slider to a dedicated, permanently visible row below the other track control buttons (Lock, Solo, Mute) to avoid clipping and overlap. Implemented a responsive vertical layout that hides elements cleanly when the track height is compressed.
- **Track Controls Styling**: Redesigned track header controls (Lock, Solo, Mute, and Volume) with larger, high-contrast buttons, distinct color-coded backgrounds (Blue for Lock, Yellow/Amber for Solo, Red for Mute, Green/Emerald for Volume), and light readable text/icons for both active and inactive states.
- **Time Ruler Readability**: Increased time ruler font size to 11px and adjusted text color to a lighter gray for higher visual contrast and readability.
- **User Manual Shortcuts Section**: Updated the in-app user guide with a dedicated reference for the new transport hotkeys.

#### Fixed
- **Settings Shortcuts Serialization**: Registered new transport hotkeys inside the settings IPC defaults so they save and load reliably in `settings.json`.
- **Playhead Containment Clipping**: Bound the playhead rendering and dragging coordinates to the editor workspace (from `128px` onwards) and clipped its overflow, preventing the red playhead line and handle from overlaying the track headers or the master volume column when scrolling.
- **Timecode Ruler Label Stacking**: Added `whitespace-nowrap` wrapping prevention to timecode ruler tick labels, keeping minute and second numbers (e.g., `1m 2s`) on a single line instead of stacking them vertically.
- **Unlink/Split Priority for Stereo Regions**: Optimized the "Kettenspreng-Symbol" (unlink button) behavior. Splitting stereo regions into physical left and right mono tracks is now prioritized and executed immediately even if the region belongs to an active group, clearing its `groupId` so they can be dragged independently in the split track view.
- **Crossfades for Independent Channels**: Excluded regions playing on different channels (like left-only and right-only mono clips) from automatic crossfade calculations. Fades are no longer visually rendered or acoustically scheduled between mismatched channel formats on the same track.
- **Rigid Group Timeline Boundary**: Enforced a strict negative boundary limit for grouped region dragging. When any region in a linked group hits the beginning of the timeline (`0s`), the entire group's movement locks, preventing regions from shifting or overlapping with each other at the timeline boundary.
- **Group Dragging Drift**: Fixed a bug where grouped or linked clips would drift apart exponentially during dragging. Grouped region positions are now calculated using their absolute initial coordinates at click time.
- **Stereo Settings Merging and Splitting**: Toggling between "Stereo auf einer Spur" and "Stereo auf zwei Spuren" in the settings now automatically merges split left/right mono tracks back to a single track (preserving their relative offsets and making the track longer if needed) or splits them back onto adjacent tracks, including real-time audio rescheduling during playback.

### Deutsch

#### Hinzugefügt
- **5-fache Abspielgeschwindigkeit**: Erweiterung der Geschwindigkeitsstufen für Vorlauf (L) und Rücklauf (J) auf bis zu 5-faches Tempo (Zyklus: 1,0x -> 1,5x -> 2,0x -> 3,0x -> 4,0x -> 5,0x).
- **Schwebende Region-Namen**: Implementierung von dynamisch schwebenden Clip-/Objekt-Namen, die beim horizontalen Scrollen weich mitwandern und immer zentriert im sichtbaren Bereich des Clips bleiben.
- **Konfigurierbare Navigations-Sprünge**: Einstellungen im Reiter „Wiedergabe“ zur separaten Definition von Sprungweiten für Links-/Rechtspfeiltasten während des Abspielens und im Stillstand (Optionen: 0,5s, 1s, 3s, 5s, 10s).
- **Konfigurierbare Transport-Tastaturkürzel**: Integration von sechs neuen Aktionen im Einstellungsreiter „Tastenkürzel“:
  - `setPlaybackStart` (Standard: PfeilAb): Versetzt die Rückkehrposition für das Stoppen per Leertaste auf die aktuelle Abspielposition.
  - `playAtPosition` (Standard: K): Startet die Vorwärtswiedergabe (1x) oder pausiert an Ort und Stelle.
  - `playBackward` (Standard: J): Spielt rückwärts ab und erhöht zyklisch die Geschwindigkeit bei mehrmaligem Drücken (-1,0x -> -1,5x -> -2,0x).
  - `playForward` (Standard: L): Spielt vorwärts ab und erhöht zyklisch die Geschwindigkeit bei mehrmaligem Drücken (1,0x -> 1,5x -> 2,0x).
  - `jumpBackward` (Standard: PfeilLinks): Springt um die konfigurierte Schrittgröße zurück.
  - `jumpForward` (Standard: PfeilRechts): Springt um die konfigurierte Schrittgröße vorwärts.
- **Automatischer Stopp am Timeline-Anfang**: Stoppt die Rückwärtswiedergabe automatisch und setzt den Playhead auf 0, wenn der Anfang des Projekts erreicht wird.
- **Spurübergreifendes Lücken-Schließen**: Reformierung des Algorithmus für "Lücken finden & schließen". Durch spurübergreifende Intervallzusammenführung werden Lücken geschlossen, während die relativen zeitlichen Positionen (Relationen) überlappender, gruppierter und geteilter Stereo-Clips exakt erhalten bleiben.
- **Echtzeit-Audio bei Lücken-Schließung**: Direkte Anbindung des Echtzeit-Reschedulings an die Lücken-Schließfunktion. Bei laufendem Abspielen springen die Audiosignale aller verschobenen Clips sofort knackfrei an die neue Position, ohne Neustart der Wiedergabe.
- **Echtzeit-Region-Neuplanung**: Dynamische Neuplanung von Audioquellen (Web Audio API) bei laufender Wiedergabe. Das Verschieben oder Trimmen von Clips auf der Timeline wirkt sich nun sofort in Echtzeit auf die Wiedergabeposition und das Audio-Routing aus.
- **Audio-Rescheduling-Drosselung**: Integration einer 50-ms-Drosselung mit Trailing-Edge-Timeout beim Ziehen von Clips, um Knackser und Engine-Überlastungen während der Bewegung auszuschließen.
- **Spur-Lautstärkeregler Stummschaltung**: Ein Klick auf das Lautstärkesymbol neben dem Fader setzt die Lautstärke auf 0 und speichert den vorherigen Pegel. Ein erneuter Klick stellt die Originallautstärke wieder her.

#### Geändert
- **Dunkler Glassmorphismus für Kontextmenüs**: Neugestaltung aller Timeline-Rechtsklick-Menüs (Region-Menü, Editor-Menü, Spur-Menü) sowie deren Untermenüs von hellgrau auf ein edles, dunkles Glassmorphismus-Design (`bg-[#1e2124]/95 text-gray-200 border-gray-700/60 rounded-lg shadow-2xl`) passend zum übrigen DAW-Theme.
- **Chevron-Submenü-Icons**: Ersetzung der textbasierten Pfeilsymbole (`▸` / `▶`) durch standardisierte Lucide-React `ChevronRight` Icons mit dynamischem Highlight-Verhalten (`text-gray-500 group-hover:text-white`), um fehlerhafte Windows-Emoji-Darstellungen zu umgehen.
- **Spur-Lautstärkeregler-Layout**: Der Lautstärkeregler wurde in eine eigene, dauerhaft sichtbare Zeile unterhalb der anderen Kontrolltasten (Sperren, Solo, Mute) verschoben, um Überlappungen zu verhindern. Zudem wurde ein adaptives Layout implementiert, das Bedienelemente bei geringerer Spurhöhe automatisch ausblendet.
- **Spur-Steuerelemente**: Neugestaltung der Spur-Kontrolltasten (Sperren, Solo, Stummschaltung, Lautstärke) mit vergrößerten Symbolen/Schriften, farbcodierten Hintergründen (Blau für Sperren, Gelb/Orange für Solo, Rot für Mute, Grün für Lautstärke) und kontrastreichen hellen Schriftzugen zur besseren Unterscheidbarkeit.
- **Bessere Lesbarkeit des Time-Rulers**: Schriftgröße auf 11px vergrößert und Farbe auf ein helleres Grau angepasst, um den visuellen Kontrast und die Lesbarkeit deutlich zu verbessern.
- **Aktualisierung des Benutzerhandbuchs**: Ergänzung der neuen Steuertasten und Tastaturkürzel im integrierten Hilfebereich zur einfachen Referenzierung.

#### Behoben
- **Tastaturkürzel-Serialisierung**: Registrierung der neuen Shortcuts in den IPC-Einstellungen-Standardwerten, damit sie stabil in `settings.json` gespeichert und geladen werden.
- **Playhead-Bereichsbegrenzung**: Begrenzung der Abspielnadel (samt rotem Handle) auf den tatsächlichen Editor-Bereich (ab `128px` von links) und Ausblenden bei Links-Überlauf, sodass sie nicht mehr fälschlicherweise die Spur-Steuerungen oder den Master-Volume-Fader überlagert.
- **Einzeilige Timecode-Ruler-Labels**: Verhinderung von Zeilenumbrüchen bei Zeitcode-Ticks durch Zuweisung von `whitespace-nowrap`, wodurch Labels ab 1 Minute (z. B. `1m 2s`) einzeilig nebeneinander stehen bleiben, statt zweizeilig zu stapeln.
- **Direktes Stereo-Splitting bei Kettensprengung**: Optimierung des Verhaltens beim Klicken auf das Kettenspreng-Symbol. Das physische Aufteilen einer Stereo-Region in linke und rechte Mono-Spuren wird nun immer sofort und prioritär durchgeführt (unter Löschen der `groupId`), selbst wenn der Clip Teil einer Gruppe ist. Dadurch lassen sich die gesprengten Kanäle in der geteilten Ansicht direkt unabhängig voneinander verschieben.
- **Keine Crossfades bei ungleichen Audiokanälen**: Automatische Crossfades (sowohl visuell im UI als auch akustisch in der Audio-Engine) werden nun unterdrückt, wenn sich Clips auf getrennten Audiokanälen (z. B. eine left-only und eine right-only Region) auf derselben Spur überlappen.
- **Starre Gruppenverschiebung am Timeline-Limit**: Begrenzung der negativen Verschiebung von Clip-Gruppen nach links. Sobald ein Element einer verlinkten Gruppe den Anfang der Timeline (`0s`) erreicht, blockiert die Verschiebung für die gesamte Gruppe, sodass sich die Clips nicht mehr übereinander schieben.
- **Gruppen-Drift beim Ziehen**: Behebung des Fehlers, bei dem verlinkte oder gruppierte Clips beim Verschieben exponentiell auseinanderdrifteten. Gruppenpositionen werden nun präzise auf Basis der absoluten Ausgangsdaten beim Klick ermittelt.
- **Spuren-Zusammenführung bei Stereo-Umstellung**: Das Umschalten zwischen "Stereo auf einer Spur" und "Stereo auf zwei Spuren" in den Einstellungen führt getrennte linke/rechte Mono-Spuren automatisch wieder zusammen (unter Beibehaltung ihres zeitlichen Versatzes und Anpassung der Spurlänge) bzw. teilt sie wieder auf separate Spuren auf. Die Änderungen werden während des Abspielens in Echtzeit neu eingeplant.

## [0.8.18] - 2026-06-07

### English

#### Added
- **Changelog Viewer**: Added a comprehensive in-app Changelog Viewer (`Help -> Changelog...`) displaying full historical updates with side-by-side versions, dates, localized language tabs (German 🇩🇪 / English 🇬🇧), custom category coloring (Added, Fixed, Changed, Removed), and inline Markdown styling.
- **Embedded Changelog Resource**: Configured the build pipeline to embed the `CHANGELOG.md` inside production bundles, allowing the in-app viewer to read release history directly in packaged builds.

### Deutsch

#### Hinzugefügt
- **Changelog-Viewer**: Implementierung einer vollständigen In-App-Changelog-Anzeige (`Hilfe -> Changelog...`), die alle historischen Updates mit Versionsliste, Datum, Sprachumschaltung (Deutsch 🇩🇪 / Englisch 🇬🇧), farbigen Kategorie-Etiketten und Inline-Markdown-Rendering darstellt.
- **Eingebettete Changelog-Ressource**: Konfiguration des Build-Prozesses zur Einbettung der `CHANGELOG.md` in die Production-Builds, sodass der In-App-Changelog-Viewer die Versionshistorie in der gepackten Anwendung direkt auslesen kann.

## [0.8.17] - 2026-06-07

### English

#### Fixed
- **Update Download**: Fixed update installer download getting stuck at 0% progress. The HTTPS download request and file stream are now properly tracked, enabling reliable cancellation and preventing hangs. Added a 30-second connection timeout and correct redirect handling.
- **Update Dialog Markdown Rendering**: Patch notes no longer show raw `**bold**` asterisks. Inline bold markdown is now correctly parsed and rendered as bold text.
- **Update Dialog Pulsing Dots**: Removed the distracting pulsing animation from the language section dots (Deutsch / English) in the patch notes view.
- **Update Dialog Font Size**: Increased the font size throughout the patch notes panel for better readability.

### Deutsch

#### Behoben
- **Update-Download**: Behebung eines Fehlers, bei dem der Download des Installers bei 0% hängenblieb. Die HTTPS-Verbindung und der Dateistream werden nun korrekt verfolgt, wodurch Abbruch und Redirect-Handling zuverlässig funktionieren. Zusätzlich wurde ein 30-Sekunden-Verbindungstimeout hinzugefügt.
- **Update-Dialog Markdown-Darstellung**: Patchnotes zeigen keine rohen `**fett**`-Sternchen mehr an. Inline-Bold-Markdown wird nun korrekt als fetter Text gerendert.
- **Update-Dialog pulsierende Punkte**: Die störende Pulsieranimation der Sprachabschnitts-Punkte (Deutsch / Englisch) in der Patchnotes-Ansicht wurde entfernt.
- **Update-Dialog Schriftgröße**: Die Schriftgröße im Patchnotes-Panel wurde für bessere Lesbarkeit vergrößert.

## [0.8.16] - 2026-06-07

### English

#### Fixed
- **Update Dialog Dynamic Sizing**: Constrained the update modal height to always fit within the visible window area, ensuring action buttons remain visible without scrolling. Added dynamic window resizing for popout mode.

### Deutsch

#### Behoben
- **Dynamische Update-Dialog-Größe**: Begrenzung der maximalen Höhe des Update-Dialogs auf den sichtbaren Fensterbereich, sodass die Aktions-Buttons (Herunterladen, Später) immer sichtbar bleiben und kein Scrollen oder Fenstervergrößern nötig ist. Dynamische Fenstergrößenanpassung im Popout-Modus hinzugefügt.

## [0.8.15] - 2026-06-07

### English

#### Added
- **Waveform Scaling & Amplitude Boost**: Integrated vertical amplitude scaling (boosted visual levels by 2.5x) for the main waveform and added direct support for the half vs. full waveform display configuration.

#### Changed
- **Popout-Only Audio Recording**: Configured the audio recording interface to default strictly to the dedicated native popout window mode, removing redundant embedded UI elements.

#### Fixed
- **Spacebar Playback Control**: Prevented immediate double-triggering/keyboard auto-repeat of the Spacebar, restoring expected play/pause toggling behavior.
- **Timeline Scrubbing Fluidity**: Fixed playhead jumpiness when clicking or dragging on the timeline ruler for smoother manual scrubbing.
- **Audio Preload Async Restores**: Resolved a race condition during startup and file loading that could block audio playback from initiating correctly.
- **UI Element Cleanup**: Removed unused/non-functional toolbar graphic placeholders.

### Deutsch

#### Hinzugefügt
- **Wellenform-Skalierung & Amplituden-Boost**: Anpassung der vertikalen Amplitudendarstellung (2.5-fache visuelle Anhebung) in der Hauptwellenform und direkte Unterstützung der Konfiguration für halbe und ganze Wellenformdarstellung.

#### Geändert
- **Aufnahmedialog nur als Popout**: Der Audio-Aufnahmedialog öffnet sich nun standardmäßig immer direkt in einem separaten nativen Fenster (Popout-Only), und funktionslose eingebettete UI-Elemente wurden entfernt.

#### Behoben
- **Leertasten-Wiedergabesteuerung**: Deaktivierung des automatischen Tastatur-Repeats bei gedrückter Leertaste, wodurch das fehlerhafte wiederholte Play/Pause-Verhalten behoben wurde.
- **Flüssiges Timeline-Scrubbing**: Behebung von Playhead-Sprüngen bei Klicks und Ziehbewegungen im Timeline-Lineal zur Gewährleistung einer flüssigen manuellen Positionsverschiebung.
- **Audio-Preload Asynchronitäts-Korrekturen**: Behebung einer Race-Condition beim Datei-Preload und der Audio-Engine-Initialisierung, die in manchen Fällen das Abspielen verhinderte.
- **Grafik-Bereinigung**: Entfernung funktionsloser Button-Grafiken aus der Benutzeroberfläche.

## [0.8.14] - 2026-06-02

### English

#### Added
- **Ehrliche UI-Erklärung**: Integrated a precise, native-feeling German description in the Premium Hybrid Fallback VST Editor when `hasEditor === false` to transparently explain that the plugin does not feature a native GUI by design.
- **Robust Parameter Flow**: Enhanced `VstEditorWindow.tsx` parameter dispatching to ensure parameter sliders communicate flawlessly with the C++ Native Host for GUI-less VST2 plugins even while fallback UI is active.

### Deutsch

#### Hinzugefügt
- **Ehrliche UI-Erklärung**: Einbau einer verständlichen und präzisen deutschen Erklärung im Premium Hybrid Fallback-Editor für GUI-lose Plugins (`hasEditor === false`), um transparent zu verdeutlichen, dass das Plugin konstruktionsbedingt über keine herstellereigene grafische Benutzeroberfläche verfügt.
- **Robuste Parameter-Steuerung**: Anpassung der Parameter-Weiterleitung in `VstEditorWindow.tsx`, sodass Regler-Änderungen im Fallback-Editor für echte GUI-lose VST2-Plugins live und verlustfrei an den C++ Singleton-Host übertragen werden.

## [0.8.13] - 2026-06-02

### English

#### Fixed
- **Automatic Fake Parameter Cleanup**: Implemented an automated cleanup routine within `VstPluginRack.tsx` (`loadRackState`), `VstEditorWindow.tsx` (`loadPluginFromStorage`), and `EffectsPanel.tsx` (sidebar click handler) that filters loaded real plugins for invented parameters (defined by the absence of an index property) and resets their parameter lists to prevent outdated fake parameters from seeding controls.

### Deutsch

#### Behoben
- **Automatische Bereinigung fiktiver Parameter**: Integration einer automatischen Reinigungslogik in `VstPluginRack.tsx` (`loadRackState`), `VstEditorWindow.tsx` (`loadPluginFromStorage`) und `EffectsPanel.tsx` (Sidebar-Klick-Handler), um geladene reale Plugins auf fiktive Parameter (gekennzeichnet durch das Fehlen einer `index`-Eigenschaft) zu prüfen und deren Parameterliste zurückzusetzen, wodurch verbleibende fiktive Parameter aus älteren Sessions automatisch aus dem LocalStorage entfernt werden.

## [0.8.12] - 2026-06-02

### English

#### Added
- **Parameters Grid Loading Placeholder**: Render a dynamic and elegant loading placeholder within the VST parameters fallback grid in `VstEditorWindow.tsx` when parameters have not yet been populated by the host.

#### Fixed
- **Empty VST Parameter Safeguards**: Integrated robust boundary guards inside `VstEditorWindow.tsx` (e.g. within `handleParamChange`) to securely prevent UI crashes when external scanned plugins possess temporary empty parameter arrays.

### Deutsch

#### Hinzugefügt
- **Parameter-Grid-Ladeplatzhalter**: Einbau eines dynamischen und eleganten Lade-Platzhalters im VST-Ausweich-Parametergrid von `VstEditorWindow.tsx`, solange noch keine Parameter vom Host geladen wurden.

#### Behoben
- **Absicherung leerer VST-Parameterlisten**: Implementierung robuster Guards in `VstEditorWindow.tsx` (u.a. in `handleParamChange`), um UI-Abstürze bei temporär leeren Parameterlisten gescannter externer Plugins zuverlässig zu verhindern.

## [0.8.11] - 2026-06-01

### English

#### Added
- **Native C++ ASIO Integration**: Implemented a fully functional native COM client to query and interact with registered system ASIO drivers (e.g. Yamaha Steinberg, Realtek, ASIO4ALL). Features dynamic output channel selection, sample size parameter configurations constrained to hardware-safe boundaries, real-time millisecond and sample latency reporting, and native control panel triggering.
- **Premium Hybrid Fallback VST Editor**: Configured `VstEditorWindow.tsx` to automatically trigger a visual fallback interface when a mockup or a VST3 plugin is loaded. Features high-fidelity interactive parameter sliders synced with localStorage/DAW state and a real-time glowing canvas audio visualizer.
- **Dynamic Window Resizing API**: Exposed `resizeWindow` via preload script to allow popout windows to dynamically adjust their sizes to match their natural content heights.

#### Fixed
- **Invisible Audio Recording Button**: Standardized button dimensions in `AudioRecordingModal.tsx` to standard spacing classes (`w-4 h-4`), fixing the unrecognized Tailwind class (`w-4.5`) which collapsed the button to 0x0 pixels.
- **Recording Modal Sizing**: Configured the audio recording popout to automatically measure its inner scrollHeight and dynamically resize the window to fit perfectly with zero scrollbars.

### Deutsch

#### Hinzugefügt
- **Native C++ ASIO-Integration**: Vollständig funktionaler, nicht-gemockter nativer COM-Client zur Interaktion mit registrierten Windows ASIO-Treibern (z. B. ASIO4ALL, Steinberg, Realtek). Bietet reaktive Stereo-Ausgangskanalpaarung, Puffergrößen-Begrenzung auf Basis der tatsächlichen Hardwaregrenzen, Live-Latenzanzeige für Eingang, Ausgang und Roundtrip in Millisekunden und Samples, sowie direkte Ansteuerung des herstellereigenen Einstellungs-Panels.
- **Premium Hybrid Fallback VST-Editor**: Integration eines edlen Ausweich-Interfaces in `VstEditorWindow.tsx`, wenn Mockup- oder VST3-Plugins geladen werden. Bietet hochauflösende Parameterregler mit Echtzeit-Synchronisation in den DAW-Audiosignalweg und einen flüssigen, glühenden Canvas-Audio-Visualizer.
- **Dynamisches Resizing API**: Einbau einer `resizeWindow` Schnittstelle im Preload-Skript, wodurch sich Popout-Fenster selbstständig an die exakte Höhe ihres Inhalts anpassen können.

#### Behoben
- **Unsichtbarer Audioaufnahme-Button**: Standardisierung der Button-Dimensionen in `AudioRecordingModal.tsx` auf konforme Klassen (`w-4 h-4`), wodurch der Ladefehler des Aufnahme-Buttons (zuvor fehlerhafte Klasse `w-4.5`) behoben wurde.
- **Aufnahmedialog-Skalierung**: Automatisches Ausmessen der inneren Höhe (`scrollHeight`) im Aufnahme-Popout und dynamische Fensteranpassung für eine scrollbarfreie Ansicht.

## [0.8.10] - 2026-06-01

### English

#### Added
- **Updater Cancel Button**: Integrated a sleek, glassmorphic red "Cancel" ("Abbrechen") button into `UpdateModal.tsx` during active update downloads.
- **Asynchronous Download Abort**: Implemented robust ClientRequest and WriteStream interruption handlers in `updateDownloader.ts` to abort update downloads, close file descriptors, and cleanly delete partial packages.

#### Fixed
- **Win32 Native VST UI Snapping & Occlusion**: Configured `vst_host.cpp` to recursively scan all Win32 child window handles inside the BrowserWindow, programmatically concealing Chromium renderer/compositor viewports (`SW_HIDE`) to resolve Z-order collision and ensure the native plugin UI renders with perfect visibility.
- **Dynamic VST Bounds Scaling**: Configured the C++ engine to retrieve the plugin's preferred size via `effEditGetRect` and return it to Electron, automatically resizing `editorWindow` to match the exact plugin UI bounds.
- **Responsive Native UI Resizing**: Implemented a C++ Win32 child resizer linked to the Electron window resize events for smooth real-time rendering.
- **Bidirectional Lifecycle Coupling**: Linked the closing event of the React control strip to automatically close the native VST editor window and vice-versa.

### Deutsch

#### Hinzugefügt
- **Update-Abbrechen-Schaltfläche**: Einbau eines edlen, glassmorphic gestalteten roten „Abbrechen“-Buttons in der Update-Download-Ansicht (`UpdateModal.tsx`).
- **Asynchroner Download-Abbruch**: Implementierung einer robusten Request-Abbruch-Logik in `updateDownloader.ts`, die laufende HTTPS-Anfragen stoppt, Dateihandles schließt und unvollständige Setup-Pakete rückstandslos vom Datenträger tilgt.

#### Behoben
- **Win32 Native VST-GUI Darstellungsfehler**: Anpassung von `vst_host.cpp` zur Rekursion aller Win32-Kindfenster-Handles, wodurch Chromium-Rendering-Flächen programmatisch ausgeblendet (`SW_HIDE`) und Z-Order-Konflikte (Übermalen des VSTs) dauerhaft gelöst werden.
- **Dynamische VST-Fenstergröße**: Auslesen der idealen Originalgröße des Plugins via `effEditGetRect` in C++ und automatische Skalierung des Electron-Fensters auf diese preferred Bounds.
- **Flüssiges VST-Resizing**: Entwicklung eines Win32-Kind-Resizers, der Größenänderungen des Electron-Hostfensters direkt auf die native VST-Zeichenfläche spiegelt.
- **Bidirektionale Lifecycle-Koppelung**: Automatisches synchronisiertes Schließen des nativen Herstellerfensters beim Beenden der React-Steuerleiste und umgekehrt.

## [0.8.9] - 2026-06-01

### English

#### Added
- **Automatic Native VST UI Spawning**: Configured `VstEditorWindow.tsx` to automatically initialize the native VST C++ host and open the manufacturer's original editor interface immediately upon window mount.

#### Changed
- **Sleek SPACIOUS Control Bar**: Refactored the VST control header into a generous `110px` height strip with ample padding, large typography, and glowing dark styling.
- **Unified Lifecycle Window Coupling**: Configured `vstBridgeIpc.ts` to automatically close the React parent control window when the native manufacturer's editor window is closed.
- **Streamlined Layout (Zero-Clutter)**: Removed the parameters grid dials, keyboard, reactive oscilloscope, preset selection, and toggles to completely focus the workspace on the native VST3 interface.

### Deutsch

#### Hinzugefügt
- **Automatischer nativer UI-Start**: Der VST Editor initialisiert beim Öffnen jetzt vollautomatisch das native C++ Backend und öffnet sofort die echte, fotorealistische Benutzeroberfläche des Plugin-Herstellers, ohne dass ein Knopfdruck nötig ist.

#### Geändert
- **Großzügige, elegante Kontrollleiste**: Umbau der React-Steuerleiste in eine spacious `110px` hohe Kontrollleiste mit edlem dunklen Glassmorphismus, glühendem LED Power-Button und optimaler Lesbarkeit.
- **Gekoppelter Lebenszyklus**: Das Schließen des nativen Herstellerfensters schließt nun automatisch das darüberliegende React-Kontrollfenster mit, für eine nahtlose Desktop-Integration.
- **Fokus auf das native Interface (Zero-Clutter)**: Komplette Entfernung der redundanten Slider, des Keyboards, des Oszilloskops und des Preset-Dropdowns, um den Bildschirmplatz optimal für das native VST3-Fenster zu nutzen.

## [0.8.8] - 2026-06-01

### English

#### Added
- **Native C++ VST GUI Support**: Integrated manufacturer's native VST3 graphical interfaces via Electron and a custom native C++ host parent window association (`vstBridgeIpc.ts`), allowing users to fully interact with original plugin panels.
- **Unified Magnetic Snapping Lock**: Designed a bidirectional magnetic window snapping lock that aligns the React control panel exactly over the manufacturer's native Win32 window. Moving, resizing, or closing either window synchronizes the other instantly.
- **VST Editor Compact Mode**: Added a "Kompakt-Modus" button to collapse the VST parameter editor into an ultra-thin 95px control strip, saving massive screen workspace.
- **Collapsible VST Rack Modules**: Enabled collapsing loaded cards in the `VstPluginRack.tsx` popout via a simple click on the header block, complete with smooth chevron state indicators.
- **Folder Context Menu (Pin/Unpin)**: Added a custom right-click context menu to directory nodes in `FileExplorer.tsx`, allowing users to directly pin or unpin any folder from their "Eigene Medien" sidebar list.
- **Bilingual App-Wide i18n Translation**: Implemented a comprehensive translation mapping, fully wrapping all hardcoded text strings in `MenuBar.tsx` and settings modules using robust `react-i18next` triggers.

#### Fixed
- **VstEditorWindow JSX Syntax Glitch**: Repaired a copy-paste markup syntax error in the piano preview octave indicator (`</div>3 - C5</span>`).
- **VstPluginStore Popout Hierarchy**: Corrected JSX div hierarchy by wrapping the vertical category sidebar and the catalog grid inside a unified flex layout row container.

### Deutsch

#### Hinzugefügt
- **Echtes natives Hersteller-GUI**: Direkte Anbindung der echten, fotorealistischen VST3-Grafikoberflächen der Hersteller über Electron und ein autarkes, natives Win32-Fenster.
- **Magnetischer Andock-Mechanismus (Unified Snapping)**: Entwicklung eines bidirektionalen magnetischen Locks. Die React-Kontrollleiste verschmilzt nahtlos mit dem nativen Herstellerfenster – sie bewegen, skalieren und schließen sich vollkommen synchron als eine Einheit.
- **VST-Kompakt-Modus (Space-Saver)**: Einführung einer „Kompakt-Modus“-Taste im Editor, wodurch Drehregler, Oszilloskop und Keyboard ausgeblendet werden und das Fenster platzsparend auf eine schmale 95px-Leiste schrumpft.
- **Einklappbare VST-Rack-Karten**: Klick auf die Header-Leiste geladener Rack-Module im `VstPluginRack.tsx` klappt diese platzsparend ein und aus (inklusive rotierender Chevron-Pfeilsymbole).
- **Ordner-Rechtsklick-Pinning**: Direktes Anheften (Pin) und Entfernen (Unpin) beliebiger Verzeichnisse an die Import-Seitenleiste über ein neues Rechtsklick-Kontextmenü im Datei-Browser (`FileExplorer.tsx`).
- **App-weite englische Lokalisierung**: Vollständiges i18n-Wrapping aller Texte in der Menüleiste (`MenuBar.tsx`) und den Einstellungen, inklusive nahtloser Echtzeit-Umschaltung zwischen Deutsch und Englisch.

#### Behoben
- **JSX-Syntaxfehler in VstEditorWindow**: Korrektur eines fehlerhaften HTML-Tags im Oktave-Label des Klavier-Previewers (`</div>3 - C5</span>`).
- **Flexbox-Kollaps im VstPluginStore**: Bereinigung der DIV-Hierarchie im Store-Popout zur korrekten, blockierungsfreien Ausrichtung der linken Kategorie-Sidebar und der 3-spaltigen Katalog-Grid-Liste.

## [0.8.3] - 2026-06-01

### English

#### Added
- **Curated VST Store Details Modal**: Implemented fully custom, high-fidelity responsive details dialogs for all curated free VST plugins, featuring an inline, CSS-simulated active interactive front-panel mockup (oscilloscopes, LFO graphs, operators, ADSR envelope lines, dials) to showcase features.
- **Improved VST Store Sidebar Layout**: Swapped the screen-responsive columns with a dedicated single-column list that respects narrow sidebars, fully aligning all information and providing a prominent download status button at the far right.

### Deutsch

#### Hinzugefügt
- **Details-Modals im VST-Store**: Integration von optisch beeindruckenden Details-Dialogen für alle kuratierten Gratis-VST-Plugins. Jedes Modal enthält ein interaktives, rein in CSS/Tailwind nachempfundenes Frontend-Interface-Mockup (Oszilloskope, ADSR-Kurven, 6-Operatoren-FM-Gitter, Frequenzbänder) zur Visualisierung.
- **Verbessertes VST-Store Sidebar-Layout**: Ersetzung des responsive-Spalten-Racks durch eine saubere, einspaltige Liste für schmale DAW-Seitenleisten. Bietet perfekte Platzausnutzung und einen fest ausgerichteten Download-Button am rechten Ende.

## [0.8.1] - 2026-06-01

### English

#### Fixed
- **Updater Infinite Hang**: Replaced the experimental Node `fetch` downloader with a robust, native `https` module-based redirect-following stream writer, resolving the infinite hang at `0%` progress when downloading updates from GitHub releases (which redirect to S3).

### Deutsch

#### Behoben
- **Updater-Hänger behoben**: Der experimentelle Node-`fetch`-Downloader wurde durch einen robusten, auf dem nativen `https`-Modul basierenden Stream-Writer mit Redirect-Unterstützung ersetzt. Dies behebt das unendliche Hängen bei `0%` Fortschritt beim Herunterladen von Updates von GitHub Releases (S3-Redirects).

## [0.8.0] - 2026-06-01


### English

#### Added
- **Real-Time VST2 Audio Effects Engine**: Load and route VST2 effects (compressors, equalizers, delays) on track level in real-time. Powered by a custom native C++ host and high-priority background audio thread.
- **VST Instruments (VSTi) Support**: Play virtual synthesizers, samplers, and drum-machines live with zero latency. Integrates a custom low-overhead Shared-Memory-MIDI-Queue over SharedArrayBuffers.
- **Two-Way MIDI Feedback (MIDI Out)**: Support for sending control surface signals back to physical MIDI controllers, powering motorized faders, LED rings, and illuminated buttons.
- **Interactive VST MIDI-Learn**: Click parameters in the VstPluginRack to map sliders directly to knobs or faders on your physical MIDI hardware controller.
- **Jog-Wheel & Timeline Navigation**: Map relative/absolute MIDI CC dials to timeline scrolling, zooming, and playhead scrubbing.
- **Curated Free VST Store**: Integrated store in the side panel offering direct downloads and automated installation of free professional effects and synths (Vital, Surge XT, Dexed, Valhalla Supermassive, etc.).
- **VstPluginRack UI**: Gorgeous dark modular interface for track insert effects with Bypass toggles, parameter sliders, reset triggers, and live MIDI control indicators.

#### Changed
- **Cross-Origin Isolation Headers**: Configured COOP/COEP headers on the Electron default session to safely enable low-latency SharedArrayBuffer communication.
- **README & Project Description**: Updated target repository descriptions to announce the production-ready native VST/MIDI integration and retired the prototype notices.

### Deutsch

#### Hinzugefügt
- **Echtzeit VST2 Audio-Effekt Engine**: Laden und Routen von VST2-Effekten (Kompressoren, EQs, Delays) auf Spurebene in Echtzeit. Angetrieben von einem nativen C++ Plugin-Host und einem dedizierten High-Priority Audio-Hintergrundthread.
- **VST-Instrumenten-Support (VSTi)**: Live-Spielen von Synthesizern, Samplern und Drum-Machines. Bietet eine extrem latenzarme Shared-Memory-MIDI-Queue über SharedArrayBuffers.
- **Zwei-Wege-MIDI-Feedback (MIDI Out)**: Senden von Signalen zurück an physische Controller zur Ansteuerung von Motorfadern, LED-Ringen und leuchtenden Buttons.
- **Interaktives VST MIDI-Learn**: Einfaches Mappen von Reglern über MIDI Learn direkt im VstPluginRack, um Plugin-Parameter mit Hardware-Reglern zu koppeln.
- **Jog-Wheel & Timeline-Navigation**: Verknüpfung von physischen Drehrädern mit Timeline-Aktionen wie Scrollen, Zoomen und Playhead-Scrubben.
- **Kuriertes VST Store**: Integrierte Seitenleisten-Sektion mit Direkt-Downloads und automatisiertem Import von professionellen freien Plugins (Vital, Surge XT, Dexed, Valhalla Supermassive etc.).
- **VstPluginRack UI**: Ästhetische modulare Rack-Oberfläche für Spureffekte mit Bypass-Schalter, Parameter-Schiebereglern, Resets und blinkenden Learn-Indikatoren.

#### Geändert
- **Cross-Origin Isolation Header**: Aktivierung von COOP/COEP-Sicherheitsheadern in Electron zur sicheren Freischaltung von SharedArrayBuffer für latenzfreies Audio.
- **README & Projektdokumentation**: Aktualisierung der Repository-Beschreibungen zur Ankündigung der fertigen VST/MIDI Integration und vollständige Entfernung der Prototyp-Disclaimer.

## [0.7.14] - 2026-06-01

### English

#### Changed
- **Export Dialog Dynamic Height**: Removed the fixed `max-h-[96vh]` constraint and internal scrollbar from the Mixdown Export dialog. The dialog now auto-sizes to its content, closing just below the export/cancel buttons without stretching to fill the window.

### Deutsch

#### Geändert
- **Exportdialog dynamische Höhe**: Entfernung der festen `max-h-[96vh]`-Beschränkung und der internen Scrollleiste aus dem Mixdown-Export-Dialog. Der Dialog passt sich nun dynamisch seinem Inhalt an und endet knapp unterhalb der Schaltflächen, ohne das Fenster vollständig auszufüllen.

## [0.7.13] - 2026-06-01


### English

#### Changed
- **Modal Popout Size Adjustment**: Set the update popout dimensions to 740x780 to match its actual layout requirements, resolving previous crop defects.
- **Unified Popout Router Hook**: Routed settings keyboard shortcut and settings modal update checker triggers through the popout router to consistently catch small viewport scenarios.

#### Fixed
- **Reverted Inline Modal Scrolling**: Restored the original full-height layouts for Update, Settings, and About modals, removing internal scrollbars and relying on dynamic popouts to prevent cropping.

### Deutsch

#### Geändert
- **Update-Popout Abmessungen**: Anpassung der Update-Popout-Größe auf 740x780 zur korrekten Darstellung ohne Abschneiden.
- **Einheitliche Popout-Routung**: Tastaturkürzel für Einstellungen und der Update-Trigger aus dem Einstellungsfenster laufen nun über den Popout-Router, um bei kleinem Hauptfenster verlässlich auszuploppen.

#### Behoben
- **Rückbau der internen Scrollbars**: Wiederherstellung der ursprünglichen Full-Height-Modals für Updates, Einstellungen und Über uns, um jegliches Scrollen im Dialog zu vermeiden.

## [0.7.12] - 2026-05-31

### English

#### Changed
- **AudioEngine Stopped Track Guard**: Preventive param saving in `trackParams` when adjusting sliders while stopped, avoiding redundant AudioNode creation on closed/suspended audio contexts.
- **Timeline Autoscroll & Playhead Sync**: Synchronized mutable playhead ref `playheadPosRef` in timeline skip-to-start and skip-to-end triggers, securing exact position rendering.
- **Empty currentProject on Stop**: Set `currentProject = null` on multitrack player stop, preventing background sliding-window cache preloading when stopped.
- **File Explorer Preview await close**: Changed FileExplorer preview functions to `async` and awaited `audioCtx.close()` before creating a new context, preventing hardware preview glitches.

#### Fixed
- **Modern RecordingEngine AudioWorklet Migration**: Upgraded the deprecated `ScriptProcessorNode` to a modern `AudioWorkletNode` in `RecordingEngine`, completely offloading real-time peak calculation and software monitoring to a background thread to prevent dropouts.
- **AudioEngine Resume Timing Recalibration**: Recalibrated `startTime` directly in `resume()` to prevent timeline timing drift if the context resets or switches output routing.
- **AudioEngine Async loadFile Swap Protection**: Captured the active context during async load and automatically retried decoding on the new context if stopped/swapped during loading.

### Deutsch

#### Geändert
- **DSP-Parameter-Schutz im Stopp-Zustand**: Schieberegler-Änderungen bei gestopptem Player werden nun präventiv in `trackParams` gesichert, anstatt unnötige Audio-Knoten auf geschlossenen Contexten zu erstellen.
- **Timeline Abspielkopf-Synchronisation**: Perfekte Synchronisation von `playheadPosRef.current` bei Sprüngen an den Anfang oder das Ende der Timeline für ruckelfreies Rendering.
- **Speicherbereinigung bei Stopp**: Das Leeren des Projekt-Zustands (`currentProject = null`) bei Stopp verhindert unnötige Cache-Prefetch-Berechnungen im Hintergrund.
- **Vorschau-Visualizer-Kollision**: Die Vorschau-Funktionen des Datei-Explorers warten nun explizit das Schließen (`await`) des vorherigen AudioContexts ab, um Glitches auf schwächerer Hardware zu vermeiden.

#### Behoben
- **Modernisierung der Aufnahme-Engine (AudioWorklet)**: Migration des veralteten `ScriptProcessorNode` auf eine moderne `AudioWorkletNode` in der `RecordingEngine`, wodurch Aufnahmepuffer-Erfassung, Pegelanzeigen (VU) und Software-Monitoring stabil im Hintergrundthread laufen.
- **Exakte Abspielzeit nach Pause (Resume-Fix)**: Neukalibrierung von `startTime` beim Fortsetzen des Abspielens, um Positionsverschiebungen bei Gerätewechseln auszuschließen.
- **Robustes Dateiladen bei Context-Reset**: Transparenter Zweitversuch in `loadFile()`, falls der AudioContext während der asynchronen Dateiladung gestoppt oder zurückgesetzt wurde.

## [0.7.11] - 2026-05-31

### English

#### Changed
- **Bilingual Speed & Pitch Panel**: Upgraded the Pitch/Timestretch panel to mirror professional DAW interfaces, replacing the simple checkbox with a dual-mode "Algorithmus" select dropdown (supporting Timestretching and Resampling).
- **Real-Time Duration Input**: Added a dynamic "Länge" (Length) text input showing the region's real-time duration. Typing a new length automatically calculates, clamps, and applies the exact corresponding speed factor (`pitchRate`).

#### Fixed
- **DSP Phasing & Comb Filtering**: Implemented a phasenpure clean digital bypass inside the `Jungle` pitch shifter node when `ratio = 1.0` (or when Timestretching is bypassed), completely eliminating flanging, phasing, or comb filtering distortion.

### Deutsch

#### Geändert
- **Mehrspur-Standard-Pitch- & Speed-Panel**: Umgestaltung des Pitch/Timestretch-Panels nach dem Vorbild etablierter DAW-Schnittstellen, inklusive eines zweistufigen „Algorithmus“-Dropdowns (Timestretching vs. Resampling).
- **Echtzeit-Dauer-Eingabefeld**: Hinzufügen eines interaktiven „Länge“-Eingabefelds. Die Eingabe einer Ziel-Dauer errechnet, clamps und übernimmt automatisch das exakt dazu passende Tempo (`pitchRate`) in Echtzeit.

#### Behoben
- **Flanger- & Phaser-Störgeräusche im Bypass**: Einpflegen eines unberührten, digitalen Bypass-Signalwegs im `Jungle`-Pitch-Shifter für den Zustand `ratio = 1.0` (Bypass), was jegliche Kammfilter- und Phasing-Effekte vollständig beseitigt.

## [0.7.10] - 2026-05-31

### English

#### Changed
- **Real-Time Keep-Pitch (Time-Stretching)**: Unified the `Jungle` pitch shifter node to always connect in the active region DSP path, enabling dynamic real-time hot-toggling of "Tonhöhe beibehalten" (time-stretching) during active playback.
- **Audio Speed-Stretching Calculations**: Completely scaled and aligned all visual duration trimming, region boundaries, and fade-in/fade-out/crossfade calculations into real-time seconds inside both the live multitrack player and the offline renderer (`renderOffline`).

#### Fixed
- **Trim and Offset Sync**: Fixed multitrack buffer playback start and read length parameter offset scaling by `pitchRate` to match the visual speed-stretching on the timeline.
- **JSX Syntax in Timeline**: Corrected a mismatched and unclosed `onClick` handler in the Timeline's track element loop.

### Deutsch

#### Geändert
- **Echtzeit „Tonhöhe beibehalten“ (Time-Stretching)**: Der `Jungle`-Pitch-Shifter ist nun dauerhaft in die DSP-Kette der Regionen eingebunden, um ein unterbrechungsfreies, live Hot-Toggling der Tonhöhenkorrektur während des Abspielens zu ermöglichen (mit latenzfreiem Bypass-Zustand).
- **Präzise Tempo-Dehnungsberechnungen**: Sämtliche Abspiel-Grenzen, Fades, Crossfades und Trimm-Berechnungen wurden in Echtzeit-Sekunden umgerechnet (geteilt durch `pitchRate`), um eine perfekte Synchronisation zur gestauchten oder gedehnten Timeline zu garantieren.

#### Behoben
- **Buffer-Offset & Längen-Skalierung**: Die Parameter für Lese-Offset und Lese-Länge beim Starten von Audioquellen (`source.start`) in der Live-Wiedergabe und im Export wurden präzise an das Wiedergabetempo angepasst.
- **JSX-Syntax in Timeline**: Behebung eines ungeschlossenen `onClick`-Handlers und fehlenden DIV-Tags im Spur-Rendering der Timeline.

## [0.7.9] - 2026-05-31

### English

#### Added
- **"Enable Compressor" Toggle**: Added a dedicated activation checkbox for the region compressor in the Effects Panel.
- **Custom Folder Context Menu**: Implemented a glassmorphic right-click context menu (with an "Ordner entpinnen" action) exclusively for user-pinned folders in the File Explorer sidebar, keeping standard folders read-only.

#### Changed
- **Pop-out Dialogs on Crop**: Modals like Settings, About, Manual, and Updates now automatically pop out as native borderless top-level Electron windows if the main window dimensions are smaller than the modal dimensions (cropped).
- **LocalStorage State Sync**: Integrated a storage event bridge to live-synchronize settings parameters, shortcuts, and AudioEngine driver settings from popouts back to the main DAW window instantly.
- **Seamless Live Reverb Decay**: Resolved the convolver write-once buffer constraint by dynamically hot-swapping and reconnecting a new ConvolverNode in real-time when dragging the reverb decay slider.

#### Fixed
- **Compressor Startup Fade-In Bug**: Resolved a critical issue where resetting effects would activate the compressor with default threshold and ratio regardless of the bypass flag, causing a slow fade-in volume swell on starting playback.
- **Corrupted Audio File Details**: Improved the import catch block to display a user-friendly and highly precise German error message ("Die Audiodatei ist beschädigt, unvollständig...") upon audio decoding failure.

### Deutsch

#### Hinzugefügt
- **„Kompressor aktivieren“ Toggle**: Eigener Aktivierungsschalter für den Region-Kompressor im Audioeffekt-Panel.
- **Eigene Medien Kontextmenü**: Ein schickes Rechtsklick-Kontextmenü zum bequemen Entpinnen von selbst hinzugefügten Ordnern in der Import-Sidebar. Standardordner sind schreibgeschützt und rufen kein Menü auf.

#### Geändert
- **Pop-out-Modals bei Crop**: Einstellungen, Info, Benutzerhandbuch und Updates öffnen sich bei kleinem Hauptfenster (cropped) automatisch in eigenständigen, nativen Electron-Popout-Fenstern, anstatt abgeschnitten zu werden.
- **LocalStorage-Synchronisation**: Einstellungs- und Treiber-Änderungen in Pop-out-Fenstern werden in Echtzeit via HTML5-Storage-Event-Bridge live ins Hauptfenster übernommen.
- **Seamless Reverb Decay live**: Behebung von Tonausfällen bei Hall-Decay-Änderungen durch dynamisches Neuerstellen und knackfreies Wiederverbinden der ConvolverNode im laufenden Stream.

#### Behoben
- **Kompressor-Anspiel-Fade-In**: Behebung eines Fehlers, bei dem das Zurücksetzen von Effekten den Compressor fälschlicherweise aktivierte, was aufgrund des Makeup-Gains beim Song-Start ein störendes Einblenden verursachte.
- **Fehlermeldung beschädigter Audiodateien**: Import-Fehlermeldungen wurden verbraucherfreundlich lokalisiert und präzisiert, um beschädigte oder nicht unterstützte Quelldateien sofort zu identifizieren.

## [0.7.8] - 2026-05-31

### English

#### Added
- **Shortcut Folder Pinning in Import Tab**: Users can now pin directories of their choice directly under "Eigene Medien" in the Import explorer sidebar by clicking the new Plus (`+`) button. Pinned paths are persisted inside `LocalStorage` and feature hover-to-delete `X` buttons.

#### Changed
- **Default Explorer Directory**: The Import file explorer now opens the system's official **Music** folder (`music`) by default on start, falling back to user home.
- **ASIO Split Dropdowns**: Reorganized the Wiedergabe (Playback) settings card to split ASIO driver selection and output routing. Selecting "ASIO-Treiber" now shows a dedicated physical driver dropdown (`ASIO-Treiber:`) while keeping the standard Windows output routing dropdown (`Ausgabegerät:`) visible at all times.
- **System Settings Cleanup**: Completely removed the redundant "Software-Updates" section from System settings since it is already covered in the Help menu.

#### Fixed
- **100% Real-time Audio Effects**:
  - **Compressor**: Bypassed the non-functional `compActive` flag, enabling dynamic compression in real-time as soon as the `Ratio` slider is greater than `1.0` (standard DAW behavior).
  - **Reverb (Decay Time)**: Enabled live decay time updates during active playback by keeping a physical convolver reference on `ActiveRegionNode` and mathematically reconstructing the impulse response buffer in real-time when the decay slider is dragged.
  - **Delay & De-Esser**: Ensured both parameters apply parameters immediately and smoothly to active audio streams.
  - **Warning Reactivation**: Made "Hinweisdialoge reaktivieren" fully operational by correctly resetting hidden warnings (`showStartScreen` and `showExportGapWarning`) and displaying a beautiful global success modal.

### Deutsch

#### Hinzugefügt
- **Ordner anpinnen im Import-Reiter**: Benutzer können nun beliebige Ordner direkt in der Seitenleiste unter „Eigene Medien“ anpinnen, indem sie auf das neue Plus-Symbol (`+`) klicken. Die Pfade werden im `LocalStorage` gespeichert und verfügen über ein Hover-Löschkreuz (`X`) zum schnellen Entpinnen.

#### Geändert
- **Standardordner im Explorer**: Der Import-Datei-Explorer startet beim Starten nun standardmäßig direkt im System-Ordner **„Musik“** (mit Fallback auf das Benutzerverzeichnis).
- **ASIO getrennte Dropdowns**: Die Wiedabe-Einstellungen wurden umgestaltet, um die physikalische ASIO-Treiberauswahl und die Standard-Ausgabekanalwahl zu trennen. Bei Auswahl von „ASIO-Treiber“ erscheint ein eigenes Dropdown (`ASIO-Treiber:`), während das Standard-Ausgabegerät (`Ausgabegerät:`) immer sichtbar und aktiv bleibt.
- **System-Bereinigung**: Die redundante Sektion „Software-Updates“ wurde vollständig aus den Einstellungen entfernt, da sie bereits über das Hilfe-Menü abgedeckt ist.

#### Behoben
- **100 % Echtzeit-Audioeffekte**:
  - **Kompressor**: Die ungenutzte Option `compActive` wurde umgangen, wodurch die Kompression sofort in Echtzeit einsetzt, sobald der `Ratio`-Regler größer als `1.0` ist (standardmäßiges DAW-Verhalten).
  - **Hall (Decay-Zeit)**: Unterstützung für Echtzeit-Nachhallzeit-Updates im laufenden Stream, indem eine Convolver-Referenz auf dem `ActiveRegionNode` gehalten und der Impuls-Response-Buffer bei Bewegung des Decay-Reglers mathematisch live regeneriert wird.
  - **Delay & De-Esser**: Beide Effekte reagieren nun absolut verzögerungsfrei und knackfrei auf Reglerbewegungen im laufenden Stream.
  - **Hinweisdialoge reaktivieren**: Der Button „Hinweisdialoge reaktivieren“ setzt nun verlässlich alle ausgeblendeten Warnungen (`showStartScreen` und `showExportGapWarning`) zurück und triggert ein schickes globales Erfolgsmodal.

## [0.7.7] - 2026-05-31

### English

#### Fixed
- **Persistent Master Volume on Seek/Stop**: Fixed a bug where adjusting the master volume slider in the player would reset to 1.0 (100% volume) under the hood whenever the playhead was moved or playback stopped due to `AudioContext` recreation. The master volume setting is now stored persistently in `AudioEngine` and automatically restored.
- **ASIO Driver Integration in Settings**: Exposes a native Windows registry scanner in the main process (`systemIpc.ts`) that queries registered ASIO drivers under `HKLM\Software\ASIO` and `HKLM\Software\WOW6432Node\ASIO`. The Playback Settings device dropdown now dynamically displays actual installed ASIO drivers (like `GoXLR ASIO Driver`, `Realtek ASIO`, etc.) when ASIO is selected.
- **Missing ASIO Driver Warning Alert**: Added a beautiful red warning alert banner inside the Playback Settings card when "ASIO-Treiber" is selected but no ASIO drivers are registered on the system. The banner recommends installing a suitable driver like **ASIO4ALL** or interface-specific drivers like **Steinberg/Yamaha ASIO**.

### Deutsch

#### Behoben
- **Dauerhafte Master-Lautstärke beim Suchen/Stoppen**: Behebt einen Fehler, bei dem der Lautstärkeregler im Player unter der Haube auf 1.0 (100% Lautstärke) zurückgesetzt wurde, sobald der Playhead verschoben oder die Wiedergabe gestoppt wurde (bedingt durch die Neuinitialisierung des `AudioContext`). Die Master-Lautstärke wird nun dauerhaft im `AudioEngine` gespeichert und wiederhergestellt.
- **ASIO-Treiber-Integration in den Einstellungen**: Integriert einen nativen Windows-Registry-Scanner im Hauptprozess (`systemIpc.ts`), der registrierte ASIO-Treiber unter `HKLM\Software\ASIO` und `HKLM\Software\WOW6432Node\ASIO` abfragt. Das Ausgabegerät-Dropdown zeigt nun dynamisch die tatsächlich installierten ASIO-Treiber (z. B. `GoXLR ASIO Driver`, `Realtek ASIO` usw.) an, wenn ASIO ausgewählt ist.
- **Fehlende ASIO-Treiber-Warnmeldung**: Fügt eine schicke rote Warnmeldung in den Wiedergabe-Einstellungen hinzu, wenn „ASIO-Treiber“ ausgewählt ist, aber keine ASIO-Treiber auf dem System installiert sind. Die Meldung empfiehlt die Installation von Treibern wie **ASIO4ALL** oder interfacespezifischen Treibern wie **Steinberg/Yamaha ASIO**.

## [0.7.6] - 2026-05-31

### English

#### Added
- **Always-Visible Effects & Plugins Panel**: The right-side panel now remains fully visible at all times, even when no audio clip is selected. Controls are clearly disabled with an inline warning when no clip is active.
- **Accordion Layout for Effects Panel**: Replaced the flat sidebar navigation with two collapsible accordion sections — **"Audioeffekte"** (Equalizer, Compressor, Hall/Reverb, Echo/Delay, De-Esser, Pitch/Timestretch as sub-accordions) and **"VST-Plugins"** (dynamic plugin list).
- **Instrument vs. Effect Detection in VST Scanner**: The scanner now automatically distinguishes between virtual instruments and audio effects via keyword analysis. Instruments shown with a purple badge; effects with a blue badge.
- **Auto-Load VST Plugin Registry on Startup**: Previously scanned plugins load immediately from the local registry when the panel opens, without requiring a manual scan trigger.

#### Changed
- **Menu Rename: "Effekte" → "Plugins"**: Top menu bar entry renamed for clarity. The redundant "Audioeffekte (Master)" sub-item has been removed.
- **Settings Dialog Height Increased**: Programmeinstellungen dialog height increased from 550 px to 700 px, preventing scrolling in content-heavy tabs such as "Ordner".
- **VST Scanner: Recursive Directory Scanning**: Plugin scanner now traverses subdirectories up to 6 levels deep, correctly discovering nested VST3 bundles and VST2 DLLs.
- **VST Scanner: Extended Windows Search Paths**: Added `Program Files (x86)` variants and user Documents folders to the Windows scan path list.

#### Fixed
- **Duplicate Audio Output Device Entry**: Removed the browser-injected `Default - System (...)` duplicate from the audio output device dropdown in Playback settings.
- **VST Plugin Type Display `(undefined)`**: Fixed field name mismatch — `vst.type` corrected to `vst.format`, resolving the `(undefined)` label in scan results.

### Deutsch

#### Hinzugefügt
- **Dauerhaft sichtbares Effekte- & Plugins-Panel**: Das rechte Panel bleibt jetzt immer vollständig sichtbar, auch wenn kein Audio-Clip ausgewählt ist. Bedienelemente werden deaktiviert mit einem integrierten Hinweis angezeigt.
- **Akkordeon-Layout für das Effekte-Panel**: Die flache Seitennavigation wurde durch zwei ausklappbare Akkordeon-Sektionen ersetzt – **„Audioeffekte"** (mit Equalizer, Kompressor, Hall/Reverb, Echo/Delay, De-Esser und Pitch/Timestretch) und **„VST-Plugins"** (dynamische Plugin-Liste).
- **Instrument- vs. Effekt-Erkennung im VST-Scanner**: Der Scanner erkennt automatisch den Unterschied zwischen Instrumenten und Audioeffekten per Schlüsselwortanalyse. Instrumente: lilafarbener Badge; Effekte: blauer Badge.
- **Automatisches Laden der VST-Plugin-Registry beim Start**: Bereits gescannte Plugins werden beim Öffnen des Panels sofort aus der lokalen Registry geladen.

#### Geändert
- **Menü-Umbenennung: „Effekte" → „Plugins"**: Der Menüpunkt wurde umbenannt. Der Unterpunkt „Audioeffekte (Master)" wurde als redundant entfernt.
- **Einstellungsdialog-Höhe erhöht**: Die Höhe des Programmeinstellungen-Dialogs wurde von 550 px auf 700 px erhöht.
- **VST-Scanner: Rekursive Verzeichnis-Suche**: Der Scanner durchsucht nun bis zu 6 Ebenen tief, wodurch VST3-Bundles und VST2-DLLs in verschachtelten Ordnern gefunden werden.
- **VST-Scanner: Erweiterte Windows-Suchpfade**: `Program Files (x86)`-Varianten und benutzerspezifische Dokument-Ordner wurden hinzugefügt.

#### Behoben
- **Doppelter Audioausgabe-Geräteeintrag**: Der vom Browser automatisch generierte `Default - System (...)`-Doppeleintrag in der Audioausgabe-Auswahl wurde entfernt.
- **VST-Plugin-Typ-Anzeige `(undefined)`**: Feldnamen-Fehler behoben – `vst.type` durch `vst.format` ersetzt.

## [0.7.5] - 2026-05-31

### English

#### Added
- **ASIO & Driver Selection**: Implemented professional audio driver selection support (Wave, Direct-Sound, ASIO) inside the "Playback" settings tab, including full persistent settings storage and live simulated latency optimization reports.
- **Tuning of Audio Buffer Size**: Added an editable input field to customize the playback audio buffer count directly in the preferences.
- **Functional VST2 & VST3 Search Paths**: Fixed the previously non-functional "Add VST plug-in path..." button. Added an elegant list display and removal buttons to visually configure VST folders. The backend scanner has been updated to scan these user-defined directories recursively for VST2 (`.dll`/`.vst`) and VST3 (`.vst3`) plugins.

#### Fixed
- **Nonsensical Update Version Logic**: Resolved a logical bug in the update check modal. When the installed local version is newer than the public version on the server (e.g., installed `v0.7.4` vs server `v0.7.3`), the check screen now logically renders both as `v0.7.4` instead of stating a lower "latest version".

### Deutsch

#### Hinzugefügt
- **ASIO- & Treiberauswahl**: Integration einer professionellen Audiotreiberauswahl (Wave-Treiber, Direct-Sound, ASIO-Treiber) im Reiter „Wiedergabe“ der Programmeinstellungen, inklusive vollständiger Speicherung der Treibertypen und simulierter Echtzeit-Latenzoptimierung.
- **Dynamische Audiopuffer-Größe**: Möglichkeit zur manuellen Anpassung der Pufferanzahl direkt im Einstellungsfenster für feinste Latenzjustierungen.
- **Funktionale VST2- & VST3-Suchpfade (Bugfix)**: Behebung des ehemals funktionslosen "VST-Pfad hinzufügen" Buttons. Hinzugefügt wurde eine ästhetische Auflistung und ein "Entfernen"-Button für VST-Ordnerpfade im Reiter „Ordner“. Der Dateiscanner liest diese zusätzlichen Pfade nun aus der Konfiguration und scannt sie gezielt nach VST2 (`.dll`/`.vst`) und VST3 (`.vst3`) Effekten.

#### Behoben
- **Korrektur der unsinnigen Update-Anzeige**: Behebung eines Logikfehlers beim manuellen Update-Check in der Menüleiste. Falls deine installierte lokale Version neuer ist als die öffentliche Version auf dem GitHub-Server (z.B. installierte `v0.7.4` vs. server `v0.7.3`), zeigt der Update-Bildschirm nun logisch und konsistent beide Versionen als `v0.7.4` an.

## [0.7.4] - 2026-05-31

### English

#### Fixed
- **About Logo Restoration**: Replaced the custom animated wave placeholder with the official static brand logo image (`app_icon.png`) for a clean, consistent corporate identity.
- **FLAC Metadata & Cover Art Support**: Fully enabled the ID3/Metadata and cover art panel for `FLAC (Free Lossless)` format exports, ensuring native format-compliant Vorbis Comments and embedded pictures are written perfectly.
- **Export Mixdown Layout & Size**: Increased popout export window height to `940px` and optimized layout paddings/gaps to ensure all settings, inputs, and cover art fit completely on a single page without requiring any scrolling.

### Deutsch

#### Behoben
- **Logo-Wiederherstellung im Info-Modal**: Ersetzung des animierten Wellen-Platzhalters durch die offizielle, starre Version des Markenlogos (`app_icon.png`) für eine konsistente Corporate Identity.
- **Metadaten- & Cover-Art-Unterstützung für FLAC**: ID3-Tags- & Album-Cover-Panel vollständig für das Exportformat `FLAC (Free Lossless)` freigeschaltet, sodass native, standardkonforme Vorbis-Comments und Cover-Bilder fehlerfrei geschrieben werden.
- **Export-Mixdown Layout & Höhe**: Erhöhung der Höhe des Popout-Exportfensters auf `940px` sowie Optimierung aller Abstände und Ränder, damit alle Exportoptionen, Metadaten-Felder und Cover-Bilder lückenlos auf einer einzigen Seite ohne lästiges Scrollen Platz finden.

## [0.7.3] - 2026-05-31

### English

#### Added
- **Premium About Modal**: Implemented a visually stunning custom `AboutModal` component with copyright, a detailed description, support email link, and clickable dynamic links to PayPal and the official GitHub Repository.
- **Bilingual User Manual**: Extensively updated and expanded the built-in Benutzerhandbuch (`ManualModal`) to cover selection-based export, cover art metadata tagging, Web MIDI control with MIDI-Learn, and the aggregated software updater.
- **Developer Guidelines**: Established a permanent guideline in `.clinerules` requiring that all future feature releases automatically maintain and update the built-in manual.

#### Changed
- **Manual Label Correction**: Renamed the Help menu item from "Handbuch (PDF) herunterladen" to "Benutzerhandbuch" to accurately reflect that it opens a custom local HTML manual page.

### Deutsch

#### Hinzugefügt
- **Premium Über-Modal (Info)**: Einbindung einer optisch herausragenden custom `AboutModal`-Komponente mit Urheberrechtsangaben, detaillierter Beschreibung, Support-Mailbox und klickbaren Direkt-Verknüpfungen zu PayPal und dem offiziellen GitHub-Repository.
- **Zweisprachiges Benutzerhandbuch**: Umfassende Überarbeitung und Erweiterung des integrierten Benutzerhandbuchs (`ManualModal`) zur lückenlosen Dokumentation des Selektions-Exports, der Metadaten- & Cover-Art-Einbettung, des MIDI-Steuerungs-Setups mit MIDI-Learn und des neuen Software-Updaters.
- **Entwickler-Richtlinien**: Etablierung einer dauerhaften Regel in den `.clinerules`, welche alle zukünftigen KIs dazu verpflichtet, das integrierte Handbuch bei jedem Feature-Release automatisch auf dem neuesten Stand zu halten.

#### Geändert
- **Handbuch-Menübeschriftung**: Den Hilfeeintrag „Handbuch (PDF) herunterladen“ in „Benutzerhandbuch“ umbenannt, da dieser eine interne HTML-Seite innerhalb der App öffnet.

## [0.7.2] - 2026-05-31

### English

#### Added
- **UI Polish**: Restored the clean vertical two-row list layout for current and available versions to eliminate all top-padding squishing and alignment issues.
- **Typography & Parser Polish**: Optimized markdown heading hierarchy (Level 2, 3, and 4) and increased text contrast and size (`text-xs` / `12px` and brighter gray colors) to make bilingual release notes exceptionally readable.

### Deutsch

#### Hinzugefügt
- **UI-Feinschliff**: Wiederherstellung des sauberen, zweizeiligen Listen-Layouts für installierte und verfügbare Versionen, um jegliche Quetschungen oder Randausrichtungsprobleme zu eliminieren.
- **Typografie- & Parser-Politur**: Optimierung der Markdown-Überschriftenhierarchie (Level 2, 3 und 4) sowie Erhöhung des Textkontrasts und der Schriftgröße (`text-xs` / `12px` und hellere Grautöne) für eine herausragende Lesbarkeit der zweisprachigen Versionshinweise.

## [0.7.1] - 2026-05-31

### English

#### Added
- **UI Adjustments**: Expanded the Update Modal width to `720px` and increased scrollable changelog display box heights (up to 380px) for maximum reading comfort during checking and installation.
- **Bilingual Release Notes**: Full dual English and German support for all future release notes, upgrade notifications, and update screens.

#### Fixed
- **Double v Prefix**: Resolved a cosmetic formatting issue where the latest version was rendered with a double `v` (e.g. `vv0.7.0`) in the menu bar and update process screens.
- **UTF-8 Encoding**: Fixed a standard Windows PowerShell redirection encoding issue (defaulting to UTF-16LE in `>`) by rewriting release notes files directly in UTF-8 format within the extraction utility.

### Deutsch

#### Hinzugefügt
- **UI-Verbesserungen**: Breite des Update-Modals auf `720px` vergrößert und scrollbare Höhen der Changelogs (auf bis zu 380px) für optimalen Lesekomfort während der Prüfung und des Downloads erhöht.
- **Zweisprachige Release-Notes**: Vollständig zweisprachige (EN/DE) Unterstützung für alle zukünftigen Versionshinweise und Update-Fenster.

#### Behoben
- **Doppel-v-Präfix**: Kosmetisches Formatierungsproblem behoben, bei dem die neueste Version irrtümlich als `vv0.7.0` in der Menüleiste und in den Update-Schritten dargestellt wurde.
- **UTF-8-Codierung**: Klassischen Windows-PowerShell-Ausgabeumleitungsfehler (Standard-UTF-16LE bei `>`) korrigiert, indem das Extraktionsskript Ausgabedateien direkt als UTF-8 schreibt.

## [0.7.0] - 2026-05-31

### English

#### Added
- **MIDI Support**: Full, driverless integration of the Web MIDI API in the renderer. Features a flexible MIDI-Learn interface to assign any CC/note command to transport actions (Play, Stop, Record) and mixer channel controls (Volume, Mute, Solo based on visual track index instead of dynamic track UUIDs).
- **Format-compliant Audio Tagging & Cover Art**: Support for native metadata tagging depending on the format (ID3 for MP3/WAV, Vorbis Comments for FLAC/OGG/OPUS/M4A), including cover art image import and live preview directly in the export dialog.
- **Premium Changelog Updater**: High-performance software updater inspired by the HandBrake repository. Automatically aggregates all patch notes of skipped intermediate versions chronologically, renders them readable with category bolding (e.g. `Core:`, `Added:` etc.), and displays them visibly throughout the entire download and update process.

#### Fixed
- **Precise Selection Export**: The mixdown export is now mathematically limited to the exact marked time interval on the timeline when the blue selection bar is active.

### Deutsch

#### Hinzugefügt
- **MIDI-Unterstützung**: Vollständige, treiberlose Integration der Web MIDI API in den Renderer. Bietet eine flexible MIDI-Learn-Oberfläche zur Belegung beliebiger CC/Note-Befehle für Transport-Aktionen (Play, Stop, Record) und Mixer-Spursteuerungen (Lautstärke, Mute, Solo basierend auf dem sichtbaren Spur-Index statt dynamischen Track-UUIDs).
- **Formatgerechtes Audio-Tagging & Cover-Bilder**: Unterstützung für natives Metadaten-Tagging je nach Format (ID3 für MP3/WAV, Vorbis Comments für FLAC/OGG/OPUS/M4A) inklusive Cover-Bild-Import und Live-Vorschau direkt im Export-Dialog.
- **Premium Changelog-Updater**: Leistungsstarker Software-Updater nach Vorbild des HandBrake-Repositories. Aggregiert automatisch alle Patchnotes übersprungener Versionen chronologisch, bereitet sie leserlich mit Kategorie-Hervorhebungen (`Core:`, `Added:` etc.) auf und hält sie während des gesamten Download- und Update-Prozesses sichtbar.

#### Behoben
- **Präziser Selektions-Export**: Mixdown-Export beschränkt sich bei aktiviertem blauen Selektionsbalken nun mathematisch exakt auf das markierte Zeitintervall der Timeline.

## [0.6.3] - 2026-05-31

### Changed
- **Globaler Leertasten-Fokus (Equalizer / Slider)**: Verfeinerung des globalen Tastatur-Bypass-Filters. Shortcuts (insb. Leertaste für Start/Stopp) werden nun ausschließlich in echten Texteingabefeldern (`input type="text"`, `textarea`, `contenteditable`) blockiert. Bei fokussierten Range-Slidern (wie den Equalizer-Bändern, Spurenlautstärken), Checkboxen oder normalen Buttons bleibt die Steuerung der Wiedergabe voll aktiv.

### Fixed
- **Adaptive Schnitt- & Trimm-Logik am Playhead**: Intelligente, kontextabhängige Steuerung für die Shortcuts **T** (Teilen), **Z** (Anfang trimmen) und **U** (Ende trimmen). Ist ein Clip unter dem Playhead ausgewählt, wird nur dieser geschnitten; ist kein Clip ausgewählt, werden alle übereinanderliegenden Clips unter dem Playhead gleichzeitig geschnitten, unbeeinflusst von Auswahlen an anderen Stellen des Projekts.

## [0.6.2] - 2026-05-31

### Changed
- **Export-Selektion (Blauer Balken)**: Ein Linksklick sowie ein Rechtsklick im blauen Selektionsstreifen markieren nun immer konsistent vom Anfang des Projekts (0.0s) bis zur Klickposition. Ein Doppelklick löscht die Selektion weiterhin zuverlässig.

### Fixed
- **Playhead-Diamant perfekt zentriert**: Die vertikale Ausrichtung des roten Abspielkopfs wurde auf `top-[22px]` angepasst, wodurch der gedrehte Diamant nun mathematisch und visuell exakt auf der Mittelachse des Timecode-Rulers zentriert ist und nicht mehr am oberen blauen Streifen klebt.
- **Spur-unabhängiges Lücken schließen**: Die Funktion „Lücken schließen“ wurde komplett überarbeitet und arbeitet nun Spur für Spur unabhängig. Clips auf den einzelnen Spuren werden chronologisch sortiert und lückenlos von 0.0s beginnend aneinandergereiht, anstatt sich durch Clips auf anderen Spuren zu blockieren.

## [0.6.1] - 2026-05-31

### Fixed
- **Blauer Balken läuft nicht mehr mit dem Playhead mit**: Der blaue Streifen ist nun vollständig vom Abspielkopf entkoppelt und dient ausschließlich als eigenständiges Export-Selektionswerkzeug.
- **Ruler-Klick-Verhalten korrigiert**: Ein Linksklick im Zeitlineal setzt nur noch den Startpunkt der Exportmarkierung, ohne den Abspielkopf zu verschieben. Der Abspielkopf wird weiterhin ausschließlich über das rote Diamant-Handle bewegt.
- **Doppelklick löscht Selektion zuverlässig**: Ein `rulerDoubleClickPendingRef`-Guard verhindert, dass der `mouseDown`-Handler beim Doppelklick sofort eine neue Selektion setzt und die Löschung überschreibt.
- **Export-Selektion als Streifen oberhalb des Rulers**: Die Exportmarkierung wird nun als dedizierter 8px-Streifen direkt über dem Timecode-Ruler dargestellt (solider blauer Balken), anstatt als halbtransparente Fläche innerhalb des Rulers. Im Ruler selbst erscheint nur noch ein kompaktes Timecode-Badge mit der Selektionsdauer.
- **Selektions-Overlay auf Trackfläche**: Der markierte Exportbereich wird zusätzlich als halbtransparenter blauer Overlay über allen Tracks visualisiert.

## [0.6.0] - 2026-05-30

### Added
- **Immer sichtbare Fade-Handles**: Die kreisförmigen Anfass-Punkte für Fade-in und Fade-out an jedem Audio-Clip in der Timeline sind nun dauerhaft sichtbar und müssen nicht mehr per Klick aktiviert werden.
- **Halbe Wellenformdarstellung**: Neue Einstellung im Reiter „Import/Audio" der Programmeinstellungen, um die Wellenformdarstellung von Audio-Clips zwischen der vollen (symmetrischen) und der einseitig-halben (unten ausgerichteten) Ansicht zu wechseln.
- **Ruler-Exportmarkierung**: Durch Linksklick auf das Zeitlineal wird der Startpunkt der Exportauswahl gesetzt, per Rechtsklick der Endpunkt. Ein blauer Balken mit Klammer-Markierungen und Dauerzeilanzeige visualisiert den markierten Bereich. Ein Doppelklick löscht die gesamte Auswahl.
- **Selektionsbasierter Export**: Im Export-Dialog gibt es eine neue Checkbox „Nur markierten Bereich exportieren", die den Mixdown auf die im Ruler definierte Zeitspanne begrenzt.
- **Stille-Lücken-Warnung**: Wenn vor dem ersten Audio-Clip eine stille Pause liegt, erscheint beim Exportieren ein Warn-Dialog mit den Optionen „Ignorieren", „Zur Lücke springen" und „Abbrechen". Diese Warnung kann dauerhaft deaktiviert werden.
- **Einzelspur-Export (Mixdown)**: Im Rechtsklick-Kontextmenü einer Spur steht nun ganz oben „Spur exportieren (Mixdown)...", mit dem jede Spur separat in alle unterstützten Formate (inkl. MP3 mit ID3-Tags) exportiert werden kann.
- **Exporteinstellungen-Persistenz**: Alle Exporteinstellungen (Format, Bitrate, Preset, Versionierung, Abspielen nach Export, Selektions-Export, etc.) werden im Projekt gespeichert und beim erneuten Öffnen des Dialogs wiederhergestellt.

### Fixed
- **handleSaveAndClose mit korrekten Projektdaten**: Das Speichern beim Schließen des Fensters delegiert nun an die Timeline-interne SAVE_PROJECT-Aktion, sodass alle Sitzungsdaten (exportSettings, Zoomebene, Abspielkopf-Position, Samplerate) korrekt in der `.owep`-Datei persistiert werden.
- **Seek-Timeline aus Export-Popup**: Klicken auf „Zur Lücke springen" im Stille-Lücken-Warndialog springt nun korrekt zum entsprechenden Zeitpunkt in der Timeline der Hauptapplikation.
- **Signatur-Konsistenz (openExportSettings)**: Alle Aufrufstellen von `openExportSettings` (Tastaturkürzel, Menüleiste, Timeline-Schaltfläche) übergeben nun korrekt Selektion und Exporteinstellungen gemäß der aktualisierten IPC-Schnittstelle.

## [0.5.6] - 2026-05-30

### Fixed
- **Popout-Exportfenster Spurendaten**: Behebung des Fehlers, bei dem die Checkbox „Im Import-Ordner speichern“ im separaten Export-Dialog ausgeblendet war. Durch asynchrones Laden der Spurendaten über IPC (`get-export-tracks`) ist die Import-Quellerkennung nun auch im Popout-Modus voll funktionsfähig.
- **Update-Shutdown-Race-Condition**: Der Updater wartet mit dem Start des Installers/Uninstallers nun sicher ab, bis das Hauptprogramm regulär geschlossen wurde und offene Projekte gespeichert/abgefragt wurden, um störende Überlagerungen zu vermeiden.
- **Sanitisierung des Uninstaller-Dialogs**: Im NSIS-Uninstaller wurde die Abfrage zur Löschung der persönlichen Einstellungen so abgesichert, dass sie bei automatischen (stummen) Updates im Hintergrund übersprungen wird, um Datenverlust und störende Popups zu verhindern.

### Added
- **DAW Performance-Monitor (System-CPU)**: Im Footer wird neben der CPU-Auslastung der App nun auch die Gesamtlast des PCs (System-CPU) symmetrisch und live angezeigt.

## [0.5.5] - 2026-05-30
### Fixed
- **Playhead-Visualisierung (Ziehbereich & Layering)**: Der manuelle Ziehbereich des Markers per Maus wurde mathematisch auf das Spur-Raster eingegrenzt (Drag Clamping), um ein Hinausziehen über die vertikale Scrollleiste zu unterbinden. Zudem wurde die Tiefenebene (Z-Index) der statischen Seiten-Spalten auf `z-[160]` erhöht, um den Playhead beim Scrollen oder Versetzen dahinter perfekt zu maskieren.

### Added
- **Erweiterter Dateiexport (Import-Ordner & Versionierung)**:
  - Checkbox zum dynamischen Ändern des Exportpfades in den Quellordner des ersten importierten Tracks.
  - Checkbox für fortlaufende Dateiversionierung (`_v1`, `_v2` etc.) bei Namensgleichheit im Zielordner.
  - Blockierungsfreies, modernes Sicherheits-Overlay zur Abfrage einer Bestätigung vor dem Überschreiben existierender Dateien (falls keine Versionierung aktiv ist).

## [0.5.4] - 2026-05-30
### Fixed
- **Playhead-Visualisierung (Höhe)**: Die Behebung des Überhangs wurde direkt im aktiven Playhead von `Timeline.tsx` verankert, sodass der rote Marker die untere Toolbar (Zoom-Menü und Buttons) garantiert nicht mehr überlappt.

### Added
- **Live-Seeking während der Wiedergabe**: Das Klicken oder Ziehen auf dem Zeitlineal (Ruler) pausiert die Wiedergabe nun geräuschlos und setzt sie beim Loslassen nahtlos von der neuen Position aus fort, ohne manuell auf Pause drücken zu müssen.

## [0.5.3] - 2026-05-30
### Fixed
- **Playhead-Visualisierung**: Die vertikale rote Abspiellinie wurde so begrenzt, dass sie oberhalb der Scrollbar und der Zoom-Steuerung am unteren Rand endet.
- **Spacebar-Wiedergabeverhalten & Stabilität**: Die Stoppzeit im Audiokontext bei Pausen wird nun präzise ermittelt. Zudem wurde das Spacebar-Wiedergabe-Callback stabilisiert, was die kontinuierliche Neuerstellung des Callbacks und Neuregistrierung der Tastatur-Event-Listener behebt.
- **Präzises Audio-Trimming & Wellenformen**: Beim Dateiexport werden Clip-Trimmings (sourceOffset / duration) nun korrekt berücksichtigt. Zudem wurde ein hochperformanter, PCM-basierter Peak-Extraktor im Hauptprozess und ein verlängertes Timeout im Waveform-Renderer implementiert, um fehlerhafte fiktive Wellenformen zu beheben.

## [0.5.2] - 2026-05-25
### Added
- **Physisches Projekt-Speichern**: Die `project.save`-Aktion im `HeadlessRunner` führt nun das echte Schreiben der `.owep`-Projektdatei mittels `fs.writeFileSync` durch.
- **Automatisierte I/O-Unit-Tests**: Erweiterung der Core-Testsuite um einen automatisierten Integrations-Test (`Test 9`), der den echten Schreibvorgang, die JSON-Strukturintegrität und die anschließende temporäre Dateibereinigung vollautomatisch validiert.

### Changed
- **Markenbereinigung (Brand Sanitization)**: Vollständige Bereinigung verbliebener herstellerspezifischer Markennamen (insb. "Magix") in allen Konzepten, internen Quellcode-Kommentaren (`settingsIpc.ts`, `SaveConfirmationModal.tsx`, `StartDashboard.tsx`) und Dokumenten zugunsten einer neutralen, industrieüblichen Terminologie.
- **Klarstellung zum Plugin-Hosting**: Richtigstellung der Plugin-Hosting-Claims in Marketingmaterialien (`discord_vorstellung.md`); der plattformübergreifende Plugin-Scanner für VST2, VST3, AU und LV2 wird ehrlich als prototypische Registry-Erkennung deklariert (DSP-Routing und natives GUI-Hosting sind als zukünftige Entwicklungsphasen ausgewiesen).

## [0.5.1] - 2026-05-24
### Fixed
- **Projekt-Wiedergabe**: Beim Laden von `.owep`-Projekten werden referenzierte Audiodateien jetzt wieder in die AudioEngine vorgeladen, sodass importierte Regionen nach dem Oeffnen hoerbar abgespielt werden.
- **Echo-Default**: Der neutrale Effektzustand setzt Delay-Feedback jetzt konsequent auf `0`, damit Clips beim Zuruecksetzen, Preset-Laden oder Einfuegen von Effekten kein ungewolltes Echo erhalten.



## [0.5.0] - 2026-05-24
### Added
- **Verlustfreie Projektmodelle**: Regionen und Spuren speichern nun alle Timeline-Attribute (`color`, `groupId`, `fileDuration`, Fades, Gain und Effekte) verlustfrei; unbenutzte oder herstellerspezifische Zusatzfelder werden beim Importieren, Speichern und Validieren (`validateAndMigrateProject`) vollständig erhalten.
- **Sichere Befehlsarchitektur (Command Layer)**: Nicht unterstützte oder unimplemented Stubs (wie `export.render` oder `metadata.write`) brechen nun kontrolliert mit klaren Ausnahmen ab, anstatt stillschweigend ignoriert zu werden.
- **Gehärteter MCP-Server**: Der Headless Model Context Protocol Server validiert nun dynamisch Dateipfade sowie Spuren-IDs und passt seine Versionskennung automatisch an die `package.json` an.
- **Modulare IPC-Brücke**: Die IPC-Handler wurden in übersichtliche Submodule (`audioIpc`, `pluginIpc`, `projectIpc`, `systemIpc`) aufgeteilt, um Registrierungskonflikte zu vermeiden.
- **Asynchroner Plugin-Scanner**: Der "Interface öffnen"-Button im EffectsPanel wertet nun das Rückgabeobjekt der Plugin-Bridge asynchron aus und zeigt dem Benutzer im Fehlerfall eine verständliche `window.alert`-Meldung an.
- **Ehrliche Plugin-UI**: Aktualisierung aller VST-Dokumentationspfade und ehrlicher Hinweis in der UI, dass Plugin-Hosting in diesem Prototyp noch nicht implementiert ist.

### Changed
- **Bearbeitbare Tastaturkürzel**: Programmeinstellungen enthalten jetzt editierbare Shortcuts, die von Menü und Timeline gemeinsam genutzt werden.
- **Programmeinstellungen**: Das Einstellungsfenster startet standardmäßig in den Projekteinstellungen.
- **Wiedergabe-Einstellungen**: Die nicht funktional angebundene Auswahl zwischen Wave-Treiber und Direct-Sound wurde entfernt; die tatsächliche Ausgabe erfolgt weiterhin über die Geräteauswahl.

## [0.4.1] - 2026-05-23
### Added
- **Echtzeit-Download-Statistiken**: Anzeige von Downloadgeschwindigkeit, geladener Datenmenge und verbleibender Restlaufzeit im Update-Dialog.
- **IPC-Optimierung**: Begrenzung der Übertragungsfrequenz für Download-Fortschritts-Events im Hauptprozess zur Schonung von Systemressourcen.

## [0.4.0] - 2026-05-23
### Added
- **Spur-Management**: Neupositionierung der Schaltfläche "Spur hinzufügen" in die horizontale Scrollbar-Leiste zur Verbesserung des Arbeitsflusses.
- **DAW Performance-Monitor**: Live-Ressourcenanzeige für CPU- und RAM-Auslastung mit visuellem LED-Indikator im Timeline-Footer.
- **Explorer-Navigation**: Native Windows-Laufwerkserkennung (A:\ bis Z:\) über virtuellen Ort `'computer'` sowie Tastaturnavigation (Alt+ArrowUp, Backspace) und "Ordner hoch"-Button.
- **Auto-Stop Vorschau**: Automatisches Stoppen der Explorer-Audiovorschau beim Start der Timeline-Wiedergabe.
- **Fokus-Sperre**: Beibehalten der DSP-Effektkontrollen des zuletzt ausgewählten Clips bei Klicks in leere Timeline-Bereiche.
- **Globaler Spacebar-Shortcut**: Zentraler Leertasten-Listener für Wiedergabe und Pause, ausgenommen bei aktiven Modals, Eingabefeldern oder im Import-Tab.
- **Kugel-Fade-Handles**: Ersatz der dreieckigen Eck-Handles durch kreisförmige Fade-Handles mit präziser Sekunden-Tooltip-Anzeige.
- **Viewport-Schutz**: Automatische Positionsanpassung von Kontextmenüs zur Vermeidung von Darstellungsfehlern am Bildschirmrand.
- **Ausgelagerter Export-Prozess**: Auslagerung des Renderings in eigenständige Popout-Fenster inklusive Visualisierung und Fortschrittsanzeige bei gleichzeitiger Sperrung des Hauptfensters.
- **Projekt-Dokumentation**: Bereitstellung der Dateien LICENSE (MIT), CONTRIBUTING und Anforderungen im Hauptverzeichnis.

### Fixed
- **Seamless Cuts**: Automatische Erkennung kontinuierlicher Clips zur sample-genauen Knackser-Vermeidung mittels 1ms Mikro-Fades.
- **Playhead-Interaktion**: Optimierung des Abspielkopfs als breitere, griffigere Zieh-Zone und Blockierung versehentlicher Klicks auf leeren Spurbahnen.

## [0.3.4] - 2026-05-22
### Added
- **Deinstallations-Bereinigung**: Automatische Rückstands-Entfernung von temporären Benutzerdaten bei der Anwendungsdeinstallation.

## [0.3.3] - 2026-05-22
### Added
- **Standard-Exportpfad**: Priorisierung des in den Einstellungen hinterlegten Zielpfads beim Öffnen des Export-Dialogs.

## [0.3.2] - 2026-05-22
### Added
- **UI-Bereinigung**: Entfernung unbenutzter Werbeelemente und Platzhalter-Schaltflächen für ein fokussiertes Design.
- **Icon-Transparenz**: Konvertierung aller Anwendungs-Icons zu transparenten Kreisformen.

## [0.3.1] - 2026-05-22
### Added
- **Explorer-Pfadauflösung**: Dynamische Pfadermittlung für Systemordner (Desktop, Dokumente etc.) im Datei-Explorer.

### Fixed
- **Export-Qualität**: Stabilitätsverbesserung bei der Export-Fortschrittsanzeige und Resampling-Korrekturen für hohe Exportqualität.

## [0.3.0] - 2026-05-22
### Added
- **Audioaufnahme**: Integration einer nativen Aufnahmefunktion zur direkten Spuraufzeichnung im Editor.
- **Time-Stretching**: Verlustfreies Ändern der Wiedergabegeschwindigkeit (Tempo) ohne Beeinflussung der Tonhöhe.
- **Dateizuordnung**: Registrierung des Omega-Wave-Project-Dateiformats (.owp) im Betriebssystem für direkten Projektstart via Doppelklick.

## [0.2.5] - 2026-05-22
### Fixed
- **Track-Aktualisierung**: Stabilisierung der Track-Verlaufshistorie zur Vermeidung von Rendering-Schleifen.
- **Ruler-Referenz**: Korrektur doppelt deklarierter GUI-Komponenten in der Timeline.
- **Verlaufskontrollen**: Verknüpfung der Undo/Redo-Steuerung mit der optimierten Aktualisierungslogik.

### Added
- **Einstellungen**: Globaler Shortcut (Strg+P) und Menüeintrag zum direkten Öffnen des Einstellungsfensters.
- **Projekt-Dashboard**: Automatischer Aufruf des Dashboards beim Erstellen neuer Projekte.
- **Playhead-Scrubbing**: Kontinuierliche Marker-Positionierung bei gedrückter Maustaste auf dem Zeitlineal.
- **Audio-Import**: Direktes Platzieren importierter Dateien an der aktuellen Playhead-Position.
- **Explorer-Navigation**: Ordnerwechsel per Einfachklick im Datei-Explorer.
- **Vorschau-Player**: Dauerhafte Sichtbarkeit des Kompakt-Vorschau-Players während des Datei-Browsings.
- **Sidebar-Erweiterung**: Dauerhafte Fixierung der "Spur hinzufügen"-Schaltfläche am unteren Rand des Spurbereichs.

## [0.2.4] - 2026-05-22
### Fixed
- **Start-Verhalten**: Stabilitätsverbesserung beim Anwendungsstart zur Gewährleistung der korrekten GUI-Initialisierung.

## [0.2.3] - 2026-05-22
### Added
- **Start-Dashboard**: Einführung eines übersichtlichen Startfensters für den Schnellzugriff auf Projekte.
- **Präzisions-Cuts**: Frame-genaue Schnittfunktion mittels Schnelltasten (T, C, U) für ausgewählte Regionen.

### Fixed
- **Audio-Trimming**: Begrenzung der Clip-Verschiebung auf die tatsächliche Länge der Quelldatei.
- **Split-Synchronisation**: Korrekte Berechnung des Audio-Offsets nach dem Zerschneiden von Clips.
- **Wellenform-Anzeige**: Robustere Rendering-Logik zur zuverlässigen Visualisierung von Audio-Wellenformen.
- **Installer-Routine**: Automatische Bereinigung veralteter Installationsordner im Setup-Vorgang.

## [0.2.2] - 2026-05-22
### Added
- **Bilinguale Dokumentation**: Bereitstellung der Projektdokumentation in deutscher und englischer Sprache inklusive Grafiken im Repository.

### Fixed
- **Update-Prüfung**: Fallback bei temporärer Nicht-Erreichbarkeit der Update-Server.

## [0.2.1] - 2026-05-22
### Fixed
- **UI-Konsistenz**: Integration der dynamischen Versionsanzeige im Hauptmenü sowie in der "Über"-Anzeige.

## [0.2.0] - 2026-05-22
### Added
- **Cross-Platform Builds**: Bereitstellung automatischer Build-Pipelines für Windows, macOS und Linux.

### Fixed
- **DevTools**: Deaktivierung des automatischen Öffnens der Entwicklertools in verpackten Versionen.
- **Lautstärkesteuerung**: Unterbindung ungewollter Wiedergabesprünge bei Interaktionen mit Fade- und Lautstärkelinien.

## [0.1.0] - 2026-05-22
### Added
- **Qualitätsrichtlinien**: Einführung einheitlicher Codierungsstandards.
- **Update-Checker**: Implementierung der automatischen und manuellen Update-Prüfung über die App-Oberfläche.
- **CI/CD-Integration**: Einrichtung automatischer Builds bei neuen Release-Tags.
