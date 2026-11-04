# Attack.tweaks Presets-Bot

Liest Discord-Kanäle, ordnet jeden Kanal einer Kategorie zu und stellt die Presets der App bereit.

## Einrichten
1. https://discord.com/developers/applications → New Application → Bot → Token kopieren.
2. Beim Bot **Message Content Intent** aktivieren. Bot mit Rechten *Kanäle ansehen* + *Nachrichtenverlauf lesen* einladen.
3. `config.example.json` → `config.json` kopieren, `token` eintragen.
4. Unter `channels` pro Kanal die **Kanal-ID** (Discord: Entwicklermodus → Rechtsklick → ID kopieren) und `category` eintragen.
   Mehrere Kanäle können dieselbe Kategorie haben. Neue Kategorien einfach unter `categories` ergänzen – die App zeigt sie automatisch als Tab.
5. `npm install` und `npm start`.
6. In der App: **Presets → Quelle** → `http://<server>:8787/presets.json` (bei gesetztem `apiKey`: `?key=...` anhängen).

## Was wird übernommen?
Jede Nachricht mit Archiv-Anhang (`.zip/.rar/.7z/…`) oder Download-Link. Erste Textzeile = Name, `v1.2` = Version,
restlicher Text = Beschreibung, Bild-Anhang = Vorschau. Nachrichten ohne Datei/Link werden ignoriert.
Neue/geänderte/gelöschte Nachrichten werden automatisch nachgezogen, dazu alle `intervalMin` Minuten ein Komplettscan
(Discord-Datei-Links laufen nach ~24 h ab, deshalb wird regelmäßig erneuert).

Der Bot muss dauerhaft laufen (eigener PC/VPS). Für Zugriff von außen Port freigeben oder Reverse-Proxy/Tunnel nutzen.
Link-Presets (Mediafire, Drive …) öffnet die App im Browser, Datei-Presets werden direkt in den Zielordner entpackt.

## Server-Boost → 3-Tage-Key per DM (optional)
Wer deinen Server boostet, bekommt automatisch einen Key für Attack.tweaks per Direktnachricht. Der Key wird vom Lizenz-Server erzeugt, ist an die Discord-ID des Boosters gebunden und startet erst bei der Aktivierung. **Pro Person gibt es nur einmal einen Boost-Key** (Boost beenden und neu starten gibt keinen zweiten).
1. Im Developer Portal beim Bot **Server Members Intent** aktivieren (Bot → Privileged Gateway Intents).
2. Im Lizenz-Server in `config.json` ein langes zufälliges **boost.secret** eintragen (mind. 20 Zeichen, optional `days`, Standard 3) und den Server neu starten.
3. In der Bot-`config.json` den Block `boost` ausfüllen: `enabled: true`, `guildId` (dein Server), `licenseUrl` (Adresse des Lizenz-Servers) und dasselbe `secret`. Optional `message` für einen eigenen DM-Text (Platzhalter `{name}`, `{server}`, `{days}`, `{key}`).
4. Bot neu starten. Nach dem Start lädt er die Mitglieder einmal, damit nur wirklich **neue** Boosts zählen – wer schon vorher geboostet hat, bekommt keinen Key.

Hat jemand DMs von Servermitgliedern aus, kann die Nachricht nicht zugestellt werden: Der Key bleibt trotzdem im Admin-Panel (Notiz „DM fehlgeschlagen“), und du kannst ihn manuell schicken. Der Bot muss dauerhaft laufen, sonst werden Boosts in der Zwischenzeit nicht erkannt. `npm test` prüft die Boost-Logik.
