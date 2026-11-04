// Seite „Crosshair": Einstellungen und Presets fürs Overlay (Fenster wird im Hauptprozess verwaltet)
(function(){
const $=s=>document.querySelector(s);
const SH=[['cross','Kreuz'],['crossdot','Kreuz + Punkt'],['dot','Punkt'],['circle','Kreis'],['t','T-Form']];
const COL=['#ffffff','#ff3b3b','#35e07a','#2eb5ff','#ffd23f','#ff3bd4'];
const SL=[['size','Länge',8,80,'px'],['thick','Dicke',1,8,'px'],['gap','Lücke in der Mitte',0,24,'px'],['opacity','Deckkraft',20,100,'%'],['dotSize','Punktgröße',1,10,'px'],['ox','Versatz horizontal',-60,60,'px'],['oy','Versatz vertikal',-60,60,'px']];
const BASE={shape:'cross',color:'#ffffff',size:26,thick:2,gap:4,opacity:100,outline:true,dot:false,dotSize:3,ox:0,oy:0};
const PRE=[['Klassisch',{}],['Präzise Rot',{color:'#ff3b3b',size:16,thick:1,gap:3,outline:false}],['Grüner Punkt',{shape:'dot',color:'#35e07a',size:20,dotSize:3}],
 ['Cyan Kreis',{shape:'circle',color:'#2eb5ff',size:30,thick:2,dot:true,dotSize:2}],['T-Form',{shape:'t',color:'#ffd23f',size:24,thick:2,gap:3}],
 ['Kreuz + Punkt',{shape:'crossdot',color:'#ff3bd4',size:28,gap:5,dotSize:2}],['Dick & Groß',{size:44,thick:4,gap:8,color:'#ffffff'}],['Dezent',{size:20,thick:1,gap:5,opacity:60,outline:false}]];
let c={on:false,...BASE,display:'primary',autoScale:true,onlyGame:false},disp=[];
const demo=window.api&&window.api.chGet?null:{chDisplays:()=>Promise.resolve([{id:'1',name:'Monitor 1 – 2560×1440 (Hauptmonitor)'},{id:'2',name:'Monitor 2 – 1920×1080'}]),chGet:()=>Promise.resolve({...c}),chSet:p=>{Object.assign(c,p);return Promise.resolve({...c})}};
const A=()=>demo||window.api;
function build(){
  $('#chpre').innerHTML=PRE.map(([n],i)=>`<div class="pc" data-i="${i}"><canvas width="120" height="60"></canvas>${n}</div>`).join('');
  $('#chpre').querySelectorAll('.pc').forEach((e,i)=>{const cv=e.querySelector('canvas');drawCrosshair(cv.getContext("2d"),120,60,{...BASE,...PRE[i][1]});e.onclick=()=>save({...BASE,...PRE[i][1]})});
  $('#chopts').innerHTML=SL.map(([k,l,mn,mx,u])=>`<label>${l}<b><span data-v="${k}"></span> ${u}</b><input type="range" data-k="${k}" min="${mn}" max="${mx}" step="1"></label>`).join('')
   +['outline|Schwarze Kontur','dot|Mittelpunkt zusätzlich'].map(t=>{const[k,l]=t.split('|');return `<div class="tgl">${l}<div class="sw" data-t="${k}" role="switch" tabindex="0"></div></div>`}).join('');
  $('#chopts').querySelectorAll('input').forEach(e=>{e.oninput=()=>{c[e.dataset.k]=+e.value;paint(true)};e.onchange=()=>save({[e.dataset.k]:+e.value})});
  $('#chopts').querySelectorAll('[data-t]').forEach(e=>{const go=()=>save({[e.dataset.t]:!c[e.dataset.t]});e.onclick=go;e.onkeydown=ev=>{if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();go()}}});
}
function paint(light){
  const cv=$('#chcv');drawCrosshair(cv.getContext('2d'),cv.width,cv.height,c);
  $('#chopts').querySelectorAll('input').forEach(e=>{if(!light)e.value=c[e.dataset.k];$('#chopts [data-v="'+e.dataset.k+'"]').textContent=c[e.dataset.k]});
  if(light)return;
  $('#chdisp').innerHTML=`<option value="primary">Hauptmonitor (automatisch)</option>`+disp.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');$('#chdisp').value=c.display;
  document.querySelectorAll('[data-b]').forEach(e=>e.classList.toggle('on',!!c[e.dataset.b]));
  $('#chsw').classList.toggle('on',c.on);$('#chsw').setAttribute('aria-checked',c.on);
  $('#chopts').querySelectorAll('[data-t]').forEach(e=>e.classList.toggle('on',!!c[e.dataset.t]));
  $('#chshape').innerHTML=SH.map(([k,l])=>`<span class="chip${k===c.shape?' on':''}" data-k="${k}">${l}</span>`).join('');
  $('#chshape').querySelectorAll('.chip').forEach(e=>e.onclick=()=>save({shape:e.dataset.k}));
  $('#chcol').innerHTML=COL.map(k=>`<button type="button" style="background:${k}" class="${k===c.color?'on':''}" data-k="${k}" aria-label="${k}"></button>`).join('')+`<input type="color" id="chcc" value="${c.color}" title="Eigene Farbe" aria-label="Eigene Farbe">`;
  $('#chcol').querySelectorAll('button').forEach(e=>e.onclick=()=>save({color:e.dataset.k}));
  $('#chcc').onchange=e=>save({color:e.target.value});
}
async function save(p){const r=await A().chSet(p);if(r&&r.error==='license'){window.showLicense&&window.showLicense('locked');const t=$('#toast');t.textContent='Lizenz erforderlich – bitte Key aktivieren';t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2400)}
  if(r){const{error,...o}=r;c=o}paint()}
const sw=$('#chsw'),tg=()=>save({on:!c.on});sw.onclick=tg;sw.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();tg()}};
document.querySelectorAll('[data-b]').forEach(e=>{const go=()=>save({[e.dataset.b]:!c[e.dataset.b]});e.onclick=go;e.onkeydown=ev=>{if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();go()}}});
$('#chdisp').onchange=e=>save({display:e.target.value});
build();paint();A().chDisplays().then(l=>{disp=l;paint()});A().chGet().then(r=>{c=r;paint()});
})();
