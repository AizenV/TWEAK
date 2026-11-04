// Seite „Suche": durchsucht Seiten und Tweaks (Strg+K springt hierher)
(function(){
const $=s=>document.querySelector(s),q=$('#sq'),out=$('#sres'),x=$('#sqx'),g=$('#tbg');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase();
const pages=()=>[...document.querySelectorAll('nav .nav')].filter(e=>e.dataset.p!=='search'&&!e.classList.contains('tw')||e.classList.contains('fvtw')).map(e=>({p:e.dataset.p,n:[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('')||e.dataset.p}));
let res=[];
function render(){const v=norm(q.value).trim();x.hidden=!v;
  if(!v){out.innerHTML='<div class="empty">Tippe, um Tweaks und Seiten zu finden.</div>';res=[];return}
  const P=pages().filter(o=>norm(o.n).includes(v)).map(o=>({k:'p',p:o.p,n:o.n,d:'Seite öffnen',s:'Seite'}));
  const T=(typeof tweaks!=='undefined'?tweaks:[]).filter(t=>norm(t.name).includes(v)||norm(t.desc).includes(v)).sort((a,b)=>norm(b.name).includes(v)-norm(a.name).includes(v))
    .map(t=>({k:'t',id:t.id,n:t.name,d:t.desc,s:typeof twOf==='function'?twOf(t):t.cat}));
  res=[...P,...T].slice(0,30);
  out.innerHTML=res.length?res.map((o,i)=>`<div class="titem card go" data-i="${i}"><div class="tx"><b>${esc(o.n)}</b><span>${esc(o.d)}</span></div><span class="sres-t">${esc(o.s)}</span></div>`).join(''):'<div class="empty">Nichts gefunden.</div>';
  out.querySelectorAll('[data-i]').forEach(e=>e.onclick=()=>go(res[+e.dataset.i]))}
function go(o){if(!o)return;if(o.k==='p')return window.show(o.p);
  const t=tweaks.find(y=>y.id===o.id);window.show('tw:'+twOf(t));
  setTimeout(()=>{const sw=document.querySelector(`#tlist .sw[data-id="${o.id}"]`),it=sw&&sw.closest('.titem');if(it){it.scrollIntoView({block:'center'});it.classList.add('flash')}},50)}
q.oninput=render;x.onclick=()=>{q.value='';render();q.focus()};
q.onkeydown=e=>{if(e.key==='Enter')go(res[0]);else if(e.key==='Escape'){q.value='';render()}};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();window.show('search')}});
g.onclick=()=>window.show('settings');
const _s=window.show;window.show=function(p){_s(p);g.classList.toggle('on',p==='settings');if(p==='search'){render();q.focus();q.select()}};
render();
})();
