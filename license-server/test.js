// Ende-zu-Ende-Test: node test.js
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp, loadConfig } = require('./server');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-'));
  const cfg = loadConfig('/nonexistent');
  cfg.adminPassword = 'test-passwort-12345'; cfg.boost = { secret: 'boost-secret-0123456789abcdef', days: 3 }; cfg.oauth = true; cfg.publicUrl = 'http://localhost'; cfg.discord = { clientId: 'x', clientSecret: 'y' };
  // Discord wird simuliert: der „code“ ist hier direkt die Discord-ID des angemeldeten Accounts
  // Discord-Namenssuche per ID wird ebenfalls simuliert (statt echtem Bot-Token)
  const LOOK = { '777777777777777777': { id: '777777777777777777', username: 'luna', global_name: 'Luna', avatar: 'abc' }, '100000000000000001': { error: 'not_found' } };
  const MEM = { '777777777777777777': { roles: ['r2', 'r1'] } };
  const app = createApp(cfg, dir, { discordUser: async (code) => ({ id: code, username: 'tester' }), discordLookup: async (id) => LOOK[id] || { id, username: 'tester', avatar: null },
    discordMember: async (id) => MEM[id] || { error: 'not_found' },
    discordRoles: async () => [{ id: 'r1', name: 'VIP', color: 0xff0000, position: 5 }, { id: 'r2', name: 'Kunde', color: 0, position: 2 }] });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  let cookie = '';
  const call = async (p, body, admin) => {
    const r = await fetch(base + p, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(admin ? { 'x-admin': '1', cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc && sc.startsWith('adm=')) cookie = sc.split(';')[0];
    return { status: r.status, body: await r.json() };
  };
  const hw = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);
  const nonce = () => crypto.randomBytes(12).toString('hex');
  const DISCORD = '123456789012345678';
  const ok = (name) => console.log('✓', name);

  // Admin: ohne Login gesperrt, falsches Passwort, richtiges Passwort
  assert.strictEqual((await call('/admin/api/list', undefined, true)).status, 401); ok('Admin ohne Login gesperrt');
  assert.strictEqual((await call('/admin/api/login', { password: 'falsch' }, true)).status, 401); ok('Falsches Passwort abgelehnt');
  assert.strictEqual((await call('/admin/api/login', { password: cfg.adminPassword }, true)).status, 200); ok('Login');
  assert.strictEqual((await call('/admin/api/create', { plan: 'month', discordId: 'abc' }, true)).status, 400); ok('Ungültige Discord-ID abgelehnt');

  const { body: made } = await call('/admin/api/create', { plan: 'month', discordId: DISCORD, discordName: 'tester', note: 'Test' }, true);
  assert.match(made.key, /^ATK-[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/); ok('Key erstellt: ' + made.key);

  // Aktivierung = Discord-Login: Ticket holen, „im Browser“ als <discord> anmelden, Ticket einlösen
  const login = async (hwid, discord, key = made.key) => {
    const n = nonce(), r1 = (await call('/api/validate', { key, hwid, nonce: n, login: true })).body;
    if (r1.error !== 'discord_required') return r1;
    assert.ok((await call('/api/validate', { key, hwid, nonce: n, login: true, ticket: r1.ticket })).body.error === 'discord_pending');
    await fetch(`${base}/auth/discord/callback?code=${discord}&state=${r1.ticket}`);
    return { ...(await call('/api/validate', { key, hwid, nonce: n, login: true, ticket: r1.ticket })).body, nonce: n };
  };
  const v = (extra) => call('/api/validate', { key: made.key, hwid: hw('pc-1'), nonce: nonce(), ...extra });
  assert.strictEqual((await call('/api/validate', { key: 'ATK-AAAA-AAAA-AAAA-AAAA', hwid: hw('x'), nonce: nonce(), login: true })).body.error, 'invalid_key'); ok('Unbekannter Key blockiert');
  assert.strictEqual((await login(hw('pc-1'), '999999999999999999')).error, 'discord_mismatch'); ok('Falscher Discord-Account blockiert');
  assert.strictEqual((await call('/admin/api/list', undefined, true)).body.keys[0].hwid, null); ok('Nach Fehlversuch nichts gebunden');

  const act = await login(hw('pc-1'), DISCORD), n1 = act.nonce;
  assert.strictEqual(act.ok, true); ok('Aktivierung nur mit Discord-Login des richtigen Accounts');
  const pub = crypto.createPublicKey((await call('/api/pubkey')).body.publicKey);
  assert.ok(crypto.verify(null, Buffer.from(act.payload), pub, Buffer.from(act.sig, 'base64'))); ok('Signatur gültig');
  assert.ok(!crypto.verify(null, Buffer.from(act.payload.replace('month', 'lifetime')), pub, Buffer.from(act.sig, 'base64'))); ok('Manipulierte Antwort fällt auf');
  const p = JSON.parse(act.payload);
  assert.strictEqual(p.hwid, hw('pc-1')); assert.strictEqual(p.nonce, n1); assert.strictEqual(p.discordId, DISCORD);
  assert.ok(Math.abs(p.expiresAt - (Date.now() + 30 * 864e5)) < 5000); ok('Laufzeit 30 Tage ab Aktivierung');

  assert.strictEqual((await v({ hwid: hw('pc-2') })).body.error, 'hwid_mismatch'); ok('Anderer PC blockiert (HWID gebunden)');
  assert.strictEqual((await v()).body.ok, true); ok('Hintergrundprüfung auf gebundenem PC ohne neue Anmeldung');
  assert.strictEqual((await login(hw('pc-1'), '999999999999999999')).error, 'discord_mismatch'); ok('Neu-Aktivierung verlangt wieder Discord-Login');

  let list = (await call('/admin/api/list', undefined, true)).body;
  assert.strictEqual(list.keys[0].status, 'active'); assert.strictEqual(list.keys[0].hwid, hw('pc-1')); assert.strictEqual(list.keys[0].discordId, DISCORD); ok('Admin sieht Besitzer, HWID, Status');

  await call('/admin/api/reset-hwid', { key: made.key }, true);
  assert.strictEqual((await login(hw('pc-2'), DISCORD)).ok, true); ok('Nach HWID-Reset auf neuem PC mit Discord-Login aktivierbar');

  await call('/admin/api/revoke', { key: made.key }, true);
  assert.strictEqual((await v({ hwid: hw('pc-2') })).body.error, 'revoked'); ok('Gesperrter Key blockiert');
  await call('/admin/api/unrevoke', { key: made.key }, true);
  assert.strictEqual((await v({ hwid: hw('pc-2') })).body.ok, true); ok('Entsperren funktioniert');

  app.db().keys[made.key].expiresAt = Date.now() - 1000;
  assert.strictEqual((await v({ hwid: hw('pc-2') })).body.error, 'expired'); ok('Abgelaufener Key blockiert');
  assert.strictEqual((await call('/admin/api/extend', { key: made.key, days: 7 }, true)).status, 200);
  assert.strictEqual((await v({ hwid: hw('pc-2') })).body.ok, true); ok('Verlängerung reaktiviert Key');

  // Key ohne Discord-ID: erster Login erkennt und bindet die ID automatisch
  const auto = (await call('/admin/api/create', { plan: 'week' }, true)).body.key;
  assert.ok(auto); const AUTO = '555555555555555555';
  const ar = await login(hw('pc-9'), AUTO, auto); assert.strictEqual(ar.ok, true);
  assert.strictEqual(JSON.parse(ar.payload).discordId, AUTO);
  const row = (await call('/admin/api/list', undefined, true)).body.keys.find((k) => k.key === auto);
  assert.strictEqual(row.discordId, AUTO); assert.strictEqual(row.discordName, 'tester'); ok('Discord-ID und -Name werden beim ersten Login automatisch erkannt');
  await call('/admin/api/reset-hwid', { key: auto }, true);
  assert.strictEqual((await login(hw('pc-10'), '666666666666666666', auto)).error, 'discord_mismatch'); ok('Danach ist der Key an diesen Account gebunden');

  const life = (await call('/admin/api/create', { plan: 'lifetime', discordId: DISCORD }, true)).body.key;
  const la = await login(hw('pc-3'), DISCORD, life);
  assert.strictEqual(JSON.parse(la.payload).expiresAt, null); ok('Lifetime ohne Ablauf');

  await call('/admin/api/delete', { key: life }, true);
  assert.strictEqual((await call('/api/validate', { key: life, hwid: hw('pc-3'), nonce: nonce() })).body.error, 'invalid_key'); ok('Gelöschter Key ungültig');

  // Discord-Name automatisch über die ID
  const lk = (await call('/admin/api/lookup', { id: '777777777777777777' }, true)).body;
  assert.strictEqual(lk.user.name, 'Luna'); assert.ok(lk.user.avatar.includes('/avatars/777777777777777777/abc.png')); ok('Name + Profilbild per Discord-ID gefunden');
  assert.strictEqual((await call('/admin/api/lookup', { id: '12' }, true)).body.code, 'bad_id'); ok('Ungültige ID in der Vorschau abgelehnt');
  assert.strictEqual((await call('/admin/api/create', { plan: 'week', discordId: '100000000000000001' }, true)).status, 400); ok('Nicht existierende Discord-ID verhindert den Key');
  const nk = (await call('/admin/api/create', { plan: 'week', discordId: '777777777777777777' }, true)).body;
  const find = async () => (await call('/admin/api/list', undefined, true)).body.keys.find((k) => k.key === nk.key);
  let r2 = await find();
  assert.strictEqual(nk.user.name, 'Luna'); assert.strictEqual(r2.discordName, 'Luna'); assert.ok(r2.discordAvatar.startsWith('https://cdn.discordapp.com/')); ok('Key bekommt den Namen automatisch aus der ID');
  app.db().keys[nk.key].discordName = ''; app.db().keys[nk.key].discordAvatar = '';
  await find(); await new Promise((r) => setTimeout(r, 300)); r2 = await find();
  assert.strictEqual(r2.discordName, 'Luna'); ok('Fehlende Namen werden im Hintergrund nachgetragen');
  app.db().keys[nk.key].discordName = 'alt';
  const rr = (await call('/admin/api/refresh-names', {}, true)).body;
  assert.ok(rr.ok && rr.updated >= 1); assert.strictEqual((await find()).discordName, 'Luna'); ok('„Namen aktualisieren“ lädt alle neu von Discord');

  // Discord-Rollen
  const lr = (await call('/admin/api/lookup', { id: '777777777777777777' }, true)).body.user;
  assert.deepStrictEqual(lr.roles.map((r) => r.name), ['VIP', 'Kunde']); assert.strictEqual(lr.roles[0].color, '#ff0000'); assert.strictEqual(lr.roles[1].color, ''); assert.strictEqual(lr.inGuild, true); ok('Rollen per ID, nach Rang sortiert, mit Farbe');
  assert.deepStrictEqual((await find()).discordRoles.map((r) => r.name), ['VIP', 'Kunde']); ok('Key speichert die Rollen');
  assert.strictEqual((await call('/admin/api/list', undefined, true)).body.roles, true);
  const out = (await call('/admin/api/create', { plan: 'week', discordId: '888888888888888888' }, true)).body;
  const outRow = (await call('/admin/api/list', undefined, true)).body.keys.find((k) => k.key === out.key);
  assert.strictEqual(outRow.inGuild, false); assert.deepStrictEqual(outRow.discordRoles, []); ok('Nicht auf dem Server wird erkannt');
  app.db().keys[nk.key].discordRoles = []; MEM['777777777777777777'] = { roles: ['r1'] };
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual((await call('/admin/api/refresh-one', { key: nk.key }, true)).status, 200);
  assert.deepStrictEqual((await find()).discordRoles.map((r) => r.name), ['VIP']); ok('Einzelner Key lässt sich neu von Discord laden');

  // Server-Boost → 3-Tage-Key (vom Bot aufgerufen)
  const BOOSTER = '321321321321321321', bc = (pth, body, tok = cfg.boost.secret) => fetch(base + pth, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert.strictEqual((await bc('/api/boost-key', { discordId: BOOSTER }, 'falsch')).status, 401); ok('Boost-API ohne richtiges Secret gesperrt');
  assert.strictEqual((await bc('/api/boost-key', { discordId: 'abc' })).status, 400); ok('Boost-API prüft die Discord-ID');
  const nBefore = Object.keys(app.db().keys).length;
  const [b1, b1x] = await Promise.all([bc('/api/boost-key', { discordId: BOOSTER }), bc('/api/boost-key', { discordId: BOOSTER })]);
  const made1 = [b1.body, b1x.body].filter((x) => x.created);
  assert.strictEqual(made1.length, 1); assert.strictEqual(Object.keys(app.db().keys).length, nBefore + 1); ok('Boost: genau ein Key, auch bei doppeltem Aufruf');
  const bk = made1[0]; assert.match(bk.key, /^ATK-/); assert.strictEqual(bk.days, 3);
  assert.strictEqual((await bc('/api/boost-key', { discordId: BOOSTER })).body.created, false); ok('Zweiter Boost derselben Person gibt keinen weiteren Key');
  const brow = (await call('/admin/api/list', undefined, true)).body.keys.find((k) => k.key === bk.key);
  assert.strictEqual(brow.plan, 'boost'); assert.strictEqual(brow.discordId, BOOSTER); assert.strictEqual(brow.price, 0); assert.strictEqual(brow.discordName, 'tester'); assert.strictEqual(brow.status, 'unused'); ok('Boost-Key im Admin: an die Discord-ID gebunden, Name erkannt');
  await bc('/api/boost-key/report', { discordId: BOOSTER, delivered: false });
  assert.ok((await call('/admin/api/list', undefined, true)).body.keys.find((k) => k.key === bk.key).note.includes('DM fehlgeschlagen')); ok('Fehlgeschlagene DM wird am Key vermerkt');
  assert.strictEqual((await login(hw('pc-boost'), '999999999999999999', bk.key)).error, 'discord_mismatch'); ok('Boost-Key nur mit dem Account des Boosters');
  const ba = await login(hw('pc-boost'), BOOSTER, bk.key);
  assert.strictEqual(ba.ok, true); assert.ok(Math.abs(JSON.parse(ba.payload).expiresAt - (Date.now() + 3 * 864e5)) < 5000); ok('Boost-Key läuft 3 Tage ab Aktivierung');

  assert.strictEqual((await fetch(base + '/admin/api/list', { headers: { cookie } })).status, 400); ok('Admin-API verlangt Header (CSRF-Schutz)');
  assert.ok((await (await fetch(base + '/admin')).text()).includes('Lizenz-Admin')); ok('Admin-Seite wird ausgeliefert');

  app.server.close(); fs.rmSync(dir, { recursive: true, force: true });
  console.log('\nAlle Tests bestanden.');
  process.exit(0);
})().catch((e) => { console.error('FEHLER:', e); process.exit(1); });
