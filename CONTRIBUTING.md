# Mitwirken am Omega Wave Editor

Vielen Dank, dass du dich an der Entwicklung des Omega Wave Editors beteiligen möchtest! Dieses Dokument enthält alle Richtlinien und Checklisten, die dir helfen, deinen Code sauber, stabil und im Einklang mit dem Gesamtprojekt zu halten.

## 1. Unsere Entwicklungs-Prinzipien

1. **Modulares Design**: Halte Renderer-Komponenten (React) und System-Logik (Electron Main-Prozess via IPC) sauber voneinander getrennt.
2. **Echtzeit-Stabilität**: Die Audio-Engine (`AudioEngine.ts`) arbeitet im Web-Audio-Thread des Browsers. Parameter-Änderungen an Audio-Nodes müssen knack- und latenzfrei erfolgen.
3. **Responsive & Rich Aesthetics**: Verwende TailwindCSS und ein harmonisches HSL-basiertes Farbschema. Die Benutzeroberfläche soll stets edel und modern wirken.
4. **Verlustfreie Audiobearbeitung**: Alle Clip-Veränderungen (Lautstärke, Fades, EQ) sind nicht-destruktiver Natur und dürfen die Originaldatei auf der Festplatte niemals modifizieren.

---

## 2. Pull Request Checkliste

Bevor du einen Pull Request einreichst, vergewissere dich bitte, dass du alle folgenden Punkte abgehakt hast:

- [ ] **Typensicherheit**: Der TypeScript Compiler läuft fehlerfrei durch (`npm run typecheck`).
- [ ] **Erfolgreicher Build**: Die Anwendung lässt sich fehlerfrei für die Produktion kompilieren (`npm run build`).
- [ ] **Keine toten Dateien**: Lokale Pfade, Testdateien und temporäre Logfiles wurden aus dem Git-Index ausgeschlossen (`.gitignore` beachten).
- [ ] **Verlaufserhaltung**: Änderungen an Audio-Objekten auf der Timeline müssen die Verlaufshistorie mittels `HistoryManager.pushState()` sichern (für Rückgängig/Wiederholen).
- [ ] **Manuelle Verifikation**: Die geänderten Funktionen wurden in der Live-Anwendung auf Herz und Nieren geprüft.

---

## 3. Onboarding & Lokale Einrichtung

Um lokal mit der Entwicklung zu beginnen, folge diesen Schritten:

1. **Voraussetzungen prüfen**:
   - Installiere **Node.js** (v18+) und **npm** (v9+).
   - FFmpeg wird automatisch über statische Binaries bezogen.
2. **Repository klonen**:
   ```bash
   git clone https://github.com/OmegaProjct/Omega-Wave-Editor.git
   cd Omega-Wave-Editor
   ```
3. **Abhängigkeiten installieren**:
   ```bash
   npm install
   ```
4. **Entwicklungsserver starten**:
   ```bash
   npm run dev
   ```

---

## 4. Code & Struktur Konventionen

* **Dateistruktur**:
  - `src/main/`: Electron Main-Prozess (I/O, Dateizugriff, native Betriebssystem-Features, VST-Host).
  - `src/renderer/`: Frontend (React, Timeline, UI-Komponenten).
  - `src/preload/`: Sichere Bridge zwischen Main- und Renderer-Prozess.
* **Tastaturkurzel**:
  - Globale Hotkeys werden zentral in `App.tsx` abgefangen.
  - Formularfelder und Modals müssen die Hotkeys temporär blockieren, um Fehltrigger zu vermeiden.
* **Audio-Engine**:
  - Verwende für Lautstärkeänderungen stets die lineare Rampe `linearRampToValueAtTime`, um digitale Knackser zu vermeiden.
