// Presets-Seite: zeigt die vom Discord-Bot gesammelten Mods, nach Kategorien getrennt.
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const https=u=>/^https?:\/\//i.test(u||'');
const fsize=b=>b>1e9?(b/1e9).toFixed(2)+' GB':b>1e6?(b/1e6).toFixed(1)+' MB':b>1e3?(b/1e3).toFixed(0)+' KB':'';
const fd=t=>{const d=new Date(t);return isNaN(d)?'':d.toLocaleDateString('de-DE')};
const tst=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tst.h);tst.h=setTimeout(()=>t.classList.remove('on'),3200)};

// Browser-Vorschau ohne Electron: Demo-Daten
const demo=(()=>{let url='',folders={},installed={};
 const cats=[{id:'grafik',name:'Grafik-Mods'},{id:'sound',name:'Soundpacks'},{id:'minimap',name:'Minimaps'},{id:'waffen',name:'Waffenskins'}];
 const mk=(cat,n,ch,extra)=>Array.from({length:n},(_,i)=>({id:cat+i,cat,name:({grafik:'NVE Preset',sound:'Soundpack',minimap:'Minimap',waffen:'Waffenskin'})[cat]+' '+(i+1),version:'1.'+i,desc:'Aus #'+ch,image:null,file:i%3?{url:'https://x/y.zip',name:'a.zip',size:(i+1)*4e6}:null,link:i%3?null:'https://mediafire.com/x',author:'Community',channel:ch,date:new Date(Date.now()-i*864e5).toISOString(),...extra}));
 const items=[...mk('grafik',6,'grafik-1'),...mk('sound',4,'sounds'),...mk('minimap',3,'maps'),...mk('waffen',5,'skins')];
 const w=v=>new Promise(r=>setTimeout(()=>r(v),200));
 return {prCfg:()=>w({url,folders,installed}),prSetUrl:u=>{url=u;return w({url,folders,installed})},prList:()=>w({ok:true,categories:cats,items,updated:new Date().toISOString()}),prPick:c=>{folders[c]='C:\\FiveM\\FiveM.app\\mods';return w(folders[c])},prInstall:it=>{installed[it.id]=it.version;return w({ok:true})},prOpenFolder:()=>w(true)}})();
const A=()=>window.api&&window.api.prList?window.api:demo;

let cfg={url:'',folders:{},installed:{}},feed={categories:[],items:[]},tab=null,q='',loaded=false,err='';

async function load(){
  $('#prgrid').innerHTML='<div class="empty">Lade…</div>';
  cfg=await A().prCfg(); $('#prurl').value=cfg.url||'';
  const r=await A().prList(); loaded=true;
  if(r.ok){feed=r;err='';}else{feed={categories:[],items:[]};err=r.error==='nourl'?'nourl':r.error;}
  // Kategorien: laut Bot-Konfig, plus unbekannte aus den Einträgen
  const known=new Set(feed.categories.map(c=>c.id));
  [...new Set(feed.items.map(i=>i.cat))].forEach(id=>{if(!known.has(id))feed.categories.push({id,name:id})});
  if(!feed.categories.some(c=>c.id===tab))tab=feed.categories[0]?feed.categories[0].id:null;
  render();
}
function render(){
  const cnt=id=>feed.items.filter(i=>i.cat===id).length;
  $('#prtabs').innerHTML=feed.categories.map(c=>`<span class="chip${c.id===tab?' on':''}" data-c="${esc(c.id)}">${esc(c.name)} <small>${cnt(c.id)}</small></span>`).join('');
  $('#prtabs').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{tab=c.dataset.c;render()});
  const note=$('#prnote');
  if(err==='nourl')note.innerHTML='<b>Noch keine Quelle gesetzt.</b> Trage unten die Adresse deines Presets-Bots ein.';
  else if(err)note.innerHTML=`<b>Bot nicht erreichbar:</b> ${esc(err)}`;
  else note.innerHTML='<b>FiveM muss geschlossen sein</b> – der mods-Ordner ist sonst gesperrt. Nach der Installation: FiveM neu starten.'+(feed.updated?` <span class="dim">· Stand ${esc(new Date(feed.updated).toLocaleString('de-DE'))}</span>`:'');
  const dir=cfg.folders[tab];
  $('#prdir').hidden=!tab;
  $('#prdir').innerHTML=`<div class="tx"><b>Zielordner</b><span>${dir?esc(dir):'Noch kein Ordner gewählt – wird bei der ersten Installation abgefragt.'}</span></div>${dir?'<button class="btn" id="prop">Öffnen</button>':''}<button class="btn" id="prch">${dir?'Ändern':'Wählen'}</button>`;
  $('#prch').onclick=async()=>{const d=await A().prPick(tab);if(d){cfg.folders[tab]=d;render()}};
  if($('#prop'))$('#prop').onclick=()=>A().prOpenFolder(tab);
  const s=q.trim().toLowerCase();
  const list=feed.items.filter(i=>i.cat===tab&&(!s||(i.name+' '+(i.desc||'')+' '+(i.author||'')).toLowerCase().includes(s)));
  $('#prgrid').innerHTML=list.length?list.map(i=>{
    const done=cfg.installed[i.id]!=null,link=!i.file;
    return `<article class="prcard card" data-id="${esc(i.id)}"><div class="primg">${https(i.image)?`<img src="${esc(i.image)}" loading="lazy" alt="" onerror="this.remove()">`:''}<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 16-5-5L5 21"/></svg></div>
    <div class="prbody"><div class="prt"><b title="${esc(i.name)}">${esc(i.name)}</b>${i.version?`<small>v${esc(i.version)}</small>`:''}</div>
    <div class="prm">${[i.author&&esc(i.author),i.file&&fsize(i.file.size),fd(i.date)].filter(Boolean).join(' · ')}</div>
    ${i.desc?`<div class="prd">${esc(i.desc)}</div>`:''}
    <button class="btn${done?'':' pri'}" data-i="${esc(i.id)}">${link?'Zum Download ↗':done?'✓ Installiert · erneut':'⬇ Installieren'}</button></div></article>`}).join('')
   :`<div class="empty">${err?'':s?'Nichts gefunden.':'In dieser Kategorie ist noch nichts.'}</div>`;
  $('#prgrid').querySelectorAll('button[data-i]').forEach(b=>b.onclick=async()=>{
    const it=feed.items.find(x=>x.id===b.dataset.i);if(!it)return;
    const t=b.textContent;b.disabled=true;b.textContent=it.file?'Installiere…':'Öffne…';
    const r=await A().prInstall(it);
    if(r.ok&&!r.opened){cfg=await A().prCfg();tst(`„${it.name}“ installiert – FiveM neu starten`)}
    else if(!r.ok)tst('Fehlgeschlagen: '+(r.error||'unbekannt'));
    render();
  });
}
$('#prq').oninput=e=>{q=e.target.value;if(loaded)render()};
$('#prrf').onclick=load;
$('#prsave').onclick=async()=>{await A().prSetUrl($('#prurl').value);tst('Gespeichert');load()};

const _show=window.show;
window.show=function(p){_show(p);if(p==='presets'&&!loaded)load()};
})();
