// Attack.tweaks Lizenz-Server (keine Abhängigkeiten, Node >= 18)
// - Keys werden im Admin-Panel (/admin) erstellt und sind an eine Discord-ID gebunden.
// - Beim ersten Aktivieren wird die Hardware-ID (HWID) des PCs fest an den Key gebunden.
// - Antworten werden mit Ed25519 signiert; die App prüft die Signatur mit dem eingebauten Public Key.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DAY = 864e5;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O/1/I
const DEFAULT_PLANS = [
  { id: 'week', name: '1 Woche', days: 7, price: 5 },
  { id: 'month', name: '1 Monat', days: 30, price: 15 },
  { id: 'lifetime', name: 'Lifetime', days: null, price: 30 },
];

const genKey = () => {
  const b = crypto.randomBytes(16);
  let s = '';
  for (let i = 0; i < 16; i++) s += ALPHA[b[i] & 31];
  return 'ATK-' + s.match(/.{4}/g).join('-');
};
const normKey = (k) => {
  const n = String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = n.match(/^ATK([A-Z0-9]{16})$/);
  return m ? 'ATK-' + m[1].match(/.{4}/g).join('-') : '';
};
const isSnowflake = (s) => /^\d{17,20}$/.test(String(s || ''));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeEq = (a, b) => {
  const h = (x) => crypto.createHash('sha256').update(String(x)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};
const statusOf = (k, now = Date.now()) =>
  k.revoked ? 'revoked' : !k.activatedAt ? 'unused' : k.expiresAt && now > k.expiresAt ? 'expired' : 'active';

function loadConfig(file) {
  let c = {};
  if (fs.existsSync(file)) c = JSON.parse(fs.readFileSync(file, 'utf8'));
  else console.warn(`Hinweis: ${file} fehlt – nutze Umgebungsvariablen/Standardwerte.`);
  const cfg = {
    port: +(process.env.PORT || c.port || 8790),
    host: c.host || '0.0.0.0',
    publicUrl: String(process.env.PUBLIC_URL || c.publicUrl || '').replace(/\/$/, ''),
    adminPassword: process.env.ADMIN_PASSWORD || c.adminPassword || '',
    trustProxy: !!c.trustProxy,
    plans: Array.isArray(c.plans) && c.plans.length ? c.plans : DEFAULT_PLANS,
    discord: { clientId: '', clientSecret: '', botToken: '', guildId: '', ...(c.discord || {}) },
    boost: { secret: String(process.env.BOOST_SECRET || (c.boost || {}).secret || ''), days: Math.max(1, Math.min(30, Math.floor(+(c.boost || {}).days) || 3)) },
  };
  if (process.env.DISCORD_BOT_TOKEN) cfg.discord.botToken = process.env.DISCORD_BOT_TOKEN;
  if (process.env.DISCORD_GUILD_ID) cfg.discord.guildId = process.env.DISCORD_GUILD_ID;
  cfg.discord.guildId = String(cfg.discord.guildId || '');
  cfg.lookup = !!cfg.discord.botToken; // Namen per Discord-ID nachschlagen (Bot-Token)
  cfg.roles = cfg.lookup && /^\d{17,20}$/.test(cfg.discord.guildId); // Rollen aus deinem Discord-Server
  cfg.oauth = !!(cfg.discord.clientId && cfg.discord.clientSecret && cfg.publicUrl);
  return cfg;
}

function createApp(cfg, dataDir, opts = {}) {
  fs.mkdirSync(dataDir, { recursive: true });

  // ---------- Speicher ----------
  const DB_FILE = path.join(dataDir, 'keys.json');
  let db = { keys: {}, log: [], boost: {} };
  try { const j = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); db = { keys: j.keys || {}, log: j.log || [], boost: j.boost || {} }; } catch {}
  const save = () => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
    fs.renameSync(tmp, DB_FILE);
  };
  const log = (type, key, msg) => { db.log.unshift({ t: Date.now(), type, key: key || '', msg: msg || '' }); db.log.length = Math.min(db.log.length, 400); };

  // ---------- Signaturschlüssel ----------
  const PRIV = path.join(dataDir, 'server-key.pem');
  if (!fs.existsSync(PRIV)) {
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync(PRIV, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  }
  const privKey = crypto.createPrivateKey(fs.readFileSync(PRIV));
  const pubPem = crypto.createPublicKey(privKey).export({ type: 'spki', format: 'pem' });
  const sign = (payload) => crypto.sign(null, Buffer.from(payload), privKey).toString('base64');

  // ---------- Hilfen ----------
  const hits = new Map();
  const limited = (bucket, ip, max, win) => {
    const id = bucket + '|' + ip, now = Date.now();
    const a = (hits.get(id) || []).filter((t) => now - t < win);
    a.push(now); hits.set(id, a);
    return a.length > max;
  };
  setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some((t) => now - t < 36e5)) hits.delete(k); }, 6e5).unref();

  const sessions = new Map();
  const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((s) => s.trim().split('=')).filter((a) => a[0]).map(([k, ...v]) => [k, v.join('=')]));
  const authed = (req) => { const t = cookies(req).adm; const e = t && sessions.get(t); if (e && e > Date.now()) return true; if (t) sessions.delete(t); return false; };

  const ipOf = (req) => (cfg.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
  const readJson = (req) => new Promise((res, rej) => {
    let n = 0; const c = [];
    req.on('data', (d) => { n += d.length; if (n > 16384) { rej(new Error('too_large')); req.destroy(); } else c.push(d); });
    req.on('end', () => { try { res(c.length ? JSON.parse(Buffer.concat(c).toString()) : {}); } catch { rej(new Error('bad_json')); } });
    req.on('error', rej);
  });
  const SEC = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-store' };
  const send = (res, code, obj, h = {}) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', ...SEC, ...h }); res.end(JSON.stringify(obj)); };
  const page = (res, code, html) => { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', ...SEC, 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'" }); res.end(html); };
  const msgPage = (title, text, ok) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><body style="background:#0b0b0b;color:#f2f2f2;font:15px system-ui;display:grid;place-items:center;height:100vh;margin:0"><div style="max-width:380px;text-align:center;padding:24px"><h2 style="margin:0 0 8px;color:${ok ? '#34d399' : '#f2566f'}">${esc(title)}</h2><p style="color:#a3a3a3">${esc(text)}</p></div>`;

  // ---------- Tickets für die Discord-Bestätigung ----------
  const tickets = new Map(); // id -> { key, hwid, exp, verifiedId }
  setInterval(() => { const now = Date.now(); for (const [id, t] of tickets) if (t.exp < now) tickets.delete(id); }, 6e4).unref();

  // ---------- Lizenz prüfen / aktivieren ----------
  function licenseReply(k, nonce) {
    const payload = JSON.stringify({ v: 1, key: k.key, plan: k.plan, planName: k.planName, discordId: k.discordId, hwid: k.hwid, expiresAt: k.expiresAt, issuedAt: Date.now(), nonce });
    return { ok: true, payload, sig: sign(payload) };
  }
  function validate(b) {
    const now = Date.now();
    const key = normKey(b.key), hwid = String(b.hwid || '').toLowerCase(), nonce = String(b.nonce || '');
    if (!key || !/^[a-f0-9]{32,64}$/.test(hwid) || !/^[\w-]{8,64}$/.test(nonce)) return { ok: false, error: 'bad_request' };
    const k = db.keys[key];
    if (!k) { log('fail', String(b.key || '').slice(0, 24), 'Unbekannter Key'); save(); return { ok: false, error: 'invalid_key' }; }
    if (k.revoked) return { ok: false, error: 'revoked' };
    if (k.expiresAt && now > k.expiresAt) return { ok: false, error: 'expired' };
    if (k.hwid && k.hwid !== hwid) { log('fail', key, 'Andere Hardware-ID'); save(); return { ok: false, error: 'hwid_mismatch' }; }

    // Aktivieren (login:true) und Erstbindung verlangen IMMER die Anmeldung bei Discord.
    // Reine Hintergrundprüfungen einer bereits gebundenen App laufen ohne erneute Anmeldung.
    if (!k.hwid || b.login === true) {
      if (!cfg.oauth) return { ok: false, error: 'server_not_configured' };
      if (!b.ticket) {
        const id = crypto.randomBytes(18).toString('base64url');
        tickets.set(id, { key, hwid, exp: now + 10 * 60e3, verifiedId: null });
        return { ok: false, error: 'discord_required', ticket: id, loginUrl: `${cfg.publicUrl}/auth/discord?ticket=${id}` };
      }
      const t = tickets.get(String(b.ticket));
      if (!t || t.key !== key || t.hwid !== hwid || t.exp < now) return { ok: false, error: 'ticket_invalid' };
      if (!t.verifiedId) return { ok: false, error: 'discord_pending' };
      tickets.delete(String(b.ticket));
      if (k.discordId && t.verifiedId !== k.discordId) { log('fail', key, 'Anderer Discord-Account angemeldet'); save(); return { ok: false, error: 'discord_mismatch' }; }
      if (!k.discordId) { k.discordId = t.verifiedId; log('bind', key, `Discord-ID ${t.verifiedId} automatisch erkannt`); } // Key ohne vorgegebene ID: der erste Login bindet ihn
      if (t.verifiedName) k.discordName = t.verifiedName;
      if (t.verifiedAvatar) k.discordAvatar = t.verifiedAvatar;
    }
    if (!k.hwid) {
      k.hwid = hwid;
      k.activatedAt = now;
      k.expiresAt = k.days ? now + k.days * DAY : null;
      log('activate', key, `Aktiviert (Discord ${k.discordId})`);
    }
    k.lastSeen = now;
    save();
    return licenseReply(k, nonce);
  }

  // ---------- Discord-Name automatisch über die ID (Bot-Token) ----------
  const nameCache = new Map(); // id -> { t, u }
  const avatarUrl = (id, hash) => hash
    ? `https://cdn.discordapp.com/avatars/${id}/${hash}.${String(hash).startsWith('a_') ? 'gif' : 'png'}?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
  const dget = async (pth) => {
    const r = await fetch('https://discord.com/api/v10' + pth, { headers: { authorization: 'Bot ' + cfg.discord.botToken }, signal: AbortSignal.timeout(8000) });
    if (r.status === 404) return { error: 'not_found' };
    if (r.status === 401 || r.status === 403) return { error: 'bad_token' };
    if (r.status === 429) return { error: 'rate_limited' };
    if (!r.ok) return { error: 'discord_error' };
    return r.json();
  };
  const discordLookup = opts.discordLookup || ((id) => dget('/users/' + id));
  const discordMember = opts.discordMember || ((id) => dget(`/guilds/${cfg.discord.guildId}/members/${id}`));
  const discordRoles = opts.discordRoles || (() => dget(`/guilds/${cfg.discord.guildId}/roles`));
  const canRoles = !!(cfg.roles || opts.discordMember);
  const canLookup = !!(cfg.lookup || opts.discordLookup);
  const LOOKUP_ERR = {
    no_token: 'Kein Bot-Token hinterlegt (config.json → discord.botToken). Der Name wird dann beim ersten Login erkannt.',
    not_found: 'Diese Discord-ID existiert nicht.', bad_token: 'Der Bot-Token ist ungültig.',
    rate_limited: 'Discord bremst gerade – gleich noch einmal versuchen.', discord_error: 'Discord ist gerade nicht erreichbar.',
    bad_id: 'Discord-ID muss 17–20 Ziffern haben.',
  };
  let rolesCache = { t: 0, m: null };
  async function roleMap() { // Rollen-Liste des Servers (10 Min. gecacht)
    if (rolesCache.m && Date.now() - rolesCache.t < 10 * 60e3) return rolesCache.m;
    const d = await discordRoles();
    if (!Array.isArray(d)) return rolesCache.m;
    const m = new Map(d.map((r) => [r.id, { name: String(r.name).slice(0, 40), color: r.color ? '#' + r.color.toString(16).padStart(6, '0') : '', pos: r.position | 0 }]));
    rolesCache = { t: Date.now(), m };
    return m;
  }
  async function memberRoles(id) { // null = Abfrage nicht möglich (nichts ändern)
    if (!canRoles) return null;
    try {
      const mem = await discordMember(id);
      if (mem && mem.error === 'not_found') return { inGuild: false, roles: [] };
      if (!mem || mem.error || !Array.isArray(mem.roles)) return null;
      const map = await roleMap();
      if (!map) return null;
      const roles = mem.roles.map((r) => map.get(r)).filter(Boolean).sort((a, b) => b.pos - a.pos).map(({ name, color }) => ({ name, color }));
      return { inGuild: true, roles };
    } catch { return null; }
  }
  async function lookupUser(id, force) {
    if (!isSnowflake(id)) return { error: 'bad_id' };
    if (!canLookup) return { error: 'no_token' };
    const c = nameCache.get(id);
    if (c && !force && Date.now() - c.t < 5 * 60e3) return c.u;
    try {
      const d = await discordLookup(id);
      if (!d || d.error) return { error: (d && d.error) || 'discord_error' };
      const u = { id, name: String(d.global_name || d.username || '').slice(0, 60), username: String(d.username || '').slice(0, 40), avatar: avatarUrl(id, d.avatar) };
      const m = await memberRoles(id); if (m) Object.assign(u, m);
      nameCache.set(id, { t: Date.now(), u });
      return u;
    } catch { return { error: 'discord_error' }; }
  }
  const applyUser = (k, u) => { k.discordName = u.name; k.discordAvatar = u.avatar; if (u.roles) { k.discordRoles = u.roles; k.inGuild = u.inGuild; k.rolesAt = Date.now(); } };
  let backfilling = false;
  const tried = new Map();
  async function backfill(all) { // Namen für Keys nachtragen, die nur eine ID haben
    if (backfilling || !canLookup) return { updated: 0, failed: 0 };
    backfilling = true; let updated = 0, failed = 0;
    try {
      const stale = (k) => canRoles && (!k.rolesAt || Date.now() - k.rolesAt > 10 * 60e3);
      const todo = Object.values(db.keys).filter((k) => k.discordId && (all || !k.discordName || !k.discordAvatar || stale(k)) && (all || Date.now() - (tried.get(k.key) || 0) > 2 * 60e3)).slice(0, all ? 60 : 8);
      for (const k of todo) tried.set(k.key, Date.now());
      for (const k of todo) {
        const u = await lookupUser(k.discordId, all);
        if (u.error) { failed++; if (u.error === 'rate_limited' || u.error === 'bad_token') break; continue; }
        applyUser(k, u); updated++;
        if (todo.length > 1) await new Promise((r) => setTimeout(r, opts.discordLookup ? 0 : 150));
      }
      if (updated) save();
    } finally { backfilling = false; }
    return { updated, failed };
  }

  // ---------- Server-Boost-Belohnung (vom Discord-Bot aufgerufen) ----------
  const boostOn = cfg.boost.secret.length >= 20;
  async function boostApi(req, res, p) {
    if (!boostOn) return send(res, 404, { error: 'not_found' });
    if (limited('boost', ipOf(req), 60, 60e3)) return send(res, 429, { error: 'rate_limited' });
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m || !safeEq(m[1], cfg.boost.secret)) return send(res, 401, { error: 'unauthorized' });
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const b = await readJson(req), id = String(b.discordId || '').trim();
    if (!isSnowflake(id)) return send(res, 400, { error: 'bad_id' });
    if (p === '/api/boost-key/report') { // Bot meldet, ob die DM angekommen ist
      const k = db.boost[id] && db.keys[db.boost[id].key];
      if (!k) return send(res, 404, { error: 'no_key' });
      k.note = b.delivered ? 'Server-Boost · per DM zugestellt' : 'Server-Boost · DM fehlgeschlagen – Key bitte manuell senden';
      log(b.delivered ? 'boost' : 'fail', k.key, b.delivered ? 'Boost-Key per DM zugestellt' : 'Boost-Key: DM nicht möglich (DMs aus?)'); save();
      return send(res, 200, { ok: true });
    }
    if (db.boost[id]) return send(res, 200, { ok: true, created: false }); // nur einmal pro Person, auch nach erneutem Boost
    db.boost[id] = { t: Date.now(), key: null }; // sofort sperren (parallele Aufrufe)
    const days = cfg.boost.days, u = await lookupUser(id), found = u && !u.error ? u : null;
    let key; do key = genKey(); while (db.keys[key]);
    const name = found ? found.name : String(b.discordName || '').slice(0, 60);
    db.keys[key] = { key, plan: 'boost', planName: `${days} Tage (Boost)`, days, price: 0, discordId: id, discordName: name, discordAvatar: found ? found.avatar : '', discordRoles: found && found.roles ? found.roles : [], inGuild: found && found.roles ? found.inGuild : null, rolesAt: found && found.roles ? Date.now() : 0, note: 'Server-Boost', createdAt: Date.now(), activatedAt: null, expiresAt: null, hwid: null, lastSeen: null, revoked: false, hwidResets: 0 };
    db.boost[id].key = key;
    log('boost', key, `Server-Boost von ${name || id} → ${days} Tage`); save();
    return send(res, 200, { ok: true, created: true, key, days });
  }

  // ---------- Admin ----------
  const view = (k, now) => ({
    key: k.key, plan: k.plan, planName: k.planName, price: k.price, lifetime: !k.days,
    discordId: k.discordId, discordName: k.discordName || '', discordAvatar: k.discordAvatar || '', discordRoles: k.discordRoles || [], inGuild: k.inGuild == null ? null : k.inGuild, note: k.note || '',
    createdAt: k.createdAt, activatedAt: k.activatedAt, expiresAt: k.expiresAt, hwid: k.hwid,
    lastSeen: k.lastSeen, hwidResets: k.hwidResets || 0, status: statusOf(k, now),
  });
  const pendingNames = () => Object.values(db.keys).filter((k) => k.discordId && !k.discordName).length;
  const adminList = () => {
    const now = Date.now(), keys = Object.values(db.keys).map((k) => view(k, now)).sort((a, b) => b.createdAt - a.createdAt);
    const c = (s) => keys.filter((k) => k.status === s).length;
    return { keys, plans: cfg.plans, oauth: cfg.oauth, lookup: canLookup, roles: canRoles, pending: canLookup ? pendingNames() : 0, stats: { total: keys.length, active: c('active'), unused: c('unused'), expired: c('expired'), revoked: c('revoked'), revenue: keys.filter((k) => !k.revoked).reduce((s, k) => s + (+k.price || 0), 0) }, log: db.log.slice(0, 150) };
  };

  async function admin(req, res, p) {
    const ip = ipOf(req);
    if (req.headers['x-admin'] !== '1') return send(res, 400, { error: 'bad_request' });
    if (p === '/admin/api/login' && req.method === 'POST') {
      if (limited('login', ip, 8, 10 * 60e3)) return send(res, 429, { error: 'Zu viele Versuche. Bitte 10 Minuten warten.' });
      const b = await readJson(req);
      if (!safeEq(b.password || '', cfg.adminPassword)) { log('fail', '', 'Admin-Login fehlgeschlagen'); save(); return send(res, 401, { error: 'Falsches Passwort.' }); }
      const t = crypto.randomBytes(32).toString('hex');
      sessions.set(t, Date.now() + 12 * 36e5);
      const secure = cfg.publicUrl.startsWith('https') ? '; Secure' : '';
      return send(res, 200, { ok: true }, { 'set-cookie': `adm=${t}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=43200${secure}` });
    }
    if (!authed(req)) return send(res, 401, { error: 'login' });
    if (p === '/admin/api/logout') { sessions.delete(cookies(req).adm); return send(res, 200, { ok: true }, { 'set-cookie': 'adm=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0' }); }
    if (p === '/admin/api/list') { backfill(false).catch(() => {}); return send(res, 200, adminList()); }
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const b = await readJson(req);

    if (p === '/admin/api/lookup') {
      if (limited('lookup', ip, 60, 60e3)) return send(res, 429, { error: 'Zu viele Anfragen.' });
      const u = await lookupUser(String(b.id || '').trim());
      return send(res, 200, u.error ? { ok: false, error: LOOKUP_ERR[u.error] || u.error, code: u.error } : { ok: true, user: u });
    }
    if (p === '/admin/api/refresh-names') {
      if (!canLookup) return send(res, 400, { error: LOOKUP_ERR.no_token });
      const r = await backfill(true);
      log('names', '', `Discord-Namen aktualisiert (${r.updated} ok, ${r.failed} fehlgeschlagen)`); save();
      return send(res, 200, { ok: true, ...r });
    }
    if (p === '/admin/api/create') {
      const plan = cfg.plans.find((x) => x.id === b.plan);
      if (!plan) return send(res, 400, { error: 'Unbekannter Tarif.' });
      const discordId = String(b.discordId || '').trim();
      if (discordId && !isSnowflake(discordId)) return send(res, 400, { error: 'Discord-ID muss 17–20 Ziffern haben (Entwicklermodus → Rechtsklick → ID kopieren).' });
      let found = null, lookupError = '';
      if (discordId) {
        const u = await lookupUser(discordId);
        if (u.error === 'not_found') return send(res, 400, { error: LOOKUP_ERR.not_found });
        if (u.error) lookupError = LOOKUP_ERR[u.error] || ''; else found = u;
      }
      let key; do key = genKey(); while (db.keys[key]);
      db.keys[key] = { key, plan: plan.id, planName: plan.name, days: plan.days || null, price: plan.price || 0, discordId: discordId || null, discordName: found ? found.name : String(b.discordName || '').slice(0, 60), discordAvatar: found ? found.avatar : '', discordRoles: found && found.roles ? found.roles : [], inGuild: found && found.roles ? found.inGuild : null, rolesAt: found && found.roles ? Date.now() : 0, note: String(b.note || '').slice(0, 200), createdAt: Date.now(), activatedAt: null, expiresAt: null, hwid: null, lastSeen: null, revoked: false, hwidResets: 0 };
      log('create', key, discordId ? `${plan.name} für ${found ? found.name + ' (' + discordId + ')' : 'Discord ' + discordId}` : `${plan.name} (Discord wird beim Login erkannt)`); save();
      return send(res, 200, { ok: true, key, user: found, lookupError });
    }
    const k = db.keys[normKey(b.key)];
    if (!k) return send(res, 404, { error: 'Key nicht gefunden.' });
    if (p === '/admin/api/revoke') { k.revoked = true; log('revoke', k.key, 'Gesperrt'); }
    else if (p === '/admin/api/unrevoke') { k.revoked = false; log('unrevoke', k.key, 'Entsperrt'); }
    else if (p === '/admin/api/reset-hwid') { k.hwid = null; k.hwidResets = (k.hwidResets || 0) + 1; if (k.activatedAt && k.days) { /* Restlaufzeit bleibt */ } log('reset', k.key, 'HWID zurückgesetzt'); }
    else if (p === '/admin/api/extend') {
      const d = Math.floor(+b.days);
      if (!(d >= 1 && d <= 3650)) return send(res, 400, { error: 'Tage zwischen 1 und 3650.' });
      if (!k.days) return send(res, 400, { error: 'Lifetime-Keys haben kein Ablaufdatum.' });
      if (k.activatedAt) k.expiresAt = Math.max(k.expiresAt, Date.now()) + d * DAY; else k.days += d;
      log('extend', k.key, `+${d} Tage`);
    }
    else if (p === '/admin/api/refresh-one') {
      if (!k.discordId) return send(res, 400, { error: 'Dieser Key hat noch keine Discord-ID.' });
      const u = await lookupUser(k.discordId, true);
      if (u.error) return send(res, 400, { error: LOOKUP_ERR[u.error] || u.error });
      applyUser(k, u);
    }
    else if (p === '/admin/api/note') { k.note = String(b.note || '').slice(0, 200); }
    else if (p === '/admin/api/delete') { delete db.keys[k.key]; log('delete', k.key, 'Gelöscht'); }
    else return send(res, 404, { error: 'not_found' });
    save();
    return send(res, 200, { ok: true });
  }

  // ---------- Discord OAuth (optional) ----------
  const discordUser = opts.discordUser || (async (code, redirect) => {
    const tr = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: cfg.discord.clientId, client_secret: cfg.discord.clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirect }), signal: AbortSignal.timeout(10000) });
    const tok = await tr.json();
    if (!tok.access_token) throw new Error('token');
    return (await fetch('https://discord.com/api/users/@me', { headers: { authorization: 'Bearer ' + tok.access_token }, signal: AbortSignal.timeout(10000) })).json();
  });
  async function discordAuth(req, res, u) {
    if (!cfg.oauth) return page(res, 404, msgPage('Nicht aktiv', 'Discord-Bestätigung ist auf diesem Server nicht eingerichtet.', false));
    const redirect = `${cfg.publicUrl}/auth/discord/callback`;
    if (u.pathname === '/auth/discord') {
      const id = u.searchParams.get('ticket');
      if (!tickets.has(id)) return page(res, 400, msgPage('Link abgelaufen', 'Starte die Aktivierung in der App noch einmal.', false));
      const q = new URLSearchParams({ client_id: cfg.discord.clientId, response_type: 'code', redirect_uri: redirect, scope: 'identify', state: id });
      res.writeHead(302, { location: 'https://discord.com/oauth2/authorize?' + q, ...SEC }); return res.end();
    }
    const t = tickets.get(u.searchParams.get('state')), code = u.searchParams.get('code');
    if (!t || !code) return page(res, 400, msgPage('Link abgelaufen', 'Starte die Aktivierung in der App noch einmal.', false));
    try {
      const me = await discordUser(code, redirect);
      if (!isSnowflake(me.id)) throw new Error('user');
      t.verifiedId = me.id; t.verifiedName = String(me.global_name || me.username || '').slice(0, 60); t.verifiedAvatar = avatarUrl(me.id, me.avatar);
      const k = db.keys[t.key];
      if (k && k.discordId && k.discordId !== me.id) return page(res, 200, msgPage('Falscher Discord-Account', `Du bist als „${me.username}“ angemeldet. Dieser Key gehört zu einer anderen Discord-ID.`, false));
      return page(res, 200, msgPage('Bestätigt', 'Du kannst dieses Fenster schließen und zur App zurückkehren.', true));
    } catch { return page(res, 502, msgPage('Discord-Fehler', 'Die Bestätigung ist fehlgeschlagen. Bitte versuche es erneut.', false)); }
  }

  // ---------- HTTP ----------
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'), p = u.pathname, ip = ipOf(req);
    try {
      if (p === '/admin' || p === '/admin/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', ...SEC, 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src data: https://cdn.discordapp.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
        return res.end(fs.readFileSync(path.join(__dirname, 'admin', 'index.html')));
      }
      if (p.startsWith('/admin/api/')) return await admin(req, res, p);
      if (p === '/api/validate' && req.method === 'POST') {
        if (limited('val', ip, 60, 60e3)) return send(res, 429, { ok: false, error: 'rate_limited' });
        return send(res, 200, validate(await readJson(req)));
      }
      if (p === '/api/boost-key' || p === '/api/boost-key/report') return await boostApi(req, res, p);
      if (p === '/api/pubkey') return send(res, 200, { publicKey: pubPem });
      if (p === '/auth/discord' || p === '/auth/discord/callback') return await discordAuth(req, res, u);
      if (p === '/') { res.writeHead(302, { location: '/admin' }); return res.end(); }
      send(res, 404, { error: 'not_found' });
    } catch (e) { send(res, e.message === 'too_large' ? 413 : 400, { ok: false, error: e.message === 'too_large' ? 'too_large' : 'bad_request' }); }
  });
  return { server, db: () => db, save, pubPem, validate, statusOf };
}

module.exports = { createApp, loadConfig, normKey, genKey, statusOf };

if (require.main === module) {
  const cfg = loadConfig(process.env.LICENSE_CONFIG || path.join(__dirname, 'config.json'));
  const dataDir = process.env.LICENSE_DATA || path.join(__dirname, 'data');
  const app = createApp(cfg, dataDir);
  if (process.argv.includes('--client-config')) {
    console.log(JSON.stringify({ serverUrl: cfg.publicUrl || 'https://DEINE-DOMAIN', publicKey: app.pubPem, graceHours: 72 }, null, 2));
    process.exit(0);
  }
  if (!cfg.oauth) {
    console.error('Discord-Anmeldung ist Pflicht: trage publicUrl sowie discord.clientId und discord.clientSecret in config.json ein (Anleitung: README).'); process.exit(1);
  }
  if (cfg.adminPassword.length < 12 || /^(change|passwort|password)/i.test(cfg.adminPassword)) {
    console.error('Setze in config.json ein langes Admin-Passwort (mind. 12 Zeichen).'); process.exit(1);
  }
  if (!cfg.lookup) console.warn('Hinweis: discord.botToken fehlt – Discord-Namen werden erst beim ersten Login erkannt, nicht schon beim Erstellen des Keys.');
  if (!cfg.boost.secret) console.warn('Hinweis: boost.secret fehlt – die Boost-Belohnung (3-Tage-Key per DM) ist aus.');
  if (cfg.lookup && !cfg.roles) console.warn('Hinweis: discord.guildId fehlt – Discord-Rollen werden nicht angezeigt.');
  app.server.listen(cfg.port, cfg.host, () => {
    console.log(`Lizenz-Server läuft: http://localhost:${cfg.port}/admin`);
    if (!cfg.publicUrl.startsWith('https')) console.warn('Warnung: publicUrl ist nicht https – für den Betrieb hinter HTTPS-Proxy betreiben.');
  });
}
