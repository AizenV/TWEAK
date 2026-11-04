// Design-System aus dem PC-Checker-Dashboard (1:1 übernommen, an Attack.tweaks angepasst)
(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],KEY='attack.tweaks.ui';
const eh=x=>String(x).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const toast=m=>{const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),2200)};
const HEXR=/^#[0-9a-f]{6}$/i;
const ico={
 dl:'<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 20h16"/></svg>',
 key:'<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/></svg>',
 code:'<svg viewBox="0 0 24 24"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>',
 file:'<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"/></svg>',
 search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 up:'<svg viewBox="0 0 24 24"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16"/></svg>',
 user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
 pulse:'<svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
 shield:'<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
 hash:'<svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18"/></svg>',
 monitor:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
 clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};
function pick(cb,w){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,w/im.width),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.8))};im.src=r.result};r.readAsDataURL(f)};i.click()}
const SCHEMES={
 graphit:{n:'Graphit',bg:'#0b0b0b',panel:'#141414',line:'#333333',fg:'#f2f2f2',mute:'#a3a3a3'},
 mitternacht:{n:'Mitternacht',bg:'#0a0e1f',panel:'#111830',line:'#243055',fg:'#e6ecff',mute:'#8f9bc4'},
 amoled:{n:'AMOLED',bg:'#000000',panel:'#0b0b0b',line:'#232323',fg:'#ffffff',mute:'#9a9a9a'},
 wald:{n:'Wald',bg:'#0a110c',panel:'#121c15',line:'#243a2a',fg:'#e6f0e8',mute:'#8fb09a'},
 daemmerung:{n:'Dämmerung',bg:'#15100d',panel:'#1e1713',line:'#3a2d24',fg:'#f3ebe4',mute:'#b09c8c'},
 kontrast:{n:'Hoher Kontrast',bg:'#000000',panel:'#000000',line:'#ffffff',fg:'#ffffff',mute:'#e0e0e0'},
 hell:{n:'Hell',bg:'#f3f4f7',panel:'#ffffff',line:'#d3d8e2',fg:'#14161c',mute:'#5b6372',light:1},
 nord:{n:'Nord',bg:'#2e3440',panel:'#3b4252',line:'#4c566a',fg:'#eceff4',mute:'#a9b2c6'},
 rose:{n:'Rosé',bg:'#170d12',panel:'#22141b',line:'#44232f',fg:'#f8e9ee',mute:'#c49aa8'},
 violett:{n:'Violett',bg:'#08070c',panel:'#100f16',line:'#2d2940',fg:'#f3f1f8',mute:'#a29cb5'},
 sand:{n:'Sand-Dunkel',bg:'#0b1a1c',panel:'#12272a',line:'#234449',fg:'#e3f1f0',mute:'#8db3b5'},
 papier:{n:'Papier',bg:'#f2ebdc',panel:'#fbf7ec',line:'#d8ccb2',fg:'#2b2518',mute:'#76694f',light:1},
 auto:{n:'Automatisch (System)'}};
const ACCS=['#d4d4d8','#3b82f6','#818cf8','#d4d4d8','#ec4899','#ef4444','#f97316','#f59e0b','#a3e635','#22c55e','#14b8a6','#22d3ee'];
const FONTS={system:"'Inter',system-ui,-apple-system,'Segoe UI',sans-serif",humanist:"'Segoe UI','Trebuchet MS',Optima,Candara,sans-serif",serif:"Georgia,'Times New Roman',serif",mono:"ui-monospace,'JetBrains Mono',Consolas,'Courier New',monospace",round:"'Nunito','Varela Round','Trebuchet MS',ui-rounded,system-ui,sans-serif"};

const SD={scheme:'graphit',accent:'',bg:'',panel:'',text:'',good:'',warn:'',bad:'',cb:false,fx:'none',fxStr:.5,bgDim:.75,fontBody:'system',fontHead:'system',scale:100,radius:14,cardStyle:'border',density:'normal',borderW:'thin',lh:'normal',chip:'standard',monoNums:false,stripes:false,focus:false,anim:true,
 sbPos:'left',sbMode:'full',sbW:236,maxW:'mid',eqCards:false,kpiMode:'normal',pageSub:true,menuSize:'normal',grpHeads:true,
 nav:{order:{},hidden:[]},dashRefresh:30,dashTitle:'',dashDate:true,dashQuick:true,kpi:{cpu:true,gpu:true,ram:true,up:true},blocks:{kpis:true,sys:true,score:true},tpl:'standard'};
const OPT={scheme:Object.keys(SCHEMES),fx:['none','glow','grid','radar','rain','net'],fontBody:Object.keys(FONTS),fontHead:Object.keys(FONTS),cardStyle:['flat','shadow','glass','border','filled'],density:['compact','normal','loose'],borderW:['none','thin','strong'],lh:['tight','normal','wide'],chip:['square','standard','round'],sbPos:['left','right'],sbMode:['full','icons','hidden'],maxW:['full','wide','mid','narrow'],kpiMode:['normal','compact'],menuSize:['small','normal','large'],tpl:['standard','fokus','analyse','minimal','custom']};
const NUM={fxStr:[0,1],bgDim:[0,1],scale:[80,130],radius:[0,28],sbW:[190,320],dashRefresh:[0,30]};
const mergeSet=(base,inc)=>{const o=JSON.parse(JSON.stringify(base));if(!inc||typeof inc!=='object')return o;
 Object.keys(SD).forEach(k=>{const v=inc[k];if(v===undefined)return;const d=SD[k];
  if(['accent','bg','panel','text','good','warn','bad'].includes(k)){o[k]=HEXR.test(v)?String(v).toLowerCase():''}
  else if(k==='dashTitle'){o[k]=String(v).replace(/[<>]/g,'').slice(0,80)}
  else if(k==='nav'){const n=v&&typeof v==='object'?v:{};o.nav={order:{},hidden:[]};if(n.order&&typeof n.order==='object')Object.keys(n.order).slice(0,12).forEach(g=>{if(Array.isArray(n.order[g]))o.nav.order[String(g).slice(0,30)]=n.order[g].filter(x=>typeof x==='string').slice(0,30)});if(Array.isArray(n.hidden))o.nav.hidden=n.hidden.filter(x=>typeof x==='string'&&x!=='settings').slice(0,30)}
  else if(k==='kpi'||k==='blocks'){Object.keys(d).forEach(x=>{if(v&&typeof v[x]==='boolean')o[k][x]=v[x]})}
  else if(OPT[k]){if(OPT[k].includes(v))o[k]=v}
  else if(NUM[k]){const n=+v;if(isFinite(n))o[k]=Math.min(NUM[k][1],Math.max(NUM[k][0],n))}
  else if(typeof d==='boolean'){if(typeof v==='boolean')o[k]=v}});
 return o};

const S={set:null,bgImg:'',brand:{name:'',logo:''}};
try{const r=JSON.parse(localStorage.getItem(KEY)||'null');if(r){S.set=r.set;S.bgImg=r.bgImg||'';S.brand=Object.assign(S.brand,r.brand||{})}}catch(e){}
S.set=mergeSet(SD,S.set);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({set:S.set,bgImg:S.bgImg,brand:S.brand}))}catch(e){}};
const getp=k=>k.split('.').reduce((o,x)=>o&&o[x],S.set),setp=(k,v)=>{const p=k.split('.'),l=p.pop();p.reduce((o,x)=>o[x],S.set)[l]=v};
const hexRGB=h=>{const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]};

/* --- Hintergrund-Effekte (Canvas) --- */
const FX={c:null,x:null,raf:0,P:[],cols:[],W:0,H:0,last:0};
const fxSize=()=>{if(!FX.c)return;const R=Math.min(devicePixelRatio||1,2);FX.W=innerWidth;FX.H=innerHeight;FX.c.width=FX.W*R;FX.c.height=FX.H*R;FX.x.setTransform(R,0,0,R,0,0);
 const n=Math.min(80,Math.round(FX.W*FX.H/18000));FX.P=Array.from({length:n},()=>({x:Math.random()*FX.W,y:Math.random()*FX.H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35}));
 FX.cols=Array.from({length:Math.ceil(FX.W/16)},()=>({y:Math.random()*-FX.H,v:2+Math.random()*3.5}))};
const fxFrame=(t,step)=>{const s=S.set,x=FX.x,W=FX.W,H=FX.H,a=s.fxStr,[r,g,b]=hexRGB(HEXR.test(s.accent)?s.accent:(s.scheme==='violett'?'#8b5cf6':'#e5e5e5')),C=al=>`rgba(${r},${g},${b},${al})`;
 if(s.fx==='rain'){x.globalCompositeOperation='destination-out';x.fillStyle='rgba(0,0,0,.09)';x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';x.font='14px ui-monospace,Consolas,monospace';
  FX.cols.forEach((c,i)=>{c.y+=c.v;if(c.y>H+20){c.y=Math.random()*-200;c.v=2+Math.random()*3.5}x.fillStyle=C(.85*a);x.fillText('01ABCDEF<>/{}$#'[Math.random()*15|0],i*16,c.y)});return}
 x.clearRect(0,0,W,H);
 if(s.fx==='glow'){for(let i=0;i<3;i++){const bx=W*(.5+.36*Math.sin(t*.0003+i*2.1)),by=H*(.5+.3*Math.cos(t*.0004+i*1.7)),rr=Math.max(W,H)*.5,gr=x.createRadialGradient(bx,by,0,bx,by,rr);gr.addColorStop(0,C(.4*a));gr.addColorStop(1,C(0));x.fillStyle=gr;x.fillRect(0,0,W,H)}}
 else if(s.fx==='grid'){const st=46,o=(t*.012)%st;x.strokeStyle=C(.22*a);x.lineWidth=1;x.beginPath();for(let i=-st;i<W+st;i+=st){x.moveTo(i+o,0);x.lineTo(i+o,H)}for(let j=-st;j<H+st;j+=st){x.moveTo(0,j+o);x.lineTo(W,j+o)}x.stroke()}
 else if(s.fx==='radar'){const cx=W*.5,cy=H*.55,R=Math.min(W,H)*.48;x.strokeStyle=C(.28*a);x.lineWidth=1;for(let i=1;i<=4;i++){x.beginPath();x.arc(cx,cy,R*i/4,0,6.283);x.stroke()}x.beginPath();x.moveTo(cx-R,cy);x.lineTo(cx+R,cy);x.moveTo(cx,cy-R);x.lineTo(cx,cy+R);x.stroke();
  const an=t*.0009;for(let i=0;i<30;i++){x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,R,an-(i+1)*.03,an-i*.03);x.closePath();x.fillStyle=C(.4*a*Math.pow(1-i/30,1.5));x.fill()}}
 else if(s.fx==='net'){const P=FX.P;P.forEach(p=>{if(step){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1}});
  for(let i=0;i<P.length;i++){for(let j=i+1;j<P.length;j++){const dx=P[i].x-P[j].x,dy=P[i].y-P[j].y,d=dx*dx+dy*dy;if(d<17000){x.strokeStyle=C(.5*a*(1-d/17000));x.lineWidth=1;x.beginPath();x.moveTo(P[i].x,P[i].y);x.lineTo(P[j].x,P[j].y);x.stroke()}}x.fillStyle=C(.85*a);x.beginPath();x.arc(P[i].x,P[i].y,1.8,0,6.283);x.fill()}}};
function fxStart(){const s=S.set;cancelAnimationFrame(FX.raf);
 if(s.fx==='none'){if(FX.c)FX.c.style.display='none';return}
 if(!FX.c){const c=document.createElement('canvas');c.id='fxc';c.setAttribute('aria-hidden','true');document.body.prepend(c);FX.c=c;FX.x=c.getContext('2d');addEventListener('resize',fxSize)}
 FX.c.style.display='';fxSize();FX.x.clearRect(0,0,FX.W,FX.H);
 const still=!s.anim||matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(still){if(s.fx==='rain')for(let i=0;i<70;i++)fxFrame(i*40,true);else fxFrame(4000,false);return}
 const loop=now=>{FX.raf=requestAnimationFrame(loop);if(document.hidden||now-FX.last<33)return;FX.last=now;fxFrame(now,true)};FX.raf=requestAnimationFrame(loop)}

/* --- Design anwenden --- */
function applySet(){
 const s=S.set,r=document.documentElement,st=r.style,H=v=>HEXR.test(v)?v:'';
 const key=s.scheme==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'hell':'graphit'):s.scheme,sc=SCHEMES[key]||SCHEMES.violett;
 const bg=H(s.bg)||sc.bg,panel=H(s.panel)||sc.panel,fg=H(s.text)||sc.fg,mute=sc.mute,line=sc.line,acc=H(s.accent)||(s.scheme==='violett'?'#8b5cf6':'#e5e5e5'),set=(k,v)=>st.setProperty(k,v);
 st.colorScheme=sc.light?'light':'dark';
 set('--bg',bg);set('--panel',panel);set('--panel2',`color-mix(in srgb,${panel} 93%,${fg})`);set('--line2',line);set('--line',`color-mix(in srgb,${line} 55%,${bg})`);set('--fg',fg);set('--mute',mute);set('--dim',`color-mix(in srgb,${mute} 65%,${bg})`);
 set('--inbg',`color-mix(in srgb,${bg} 72%,${panel})`);set('--side',`color-mix(in srgb,${bg} 80%,transparent)`);
 {const [rr,gg,bb]=hexRGB(acc);set('--onacc',(.299*rr+.587*gg+.114*bb)>150?'#111':'#fff')}set('--accent',acc);set('--accent2',`color-mix(in srgb,${acc} 62%,#fff)`);set('--accent-soft',`color-mix(in srgb,${acc} 14%,transparent)`);
 const sg=s.cb?{good:'#3b82f6',warn:'#eab308',bad:'#f97316'}:{good:'#34d399',warn:'#f5b83d',bad:'#f2566f'};['good','warn','bad'].forEach(k=>set('--'+k,H(s[k])||sg[k]));
 if(s.fontBody==='system')st.removeProperty('--sans');else set('--sans',FONTS[s.fontBody]);set('--fh',s.fontHead==='system'?'var(--sans)':FONTS[s.fontHead]);
 set('--r',s.radius+'px');set('--bw',{none:'0px',thin:'1px',strong:'2px'}[s.borderW]);set('--lh',{tight:1.3,normal:1.45,wide:1.65}[s.lh]);set('--zoom',s.scale/100);
 set('--sbc',(s.sbMode==='icons'?68:s.sbW)+'px');
 const D2=r.dataset;D2.card=s.cardStyle;D2.dens=s.density;D2.chip=s.chip;D2.sb=s.sbMode;D2.sbpos=s.sbPos;D2.mw=s.maxW;D2.kpi=s.kpiMode;D2.menu=s.menuSize;
 D2.mono=+s.monoNums;D2.stripes=+s.stripes;D2.focus=+s.focus;D2.anim=+s.anim;D2.eq=+s.eqCards;D2.sub=+s.pageSub;D2.grp=+s.grpHeads;D2.dd=+s.dashDate;D2.dq=+s.dashQuick;
 D2.bk=+s.blocks.kpis;D2.bs=+s.blocks.sys;D2.bp=+s.blocks.score;D2.k1=+s.kpi.cpu;D2.k2=+s.kpi.gpu;D2.k3=+s.kpi.ram;D2.k4=+s.kpi.up;
 const img=S.bgImg&&/^data:image\//.test(S.bgImg),b=document.body.style;D2.see=+(img||s.fx!=='none');
 if(img){const c=`color-mix(in srgb,${bg} ${Math.round(s.bgDim*100)}%,transparent)`;b.backgroundImage=`linear-gradient(${c},${c}),url(${S.bgImg})`;b.backgroundSize='cover';b.backgroundPosition='center'}
 else{const k=sc.light?.1:.2;b.backgroundImage=`radial-gradient(900px 500px at 70% -10%,color-mix(in srgb,${acc} ${k*100}%,transparent),transparent 60%),radial-gradient(600px 400px at 0% 100%,color-mix(in srgb,${acc} ${k*60}%,transparent),transparent 60%)`;b.backgroundSize='';b.backgroundPosition=''}
 fxStart()}
function applyTheme(){applySet()}
matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{if(S.set.scheme==='auto')applySet()});


const NAVG=(()=>{const g=[];let cur=null;[...$('nav').children].forEach(e=>{if(e.classList.contains('grp')){cur={name:e.textContent.trim(),h:e,items:[]};g.push(cur)}else if(e.classList.contains('nav')&&cur)cur.items.push(e)});return g})();
const navOrder=g=>{const o=(S.set.nav.order[g.name]||[]).filter(p=>g.items.some(e=>e.dataset.p===p));g.items.forEach(e=>{if(!o.includes(e.dataset.p))o.push(e.dataset.p)});return o};
function applyNav(){const hid=S.set.nav.hidden;NAVG.forEach(g=>{let ref=g.h;navOrder(g).forEach(p=>{const e=g.items.find(x=>x.dataset.p===p);ref.after(e);ref=e;e.hidden=(hid.includes(p)&&p!=='settings')});g.h.hidden=g.items.every(e=>e.hidden)})}
/* --- Einstellungsseite --- */
let setTab='design',dashEdit=false;
const TABS=[['design','Design'],['layout','Layout'],['nav','Navigation'],['dash','Dashboard'],['gen','Allgemein'],['save','Sichern']];
const RF={fxStr:v=>(+v).toFixed(2).replace(/0$/,''),bgDim:v=>(+v).toFixed(2).replace(/0$/,''),scale:v=>v+' %',radius:v=>v+' px',sbW:v=>v+' px'};
const crd=(ic,t,d,body)=>`<div class="card mt"><div class="h"><div class="ic">${ico[ic]}</div><div><h3>${t}</h3>${d?`<p>${d}</p>`:''}</div></div>${body}</div>`;
const srow=(l,d,c)=>`<div class="srow"><div><b>${l}</b>${d?`<small>${d}</small>`:''}</div><div class="sctl">${c}</div></div>`;
const seg=(k,o)=>`<div class="seg" data-seg="${k}">${o.map(([v,l])=>`<button type="button" data-v="${v}" class="${String(getp(k))===String(v)?'on':''}">${l}</button>`).join('')}</div>`;
const tog=(k,l,d,dis)=>srow(l,d,`<label class="tg"><input type="checkbox" data-tg="${k}" ${getp(k)?'checked':''} ${dis?'disabled':''}><i></i></label>`);
const rng=(k,l,d,mn,mx,sp)=>srow(l,d,`<div class="rg2"><input type="range" data-rg="${k}" min="${mn}" max="${mx}" step="${sp}" value="${getp(k)}" aria-label="${l}"><output>${(RF[k]||(v=>v))(getp(k))}</output></div>`);
const curSch=()=>{const s=S.set.scheme==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'hell':'graphit'):S.set.scheme;return SCHEMES[s]||SCHEMES.violett};
const colr=(k,l,d,def)=>{const v=S.set[k];return srow(l,d,`<input type="color" class="cs" data-col="${k}" value="${v||def}" aria-label="${l}">${v?`<button class="btn xs" data-clr="${k}">Standard</button>`:''}`)};
const FOPT=[['system','System'],['humanist','Humanist'],['serif','Serif'],['mono','Mono'],['round','Rund']];
const sDesign=()=>{const s=S.set,sc=curSch(),dflt={good:'#34d399',warn:'#f5b83d',bad:'#f2566f'};
 const sch=Object.entries(SCHEMES).map(([k,v])=>`<button type="button" class="sch ${s.scheme===k?'on':''}" data-sch="${k}"><div class="pv">${k==='auto'?`<i style="background:${SCHEMES.graphit.bg}"></i><i style="background:${SCHEMES.hell.bg}"></i>`:`<i style="background:${v.bg}"></i><i style="background:${v.panel}"></i>`}</div>${v.n}</button>`).join('');
 return crd('monitor','Farbschema','Fertige Designs. Ein Klick wechselt das ganze Dashboard.',`<div class="schemes">${sch}</div>`)
 +crd('pulse','Farben','',srow('Akzentfarbe','Buttons, Markierungen, Diagramme',`<div class="dots">${ACCS.map(c=>`<button type="button" class="dot ${s.accent===c?'on':''}" data-acc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" class="cs" data-col="accent" value="${s.accent||'#e5e5e5'}" aria-label="Eigene Akzentfarbe"></div>`)
  +colr('bg','Hintergrund','Eigene Farbe statt Schema',sc.bg)+colr('panel','Karten und Flächen','',sc.panel)+colr('text','Textfarbe','',sc.fg)
  +srow('Statusfarben','Gut, Warnung, Kritisch (leer = Standard)',['good','warn','bad'].map(k=>`<input type="color" class="cs" data-col="${k}" value="${s[k]||dflt[k]}" aria-label="${k}">`).join('')+(s.good||s.warn||s.bad?`<button class="btn xs" data-clr="status">Standard</button>`:''))
  +tog('cb','Farbenblind-freundlich','Ersetzt Rot/Grün durch Orange/Blau'))
 +crd('file','Hintergrund','',srow('Effekt','',seg('fx',[['none','Keiner'],['glow','Glühen'],['grid','Raster'],['radar','Radar-Scan'],['rain','Code-Regen'],['net','Netzwerk']]))
  +rng('fxStr','Stärke','Sichtbarkeit der Bewegung',0,1,.05)
  +srow('Eigenes Bild','Wird nur in diesem Browser gespeichert',`<button class="btn" data-act="bgpick">${ico.up}Bild wählen</button>${S.bgImg?'<button class="btn del" data-act="bgdel">Entfernen</button>':''}`)
  +rng('bgDim','Abdunkelung','Je höher, desto ruhiger',0,.95,.05))
 +crd('code','Schrift','',srow('Textschrift','Systemschriften, es wird nichts nachgeladen',seg('fontBody',FOPT))+srow('Überschriften','',seg('fontHead',FOPT))+rng('scale','Oberflächen-Größe','Skaliert alles am Desktop',80,130,5))
 +crd('hash','Form und Dichte','',rng('radius','Eckenradius','',0,28,1)+srow('Kartenstil','',seg('cardStyle',[['flat','Flach'],['shadow','Schatten'],['glass','Glas'],['border','Rahmen'],['filled','Gefüllt']]))
  +srow('Dichte','Abstände in Karten und Tabellen',seg('density',[['compact','Kompakt'],['normal','Normal'],['loose','Luftig']]))
  +srow('Rahmenstärke','Linien um Karten',seg('borderW',[['none','Keine'],['thin','Dünn'],['strong','Kräftig']]))
  +srow('Zeilenabstand','Text',seg('lh',[['tight','Eng'],['normal','Normal'],['wide','Weit']]))
  +srow('Schweregrad-Chips','Form der Markierungen',seg('chip',[['square','Eckig'],['standard','Standard'],['round','Rund']]))
  +tog('monoNums','Zahlen in Mono-Schrift','Kennzahlen und Tabellen')+tog('stripes','Tabellen-Streifen','Jede zweite Zeile abheben')+tog('focus','Starker Fokusrahmen','Besser sichtbar bei Tastaturbedienung')+tog('anim','Animationen','Einblenden und Übergänge'))};
const sLayout=()=>crd('monitor','Seitenleiste','Nur am Desktop. Am Handy bleibt das Menü ausklappbar.',srow('Position','',seg('sbPos',[['left','Links'],['right','Rechts']]))+srow('Darstellung','',seg('sbMode',[['full','Voll'],['icons','Nur Symbole'],['hidden','Versteckt']]))+rng('sbW','Breite','',190,320,2))
 +crd('file','Inhalt','',srow('Maximale Breite','Auf breiten Monitoren begrenzen',seg('maxW',[['full','Voll'],['wide','Weit'],['mid','Mittel'],['narrow','Schmal']]))+tog('eqCards','Gleich hohe Karten','Karten einer Zeile gleich hoch strecken')+srow('Kennzahlen-Karten','Kompakt blendet die Mini-Diagramme aus',seg('kpiMode',[['normal','Normal'],['compact','Kompakt']]))+tog('pageSub','Seitenuntertitel','Zeile unter der Seitenüberschrift'))
 +crd('hash','Menü','',srow('Menügröße','',seg('menuSize',[['small','Klein'],['normal','Normal'],['large','Groß']]))+tog('grpHeads','Gruppenüberschriften','Platform, Verwaltung ...'));
const sNav=()=>crd('hash','Navigation','Menüpunkte ausblenden und innerhalb ihrer Gruppe verschieben.',NAVG.map(g=>{const o=navOrder(g);return `<div class="sgl">${eh(g.name)}</div>`+o.map((p,i)=>{const e=g.items.find(x=>x.dataset.p===p),svg=e.querySelector('svg'),nm=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('')||p;
  return `<div class="navr">${svg?svg.outerHTML:''}<span class="nm">${eh(nm)}</span><button class="ib" data-mv="${eh(g.name)}|${p}|-1" ${i==0?'disabled':''} aria-label="Nach oben">↑</button><button class="ib" data-mv="${eh(g.name)}|${p}|1" ${i==o.length-1?'disabled':''} aria-label="Nach unten">↓</button><label class="tg"><input type="checkbox" data-nv="${p}" ${S.set.nav.hidden.includes(p)&&p!=='settings'?'':'checked'} ${p==='settings'?'disabled':''}><i></i></label></div>`}).join('')}).join('')+`<div class="row mt"><button class="btn" data-act="navreset">Reihenfolge zurücksetzen</button></div>`);

const TPL={standard:{blocks:{kpis:1,sys:1,score:1},dashDate:1,dashQuick:1},fokus:{blocks:{kpis:1,sys:0,score:1},dashDate:1,dashQuick:1},analyse:{blocks:{kpis:1,sys:1,score:0},dashDate:1,dashQuick:0},minimal:{blocks:{kpis:1,sys:0,score:0},dashDate:0,dashQuick:0}};
const dashBlocks=()=>tog('blocks.kpis','Kennzahlen-Karten','Die vier Karten oben')+tog('blocks.sys','Systeminformationen','Computer, System, Prozessor, Grafikkarte, RAM')+tog('blocks.score','Optimierungsgrad','Kreis mit „Alle empfohlenen anwenden“');
const kpiTogs=()=>tog('kpi.cpu','CPU')+tog('kpi.gpu','GPU')+tog('kpi.ram','RAM')+tog('kpi.up','Laufzeit');
const sDash=()=>crd('pulse','Dashboard','Aufbau direkt auf dem Dashboard über „Anpassen“ ändern.',srow('Aktualisierung','Wie oft die Systemdaten neu geladen werden',seg('dashRefresh',[[5,'5 s'],[15,'15 s'],[30,'30 s'],[0,'Manuell']]))
  +srow('Überschrift','Leer = „Dashboard“. {name} wird durch den Computernamen ersetzt.',`<input class="in stx" data-tx="dashTitle" maxlength="80" placeholder="Dashboard" value="${eh(S.set.dashTitle)}">`)
  +tog('dashDate','Datum und Statuszeile','')+tog('dashQuick','Schnellaktionen oben','Tweaks, Cleaner, Wiederherstellungspunkt'))
 +crd('shield','Kennzahlen','Welche der vier Karten angezeigt werden.',kpiTogs())
 +crd('monitor','Dashboard-Bereiche','',dashBlocks())
 +crd('monitor','Layout-Vorlagen','',`<div class="row" style="align-items:center">${[['standard','Standard'],['fokus','Fokus'],['analyse','Analyse'],['minimal','Minimal']].map(([k,l])=>`<button class="btn ${S.set.tpl===k?'pri':''}" data-tpl="${k}">${l}</button>`).join('')}<span class="sp" style="flex:1"></span><button class="btn" data-act="dashnow">${ico.pulse}Dashboard jetzt anpassen</button></div>`);
const sGen=()=>crd('file','Branding','',`<div class="row"><div class="fld"><span class="lbl">Name</span><input class="in" id="bn" maxlength="40" value="${eh(S.brand.name||'')}" placeholder="Attack.tweaks"></div><button class="btn" data-act="logo">Logo wählen</button><button class="btn pri" data-act="brand">Speichern</button></div>`)
 +crd('shield','Tweaks zurücksetzen','Stellt die gesicherten Originalwerte aller Tweaks wieder her.',`<div class="row"><button class="btn del" data-act="resetTweaks">Alle Tweaks zurücksetzen</button></div>`)
 +crd('hash','Hinweis','',`<p style="color:var(--mute)">Manche Tweaks benötigen Administratorrechte oder einen Neustart (gekennzeichnet). Erstelle vorher bei Bedarf einen Wiederherstellungspunkt.</p>`);
const sSave=()=>crd('dl','Design sichern','Exportiert Farben, Layout, Navigation und Dashboard als Datei (ohne Hintergrundbild). Praktisch für den zweiten PC oder zum Teilen.',`<div class="row"><button class="btn" data-act="export">${ico.dl}Exportieren</button><button class="btn" data-act="import">${ico.up}Importieren</button></div><input type="file" id="impf" accept="application/json,.json" hidden>`)
 +crd('shield','Zurücksetzen','',`<div class="row"><button class="btn" data-act="resetdesign">Nur Design zurücksetzen</button><button class="btn del" data-act="resetall">Alle lokalen Daten zurücksetzen</button></div>`);
const PANELS={design:sDesign,layout:sLayout,nav:sNav,dash:sDash,gen:sGen,save:sSave};
const commit=()=>{save();applySet();applyNav();applyUI();dashTick()};
const repaintSet=()=>{const b=$('#setbody');if(!b)return;const mn=$('main'),y=mn.scrollTop;b.innerHTML=PANELS[setTab]();mn.scrollTop=y};
const dl=(name,text,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2e3)};
const act={
 bgpick:()=>pick(d=>{S.bgImg=d;commit();repaintSet()},1600),bgdel:()=>{delete S.bgImg;commit();repaintSet()},
 navreset:()=>{S.set.nav={order:{},hidden:[]};commit();repaintSet()},
 dashnow:()=>{dashEdit=true;show('dashboard');dashEd()},
 logo:()=>pick(d=>{S.brand.logo=d;save();applyUI();toast("Logo gesetzt")},128),
 brand:()=>{S.brand.name=$("#bn").value.trim();save();applyUI();toast("Gespeichert")},
 resetTweaks:()=>window.resetAllTweaks(),
 export:()=>{dl('design-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({atkDesign:1,set:S.set,brandName:S.brand.name||''},null,1),'application/json');toast('Design exportiert')},
 import:()=>$('#impf').click(),
 resetdesign:()=>{if(!confirm('Alle Design-Einstellungen auf Standard zurücksetzen?'))return;S.set=mergeSet(SD,{});delete S.bgImg;commit();repaintSet();toast('Design zurückgesetzt')},
 resetall:()=>{if(!confirm('Wirklich alle lokalen Daten dieses Browsers zurücksetzen?'))return;localStorage.removeItem(KEY);location.reload()}};
const afterChange=k=>{commit();if(/^blocks\.|^kpi\./.test(k)&&window.dashPaint)window.dashPaint(true)};
function bindSettings(){const root=$('#setroot');
 root.onclick=e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.tab){setTab=t.dataset.tab;$$('.tabs button').forEach(b=>b.classList.toggle('on',b===t));repaintSet();return}
  if(t.dataset.sch){S.set.scheme=t.dataset.sch;S.set.bg=S.set.panel=S.set.text='';commit();repaintSet();return}
  if(t.dataset.acc){S.set.accent=t.dataset.acc;commit();repaintSet();return}
  if(t.dataset.clr){if(t.dataset.clr==='status')S.set.good=S.set.warn=S.set.bad='';else S.set[t.dataset.clr]='';commit();repaintSet();return}
  if(t.parentElement.dataset.seg){const k=t.parentElement.dataset.seg;let v=t.dataset.v;if(typeof SD[k]==='number')v=+v;setp(k,v);commit();repaintSet();return}
  if(t.dataset.tpl){const p=TPL[t.dataset.tpl];Object.keys(p.blocks).forEach(k=>S.set.blocks[k]=!!p.blocks[k]);S.set.dashDate=!!p.dashDate;S.set.dashQuick=!!p.dashQuick;S.set.tpl=t.dataset.tpl;commit();repaintSet();return}
  if(t.dataset.mv){const[g,p,d]=t.dataset.mv.split('|'),grp=NAVG.find(x=>x.name===g),o=navOrder(grp),i=o.indexOf(p),j=i+ +d;if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];S.set.nav.order[g]=o;commit();repaintSet();return}
  if(t.dataset.act&&act[t.dataset.act])act[t.dataset.act]()};
 root.oninput=e=>{const t=e.target;
  if(t.dataset.col){S.set[t.dataset.col]=t.value.toLowerCase();commit();return}
  if(t.dataset.rg){const k=t.dataset.rg;setp(k,+t.value);const o=t.parentElement.querySelector('output');if(o)o.textContent=(RF[k]||(v=>v))(+t.value);commit();return}
  if(t.dataset.tx){S.set[t.dataset.tx]=t.value.replace(/[<>]/g,'');save();applyUI();return}};
 root.onchange=e=>{const t=e.target;
  if(t.dataset.col)repaintSet();
  else if(t.dataset.tg){setp(t.dataset.tg,t.checked);if(/^blocks\./.test(t.dataset.tg))S.set.tpl='custom';afterChange(t.dataset.tg)}
  else if(t.dataset.nv){const h=S.set.nav.hidden,p=t.dataset.nv,i=h.indexOf(p);if(t.checked&&i>-1)h.splice(i,1);if(!t.checked&&i<0)h.push(p);commit()}
  
  else if(t.id==='impf'){const f=t.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!j||!j.atkDesign||!j.set)throw 0;const keepImg=S.bgImg;S.set=mergeSet(SD,j.set);if(j.brandName)S.brand.name=String(j.brandName).replace(/[<>]/g,'').slice(0,40);S.bgImg=keepImg;commit();applyUI();repaintSet();toast('Design importiert')}catch(x){toast('Datei ist kein gültiges Design')}};r.readAsText(f)}};
};

// ---------- Anbindung an Attack.tweaks ----------
let HOST='';
function applyUI(){const nm=S.brand.name||'Attack.tweaks';document.title=nm;const b=$('.bt b');if(b)b.textContent=nm;
 if(S.brand.logo&&/^data:image\//.test(S.brand.logo)){const l=$('.logo');if(l)l.src=S.brand.logo}
 const h=$('#p-dashboard h1');if(h){const t=(S.set.dashTitle||'').trim();h.textContent=t?t.replace(/\{name\}/gi,HOST):'Dashboard'}}
function renderSettings(){const p=$('#p-settings');p.innerHTML=`<div class="hd"><h1>Einstellungen</h1><p class="sub">Änderungen wirken sofort und bleiben gespeichert.</p></div><div id="setroot"><div class="tabs" role="tablist">${TABS.map(([k,l])=>`<button type="button" role="tab" class="${k===setTab?'on':''}" data-tab="${k}">${l}</button>`).join('')}</div><div id="setbody">${PANELS[setTab]()}</div></div>`;bindSettings()}
function dashEd(){const b=$('#dcu'),e=$('#dce');if(!b||!e)return;b.textContent=dashEdit?'Fertig':'Anpassen';
 e.innerHTML=dashEdit?`<div class="panel card" id="dcp" style="margin-bottom:16px"><div class="h"><div class="ic">${ico.pulse}</div><div><h3>Dashboard anpassen</h3><p>Bereiche und Kennzahlen ein- und ausblenden.</p></div><span class="sp" style="flex:1"></span><button class="btn pri" id="dcdone">Fertig</button></div><div class="row" style="align-items:flex-start;gap:24px"><div class="fld" style="min-width:260px">${dashBlocks()}</div><div class="fld" style="min-width:220px">${kpiTogs()}</div></div></div>`:''}
window.dashPaint=()=>dashEd();
let dashIv=0;function dashTick(){clearInterval(dashIv);const n=S.set.dashRefresh,r=$('#drf');if(r)r.hidden=!!n;if(n)dashIv=setInterval(()=>{if(!document.hidden&&typeof loadSys==='function')loadSys()},n*1000)}
function dsub(){const e=$('#dsub');if(!e||!S.set.dashDate)return;let a=0,n=0;try{a=tweaks.filter(t=>t.active).length;n=tweaks.length}catch(x){}
 const d=new Date();e.innerHTML=`<span class="livedot"></span> ${d.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}${n?` · ${a} / ${n} Tweaks aktiv`:''} · Stand ${d.toTimeString().slice(0,5)}`}
const _show=window.show;window.show=function(p){_show(p);if(p==='settings')renderSettings();$('.side').classList.remove('open');$('main').scrollTop=0};
$('#menu').onclick=()=>$('.side').classList.toggle('open');
$('#p-dashboard').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
 if(t.id==='dcu'||t.id==='dcdone'){dashEdit=!dashEdit;dashEd()}else if(t.id==='drf'){loadSys();toast('Aktualisiert')}else if(t.dataset.go)window.show(t.dataset.go)});
$('#p-dashboard').addEventListener('change',e=>{const t=e.target;if(t.dataset.tg){setp(t.dataset.tg,t.checked);if(/^blocks\./.test(t.dataset.tg))S.set.tpl='custom';afterChange(t.dataset.tg)}});
if(window.api&&api.sys)api.sys().then(s=>{HOST=s.host||'';applyUI()}).catch(()=>{});
applySet();applyNav();applyUI();dashTick();dashEd();dsub();setInterval(dsub,2000);
})();
