// Lizenz-Client (Hauptprozess): Hardware-ID, Aktivierung, signierte Prüfung, Offline-Toleranz.
const { app, shell } = require('electron');
const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const CFG = require('./license-config.json');

const FILE = () => path.join(app.getPath('userData'), 'license.json');
const GRACE = (+CFG.graceHours || 72) * 36e5;
const FATAL = ['invalid_key', 'revoked', 'expired', 'hwid_mismatch']; // diese Antworten entziehen die Lizenz sofort

const sh = (exe, args) => new Promise((res) => execFile(exe, args, { windowsHide: true, timeout: 15000 }, (e, o) => res(e ? '' : String(o || ''))));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

let PUB = null;
try { if (CFG.publicKey) PUB = crypto.createPublicKey(CFG.publicKey); } catch {}

// ---------- Hardware-ID ----------
let _hwid = '';
async function hwid() {
  if (_hwid) return _hwid;
  for (let i = 0; i < 3 && !_hwid; i++) {
    const out = await sh('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      "$ErrorActionPreference='SilentlyContinue'; (Get-CimInstance Win32_ComputerSystemProduct).UUID; (Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId; (Get-CimInstance Win32_BaseBoard).SerialNumber"]);
    const parts = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) _hwid = sha('atk1|' + parts.join('|')).slice(0, 32);
  }
  if (!_hwid) { // Fallback: Windows-Maschinen-GUID
    const o = await sh('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']);
    const m = o.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
    _hwid = sha('atk1-guid|' + (m ? m[1] : require('os').hostname())).slice(0, 32);
  }
  return _hwid;
}

// ---------- Zustand ----------
let st = { key: '', discordId: '', resp: null, nonce: '', lastOnline: 0, lastRun: 0 };
let cur = null;      // geprüfte Lizenz-Daten (Payload)
let lastReason = ''; // letzter Fehlercode
let cancelFlag = false;

const load = () => { try { st = { ...st, ...JSON.parse(fs.readFileSync(FILE(), 'utf8')) }; } catch {} };
const persist = () => { try { fs.mkdirSync(path.dirname(FILE()), { recursive: true }); fs.writeFileSync(FILE(), JSON.stringify(st)); } catch {} };

function verify(resp, nonce, hw) {
  try {
    if (!PUB || !resp || typeof resp.payload !== 'string') return null;
    if (!crypto.verify(null, Buffer.from(resp.payload), PUB, Buffer.from(resp.sig, 'base64'))) return null;
    const p = JSON.parse(resp.payload);
    if (p.hwid !== hw || p.nonce !== nonce) return null;
    return p;
  } catch { return null; }
}

async function post(body) {
  const r = await fetch(String(CFG.serverUrl).replace(/\/$/, '') + '/api/validate', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000),
  });
  return r.json();
}

// Gültig = signierte Antwort, nicht abgelaufen, letzte Online-Prüfung nicht zu lange her, Uhr nicht zurückgedreht
function valid() {
  if (!cur) return false;
  const now = Date.now();
  if (cur.expiresAt && now > cur.expiresAt) return false;
  if (now < st.lastRun - 36e5) return false;
  return now - st.lastOnline < GRACE;
}

function status() {
  const ok = valid();
  return {
    configured: !!PUB,
    licensed: ok, reason: ok ? '' : lastReason,
    plan: cur ? cur.planName : '', expiresAt: cur ? cur.expiresAt : null, discordId: cur ? cur.discordId : '',
    key: st.key ? st.key.slice(0, 8) + '••••••••' + st.key.slice(-4) : '',
    hwid: _hwid, plans: CFG.plans || [], buyUrl: /^https?:\/\//.test(CFG.buyUrl || '') ? CFG.buyUrl : '',
  };
}

async function ingest(resp, nonce) {
  const p = verify(resp, nonce, await hwid());
  if (!p) return false;
  cur = p; st.resp = resp; st.nonce = nonce; st.lastOnline = Date.now(); st.lastRun = Date.now(); lastReason = '';
  persist();
  return true;
}

// Beim Start: gespeicherte Antwort lokal prüfen (ist sie zu alt, wird vor dem Anzeigen online erneuert)
let _ready = Promise.resolve();
function init() {
  _ready = (async () => {
    load();
    const hw = await hwid();
    cur = verify(st.resp, st.nonce, hw);
    if (!cur) lastReason = st.key ? 'offline' : '';
    st.lastRun = Math.max(st.lastRun, Date.now());
    if (st.key && !valid()) await refresh();
  })();
  _ready.then(() => { if (st.key) refresh(); setInterval(refresh, 30 * 60e3).unref(); });
  return _ready;
}

async function refresh() {
  if (!st.key || !PUB) return status();
  const hw = await hwid(), nonce = crypto.randomBytes(12).toString('hex');
  try {
    const r = await post({ key: st.key, hwid: hw, nonce });
    if (r.ok) { if (!(await ingest(r, nonce))) lastReason = 'bad_signature'; }
    else if (FATAL.includes(r.error)) { cur = null; st.resp = null; st.key = ''; persist(); lastReason = r.error; }
  } catch { /* Server nicht erreichbar → Offline-Toleranz */ }
  st.lastRun = Math.max(st.lastRun, Date.now()); persist();
  return status();
}

// Aktivieren (inkl. optionaler Discord-Bestätigung im Browser)
async function activate(key) {
  if (!PUB) return { ok: false, error: 'unconfigured', ...status() };
  cancelFlag = false;
  const hw = await hwid();
  key = String(key || '').trim();
  const nonce = crypto.randomBytes(12).toString('hex');
  try {
    let r = await post({ key, hwid: hw, nonce, login: true });
    if (r.error === 'discord_required' && r.ticket) {
      const ticket = r.ticket;
      if (new URL(r.loginUrl).origin !== new URL(CFG.serverUrl).origin) return { ok: false, error: 'bad_request', ...status() };
      await shell.openExternal(r.loginUrl);
      const until = Date.now() + 5 * 60e3;
      while (Date.now() < until && !cancelFlag) {
        await new Promise((s) => setTimeout(s, 2000));
        r = await post({ key, hwid: hw, nonce, login: true, ticket });
        if (r.error !== 'discord_pending') break;
      }
      if (cancelFlag) return { ok: false, error: 'cancelled', ...status() };
      if (r.error === 'discord_pending') return { ok: false, error: 'timeout', ...status() };
    }
    if (r.ok && (await ingest(r, nonce))) { st.key = normalize(key); st.discordId = cur.discordId; persist(); return { ok: true, ...status() }; }
    return { ok: false, error: r.ok ? 'bad_signature' : r.error || 'bad_request', ...status() };
  } catch { return { ok: false, error: 'network', ...status() }; }
}
const normalize = (k) => { const n = k.toUpperCase().replace(/[^A-Z0-9]/g, ''); const m = n.match(/^ATK([A-Z0-9]{16})$/); return m ? 'ATK-' + m[1].match(/.{4}/g).join('-') : k; };

function logout() { cur = null; st = { key: '', discordId: '', resp: null, nonce: '', lastOnline: 0, lastRun: Date.now() }; persist(); lastReason = ''; return status(); }

module.exports = { init, ready: () => _ready, status, activate, refresh, logout, valid, hwid, cancel: () => { cancelFlag = true; } };
