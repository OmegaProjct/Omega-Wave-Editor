# Admin Dashboard — admin.owe.omegaprojects.de

Dieses Verzeichnis enthält das komplette Self-Hosting-Setup für das Telemetrie- und Download-Statistik-Dashboard des Omega Wave Editors.

Enthalten:

- `compose.yaml`: Startet den Express-Telemetrie-Server und Caddy per Docker Compose
- `Caddyfile`: Richtet automatisches HTTPS für `admin.owe.omegaprojects.de` via Let's Encrypt ein
- `server.js`: Express-Backend (Telemetrie-Logging, GitHub-API, Stats-Aggregation)
- `public/`: Statische Dashboard-Dateien (HTML/CSS/JS)

---

## Voraussetzungen auf dem VPS

- Linux-VPS mit Docker und Docker Compose Plugin
- DNS A-Record `admin.owe.omegaprojects.de` zeigt auf die VPS-IP
- Eingehende Ports `80` und `443` sind in der Firewall offen

---

## Deployment

1. Den Ordner `deployment/admin-dashboard` auf den VPS kopieren (z. B. via `scp` oder `git clone`):

```bash
scp -r deployment/admin-dashboard user@dein-vps:/opt/omega-admin
```

2. Auf dem VPS in den Ordner wechseln und Container starten:

```bash
cd /opt/omega-admin
docker compose up -d
```

3. Im Browser `https://admin.owe.omegaprojects.de` aufrufen.

Caddy holt das SSL-Zertifikat automatisch, sobald der DNS-Record korrekt gesetzt ist.

---

## Wie es funktioniert

### Telemetrie (Client → Server)

Der Omega Wave Editor sendet bei jedem **Update-Check** und bei jedem **Update-Download** einen anonymisierten HTTP-POST an:

```
POST https://admin.owe.omegaprojects.de/api/telemetry
{
  "os": "win32" | "darwin" | "linux",
  "version": "0.8.28",
  "action": "check" | "download"
}
```

Die IP-Adresse wird sofort als SHA-256-Hash gespeichert — kein Klartext, keine Personendaten.

Falls der Server nicht erreichbar ist (z. B. VPS ausgefallen oder DNS noch nicht konfiguriert), schlägt der Ping geräuschlos fehl und der Editor funktioniert vollständig normal weiter.

### Datenquellen im Dashboard

| Quelle | Was | Wie |
|---|---|---|
| GitHub API | Releases-Downloadzahlen pro Asset | Liveabfrage auf `api.github.com/repos/OmegaProjct/Omega-Wave-Editor/releases` |
| Telemetrie-Log | In-App Checks & Downloads | Lokale `data/telemetry-log.json` auf dem VPS |

---

## API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `GET /api/stats` | GET | Aggregierte Statistiken (GitHub + Telemetrie) |
| `POST /api/telemetry` | POST | Telemetrie-Event eintragen |
| `POST /api/control/clear` | POST | Alle Logs löschen |
| `POST /api/control/seed` | POST | Demo-Daten für 30 Tage laden |

---

## Update des Servers

```bash
cd /opt/omega-admin
docker compose pull
docker compose up -d
```

## Datenpersistenz

Die Telemetrie-Daten werden in einem Docker Volume gespeichert (`telemetry-data`) und überleben Container-Neustarts und Updates.

## Was noch nötig ist

- DNS A-Record `admin.owe.omegaprojects.de` → VPS-IP setzen
- Ports `80` und `443` in der VPS-Firewall öffnen
