(function(){
var LANGS=['fr','en','vi','zh','ko'], IDX={fr:[0,1],en:[2,3],vi:[null,4],zh:[5,6],ko:[7,8]};
var lang='fr', vegOnly=false;
try{var q=new URLSearchParams(location.search).get('lang');var s=localStorage.getItem('xiu-lang');lang=LANGS.indexOf(q)>=0?q:(LANGS.indexOf(s)>=0?s:lang);}catch(e){}
function T(k){var d=I18N[lang]||I18N.fr;return d[k]!=null?d[k]:I18N.fr[k];}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function renderWeek(){if(!window.SEMAINE)return;var W=SEMAINE,L=function(o){return o?(o[lang]||o.fr||''):'';};
 var sp=W.special||{},n=L(sp.name);document.getElementById('sp-name').textContent=n;document.getElementById('sp-desc').textContent=L(sp.desc);document.getElementById('sp-img').alt=n;
 var nx=L(W.next);document.getElementById('nx-name').textContent=nx;document.getElementById('nx-box').style.display=nx?'':'none';
 document.getElementById('past').innerHTML=(W.past||[]).map(function(x){return '<span>'+esc(x)+'</span>';}).join('');}
var FLAT=[];
function imgSrc(n){return 'assets/img/menu/'+(n.indexOf('.')>0?n:n+'.webp');}
function badgeHtml(it){return it.badge?'<span class="mbadge '+it.badge+'">'+esc(T('badge_'+it.badge))+'</span>':'';}
function renderMenu(){
 var main=document.getElementById('cats'),side=document.getElementById('catnav'),h='',nav='';FLAT=[];
 var cats=MENU.slice(),vegs=[];
 MENU.forEach(function(c){c.items.forEach(function(it){if(it.veg)vegs.push(it);});});
 cats.push({id:'veggie',icon:'🥬',title:{fr:'Veggie',en:'Veggie',vi:'Món chay',zh:'素食',ko:'채식'},items:vegs});
 cats.forEach(function(c){
  if(vegOnly&&c.id!=='veggie')return;
  var cards='',n=0;
  c.items.forEach(function(it){
   if(it.hide)return;n++;var k=FLAT.push(it)-1;
   var t=it[lang]||it.fr,sub=lang==='vi'?'':it.vi[0];
   cards+='<button type="button" class="dish" data-k="'+k+'"><span class="dt">'+badgeHtml(it)+'<span class="dn">'+(it.icon?'<span class="ic" aria-hidden="true">'+it.icon+'</span>':'')+esc(t[0])+(it.veg?' <span class="veg">'+esc(T('veg'))+'</span>':'')+'</span>'+(sub?'<span class="vi">'+esc(sub)+'</span>':'')+'<span class="p">'+esc(it.price)+'</span>'+(t[1]?'<span class="dd">'+esc(t[1])+'</span>':'')+'</span>'+(it.img?'<img src="'+imgSrc(it.img)+'" alt="" loading="lazy" width="480" height="480">':'')+'</button>';
  });
  if(!n)return;
  var title=c.title[lang]||c.title.fr;
  var ic=c.icon?'<span class="ic" aria-hidden="true">'+c.icon+'</span>':'';h+='<div class="mcat" id="cat-'+c.id+'"><h3>'+ic+esc(title)+'</h3><div class="dishes">'+cards+'</div></div>';
  nav+='<a href="#cat-'+c.id+'" data-c="'+c.id+'"><b>'+ic+esc(title)+'</b>'+'<span>'+n+'</span></a>';
 });
 main.innerHTML=h;side.innerHTML=nav;
 main.querySelectorAll('.dish').forEach(function(b){b.addEventListener('click',function(){openDish(FLAT[+b.dataset.k]);});});
 if('IntersectionObserver' in window){
  if(window._xo)window._xo.disconnect();
  window._xo=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var id=e.target.id.slice(4);side.querySelectorAll('a').forEach(function(a){var on=a.dataset.c===id;a.classList.toggle('on',on);if(on&&side.scrollWidth>side.clientWidth)side.scrollLeft=a.offsetLeft-16;});}});},{rootMargin:'-30% 0px -60% 0px'});
  main.querySelectorAll('.mcat').forEach(function(x){window._xo.observe(x);});
 }
}
function openDish(it){
 var d=document.getElementById('dish-modal'),t=it[lang]||it.fr;
 d.querySelector('.md-img').innerHTML=it.img?'<img src="'+imgSrc(it.img)+'" alt="'+esc(t[0])+'">':'';
 d.querySelector('.md-badge').innerHTML=badgeHtml(it);
 d.querySelector('.md-name').textContent=(it.icon?it.icon+' ':'')+t[0];
 d.querySelector('.md-vi').textContent=lang==='vi'?'':it.vi[0];
 d.querySelector('.md-price').textContent=it.price;
 d.querySelector('.md-desc').textContent=t[1]||'';
 d.querySelector('.md-close').setAttribute('aria-label',T('close'));
 d.querySelector('.md-call span').textContent=T('call');
 if(d.showModal)d.showModal();else d.setAttribute('open','');
}
function status(){
 var slots={0:[],1:[[660,900],[1080,1260]],2:[[660,900],[1080,1260]],3:[[660,900],[1080,1260]],4:[[660,900],[1080,1260]],5:[[660,1260]],6:[[660,1260]]};
 var map={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6},day=1,m=720;
 try{var g={};new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(p){g[p.type]=p.value;});day=map[g.weekday];m=+g.hour*60+ +g.minute;}catch(e){}
 function f(x){var hh=Math.floor(x/60),mm=x%60;return lang==='fr'||lang==='vi'?hh+'h'+(mm?('0'+mm).slice(-2):''):hh+':'+('0'+mm).slice(-2);}
 var t=slots[day],i;
 for(i=0;i<t.length;i++)if(m>=t[i][0]&&m<t[i][1])return[true,T('st_open')+f(t[i][1])];
 for(i=0;i<t.length;i++)if(t[i][0]>m)return[false,T('st_closed')+f(t[i][0])];
 for(var k=1;k<=7;k++){var d=(day+k)%7;if(slots[d].length)return[false,T('closed')+' · '+(k===1?T('st_tomorrow'):T('days')[d])+' '+f(slots[d][0][0])];}
 return[false,T('closed')];
}
function apply(){
 document.documentElement.lang=lang==='zh'?'zh-Hans':lang;
 document.body.classList.toggle('ko',lang==='ko');
 document.querySelectorAll('[data-i]').forEach(function(el){el.textContent=T(el.getAttribute('data-i'));});
 document.querySelectorAll('.langs button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.l===lang);});
 var st=status(),el=document.getElementById('status');el.className='chip '+(st[0]?'open':'closed');el.querySelector('span:last-child').textContent=st[1];
 renderMenu();
 renderWeek();
 setHH();
}
document.querySelectorAll('.langs button').forEach(function(b){b.addEventListener('click',function(){lang=b.dataset.l;try{localStorage.setItem('xiu-lang',lang);}catch(e){}apply();});});
document.querySelectorAll('.filters button').forEach(function(b){b.addEventListener('click',function(){vegOnly=b.dataset.f==='veg';document.querySelectorAll('.filters button').forEach(function(x){x.setAttribute('aria-pressed',x===b);});renderMenu();});});
(function(){var d=document.getElementById('dish-modal');d.querySelector('.md-close').addEventListener('click',function(){d.close();});d.addEventListener('click',function(e){if(e.target===d)d.close();});})();
function setHH(){var h=document.querySelector('header');if(h)document.documentElement.style.setProperty('--hh',h.offsetHeight+'px');}
setHH();window.addEventListener('resize',setHH);window.addEventListener('load',setHH);
apply();setHH();
setInterval(function(){var st=status(),el=document.getElementById('status');el.className='chip '+(st[0]?'open':'closed');el.querySelector('span:last-child').textContent=st[1];},60000);
})();
