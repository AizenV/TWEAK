# Änderungen

## Neu: Lizenzsystem
- `license-server/` – Server + Admin-Panel (siehe dortige README).
- `tweak-tool/license.js`, `license-config.json`, `renderer/license.js` – Aktivierung, Hardware-ID, signierte Prüfung, Offline-Toleranz.
- Gesperrt ohne Lizenz: Tweaks anwenden (Tweaks, FiveM-Tweaks, Spiele-Tweaks, Preset-Installation).
- Immer frei: Zurücksetzen, Restore-Fixes, Wiederherstellungspunkte, Cleaner.

- **Discord-Anmeldung ist Pflicht:** Aktivierung nur nach Login mit Discord; der Account muss zur Discord-ID des Keys passen. Die manuelle ID-Eingabe in der App entfällt.

## Key-Verwaltung (Admin-Panel) neu gestaltet
- Übersichtliche Key-Karten statt breiter Tabelle: Profilbild + Discord-Name, Key, Status mit Restlaufzeit-Balken. Klick auf eine Karte zeigt Details und Aktionen (HWID-Reset, + Tage, Notiz, Sperren, Löschen).
- Tarif-Auswahl als Karten, Sortierung (Neueste / Läuft bald ab / Zuletzt online / Name), Suche auch nach Namen, Kennzahlen mit „läuft in 7 Tagen ab“, eigene Bestätigungsfenster statt Browser-Popups, lesbare Aktivitätsliste.
- **Discord-Name automatisch:** ID eingeben → Name und Profilbild erscheinen live als Vorschau und werden am Key gespeichert. Dafür `discord.botToken` in `license-server/config.json` eintragen (siehe README). Das Feld „Discord-Name“ entfällt.
- **Discord-Rollen:** Rollen des Kunden auf deinem Server (mit Farbe) auf der Key-Karte und in den Details, Filter nach Rolle, Hinweis „nicht auf deinem Server“. Dafür `discord.guildId` eintragen und den Bot auf den Server einladen (README).
- Fehlende Namen alter Keys werden automatisch nachgetragen; Button „Discord-Namen aktualisieren“ lädt alle neu.

## Server-Boost → 3-Tage-Key per DM
- Der Discord-Bot erkennt, wenn jemand den Server boostet, holt vom Lizenz-Server einen Key (Standard 3 Tage, an die Discord-ID des Boosters gebunden) und schickt ihn per DM. Einmal pro Person; Alt-Booster und Rollenwechsel lösen nichts aus.
- Im Admin-Panel: Tarif „3 Tage (Boost)“, Preis 0 €, Notiz zur Zustellung; ist die DM nicht möglich, steht dort ein Hinweis zum manuellen Senden.
- Einrichtung: `boost.secret` im Lizenz-Server und im Bot, Server Members Intent beim Bot (siehe `bot/README.md`).

## Verbesserte Tweaks (27 statt 17)
- Neu: Game Bar Overlay aus, Anschlagverzögerung-/Umschalttasten-Popups aus, Tastatur-Wiederholrate, Update-Peer-Sharing aus, MPO aus, Vorschläge & Werbung aus, Websuche im Startmenü aus, Werbe-ID aus, Fensteranimationen aus, Fehlerberichterstattung aus.
- „Spiele-Priorität“ setzt zusätzlich SFIO Priority.
- Jeder Tweak ist als **empfohlen** markiert (18) oder nicht. „Alle empfohlenen anwenden“ setzt jetzt nur noch diese; vorher wurden alle ohne Neustart angewendet (auch Telemetrie, Ruhezustand).
- Neuer Filter „Empfohlen“ und Hinweis „VORSICHT“ bei hardwareabhängigen Tweaks.
- Tweak-Liste lädt deutlich schneller (parallele Abfragen).

## Neu: Tweak-Kategorien in der Sidebar
- Die Sidebar hat jetzt die ausklappbare Gruppe **Tweaks** mit den Kategorien CPU / RAM, GPU, Power, Network, Windows, WASD Input, Hit Reg, Services und Treiber. Jede Kategorie zeigt einen Zähler der aktiven Tweaks (grüner Punkt, sobald mindestens einer aktiv ist). Kategorien ohne Tweaks werden ausgeblendet.
- Pro Kategorie: „Empfohlene anwenden“ und „Alle zurücksetzen“. Tweaks, die auf diesem PC nicht möglich sind (z. B. Dienst nicht vorhanden), werden als „Nicht verfügbar“ markiert und zählen nicht in den Optimierungsgrad.
- Noch nicht einsortierte Tweaks stehen unter **Sonstige**.
- Alle Tweaks bleiben lizenzpflichtig beim Anwenden; Zurücksetzen ist immer frei, Originalwerte werden gesichert.

### CPU / RAM (neu)
- Vordergrund-Priorität für Spiele (Win32PrioritySeparation), Core-Parking aus (Energieplan, Original wird gesichert), Speicherkomprimierung aus, Kernel & Treiber im RAM halten, NTFS-Zugriffszeit nicht mehr schreiben.
- „Spiele-Priorität erhöhen“ ist jetzt in dieser Kategorie.

### GPU (neu)
- Hardware-beschleunigtes GPU-Scheduling, Multiplane Overlay (MPO) aus und Fullscreen-Optimierungen aus sind jetzt hier einsortiert.
- Neu: „Optimierungen für Spiele im Fenstermodus“ (Flip-Modell für DX10/11-Spiele im Fenster/randlosen Fenster).

### Power (neu)
- Höchstleistungs-Energieplan, Power Throttling aus und Ruhezustand & Schnellstart aus sind jetzt hier einsortiert.
- Neu: USB-Energiesparen (Selective Suspend) aus, PCIe-Energiesparen (Link State) aus, CPU-Mindesttakt 100 %, Festplatten nie ausschalten. Die Energieplan-Werte werden beim Anwenden gesichert und beim Zurücksetzen wiederhergestellt.

### Network (neu)
- Netzwerk-Drosselung aus, System-Reaktionsfähigkeit 0 % und Update-Peer-Sharing aus sind jetzt hier einsortiert.
- Neu: QoS-Bandbreitenreservierung aus, IPv4 vor IPv6 bevorzugen (IPv6 bleibt aktiv, Neustart nötig).

### Windows (neu)
- Hier liegen jetzt alle Windows-Tweaks: Game Mode, Game DVR, Game Bar Overlay, Hintergrund-Apps, Telemetrie, Fehlerberichterstattung sowie die Oberflächen-Tweaks (Menü-/Autostart-Verzögerung, Vorschläge & Werbung, Websuche, Werbe-ID, Fensteranimationen, Transparenz).
- Neu: Aktivitätsverlauf aus.

### WASD Input (neu)
- Mausbeschleunigung aus, Einrastfunktion aus, Anschlagverzögerung-/Umschalt-Popups aus und Tastatur-Wiederholrate sind jetzt hier einsortiert (Kategorie „Eingabe“ entfällt).
- Neu: Bedienhilfen-Hotkeys aus (Hoher Kontrast, Maustasten), Windows-Taste deaktivieren (Neustart nötig, vorhandene Tastenzuordnung wird gesichert).

### Hit Reg (neu)
- Globale Timer-Auflösung, Plattform-Tick & Dynamic Tick aus (Boot-Konfiguration), Spiele-Latenz-Priorität (MMCSS), Nagle-Algorithmus aus (TCP No Delay).
- Ehrlicher Hinweis: Die Trefferprüfung selbst läuft auf dem Spiele-Server. Diese Tweaks verbessern Timer, Eingabe- und Paket-Timing auf deinem PC – kein Ersatz für eine stabile Leitung.

### Services (neu)
- Telemetrie-Dienste aus, Unnötige Dienste aus (Fax, Karten, Standort, Retail-Demo), SysMain (Superfetch) aus, Windows-Suchindex aus, Xbox-Dienste aus, Druckwarteschlange aus.
- Dienste werden über den Starttyp deaktiviert und sofort gestoppt; der ursprüngliche Starttyp wird gesichert und beim Zurücksetzen wiederhergestellt. Dienste, die auf dem PC fehlen, werden nie neu angelegt – der Tweak steht dann auf „Nicht verfügbar“.
- Mit Risiko-Hinweis „VORSICHT“: SysMain (HDD), Suchindex, Xbox, Spooler.

### Treiber (neu)
- Treiber nicht über Windows Update tauschen, NVIDIA-Telemetrie-Dienst aus, MSI-Modus für die Grafikkarte (Neustart nötig), Netzwerkadapter: Energiesparen aus (EEE, Green Ethernet, Selective Suspend, ULP – die Verbindung trennt sich kurz).
- Nur vorhandene Dienste/Geräte/Optionen werden geändert, Originalwerte werden gesichert; fehlt etwas auf dem PC, steht der Tweak auf „Nicht verfügbar“.

## Stand: alle 9 Kategorien eingebaut
- Die alte Kategorie „Eingabe“, „Gaming“, „System“, „Netzwerk“ und „Oberfläche“ sind vollständig auf die neuen Kategorien verteilt; „Sonstige“ erscheint nur noch, falls später neue Tweaks ohne Kategorie ergänzt werden.

