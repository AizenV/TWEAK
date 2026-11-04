// Attack.tweaks Presets-Bot
// Liest festgelegte Discord-Kanäle, ordnet jeden Kanal einer Kategorie zu und stellt das
// Ergebnis als JSON bereit (HTTP + Datei presets.json). Die App holt sich diese JSON.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { parseMessage } = require('./parse');
const { attach: attachBoost } = require('./boost');

const CFG_PATH = process.env.BOT_CONFIG || path.join(__dirname, 'config.json');
if (!fs.existsSync(CFG_PATH)) { console.error('config.json fehlt – kopiere config.example.json nach config.json und trage Token + Kanal-IDs ein.'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
const OUT = path.join(__dirname, 'presets.json');

const byChannel = new Map();   // channelId -> Preset[]
let feed = { updated: null, categories: cfg.categories, items: [] };
try { const old = JSON.parse(fs.readFileSync(OUT, 'utf8')); if (old && Array.isArray(old.items)) feed = { ...feed, ...old, categories: cfg.categories }; } catch {}

function rebuild() {
  const items = [...byChannel.values()].flat().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  feed = { updated: new Date().toISOString(), categories: cfg.categories, items };
  try { fs.writeFileSync(OUT, JSON.stringify(feed, null, 1)); } catch (e) { console.error('Schreiben fehlgeschlagen:', e.message); }
}

const toLite = (m) => ({
  id: m.id, content: m.content, url: m.url, createdAt: m.createdTimestamp,
  author: m.member?.displayName || m.author?.globalName || m.author?.username || '',
  attachments: [...m.attachments.values()].map((a) => ({ name: a.name, url: a.url, size: a.size, contentType: a.contentType })),
  embeds: m.embeds.map((e) => ({ title: e.title, url: e.url, image: e.image && { url: e.image.url }, thumbnail: e.thumbnail && { url: e.thumbnail.url } })),
});

async function scanChannel(client, ch) {
  const channel = await client.channels.fetch(ch.id).catch(() => null);
  if (!channel || !channel.messages) { console.warn(`Kanal ${ch.id} nicht lesbar (ID falsch oder Bot ohne Rechte).`); return; }
  const out = []; let before;
  while (out.length < (cfg.scanLimit || 300)) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    for (const m of batch.values()) {
      if (m.author?.bot && !cfg.includeBots) continue;
      const p = parseMessage(toLite(m), ch.category, channel.name);
      if (p) out.push(p);
    }
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  byChannel.set(ch.id, out);
  console.log(`#${channel.name} → ${ch.category}: ${out.length} Presets`);
}

async function scanAll(client) {
  for (const ch of cfg.channels) { try { await scanChannel(client, ch); } catch (e) { console.error(`Fehler bei ${ch.id}:`, e.message); } }
  rebuild();
}

// ---------- HTTP ----------
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (cfg.apiKey && u.searchParams.get('key') !== cfg.apiKey) { res.writeHead(401); return res.end('unauthorized'); }
  if (u.pathname === '/presets.json') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(feed));
  }
  res.writeHead(404); res.end();
}).listen(cfg.port || 8787, () => console.log(`API: http://localhost:${cfg.port || 8787}/presets.json`));

// ---------- Discord ----------
const boostOn = !!(cfg.boost && cfg.boost.enabled); // Server-Boost → Key per DM (braucht den Server Members Intent)
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, ...(boostOn ? [GatewayIntentBits.GuildMembers] : [])],
  partials: [Partials.Message, Partials.Channel, ...(boostOn ? [Partials.GuildMember] : [])],
});
if (boostOn) attachBoost(client, cfg.boost);
const watched = new Map(cfg.channels.map((c) => [c.id, c]));
const timers = new Map();
const later = (id) => { clearTimeout(timers.get(id)); timers.set(id, setTimeout(() => scanChannel(client, watched.get(id)).then(rebuild).catch(() => {}), 3000)); };

client.once('ready', async () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
  await scanAll(client);
  setInterval(() => scanAll(client), Math.max(1, cfg.intervalMin || 10) * 60 * 1000); // frische CDN-Links (laufen nach ~24h ab)
});
for (const ev of ['messageCreate', 'messageUpdate', 'messageDelete']) client.on(ev, (m, n) => { const x = n || m; if (x.channelId && watched.has(x.channelId)) later(x.channelId); });
client.login(cfg.token);
