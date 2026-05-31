# YouTrack-Setup fuer Omega Wave Editor

Dieses Verzeichnis enthaelt ein schlankes Self-hosting-Setup fuer `bug.owe.omegaprojects.de`.

Enthalten:

- `compose.yaml`: startet YouTrack und Caddy per Docker Compose
- `Caddyfile`: richtet HTTPS und Reverse Proxy fuer die Domain ein
- `.env.example`: enthaelt die wichtigsten Variablen

## Voraussetzungen auf dem VPS

- Linux-VPS mit Docker und Docker Compose Plugin
- DNS-Record `bug.owe.omegaprojects.de` zeigt auf den VPS
- Eingehende Ports `80` und `443` sind in Firewall und Hosting-Firewall offen
- Genug freier RAM fuer YouTrack
  Richtwert: mindestens 4 GB fuer einen kleinen produktiven Start

## Deployment

1. Projektordner auf den VPS kopieren.
2. Im Ordner `deployment/youtrack` die Beispieldatei kopieren:

```bash
cp .env.example .env
```

3. Container starten:

```bash
docker compose up -d
```

4. Im Browser `https://bug.owe.omegaprojects.de` aufrufen.
5. Beim ersten Start den Admin-Account und die Basis-Konfiguration in YouTrack anlegen.

## Update

1. In `.env` bei Bedarf `YOUTRACK_VERSION` anheben.
2. Neue Images holen und neu starten:

```bash
docker compose pull
docker compose up -d
```

## Backups

YouTrack speichert seine Daten persistent in:

- `./volumes/youtrack/data`
- `./volumes/youtrack/conf`
- `./volumes/youtrack/logs`
- `./volumes/youtrack/backups`

Empfehlung:

- Vor Updates ein Dateisystem- oder Snapshot-Backup des gesamten Ordners `deployment/youtrack/volumes` anlegen.
- Zusaetzlich in YouTrack selbst regelmaessige interne Backups konfigurieren, damit Anhange und Konfiguration konsistent gesichert werden.

## Empfohlene erste Einrichtung in YouTrack

Projekt:

- `Omega Wave Editor`

Issue-Typen:

- `Bug`
- `Feature`
- `Task`
- `Regression`
- `Performance`
- `UX`

Status:

- `Inbox`
- `Confirmed`
- `In Progress`
- `Needs Test`
- `Done`
- `Duplicate`
- `Won't Fix`

Hilfreiche benutzerdefinierte Felder:

- `Bereich` mit Werten wie `Timeline`, `Audio Engine`, `UI`, `Export`, `MIDI`, `Plugins`
- `Build/Version`
- `Betriebssystem`
- `Prioritaet`

## Screenshot-Workflow

YouTrack eignet sich gut fuer deinen Snipping-Tool-Ablauf:

- Screenshot mit Windows Snipping Tool aufnehmen
- Bild in die Zwischenablage kopieren
- In Issue-Beschreibung oder Kommentar klicken
- `Ctrl+V` druecken

Bilder koennen zusaetzlich klassisch hochgeladen werden.

## Was noch offen ist

Dieses Repo enthaelt jetzt das startklare Deployment-Setup. Fuer den echten Livegang brauchen wir noch:

- SSH-Zugang zum VPS
- die bestaetigte DNS-Aufloesung fuer `bug.owe.omegaprojects.de`
- optional eine Entscheidung, ob der Dienst nur intern genutzt wird oder spaeter oeffentliche Melder bekommen soll
