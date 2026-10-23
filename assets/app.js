(function(){
'use strict';
var LANGS=['fr','en','vi','zh','ko'];
var lang='fr',vegOnly=false,page=document.body.getAttribute('data-page')||'';
try{var q=new URLSearchParams(location.search).get('lang'),s=localStorage.getItem('xiu-lang');lang=LANGS.indexOf(q)>=0?q:(LANGS.indexOf(s)>=0?s:lang);}catch(e){}

// Liens de l'ancienne page unique (www.xiu-paris.fr/#menu …) → nouvelles pages
if(page==='home'){var old={'#menu':'menu.html','#semaine':'menu.html','#traiteur':'traiteur.html','#infos':'infos.html'}[location.hash];if(old){location.replace(old);return;}}

function T(k){var d=I18N[lang]||I18N.fr;return d[k]!=null?d[k]:I18N.fr[k];}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function pick(o){return o?(o[lang]||o.fr||''):'';}
function txt(it){var t=it[lang]||it.fr||['',''];return [t[0]||(it.fr&&it.fr[0])||'',t[1]||''];}
function imgSrc(n){return 'assets/img/menu/'+(n.indexOf('.')>0?n:n+'.webp');}

// ---------- en-tête ----------
$$('.tabs a').forEach(function(a){if(a.dataset.p===page)a.setAttribute('aria-current','page');});
function setHH(){var h=$('header.top');if(h)document.documentElement.style.setProperty('--hh',h.offsetHeight+'px');var c=$('.catbar');if(c)document.documentElement.style.setProperty('--cbh',c.offsetHeight+'px');}
// icône Instagram/Facebook : affichée seulement si le fichier existe (assets/icons/…), sinon le texte reste
function socialIcons(){$$('.soc-ic[data-ic]').forEach(function(im){var t=new Image();t.onload=function(){im.src=im.dataset.ic;im.hidden=false;im.parentNode.classList.add('has-ic');};t.src=im.dataset.ic;});}
function socials(){var S=window.SITE||{};
 $$('.js-ig').forEach(function(a){if(S.instagram){a.href=S.instagram;a.hidden=false;}else a.hidden=true;});
 $$('.js-fb').forEach(function(a){if(S.facebook){a.href=S.facebook;a.hidden=false;}else a.hidden=true;});}

// ---------- horaires / statut ----------
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
function paintStatus(){var st=status();$$('.js-status').forEach(function(el){el.classList.remove('open','closed');el.classList.add(st[0]?'open':'closed');$('.st',el).textContent=st[1];});}

// ---------- Cette semaine ----------
function comtam(){
 var box=$('#ct-box');if(!box||!window.MENU)return;var key=box.getAttribute('data-dish'),hit=null;
 MENU.forEach(function(c){(c.items||[]).forEach(function(it){if(!hit&&!it.hide&&it.id&&it.id.indexOf(key)===0)hit=it;});});
 box._dish=hit;if(hit&&hit.img)$('#ct-img').src=imgSrc(hit.img);
 if(!box._wired){box._wired=true;box.addEventListener('click',function(){if(box._dish)openDish(box._dish);});}
}
function renderWeek(){
 if(!window.SEMAINE||!$('#sp-name'))return;
 var W=SEMAINE,sp=W.special||{},n=pick(sp.name);
 $('#sp-box').hidden=!n;
 $('#sp-name').textContent=n;$('#sp-desc').textContent=pick(sp.desc);$('#sp-img').alt=n;
 if(sp.img)$('#sp-img').src='assets/img/'+sp.img;
 var nx=pick(W.next);$('#nx-line').textContent=nx?T('next_l')+nx:'';
 var past=(W.past||[]).filter(Boolean);$('#past-line').textContent=past.length?T('past_l')+past.join(' · '):'';
}

// ---------- Menu ----------
var FLAT=[];
function badgeHtml(it){return it.badge?'<span class="mbadge '+esc(it.badge)+'">'+esc(T('badge_'+it.badge)||it.badge)+'</span>':'';}
function viSub(it){return lang==='vi'||!it.vi?'':(it.vi[0]||'');}
function catsToShow(){
 var cats=(window.MENU||[]).filter(function(c){return !c.hide;}),vegs=[];
 cats.forEach(function(c){(c.items||[]).forEach(function(it){if(it.veg&&!it.hide)vegs.push(it);});});
 var out=cats.slice();
 if(vegs.length)out.push({id:'veggie',icon:'🥬',title:{fr:'Veggie',en:'Veggie',vi:'Món chay',zh:'素食',ko:'채식'},items:vegs});
 return vegOnly?out.filter(function(c){return c.id==='veggie';}):out;
}
function renderMenu(){
 var main=$('#cats'),nav=$('#catnav'),sheet=$('#cat-sheet-list');if(!main)return;
 var h='',nh='',sh='';FLAT=[];
 catsToShow().forEach(function(c){
  var rows='',n=0;
  (c.items||[]).forEach(function(it){
   if(it.hide)return;n++;var k=FLAT.push(it)-1,t=txt(it),sub=viSub(it);
   rows+='<button type="button" class="dish" data-k="'+k+'"><span class="dt">'
    +'<span class="dn">'+(it.icon?'<span class="ic" aria-hidden="true">'+esc(it.icon)+'</span>':'')+esc(t[0])+'</span>'
    +(sub?'<span class="vi">'+esc(sub)+'</span>':'')
    +(it.price||it.veg?'<span class="p">'+esc(it.price)+(it.veg?'<span class="veg">'+esc(T('veg'))+'</span>':'')+'</span>':'')
    +(t[1]?'<span class="dd">'+esc(t[1])+'</span>':'')+badgeHtml(it)+'</span>'
    +(it.img?'<span class="dimg"><img src="'+esc(imgSrc(it.img))+'" alt="" loading="lazy" width="232" height="232"></span>':'')+'</button>';
  });
  if(!n)return;
  var title=pick(c.title),ic=c.icon?'<span class="ic" aria-hidden="true">'+esc(c.icon)+'</span>':'';
  h+='<div class="mcat" id="cat-'+esc(c.id)+'"><h2>'+ic+esc(title)+'</h2><div class="dishes">'+rows+'</div></div>';
  nh+='<a href="#cat-'+esc(c.id)+'" data-c="'+esc(c.id)+'">'+esc(title)+'</a>';
  sh+='<a href="#cat-'+esc(c.id)+'" data-c="'+esc(c.id)+'"><b>'+ic+esc(title)+'</b><span>'+n+'</span></a>';
 });
 main.innerHTML=h;nav.innerHTML=nh;if(sheet)sheet.innerHTML=sh;
 $$('.dish',main).forEach(function(b){b.addEventListener('click',function(){openDish(FLAT[+b.dataset.k]);});});
 $$('a',nav).concat(sheet?$$('a',sheet):[]).forEach(function(a){a.addEventListener('click',function(e){
  var el=document.getElementById('cat-'+a.dataset.c);if(!el)return;e.preventDefault();
  var cs=$('#cat-sheet');if(cs&&cs.open)cs.close();
  lockSpy=Date.now()+900;markCat(a.dataset.c);
  el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  if(history.replaceState)history.replaceState(null,'','#cat-'+a.dataset.c);
 });});
 spy();
}
var lockSpy=0;
function markCat(id){
 var nav=$('#catnav');if(!nav)return;
 $$('a',nav).forEach(function(a){var on=a.dataset.c===id;a.classList.toggle('on',on);
  if(on){var l=a.offsetLeft-nav.clientWidth/2+a.offsetWidth/2;nav.scrollTo?nav.scrollTo({left:Math.max(0,l),behavior:'smooth'}):(nav.scrollLeft=l);}});
 $$('#cat-sheet-list a').forEach(function(a){a.classList.toggle('on',a.dataset.c===id);});
}
function spy(){
 // la catégorie active = la dernière dont le titre est passé sous la barre collante
 var cats=$$('.mcat');if(!cats.length)return;
 if(Date.now()<lockSpy)return;
 var lim=($('header.top').offsetHeight+$('.catbar').offsetHeight)+30,cur=cats[0].id;
 for(var i=0;i<cats.length;i++){if(cats[i].getBoundingClientRect().top<=lim)cur=cats[i].id;else break;}
 var nav=$('#catnav'),a=nav&&nav.querySelector('a.on');
 if(!a||a.dataset.c!==cur.slice(4))markCat(cur.slice(4));
}
var ticking=false;
window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(function(){ticking=false;spy();});}},{passive:true});

function openDish(it){
 var d=$('#dish-modal'),t=txt(it);
 $('.md-img',d).innerHTML=it.img?'<img src="'+esc(imgSrc(it.img))+'" alt="'+esc(t[0])+'">':'';
 $('.md-badge',d).innerHTML=badgeHtml(it);
 $('.md-name',d).textContent=(it.icon?it.icon+' ':'')+t[0];
 $('.md-vi',d).textContent=viSub(it);
 $('.md-price',d).textContent=[it.price,it.veg?T('veg'):''].filter(Boolean).join(' · ');
 $('.md-desc',d).textContent=t[1];
 $('.md-call span',d).textContent=T('call');
 if(d.showModal)d.showModal();else d.setAttribute('open','');
 d.scrollTop=0;
}
function wireDialogs(){
 $$('dialog').forEach(function(d){
  $$('.md-close',d).forEach(function(b){b.addEventListener('click',function(){d.close();});});
  d.addEventListener('click',function(e){if(e.target===d)d.close();});
 });
 var b=$('#catlist-btn');if(b)b.addEventListener('click',function(){var s=$('#cat-sheet');s.showModal?s.showModal():s.setAttribute('open','');});
}

// ---------- langue ----------
function apply(){
 document.documentElement.lang=lang==='zh'?'zh-Hans':lang;
 document.body.classList.toggle('ko',lang==='ko');
 $$('[data-i]').forEach(function(el){var v=T(el.getAttribute('data-i'));if(v!=null)el.textContent=v;});
 $$('.langs button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.l===lang);});
 $$('.lang-sel').forEach(function(s){s.value=lang;});
 $$('.md-close').forEach(function(b){b.setAttribute('aria-label',T('close'));});
 paintStatus();renderWeek();renderMenu();comtam();setHH();
}
function setLang(l){lang=l;try{localStorage.setItem('xiu-lang',lang);}catch(e){}apply();}
$$('.langs button').forEach(function(b){b.addEventListener('click',function(){setLang(b.dataset.l);});});
$$('.lang-sel').forEach(function(s){s.addEventListener('change',function(){setLang(s.value);});});
$$('.filters button').forEach(function(b){b.addEventListener('click',function(){vegOnly=b.dataset.f==='veg';$$('.filters button').forEach(function(x){x.setAttribute('aria-pressed',x===b);});renderMenu();var c=$('#carte');if(c)c.scrollIntoView({block:'start'});});});

socials();socialIcons();wireDialogs();apply();
window.addEventListener('resize',setHH);window.addEventListener('load',function(){setHH();
 if(/^#cat-/.test(location.hash)){var el=document.getElementById(location.hash.slice(1));if(el)el.scrollIntoView();}});
setInterval(paintStatus,60000);
})();
