# Hinweise fuer KI-Agenten

Bevor du in diesem Projekt groessere Aenderungen machst, lies zuerst:

- `docs/SANIERUNGSPLAN_MCP_PLUGIN_SUPPORT.md`
- `.clinerules`
- `CONTRIBUTING.md`

Der Sanierungsplan beschreibt die langfristige Richtung fuer:

- vollstaendige MCP-Bedienbarkeit
- Headless-Sessions
- parallele Jobs
- Recipes und Batch-Verarbeitung
- ID3-/Metadatenbearbeitung
- Audioanalyse
- Cross-Plattform Plugin-Support fuer VST2/VST3/AU/LV2

Wichtig: MCP soll nicht ueber UI-Klicks umgesetzt werden, sondern ueber einen stabilen Command Layer. Native Plugin-Unterstuetzung ist ein eigenes Subsystem und darf nicht als einfacher VST-Windows-Scanner behandelt werden.
