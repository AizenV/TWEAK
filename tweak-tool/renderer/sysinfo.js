// Übersicht → System Info: KPIs (live) und Hardware-/Systemdetails
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'–':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gb=b=>(b/1073741824).toFixed(1)+' GB';
const w=v=>new Promise(r=>setTimeout(()=>r(v),150));
// Browser-Vorschau ohne Electron
const demo={sysDetails:()=>w({cpu:'AMD Ryzen 9 5950X 16-Core Processor',cores:32,arch:'x64',host:'DESKTOP-PC',user:'user',tz:'Europe/Berlin',uptime:150000,ramTotal:68.6e9,ramFree:42.5e9,os:'Microsoft Windows 11 Home',build:'26300',hv:false,sb:true,ac:true,gpu:'NVIDIA GeForce RTX 4060 Ti'}),
  sysLive:()=>w({cpu:38,gpuTemp:67,gpuLoad:91,ramTotal:68.6e9,ramFree:42.5e9,uptime:150000})};
const A=()=>window.api&&window.api.sysDetails?window.api:demo;
let d=null,timer=null;
const yn=v=>v==null?'–':v?'Ja':'Nein';
const up=s=>Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m';
function kpis(l){const used=l.ramTotal-l.ramFree,pct=Math.round(used/l.ramTotal*100),v=(x,u)=>x==null?'–':x+u;
  $('#sikpi').innerHTML=[['GPU Temp',v(l.gpuTemp,' °C')],['GPU Last',v(l.gpuLoad,' %')],['CPU Last',v(l.cpu,' %')],['RAM belegt',pct+' %']]
   .map(([k,x])=>`<div class="kpi card"><small>${k}</small><div class="big">${esc(x)}</div></div>`).join('')}
function groups(l){const used=d.ramTotal-d.ramFree;
  const G=[['Prozessor & GPU',[['Prozessor',d.cpu],['Logische Kerne',d.cores],['Architektur',d.arch],['Hypervisor',yn(d.hv)],['GPU',d.gpu]]],
   ['Arbeitsspeicher',[['Installiert',gb(d.ramTotal)],['Verfügbar',gb(l.ramFree)],['Belegt',`${gb(l.ramTotal-l.ramFree)} (${Math.round((l.ramTotal-l.ramFree)/l.ramTotal*100)}%)`]]],
   ['System & Sitzung',[['Betriebssystem',d.os],['Build',d.build],['Hostname',d.host],['Benutzer',d.user],['Secure Boot',yn(d.sb)],['Strom',d.ac?'Netzteil (AC)':'Akku'],['Zeitzone',d.tz],['Laufzeit',up(l.uptime)]]]];
  $('#sigrp').innerHTML=G.map(([t,r])=>`<div class="sih">${t}</div><div class="sigrid">${r.map(([k,v])=>`<div class="card"><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>`).join('')}
async function tick(){const l=await A().sysLive();if(!d)d=await A().sysDetails();kpis(l);groups(l)}
async function start(full){if(full)d=null;await tick();clearInterval(timer);timer=setInterval(()=>{if($('#p-sysinfo').classList.contains('on'))tick();else{clearInterval(timer);timer=null}},3000)}
document.querySelector('[data-p="sysinfo"]').addEventListener('click',()=>start(!d));
$('#sirf').onclick=()=>start(true);
})();
