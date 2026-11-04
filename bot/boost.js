// Server-Boost-Belohnung: Wer den Server boostet, bekommt einen Key per DM.
// Der Key wird vom Lizenz-Server erzeugt (Standard: 3 Tage) und ist an die Discord-ID des Boosters gebunden.
'use strict';

const DEFAULT_MESSAGE = [
  'Danke fürs Boosten von **{server}**! 💜',
  'Hier ist dein **{days}-Tage-Key** für Attack.tweaks:',
  '',
  '`{key}`',
  '',
  'So löst du ihn ein: Attack.tweaks öffnen → Key eingeben → „Mit Discord anmelden“.',
  'Die {days} Tage laufen erst ab der Aktivierung. Der Key funktioniert nur mit deinem Discord-Account.',
].join('\n');

function attach(client, cfg, deps = {}) {
  const f = deps.fetch || globalThis.fetch, log = deps.log || console, sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const base = String(cfg.licenseUrl || '').replace(/\/$/, '');
  if (!base || !cfg.secret) { log.warn('Boost-Belohnung aus: boost.licenseUrl oder boost.secret fehlt in der Bot-config.json.'); return false; }
  const seen = new Set(); // pro Start nur einmal je Person anfragen

  async function call(path, body) {
    let err;
    for (let i = 0; i < 3; i++) {
      try {
        const r = await f(base + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cfg.secret }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
        if (r.ok) return await r.json();
        if (r.status < 500) throw new Error(`${path}: HTTP ${r.status}`); // falsches Secret o. ä. – Wiederholen bringt nichts
        err = new Error(`${path}: HTTP ${r.status}`);
      } catch (e) { if (/HTTP 4/.test(e.message)) throw e; err = e; }
      await sleep(2000 * (i + 1));
    }
    throw err;
  }

  // Beim Start alle Mitglieder laden, damit der „vorher“-Zustand bekannt ist und nur ein neuer Boost zählt.
  client.once('ready', async () => {
    if (cfg.prefetchMembers === false) return;
    for (const g of client.guilds.cache.values()) {
      if (cfg.guildId && g.id !== cfg.guildId) continue;
      try { await g.members.fetch(); } catch (e) { log.warn('Mitglieder konnten nicht geladen werden (Server Members Intent aktiv?):', e.message); }
    }
    log.log('Boost-Belohnung aktiv.');
  });

  client.on('guildMemberUpdate', async (oldM, newM) => {
    if (cfg.guildId && newM.guild.id !== cfg.guildId) return;
    if (oldM.partial || oldM.premiumSince || !newM.premiumSince) return; // nur der Moment, in dem jemand zu boosten beginnt
    if (seen.has(newM.id)) return;
    seen.add(newM.id);
    const name = newM.displayName || newM.user.globalName || newM.user.username || '';
    try {
      const r = await call('/api/boost-key', { discordId: newM.id, discordName: name });
      if (!r.created) { log.log(`Boost von ${name}: hat schon einen Boost-Key bekommen.`); return; }
      const text = String(cfg.message || DEFAULT_MESSAGE).split('{name}').join(name).split('{server}').join(newM.guild.name || 'unserem Server').split('{days}').join(String(r.days)).split('{key}').join(r.key);
      let delivered = true;
      try { await newM.user.send(text); } catch { delivered = false; }
      log.log(`Boost von ${name}: Key ${r.key} ${delivered ? 'per DM gesendet' : 'erstellt, aber DM nicht möglich (DMs aus) – Key im Admin-Panel manuell senden'}.`);
      await call('/api/boost-key/report', { discordId: newM.id, delivered }).catch(() => {});
    } catch (e) { seen.delete(newM.id); log.error('Boost-Belohnung fehlgeschlagen:', e.message); }
  });
  return true;
}

module.exports = { attach, DEFAULT_MESSAGE };
