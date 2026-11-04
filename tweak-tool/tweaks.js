// Tweak-Definitionen. Jeder Tweak ist umkehrbar: Originalwerte werden vor dem ersten Anwenden gesichert.
// rec: true  -> wird von „Empfohlene anwenden“ gesetzt (sicher, kein Neustart, kein Funktionsverlust)
// risk: 'mid' -> Hinweis „Vorsicht“ in der Oberfläche (hängt von Hardware/Windows-Version ab oder entfernt Funktionen)
const D = 'REG_DWORD', S = 'REG_SZ';
const HK = (p) => 'HKCU\\' + p, HL = (p) => 'HKLM\\' + p;
const MM = 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile';
const GCS = 'System\\GameConfigStore';
const CDM = 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager';

module.exports = [
  // ---------- CPU / RAM ----------
  { id: 'prioctl', cat: 'CPU / RAM', rec: true, name: 'Vordergrund-Priorität für Spiele', desc: 'Das aktive Fenster bekommt bevorzugt CPU-Zeit (Win32PrioritySeparation = 38). Wirkt sofort bzw. nach Neuanmeldung.', admin: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Control\\PriorityControl'), n: 'Win32PrioritySeparation', t: D, on: 38, off: 2 }] },
  { id: 'coreparking', cat: 'CPU / RAM', rec: true, name: 'Core-Parking aus', desc: 'Alle CPU-Kerne bleiben aktiv statt schlafen gelegt zu werden – weniger Latenzspitzen, etwas mehr Stromverbrauch. Gilt für den aktiven Energieplan (Netzbetrieb).', admin: true, custom: 'pcfg',
    pc: { sub: 'SUB_PROCESSOR', set: 'CPMINCORES', on: 100, off: 10 } },
  { id: 'memcomp', cat: 'CPU / RAM', risk: 'mid', name: 'Speicherkomprimierung aus', desc: 'Windows komprimiert keinen Arbeitsspeicher mehr – spart CPU-Zeit. Nur sinnvoll mit ausreichend RAM (ab ca. 16 GB). Benötigt Neustart.', admin: true, reboot: true, custom: 'memcomp' },
  { id: 'pagingexec', cat: 'CPU / RAM', risk: 'mid', name: 'Kernel & Treiber im RAM halten', desc: 'Kernel und Treiber werden nicht in die Auslagerungsdatei verschoben (DisablePagingExecutive). Nur ab ca. 16 GB RAM sinnvoll. Benötigt Neustart.', admin: true, reboot: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management'), n: 'DisablePagingExecutive', t: D, on: 1, off: 0 }] },
  { id: 'ntfslast', cat: 'CPU / RAM', name: 'NTFS-Zugriffszeit nicht mehr schreiben', desc: 'Windows aktualisiert beim Lesen von Dateien nicht mehr deren „Letzter Zugriff“ – weniger Schreibvorgänge auf der Platte. Benötigt Neustart.', admin: true, reboot: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Control\\FileSystem'), n: 'NtfsDisableLastAccessUpdate', t: D, on: 2147483649, off: 2147483650 }] },

  // ---------- GPU ----------
  { id: 'swapupgrade', cat: 'GPU', rec: true, name: 'Optimierungen für Spiele im Fenstermodus', desc: 'Windows nutzt für DX10/11-Spiele im Fenster oder randlosen Fenster das moderne Flip-Modell – geringere Latenz, weniger Tearing. (Einstellung „Optimierungen für Fenstermodus-Spiele“)',
    items: [{ k: HK('Software\\Microsoft\\DirectX\\UserGpuPreferences'), n: 'DirectXUserGlobalSettings', t: S, on: 'SwapEffectUpgradeEnable=1;', off: null }] },

  // ---------- Power ----------
  { id: 'usbsuspend', cat: 'Power', name: 'USB-Energiesparen (Selective Suspend) aus', desc: 'USB-Geräte (Maus, Tastatur, Headset) werden nie schlafen gelegt – keine Aussetzer oder Aufwach-Verzögerung. Wirkt nach Neustart.', admin: true, reboot: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Services\\USB'), n: 'DisableSelectiveSuspend', t: D, on: 1, off: 0 }] },
  { id: 'pcie_aspm', cat: 'Power', risk: 'mid', name: 'PCIe-Energiesparen (Link State) aus', desc: 'Grafikkarte und NVMe-SSD bleiben im vollen Link-Zustand – keine Wake-up-Latenz. Mehr Stromverbrauch (bei Laptops im Akkubetrieb nicht empfohlen). Gilt für den aktiven Energieplan (Netzbetrieb).', admin: true, custom: 'pcfg',
    pc: { sub: 'SUB_PCIEXPRESS', set: 'ASPM', on: 0, off: 2 } },
  { id: 'cpumin', cat: 'Power', risk: 'mid', name: 'CPU-Mindesttakt 100 %', desc: 'Der Prozessor taktet nie herunter – sofort volle Leistung, aber dauerhaft mehr Verbrauch und Wärme. Gilt für den aktiven Energieplan (Netzbetrieb).', admin: true, custom: 'pcfg',
    pc: { sub: 'SUB_PROCESSOR', set: 'PROCTHROTTLEMIN', on: 100, off: 5 } },
  { id: 'diskidle', cat: 'Power', rec: true, name: 'Festplatten nie ausschalten', desc: 'Datenträger gehen im Netzbetrieb nicht mehr in den Ruhezustand – keine Verzögerung beim Nachladen. Gilt für den aktiven Energieplan.', admin: true, custom: 'pcfg',
    pc: { sub: 'SUB_DISK', set: 'DISKIDLE', on: 0, off: 1200 } },

  // ---------- Network ----------
  { id: 'qos', cat: 'Network', name: 'QoS-Bandbreitenreservierung aus', desc: 'Windows reserviert keine Bandbreite mehr für QoS-Dienste (NonBestEffortLimit = 0). Der Effekt ist auf den meisten PCs klein, schadet aber nicht.', admin: true,
    items: [{ k: HL('SOFTWARE\\Policies\\Microsoft\\Windows\\Psched'), n: 'NonBestEffortLimit', t: D, on: 0, off: null }] },
  { id: 'ipv4pref', cat: 'Network', name: 'IPv4 vor IPv6 bevorzugen', desc: 'Verbindungen versuchen zuerst IPv4 – hilft bei Game-Servern mit schlecht angebundenem IPv6 (lange Verbindungsaufbauten). IPv6 bleibt aktiv. Benötigt Neustart.', admin: true, reboot: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters'), n: 'DisabledComponents', t: D, on: 32, off: null }] },

  // ---------- Windows ----------
  { id: 'activity', cat: 'Windows', name: 'Aktivitätsverlauf aus', desc: 'Windows speichert und synchronisiert keinen Aktivitätsverlauf (Zeitachse) mehr – weniger Hintergrundaktivität und Datenerfassung.', admin: true,
    items: [{ k: HL('SOFTWARE\\Policies\\Microsoft\\Windows\\System'), n: 'EnableActivityFeed', t: D, on: 0, off: null },
            { k: HL('SOFTWARE\\Policies\\Microsoft\\Windows\\System'), n: 'PublishUserActivities', t: D, on: 0, off: null },
            { k: HL('SOFTWARE\\Policies\\Microsoft\\Windows\\System'), n: 'UploadUserActivities', t: D, on: 0, off: null }] },

  // ---------- WASD Input ----------
  { id: 'ahotkeys', cat: 'WASD Input', rec: true, name: 'Bedienhilfen-Hotkeys aus', desc: 'Schaltet die Tastenkürzel für „Hoher Kontrast“ (Alt links + Umschalt links + Druck) und „Maustasten“ (Alt links + Umschalt links + Num) ab, die mitten im Spiel aufpoppen können.',
    items: [{ k: HK('Control Panel\\Accessibility\\HighContrast'), n: 'Flags', t: S, on: '122', off: '126' },
            { k: HK('Control Panel\\Accessibility\\MouseKeys'), n: 'Flags', t: S, on: '186', off: '190' }] },
  { id: 'winkey', cat: 'WASD Input', risk: 'mid', name: 'Windows-Taste deaktivieren', desc: 'Die linke und rechte Windows-Taste tut nichts mehr – kein versehentliches Verlassen des Spiels. Gilt auch außerhalb von Spielen und überschreibt vorhandene Tastenzuordnungen (der alte Wert wird gesichert). Benötigt Neustart.', admin: true, reboot: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Control\\Keyboard Layout'), n: 'Scancode Map', t: 'REG_BINARY', on: '00000000000000000300000000005BE000005CE000000000', off: null }] },

  // ---------- Hit Reg ----------
  // Hinweis: Die eigentliche Trefferprüfung läuft auf dem Server. Diese Tweaks verbessern Timer, Eingabe- und Paket-Timing auf deinem PC.
  { id: 'timerres', cat: 'Hit Reg', rec: true, name: 'Globale Timer-Auflösung', desc: 'Programme dürfen die hohe Timer-Auflösung (0,5–1 ms) wieder systemweit anfordern – gleichmäßigeres Frame- und Eingabe-Timing. Gilt ab Windows 10 2004. Benötigt Neustart.', admin: true, reboot: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel'), n: 'GlobalTimerResolutionRequests', t: D, on: 1, off: null }] },
  { id: 'platformtick', cat: 'Hit Reg', risk: 'mid', name: 'Plattform-Tick & Dynamic Tick aus', desc: 'Setzt in der Boot-Konfiguration useplatformtick und disabledynamictick – konstanter Timer-Takt, weniger Schwankungen. Wirkung hängt vom System ab (kann Stromverbrauch erhöhen). Benötigt Neustart.', admin: true, reboot: true, custom: 'bcd',
    bcd: ['useplatformtick', 'disabledynamictick'] },
  { id: 'mmcsslat', cat: 'Hit Reg', rec: true, name: 'Spiele: Latenz-Priorität (MMCSS)', desc: 'Markiert die Multimedia-Aufgabe „Games“ als latenzkritisch – der Scheduler bedient Spiele-Threads früher.', admin: true,
    items: [{ k: HL(MM + '\\Tasks\\Games'), n: 'Latency Sensitive', t: S, on: 'True', off: null }] },
  { id: 'nagle', cat: 'Hit Reg', rec: true, name: 'Nagle-Algorithmus aus (TCP No Delay)', desc: 'Kleine Netzwerkpakete werden sofort gesendet statt gebündelt – niedrigere Latenz bei TCP-Verbindungen. Gilt für alle aktiven Netzwerkadapter und neue Verbindungen; bei UDP-Spielen ohne Wirkung.', admin: true, custom: 'nagle' },

  // ---------- Services ----------
  // Dienste werden über den Starttyp deaktiviert (Original wird gesichert) und sofort gestoppt. Fehlt ein Dienst auf diesem PC, ist der Tweak „nicht verfügbar“.
  { id: 'svc_telemetry', cat: 'Services', rec: true, name: 'Telemetrie-Dienste aus', desc: 'Deaktiviert „Benutzererfahrungen und Telemetrie“ (DiagTrack) und den WAP-Push-Dienst – weniger Hintergrundlast und Datenversand.', admin: true, custom: 'svc',
    svc: [{ n: 'DiagTrack', off: 2 }, { n: 'dmwappushservice', off: 3 }] },
  { id: 'svc_misc', cat: 'Services', rec: true, name: 'Unnötige Dienste aus (Fax, Karten, Standort, Retail-Demo)', desc: 'Deaktiviert Fax, Heruntergeladene Karten, Geolokalisierung und den Retail-Demo-Dienst. Auf Gaming-PCs ungenutzt.', admin: true, custom: 'svc',
    svc: [{ n: 'Fax', off: 3 }, { n: 'MapsBroker', off: 2 }, { n: 'lfsvc', off: 3 }, { n: 'RetailDemo', off: 3 }] },
  { id: 'svc_sysmain', cat: 'Services', risk: 'mid', name: 'SysMain (Superfetch) aus', desc: 'Windows lädt Programme nicht mehr vorab in den RAM – weniger Platten- und CPU-Last. Auf SSDs sinnvoll, auf HDDs können Programme langsamer starten.', admin: true, custom: 'svc',
    svc: [{ n: 'SysMain', off: 2 }] },
  { id: 'svc_wsearch', cat: 'Services', risk: 'mid', name: 'Windows-Suchindex (WSearch) aus', desc: 'Kein Hintergrund-Indexer mehr – weniger Platten- und CPU-Last. Die Suche im Startmenü/Explorer wird langsamer.', admin: true, custom: 'svc',
    svc: [{ n: 'WSearch', off: 2 }] },
  { id: 'svc_xbox', cat: 'Services', risk: 'mid', name: 'Xbox-Dienste aus', desc: 'Deaktiviert Xbox-Anmeldung, Spielstände, Netzwerk und Gamepad-Dienst. Achtung: Xbox-App, Game Pass und manche Spiele (z. B. Minecraft Bedrock, Forza) brauchen diese Dienste.', admin: true, custom: 'svc',
    svc: [{ n: 'XblAuthManager', off: 3 }, { n: 'XblGameSave', off: 3 }, { n: 'XboxNetApiSvc', off: 3 }, { n: 'XboxGipSvc', off: 3 }] },
  { id: 'svc_spooler', cat: 'Services', risk: 'mid', name: 'Druckwarteschlange aus', desc: 'Stoppt den Druckdienst (Spooler). Drucken und PDF-Drucker funktionieren dann nicht, bis du den Tweak zurücksetzt.', admin: true, custom: 'svc',
    svc: [{ n: 'Spooler', off: 2 }] },

  // ---------- Treiber ----------
  { id: 'wudrivers', cat: 'Treiber', rec: true, name: 'Treiber nicht über Windows Update tauschen', desc: 'Windows Update installiert keine Treiber mehr automatisch (z. B. keinen älteren Grafiktreiber über deinen neuen). Treiber aktualisierst du selbst beim Hersteller.', admin: true,
    items: [{ k: HL('SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate'), n: 'ExcludeWUDriversInQualityUpdate', t: D, on: 1, off: null },
            { k: HL('SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DriverSearching'), n: 'SearchOrderConfig', t: D, on: 0, off: 1 }] },
  { id: 'nvtelemetry', cat: 'Treiber', rec: true, name: 'NVIDIA-Telemetrie-Dienst aus', desc: 'Deaktiviert den NVIDIA-Telemetrie-Container des Grafiktreibers. Nur verfügbar, wenn der Dienst installiert ist.', admin: true, custom: 'svc',
    svc: [{ n: 'NvTelemetryContainer', off: 2 }] },
  { id: 'msi_gpu', cat: 'Treiber', risk: 'mid', name: 'MSI-Modus für die Grafikkarte', desc: 'Die Grafikkarte nutzt Message Signaled Interrupts – meist geringere Interrupt-Latenz. Moderne Treiber setzen das schon selbst; auf manchen Systemen kann es Probleme machen (Zurücksetzen stellt den Original-Wert wieder her). Benötigt Neustart.', admin: true, reboot: true, custom: 'msi' },
  { id: 'nic_power', cat: 'Treiber', risk: 'mid', name: 'Netzwerkadapter: Energiesparen aus', desc: 'Schaltet Energy-Efficient Ethernet, Green Ethernet, Selective Suspend und Ultra-Low-Power am Adapter-Treiber ab – stabilerer Ping. Die Verbindung trennt sich dabei kurz. Nur vorhandene Optionen werden geändert.', admin: true, custom: 'nicprops' },

  // ---------- Gaming ----------
  { id: 'gamemode', cat: 'Windows', rec: true, name: 'Game Mode aktivieren', desc: 'Windows priorisiert das laufende Spiel und blockiert Hintergrund-Updates.',
    items: [{ k: HK('Software\\Microsoft\\GameBar'), n: 'AutoGameModeEnabled', t: D, on: 1, off: 0 },
            { k: HK('Software\\Microsoft\\GameBar'), n: 'AllowAutoGameMode', t: D, on: 1, off: 0 }] },
  { id: 'gamedvr', cat: 'Windows', rec: true, name: 'Game DVR / Aufnahme deaktivieren', desc: 'Schaltet die Xbox-Hintergrundaufnahme ab – weniger FPS-Einbrüche.',
    items: [{ k: HK(GCS), n: 'GameDVR_Enabled', t: D, on: 0, off: 1 },
            { k: HK('Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR'), n: 'AppCaptureEnabled', t: D, on: 0, off: 1 }] },
  { id: 'gamebar', cat: 'Windows', rec: true, name: 'Xbox Game Bar Overlay aus', desc: 'Kein Game-Bar-Startfenster und kein Controller-Overlay mehr – weniger Hintergrundlast beim Spielen.',
    items: [{ k: HK('Software\\Microsoft\\GameBar'), n: 'ShowStartupPanel', t: D, on: 0, off: 1 },
            { k: HK('Software\\Microsoft\\GameBar'), n: 'UseNexusForGameBarEnabled', t: D, on: 0, off: 1 }] },
  { id: 'fso', cat: 'GPU', rec: true, name: 'Fullscreen-Optimierungen aus', desc: 'Echter Exklusiv-Vollbildmodus statt Windows-Overlay – geringere Eingabeverzögerung.',
    items: [{ k: HK(GCS), n: 'GameDVR_FSEBehaviorMode', t: D, on: 2, off: 0 },
            { k: HK(GCS), n: 'GameDVR_HonorUserFSEBehaviorMode', t: D, on: 1, off: 0 },
            { k: HK(GCS), n: 'GameDVR_DXGIHonorFSEWindowsCompatible', t: D, on: 1, off: 0 }] },
  { id: 'gametask', cat: 'CPU / RAM', rec: true, name: 'Spiele-Priorität erhöhen', desc: 'Höhere CPU-/GPU-Priorität für Spiele im Multimedia-Scheduler.', admin: true,
    items: [{ k: HL(MM + '\\Tasks\\Games'), n: 'GPU Priority', t: D, on: 8, off: 8 },
            { k: HL(MM + '\\Tasks\\Games'), n: 'Priority', t: D, on: 6, off: 2 },
            { k: HL(MM + '\\Tasks\\Games'), n: 'Scheduling Category', t: S, on: 'High', off: 'Medium' },
            { k: HL(MM + '\\Tasks\\Games'), n: 'SFIO Priority', t: S, on: 'High', off: 'Normal' }] },
  { id: 'gpusched', cat: 'GPU', risk: 'mid', name: 'Hardware-beschleunigtes GPU-Scheduling', desc: 'Die GPU verwaltet ihren Speicher selbst. Benötigt Neustart und moderne GPU (Treiber auf dem neuesten Stand).', admin: true, reboot: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers'), n: 'HwSchMode', t: D, on: 2, off: 1 }] },
  { id: 'mpo', cat: 'GPU', risk: 'mid', name: 'Multiplane Overlay (MPO) aus', desc: 'Hilft gegen Flackern, schwarze Bildschirme und Ruckler in manchen Spielen (v. a. NVIDIA). Benötigt Neustart.', admin: true, reboot: true,
    items: [{ k: HL('SOFTWARE\\Microsoft\\Windows\\Dwm'), n: 'OverlayTestMode', t: D, on: 5, off: null }] },

  // ---------- Eingabe ----------
  { id: 'mouseaccel', cat: 'WASD Input', rec: true, name: 'Mausbeschleunigung aus', desc: '1:1-Mausbewegung („Zeigerbeschleunigung verbessern“ aus). Wirkt nach Neuanmeldung.',
    items: [{ k: HK('Control Panel\\Mouse'), n: 'MouseSpeed', t: S, on: '0', off: '1' },
            { k: HK('Control Panel\\Mouse'), n: 'MouseThreshold1', t: S, on: '0', off: '6' },
            { k: HK('Control Panel\\Mouse'), n: 'MouseThreshold2', t: S, on: '0', off: '10' }] },
  { id: 'stickykeys', cat: 'WASD Input', rec: true, name: 'Einrastfunktion deaktivieren', desc: 'Kein Sticky-Keys-Popup mehr beim fünfmaligen Drücken von Shift im Spiel.',
    items: [{ k: HK('Control Panel\\Accessibility\\StickyKeys'), n: 'Flags', t: S, on: '506', off: '510' }] },
  { id: 'filterkeys', cat: 'WASD Input', rec: true, name: 'Anschlagverzögerung- & Umschalt-Popups aus', desc: 'Verhindert die Popups für Filtertasten (Shift 8 Sek. halten) und Umschalttasten (Num-Taste 5 Sek. halten) mitten im Spiel.',
    items: [{ k: HK('Control Panel\\Accessibility\\Keyboard Response'), n: 'Flags', t: S, on: '122', off: '126' },
            { k: HK('Control Panel\\Accessibility\\ToggleKeys'), n: 'Flags', t: S, on: '58', off: '62' }] },
  { id: 'keyboard', cat: 'WASD Input', rec: true, name: 'Tastatur: kürzeste Wiederholverzögerung', desc: 'Gehaltene Tasten wiederholen sich sofort und mit maximaler Rate. Wirkt nach Neuanmeldung.',
    items: [{ k: HK('Control Panel\\Keyboard'), n: 'KeyboardDelay', t: S, on: '0', off: '1' },
            { k: HK('Control Panel\\Keyboard'), n: 'KeyboardSpeed', t: S, on: '31', off: '31' }] },

  // ---------- Netzwerk ----------
  { id: 'nettroll', cat: 'Network', rec: true, name: 'Netzwerk-Drosselung aus', desc: 'Entfernt die Multimedia-Netzwerkbremse für niedrigeren Ping unter Last.', admin: true,
    items: [{ k: HL(MM), n: 'NetworkThrottlingIndex', t: D, on: 4294967295, off: 10 }] },
  { id: 'sysresp', cat: 'Network', rec: true, name: 'System-Reaktionsfähigkeit 0 %', desc: 'Reserviert keine CPU-Zeit mehr für Hintergrund-Multimedia.', admin: true,
    items: [{ k: HL(MM), n: 'SystemResponsiveness', t: D, on: 0, off: 20 }] },
  { id: 'dodl', cat: 'Network', rec: true, name: 'Update-Peer-Sharing aus', desc: 'Windows lädt Updates nur noch direkt von Microsoft und nutzt deine Leitung nicht mehr als Upload-Quelle für andere PCs.', admin: true,
    items: [{ k: HL('SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization'), n: 'DODownloadMode', t: D, on: 0, off: null }] },

  // ---------- System ----------
  { id: 'powerplan', cat: 'Power', rec: true, name: 'Höchstleistungs-Energieplan', desc: 'Aktiviert den Energiesparplan „Höchstleistung“ (kein CPU-Parking/Taktdrosselung).', custom: 'power' },
  { id: 'powerthrottle', cat: 'Power', rec: true, name: 'Power Throttling aus', desc: 'Verhindert, dass Windows Hintergrundprozesse (auch Spiele) in der Leistung drosselt.', admin: true,
    items: [{ k: HL('SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling'), n: 'PowerThrottlingOff', t: D, on: 1, off: 0 }] },
  { id: 'bgapps', cat: 'Windows', risk: 'mid', name: 'Hintergrund-Apps deaktivieren', desc: 'Store-Apps laufen nicht mehr unbemerkt im Hintergrund (Benachrichtigungen mancher Apps bleiben dann aus).',
    items: [{ k: HK('Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications'), n: 'GlobalUserDisabled', t: D, on: 1, off: 0 }] },
  { id: 'telemetry', cat: 'Windows', name: 'Telemetrie minimieren', desc: 'Setzt die Windows-Diagnosedaten auf das Minimum.', admin: true,
    items: [{ k: HL('SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection'), n: 'AllowTelemetry', t: D, on: 0, off: null }] },
  { id: 'werr', cat: 'Windows', name: 'Fehlerberichterstattung aus', desc: 'Keine Absturzberichte mehr an Microsoft – spart Hintergrundaktivität nach Spielabstürzen.', admin: true,
    items: [{ k: HL('SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting'), n: 'Disabled', t: D, on: 1, off: null }] },
  { id: 'hibernate', cat: 'Power', risk: 'mid', name: 'Ruhezustand & Schnellstart aus', desc: 'Gibt mehrere GB Speicherplatz frei (hiberfil.sys). Echter Neustart statt Hybrid-Start.', admin: true, custom: 'hibernate' },

  // ---------- Oberfläche ----------
  { id: 'menudelay', cat: 'Windows', rec: true, name: 'Menü-Verzögerung entfernen', desc: 'Menüs öffnen sich sofort (MenuShowDelay = 0).',
    items: [{ k: HK('Control Panel\\Desktop'), n: 'MenuShowDelay', t: S, on: '0', off: '400' }] },
  { id: 'startdelay', cat: 'Windows', rec: true, name: 'Autostart-Verzögerung entfernen', desc: 'Autostart-Programme starten ohne die künstliche 10-Sekunden-Wartezeit.',
    items: [{ k: HK('Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize'), n: 'StartupDelayInMSec', t: D, on: 0, off: null }] },
  { id: 'adsuggest', cat: 'Windows', rec: true, name: 'Vorschläge & Werbung im Startmenü aus', desc: 'Keine App-Vorschläge, Tipps und automatisch installierten Werbe-Apps mehr.',
    items: [{ k: HK(CDM), n: 'SystemPaneSuggestionsEnabled', t: D, on: 0, off: 1 },
            { k: HK(CDM), n: 'SilentInstalledAppsEnabled', t: D, on: 0, off: 1 },
            { k: HK(CDM), n: 'SubscribedContent-338388Enabled', t: D, on: 0, off: 1 },
            { k: HK(CDM), n: 'SubscribedContent-338389Enabled', t: D, on: 0, off: 1 }] },
  { id: 'searchweb', cat: 'Windows', rec: true, name: 'Websuche im Startmenü aus', desc: 'Die Windows-Suche zeigt nur noch lokale Treffer – schneller und ohne Bing-Ergebnisse.',
    items: [{ k: HK('Software\\Policies\\Microsoft\\Windows\\Explorer'), n: 'DisableSearchBoxSuggestions', t: D, on: 1, off: null }] },
  { id: 'adid', cat: 'Windows', name: 'Werbe-ID deaktivieren', desc: 'Apps können dich nicht mehr über eine Werbe-ID verfolgen.',
    items: [{ k: HK('Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo'), n: 'Enabled', t: D, on: 0, off: 1 }] },
  { id: 'animations', cat: 'Windows', name: 'Fensteranimationen aus', desc: 'Fenster öffnen, minimieren und maximieren ohne Animation. Wirkt nach Neuanmeldung.',
    items: [{ k: HK('Control Panel\\Desktop\\WindowMetrics'), n: 'MinAnimate', t: S, on: '0', off: '1' }] },
  { id: 'transparency', cat: 'Windows', name: 'Transparenzeffekte aus', desc: 'Weniger GPU-Last durch deaktivierte Acryl-/Blur-Effekte.',
    items: [{ k: HK('Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize'), n: 'EnableTransparency', t: D, on: 0, off: 1 }] },
];
