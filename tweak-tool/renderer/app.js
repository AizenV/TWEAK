// Browser-Vorschau: ohne Electron werden Demo-Daten verwendet
const rawApi = window.api || (() => {
  const t = [
    ['prioctl','CPU / RAM','Vordergrund-Priorität für Spiele','Das aktive Fenster bekommt mehr CPU-Zeit (Win32PrioritySeparation).',0,0,1],
    ['coreparking','CPU / RAM','Core-Parking aus','Alle Kerne bleiben aktiv – weniger Latenzspitzen.',1,0,0],
    ['memcomp','CPU / RAM','Speicherkomprimierung aus','Spart CPU-Zeit bei viel RAM. Benötigt Neustart.',1,1,0],
    ['swapupgrade','GPU','Optimierungen für Spiele im Fenstermodus','Flip-Modell für DX10/11-Spiele im Fenster.',0,0,0],
    ['usbsuspend','Power','USB-Energiesparen (Selective Suspend) aus','USB-Geräte werden nie schlafen gelegt.',1,1,1],
    ['diskidle','Power','Festplatten nie ausschalten','Datenträger gehen im Netzbetrieb nicht in den Ruhezustand.',1,0,0],
    ['qos','Network','QoS-Bandbreitenreservierung aus','Keine reservierte Bandbreite für QoS-Dienste.',1,0,0],
    ['gamemode','Windows','Game Mode aktivieren','Windows priorisiert das laufende Spiel und blockiert Hintergrund-Updates.',0,0,1],
    ['gpusched','GPU','Hardware-beschleunigtes GPU-Scheduling','Die GPU verwaltet ihren Speicher selbst.',1,1,0],
    ['activity','Windows','Aktivitätsverlauf aus','Kein Aktivitätsverlauf (Zeitachse) mehr.',1,0,0],
    ['mouseaccel','WASD Input','Mausbeschleunigung aus','1:1-Mausbewegung. Wirkt nach Neuanmeldung.',0,0,1],
    ['ahotkeys','WASD Input','Bedienhilfen-Hotkeys aus','Keine Hoher-Kontrast- und Maustasten-Popups im Spiel.',0,0,1],
    ['timerres','Hit Reg','Globale Timer-Auflösung','Hohe Timer-Auflösung systemweit. Benötigt Neustart.',1,1,0],
    ['nagle','Hit Reg','Nagle-Algorithmus aus (TCP No Delay)','Kleine Pakete werden sofort gesendet.',1,0,1],
    ['svc_telemetry','Services','Telemetrie-Dienste aus','Deaktiviert DiagTrack und den WAP-Push-Dienst.',1,0,1],
    ['svc_xbox','Services','Xbox-Dienste aus','Deaktiviert Xbox-Anmeldung, Spielstände und Netzwerk.',1,0,0],
    ['wudrivers','Treiber','Treiber nicht über Windows Update tauschen','Windows Update installiert keine Treiber automatisch.',1,0,1],
    ['msi_gpu','Treiber','MSI-Modus für die Grafikkarte','Geringere Interrupt-Latenz. Benötigt Neustart.',1,1,0],
    ['nettroll','Network','Netzwerk-Drosselung aus','Entfernt die Multimedia-Netzwerkbremse.',1,0,0],
    ['powerplan','Power','Höchstleistungs-Energieplan','Aktiviert den Plan \"Höchstleistung\".',0,0,0],
    ['transparency','Windows','Transparenzeffekte aus','Weniger GPU-Last durch deaktivierte Effekte.',0,0,1],
  ].map(([id,cat,name,desc,admin,reboot,active])=>({id,cat,name,desc,admin:!!admin,reboot:!!reboot,active:!!active}));
  const rps=[{n:1,desc:'Windows Update',time:'2026-11-02T16:38:52'}];
  const demoFixes=[{id:'cursor',name:'Maus-Cursor zurücksetzen',desc:'Stellt den normalen Windows-Standard-Mauszeiger wieder her.'},{id:'defender',name:'Windows Defender aktivieren',desc:'Schaltet Windows Defender wieder ein.',tone:'good'},{id:'v3',name:'V3 Hardcore zurücksetzen',desc:'Macht die V3-Änderungen rückgängig.',tone:'warn'}];
  const w=(v)=>new Promise(r=>setTimeout(()=>r(v),250));
  return { list:()=>w(t.map(x=>({...x}))), set:(id,on)=>{t.find(x=>x.id===id).active=on;return w({ok:true,active:on})}, resetAll:()=>{t.forEach(x=>x.active=false);return w(true)},
    sys:()=>w({host:'DESKTOP-PC',os:'Windows_NT 10.0.22631',cpu:'AMD Ryzen 7 5800X 8-Core Processor',cores:16,ramTotal:34359738368,ramFree:17179869184,uptime:93600,gpu:'NVIDIA GeForce RTX 3070'}),
    cleanScan:()=>w([{id:'usertemp',name:'Benutzer-Temp',size:824e6},{id:'wintemp',name:'Windows-Temp',size:112e6},{id:'prefetch',name:'Prefetch',size:9e6},{id:'d3d',name:'DirectX-Shader-Cache',size:301e6}]),
    cleanRun:(ids)=>w(1e8), flushDns:()=>w(true),
    rpList:()=>w(rps.map(x=>({...x}))), rpCreate:(n)=>{rps.unshift({n:rps.length+1,desc:n||'Attack.tweaks',time:new Date().toISOString().slice(0,19)});return w({ok:true})}, rpOpen:()=>w(true),
    fixList:()=>w(demoFixes), fixRun:()=>w({ok:true}), fixAll:()=>w({failed:[]}) };
})();
// Meldet der Hauptprozess „Lizenz erforderlich“, öffnet sich automatisch das Aktivierungsfenster
const api = new Proxy(rawApi, { get(t, k) { const f = t[k]; if (typeof f !== 'function') return f;
  return async (...a) => { const r = await f(...a); if (r && r.error === 'license' && window.showLicense) window.showLicense('locked'); return r; }; } });

const $ = (s) => document.querySelector(s);
let tweaks = [], cat = 'Alle';
// Kategorien der Tweaks-Sidebar (Reihenfolge = Reihenfolge im Menü). Alles Übrige landet unter „Sonstige“.
const TWC = [
  ['CPU / RAM', 'Prozessor-Priorität, Core-Parking und Arbeitsspeicher.'],
  ['GPU', 'Grafikkarte, Scheduling und Vollbild-Verhalten.'],
  ['Power', 'Energiepläne und Stromspar-Funktionen, die Leistung kosten.'],
  ['Network', 'Netzwerk-Drosselung und Verbindungs-Latenz.'],
  ['Windows', 'Windows-Komfort, Telemetrie und Oberfläche.'],
  ['WASD Input', 'Maus, Tastatur und Eingabe-Verzögerung.'],
  ['Hit Reg', 'Timer- und Paket-Timing für direktere Eingaben und Netcode (die Trefferprüfung selbst macht der Server).'],
  ['Services', 'Hintergrunddienste, die beim Spielen nicht gebraucht werden.'],
  ['Treiber', 'Treiber-Einstellungen und Windows-Update-Verhalten.'],
];
const TW_OTHER = 'Sonstige';
const twOf = (t) => TWC.some((c) => c[0] === t.cat) ? t.cat : TW_OTHER;
let twCat = 'CPU / RAM';
const fmt = (b) => b > 1e9 ? (b/1e9).toFixed(2)+' GB' : b > 1e6 ? (b/1e6).toFixed(1)+' MB' : b > 1e3 ? (b/1e3).toFixed(0)+' KB' : b+' B';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2400)}

function show(p){let full=p;
  if(p.startsWith('tw:')){twCat=p.slice(3);p='tweaks';cat='Alle';renderTweaks()}
  else if(p==='tweaks'){full='tw:'+twCat;renderTweaks()}
  document.querySelectorAll('.pg').forEach(e=>e.classList.toggle('on',e.id==='p-'+p));document.querySelectorAll('.nav').forEach(e=>e.classList.toggle('on',e.dataset.p===full));
  if(p==='cleaner'&&!$('#clist').children.length)scan();
  if(p==='backup')loadRp();if(p==='restore'&&!$('#fixlist').children.length)loadFixes()}
$('#twgrp').onclick=()=>$('nav').classList.toggle('twcol');
document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>show(n.dataset.p));

function renderTweaks(){
  const mine=tweaks.filter(t=>twOf(t)===twCat),other=twCat===TW_OTHER;
  const cats=['Alle',...(mine.some(t=>t.rec)?['Empfohlen']:[]),...(other?[...new Set(mine.map(t=>t.cat))]:[])];
  if(!cats.includes(cat))cat='Alle';
  $('#twh').textContent=twCat;
  $('#twsub').textContent=other?'Weitere Tweaks, die noch keiner Kategorie zugeordnet sind.':((TWC.find(c=>c[0]===twCat)||[])[1]||'');
  $('#chips').innerHTML=cats.length>1?cats.map(c=>`<span class="chip${c===cat?' on':''}" data-c="${esc(c)}">${esc(c)}</span>`).join(''):'';
  $('#chips').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{cat=c.dataset.c;renderTweaks()});
  const list=mine.filter(t=>cat==='Alle'||(cat==='Empfohlen'?t.rec:t.cat===cat));
  $('#tlist').innerHTML=list.length?list.map(t=>`<div class="titem card"><div class="tx"><b>${esc(t.name)}${t.admin?'<span class="pill i">ADMIN</span>':''}${t.reboot?'<span class="pill w">NEUSTART</span>':''}${t.risk==='mid'?'<span class="pill w">VORSICHT</span>':''}${t.na?'<span class="pill">NICHT VERFÜGBAR</span>':''}</b><span>${esc(t.desc)}</span></div><div class="sw${t.active?' on':''}${t.na?' na':''}" data-id="${t.id}"></div></div>`).join(''):'<div class="empty">Keine Tweaks in dieser Kategorie.</div>';
  $('#tlist').querySelectorAll('.sw').forEach(s=>s.onclick=()=>toggle(s));
  renderScore();
}
$('#twrec').onclick=async()=>{const b=$('#twrec');b.disabled=true;let locked=false,n=0;
  for(const t of tweaks.filter(x=>twOf(x)===twCat&&x.rec&&!x.active&&!x.reboot&&!x.na)){const r=await api.set(t.id,true);if(r.error==='license'){locked=true;break}t.active=r.active;n++}
  b.disabled=false;renderTweaks();toast(locked?'Lizenz erforderlich – bitte Key aktivieren':n?`${n} empfohlene Tweaks angewendet`:'Keine weiteren empfohlenen Tweaks')};
$('#twoff').onclick=async()=>{const l=tweaks.filter(x=>twOf(x)===twCat&&x.active);if(!l.length)return toast('Nichts zu tun');
  if(!confirm(`Alle aktiven Tweaks in „${twCat}“ zurücksetzen?`))return;
  for(const t of l){const r=await api.set(t.id,false);t.active=r.active}renderTweaks();toast('Kategorie zurückgesetzt')};
async function toggle(el){
  const t=tweaks.find(x=>x.id===el.dataset.id);if(t.na)return;el.classList.add('busy');
  const r=await api.set(t.id,!t.active);t.active=r.active;
  toast(r.ok?`${t.name}: ${t.active?'aktiviert':'deaktiviert'}${t.reboot&&t.active?' (Neustart nötig)':''}`:r.error==='license'?'Lizenz erforderlich – bitte Key aktivieren':`Fehler bei „${t.name}“ – als Administrator starten?`);
  renderTweaks();
}
function renderScore(){
  const v=tweaks.filter(t=>!t.na),a=v.filter(t=>t.active).length,n=v.length,p=n?Math.round(a/n*100):0;
  $('#ringfg').style.strokeDashoffset=326.7*(1-p/100);$('#rpct').textContent=p+'%';$('#rsub').textContent=`${a} / ${n} aktiv`;
  document.querySelectorAll('.nav.tw').forEach(e=>{const m=tweaks.filter(t=>twOf(t)===e.dataset.p.slice(3)),k=m.filter(t=>t.active&&!t.na).length,c=e.querySelector('.cnt');
    e.classList.toggle('tw-empty',!m.length);c.querySelector('b').textContent=k;c.classList.toggle('on',k>0)});
}
async function loadSys(){
  const s=await api.sys(),used=s.ramTotal-s.ramFree,pct=Math.round(used/s.ramTotal*100),h=Math.floor(s.uptime/3600);
  $('#kpis').innerHTML=`<div class="kpi card"><small>CPU</small><div class="big sm">${esc(s.cpu)}</div></div>
    <div class="kpi card"><small>GPU</small><div class="big sm">${esc(s.gpu)}</div></div>
    <div class="kpi card"><small>RAM</small><div class="big">${pct}%</div><div class="bar"><i style="width:${pct}%"></i></div></div>
    <div class="kpi card"><small>Laufzeit</small><div class="big">${h} h</div></div>`;
  $('#sysinfo').innerHTML=[['Computer',s.host],['System',s.os],['Prozessor',`${s.cpu} (${s.cores} Threads)`],['Grafikkarte',s.gpu],['Arbeitsspeicher',`${fmt(used)} / ${fmt(s.ramTotal)}`]].map(([k,v])=>`<span>${k}</span><b>${esc(v)}</b>`).join('');
}
let cdata=[];
async function scan(){
  $('#clist').innerHTML='<div class="crow"><span class="n" style="color:var(--dim)">Scanne…</span></div>';
  cdata=await api.cleanScan();
  $('#clist').innerHTML=cdata.map(c=>`<label class="crow"><input type="checkbox" checked data-id="${c.id}"><span class="n">${esc(c.name)}</span><span class="s">${fmt(c.size)}</span></label>`).join('');
  $('#ctotal').textContent=fmt(cdata.reduce((a,c)=>a+c.size,0));
}
$('#cscan').onclick=scan;
$('#crun').onclick=async()=>{const ids=[...document.querySelectorAll('#clist input:checked')].map(i=>i.dataset.id);if(!ids.length)return;
  const b=$('#crun');b.disabled=true;const f=await api.cleanRun(ids);b.disabled=false;toast(`${fmt(f)} freigegeben`);scan()};
$('#dns').onclick=async()=>toast(await api.flushDns()?'DNS-Cache geleert':'Fehlgeschlagen');
window.resetAllTweaks=async()=>{if(!confirm('Alle aktiven Tweaks zurücksetzen?'))return;await api.resetAll();tweaks=await api.list();renderTweaks();toast('Alles zurückgesetzt')};
$('#applyAll').onclick=async()=>{const b=$('#applyAll');b.disabled=true;let locked=false;
  const hasRec=tweaks.some(x=>x.rec);
  for(const t of tweaks.filter(x=>!x.active&&!x.reboot&&!x.na&&(x.rec||!hasRec))){const r=await api.set(t.id,true);if(r.error==='license'){locked=true;break}t.active=r.active}
  b.disabled=false;renderTweaks();toast(locked?'Lizenz erforderlich – bitte Key aktivieren':'Empfohlene Tweaks angewendet')};

// ---------- Backup ----------
const fdate=(t)=>{const d=new Date(t);return isNaN(d)?'–':d.toLocaleDateString('de-DE')+' · '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr'};
async function loadRp(){
  $('#rplist').innerHTML='<div class="empty">Lade…</div>';
  const l=await api.rpList();
  $('#rplist').innerHTML=l.length?l.map(r=>`<div class="titem card"><div class="tx"><b>${esc(r.desc||'Wiederherstellungspunkt')}</b><span>${fdate(r.time)}</span></div></div>`).join(''):'<div class="empty">Keine Wiederherstellungspunkte gefunden (Systemschutz evtl. deaktiviert).</div>';
}
$('#rpRefresh').onclick=loadRp;
$('#rpOpen').onclick=()=>api.rpOpen();
$('#rpCreate').onclick=async()=>{const b=$('#rpCreate');b.disabled=true;b.textContent='Erstelle…';
  const r=await api.rpCreate('Attack.tweaks '+new Date().toLocaleString('de-DE'));
  b.disabled=false;b.textContent='+ Punkt erstellen';
  toast(r.ok?'Wiederherstellungspunkt erstellt':'Fehlgeschlagen – als Administrator starten / Systemschutz aktivieren?');loadRp()};

// ---------- Restore ----------
async function loadFixes(){
  const l=await api.fixList();
  $('#fixlist').innerHTML=l.map(f=>`<div class="titem card"><div class="tx"><b>${esc(f.name)}${f.reboot?'<span class="pill w">NEUSTART</span>':''}</b><span>${esc(f.desc)}</span></div><button class="btn ${f.tone||''}" data-id="${f.id}">▷ Fix</button></div>`).join('');
  $('#fixlist').querySelectorAll('button').forEach(b=>b.onclick=async()=>{b.disabled=true;
    const r=await api.fixRun(b.dataset.id);b.disabled=false;
    toast(r.ok?`Fix angewendet${r.reboot?' – Neustart empfohlen':''}`:'Fix nicht vollständig – als Administrator starten?')});
}
$('#fixAll').onclick=async()=>{if(!confirm('Alle Fixes anwenden und Standardwerte wiederherstellen?'))return;
  const b=$('#fixAll');b.disabled=true;const r=await api.fixAll();b.disabled=false;
  toast(r.failed.length?`Teilweise fehlgeschlagen: ${r.failed.join(', ')}`:`Alles zurückgesetzt${r.reboot?' – Neustart empfohlen':''}`)};

(async()=>{show('dashboard');tweaks=await api.list();
  twCat=[...TWC.map(c=>c[0]),TW_OTHER].find(c=>tweaks.some(t=>twOf(t)===c))||twCat;renderTweaks();loadSys()})();
