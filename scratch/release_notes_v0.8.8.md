# Upgrade Notice / Wichtiger Hinweis zum Update

[EN] Before updating the Omega Wave Editor, please make sure to save your active projects (`.owep`). If you are upgrading from an older version, your settings and recent project lists will be preserved safely.

[DE] Bitte stelle vor dem Update des Omega Wave Editors sicher, dass deine aktiven Projekte (`.owep`) gespeichert sind. Wenn du von einer älteren Version aktualisierst, bleiben deine Einstellungen und die Liste der letzten Projekte sicher erhalten.

---

# Omega Wave Editor v0.8.8 - Patch Notes / Versionshinweise

Welcome to the new release of the **Omega Wave Editor**! Below are the changes included in this version:
Willkommen zur neuen Version des **Omega Wave Editors**! Nachfolgend findest du alle Änderungen dieser Version:

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
