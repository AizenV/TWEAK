// Testet license.js (App-Seite) gegen den echten Server. Aufruf aus dem Projekt-Root: node license-server/client-integration-test.js
const assert = require('assert'); const fs = require('fs'); const os = require('os'); const path = require('path'); const Module = require('module');
const { createApp, loadConfig } = require('./server');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lic2-')), cfg = loadConfig('/x'); cfg.adminPassword = 'test-passwort-12345'; cfg.oauth = true; cfg.discord = { clientId: 'x', clientSecret: 'y' };
  const srv = createApp(cfg, dir, { discordUser: async (code) => ({ id: code, username: 't' }) }); await new Promise((r) => srv.server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.server.address().port; cfg.publicUrl = url;
  let asDiscord = '111111111111111111'; // Account, mit dem sich der „Browser“ anmeldet
  const clientDir = path.join(__dirname, '..', 'tweak-tool');
  const cfgPath = path.join(clientDir, 'license-config.json'), orig = fs.readFileSync(cfgPath, 'utf8');
  fs.writeFileSync(cfgPath, JSON.stringify({ ...JSON.parse(orig), serverUrl: url, publicKey: srv.pubPem }));
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'ud-')); const o = Module._load;
  Module._load = function (r, ...a) { return r === 'electron' ? { app: { getPath: () => ud }, shell: { openExternal: async (u) => { const t = new URL(u).searchParams.get('ticket'); fetch(`${url}/auth/discord/callback?code=${asDiscord}&state=${t}`); } } } : o.call(this, r, ...a); };
  try {
    const L = require(path.join(clientDir, 'license.js'));
    await L.init(); assert.strictEqual(L.valid(), false);
    srv.db().keys.X = null; delete srv.db().keys.X;
    // Key direkt über die Server-Logik anlegen
    const key = 'ATK-ABCD-EFGH-JKLM-NPQR';
    srv.db().keys[key] = { key, plan: 'month', planName: '1 Monat', days: 30, price: 15, discordId: '111111111111111111', createdAt: Date.now(), activatedAt: null, expiresAt: null, hwid: null, revoked: false };
    asDiscord = '222222222222222222'; let r = await L.activate(key); assert.strictEqual(r.error, 'discord_mismatch'); console.log('✓ Login mit falschem Discord-Account in der App abgelehnt');
    asDiscord = '111111111111111111'; r = await L.activate(key); assert.strictEqual(r.ok, true); assert.strictEqual(L.valid(), true); console.log('✓ Aktivierung, Plan:', r.plan);
    assert.strictEqual(srv.db().keys[key].hwid, L.status().hwid); console.log('✓ HWID am Server = HWID in der App');
    srv.db().keys[key].revoked = true; await L.refresh(); assert.strictEqual(L.valid(), false); assert.strictEqual(L.status().reason, 'revoked'); console.log('✓ Sperre wird beim nächsten Check übernommen');
    srv.db().keys[key].revoked = false; r = await L.activate(key); assert.strictEqual(r.ok, true);
    srv.server.close(); await L.refresh(); assert.strictEqual(L.valid(), true); console.log('✓ Server offline → Offline-Toleranz greift');
    const st = JSON.parse(fs.readFileSync(path.join(ud, 'license.json'), 'utf8')); st.resp.payload = st.resp.payload.replace('1 Monat', 'Lifetime'); fs.writeFileSync(path.join(ud, 'license.json'), JSON.stringify(st));
    delete require.cache[require.resolve(path.join(clientDir, 'license.js'))];
    const L2 = require(path.join(clientDir, 'license.js')); await L2.init(); assert.strictEqual(L2.valid(), false); console.log('✓ Manipulierte license.json wird erkannt');
    console.log('\nClient-Integration OK');
  } finally { fs.writeFileSync(cfgPath, orig); Module._load = o; }
  process.exit(0);
})().catch((e) => { console.error('FEHLER:', e); process.exit(1); });
