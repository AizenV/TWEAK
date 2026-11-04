const { app, BrowserWindow, ipcMain, dialog, shell, net, screen } = require('electron');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const TWEAKS = require('./tweaks');
const LIC = require('./license');
const NOLIC = { ok: false, active: false, error: 'license' };   // Anwenden von Tweaks erfordert eine gültige Lizenz (Zurücksetzen/Restore bleibt immer frei)

const BACKUP = () => path.join(app.getPath('userData'), 'backup.json');
const GOOD_PLAN = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
const BALANCED = '381b4222-f694-41f0-9685-ff5bb260df2e';

const run = (exe, args) => new Promise((res) =>
  execFile(exe, args, { windowsHide: true, maxBuffer: 8e6 }, (err, out, se) => res({ ok: !err, out: String(out || ''), err: String(se || '') })));

// ---------- Registry ----------
async function regGet(k, n) {
  const r = await run('reg', ['query', k, '/v', n]);
  if (!r.ok) return null;
  const m = r.out.match(new RegExp('^\\s+' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(REG_\\w+)\\s*(.*)$', 'mi'));
  if (!m) return null;
  return m[1] === 'REG_DWORD' ? parseInt(m[2], 16) : m[2].trim();
}
const regSet = (k, n, t, v) => run('reg', ['add', k, '/v', n, '/t', t, '/d', String(v), '/f']);
const regDel = (k, n) => run('reg', ['delete', k, '/v', n, '/f']);

const loadBackup = () => { try { return JSON.parse(fs.readFileSync(BACKUP(), 'utf8')); } catch { return {}; } };
const saveBackup = (b) => { try { fs.mkdirSync(path.dirname(BACKUP()), { recursive: true }); fs.writeFileSync(BACKUP(), JSON.stringify(b, null, 1)); } catch {} };

// ---------- Custom-Tweaks ----------
// Handler: status(t) -> boolean  (oder check(t) -> { active, na } für „nicht verfügbar“), apply(on, t) -> { ok }.
// Originalwerte werden im Backup unter t.id gesichert und beim Zurücksetzen wiederhergestellt.
async function pcQuery(sub, set) {              // Energieplan-Wert (Netzbetrieb) des aktiven Plans; sprachunabhängig über die Hex-Werte
  const r = await run('powercfg', ['/query', 'SCHEME_CURRENT', sub, set]);
  const h = r.out.match(/0x[0-9a-f]{8}/gi);
  return r.ok && h && h.length >= 2 ? parseInt(h[h.length - 2], 16) : null;   // vorletzter Wert = AC, letzter = DC
}
async function pcSet(sub, set, v) {
  const r = await run('powercfg', ['/setacvalueindex', 'SCHEME_CURRENT', sub, set, String(v)]);
  await run('powercfg', ['/setactive', 'SCHEME_CURRENT']);
  return r;
}
const NAGLE = { pre: "$b='HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces';" };
const svcKey = (n) => 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\' + n;
const msiKey = (id) => 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\' + id + '\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties';
async function pnpIds(cls) {                    // Instanz-IDs der vorhandenen PCI-Geräte einer Geräteklasse
  const r = await ps("Get-PnpDevice -Class " + cls + " -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -like 'PCI\\*' } | ForEach-Object { $_.InstanceId }");
  return r.out.split(/\r?\n/).map((x) => x.trim()).filter((x) => /^PCI\\/i.test(x));
}
const NIC_KW = ['*EEE', 'EnableGreenEthernet', '*SelectiveSuspend', 'ULPMode'];
async function nicList() {                      // [{ a: Adaptername, k: Schlüsselwort, v: aktueller Wert }]
  const r = await ps("$r=@();Get-NetAdapter -Physical -ErrorAction SilentlyContinue | ForEach-Object { $a=$_.Name; foreach($k in " + NIC_KW.map((k) => "'" + k + "'").join(',') + ") { $p=Get-NetAdapterAdvancedProperty -Name $a -RegistryKeyword $k -ErrorAction SilentlyContinue; if($p){ $r+=[pscustomobject]@{a=$a;k=$k;v=[string]$p.RegistryValue} } } }; ConvertTo-Json -InputObject $r -Compress");
  try { const j = JSON.parse(r.out.trim() || '[]'); return (Array.isArray(j) ? j : [j]).filter((x) => x && NIC_KW.includes(x.k)); } catch { return []; }
}
const custom = {
  power: {
    status: async () => (await run('powercfg', ['/getactivescheme'])).out.toLowerCase().includes(GOOD_PLAN),
    apply: async (on) => run('powercfg', ['/setactive', on ? GOOD_PLAN : BALANCED]),
  },
  hibernate: {
    status: async () => (await regGet('HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power', 'HibernateEnabled')) === 0,
    apply: async (on) => run('powercfg', ['/h', on ? 'off' : 'on']),
  },
  // Einzelner Energieplan-Wert (t.pc = { sub, set, on, off }) – Original wird gesichert
  pcfg: {
    status: async (t) => (await pcQuery(t.pc.sub, t.pc.set)) === t.pc.on,
    apply: async (on, t) => {
      const bk = loadBackup();
      if (on) {
        if (bk[t.id] === undefined) { const cur = await pcQuery(t.pc.sub, t.pc.set); if (cur !== null) { bk[t.id] = cur; saveBackup(bk); } }
        return pcSet(t.pc.sub, t.pc.set, t.pc.on);
      }
      const v = bk[t.id] !== undefined && bk[t.id] !== t.pc.on ? bk[t.id] : t.pc.off;
      const r = await pcSet(t.pc.sub, t.pc.set, v);
      if (r.ok && bk[t.id] !== undefined) { delete bk[t.id]; saveBackup(bk); }
      return r;
    },
  },
  svc: {                                        // Dienste (t.svc = [{ n: Dienstname, off: Standard-Starttyp }]); nicht vorhandene Dienste werden übersprungen, nie neu angelegt
    check: async (t) => {
      let any = false;
      for (const x of t.svc) { const v = await regGet(svcKey(x.n), 'Start'); if (v === null) continue; any = true; if (v !== 4) return { active: false, na: false }; }
      return { active: any, na: !any };
    },
    apply: async (on, t) => {
      const bk = loadBackup(); let ok = true;
      if (on && !bk[t.id]) { bk[t.id] = {}; for (const x of t.svc) { const v = await regGet(svcKey(x.n), 'Start'); if (v !== null) bk[t.id][x.n] = v; } saveBackup(bk); }
      for (const x of t.svc) {
        if ((await regGet(svcKey(x.n), 'Start')) === null) continue;
        if (on) { if (!(await regSet(svcKey(x.n), 'Start', 'REG_DWORD', 4)).ok) ok = false; await run('sc', ['stop', x.n]); }
        else {
          let v = bk[t.id] && bk[t.id][x.n];
          if (v === undefined || v === null || v === 4) v = x.off;      // war vorher schon deaktiviert -> Windows-Standard
          if (!(await regSet(svcKey(x.n), 'Start', 'REG_DWORD', v)).ok) ok = false;
          if (v === 2) await run('sc', ['start', x.n]);
        }
      }
      if (!on && bk[t.id]) { delete bk[t.id]; saveBackup(bk); }
      return { ok };
    },
  },
  msi: {                                        // MSI-Modus (Message Signaled Interrupts) für die Grafikkarte(n); ohne PCI-Grafikkarte „nicht verfügbar“
    check: async () => {
      const ids = await pnpIds('Display');
      if (!ids.length) return { active: false, na: true };
      for (const id of ids) if ((await regGet(msiKey(id), 'MSISupported')) !== 1) return { active: false, na: false };
      return { active: true, na: false };
    },
    apply: async (on, t) => {
      const ids = await pnpIds('Display'), bk = loadBackup(); let ok = true;
      if (on && !bk[t.id]) { bk[t.id] = {}; for (const id of ids) bk[t.id][id] = await regGet(msiKey(id), 'MSISupported'); saveBackup(bk); }
      for (const id of ids) {
        if (on) { if (!(await regSet(msiKey(id), 'MSISupported', 'REG_DWORD', 1)).ok) ok = false; continue; }
        const v = bk[t.id] ? bk[t.id][id] : null;
        if (v === null || v === undefined) await regDel(msiKey(id), 'MSISupported');      // Original: nicht gesetzt (Löschen eines fehlenden Werts ist kein Fehler)
        else if (!(await regSet(msiKey(id), 'MSISupported', 'REG_DWORD', v)).ok) ok = false;
      }
      if (!on && bk[t.id]) { delete bk[t.id]; saveBackup(bk); }
      return { ok };
    },
  },
  nicprops: {                                   // Energiesparfunktionen der physischen Netzwerkadapter (nur vorhandene Eigenschaften); Original wird gesichert
    check: async () => { const l = await nicList(); return { active: l.length > 0 && l.every((x) => x.v === '0'), na: !l.length }; },
    apply: async (on, t) => {
      const l = await nicList(), bk = loadBackup(); let ok = true;
      if (on && !bk[t.id]) { bk[t.id] = l; saveBackup(bk); }
      const target = on ? l.map((x) => ({ a: x.a, k: x.k, v: '0' })) : (Array.isArray(bk[t.id]) ? bk[t.id] : l.filter((x) => x.v === '0').map((x) => ({ ...x, v: '1' })));
      for (const x of target) {
        if (!NIC_KW.includes(x.k) || !/^\d+$/.test(String(x.v))) continue;
        const r = await ps("Set-NetAdapterAdvancedProperty -Name '" + String(x.a).replace(/'/g, "''") + "' -RegistryKeyword '" + x.k + "' -RegistryValue " + x.v + ' -ErrorAction Stop');
        if (!r.ok) ok = false;
      }
      if (!on && bk[t.id]) { delete bk[t.id]; saveBackup(bk); }
      return { ok };
    },
  },
  bcd: {                                        // Boot-Konfiguration (t.bcd = Liste von bcdedit-Werten, die auf „yes“ stehen sollen)
    status: async (t) => { const o = (await run('bcdedit', ['/enum', '{current}'])).out; return t.bcd.every((k) => new RegExp('^\\s*' + k + '\\s+(yes|ja|true|wahr)\\s*$', 'im').test(o)); },
    apply: async (on, t) => {
      let ok = true;
      for (const k of t.bcd) { const r = on ? await run('bcdedit', ['/set', k, 'yes']) : await run('bcdedit', ['/deletevalue', k]); if (on && !r.ok) ok = false; }   // Löschen eines nicht gesetzten Werts ist kein Fehler
      return { ok };
    },
  },
  nagle: {                                      // Nagle aus: TcpAckFrequency + TCPNoDelay auf allen Schnittstellen mit IP; Zurücksetzen löscht beide Werte (Windows-Standard)
    status: async () => (await ps(NAGLE.pre + "$n=0;$ok=0;Get-ChildItem $b | ForEach-Object { $p=Get-ItemProperty $_.PSPath; if($p.DhcpIPAddress -or ($p.IPAddress -and $p.IPAddress -ne '0.0.0.0')){ $n++; if($p.TcpAckFrequency -eq 1 -and $p.TCPNoDelay -eq 1){ $ok++ } } }; if($n -gt 0 -and $n -eq $ok){'1'}else{'0'}")).out.trim() === '1',
    apply: async (on) => ps(NAGLE.pre + (on
      ? "Get-ChildItem $b | ForEach-Object { $p=Get-ItemProperty $_.PSPath; if($p.DhcpIPAddress -or ($p.IPAddress -and $p.IPAddress -ne '0.0.0.0')){ New-ItemProperty -Path $_.PSPath -Name TcpAckFrequency -Value 1 -PropertyType DWord -Force | Out-Null; New-ItemProperty -Path $_.PSPath -Name TCPNoDelay -Value 1 -PropertyType DWord -Force | Out-Null } }"
      : "Get-ChildItem $b | ForEach-Object { Remove-ItemProperty -Path $_.PSPath -Name TcpAckFrequency -ErrorAction SilentlyContinue; Remove-ItemProperty -Path $_.PSPath -Name TCPNoDelay -ErrorAction SilentlyContinue }")),
  },
  memcomp: {                                    // Speicherkomprimierung (MMAgent)
    status: async () => (await ps('(Get-MMAgent).MemoryCompression')).out.trim().toLowerCase() === 'false',
    apply: async (on) => ps(on ? 'Disable-MMAgent -MemoryCompression' : 'Enable-MMAgent -MemoryCompression'),
  },
};

async function check(t) {                       // { active, na }
  const h = t.custom && custom[t.custom];
  if (h && h.check) return h.check(t);
  return { active: await status(t), na: false };
}
async function status(t) {
  if (t.custom) { const h = custom[t.custom]; return h.check ? (await h.check(t)).active : h.status(t); }
  for (const i of t.items) if ((await regGet(i.k, i.n)) !== i.on) return false;
  return true;
}

async function apply(t, on) {
  if (t.custom) { const r = await custom[t.custom].apply(on, t); return r.ok; }
  const bk = loadBackup();
  if (on && !bk[t.id]) {
    bk[t.id] = [];
    for (const i of t.items) bk[t.id].push(await regGet(i.k, i.n));
    saveBackup(bk);
  }
  let ok = true;
  for (let x = 0; x < t.items.length; x++) {
    const i = t.items[x];
    let val = on ? i.on : (bk[t.id] ? bk[t.id][x] : i.off);
    if (!on && bk[t.id] && val === undefined) val = i.off;
    const r = val === null ? await regDel(i.k, i.n) : await regSet(i.k, i.n, i.t, val);
    // Löschen eines nicht vorhandenen Werts ist kein Fehler
    if (!r.ok && val !== null) ok = false;
  }
  if (!on && bk[t.id]) { delete bk[t.id]; saveBackup(bk); }
  return ok;
}

// ---------- Cleaner ----------
const cleanDirs = () => {
  const la = process.env.LOCALAPPDATA || '', win = process.env.SystemRoot || 'C:\\Windows';
  return [
    { id: 'usertemp', name: 'Benutzer-Temp', dir: os.tmpdir() },
    { id: 'wintemp', name: 'Windows-Temp', dir: path.join(win, 'Temp') },
    { id: 'prefetch', name: 'Prefetch', dir: path.join(win, 'Prefetch') },
    { id: 'd3d', name: 'DirectX-Shader-Cache', dir: path.join(la, 'D3DSCache') },
    { id: 'nvdx', name: 'NVIDIA-Shader-Cache', dir: path.join(la, 'NVIDIA', 'DXCache') },
    { id: 'crash', name: 'Absturzberichte', dir: path.join(la, 'CrashDumps') },
  ];
};
async function dirSize(d) {
  let total = 0;
  const walk = async (p, depth) => {
    let ents; try { ents = await fs.promises.readdir(p, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const f = path.join(p, e.name);
      try { if (e.isDirectory()) { if (depth < 8) await walk(f, depth + 1); } else total += (await fs.promises.stat(f)).size; } catch {}
    }
  };
  await walk(d, 0);
  return total;
}
async function emptyDir(d) {
  let freed = 0, ents = [];
  try { ents = await fs.promises.readdir(d); } catch { return 0; }
  for (const n of ents) {
    const f = path.join(d, n);
    const before = await dirSize(f).catch(() => 0);
    try { await fs.promises.rm(f, { recursive: true, force: true }); freed += before; } catch {}
  }
  return freed;
}

// ---------- Wiederherstellungspunkte & Restore-Fixes ----------
const FIXES = require('./fixes');
const ps = (script) => run('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]);
const D = 'REG_DWORD', E = 'REG_EXPAND_SZ';

// Setzt/löscht eine Liste von Registry-Werten ([key, name, type, value]; value null = löschen).
async function regList(list) {
  let ok = true;
  for (const [k, n, t, v] of list) {
    const r = v === null ? await regDel(k, n) : await regSet(k, n, t, v);
    if (!r.ok && v !== null) ok = false; // Löschen eines nicht vorhandenen Werts ist kein Fehler
  }
  return ok;
}
// Dienste: Fehler (z. B. Dienst existiert nicht / geschützt) sind bewusst nicht kritisch.
async function svc(name, start, startNow) {
  await run('sc', ['config', name, 'start=', start]);
  if (startNow) await run('sc', ['start', name]);
}
async function restartExplorer() {
  await run('taskkill', ['/f', '/im', 'explorer.exe']);
  await run('cmd', ['/c', 'start', '', 'explorer.exe']);
}

const CUR = 'HKCU\\Control Panel\\Cursors';
const AERO = { Arrow: 'aero_arrow.cur', Help: 'aero_helpsel.cur', AppStarting: 'aero_working.ani', Wait: 'aero_busy.ani', NWPen: 'aero_pen.cur',
  No: 'aero_unavail.cur', SizeNS: 'aero_ns.cur', SizeWE: 'aero_ew.cur', SizeNWSE: 'aero_nwse.cur', SizeNESW: 'aero_nesw.cur',
  SizeAll: 'aero_move.cur', UpArrow: 'aero_up.cur', Hand: 'aero_link.cur', Person: 'aero_person.cur', Pin: 'aero_pin.cur' };
const DESK = 'HKCU\\Control Panel\\Desktop';
const ADV = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced';
const DEF_POL = 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender';
const MMEM = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management';

const defenderOn = async () => {
  const ok = await regList([
    [DEF_POL, 'DisableAntiSpyware', D, null], [DEF_POL, 'DisableAntiVirus', D, null],
    ...['DisableRealtimeMonitoring', 'DisableBehaviorMonitoring', 'DisableOnAccessProtection', 'DisableScanOnRealtimeEnable', 'DisableIOAVProtection']
      .map((n) => [DEF_POL + '\\Real-Time Protection', n, D, null]),
    ...[['WinDefend', 2], ['WdFilter', 0], ['WdBoot', 0], ['WdNisDrv', 3], ['WdNisSvc', 3], ['Sense', 3]]
      .map(([s, v]) => ['HKLM\\SYSTEM\\CurrentControlSet\\Services\\' + s, 'Start', D, v]),
  ].map(([k, n, t, v]) => [k, n, t, v]));
  await run('sc', ['start', 'WinDefend']);
  await ps(`Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue`);
  return ok;
};

const IMPL = {
  async vscode() {
    const ad = process.env.APPDATA || '';
    for (const d of ['Cache', 'CachedData', 'GPUCache', 'Code Cache', 'DawnCache'])
      await fs.promises.rm(path.join(ad, 'Code', d), { recursive: true, force: true }).catch(() => {});
    const f = path.join(os.homedir(), '.vscode', 'argv.json');
    let obj = {};
    try {
      const txt = await fs.promises.readFile(f, 'utf8');
      obj = JSON.parse(txt.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));
    } catch (e) { if (e.code !== 'ENOENT') return false; } // nicht parsebar -> Datei nicht anfassen
    obj['disable-hardware-acceleration'] = true;
    await fs.promises.mkdir(path.dirname(f), { recursive: true });
    await fs.promises.writeFile(f, JSON.stringify(obj, null, 2));
    return true;
  },
  searchbox: () => regList([['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search', 'SearchboxTaskbarMode', D, 2],
    ['HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions', D, null]]),
  window: () => regList([[DESK, 'DragFullWindows', 'REG_SZ', '1'], [DESK, 'WindowArrangementActive', 'REG_SZ', '1'],
    [DESK + '\\WindowMetrics', 'MinAnimate', 'REG_SZ', '1'], [ADV, 'TaskbarAnimations', D, 1], [ADV, 'ListviewShadow', D, 1]]),
  snap: () => regList([[DESK, 'WindowArrangementActive', 'REG_SZ', '1'], [ADV, 'SnapAssist', D, 1], [ADV, 'EnableSnapAssistFlyout', D, 1],
    [ADV, 'EnableSnapBar', D, 1], [ADV, 'DITest', D, null]]),
  async cursor() {
    const ok = await regList([...Object.entries(AERO).map(([n, f]) => [CUR, n, E, '%SystemRoot%\\cursors\\' + f]),
      [CUR, 'Crosshair', E, ''], [CUR, 'IBeam', E, ''], [CUR, 'Scheme Source', D, 2]]);
    await ps(`Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SystemParametersInfo(uint a,uint b,IntPtr c,uint d);' -Name W -Namespace N; [N.W]::SystemParametersInfo(0x57,0,[IntPtr]::Zero,3) | Out-Null`);
    return ok;
  },
  async sounds() {
    const ok = await regList([['HKCU\\Control Panel\\Sound', 'Beep', 'REG_SZ', 'yes'], ['HKCU\\Control Panel\\Sound', 'ExtendedSounds', 'REG_SZ', 'yes']]);
    const r = await ps(`Set-ItemProperty 'HKCU:\\AppEvents\\Schemes' -Name '(Default)' -Value '.Default'; ` +
      `Get-ChildItem 'HKCU:\\AppEvents\\Schemes\\Apps' | ForEach-Object { Get-ChildItem $_.PSPath } | ForEach-Object { ` +
      `$d = Join-Path $_.PSPath '.Default'; $c = Join-Path $_.PSPath '.Current'; ` +
      `if ((Test-Path $d) -and (Test-Path $c)) { Set-ItemProperty $c -Name '(default)' -Value (Get-ItemProperty $d).'(default)' } }`);
    return ok && r.ok;
  },
  selection: () => regList([[ADV, 'ListviewAlphaSelect', D, 1], [ADV, 'ListviewShadow', D, 1]]),
  notifications: () => regList([['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications', 'ToastEnabled', D, 1],
    ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings', 'NOC_GLOBAL_SETTING_TOASTS_ENABLED', D, 1],
    ['HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter', D, null],
    ['HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter', D, null],
    ['HKCU\\Software\\Policies\\Microsoft\\Windows\\CurrentVersion\\PushNotifications', 'NoToastApplicationNotification', D, null],
    ['HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CurrentVersion\\PushNotifications', 'NoToastApplicationNotification', D, null]]),
  async power() {
    const h = await run('powercfg', ['/h', 'on']);
    const p = await run('powercfg', ['/setactive', BALANCED]);
    const ok = await regList([['HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling', 'PowerThrottlingOff', D, null],
      ['HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled', D, 1]]);
    return h.ok && p.ok && ok;
  },
  defender: defenderOn,
  async v3() {
    let ok = true;
    // CPU-Mitigationen zurück auf Windows-Standard
    ok = (await regList([[MMEM, 'FeatureSettingsOverride', D, null], [MMEM, 'FeatureSettingsOverrideMask', D, null]])) && ok;
    // VBS / HVCI (Kern-Isolierung): Überschreibungen entfernen
    ok = (await regList([['HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard', 'EnableVirtualizationBasedSecurity', D, null],
      ['HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity', 'Enabled', D, null]])) && ok;
    // Hyper-V-Hypervisor wieder automatisch starten
    await run('bcdedit', ['/set', 'hypervisorlaunchtype', 'auto']);
    // Prefetcher / Superfetch
    ok = (await regList([[MMEM + '\\PrefetchParameters', 'EnablePrefetcher', D, 3], [MMEM + '\\PrefetchParameters', 'EnableSuperfetch', D, 3]])) && ok;
    // Treiber-Blacklist (Geräteinstallations-Einschränkungen) entfernen
    await run('reg', ['delete', 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeviceInstall\\Restrictions', '/f']);
    // Dienste auf Windows-Standard (start= auto|demand)
    for (const [s, m, now] of [['SysMain', 'auto', 1], ['DiagTrack', 'auto', 1], ['WSearch', 'delayed-auto', 1],
      ['wuauserv', 'demand'], ['BITS', 'demand'], ['UsoSvc', 'demand'], ['WaaSMedicSvc', 'demand'], ['DoSvc', 'delayed-auto'],
      ['XblAuthManager', 'demand'], ['XblGameSave', 'demand'], ['XboxGipSvc', 'demand'], ['XboxNetApiSvc', 'demand'],
      ['GamingServices', 'demand'], ['GamingServicesNet', 'demand']]) await svc(s, m, now);
    // Netzwerkadapter: Large Send Offload wieder an
    await ps(`Enable-NetAdapterLso -Name '*' -ErrorAction SilentlyContinue`);
    // Defender + Energieplan
    ok = (await defenderOn()) && ok;
    ok = (await run('powercfg', ['/setactive', BALANCED])).ok && ok;
    return ok;
  },
};

// ---------- IPC ----------
ipcMain.handle('rp:list', async () => {
  const r = await ps(`Get-ComputerRestorePoint -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ n = $_.SequenceNumber; d = $_.Description; t = [Management.ManagementDateTimeConverter]::ToDateTime($_.CreationTime).ToString('yyyy-MM-ddTHH:mm:ss') } } | ConvertTo-Json -Compress`);
  try {
    const j = JSON.parse(r.out.trim() || '[]');
    return (Array.isArray(j) ? j : [j]).map((x) => ({ n: x.n, desc: x.d, time: x.t })).sort((a, b) => b.n - a.n);
  } catch { return []; }
});
ipcMain.handle('rp:create', async (_e, name) => {
  const desc = String(name || 'Attack.tweaks').replace(/[^\w .\-äöüÄÖÜß]/g, '').slice(0, 60) || 'Attack.tweaks';
  const K = 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore', N = 'SystemRestorePointCreationFrequency';
  const old = await regGet(K, N);
  await regSet(K, N, 'REG_DWORD', 0); // Windows erlaubt sonst nur 1 Punkt pro 24 h
  const r = await ps(`$ErrorActionPreference = 'Stop'; Enable-ComputerRestore -Drive ($env:SystemDrive + '\\'); Checkpoint-Computer -Description '${desc}' -RestorePointType MODIFY_SETTINGS`);
  if (old === null) await regDel(K, N); else await regSet(K, N, 'REG_DWORD', old);
  return { ok: r.ok, err: r.err.trim().slice(0, 200) };
});
ipcMain.handle('rp:open', () => { run('rstrui.exe', []); return true; });
ipcMain.handle('fix:list', () => FIXES);
ipcMain.handle('fix:run', async (_e, id) => {
  const f = FIXES.find((x) => x.id === id);
  if (!f || !IMPL[id]) return { ok: false };
  let ok = false;
  try { ok = !!(await IMPL[id]()); } catch {}
  if (f.explorer) await restartExplorer();
  return { ok, reboot: !!f.reboot };
});
ipcMain.handle('fix:all', async () => {
  const failed = []; let expl = false, reboot = false;
  for (const f of FIXES) {
    if (f.id === 'vscode') continue; // Cache-Fix nur gezielt
    try { if (!(await IMPL[f.id]())) failed.push(f.name); } catch { failed.push(f.name); }
    if (f.explorer) expl = true; if (f.reboot) reboot = true;
  }
  if (expl) await restartExplorer();
  return { failed, reboot };
});


// Begrenzte Parallelität: jede Statusabfrage startet reg.exe – so lädt die Liste deutlich schneller
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}
ipcMain.handle('tweaks:list', () => pool(TWEAKS, 6, async (t) => { const c = await check(t); return { id: t.id, cat: t.cat, name: t.name, desc: t.desc, admin: !!t.admin, reboot: !!t.reboot, rec: !!t.rec, risk: t.risk || 'low', active: c.active, na: !!c.na }; }));
ipcMain.handle('tweaks:set', async (_e, id, on) => {
  const t = TWEAKS.find((x) => x.id === id);
  if (!t) return { ok: false };
  if (on && !LIC.valid()) return NOLIC;
  if (on && (await check(t)).na) return { ok: false, active: false, error: 'na' };   // z. B. Dienst/Gerät existiert auf diesem PC nicht
  const ok = await apply(t, !!on);
  return { ok, active: await status(t) };
});
ipcMain.handle('sys:info', async () => {
  const cpus = os.cpus();
  const gpu = await run('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name']);
  return {
    host: os.hostname(), os: `${os.type()} ${os.release()}`, cpu: cpus[0] ? cpus[0].model.trim() : '–', cores: cpus.length,
    ramTotal: os.totalmem(), ramFree: os.freemem(), uptime: os.uptime(), gpu: gpu.out.trim() || '–',
  };
});
// Übersicht → System Info: Hardware-/Systemdetails (einmalig) und Live-Werte (alle paar Sekunden)
ipcMain.handle('sys:details', async () => {
  const cpus = os.cpus();
  const r = await ps(`$o=Get-CimInstance Win32_OperatingSystem;$c=Get-CimInstance Win32_ComputerSystem;$g=(Get-CimInstance Win32_VideoController|Select-Object -First 1).Name;$b=Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue;$sb=$null;try{$sb=Confirm-SecureBootUEFI}catch{};[pscustomobject]@{os=$o.Caption;build=$o.BuildNumber;hv=[bool]$c.HypervisorPresent;sb=$sb;ac=$(if($b){$b.BatteryStatus -ne 1}else{$true});gpu=$g}|ConvertTo-Json -Compress`);
  let x = {}; try { x = JSON.parse(r.out); } catch (e) {}
  return { cpu: cpus[0] ? cpus[0].model.trim() : '–', cores: cpus.length, arch: os.arch(), host: os.hostname(), user: os.userInfo().username,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone, uptime: os.uptime(), ramTotal: os.totalmem(), ramFree: os.freemem(),
    os: (x.os || '').trim() || `${os.type()} ${os.release()}`, build: x.build || '–', hv: x.hv, sb: x.sb, ac: x.ac, gpu: (x.gpu || '').trim() || '–' };
});
let _cpuPrev = null;
const _cpuSnap = () => os.cpus().reduce((a, c) => { const t = c.times; a.idle += t.idle; a.all += t.user + t.nice + t.sys + t.idle + t.irq; return a; }, { idle: 0, all: 0 });
ipcMain.handle('sys:live', async () => {
  const s = _cpuSnap(), p = _cpuPrev || s; _cpuPrev = s;
  const dAll = s.all - p.all, cpu = dAll > 0 ? Math.round((1 - (s.idle - p.idle) / dAll) * 100) : null;
  let gpuTemp = null, gpuLoad = null;
  const g = await run('nvidia-smi', ['--query-gpu=temperature.gpu,utilization.gpu', '--format=csv,noheader,nounits']);
  if (g.ok) { const [t, l] = g.out.trim().split('\n')[0].split(',').map((v) => parseInt(v, 10)); if (!isNaN(t)) gpuTemp = t; if (!isNaN(l)) gpuLoad = l; }
  return { cpu, gpuTemp, gpuLoad, ramTotal: os.totalmem(), ramFree: os.freemem(), uptime: os.uptime() };
});
ipcMain.handle('clean:scan', async () => {
  const r = [];
  for (const c of cleanDirs()) r.push({ id: c.id, name: c.name, size: await dirSize(c.dir) });
  return r;
});
ipcMain.handle('clean:run', async (_e, ids) => {
  let freed = 0;
  for (const c of cleanDirs()) if (ids.includes(c.id)) freed += await emptyDir(c.dir);
  return freed;
});
ipcMain.handle('net:flushdns', async () => (await run('ipconfig', ['/flushdns'])).ok);
ipcMain.handle('tweaks:resetall', async () => {
  for (const t of TWEAKS) if (await status(t)) await apply(t, false);
  return true;
});

// ---------- FiveM Presets (Feed vom Discord-Bot) ----------
const PR_CFG = () => path.join(app.getPath('userData'), 'presets-config.json');
const prLoad = () => { try { return { url: '', folders: {}, installed: {}, ...JSON.parse(fs.readFileSync(PR_CFG(), 'utf8')) }; } catch { return { url: '', folders: {}, installed: {} }; } };
const prSave = (c) => { try { fs.mkdirSync(path.dirname(PR_CFG()), { recursive: true }); fs.writeFileSync(PR_CFG(), JSON.stringify(c, null, 1)); } catch {} };
const isHttp = (u) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };
const safe = (s) => String(s || 'preset').replace(/[^\w.\-]+/g, '_').slice(0, 80);

ipcMain.handle('pr:cfg', () => prLoad());
ipcMain.handle('pr:setUrl', (_e, url) => { const c = prLoad(); c.url = String(url || '').trim(); prSave(c); return c; });
ipcMain.handle('pr:list', async () => {
  const c = prLoad();
  if (!isHttp(c.url)) return { ok: false, error: 'nourl' };
  try {
    const r = await net.fetch(c.url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status };
    const j = await r.json();
    return { ok: true, categories: Array.isArray(j.categories) ? j.categories : [], items: Array.isArray(j.items) ? j.items : [], updated: j.updated || null };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('pr:pick', async (_e, cat) => {
  const c = prLoad();
  const r = await dialog.showOpenDialog({ title: 'Zielordner wählen (z. B. FiveM.app\\mods)', properties: ['openDirectory', 'createDirectory'], defaultPath: c.folders[cat] || undefined });
  if (r.canceled || !r.filePaths[0]) return null;
  c.folders[cat] = r.filePaths[0]; prSave(c); return r.filePaths[0];
});
ipcMain.handle('pr:install', async (_e, item) => {
  if (!item || typeof item !== 'object') return { ok: false, error: 'Ungültig' };
  if (!LIC.valid()) return { ok: false, error: 'license' };
  if (!item.file) { if (isHttp(item.link)) { await shell.openExternal(item.link); return { ok: true, opened: true }; } return { ok: false, error: 'Kein Download vorhanden' }; }
  if (!isHttp(item.file.url)) return { ok: false, error: 'Ungültige URL' };
  const c = prLoad();
  let dir = c.folders[item.cat];
  if (!dir) {
    const r = await dialog.showOpenDialog({ title: 'Zielordner wählen (z. B. FiveM.app\\mods)', properties: ['openDirectory', 'createDirectory'] });
    if (r.canceled || !r.filePaths[0]) return { ok: false, error: 'Kein Ordner gewählt' };
    dir = c.folders[item.cat] = r.filePaths[0]; prSave(c);
  }
  const tmp = path.join(os.tmpdir(), 'attack-' + Date.now() + '-' + safe(item.file.name));
  try {
    const r = await net.fetch(item.file.url, { signal: AbortSignal.timeout(10 * 60 * 1000) });
    if (!r.ok) return { ok: false, error: 'Download HTTP ' + r.status + (r.status === 403 ? ' (Link abgelaufen – Bot aktualisiert gleich neu)' : '') };
    fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
    fs.mkdirSync(dir, { recursive: true });
    if (/\.(zip|rar|7z)$/i.test(item.file.name || '')) {
      const x = await run('tar', ['-xf', tmp, '-C', dir]);   // Windows-bsdtar kann zip/rar/7z
      if (!x.ok) return { ok: false, error: 'Entpacken fehlgeschlagen (FiveM geschlossen? ' + x.err.trim().slice(0, 120) + ')' };
    } else fs.copyFileSync(tmp, path.join(dir, path.basename(item.file.name)));
    c.installed[item.id] = item.version || '1'; prSave(c);
    return { ok: true, dir };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
  finally { try { fs.unlinkSync(tmp); } catch {} }
});
ipcMain.handle('pr:openFolder', async (_e, cat) => { const d = prLoad().folders[cat]; if (d) await shell.openPath(d); return !!d; });

// ---------- FiveM: Performance-Tweaks & Clearen ----------
const LA = () => process.env.LOCALAPPDATA || '';
const FIVEM_APP = () => path.join(LA(), 'FiveM', 'FiveM.app');
const IFEO = 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\';
const fvExes = () => {
  const s = new Set(['FiveM.exe', 'FiveM_GTAProcess.exe', 'GTA5.exe']);
  try { for (const f of fs.readdirSync(FIVEM_APP())) if (/^FiveM.*\.exe$/i.test(f) && !/crash|chrome|subprocess/i.test(f)) s.add(f); } catch {}
  return [...s];
};
const fvTweaks = () => [
  { id: 'fv_cpu', name: 'Process Priority High', desc: 'FiveM/GTA höhere CPU-Prio', tag: 'AKTIV', items: fvExes().map((e) => ({ k: IFEO + e + '\\PerfOptions', n: 'CpuPriorityClass', t: 'REG_DWORD', on: 3, off: null })), ifeo: true },
  { id: 'fv_io', name: 'I/O Priority High', desc: 'Mehr Priorität fürs Laden von Assets', tag: 'AKTIV', items: fvExes().map((e) => ({ k: IFEO + e + '\\PerfOptions', n: 'IoPriority', t: 'REG_DWORD', on: 3, off: null })), ifeo: true },
  { id: 'fv_cache', name: 'Cache Flushed', desc: 'FiveM-Cache leeren', tag: 'EINMALIG', oneshot: true },
  { id: 'fv_steam', name: 'Steam Overlay Off', desc: 'Steam-Overlay deaktiviert', tag: 'MANUELL', manual: true, hint: 'Manuell: Steam → Bibliothek → Rechtsklick auf GTA V → Eigenschaften → „Steam-Overlay im Spiel aktivieren“ ausschalten.' },
  { id: 'fv_mmcss', name: 'MMCSS Games Profile', desc: 'MMCSS Game', tag: 'AKTIV', items: [
    { k: 'HKLM\\' + 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', n: 'GPU Priority', t: 'REG_DWORD', on: 8, off: 8 },
    { k: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', n: 'Priority', t: 'REG_DWORD', on: 6, off: 2 },
    { k: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', n: 'Scheduling Category', t: 'REG_SZ', on: 'High', off: 'Medium' },
    { k: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', n: 'SFIO Priority', t: 'REG_SZ', on: 'High', off: 'Normal' }] },
  { id: 'fv_laa', name: 'Large Address Aware', desc: 'GTA-Client braucht ggf. LAA – manuell patchen', tag: 'MANUELL', manual: true, hint: 'Manuell: GTA5.exe mit einem „4GB Patch“-Tool als Large Address Aware markieren (vorher Sicherung anlegen).' },
];
const isRunning = async (exe) => (await run('tasklist', ['/FI', 'IMAGENAME eq ' + exe, '/NH'])).out.toLowerCase().includes(exe.toLowerCase());
const fvCacheDirs = () => ['cache', 'server-cache', 'server-cache-priv'].map((d) => path.join(FIVEM_APP(), 'data', d));
const shaderDirs = () => { const la = LA(), pd = process.env.ProgramData || 'C:\\ProgramData';
  return [path.join(la, 'D3DSCache'), path.join(la, 'NVIDIA', 'DXCache'), path.join(la, 'NVIDIA', 'GLCache'), path.join(pd, 'NVIDIA Corporation', 'NV_Cache'),
    path.join(la, 'AMD', 'DxCache'), path.join(la, 'AMD', 'DxcCache'), path.join(la, 'AMD', 'GLCache'), path.join(la, 'Intel', 'ShaderCache')]; };
const sumDirs = async (l) => { let t = 0; for (const d of l) t += await dirSize(d); return t; };
const wipeDirs = async (l) => { let t = 0; for (const d of l) t += await emptyDir(d); return t; };

async function fvSet(t, on) {   // IFEO-Werte: kein Backup nötig (Original = nicht vorhanden)
  if (!t.ifeo) return apply(t, on);
  let ok = true;
  for (const i of t.items) { const r = on ? await regSet(i.k, i.n, i.t, i.on) : await regDel(i.k, i.n); if (on && !r.ok) ok = false; }
  return ok;
}
ipcMain.handle('fv:list', async () => {
  const out = [];
  for (const t of fvTweaks()) out.push({ id: t.id, name: t.name, desc: t.desc, tag: t.tag, manual: !!t.manual, oneshot: !!t.oneshot, hint: t.hint || '', active: t.items ? await status(t) : false });
  return out;
});
ipcMain.handle('fv:set', async (_e, id, on) => {
  const t = fvTweaks().find((x) => x.id === id);
  if (!t || t.manual) return { ok: false, active: false };
  if (on && !t.oneshot && !LIC.valid()) return NOLIC;
  if (t.oneshot) {
    if (await isRunning('FiveM.exe')) return { ok: false, active: false, error: 'running' };
    const freed = await wipeDirs(fvCacheDirs()); return { ok: true, active: false, freed };
  }
  const ok = await fvSet(t, !!on);
  return { ok, active: await status(t) };
});
ipcMain.handle('fvc:sizes', async () => ({ shader: await sumDirs(shaderDirs()), fivem: await sumDirs(fvCacheDirs()) }));
ipcMain.handle('fvc:clean', async (_e, kind) => {
  if (kind === 'shader') return { ok: true, freed: await wipeDirs(shaderDirs()) };
  if (kind === 'fivem') { if (await isRunning('FiveM.exe')) return { ok: false, error: 'running' }; return { ok: true, freed: await wipeDirs(fvCacheDirs()) }; }
  return { ok: false };
});
const BLOAT_SAFE = /^(Microsoft\.(BingNews|BingWeather|BingSearch|GetHelp|Getstarted|MicrosoftSolitaireCollection|ZuneMusic|ZuneVideo|YourPhone|People|WindowsFeedbackHub|MicrosoftOfficeHub|SkypeApp|Todos|PowerAutomateDesktop|MixedReality\.Portal|Microsoft3DViewer|WindowsMaps|549981C3F5F10|Print3D)|Clipchamp\.Clipchamp|MicrosoftTeams|MSTeams|.*(Disney|TikTok|Spotify|Instagram|Facebook|Netflix|king\.com|AmazonPrimeVideo)).*$/i;
const BLOAT_AGGR = /^Microsoft\.(XboxApp|GamingApp|XboxGamingOverlay|XboxIdentityProvider|XboxSpeechToTextOverlay|Xbox\.TCUI|Windows\.Photos|WindowsStore|StorePurchaseApp|WindowsCommunicationsApps|Office\.OneNote|WindowsAlarms|WindowsSoundRecorder)$/i;
const bloatMatch = (name, mode) => BLOAT_SAFE.test(name) || (mode === 'aggressive' && BLOAT_AGGR.test(name));
ipcMain.handle('fvc:bloatScan', async (_e, mode) => {
  const r = await ps('Get-AppxPackage | Select-Object Name,PackageFullName | ConvertTo-Json -Compress');
  let l = []; try { l = JSON.parse(r.out || '[]'); if (!Array.isArray(l)) l = [l]; } catch {}
  return l.filter((p) => p && p.Name && bloatMatch(p.Name, mode)).map((p) => ({ name: p.Name, full: p.PackageFullName }));
});
ipcMain.handle('fvc:bloatRun', async (_e, list, mode) => {
  const failed = []; let n = 0;
  for (const p of Array.isArray(list) ? list : []) {
    if (!p || !/^[\w.\-~]+$/.test(p.full || '') || !bloatMatch(String(p.name), mode)) continue;   // nur erlaubte Pakete
    const r = await ps(`Remove-AppxPackage -Package '${p.full}' -ErrorAction Stop`);
    r.ok ? n++ : failed.push(p.name);
  }
  return { removed: n, failed };
});
ipcMain.handle('fvc:ext', async (_e, kind) => {
  if (kind === 'temp') { let f = 0; for (const c of cleanDirs()) if (c.id === 'usertemp' || c.id === 'wintemp') f += await emptyDir(c.dir); return { ok: true, freed: f }; }
  if (kind === 'bin') return { ok: (await ps('Clear-RecycleBin -Force -ErrorAction SilentlyContinue; exit 0')).ok };
  if (kind === 'disk') { try { require('child_process').spawn('cleanmgr.exe', [], { detached: true, stdio: 'ignore' }).unref(); return { ok: true }; } catch { return { ok: false }; } }
  return { ok: false };
});

// ---------- Spiele: Tweaks pro Spiel ----------
const GAMES = [
  { id: 'cs2', genre: 'Shooter', steam: 730, name: 'Counter-Strike 2', exes: ['cs2.exe'], tip: '-high -novid -nojoy', tips: ['NVIDIA Reflex im Spiel auf „Ein + Boost“ stellen.', 'Anzeigemodus: Vollbild statt Fenster.'] },
  { id: 'valorant', genre: 'Shooter', name: 'VALORANT', exes: ['VALORANT-Win64-Shipping.exe'], ac: 'Vanguard', tips: ['Vanguard läuft als Treiber – Priorität nur vorsichtig ändern.', 'NVIDIA Reflex im Spiel aktivieren.'] },
  { id: 'fortnite', genre: 'Battle Royale', name: 'Fortnite', exes: ['FortniteClient-Win64-Shipping.exe'], ac: 'Easy Anti-Cheat', tips: ['Performance-Modus (DX11) bringt auf schwächeren PCs die meisten FPS.', 'Shader-Cache nach einem GPU-Treiberupdate leeren.'] },
  { id: 'apex', genre: 'Battle Royale', steam: 1172470, name: 'Apex Legends', exes: ['r5apex.exe', 'r5apex_dx12.exe'], ac: 'Easy Anti-Cheat', tip: '+fps_max unlimited -novid -high', tips: ['DX11 ist oft stabiler als DX12.', 'Shader-Cache nach Treiberupdate leeren.'] },
  { id: 'warzone', genre: 'Battle Royale', steam: 1938090, name: 'Call of Duty: Warzone', exes: ['cod.exe'], ac: 'Ricochet', tips: ['Nach Treiber-/Spiel-Updates Shader neu kompilieren lassen.', 'Ruckler: Shader-Cache leeren.'] },
  { id: 'gta5', genre: 'Open World', steam: 271590, name: 'GTA V', exes: ['GTA5.exe', 'PlayGTAV.exe'], tip: '-notablet -disableHyperthreading', tips: ['Für FiveM bitte die FiveM-Seite nutzen.', 'Bei Speicherproblemen: Large Address Aware prüfen.'] },
  { id: 'r6', genre: 'Shooter', steam: 359550, name: 'Rainbow Six Siege', exes: ['RainbowSix.exe', 'RainbowSix_Vulkan.exe'], ac: 'BattlEye', tips: ['Vulkan-Version testen, falls DX11 ruckelt.'] },
  { id: 'rust', genre: 'Survival', steam: 252490, name: 'Rust', exes: ['RustClient.exe'], ac: 'Easy Anti-Cheat', tip: '-high -window-mode exclusive', tips: ['Mehr RAM-Auslastung ist normal – Hintergrundprogramme schließen.'] },
  { id: 'tarkov', genre: 'Shooter', name: 'Escape from Tarkov', exes: ['EscapeFromTarkov.exe'], ac: 'BattlEye', tips: ['Auf SSD installieren, Ladezeiten und Ruckler sinken stark.'] },
  { id: 'ow2', genre: 'Shooter', steam: 2357570, name: 'Overwatch 2', exes: ['Overwatch.exe'], tips: ['Reduzierte Puffer („Reduce Buffering“) im Spiel aktivieren.'] },
  { id: 'lol', genre: 'MOBA', name: 'League of Legends', exes: ['League of Legends.exe'], ac: 'Vanguard', tips: ['Im Client „Niedrige Spezifikationen“ nur bei Bedarf aktivieren.'] },
  { id: 'dota2', genre: 'MOBA', steam: 570, name: 'Dota 2', exes: ['dota2.exe'], tip: '-high -novid -dx11', tips: ['Vulkan nur nutzen, wenn DX11 Probleme macht.'] },
  { id: 'rl', genre: 'Rennen & Sport', steam: 252950, name: 'Rocket League', exes: ['RocketLeague.exe'], ac: 'Easy Anti-Cheat', tips: ['FPS auf Monitor-Hz + Reserve begrenzen, das glättet Frametimes.'] },
  { id: 'cyberpunk', genre: 'RPG', steam: 1091500, name: 'Cyberpunk 2077', exes: ['Cyberpunk2077.exe'], tips: ['Raytracing und Pfadverfolgung kosten viele FPS – DLSS/FSR nutzen.'] },
  { id: 'witcher3', genre: 'RPG', steam: 292030, name: 'The Witcher 3', exes: ['witcher3.exe'], tips: ['Bei Rucklern in Städten: Crowd-Dichte reduzieren.'] },
  { id: 'eldenring', genre: 'RPG', steam: 1245620, name: 'Elden Ring', exes: ['eldenring.exe'], ac: 'Easy Anti-Cheat', tips: ['Online nur mit aktivem Anti-Cheat starten, keine Mods.'] },
  { id: 'rdr2', genre: 'Open World', steam: 1174180, name: 'Red Dead Redemption 2', exes: ['RDR2.exe'], tips: ['Vulkan ist bei vielen Systemen flüssiger als DX12.'] },
  { id: 'pubg', genre: 'Battle Royale', steam: 578080, name: 'PUBG: Battlegrounds', exes: ['TslGame.exe'], ac: 'BattlEye', tips: ['Auf SSD installieren, das verkürzt Ladezeiten deutlich.'] },
  { id: 'destiny2', genre: 'Shooter', steam: 1085660, name: 'Destiny 2', exes: ['destiny2.exe'], ac: 'BattlEye', tips: ['FPS-Limit leicht unter Monitor-Hz setzen.'] },
  { id: 'rivals', genre: 'Shooter', steam: 2767030, name: 'Marvel Rivals', exes: ['Marvel-Win64-Shipping.exe'], tips: ['Shader-Cache nach Treiberupdate leeren.'] },
  { id: 'helldivers2', genre: 'Koop', steam: 553850, name: 'Helldivers 2', exes: ['helldivers2.exe'], ac: 'GameGuard', tips: ['Texturqualität an VRAM anpassen.'] },
  { id: 'bg3', genre: 'RPG', steam: 1086940, name: "Baldur's Gate 3", exes: ['bg3.exe', 'bg3_dx11.exe'], tips: ['Vulkan oder DX11 testen, je nach GPU.'] },
  { id: 'hogwarts', genre: 'RPG', steam: 990080, name: 'Hogwarts Legacy', exes: ['HogwartsLegacy.exe'], tips: ['Shader-Kompilierung beim ersten Start abwarten.'] },
  { id: 'bf2042', genre: 'Shooter', steam: 1517290, name: 'Battlefield 2042', exes: ['BF2042.exe'], ac: 'EA Anti-Cheat', tips: ['Hintergrundprogramme schließen, das Spiel braucht viel RAM.'] },
  { id: 'lethal', genre: 'Koop', steam: 1966720, name: 'Lethal Company', exes: ['Lethal Company.exe'], tips: [] },
  { id: 'palworld', genre: 'Survival', steam: 1623730, name: 'Palworld', exes: ['Palworld-Win64-Shipping.exe'], tip: '-useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS', tips: ['Hilft oft bei Mikro-Rucklern auf Mehrkern-CPUs.'] },
  { id: 'tf2', genre: 'Shooter', steam: 440, name: 'Team Fortress 2', exes: ['tf_win64.exe', 'hl2.exe'], tip: '-novid -high -dxlevel 95', tips: [] },
  { id: 'l4d2', genre: 'Koop', steam: 550, name: 'Left 4 Dead 2', exes: ['left4dead2.exe'], tip: '-novid -high', tips: [] },
  { id: 'gmod', genre: 'Sonstige', steam: 4000, name: "Garry's Mod", exes: ['gmod.exe'], tip: '-novid -high -dx90', tips: ['Weniger Addons = weniger Ladezeit und Ruckler.'] },
  { id: 'genshin', genre: 'RPG', name: 'Genshin Impact', exes: ['GenshinImpact.exe', 'YuanShen.exe'], tips: ['FPS-Limit passend zur Bildwiederholrate setzen.'] },
  { id: 'poe', genre: 'RPG', steam: 238960, name: 'Path of Exile', exes: ['PathOfExileSteam.exe', 'PathOfExile.exe', 'PathOfExile_x64.exe'], tips: ['Vulkan-Renderer kann in Maps ruhiger laufen.'] },
  { id: 'finals', genre: 'Shooter', steam: 2073850, name: 'THE FINALS', exes: ['Discovery.exe'], ac: 'Easy Anti-Cheat', tips: [] },
  { id: 'sot', genre: 'Koop', steam: 1172620, name: 'Sea of Thieves', exes: ['SoTGame.exe'], tips: [] },
  { id: 'fh5', genre: 'Rennen & Sport', steam: 1551360, name: 'Forza Horizon 5', exes: ['ForzaHorizon5.exe'], tips: ['Texturen auf VRAM abstimmen, sonst gibt es Pop-in.'] },
  { id: 'warframe', genre: 'Koop', steam: 230410, name: 'Warframe', exes: ['Warframe.x64.exe'], tips: [] },
  { id: 'dbd', genre: 'Koop', steam: 381210, name: 'Dead by Daylight', exes: ['DeadByDaylight-Win64-Shipping.exe'], ac: 'Easy Anti-Cheat', tips: [] },
  { id: 'fallguys', genre: 'Sonstige', steam: 1097150, name: 'Fall Guys', exes: ['FallGuys_client_game.exe'], ac: 'Easy Anti-Cheat', tips: [] },
  { id: 'amongus', genre: 'Sonstige', steam: 945360, name: 'Among Us', exes: ['Among Us.exe'], tips: [] },
  { id: 'satisfactory', genre: 'Survival', steam: 526870, name: 'Satisfactory', exes: ['FactoryGame-Win64-Shipping.exe'], tips: ['Große Fabriken: Sichtweite und Schatten reduzieren.'] },
  { id: 'minecraft', genre: 'Survival', name: 'Minecraft (Java)', exes: ['javaw.exe'], tip: '-Xms2G -Xmx4G -XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:MaxGCPauseMillis=50 -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:G1HeapRegionSize=32M', tips: ['Die Tweaks gelten für javaw.exe – dadurch auch für andere Java-Programme.', 'Die Startoptionen sind JVM-Argumente: im Minecraft-Launcher unter Installationen → Mehr Optionen → JVM-Argumente einfügen (-Xmx = max. RAM, an deinen PC anpassen).', 'Für deutlich mehr FPS: Fabric + Sodium + Lithium (und Iris für Shader).'] },
  { id: 'wow', genre: 'RPG', name: 'World of Warcraft', exes: ['Wow.exe', 'WowClassic.exe'], tips: ['In Raids: Grafikeinstellungen „Raid & Battleground“ nutzen.'] },
  { id: 'diablo4', genre: 'RPG', steam: 2344520, name: 'Diablo IV', exes: ['Diablo IV.exe'], tips: [] },
  { id: 'roblox', genre: 'Sonstige', name: 'Roblox', exes: ['RobloxPlayerBeta.exe'], tips: ['Grafikstufe manuell statt „Auto“ setzen.'] },
];
const GM_CFG = () => path.join(app.getPath('userData'), 'games-config.json');
const gmLoad = () => { try { const j = JSON.parse(fs.readFileSync(GM_CFG(), 'utf8')); return { custom: Array.isArray(j.custom) ? j.custom : [], paths: j.paths && typeof j.paths === 'object' ? j.paths : {} }; } catch { return { custom: [], paths: {} }; } };
const gmSave = (c) => { try { fs.mkdirSync(path.dirname(GM_CFG()), { recursive: true }); fs.writeFileSync(GM_CFG(), JSON.stringify(c, null, 1)); } catch {} };
const EXE_RE = /^[\w .\-]{1,64}\.exe$/i;
const gmItems = (exes, n) => exes.map((e) => ({ k: IFEO + e + '\\PerfOptions', n, t: 'REG_DWORD', on: 3, off: null }));
const gmAll = () => [...GAMES, ...gmLoad().custom.filter((e) => EXE_RE.test(e)).map((e) => ({ id: 'c:' + e, name: e.replace(/\.exe$/i, ''), exes: [e], custom: true }))];
const LAYERS = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers';
const FSO_FLAG = 'DISABLEDXMAXIMIZEDWINDOWEDMODE';
const fsoState = async (p) => { if (!p) return false; const v = await regGet(LAYERS, p); return typeof v === 'string' && v.split(/\s+/).includes(FSO_FLAG); };
const COVERS = () => path.join(app.getPath('userData'), 'covers');
const coverFile = (id) => { try { return fs.readdirSync(COVERS()).find((f) => f.startsWith(id.replace(/[^\w-]/g, '_') + '.')); } catch { return null; } };
const coverUrl = (id) => { const f = coverFile(id); return f ? pathToFileURL(path.join(COVERS(), f)).href + '?v=' + fs.statSync(path.join(COVERS(), f)).mtimeMs : ''; };
ipcMain.handle('gm:pickCover', async (_e, id) => {
  const g = gmAll().find((x) => x.id === id); if (!g) return false;
  const r = await dialog.showOpenDialog({ title: g.name + ' – Bild wählen', properties: ['openFile'], filters: [{ name: 'Bild', extensions: ['jpg', 'jpeg', 'png', 'webp'] }] });
  if (r.canceled || !r.filePaths[0]) return false;
  try {
    fs.mkdirSync(COVERS(), { recursive: true });
    const old = coverFile(id); if (old) fs.unlinkSync(path.join(COVERS(), old));
    fs.copyFileSync(r.filePaths[0], path.join(COVERS(), id.replace(/[^\w-]/g, '_') + path.extname(r.filePaths[0]).toLowerCase()));
    return true;
  } catch { return false; }
});
ipcMain.handle('gm:clearCover', (_e, id) => { try { const f = coverFile(id); if (f) fs.unlinkSync(path.join(COVERS(), f)); } catch {} return true; });
ipcMain.handle('gm:list', async () => {
  const cfg = gmLoad(), out = [];
  for (const g of gmAll()) {
    const p = cfg.paths[g.id] || '';
    out.push({ id: g.id, genre: g.genre || 'Eigene', steam: g.steam || 0, cover: coverUrl(g.id), name: g.name, exes: g.exes, tip: g.tip || '', tips: g.tips || [], ac: g.ac || '', custom: !!g.custom, path: p,
      cpu: await status({ items: gmItems(g.exes, 'CpuPriorityClass') }), io: await status({ items: gmItems(g.exes, 'IoPriority') }), fso: await fsoState(p) });
  }
  return out;
});
ipcMain.handle('gm:set', async (_e, id, key, on) => {
  const g = gmAll().find((x) => x.id === id);
  if (!g || !['cpu', 'io'].includes(key)) return { ok: false, active: false };
  if (on && !LIC.valid()) return NOLIC;
  const items = gmItems(g.exes, key === 'cpu' ? 'CpuPriorityClass' : 'IoPriority');
  let ok = true;
  for (const i of items) { const r = on ? await regSet(i.k, i.n, i.t, i.on) : await regDel(i.k, i.n); if (on && !r.ok) ok = false; }
  return { ok, active: await status({ items }) };
});
ipcMain.handle('gm:pickExe', async (_e, id) => {
  const g = gmAll().find((x) => x.id === id); if (!g) return null;
  const r = await dialog.showOpenDialog({ title: g.name + ' – Spiel-EXE wählen', properties: ['openFile'], filters: [{ name: 'Programm', extensions: ['exe'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const c = gmLoad(); c.paths[id] = r.filePaths[0]; gmSave(c); return r.filePaths[0];
});
ipcMain.handle('gm:fso', async (_e, id, on) => {
  if (on && !LIC.valid()) return NOLIC;
  const p = gmLoad().paths[id];
  if (!p) return { ok: false, active: false, error: 'nopath' };
  const cur = await regGet(LAYERS, p);
  const tok = (typeof cur === 'string' ? cur.split(/\s+/) : []).filter((t) => t && t !== '~' && t !== FSO_FLAG);
  if (on) tok.push(FSO_FLAG);
  const r = tok.length ? await regSet(LAYERS, p, 'REG_SZ', '~ ' + tok.join(' ')) : await regDel(LAYERS, p);
  return { ok: r.ok || !on, active: await fsoState(p) };
});
ipcMain.handle('gm:add', (_e, exe) => {
  exe = String(exe || '').trim();
  if (!EXE_RE.test(exe)) return { ok: false, error: 'Bitte einen Dateinamen wie spiel.exe eingeben.' };
  const c = gmLoad();
  if (GAMES.some((g) => g.exes.some((x) => x.toLowerCase() === exe.toLowerCase())) || c.custom.some((x) => x.toLowerCase() === exe.toLowerCase())) return { ok: false, error: 'Schon in der Liste.' };
  c.custom.push(exe); gmSave(c); return { ok: true };
});
ipcMain.handle('gm:remove', async (_e, id) => {
  const g = gmAll().find((x) => x.id === id && x.custom);
  if (!g) return false;
  for (const n of ['CpuPriorityClass', 'IoPriority']) for (const i of gmItems(g.exes, n)) await regDel(i.k, i.n);
  const c = gmLoad(); c.custom = c.custom.filter((x) => x !== g.exes[0]); delete c.paths[id]; gmSave(c); return true;
});

// ---------- Lizenz ----------
ipcMain.handle('lic:status', async () => { await LIC.ready(); return LIC.status(); });
ipcMain.handle('lic:activate', (_e, key) => LIC.activate(key));
ipcMain.handle('lic:cancel', () => { LIC.cancel(); return true; });
ipcMain.handle('lic:refresh', () => LIC.refresh());
ipcMain.handle('lic:logout', () => LIC.logout());
ipcMain.handle('lic:hwid', () => LIC.hwid());

// ---------- Crosshair-Overlay: klickdurchlässiges, transparentes Fenster über allem ----------
const CH_CFG = () => path.join(app.getPath('userData'), 'crosshair.json');
const CH_SHAPES = ['cross', 'crossdot', 'dot', 'circle', 't'];
const CH_DEF = { on: false, shape: 'cross', color: '#ffffff', size: 26, thick: 2, gap: 4, opacity: 100, outline: true, dot: false, dotSize: 3, ox: 0, oy: 0,
  display: 'primary', autoScale: true, onlyGame: false };
const chNum = (v, lo, hi, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.min(hi, Math.max(lo, n)); };
const chBool = (v, d) => v === undefined ? d : !!v;
const chClean = (j) => { j = j || {}; return { on: !!j.on, shape: CH_SHAPES.includes(j.shape) ? j.shape : CH_DEF.shape,
  color: /^#[0-9a-f]{6}$/i.test(j.color) ? j.color : CH_DEF.color, size: chNum(j.size, 8, 80, 26), thick: chNum(j.thick, 1, 8, 2), gap: chNum(j.gap, 0, 24, 4),
  opacity: chNum(j.opacity, 20, 100, 100), outline: chBool(j.outline, true), dot: !!j.dot, dotSize: chNum(j.dotSize, 1, 10, 3),
  ox: chNum(j.ox, -60, 60, 0), oy: chNum(j.oy, -60, 60, 0),
  display: typeof j.display === 'string' && /^(primary|\d{1,12})$/.test(j.display) ? j.display : 'primary', autoScale: chBool(j.autoScale, true), onlyGame: !!j.onlyGame }; };
const chLoad = () => { try { return chClean(JSON.parse(fs.readFileSync(CH_CFG(), 'utf8'))); } catch { return chClean({}); } };
const chSave = (c) => { try { fs.mkdirSync(path.dirname(CH_CFG()), { recursive: true }); fs.writeFileSync(CH_CFG(), JSON.stringify(c)); } catch {} };
const chDisplay = (c) => { const all = screen.getAllDisplays(); return all.find((d) => String(d.id) === c.display) || screen.getPrimaryDisplay(); };
let chWin = null, chTimer = null, chKey = '';
const chClose = () => { clearInterval(chTimer); chTimer = null; chKey = ''; if (chWin && !chWin.isDestroyed()) chWin.destroy(); chWin = null; };
// Läuft ein Spiel? (Spiele-Liste, eigene .exe-Einträge, FiveM/GTA)
async function gameRunning() {
  const r = await run('tasklist', ['/FO', 'CSV', '/NH']);
  if (!r.ok) return true;
  const names = new Set(r.out.split(/\r?\n/).map((l) => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map((n) => n.toLowerCase()));
  const exes = new Set(['gta5.exe', ...gmAll().flatMap((g) => g.exes || []).map((e) => e.toLowerCase())]);
  return [...names].some((n) => exes.has(n) || /^fivem.*\.exe$/.test(n));
}
async function chVisible() {
  const c = chLoad(); if (!chWin || chWin.isDestroyed()) return;
  const show = c.on && (!c.onlyGame || await gameRunning());
  if (show && !chWin.isVisible()) chWin.showInactive(); else if (!show && chWin.isVisible()) chWin.hide();
}
function chSync() {
  const c = chLoad();
  if (!c.on) return chClose();
  const d = chDisplay(c), b = d.bounds, scale = c.autoScale ? b.height / 1080 : 1, S = Math.ceil(240 * scale);
  const q = { scale: String(scale) }; for (const k of Object.keys(c)) if (!['on', 'display', 'autoScale', 'onlyGame'].includes(k)) q[k] = String(c[k]);
  const bounds = { x: Math.round(b.x + b.width / 2 - S / 2), y: Math.round(b.y + b.height / 2 - S / 2), width: S, height: S };
  const file = path.join(__dirname, 'renderer', 'crosshair-overlay.html');
  if (!chWin || chWin.isDestroyed()) {
    chWin = new BrowserWindow({ ...bounds, frame: false, transparent: true, resizable: false, movable: false, focusable: false, skipTaskbar: true, hasShadow: false, show: false, alwaysOnTop: true });
    chWin.setAlwaysOnTop(true, 'screen-saver'); chWin.setIgnoreMouseEvents(true);
    chWin.once('ready-to-show', () => chVisible());
    chKey = '';
  } else chWin.setBounds(bounds);
  const key = JSON.stringify([bounds, q]);
  if (key !== chKey) { chKey = key; chWin.loadFile(file, { query: q }); }
  clearInterval(chTimer); chTimer = c.onlyGame ? setInterval(chVisible, 4000) : null;
  if (chWin.webContents.isLoading() === false) chVisible();
}
app.whenReady().then(() => {
  const re = () => { if (chWin) chSync(); };
  screen.on('display-metrics-changed', re); screen.on('display-added', re); screen.on('display-removed', re);
});
ipcMain.handle('ch:get', () => chLoad());
ipcMain.handle('ch:displays', () => screen.getAllDisplays().map((d, i) => ({ id: String(d.id),
  name: `Monitor ${i + 1} – ${Math.round(d.bounds.width * d.scaleFactor)}×${Math.round(d.bounds.height * d.scaleFactor)}${d.id === screen.getPrimaryDisplay().id ? ' (Hauptmonitor)' : ''}` })));
ipcMain.handle('ch:set', (_e, patch) => {
  if (patch && patch.on && !LIC.valid()) return { ...chLoad(), error: 'license' };
  const c = chClean({ ...chLoad(), ...(patch || {}) }); chSave(c); chSync(); return c;
});

function createWindow() {
  const w = new BrowserWindow({
    width: 1180, height: 760, minWidth: 940, minHeight: 600, backgroundColor: '#0b0b0b', autoHideMenuBar: true,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#0b0b0b', symbolColor: '#f2f2f2', height: 38 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  w.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  w.on('closed', chClose);
}
app.whenReady().then(() => { LIC.init().catch(() => {}); createWindow(); chSync(); });
app.on('window-all-closed', () => app.quit());
