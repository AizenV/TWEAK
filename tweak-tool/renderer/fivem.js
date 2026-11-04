// Seiten „FiveM“ (Performance-Toggles) und „FiveM Clearen“ (Caches, Bloatware, erweiterte Bereinigung)
(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fm=b=>b>1e9?(b/1e9).toFixed(2)+' GB':b>1e6?(b/1e6).toFixed(1)+' MB':b>1e3?(b/1e3).toFixed(0)+' KB':b+' B';
const tst=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tst.h);tst.h=setTimeout(()=>t.classList.remove('on'),3400)};

// Browser-Vorschau ohne Electron
const demo=(()=>{const L=[
 {id:'fv_cpu',name:'Process Priority High',desc:'FiveM/GTA höhere CPU-Prio',tag:'AKTIV',active:true},
 {id:'fv_io',name:'I/O Priority High',desc:'Mehr Priorität fürs Laden von Assets',tag:'AKTIV',active:true},
 {id:'fv_cache',name:'Cache Flushed',desc:'FiveM-Cache leeren',tag:'EINMALIG',oneshot:true},
 {id:'fv_steam',name:'Steam Overlay Off',desc:'Steam-Overlay deaktiviert',tag:'MANUELL',manual:true,hint:'Manuell: Steam → GTA V → Eigenschaften → Overlay aus.'},
 {id:'fv_mmcss',name:'MMCSS Games Profile',desc:'MMCSS Game',tag:'AKTIV',active:true},
 {id:'fv_laa',name:'Large Address Aware',desc:'GTA-Client braucht ggf. LAA – manuell patchen',tag:'MANUELL',manual:true,hint:'Manuell: 4GB-Patch-Tool nutzen.'}];
 const w=v=>new Promise(r=>setTimeout(()=>r(v),150));
 return {fvList:()=>w(L.map(x=>({...x}))),fvSet:(id,on)=>{const t=L.find(x=>x.id===id);if(!t.oneshot)t.active=on;return w({ok:true,active:t.oneshot?false:on,freed:t.oneshot?3e8:0})},
  fvSizes:()=>w({shader:412e6,fivem:2.4e9}),fvClean:()=>w({ok:true,freed:1e8}),
  fvBloatScan:m=>w([{name:'Microsoft.BingNews',full:'a'},{name:'Microsoft.ZuneMusic',full:'b'},{name:'Clipchamp.Clipchamp',full:'c'}].concat(m==='aggressive'?[{name:'Microsoft.XboxApp',full:'d'}]:[])),
  fvBloatRun:l=>w({removed:l.length,failed:[]}),fvExt:()=>w({ok:true,freed:5e7})}})();
const A=()=>window.api&&window.api.fvList?window.api:demo;

// ---------- FiveM (Performance) ----------
let fv=[];
const bolt='<svg viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>';
function badge(){const n=fv.filter(t=>t.active).length,b=$('#fvbadge');b.hidden=!n;b.querySelector('b').textContent=n}
function renderFv(){
  const auto=fv.filter(t=>!t.manual&&!t.oneshot);
  $('#fvall').disabled=auto.every(t=>t.active);$('#fvnone').disabled=!auto.some(t=>t.active);
  $('#fvgrid').innerHTML=fv.map(t=>`<div class="fvi card${t.manual?' man':''}" data-id="${esc(t.id)}"><div class="fvic">${bolt}</div><div class="tx"><b>${esc(t.name)}<span class="tag ${t.manual?'m':t.oneshot?'o':'g'}">${esc(t.tag)}</span></b><span>${esc(t.desc)}</span></div><div class="sw${t.active?' on':''}" role="switch" aria-checked="${!!t.active}" aria-label="${esc(t.name)}" tabindex="0"></div></div>`).join('');
  $$('#fvgrid .fvi').forEach(el=>{const sw=el.querySelector('.sw'),t=fv.find(x=>x.id===el.dataset.id);
    const go=()=>toggle(t,sw);sw.onclick=go;sw.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();go()}}});
  badge();
}
async function toggle(t,sw){
  if(t.manual){tst(t.hint||'Dieser Punkt muss manuell erledigt werden.');return}
  sw.classList.add('busy');
  const r=await A().fvSet(t.id,!t.active);
  if(t.oneshot){tst(r.ok?`FiveM-Cache geleert (${fm(r.freed||0)})`:r.error==='running'?'FiveM läuft noch – bitte erst schließen.':'Fehlgeschlagen – als Administrator starten?')}
  else{t.active=r.active;if(!r.ok)tst(`Fehler bei „${t.name}“ – als Administrator starten?`);else tst(`${t.name}: ${t.active?'aktiviert':'deaktiviert'}`)}
  renderFv();
}
async function loadFv(){fv=await A().fvList();renderFv()}
async function bulk(on){const b=$(on?'#fvall':'#fvnone');b.disabled=true;
  for(const t of fv.filter(x=>!x.manual&&!x.oneshot&&x.active!==on)){const r=await A().fvSet(t.id,on);t.active=r.active}
  renderFv();tst(on?'Alle ausgewählt':'Auswahl geleert')}
$('#fvall').onclick=()=>bulk(true);$('#fvnone').onclick=()=>bulk(false);

// ---------- FiveM Clearen ----------
let mode='safe',bl=[];
async function sizes(){const s=await A().fvSizes();$('#fvsh').textContent=fm(s.shader);$('#fvfm').textContent=fm(s.fivem)}
async function clean(kind,btn){btn.disabled=true;const r=await A().fvClean(kind);btn.disabled=false;
  tst(r.ok?`${fm(r.freed||0)} freigegeben`:r.error==='running'?'FiveM läuft noch – bitte erst schließen.':'Fehlgeschlagen');sizes()}
$('#fvshb').onclick=e=>clean('shader',e.currentTarget);$('#fvfmb').onclick=e=>clean('fivem',e.currentTarget);
$$('.mode').forEach(b=>b.onclick=()=>{mode=b.dataset.m;$$('.mode').forEach(x=>x.classList.toggle('on',x===b));bl=[];renderBl()});
function selCount(){return $$('#fvbl input:checked').length}
function renderBl(scanned){
  $('#fvbl').innerHTML=bl.map((p,i)=>`<label class="crow"><input type="checkbox" checked data-i="${i}"><span class="n">${esc(p.name)}</span></label>`).join('');
  $('#fvblh').textContent=scanned&&!bl.length?'Keine Bloatware gefunden – alles sauber.':bl.length?'':'Klicke „Scan“, um installierte Bloatware zu finden.';
  $$('#fvbl input').forEach(i=>i.onchange=upd);upd();
}
function upd(){const n=selCount();$('#fvrm').textContent=`Entfernen (${n})`;$('#fvrm').disabled=!n}
$('#fvscan').onclick=async()=>{const b=$('#fvscan');b.disabled=true;b.textContent='Scanne…';bl=await A().fvBloatScan(mode);b.disabled=false;b.textContent='Scan';renderBl(true)};
$('#fvrm').onclick=async()=>{const sel=$$('#fvbl input:checked').map(i=>bl[+i.dataset.i]);if(!sel.length)return;
  if(!confirm(mode==='aggressive'?`ACHTUNG: Aggressiv-Modus kann Store/Xbox/Fotos entfernen und UWP-Updates oder Anti-Cheats brechen.\n\n${sel.length} Apps wirklich entfernen?`:`${sel.length} Apps entfernen?`))return;
  const b=$('#fvrm');b.disabled=true;b.textContent='Entferne…';const r=await A().fvBloatRun(sel,mode);
  tst(r.failed.length?`${r.removed} entfernt, Fehler bei: ${r.failed.join(', ')}`:`${r.removed} Apps entfernt`);
  bl=bl.filter(p=>!sel.includes(p)||r.failed.includes(p.name));renderBl(true)};
$$('[data-x]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await A().fvExt(b.dataset.x);b.disabled=false;
  tst(r.ok?(r.freed!=null?`${fm(r.freed)} freigegeben`:b.dataset.x==='disk'?'Datenträgerbereinigung geöffnet':'Erledigt'):'Fehlgeschlagen – als Administrator starten?')});

const _show=window.show;
window.show=function(p){_show(p);if(p==='fivem')loadFv();if(p==='fivemclean')sizes()};
setTimeout(()=>A().fvList().then(l=>{fv=l;badge()}).catch(()=>{}),400);
})();
