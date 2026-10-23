// =====================================================================
// XÍU — trang của tiệm: nhận đơn, xác nhận, in phiếu, cài đặt
// =====================================================================
(function(){
'use strict';
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function money(c){return (c/100).toFixed(2).replace('.',',')+' €';}
function hm(ts){return new Date(ts*1000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'});}
function ago(ts){var m=Math.max(0,Math.round((S.now-ts)/60));return m<1?'vừa xong':m<60?m+' phút trước':Math.floor(m/60)+' giờ '+(m%60)+' phút trước';}
function pref(k,v){try{if(v===undefined)return localStorage.getItem('xiu-staff-'+k);localStorage.setItem('xiu-staff-'+k,v);}catch(e){}}

var printNo=null,S={rev:null,orders:[],now:0},seen=null,timer=null,sound=pref('sound')==='1',audio=null,busy=false;

function api(method,path,body){
 var o={method:method,credentials:'same-origin',headers:{}};
 if(body){o.headers['Content-Type']='application/json';o.headers['X-Xiu']='1';o.body=JSON.stringify(body);}
 return fetch('/api/staff'+path,o).then(function(r){return r.json().catch(function(){return {ok:false,err:'http'+r.status};});});
}

// ---------------- đăng nhập
function showLogin(msg){clearTimeout(timer);$('#app').hidden=true;$('#login').hidden=false;$('#login-msg').textContent=msg||'';$('#pw').focus();}
$('#login-form').addEventListener('submit',function(e){
 e.preventDefault();var b=$('#login-form button');b.disabled=true;
 api('POST','/login',{password:$('#pw').value}).then(function(r){
  b.disabled=false;
  if(r.ok){$('#pw').value='';unlockAudio();start();return;}
  var m={password:'Sai mật khẩu.',blocked:'Sai quá nhiều lần. Thử lại sau '+mins(r.until)+' phút.',not_configured:'Chưa đặt mật khẩu STAFF_PASSWORD trên Cloudflare.'}[r.err]||'Lỗi kết nối.';
  $('#login-msg').textContent=m;
 },function(){b.disabled=false;$('#login-msg').textContent='Lỗi kết nối.';});
});
function mins(u){return Math.max(1,Math.ceil(((u||0)*1000-Date.now())/60000));}

// ---------------- chuông báo
function unlockAudio(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch(e){}}
function chime(){
 if(navigator.vibrate)try{navigator.vibrate([200,100,200]);}catch(e){}
 if(!sound||!audio)return;
 [0,0.22,0.44].forEach(function(t,i){var o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=[880,1175,1568][i];
  g.gain.setValueAtTime(0.0001,audio.currentTime+t);g.gain.exponentialRampToValueAtTime(0.5,audio.currentTime+t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,audio.currentTime+t+0.35);
  o.connect(g);g.connect(audio.destination);o.start(audio.currentTime+t);o.stop(audio.currentTime+t+0.4);});
}
function paintSound(){var b=$('#sound');b.setAttribute('aria-pressed',sound);b.textContent=sound?'Chuông: bật':'Bật chuông';}
$('#sound').addEventListener('click',function(){sound=!sound;pref('sound',sound?'1':'0');unlockAudio();paintSound();if(sound)chime();});
document.addEventListener('click',unlockAudio,{once:true});

// ---------------- tải dữ liệu
function start(){$('#login').hidden=true;$('#app').hidden=false;paintSound();$('#auto-print').checked=pref('autoprint')==='1';refresh(true);}
function refresh(force){
 clearTimeout(timer);
 api('GET','/state'+(force||S.rev==null?'':'?rev='+encodeURIComponent(S.rev))).then(function(r){
  $('#net').hidden=true;
  if(!r.ok){if(r.err==='auth')return showLogin();$('#net').hidden=false;timer=setTimeout(refresh,8000);return;}
  S.now=r.now;
  if(!r.same){
   var fresh=[];
   r.orders.forEach(function(o){if(o.status==='new'&&seen&&!seen[o.id])fresh.push(o.id);});
   seen=seen||{};r.orders.forEach(function(o){seen[o.id]=1;});
   S=r;S.fresh=fresh;if(S.token)S.orderUrl=location.origin+'/menu.html?t='+S.token;render();
   if(printNo!=null){var po=S.orders.filter(function(o){return o.no===printNo&&o.src==='staff';})[0];printNo=null;if(po)printTicket(po);}
   if(fresh.length)chime();
  }else paintTimes();
  timer=setTimeout(refresh,5000);
 },function(){$('#net').hidden=false;timer=setTimeout(refresh,8000);});
}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&!$('#app').hidden)refresh();});

// ---------------- hiển thị
var LANG={fr:'FR',en:'EN',de:'DE',es:'ES',vi:'VI',zh:'中文',ko:'한국어'};
var GROUPS=['entree','plat','banhmi','dessert','boisson','autre'],GNAME={entree:'Khai vị',plat:'Món chính',banhmi:'Bánh mì',dessert:'Tráng miệng',boisson:'Đồ uống',autre:'Khác'};
var SVC={place:'Ăn tại chỗ · Sur place',emporter:'Mang đi · À emporter'};
// xếp các dòng theo nhóm (đơn cũ không có nhóm → « Khác »)
function grouped(items,row,head){
 var g={};items.forEach(function(x){var k=GROUPS.indexOf(x.g)>=0?x.g:'autre';(g[k]=g[k]||[]).push(x);});
 return GROUPS.filter(function(k){return g[k];}).map(function(k){return head(GNAME[k])+g[k].map(row).join('');}).join('');
}
function fTag(x){return x.fid?(x.fvi||x.ffr||'combo')+' · '+(x.cents?money(x.cents)+'/phần':'tặng')+(x.auto?' · tự thêm':''):'';}
function card(o){
 var items=grouped(o.items,function(x){return '<li><span class="c-q">'+x.qty+'×</span><span class="c-n">'+esc(x.vi||x.fr)+(x.vi&&x.fr?'<small>'+esc(x.fr)+'</small>':'')+(x.fid?'<em class="c-f">'+esc(fTag(x))+'</em>':'')+'</span><span class="c-p">'+(x.base>x.cents?'<s>'+money(x.base*x.qty)+'</s> ':'')+(x.cents?money(x.cents*x.qty):'0 €')+'</span></li>';},function(n){return '<li class="c-gh">'+esc(n)+'</li>';});
 var btn={
  'new':'<button class="b b-green" data-act="confirmed">Xác nhận</button><button class="b b-out" data-act="print">In</button><button class="b b-red-out" data-act="cancelled">Hủy</button>',
  confirmed:'<button class="b b-green" data-act="done">Xong</button><button class="b b-out" data-act="print">In</button><button class="b b-out" data-act="new">↩ Chờ</button><button class="b b-red-out" data-act="cancelled">Hủy</button>'
 }[o.status]||'<button class="b b-out" data-act="new">Khôi phục</button><button class="b b-out" data-act="print">In</button>';
 var st={done:'Xong',cancelled:'Đã hủy',expired:'Hết hạn (không ai xác nhận)'}[o.status];
 return '<article class="card s-'+esc(o.status)+(S.fresh&&S.fresh.indexOf(o.id)>=0?' fresh':'')+'" data-id="'+o.id+'">'
  +'<div class="c-head"><span class="c-no">'+o.no+'</span>'+(o.service?'<span class="c-svc s-'+esc(o.service)+'">'+esc(SVC[o.service]||o.service)+'</span>':'')+(o.name?'<span class="c-name">'+esc(o.name)+'</span>':'')
  +'<span class="c-time" data-ts="'+o.created_at+'">'+hm(o.created_at)+' · '+ago(o.created_at)+(o.src==='staff'?'<span class="c-tag c-staff">Nhập tại quầy</span>':'<span class="c-tag">QR · '+esc(LANG[o.lang]||o.lang||'')+'</span>')+(st?'<span class="c-tag">'+st+'</span>':'')+'</span></div>'
  +'<ul class="c-items">'+items+'</ul>'+(o.note?'<div class="c-note">'+esc(o.note)+'</div>':'')
  +'<div class="c-foot"><span class="c-total">'+money(o.total_cents)+'</span>'+btn+'</div></article>';
}
function render(){
 var nw=[],cf=[],past=[];
 S.orders.forEach(function(o){(o.status==='new'?nw:o.status==='confirmed'?cf:past).push(o);});
 nw.sort(function(a,b){return a.id-b.id;});cf.sort(function(a,b){return a.id-b.id;});
 $('#list-new').innerHTML=nw.map(card).join('')||'<div class="empty">Chưa có đơn mới</div>';
 $('#list-conf').innerHTML=cf.map(card).join('')||'<div class="empty">Không có đơn đang làm</div>';
 $('#list-past').innerHTML=past.map(card).join('')||'<div class="empty">Trống</div>';
 $('#n-new').textContent=nw.length;$('#n-conf').textContent=cf.length;$('#n-past').textContent=past.length;
 document.title=(nw.length?'('+nw.length+') ':'')+'Xíu · Đơn tại tiệm';
 var on=S.open,txt=on?'Đang nhận đơn':S.reason==='paused'?'Tạm dừng nhận đơn':'Ngoài giờ, không nhận đơn';
 $('#state-dot').className='dot '+(on?'on':'off');$('#state-txt').textContent=txt;
 $$('.mode button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.mode===S.mode);});
 renderSettings();
}
function paintTimes(){$$('.c-time[data-ts]').forEach(function(e){var ts=+e.dataset.ts,tags=$$('.c-tag',e).map(function(x){return x.outerHTML;}).join('');e.innerHTML=hm(ts)+' · '+ago(ts)+tags;});}
function find(id){for(var i=0;i<S.orders.length;i++)if(S.orders[i].id===id)return S.orders[i];return null;}

document.addEventListener('click',function(e){
 var b=e.target.closest('[data-act]');if(!b)return;
 var c=b.closest('.card'),id=+c.dataset.id,o=find(id),act=b.dataset.act;if(!o)return;
 if(act==='print')return printTicket(o);
 if(act==='cancelled'&&!confirm('Hủy đơn số '+o.no+'?'))return;
 b.disabled=true;
 api('POST','/order',{id:id,status:act}).then(function(r){
  if(r.ok&&act==='confirmed'&&$('#auto-print').checked)printTicket(o);
  refresh(true);
 },function(){b.disabled=false;$('#net').hidden=false;});
});
$$('.mode button').forEach(function(b){b.addEventListener('click',function(){
 if(b.dataset.mode==='open'&&!confirm('Luôn nhận đơn, kể cả ngoài giờ mở cửa? (dùng để chạy thử)'))return;
 api('POST','/mode',{mode:b.dataset.mode}).then(function(){refresh(true);});});});

// ---------------- in
function pageStyle(css){var s=$('#page-style');if(!s){s=document.createElement('style');s.id='page-style';document.head.appendChild(s);}s.textContent=css;}
function printTicket(o){
 var rows=grouped(o.items,function(x){return '<tr><td class="q">'+x.qty+'×</td><td>'+esc(x.vi||x.fr)+(x.vi&&x.fr?'<div class="fr">'+esc(x.fr)+'</div>':'')+(x.fid?'<div class="fr">'+esc(fTag(x))+'</div>':'')+'</td><td class="p">'+(x.cents?money(x.cents*x.qty):'0 €')+'</td></tr>';},function(n){return '<tr><td colspan="3" class="gh">'+esc(n)+'</td></tr>';});
 $('#print').innerHTML='<div class="tk"><h1>XÍU</h1><div class="no">N° '+o.no+'</div>'+(o.service?'<div class="svc">'+esc(o.service==='emporter'?'À EMPORTER':'SUR PLACE')+'</div>':'')+'<div class="meta">'+esc(o.day)+' · '+hm(o.created_at)+(o.name?' · '+esc(o.name):'')+'</div>'
  +'<table>'+rows+'</table>'+(o.note?'<div class="note">'+esc(o.note)+'</div>':'')+'<div class="tot">'+money(o.total_cents)+'</div></div>';
 pageStyle('@page{size:80mm auto;margin:3mm}');document.body.className='p-ticket';window.print();document.body.className='';
}
function qrSvg(text,cell){var q=qrcode(0,'M');q.addData(text);q.make();return q.createSvgTag({cellSize:cell||4,margin:2,scalable:true});}
$('#print-qr').addEventListener('click',function(){
 $('#print').innerHTML='<div class="qs"><h1>Commandez ici</h1><div class="langs">Order here · Hier bestellen · Pide aquí<br>Gọi món tại đây · 扫码点餐 · 여기서 주문</div>'
  +'<div class="big">'+qrSvg(S.orderUrl,8)+'</div><div class="foot">Scannez, choisissez, envoyez · paiement au comptoir<br>Xíu · 48 rue Monge, Paris 5e</div></div>';
 pageStyle('@page{size:A4;margin:12mm}');window.print();
});

// ---------------- cài đặt
// địa chỉ trong mã QR lấy theo địa chỉ đang mở trang này (tên miền thật, workers.dev, IP máy, đường hầm thử…)
function renderSettings(){
 if(!S.orderUrl)return;
 if($('#qr').dataset.url!==S.orderUrl){$('#qr').innerHTML=qrSvg(S.orderUrl,4);$('#qr').dataset.url=S.orderUrl;}
 $('#qr-url').textContent=S.orderUrl;
 $('#open-customer').href=S.orderUrl;
 var why={rate:'gửi quá 5 đơn / 10 phút',devices:'quá nhiều thiết bị mới từ một mạng',login:'nhập sai mật khẩu nhiều lần'};
 $('#blocks').innerHTML=(S.blocks||[]).map(function(b){return '<div class="blk"><span>'+(b.kind==='dev'?'Thiết bị':b.kind==='ip'?'Mạng (IP)':'Đăng nhập')+' · '+esc(why[b.reason]||b.reason)+' · còn '+mins(b.until)+' phút</span><button class="b b-out" data-unblock="'+esc(b.key)+'">Mở khóa</button></div>';}).join('')||'<p class="hint">Không có.</p>';
}
$('#blocks').addEventListener('click',function(e){var b=e.target.closest('[data-unblock]');if(!b)return;b.disabled=true;api('POST','/unblock',{key:b.dataset.unblock}).then(function(){refresh(true);});});
$('#open-settings').addEventListener('click',function(){renderSettings();$('#settings').showModal();});
$$('[data-close]').forEach(function(b){b.addEventListener('click',function(){b.closest('dialog').close();});});
$('#settings').addEventListener('click',function(e){if(e.target===this)this.close();});
$('#auto-print').addEventListener('change',function(){pref('autoprint',this.checked?'1':'0');});
$('#rotate').addEventListener('click',function(){if(!confirm('Đổi mã QR? Các tờ mã QR cũ sẽ không dùng được nữa, cần in lại.'))return;api('POST','/rotate',{}).then(function(){refresh(true);});});
$('#logout').addEventListener('click',function(){api('POST','/logout',{}).then(function(){$('#settings').close();showLogin();});});
$('#logout-all').addEventListener('click',function(){if(!confirm('Đăng xuất tất cả máy đang mở trang này?'))return;api('POST','/logout-all',{}).then(function(){$('#settings').close();showLogin();});});

// ---------------- nhập đơn tại quầy (khách không dùng điện thoại)
var CFG=window.FORMULES||{},CALC=window.XIU_CALC,MENU=window.MENU||[];
var P={cart:{},decl:{},svc:null,cat:'all',q:''},PITEMS={},PCAT={},PALL={};
function pcents(p){var m=/(\d+)(?:[.,](\d{1,2}))?/.exec(String(p||''));if(!m)return null;var c=+m[1]*100+(m[2]?+((m[2]+'0').slice(0,2)):0);return c>0?c:null;}
function nm(it,l){return ((it[l]||[])[0])||((it.fr||[])[0])||it.id;}
function fold(x){return String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();}
function pimg(n){return 'assets/img/menu/'+(n.indexOf('.')>0?n:n+'.webp');}
MENU.forEach(function(c){(c.items||[]).forEach(function(it){if(!it.id)return;if(!PALL[it.id])PALL[it.id]={it:it,cat:c.id};if(c.hide||it.hide||PITEMS[it.id]||!pcents(it.price))return;PITEMS[it.id]=it;PCAT[it.id]=c.id;});});
function pcalc(){
 var items=[];Object.keys(P.cart).forEach(function(id){var it=PITEMS[id];if(it&&P.cart[id]>0)items.push({id:id,qty:P.cart[id],cents:pcents(it.price),cat:PCAT[id]});});
 var a=PALL[CFG.auto_drink];
 return CALC?CALC.compute(CFG,items,P.decl,a?{id:a.it.id,cents:pcents(a.it.price)||0,cat:a.cat}:null):{lines:[],total:0};
}
function posCats(){
 var h='<button type="button" data-pc="all" aria-pressed="'+(P.cat==='all')+'">Tất cả</button>';
 MENU.forEach(function(c){if(c.hide)return;if(!(c.items||[]).some(function(it){return PITEMS[it.id];}))return;
  var t=c.title||{};h+='<button type="button" data-pc="'+esc(c.id)+'" aria-pressed="'+(P.cat===c.id)+'">'+esc(t.vi||t.fr||c.id)+'</button>';});
 $('#pos-cats').innerHTML=h;
}
function posGrid(){
 var q=fold(P.q),h='';
 MENU.forEach(function(c){if(c.hide)return;if(P.cat!=='all'&&P.cat!==c.id)return;
  (c.items||[]).forEach(function(it){if(!PITEMS[it.id]||PCAT[it.id]!==c.id)return;
   if(q&&fold(nm(it,'vi')+' '+nm(it,'fr')).indexOf(q)<0)return;
   var n=P.cart[it.id]||0;
   h+='<button type="button" class="pos-item'+(n?' on':'')+'" data-pid="'+esc(it.id)+'">'+(it.img?'<img src="'+esc(pimg(it.img))+'" alt="" loading="lazy" width="64" height="64">':'<span class="noimg"></span>')
    +'<span class="pi-t"><b>'+esc(nm(it,'vi'))+'</b><small>'+esc(nm(it,'fr'))+'</small><span>'+money(pcents(it.price))+'</span></span>'+(n?'<span class="pi-n">'+n+'</span>':'')+'</button>';});});
 $('#pos-grid').innerHTML=h||'<p class="empty">Không tìm thấy món.</p>';
}
function posCart(){
 var c=pcalc(),n=0;
 $('#pos-lines').innerHTML=c.lines.length?grouped(c.lines.map(function(l,i){var x=PALL[l.id],f=l.fid&&PALL[l.fid];n+=l.qty;
  return {l:l,g:l.group,html:'<li class="pos-line'+(l.fid?' is-f':'')+'" data-i="'+i+'"><span class="c-n">'+esc(x?nm(x.it,'vi'):l.id)+'<small>'+esc(x?nm(x.it,'fr'):'')+'</small>'+(f?'<em class="c-f">'+esc(nm(f.it,'vi'))+(l.auto?' · tự thêm':'')+'</em>':'')+'</span>'
   +'<span class="pq"><button type="button" data-pm>−</button><b>'+l.qty+'</b><button type="button" data-pp'+(l.auto&&l.qty>=l.max?' disabled':'')+'>+</button></span>'
   +'<span class="c-p">'+(l.base>l.cents?'<s>'+money(l.base*l.qty)+'</s> ':'')+(l.cents?money(l.cents*l.qty):'0 €')+'</span></li>'};}),
  function(x){return x.html;},function(g){return '<li class="c-gh">'+esc(g)+'</li>';}):'<li class="empty">Chạm vào món bên trái để thêm.</li>';
 $$('#pos-lines .pos-line').forEach(function(li){var l=c.lines[+li.dataset.i];
  li.querySelector('[data-pm]').addEventListener('click',function(){pstep(l,-1);});
  li.querySelector('[data-pp]').addEventListener('click',function(){pstep(l,1);});});
 var info=$('#pos-info');
 if(c.lines.some(function(l){return l.fid;})){info.hidden=false;info.className='pos-info';info.textContent='Combo đã tự áp dụng: nước ngọt, trà, cà phê 0 € với khai vị + món chính, 1 € với khai vị + bánh mì / bánh giò. Bia không giảm.';}
 else if(c.upsell){info.hidden=false;info.className='pos-info up';info.textContent='Gợi ý khách: thêm một món khai vị để được combo (tặng nước hoặc nước 1 €).';}
 else info.hidden=true;
 $('#pos-total').textContent=money(c.total);
 $$('[data-psvc]').forEach(function(b){b.setAttribute('aria-checked',P.svc===b.dataset.psvc);});
 var j=$('#pos-jump');j.hidden=!n;j.textContent='Xem đơn · '+n+' món · '+money(c.total);
}
function pstep(l,d){
 if(l.auto){P.decl[l.fid]=Math.max(0,Math.min(l.max,l.max-(l.qty+d)));}
 else{var q=(P.cart[l.id]||0)+d;if(q>0)P.cart[l.id]=Math.min(10,q);else delete P.cart[l.id];}
 posAll();
}
function posAll(){posGrid();posCart();}
function posReset(){P.cart={};P.decl={};P.svc=null;P.q='';$('#pos-q').value='';$('#pos-name').value='';$('#pos-note').value='';$('#pos-msg').textContent='';$('.pos-svc').classList.remove('need');$('#pos-name').classList.remove('need');$('#pos-note').classList.remove('need');posAll();}
$('#open-pos').addEventListener('click',function(){posCats();posAll();$('#pos').showModal();});
$('#pos-cats').addEventListener('click',function(e){var b=e.target.closest('[data-pc]');if(!b)return;P.cat=b.dataset.pc;posCats();posGrid();});
$('#pos-grid').addEventListener('click',function(e){var b=e.target.closest('[data-pid]');if(!b)return;var id=b.dataset.pid;P.cart[id]=Math.min(10,(P.cart[id]||0)+1);posAll();});
$('#pos-q').addEventListener('input',function(){P.q=this.value;posGrid();});
['#pos-name','#pos-note'].forEach(function(k){$(k).addEventListener('input',function(){this.classList.remove('need');});});
$$('[data-psvc]').forEach(function(b){b.addEventListener('click',function(){P.svc=b.dataset.psvc;$('.pos-svc').classList.remove('need');posCart();});});
$('#pos-clear').addEventListener('click',function(){if(Object.keys(P.cart).length&&!confirm('Xóa toàn bộ đơn đang nhập?'))return;posReset();});
$('#pos-jump').addEventListener('click',function(){$('#pos-cart').scrollIntoView({behavior:'smooth',block:'start'});});
$('#pos-send').addEventListener('click',function(){
 var items=Object.keys(P.cart).map(function(id){return {id:id,qty:P.cart[id]};});
 if(!items.length){$('#pos-msg').textContent='Chưa có món nào.';return;}
 if(!P.svc){$('#pos-msg').textContent='Chọn « Ăn tại chỗ » hoặc « Mang đi ».';$('.pos-svc').classList.add('need');return;}
 if(!$('#pos-name').value.trim()){$('#pos-msg').textContent='Nhập tên hoặc số bàn.';$('#pos-name').classList.add('need');$('#pos-name').focus();return;}
 var b=this;b.disabled=true;$('#pos-msg').textContent='';
 api('POST','/orders',{items:items,decline:P.decl,service:P.svc,name:$('#pos-name').value,note:$('#pos-note').value,lang:'vi'}).then(function(r){
  b.disabled=false;
  if(!r.ok){$('#pos-msg').textContent={name:'Nhập tên hoặc số bàn.',note:'Nhập ghi chú.',items:'Có món không còn trong menu, tải lại trang.',service:'Chọn « Ăn tại chỗ » hoặc « Mang đi ».',auth:'Hết phiên đăng nhập, đăng nhập lại.'}[r.err]||'Lỗi, thử lại.';return;}
  $('#pos').close();posReset();toast('Đã tạo đơn số '+r.no+' · '+money(r.total));
  if($('#auto-print').checked)printNo=r.no;
  refresh(true);
 },function(){b.disabled=false;$('#pos-msg').textContent='Lỗi kết nối, thử lại.';});
});
var toastT=null;
function toast(m){var t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},4000);}

// ---------------- khởi động
api('GET','/state').then(function(r){if(r.ok){S.rev=null;start();}else showLogin(r.err==='auth'?'':'Lỗi kết nối hoặc máy chủ chưa cài đặt xong.');},function(){showLogin('Lỗi kết nối.');});
setInterval(function(){if(!$('#app').hidden)paintTimes();},30000);
})();
