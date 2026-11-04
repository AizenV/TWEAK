# Attack.tweaks Lizenz-Server + Admin-Panel

Keine Abhängigkeiten, nur Node.js ≥ 18. Läuft dauerhaft auf einem VPS oder eigenen PC (am besten hinter HTTPS).

## Was er kann
- **Admin-Panel** unter `/admin`: Keys erstellen (1 Woche / 1 Monat / Lifetime), Liste aller Keys mit Discord-ID, Hardware-ID, Status, Ablauf und letzter Aktivität, Suche und Filter.
- **Aktionen pro Key:** Hardware-ID zurücksetzen (PC-Wechsel), Tage verlängern, sperren / entsperren, löschen.
- **Bindung:** Jeder Key gehört zu genau einer **Discord-ID** (Pflicht beim Erstellen). Bei der ersten Aktivierung wird die **Hardware-ID** des PCs fest gebunden. Die Laufzeit startet erst bei der Aktivierung.
- **Fälschungssicher:** Der Server signiert jede Antwort (Ed25519). Die App prüft die Signatur mit dem eingebauten Public Key und bindet jede Antwort an eine Zufallszahl, sodass ein nachgebauter Server oder ein aufgezeichneter „OK“-Response nicht funktioniert.

## Einrichten
1. `config.example.json` → `config.json` kopieren, **adminPassword** (mind. 12 Zeichen) und **publicUrl** (deine https-Adresse) eintragen.
2. `node server.js` (oder `npm start`). Beim ersten Start wird der Signaturschlüssel in `data/` erzeugt.
3. `node server.js --client-config` ausführen und die Ausgabe in **`tweak-tool/license-config.json`** übernehmen (`serverUrl` + `publicKey`). Danach die App neu bauen (`build.bat`). Ohne diesen Schritt bleibt die App gesperrt.
4. `https://deine-domain/admin` öffnen, anmelden, ersten Key erstellen.
5. **HTTPS:** Den Server hinter einen Reverse-Proxy stellen (z. B. Caddy: `lizenz.deine-domain.de { reverse_proxy localhost:8790 }`) und `"trustProxy": true` lassen, damit das Rate-Limit die echte IP sieht.

## Discord-Anmeldung (Pflicht)
Kunden müssen sich bei der Aktivierung mit Discord anmelden. Der Key wird nur freigegeben, wenn der angemeldete Account die Discord-ID hat, für die der Key ausgestellt wurde. Es wird nur die ID gelesen (Scope `identify`). Der Server startet ohne diese Einrichtung nicht.
1. https://discord.com/developers/applications → New Application → **OAuth2**.
2. Unter *Redirects* eintragen: `https://deine-domain/auth/discord/callback`
3. **Client ID** und **Client Secret** in `config.json` unter `discord` eintragen (zusammen mit `publicUrl`), Server starten.

## Discord-Name automatisch über die ID (Bot-Token)
Gibst du beim Erstellen eines Keys eine Discord-ID ein, zeigt das Admin-Panel sofort **Name und Profilbild** als Vorschau, und der Key speichert beides automatisch. Eine ID, die es nicht gibt, wird abgelehnt (kein Tippfehler-Key).
1. https://discord.com/developers/applications → deine Anwendung → **Bot** → Token kopieren (derselbe Bot wie in `bot/` funktioniert; er muss auf keinem Server sein).
2. In `config.json` unter `discord` als **botToken** eintragen (oder Umgebungsvariable `DISCORD_BOT_TOKEN`) und den Server neu starten.
- Keys mit ID, aber ohne Namen, werden im Hintergrund nachgetragen. Der Button **„Discord-Namen aktualisieren“** lädt alle Namen und Bilder neu (z. B. nach Namensänderungen).
- **Discord-Rollen einsehen:** Trag zusätzlich die **guildId** deines Discord-Servers ein (Entwicklermodus → Rechtsklick auf den Server → ID kopieren) und lade den Bot auf diesen Server ein (OAuth2 → URL Generator → Scope `bot`, keine Rechte nötig). Dann zeigt jede Key-Karte die höchsten Rollen mit Farbe, die Details alle Rollen, und die Liste lässt sich nach Rolle filtern. Ist jemand nicht auf dem Server, steht das ebenfalls dort. Rollen werden alle 10 Minuten im Hintergrund aktualisiert; „Discord neu laden“ beim Key holt sie sofort.
- Ohne botToken funktioniert alles weiter: Der Name wird dann beim ersten Discord-Login erkannt. Der Token wird nur auf dem Server benutzt und nie an die App oder den Browser geschickt.

Ablauf in der App: Key eingeben → „Mit Discord anmelden“ → Browser öffnet Discord → Anmelden → zurück zur App. **Automatische Erkennung:** Beim Erstellen eines Keys ist die Discord-ID optional. Lässt du sie leer, erkennt der Server die ID beim ersten Discord-Login selbst, speichert sie samt Namen und bindet den Key an diesen Account. Gibst du eine ID vor, darf nur dieser Account den Key aktivieren.

Jede neue Aktivierung (auch nach Abmelden oder HWID-Reset) verlangt die Anmeldung erneut. Die Prüfung im Hintergrund (Start, alle 30 Min.) läuft ohne erneute Anmeldung.

## Server-Boost-Belohnung
Der Discord-Bot (Ordner `bot/`) ruft den Server auf, sobald jemand deinen Discord-Server boostet, und schickt den neuen Key per DM. Aktivieren: **boost.secret** (mind. 20 Zeichen, geheim halten) in `config.json` eintragen, optional `boost.days` (Standard 3), und dasselbe Secret im Bot eintragen (siehe `bot/README.md`). Die Keys erscheinen im Admin-Panel mit Tarif „3 Tage (Boost)“, Preis 0 € (zählt nicht zum Umsatz) und Notiz zur DM-Zustellung. Ein Boost-Key gehört fest zur Discord-ID des Boosters; pro Person wird nur einmal einer erstellt. Ohne `boost.secret` ist die Schnittstelle aus.

## Daten & Sicherheit
- Alles liegt in `data/` (`keys.json`, `server-key.pem`). **Regelmäßig sichern**; geht `server-key.pem` verloren, passt der Public Key in der App nicht mehr.
- Der Admin-Login ist rate-limitiert (8 Versuche / 10 Min.), die Session ist 12 h gültig (HttpOnly, SameSite=Strict).
- Gespeichert werden Discord-ID, Hardware-ID-Hash und Zeitstempel, keine IP-Adressen. Weise in deiner Datenschutzerklärung darauf hin.
- Gesperrte/abgelaufene Keys verlieren die Lizenz beim nächsten Check (beim Start und alle 30 Min.). Ohne Internet läuft die App bis zu `graceHours` (Standard 72 h) mit der letzten gültigen Antwort weiter.

## Tests
`npm test` (Server, 25 Prüfungen, Discord wird simuliert) und im Projekt-Root `node license-server/client-integration-test.js` (App gegen Server).
