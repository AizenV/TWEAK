// Metadaten der Restore-Fixes (Implementierung in main.js, Schlüssel = id).
// tone: '' | 'good' | 'warn'  -> Farbe des Fix-Buttons
module.exports = [
  { id: 'vscode', name: 'VS Code / IDE Fix', desc: 'IDEs (VS Code) öffnen nach dem Tweak nicht mehr: Cache leeren + Hardware-Beschleunigung in argv.json abschalten.' },
  { id: 'searchbox', name: 'Suchleiste wiederherstellen', desc: 'Holt die Such-Box / den Such-Button in der Taskleiste zurück.', explorer: true },
  { id: 'window', name: 'Fenster: Animation, Rahmen & Verschieben', desc: 'Behebt den weißen Rahmen & fehlende Animation beim Verschieben und das Nicht-Verschieben/Snappen normal skalierter Fenster.', explorer: true },
  { id: 'snap', name: 'Fenster andocken & Snap zurück', desc: 'Schaltet „Fenster andocken“ wieder ein: maximierte Fenster lassen sich per Ziehen an der Titelleiste wieder verkleinern, oben andocken/maximieren und an den Rändern snappen. Startet den Explorer neu.', explorer: true },
  { id: 'cursor', name: 'Maus-Cursor zurücksetzen', desc: 'Stellt den normalen Windows-Standard-Mauszeiger wieder her.' },
  { id: 'sounds', name: 'Windows-Sounds zurücksetzen', desc: 'Stellt das Windows-Standard-Soundschema wieder her (Systemklänge waren aus).' },
  { id: 'selection', name: 'Blaues Auswahl-Rechteck zurück', desc: 'Linksklick-Auswahl ist wieder das durchsichtige blaue Rechteck statt der weißen gepunkteten Markierung.', explorer: true },
  { id: 'notifications', name: 'Benachrichtigungen wieder an', desc: 'Schaltet Windows-Benachrichtigungen / Toasts und das Info-Center wieder ein.', explorer: true },
  { id: 'power', name: 'Energiesparen wieder an', desc: 'Aktiviert Ruhezustand, Schnellstart, Energie-Drosselung & Sleep-Button wieder und stellt einen ausbalancierten Energieplan her.' },
  { id: 'defender', name: 'Windows Defender aktivieren', desc: 'Schaltet Windows Defender / Echtzeitschutz wieder ein (z. B. nach dem V3 Hardcore Tweak).', tone: 'good' },
  { id: 'v3', name: 'V3 Hardcore zurücksetzen (Performance-Fix)', desc: 'Macht die V3-Hardcore-Änderungen rückgängig: Dienste, NIC LSO, CPU-Mitigations, Defender, VBS, Hyper-V, Treiber-Blacklist, Prefetcher, Windows-Update- & Xbox-Dienste & Power-Plan zurück auf sichere Standards. Nutze das, wenn Games nach Stufe 3 schlechter oder komisch laufen. Reboot empfohlen.', tone: 'warn', reboot: true },
];
