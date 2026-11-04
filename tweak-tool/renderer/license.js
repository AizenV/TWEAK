// Lizenz-Oberfläche: Aktivierungsfenster, Status in der Seitenleiste, automatische Prüfung
(function () {
  if (typeof api === 'undefined' || typeof api.licStatus !== 'function') return; // Browser-Vorschau ohne Electron
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); };
  const ERR = {
    invalid_key: 'Diesen Key gibt es nicht. Prüfe die Schreibweise.',
    revoked: 'Dieser Key wurde gesperrt.',
    expired: 'Dieser Key ist abgelaufen.',
    hwid_mismatch: 'Dieser Key ist an einen anderen PC gebunden. Bitte melde dich beim Support, um die Hardware-ID zurücksetzen zu lassen.',
    discord_mismatch: 'Du bist mit dem falschen Discord-Account angemeldet. Dieser Key gehört zu einem anderen Account.',
    network: 'Der Lizenzserver ist nicht erreichbar. Prüfe deine Internetverbindung.',
    unconfigured: 'Lizenzserver fehlt: trage serverUrl und publicKey in license-config.json ein und baue die App neu.',
    bad_signature: 'Die Antwort des Servers konnte nicht verifiziert werden.',
    cancelled: 'Aktivierung abgebrochen.',
    timeout: 'Die Discord-Bestätigung wurde nicht rechtzeitig abgeschlossen. Starte die Aktivierung erneut.',
    ticket_invalid: 'Die Bestätigung ist abgelaufen. Starte die Aktivierung erneut.',
    rate_limited: 'Zu viele Versuche. Bitte warte kurz.',
    bad_request: 'Bitte den Key eingeben.',
    server_not_configured: 'Der Lizenzserver ist noch nicht für die Discord-Anmeldung eingerichtet.',
    offline: 'Lizenz konnte nicht online geprüft werden. Verbinde dich mit dem Internet.',
  };
  const fdate = (t) => new Date(t).toLocaleDateString('de-DE') + ' ' + new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  let S = null, el = null, busy = false, lastOk = null;

  function badge() {
    const b = $('#licb'); if (!b || !S) return;
    if (S.licensed) {
      const d = S.expiresAt ? Math.ceil((S.expiresAt - Date.now()) / 864e5) : null;
      b.textContent = d === null ? 'Lizenz: Lifetime' : `Lizenz: noch ${d} ${d === 1 ? 'Tag' : 'Tage'}`; b.className = 'licb ok';
    } else { b.textContent = 'Lizenz aktivieren'; b.className = 'licb no'; }
  }

  function close() { if (el) { el.remove(); el = null; } }
  function open(msg) {
    if (el) close();
    el = document.createElement('div'); el.className = 'licw'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.onclick = (e) => { if (e.target === el && !busy) close(); };
    const c = document.createElement('div'); c.className = 'licc'; el.append(c); document.body.append(el);
    S.licensed ? viewLicensed(c) : viewForm(c, msg);
    const f = c.querySelector('input'); if (f) f.focus();
  }

  function viewLicensed(c) {
    c.innerHTML = `<h2>Lizenz aktiv</h2><p class="lsub">Alle Tweaks sind freigeschaltet.</p>
      <div class="lkv"><span>Tarif</span><b>${esc(S.plan)}</b><span>Läuft ab</span><b>${S.expiresAt ? esc(fdate(S.expiresAt)) : 'nie (Lifetime)'}</b><span>Discord-ID</span><b class="lhw">${esc(S.discordId)}</b><span>Key</span><b class="lhw">${esc(S.key)}</b></div>
      <div class="lhw" id="lhw" title="Klicken zum Kopieren">Hardware-ID: ${esc(S.hwid)}</div>
      <div class="lact"><button class="btn pri" id="lclose">Schließen</button><button class="btn" id="lrf">Jetzt prüfen</button><button class="btn dng" id="lout">Abmelden</button></div>`;
    c.querySelector('#lclose').onclick = close;
    c.querySelector('#lhw').onclick = () => { navigator.clipboard?.writeText(S.hwid); toast('Hardware-ID kopiert'); };
    c.querySelector('#lrf').onclick = async () => { S = await api.licRefresh(); badge(); S.licensed ? (toast('Lizenz ist gültig'), viewLicensed(c)) : viewForm(c, ERR[S.reason] || ''); };
    c.querySelector('#lout').onclick = async () => { if (!confirm('Auf diesem PC abmelden? Der Key bleibt an diese Hardware gebunden.')) return; S = await api.licLogout(); badge(); viewForm(c, ''); };
  }

  function viewForm(c, msg) {
    const plans = (S.plans || []).map((p) => `<div><b>${esc(p.price)}</b><span>${esc(p.name)}</span></div>`).join('');
    c.innerHTML = `<h2>Lizenz aktivieren</h2><p class="lsub">Tweaks anwenden braucht einen Key und die Anmeldung mit Discord. Zurücksetzen, Restore und Cleaner bleiben immer frei.</p>
      <label for="lk">Key</label><input id="lk" class="inp mono" placeholder="ATK-XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false" maxlength="30">
      <div class="lerr" id="lerr" role="alert">${esc(msg || '')}</div><div class="lwait" id="lwait" hidden></div>
      <div class="lact"><button class="btn pri" id="lgo">Mit Discord anmelden</button>${S.buyUrl ? '<button class="btn" id="lbuy">Key holen</button>' : ''}</div>
      ${plans ? `<div class="lplans">${plans}</div>` : ''}
      <div class="lhw" id="lhw" title="Klicken zum Kopieren">Hardware-ID: ${esc(S.hwid || '…')}</div>
      <button class="lskip" id="lskip">Ohne Lizenz fortfahren</button>`;
    const go = c.querySelector('#lgo'), err = c.querySelector('#lerr'), wait = c.querySelector('#lwait');
    c.querySelector('#lskip').onclick = close;
    c.querySelector('#lhw').onclick = () => { navigator.clipboard?.writeText(S.hwid || ''); toast('Hardware-ID kopiert'); };
    const buy = c.querySelector('#lbuy'); if (buy) buy.onclick = () => window.open(S.buyUrl, '_blank', 'noopener');
    const run = async () => {
      if (busy) return;
      const key = c.querySelector('#lk').value.trim();
      if (!key) { err.textContent = ERR.bad_request; return; }
      busy = true; err.textContent = ''; go.disabled = true; go.textContent = 'Warte auf Discord …';
      const hint = setTimeout(() => { wait.hidden = false; wait.innerHTML = 'Im Browser hat sich Discord geöffnet – melde dich dort an. <a href="#" id="lcx" style="color:var(--fg)">Abbrechen</a>'; const x = c.querySelector('#lcx'); if (x) x.onclick = (e) => { e.preventDefault(); api.licCancel(); }; }, 2500);
      const r = await api.licActivate(key);
      clearTimeout(hint); busy = false; S = r; badge();
      if (r.ok) { toast('Lizenz aktiviert'); viewLicensed(c); }
      else { go.disabled = false; go.textContent = 'Mit Discord anmelden'; wait.hidden = true; err.textContent = ERR[r.error] || 'Aktivierung fehlgeschlagen.'; }
    };
    go.onclick = run; c.querySelectorAll('input').forEach((i) => i.onkeydown = (e) => { if (e.key === 'Enter') run(); });
  }

  async function poll(first) {
    try { S = await api.licStatus(); } catch { return; }
    badge();
    if (first && !S.licensed) open(S.reason ? ERR[S.reason] : '');
    else if (lastOk === true && !S.licensed && !el) open(ERR[S.reason] || ERR.offline); // Lizenz wurde entzogen / läuft ab
    lastOk = S.licensed;
  }
  window.showLicense = (why) => { if (el || !S) return; open(why === 'locked' ? 'Für diese Funktion brauchst du eine gültige Lizenz.' : ''); };
  const b = $('#licb'); if (b) { b.onclick = () => S && open(''); b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); S && open(''); } }; }
  poll(true); setInterval(poll, 60e3); addEventListener('focus', () => poll());
})();
