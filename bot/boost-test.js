// Test der Boost-Belohnung mit simuliertem Discord-Client und Lizenz-Server: node boost-test.js
const assert = require('assert');
const { EventEmitter } = require('events');
const { attach } = require('./boost');

(async () => {
  const calls = [], sent = [], logs = [];
  let reply = { ok: true, created: true, key: 'ATK-AAAA-BBBB-CCCC-DDDD', days: 3 };
  const fakeFetch = async (url, o) => { calls.push({ url, auth: o.headers.authorization, body: JSON.parse(o.body) }); return { ok: true, status: 200, json: async () => (url.endsWith('/report') ? { ok: true } : reply) }; };
  const log = { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push('ERR ' + a.join(' ')) };
  const client = new EventEmitter(); let fetched = 0;
  client.guilds = { cache: new Map([['G1', { id: 'G1', members: { fetch: async () => { fetched++; } } }], ['G2', { id: 'G2', members: { fetch: async () => { fetched += 100; } } }]]) };
  assert.strictEqual(attach(client, { licenseUrl: '', secret: '' }, { log }), false);
  assert.strictEqual(attach(client, { licenseUrl: 'http://lic/', secret: 's3cret', guildId: 'G1' }, { fetch: fakeFetch, log, sleep: async () => {} }), true);
  const member = (id, boosting, opts = {}) => ({ id, partial: !!opts.partial, premiumSince: boosting ? new Date() : null, displayName: 'Mika', guild: { id: opts.guild || 'G1', name: 'Attack' }, user: { username: 'mika', send: async (t) => { if (opts.dmOff) throw new Error('Cannot send'); sent.push(t); } } });
  const emit = async (a, b) => { client.emit('guildMemberUpdate', a, b); await new Promise((r) => setTimeout(r, 20)); };

  client.emit('ready'); await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(fetched, 1); console.log('✓ Beim Start werden nur Mitglieder des eigenen Servers geladen');

  await emit(member('1', false), member('1', true));
  assert.strictEqual(calls[0].url, 'http://lic/api/boost-key'); assert.strictEqual(calls[0].auth, 'Bearer s3cret'); assert.strictEqual(calls[0].body.discordId, '1');
  assert.ok(sent[0].includes('ATK-AAAA-BBBB-CCCC-DDDD') && sent[0].includes('3-Tage-Key') && sent[0].includes('Attack')); console.log('✓ Neuer Boost → Key per DM');
  assert.strictEqual(calls[1].url, 'http://lic/api/boost-key/report'); assert.strictEqual(calls[1].body.delivered, true); console.log('✓ Zustellung wird dem Lizenz-Server gemeldet');

  const n = calls.length;
  await emit(member('1', false), member('1', true)); assert.strictEqual(calls.length, n); console.log('✓ Dieselbe Person wird nicht doppelt angefragt');
  await emit(member('2', true), member('2', true)); assert.strictEqual(calls.length, n); console.log('✓ Wer schon boostet (z. B. Rollenwechsel), löst nichts aus');
  await emit(member('3', false, { partial: true }), member('3', true)); assert.strictEqual(calls.length, n); console.log('✓ Unbekannter Vorher-Zustand wird übersprungen (keine Keys für Alt-Booster)');
  await emit(member('4', false, { guild: 'G2' }), member('4', true, { guild: 'G2' })); assert.strictEqual(calls.length, n); console.log('✓ Andere Server werden ignoriert');
  await emit(member('5', true), member('5', false)); assert.strictEqual(calls.length, n); console.log('✓ Boost beenden löst nichts aus');

  reply = { ok: true, created: false }; const s0 = sent.length;
  await emit(member('6', false), member('6', true)); assert.strictEqual(sent.length, s0); console.log('✓ Schon belohnt → keine DM');

  reply = { ok: true, created: true, key: 'ATK-EEEE-FFFF-GGGG-HHHH', days: 3 };
  await emit(member('7', false), member('7', true, { dmOff: true }));
  const rep = calls[calls.length - 1]; assert.strictEqual(rep.url.endsWith('/report'), true); assert.strictEqual(rep.body.delivered, false);
  assert.ok(logs.some((l) => l.includes('DM nicht möglich'))); console.log('✓ DMs aus → Key bleibt im Admin-Panel, Fehlschlag wird vermerkt');
  console.log('\nBoost-Tests bestanden.'); process.exit(0);
})().catch((e) => { console.error('FEHLER:', e); process.exit(1); });
