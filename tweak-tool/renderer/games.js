// Seite „Spiele“: Poster-Raster, Klick öffnet die Tweaks für das gewählte Spiel.
(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tst=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tst.h);tst.h=setTimeout(()=>t.classList.remove('on'),3400)};
const fm=b=>b>1e9?(b/1e9).toFixed(2)+' GB':b>1e6?(b/1e6).toFixed(1)+' MB':b>1e3?(b/1e3).toFixed(0)+' KB':b+' B';

// Browser-Vorschau ohne Electron
const demo=(()=>{const L=[['cs2','Counter-Strike 2',['cs2.exe'],'-high -novid -nojoy','',['NVIDIA Reflex im Spiel auf „Ein + Boost“ stellen.']],['valorant','VALORANT',['VALORANT-Win64-Shipping.exe'],'','Vanguard',['Vanguard läuft als Treiber – Priorität nur vorsichtig ändern.']],['fortnite','Fortnite',['FortniteClient-Win64-Shipping.exe'],'','Easy Anti-Cheat',[]],['apex','Apex Legends',['r5apex.exe'],'+fps_max unlimited -novid -high','Easy Anti-Cheat',[]],['gta5','GTA V',['GTA5.exe'],'-notablet','',['Für FiveM bitte die FiveM-Seite nutzen.']],['dota2','Dota 2',['dota2.exe'],'-high -novid -dx11','',[]]].map(([id,name,exes,tip,ac,tips],i)=>({id,name,exes,tip,tips,ac,custom:false,genre:i<3?'Shooter':'Sonstige',path:'',cpu:i===0,io:i===0,fso:false}));
 const w=v=>new Promise(r=>setTimeout(()=>r(v),120));
 return {gmList:()=>w(L.map(x=>({...x}))),gmSet:(id,k,on)=>{L.find(x=>x.id===id)[k]=on;return w({ok:true,active:on})},gmPickExe:id=>{const g=L.find(x=>x.id===id);g.path='C:\\Games\\'+g.exes[0];return w(g.path)},gmFso:(id,on)=>{const g=L.find(x=>x.id===id);g.fso=on;return w({ok:true,active:on})},
  gmPickCover:()=>w(false),gmClearCover:()=>w(true),gmAdd:e=>{if(!/\.exe$/i.test(e))return w({ok:false,error:'Bitte einen Dateinamen wie spiel.exe eingeben.'});L.push({id:'c:'+e,name:e.replace(/\.exe$/i,''),exes:[e],tip:'',tips:[],ac:'',custom:true,path:'',cpu:false,io:false,fso:false});return w({ok:true})},gmRemove:id=>{L.splice(L.findIndex(x=>x.id===id),1);return w(true)},
  fvClean:()=>w({ok:true,freed:4e8})}})();
const A=()=>window.api&&window.api.gmList?window.api:demo;

let games=[],q='',cur=null,glob=[],genre='Alle';
const hue=n=>[...n].reduce((a,c)=>a+c.charCodeAt(0)*31,0)%360;
const bg=n=>'linear-gradient(155deg,#4b4b4f,#2a2a2d)';
const initials=n=>n.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const art=g=>`<div class="gmart" style="background:${bg(g.name)}">${esc(initials(g.name))}</div>`;
// Eigenes Cover: renderer/games/<id>.jpg – fehlt es, bleibt das erzeugte Cover
// Bildquellen in dieser Reihenfolge: eigenes Bild → games/<id>.jpg → Steam-Cover → erzeugtes Cover
const ST='https://cdn.cloudflare.steamstatic.com/steam/apps/';
const srcs=(g,hero)=>[g.cover].filter(Boolean);
const img=(g,hero)=>{const l=srcs(g,hero);return l.length?`<img src="${esc(l[0])}" data-alt="${esc(l.slice(1).join('|'))}" alt="" referrerpolicy="no-referrer">`:''};
document.addEventListener('error',e=>{const t=e.target;if(!t||t.tagName!=='IMG'||!t.closest('#p-games'))return;const l=(t.dataset.alt||'').split('|').filter(Boolean);if(l.length){t.dataset.alt=l.slice(1).join('|');t.src=l[0]}else t.remove()},true);
const SC={"Shooter": "<g class=\"rot s24\"><circle cx=\"150\" cy=\"44\" r=\"38\" stroke-dasharray=\"2 4\"/></g><g class=\"pls\"><circle cx=\"150\" cy=\"44\" r=\"26\"/><path d=\"M150 6v20M150 62v20M112 44h20M168 44h20\"/></g><circle class=\"blink\" cx=\"150\" cy=\"44\" r=\"3\"/><path class=\"flow\" d=\"M8 72 118 50M18 86 120 56M0 58 114 44\" stroke-dasharray=\"6 5\"/><path class=\"blink\" d=\"M172 16l7-7M176 22l7-7\"/><path class=\"tk\" d=\"M96 94v-4\" style=\"animation-delay:0.0s\"/><path class=\"tk\" d=\"M106 94v-7\" style=\"animation-delay:-0.25s\"/><path class=\"tk\" d=\"M116 94v-4\" style=\"animation-delay:-0.5s\"/><path class=\"tk\" d=\"M126 94v-7\" style=\"animation-delay:-0.75s\"/><path class=\"tk\" d=\"M136 94v-4\" style=\"animation-delay:-1.0s\"/><path class=\"tk\" d=\"M146 94v-7\" style=\"animation-delay:-1.25s\"/><path class=\"tk\" d=\"M156 94v-4\" style=\"animation-delay:-1.5s\"/><path class=\"tk\" d=\"M166 94v-7\" style=\"animation-delay:-1.75s\"/><path class=\"tk\" d=\"M176 94v-4\" style=\"animation-delay:-2.0s\"/>", "Battle Royale": "<g class=\"rotr s30\"><circle cx=\"145\" cy=\"46\" r=\"44\" stroke-dasharray=\"3 3\"/></g><circle class=\"shrink\" cx=\"145\" cy=\"46\" r=\"30\"/><circle class=\"shrink\" style=\"animation-delay:-1.4s\" cx=\"145\" cy=\"46\" r=\"16\"/><circle class=\"blink\" cx=\"145\" cy=\"46\" r=\"2.5\"/><path d=\"M100 46h90M145 2v88\" opacity=\".5\"/><path class=\"flow\" d=\"M12 82 40 58 66 68 100 34\" stroke-dasharray=\"4 4\"/><g class=\"bob\"><circle cx=\"100\" cy=\"28\" r=\"5\"/><path d=\"M100 33v8\"/></g><path d=\"M30 18h22M30 25h14M62 12h16M14 40h12\"/>", "Open World": "<g class=\"rot s40\"><circle cx=\"160\" cy=\"24\" r=\"10\"/><path d=\"M160 6v5M160 37v5M142 24h5M173 24h5M147 11l3.5 3.5M169.5 33.5 173 37M173 11l-3.5 3.5M150.5 33.5 147 37\"/></g><path d=\"M0 70 28 40 46 56 72 24 104 62 130 44 160 70 200 46\"/><path d=\"M0 86 36 64 64 80 96 60 128 82 166 62 200 78\"/><path class=\"flow\" d=\"M14 98C60 88 90 94 120 90S170 96 192 92\" stroke-dasharray=\"5 4\"/><g class=\"fly\"><path d=\"M116 14l4 3 4-3\"/><path d=\"M128 20l3 2.5 3-2.5\"/></g><g class=\"fly\" style=\"animation-delay:-7s;animation-duration:16s\"><path d=\"M140 30l3 2.5 3-2.5\"/></g><circle cx=\"30\" cy=\"22\" r=\"10\"/><path class=\"swing\" d=\"M30 14l3 8-3 8-3-8z\"/>", "Survival": "<path d=\"M118 86 150 34 182 86z\"/><path d=\"M150 34v52M138 86l12-22 12 22\"/><g class=\"sway\"><path d=\"M44 30 34 48h20zM44 42 30 64h28zM44 56 26 82h36zM44 82v10\"/></g><g class=\"flick\"><path d=\"M92 90c-7-6 1-13-3-20 9 2 11 9 9 13 5-2 7-7 5-11 9 9 2 20-11 18z\"/></g><circle class=\"rise\" cx=\"92\" cy=\"64\" r=\"2.5\"/><circle class=\"rise\" style=\"animation-delay:-1.2s\" cx=\"96\" cy=\"64\" r=\"2\"/><circle class=\"rise\" style=\"animation-delay:-2.4s\" cx=\"90\" cy=\"64\" r=\"3\"/><path class=\"blink\" d=\"M18 14h4M20 12v4\"/><path class=\"blink\" style=\"animation-delay:-.8s\" d=\"M100 12h4M102 10v4\"/><path class=\"blink\" style=\"animation-delay:-1.6s\" d=\"M176 16h4M178 14v4\"/><g class=\"bob\"><path d=\"M70 20a10 10 0 1 0 10 12 8 8 0 0 1-10-12z\"/></g>", "RPG": "<path class=\"draw\" pathLength=\"100\" d=\"M112 84 174 18\"/><path d=\"M106 80l12 12M108 92l-6 4\"/><path class=\"draw\" style=\"animation-delay:-1.2s\" pathLength=\"100\" d=\"M186 84 124 18\"/><path d=\"M192 80l-12 12M190 92l6 4\"/><g class=\"pls\"><path d=\"M149 36l-12 4v10c0 8 6 12 12 14 6-2 12-6 12-14V40z\"/></g><path d=\"M6 92V68h6v-6h4v6h6v-6h4v6h6v24M40 92V58h8v-8h4v8h8v34\"/><g class=\"rot s12\"><path d=\"M76 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z\"/></g><g class=\"blink\"><path d=\"M98 44l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5L93 49l3.5-1.5z\"/></g>", "MOBA": "<path class=\"flow\" d=\"M10 90 190 10\" stroke-dasharray=\"6 4\"/><path d=\"M10 10 190 90\" opacity=\".5\"/><circle class=\"shrink\" cx=\"100\" cy=\"50\" r=\"10\"/><circle class=\"blink\" cx=\"100\" cy=\"50\" r=\"4\"/><g class=\"pls\"><path d=\"M40 72l6 3.5v7L40 86l-6-3.5v-7z\"/></g><g class=\"pls\" style=\"animation-delay:-1.5s\"><path d=\"M160 14l6 3.5v7L160 28l-6-3.5v-7z\"/></g><circle class=\"blink\" cx=\"70\" cy=\"30\" r=\"3\"/><circle class=\"blink\" style=\"animation-delay:-1.2s\" cx=\"132\" cy=\"70\" r=\"3\"/><rect x=\"142\" y=\"58\" width=\"42\" height=\"30\" rx=\"3\"/><path class=\"draw\" pathLength=\"100\" d=\"M148 82l10-10 8 6 12-14\"/>", "Rennen & Sport": "<path d=\"M100 18 36 96M100 18 164 96\"/><path class=\"flowfast\" d=\"M100 20v74\" stroke-dasharray=\"6 9\"/><path class=\"slide\" d=\"M6 32h40\"/><path class=\"slide\" style=\"animation-delay:-.5s\" d=\"M0 46h28\"/><path class=\"slide\" style=\"animation-delay:-1s\" d=\"M14 60h26\"/><g class=\"rot s5\"><circle cx=\"165\" cy=\"30\" r=\"16\"/><circle cx=\"165\" cy=\"30\" r=\"6\"/><path d=\"M165 14v10M165 36v10M149 30h10M171 30h10\"/></g><g class=\"bob\"><path d=\"M20 10h6v6h-6zM32 10h6v6h-6zM26 16h6v6h-6zM38 16h6v6h-6z\"/></g>", "Koop": "<g class=\"bob\" style=\"animation-delay:0s\"><circle cx=\"50\" cy=\"40\" r=\"9\"/><path d=\"M34 80c0-14 7-20 16-20s16 6 16 20\"/></g><g class=\"bob\" style=\"animation-delay:-0.9s\"><circle cx=\"100\" cy=\"36\" r=\"11\"/><path d=\"M84 76c0-14 7-20 16-20s16 6 16 20\"/></g><g class=\"bob\" style=\"animation-delay:-1.8s\"><circle cx=\"150\" cy=\"40\" r=\"9\"/><path d=\"M134 80c0-14 7-20 16-20s16 6 16 20\"/></g><path class=\"flow\" d=\"M60 40 88 38M112 38 140 40\" stroke-dasharray=\"3 3\"/><g class=\"rot s30\"><circle cx=\"100\" cy=\"50\" r=\"46\" stroke-dasharray=\"2 5\"/></g>", "Sonstige": "<g class=\"bob\"><rect x=\"108\" y=\"30\" width=\"78\" height=\"46\" rx=\"20\"/><path d=\"M128 44v18M119 53h18\"/><circle class=\"blink\" cx=\"168\" cy=\"45\" r=\"3\"/><circle class=\"blink\" style=\"animation-delay:-.6s\" cx=\"176\" cy=\"53\" r=\"3\"/><circle class=\"blink\" style=\"animation-delay:-1.2s\" cx=\"168\" cy=\"61\" r=\"3\"/><circle class=\"blink\" style=\"animation-delay:-1.8s\" cx=\"160\" cy=\"53\" r=\"3\"/></g><g class=\"rot s10\"><path d=\"M30 20l7 12H23z\"/></g><g class=\"pls\"><circle cx=\"62\" cy=\"22\" r=\"6\"/></g><g class=\"rotr s14\"><path d=\"M24 62l10 10M34 62 24 72\"/></g><g class=\"rot s16\"><rect x=\"62\" y=\"58\" width=\"10\" height=\"10\"/></g>"};
const FR="<path class=\"fr\" d=\"M8 20V8h12M180 8h12v12M192 80v12h-12M20 92H8V80\"/>",PT="<circle class=\"pt\" cx=\"24\" cy=\"12\" r=\"1.3\"/><circle class=\"pt\" cx=\"76\" cy=\"8\" r=\"1.3\"/><circle class=\"pt\" cx=\"132\" cy=\"10\" r=\"1.3\"/><circle class=\"pt\" cx=\"184\" cy=\"34\" r=\"1.3\"/><circle class=\"pt\" cx=\"14\" cy=\"50\" r=\"1.3\"/><circle class=\"pt\" cx=\"92\" cy=\"70\" r=\"1.3\"/><circle class=\"pt\" cx=\"186\" cy=\"66\" r=\"1.3\"/><circle class=\"pt\" cx=\"58\" cy=\"88\" r=\"1.3\"/>";
const vh=n=>[...n].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
const vst=g=>{const h=vh(g.name);return `transform:scaleX(${h&1?-1:1});rotate:${(h%9)-4}deg;--z:${(1+((h>>3)%5)*.04).toFixed(2)}`};
const icon=g=>`<svg class="gmsc" style="${vst(g)}" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${FR}${SC[g.genre]||SC['Sonstige']}${PT}</svg>`;
const tart=g=>`<div class="gmart gmname" style="background:${bg(g.name)}">${icon(g)}<span>${esc(g.name)}</span></div>`;
const act=g=>g.cpu||g.io||g.fso;
function badge(){const n=games.filter(act).length,b=$('#gmbadge');b.hidden=!n;b.querySelector('b').textContent=n}

function renderList(){
  const gs=['Alle',...new Set(games.map(g=>g.genre||'Sonstige'))];if(!gs.includes(genre))genre='Alle';
  $('#gmchips').innerHTML=gs.map(x=>`<span class="chip${x===genre?' on':''}" data-g="${esc(x)}">${esc(x)} <small>${x==='Alle'?games.length:games.filter(g=>(g.genre||'Sonstige')===x).length}</small></span>`).join('');
  $$('#gmchips .chip').forEach(c=>c.onclick=()=>{genre=c.dataset.g;renderList()});
  const nz=x=>String(x).toLowerCase().replace(/[^a-z0-9äöüß]/g,''),s=nz(q),l=games.filter(g=>(genre==='Alle'||(g.genre||'Sonstige')===genre)&&(!s||nz(g.name+' '+g.exes.join(' ')+' '+(g.genre||'')).includes(s)));
  $('#gmqx').hidden=!q;$('#gmqn').textContent=q||genre!=='Alle'?l.length+(l.length===1?' Treffer':' Treffer'):games.length+' Spiele';
  $('#gmgrid').innerHTML=l.length?l.map(g=>{const n=[g.cpu,g.io,g.fso].filter(Boolean).length;
    return `<button class="gmt" data-id="${esc(g.id)}" aria-label="${esc(g.name)} öffnen">${tart(g)}${img(g,false)}${g.ac?'<span class="gmac">ANTI-CHEAT</span>':''}${n?`<span class="gmon"><i></i>${n} aktiv</span>`:''}<div class="gmcap"><div class="gmct"><b>${esc(g.name)}</b><span>${esc(g.exes[0])}</span></div><em>${esc(g.genre||'Sonstige')}</em></div></button>`}).join(''):'<div class="empty">Kein Spiel gefunden – du kannst es unten über die .exe hinzufügen.</div>';
  $$('#gmgrid .gmt').forEach(t=>t.onclick=()=>open(t.dataset.id));
  badge();
}
const row=(id,name,desc,on,extra)=>`<div class="fvi card" data-k="${id}"><div class="fvic"><svg viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg></div><div class="tx"><b>${name}${extra||''}</b><span>${desc}</span></div>${on===null?'':`<div class="sw${on?' on':''}" role="switch" aria-checked="${!!on}" aria-label="${name}" tabindex="0"></div>`}</div>`;

async function open(id){
  cur=games.find(g=>g.id===id);if(!cur)return;
  try{glob=await api.list()}catch{glob=[]}
  $('#gmlist').hidden=true;$('#gmdet').hidden=false;$('main').scrollTop=0;renderDet();
}
// Beste Ingame-Einstellungen (Daten in ingame.js)
const igData=g=>(window.INGAME&&window.INGAME[g.id])||window.INGAME_GENERIC||null;
function igHtml(g){const d=igData(g);if(!d)return '';const own=!!(window.INGAME&&window.INGAME[g.id]);
  return `<div class="gmsec">BESTE INGAME-EINSTELLUNGEN <span class="tag ${own?'g':'m'}">${own?'MAX FPS':'ALLGEMEIN'}</span></div><div class="panel card igbox">
   ${d.n?`<p class="ign">${esc(d.n)}</p>`:''}
   ${d.s.map(([t,l])=>`<div class="igh">${esc(t)}</div><div class="igl">${l.map(([k,v])=>`<div class="igr"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`).join('')}
   <div class="igf"><small class="dim">Richtwerte für maximale Performance. Namen können je nach Spiel-Update leicht abweichen; Texturen immer nach VRAM wählen.</small><button class="btn" id="igcp">Als Text kopieren</button></div></div>`}
function renderDet(){
  const g=cur,gm=glob.find(t=>t.id==='gamemode'),dv=glob.find(t=>t.id==='gamedvr');
  $('#gmdet').innerHTML=`<button class="btn gmback" id="gmback">← Alle Spiele</button>
  <div class="gmhero">${art(g)}${img(g,true)}<div class="gmbtns"><button class="btn" id="gmcover">🖼 Bild ändern</button>${g.cover?'<button class="btn" id="gmcoverx">Bild entfernen</button>':''}</div><div class="gmhi"><h1>${esc(g.name)}${g.ac?' <span class="tag o" title="Anti-Cheat: '+esc(g.ac)+'">ANTI-CHEAT</span>':''}</h1><span>${esc(g.exes.join(', '))}</span></div></div>
  <div class="gmsec">SPIEL-TWEAKS</div><div class="gmrows">
   ${row('cpu','Hohe CPU-Priorität','Das Spiel bekommt bevorzugt Prozessorzeit (ab nächstem Start).',g.cpu,'<span class="tag g">AKTIV</span>')}
   ${row('io','Hohe I/O-Priorität','Mehr Priorität beim Laden von Daten und Assets.',g.io,'<span class="tag g">AKTIV</span>')}
   ${g.path?row('fso','Fullscreen-Optimierungen aus','Echter Vollbildmodus, geringere Eingabeverzögerung.<br><small class="dim">'+esc(g.path)+' · <a href="#" id="gmrepath">ändern</a></small>',g.fso,'<span class="tag g">AKTIV</span>')
     :row('fso','Fullscreen-Optimierungen aus','Dafür die Spiel-.exe auswählen (Rechtsklick im Spielordner → Pfad).',null,'<span class="tag m">EXE NÖTIG</span>')+''}
   ${g.path?'':'<div class="fvi card"><div class="tx"><b>Spiel-.exe wählen</b><span>Wird nur für die Fullscreen-Optimierungen gebraucht.</span></div><button class="btn" id="gmpick">Auswählen</button></div>'}
   <div class="fvi card"><div class="fvic"><svg viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg></div><div class="tx"><b>Shader-Cache leeren<span class="tag o">EINMALIG</span></b><span>Hilft bei Rucklern nach Treiber- oder Spiel-Updates.</span></div><button class="btn" id="gmshader">Leeren</button></div>
  </div>
  <div class="gmsec">SYSTEMWEIT</div><div class="gmrows">
   ${gm?row('g_gamemode','Game Mode aktivieren','Windows priorisiert das laufende Spiel.',gm.active):''}
   ${dv?row('g_gamedvr','Game DVR / Aufnahme aus','Weniger FPS-Einbrüche durch Hintergrundaufnahme.',dv.active):''}
  </div>
  ${igHtml(g)}
  ${(g.tip||g.tips.length)?'<div class="gmsec">TIPPS</div><div class="panel card gmbox">'+(g.tip?`<div class="gmcmd"><span class="dim">${g.id==='minecraft'?'JVM-Argumente:':'Startoptionen:'}</span><code>${esc(g.tip)}</code><button class="btn" id="gmcp">Kopieren</button></div>`:'')+(g.tips.length?'<ul>'+g.tips.map(t=>`<li>${esc(t)}</li>`).join('')+'</ul>':'')+'</div>':''}
  ${g.custom?'<div class="acts mt"><button class="btn dng" id="gmrm">Spiel aus Liste entfernen</button></div>':''}`;
  $('#gmback').onclick=back;
  $$('#gmdet .fvi[data-k]').forEach(el=>{const sw=el.querySelector('.sw');if(!sw)return;const go=()=>tog(el.dataset.k,sw);sw.onclick=go;sw.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();go()}}});
  const pk=$('#gmpick'),rp=$('#gmrepath');
  const pick=async e=>{if(e)e.preventDefault();const p=await A().gmPickExe(g.id);if(p){g.path=p;g.fso=(await A().gmList()).find(x=>x.id===g.id).fso;renderDet()}};
  if(pk)pk.onclick=pick;if(rp)rp.onclick=pick;
  $('#gmshader').onclick=async e=>{e.currentTarget.disabled=true;const r=await A().fvClean('shader');e.currentTarget.disabled=false;tst(r.ok?`Shader-Cache geleert (${fm(r.freed||0)})`:'Fehlgeschlagen')};
  const ic=$('#igcp');if(ic)ic.onclick=async()=>{const d=igData(g),t=g.name+' – Ingame-Einstellungen\n'+d.s.map(([h,l])=>'\n'+h+'\n'+l.map(([k,v])=>'  '+k+': '+v).join('\n')).join('\n');try{await navigator.clipboard.writeText(t);tst('Einstellungen kopiert')}catch{tst('Kopieren nicht möglich')}};
  const cp=$('#gmcp');if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(g.tip);tst(g.id==='minecraft'?'Kopiert – im Launcher unter Installationen → JVM-Argumente einfügen':'Kopiert – in Steam: Eigenschaften → Startoptionen einfügen')}catch{tst(g.tip)}};
  $('#gmcover').onclick=async()=>{if(await A().gmPickCover(g.id)){games=await A().gmList();cur=games.find(x=>x.id===g.id);renderDet();tst('Bild gespeichert')}};
  const cx=$('#gmcoverx');if(cx)cx.onclick=async()=>{await A().gmClearCover(g.id);games=await A().gmList();cur=games.find(x=>x.id===g.id);renderDet()};
  const rm=$('#gmrm');if(rm)rm.onclick=async()=>{await A().gmRemove(g.id);games=await A().gmList();back()};
}
async function tog(k,sw){
  const g=cur;sw.classList.add('busy');
  if(k==='g_gamemode'||k==='g_gamedvr'){const t=glob.find(x=>x.id===(k==='g_gamemode'?'gamemode':'gamedvr'));const r=await api.set(t.id,!t.active);t.active=r.active;tst(r.ok?`${t.name}: ${t.active?'aktiviert':'deaktiviert'}`:'Fehlgeschlagen – als Administrator starten?');renderDet();return}
  if(k==='fso'){const r=await A().gmFso(g.id,!g.fso);g.fso=r.active;tst(r.ok?`Fullscreen-Optimierungen ${g.fso?'deaktiviert':'wieder an'}`:'Fehlgeschlagen');renderDet();return}
  if(!g[k]&&g.ac&&!confirm(`${g.name} nutzt ${g.ac}. Eine geänderte Prozess-Priorität kann bei Anti-Cheat-Systemen Probleme verursachen. Trotzdem aktivieren?`)){sw.classList.remove('busy');return}
  const r=await A().gmSet(g.id,k,!g[k]);g[k]=r.active;tst(r.ok?`${g.name}: ${g[k]?'aktiviert (ab nächstem Start)':'zurückgesetzt'}`:'Fehlgeschlagen – als Administrator starten?');renderDet();
}
function back(){cur=null;$('#gmdet').hidden=true;$('#gmlist').hidden=false;renderList()}
async function load(){games=await A().gmList();if(cur){cur=games.find(g=>g.id===cur.id)||null}cur?renderDet():renderList()}
$('#gmq').oninput=e=>{q=e.target.value;renderList()};
$('#gmqx').onclick=()=>{q='';$('#gmq').value='';renderList();$('#gmq').focus()};
$('#gmq').onkeydown=e=>{if(e.key==='Escape'&&q){q='';e.target.value='';renderList()}};
document.addEventListener('keydown',e=>{if(e.key==='/'&&$('#p-games').classList.contains('on')&&!$('#gmlist').hidden&&!/^(INPUT|TEXTAREA)$/.test((document.activeElement||{}).tagName)){e.preventDefault();$('#gmq').focus()}});
$('#gmaddb').onclick=async()=>{const r=await A().gmAdd($('#gmexe').value);if(!r.ok){tst(r.error||'Fehlgeschlagen');return}$('#gmexe').value='';await load();tst('Spiel hinzugefügt')};
$('#gmexe').onkeydown=e=>{if(e.key==='Enter')$('#gmaddb').click()};
const _show=window.show;window.show=function(p){_show(p);if(p==='games'){if(cur)back();load()}};
setTimeout(()=>A().gmList().then(l=>{games=l;badge()}).catch(()=>{}),500);
})();
