// =====================================================================
// XÍU — trang của tiệm: nhận đơn, xác nhận, sửa đơn, in phiếu, cài đặt
// Dùng tốt trên iPad (2–3 cột) và điện thoại (1 cột + thanh tab dưới đáy).
// =====================================================================
(function(){
'use strict';
function $(s,r){var e=(r||document).querySelector(s);if(!e&&!r&&s.charAt(0)==='#')console.error('quan-ly: không thấy phần tử',s);return e;}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function money(c){return (c/100).toFixed(2).replace('.',',')+' €';}
function hm(ts){return new Date(ts*1000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'});}
function ago(ts){var m=Math.max(0,Math.round((S.now-ts)/60));return m<1?'vừa xong':m<60?m+' phút':Math.floor(m/60)+' giờ '+(m%60)+' phút';}
function pref(k,v){try{if(v===undefined)return localStorage.getItem('xiu-staff-'+k);localStorage.setItem('xiu-staff-'+k,v);}catch(e){}return null;}
function mins(u){return Math.max(1,Math.ceil(((u||0)*1000-Date.now())/60000));}

var printNo=null,S={rev:null,orders:[],now:0},seen=null,timer=null,sound=pref('sound')==='1',audio=null;

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

// ---------------- chuông báo, giữ màn hình sáng
function unlockAudio(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch(e){}}
function chime(){
 if(navigator.vibrate)try{navigator.vibrate([200,100,200]);}catch(e){}
 if(!sound||!audio)return;
 [0,0.22,0.44].forEach(function(t,i){var o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=[880,1175,1568][i];
  g.gain.setValueAtTime(0.0001,audio.currentTime+t);g.gain.exponentialRampToValueAtTime(0.5,audio.currentTime+t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,audio.currentTime+t+0.35);
  o.connect(g);g.connect(audio.destination);o.start(audio.currentTime+t);o.stop(audio.currentTime+t+0.4);});
}
function paintSound(){var b=$('#sound');b.setAttribute('aria-pressed',sound);b.textContent=sound?'Chuông bật':'Chuông tắt';$('#sound-chk').checked=sound;}
function setSound(on){sound=on;pref('sound',sound?'1':'0');unlockAudio();paintSound();if(sound)chime();}
$('#sound').addEventListener('click',function(){setSound(!sound);});
$('#sound-chk').addEventListener('change',function(){setSound(this.checked);});
var wake=null;
function keepAwake(){
 if(pref('awake')==='0'||!navigator.wakeLock||document.hidden||$('#app').hidden||wake)return;
 navigator.wakeLock.request('screen').then(function(l){wake=l;l.addEventListener('release',function(){wake=null;});}).catch(function(){});
}
document.addEventListener('click',function(){unlockAudio();keepAwake();});

// ---------------- tải dữ liệu
function start(){
 $('#login').hidden=true;$('#app').hidden=false;paintSound();
 $('#auto-print').checked=pref('autoprint')==='1';$('#awake').checked=pref('awake')!=='0';
 setTab(pref('tab')||'new');keepAwake();refresh(true);
}
function refresh(force){
 clearTimeout(timer);
 return api('GET','/state'+(force||S.rev==null?'':'?rev='+encodeURIComponent(S.rev))).then(function(r){
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
   if(E.mode==='edit'&&$('#pos').open)syncEditor();
  }else paintTimes();
  timer=setTimeout(refresh,5000);
 },function(){$('#net').hidden=false;timer=setTimeout(refresh,8000);});
}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&!$('#app').hidden){refresh();keepAwake();}});

// ---------------- hiển thị bảng đơn
var LANG={fr:'FR',en:'EN',de:'DE',es:'ES',vi:'VI',zh:'中文',ko:'한국어'};
var GROUPS=['entree','plat','banhmi','dessert','boisson','autre'],GNAME={entree:'Khai vị',plat:'Món chính',banhmi:'Bánh mì',dessert:'Tráng miệng',boisson:'Đồ uống',autre:'Khác'};
var SVC={place:'Tại chỗ',emporter:'Mang đi'};
// xếp các dòng theo nhóm (đơn cũ không có nhóm → « Khác »)
function grouped(items,row,head){
 var g={};items.forEach(function(x){var k=GROUPS.indexOf(x.g)>=0?x.g:'autre';(g[k]=g[k]||[]).push(x);});
 return GROUPS.filter(function(k){return g[k];}).map(function(k){return head(GNAME[k])+g[k].map(row).join('');}).join('');
}
function fTag(x){return x.fid?(x.fvi||x.ffr||'combo')+' · '+(x.cents?money(x.cents)+'/phần':'tặng')+(x.auto?' · tự thêm':''):'';}
function itemName(x){if(x.vi||x.fr)return x.vi||x.fr;var p=PALL[x.id];return p?nm(p.it,'vi'):x.id;}

// so sánh hai danh sách món theo mã món → [{id,name,from,to}]
function qtyMap(items){var m={};(items||[]).forEach(function(x){if(x.qty>0)m[x.id]=(m[x.id]||0)+x.qty;});return m;}
function diffItems(a,b){
 var A=qtyMap(a),B=qtyMap(b),names={},out=[],ids=[];
 (a||[]).concat(b||[]).forEach(function(x){if(!names[x.id])names[x.id]=itemName(x);if(ids.indexOf(x.id)<0)ids.push(x.id);});
 ids.forEach(function(id){var f=A[id]||0,t=B[id]||0;if(f!==t)out.push({id:id,name:names[id],from:f,to:t});});
 return out;
}
function chgTxt(c){return (c.to>c.from?'+':'−')+Math.abs(c.to-c.from)+' '+c.name;}

function card(o){
 var chg=o.orig?diffItems(o.orig.items,o.items):[],cm={},first={};
 chg.forEach(function(c){cm[c.id]=c;});
 var items=grouped(o.items,function(x){
  var c=cm[x.id],mark='';
  if(c&&!first[x.id]){first[x.id]=1;mark='<em class="c-chg '+(c.to>c.from?'up':'down')+'">'+(c.from?'trước '+c.from:'mới thêm')+'</em>';}
  return '<li><span class="c-q">'+x.qty+'×</span><span class="c-n">'+esc(x.vi||x.fr)+mark+(x.vi&&x.fr?'<small>'+esc(x.fr)+'</small>':'')+(x.fid?'<em class="c-f">'+esc(fTag(x))+'</em>':'')+'</span><span class="c-p">'+(x.base>x.cents?'<s>'+money(x.base*x.qty)+'</s> ':'')+(x.cents?money(x.cents*x.qty):'0 €')+'</span></li>';
 },function(n){return '<li class="c-gh">'+esc(n)+'</li>';});
 var gone=chg.filter(function(c){return !c.to;});
 if(gone.length)items+='<li class="c-gh">Khách đã bỏ</li>'+gone.map(function(c){return '<li class="c-gone"><span class="c-q">'+c.from+'×</span><span class="c-n">'+esc(c.name)+'</span></li>';}).join('');
 var act={
  'new':'<button class="b b-green b-main" data-act="confirmed">Xác nhận</button><button class="b b-out" data-act="edit">Sửa</button><button class="b b-out" data-act="print">In</button><button class="b b-out" data-act="more">Khác</button>',
  confirmed:'<button class="b b-green b-main" data-act="done">Xong</button><button class="b b-out" data-act="edit">Sửa</button><button class="b b-out" data-act="print">In</button><button class="b b-out" data-act="more">Khác</button>',
  done:'<button class="b b-out" data-act="edit">Sửa</button><button class="b b-out" data-act="print">In</button><button class="b b-out" data-act="more">Khác</button>'
 }[o.status]||'<button class="b b-out" data-act="new">Khôi phục</button><button class="b b-out" data-act="print">In</button>';
 var st={done:'Xong',cancelled:'Đã hủy',expired:'Hết hạn, không ai xác nhận'}[o.status];
 var late=o.status==='new'&&S.now-o.created_at>600;
 return '<article class="card s-'+esc(o.status)+(S.fresh&&S.fresh.indexOf(o.id)>=0?' fresh':'')+'" data-id="'+o.id+'">'
  +'<div class="c-head"><span class="c-no">'+o.no+'</span>'
  +'<span class="c-who">'+(o.service?'<span class="c-svc s-'+esc(o.service)+'">'+esc(SVC[o.service]||o.service)+'</span>':'')+(o.name?'<span class="c-name">'+esc(o.name)+'</span>':'')+'</span>'
  +'<span class="c-time'+(late?' late':'')+'" data-ts="'+o.created_at+'"><b>'+hm(o.created_at)+'</b>'+ago(o.created_at)+'</span>'
  +'<span class="c-tags">'+(o.src==='staff'?'<span class="c-tag c-staff">Nhập tại quầy</span>':'<span class="c-tag">QR · '+esc(LANG[o.lang]||o.lang||'')+'</span>')
  +(o.edited_at?'<span class="c-tag c-ed">Đã sửa '+hm(o.edited_at)+'</span>':'')+(st?'<span class="c-tag">'+st+'</span>':'')+'</span></div>'
  +'<ul class="c-items">'+items+'</ul>'+(o.note?'<div class="c-note">'+esc(o.note)+'</div>':'')
  +'<div class="c-foot"><span class="c-total">'+(o.orig&&o.orig.total!==o.total_cents?'<s class="c-p">'+money(o.orig.total)+'</s> ':'')+money(o.total_cents)+'</span><div class="c-acts">'+act+'</div></div></article>';
}
function render(){
 var nw=[],cf=[],past=[];
 S.orders.forEach(function(o){(o.status==='new'?nw:o.status==='confirmed'?cf:past).push(o);});
 nw.sort(function(a,b){return a.id-b.id;});cf.sort(function(a,b){return a.id-b.id;});
 $('#list-new').innerHTML=nw.map(card).join('')||'<div class="empty">Chưa có đơn mới</div>';
 $('#list-conf').innerHTML=cf.map(card).join('')||'<div class="empty">Không có đơn đang làm</div>';
 $('#list-past').innerHTML=past.map(card).join('')||'<div class="empty">Trống</div>';
 [['new',nw],['conf',cf],['past',past]].forEach(function(p){$('#n-'+p[0]).textContent=p[1].length;$('#t-'+p[0]).textContent=p[1].length;});
 document.title=(nw.length?'('+nw.length+') ':'')+'Xíu · Đơn tại tiệm';
 var on=S.open;
 $('#state-dot').className='dot '+(on?'on':'off');
 var narrow=window.matchMedia('(max-width:699px)').matches;
 $('#state-txt').textContent=on?(narrow?'Nhận đơn':'Đang nhận đơn QR'):S.reason==='paused'?(narrow?'Tạm dừng':'Tạm dừng nhận đơn'):(narrow?'Ngoài giờ':'Ngoài giờ, không nhận');
 $('#mode-txt').textContent={auto:'Theo giờ mở cửa',open:'Luôn mở',paused:'Tạm dừng'}[S.mode]||'';
 $('#state').classList.toggle('is-off',!on);
 $$('#mode-dlg [data-mode]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.mode===S.mode);});
 renderSettings();
}
function paintTimes(){$$('.c-time[data-ts]').forEach(function(e){var ts=+e.dataset.ts;e.innerHTML='<b>'+hm(ts)+'</b>'+ago(ts);});}
function find(id){for(var i=0;i<S.orders.length;i++)if(S.orders[i].id===id)return S.orders[i];return null;}

// tab trên điện thoại
function setTab(t){if(['new','conf','past'].indexOf(t)<0)t='new';$('#board').dataset.tab=t;pref('tab',t);$$('.tabbar [data-tab]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.tab===t);});}
$$('.tabbar [data-tab]').forEach(function(b){b.addEventListener('click',function(){setTab(b.dataset.tab);window.scrollTo(0,0);});});
$('#past-toggle').addEventListener('click',function(){var c=$('.col-past'),o=!c.classList.contains('open');c.classList.toggle('open',o);this.setAttribute('aria-expanded',o);$('.past-more').textContent=o?'Ẩn':'Xem';});

// ---------------- thao tác trên thẻ đơn
function setStatus(o,status,btn){
 if(btn)btn.disabled=true;
 return api('POST','/order',{id:o.id,status:status}).then(function(r){
  if(r.ok&&status==='confirmed'&&$('#auto-print').checked)printTicket(o);
  if(!r.ok&&r.err==='auth')return showLogin();
  refresh(true);
 },function(){if(btn)btn.disabled=false;$('#net').hidden=false;});
}
$('#board').addEventListener('click',function(e){
 var b=e.target.closest('[data-act]');if(!b)return;
 var c=b.closest('.card');if(!c)return;
 var o=find(+c.dataset.id),act=b.dataset.act;if(!o)return;
 if(act==='print')return printTicket(o);
 if(act==='edit')return openEditor(o);
 if(act==='more')return openMore(o);
 setStatus(o,act,b);
});
function openMore(o){
 $('#more-title').textContent='Đơn số '+o.no+(o.name?' · '+o.name:'');
 var h='';
 if(o.status==='confirmed')h+='<button type="button" data-m="new"><b>Đưa về « Đơn mới »</b><small>Bấm nhầm « Xác nhận ».</small></button>';
 if(o.status==='done')h+='<button type="button" data-m="confirmed"><b>Đưa về « Đang làm »</b><small>Bấm nhầm « Xong ».</small></button>';
 if(o.status==='cancelled'||o.status==='expired')h+='<button type="button" data-m="new"><b>Khôi phục đơn</b><small>Đưa về « Đơn mới ».</small></button>';
 if(o.status!=='cancelled'&&o.status!=='expired')h+='<button type="button" data-m="edit"><b>Sửa đơn</b><small>Khách đổi món, đổi số lượng, tên, ghi chú, tại chỗ / mang đi.</small></button>';
 h+='<button type="button" data-m="print"><b>In phiếu</b></button>';
 if(o.status==='new'||o.status==='confirmed')h+='<button type="button" class="danger" data-m="cancelled"><b>Hủy đơn</b><small>Khách không lấy nữa.</small></button>';
 var body=$('#more-body');body.innerHTML=h;body.dataset.id=o.id;
 $('#more-dlg').showModal();
}
$('#more-body').addEventListener('click',function(e){
 var b=e.target.closest('[data-m]');if(!b)return;var o=find(+this.dataset.id),m=b.dataset.m;
 $('#more-dlg').close();if(!o)return;
 if(m==='print')return printTicket(o);
 if(m==='edit')return openEditor(o);
 if(m==='cancelled'&&!confirm('Hủy đơn số '+o.no+'?'))return;
 setStatus(o,m);
});
$('#state').addEventListener('click',function(){$('#mode-dlg').showModal();});
$$('#mode-dlg [data-mode]').forEach(function(b){b.addEventListener('click',function(){
 if(b.dataset.mode==='open'&&!confirm('Luôn nhận đơn, kể cả ngoài giờ mở cửa? (dùng để chạy thử)'))return;
 api('POST','/mode',{mode:b.dataset.mode}).then(function(){$('#mode-dlg').close();refresh(true);});});});

// ---------------- in
function pageStyle(css){var s=$('#page-style',document.head);if(!s){s=document.createElement('style');s.id='page-style';document.head.appendChild(s);}s.textContent=css;}
// prev: danh sách món trước khi sửa → phiếu « ĐƠN ĐÃ SỬA » có phần thay đổi cho bếp
function printTicket(o,prev){
 var rows=grouped(o.items,function(x){return '<tr><td class="q">'+x.qty+'×</td><td>'+esc(x.vi||x.fr)+(x.vi&&x.fr?'<div class="fr">'+esc(x.fr)+'</div>':'')+(x.fid?'<div class="fr">'+esc(fTag(x))+'</div>':'')+'</td><td class="p">'+(x.cents?money(x.cents*x.qty):'0 €')+'</td></tr>';},function(n){return '<tr><td colspan="3" class="gh">'+esc(n)+'</td></tr>';});
 var chg=prev?diffItems(prev,o.items):[];
 $('#print').innerHTML='<div class="tk"><h1>XÍU</h1>'+(prev?'<div class="edh">ĐƠN ĐÃ SỬA · MODIFIÉE</div>':'')+'<div class="no">N° '+o.no+'</div>'+(o.service?'<div class="svc">'+esc(o.service==='emporter'?'À EMPORTER':'SUR PLACE')+'</div>':'')+'<div class="meta">'+esc(o.day)+' · '+hm(o.created_at)+(o.name?' · '+esc(o.name):'')+(prev?' · sửa '+hm(Date.now()/1000):'')+'</div>'
  +(chg.length?'<div class="chg"><b>Thay đổi</b>'+chg.map(function(c){return '<div>'+esc(chgTxt(c))+'</div>';}).join('')+'</div>':'')
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
$$('.sheet [data-close]').forEach(function(b){b.addEventListener('click',function(){b.closest('dialog').close();});});
$$('.sheet').forEach(function(d){d.addEventListener('click',function(e){if(e.target===d)d.close();});});
$('#auto-print').addEventListener('change',function(){pref('autoprint',this.checked?'1':'0');});
$('#awake').addEventListener('change',function(){pref('awake',this.checked?'1':'0');if(this.checked)keepAwake();else if(wake){wake.release();wake=null;}});
$('#rotate').addEventListener('click',function(){if(!confirm('Đổi mã QR? Các tờ mã QR cũ sẽ không dùng được nữa, cần in lại.'))return;api('POST','/rotate',{}).then(function(){refresh(true);});});
$('#logout').addEventListener('click',function(){api('POST','/logout',{}).then(function(){$('#settings').close();showLogin();});});
$('#logout-all').addEventListener('click',function(){if(!confirm('Đăng xuất tất cả máy đang mở trang này?'))return;api('POST','/logout-all',{}).then(function(){$('#settings').close();showLogin();});});

// =====================================================================
// TRÌNH NHẬP ĐƠN: dùng chung cho « Đơn mới tại quầy » và « Sửa đơn »
// =====================================================================
var CFG=window.FORMULES||{},CALC=window.XIU_CALC,MENU=window.MENU||[];
if(!CALC)console.error('quan-ly: thiếu assets/formule-calc.js');
function pAvail(it){if(!it.days)return true;var w=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',weekday:'short'}).format(new Date());return it.days.indexOf({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[w])>=0;}
var P={cart:{},decl:{},svc:null,cat:'all',q:''},PITEMS={},PCAT={},PALL={};
// E: chế độ trình nhập. mode 'new' | 'edit'; id, ver, order (bản đang lưu), base (ảnh chụp lúc mở để biết có thay đổi chưa lưu)
var E={mode:'new'};
function pcents(p){var m=/(\d+)(?:[.,](\d{1,2}))?/.exec(String(p||''));if(!m)return null;var c=+m[1]*100+(m[2]?+((m[2]+'0').slice(0,2)):0);return c>0?c:null;}
function nm(it,l){return ((it[l]||[])[0])||((it.fr||[])[0])||it.id;}
function fold(x){return String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();}
function pimg(n){return 'assets/img/menu/'+(n.indexOf('.')>0?n:n+'.webp');}
MENU.forEach(function(c){(c.items||[]).forEach(function(it){if(!it.id)return;if(!PALL[it.id])PALL[it.id]={it:it,cat:c.id};if(c.hide||it.hide||PITEMS[it.id]||!pcents(it.price)||!pAvail(it))return;PITEMS[it.id]=it;PCAT[it.id]=c.id;});});
function pcalc(){
 var items=[];Object.keys(P.cart).forEach(function(id){var it=PITEMS[id];if(it&&P.cart[id]>0)items.push({id:id,qty:P.cart[id],cents:pcents(it.price),cat:PCAT[id]});});
 var a=PALL[CFG.auto_drink];
 return CALC?CALC.compute(CFG,items,P.decl,a?{id:a.it.id,cents:pcents(a.it.price)||0,cat:a.cat}:null):{lines:[],total:0};
}
// dòng đã tính → dạng giống đơn đã lưu (để so sánh, hiện thay đổi)
function asItems(lines){return lines.filter(function(l){return l.qty>0;}).map(function(l){var x=PALL[l.id];return {id:l.id,qty:l.qty,vi:x?nm(x.it,'vi'):'',fr:x?nm(x.it,'fr'):l.id};});}
function snapshot(){var c=pcalc();return JSON.stringify([asItems(c.lines).map(function(x){return x.id+':'+x.qty;}).sort(),P.svc,$('#pos-name').value.trim(),$('#pos-note').value.trim()]);}
function dirty(){return E.base!=null&&snapshot()!==E.base;}

function posCats(){
 var h='<button type="button" data-pc="all" aria-pressed="'+(P.cat==='all')+'">Tất cả</button>';
 MENU.forEach(function(c){if(c.hide)return;if(!(c.items||[]).some(function(it){return PITEMS[it.id];}))return;
  var t=c.title||{};h+='<button type="button" data-pc="'+esc(c.id)+'" aria-pressed="'+(P.cat===c.id)+'">'+esc(t.vi||t.fr||c.id)+'</button>';});
 $('#pos-cats').innerHTML=h;
}
function posGrid(){
 var q=fold(P.q),h='';
 MENU.forEach(function(c){if(c.hide)return;if(!q&&P.cat!=='all'&&P.cat!==c.id)return;
  (c.items||[]).forEach(function(it){if(!PITEMS[it.id]||PCAT[it.id]!==c.id)return;
   if(q&&fold(nm(it,'vi')+' '+nm(it,'fr')).indexOf(q)<0)return;
   var n=P.cart[it.id]||0;
   h+='<div class="pos-item'+(n?' on':'')+'" data-pid="'+esc(it.id)+'"><button type="button" class="pi-add" data-add>'+(it.img?'<img src="'+esc(pimg(it.img))+'" alt="" loading="lazy" width="64" height="64">':'<span class="noimg"></span>')
    +'<span class="pi-t"><b>'+esc(nm(it,'vi'))+'</b><small>'+esc(nm(it,'fr'))+'</small><span class="pi-p">'+money(pcents(it.price))+'</span></span></button>'
    +(n?'<span class="pi-n">'+n+'</span><button type="button" class="pi-minus" data-minus aria-label="Bớt một phần">−</button>':'')+'</div>';});});
 $('#pos-grid').innerHTML=h||'<p class="empty">Không tìm thấy món.</p>';
}
function posCart(){
 var c=pcalc(),n=0;
 $('#pos-lines').innerHTML=c.lines.length?grouped(c.lines.map(function(l,i){var x=PALL[l.id],f=l.fid&&PALL[l.fid];n+=l.qty;
  return {g:l.group,html:'<li class="pos-line'+(l.fid?' is-f':'')+'" data-i="'+i+'"><span class="c-n">'+esc(x?nm(x.it,'vi'):l.id)+'<small>'+esc(x?nm(x.it,'fr'):'')+'</small>'+(f?'<em class="c-f">'+esc(nm(f.it,'vi'))+(l.auto?' · tự thêm':'')+'</em>':'')+'</span>'
   +'<span class="pq"><button type="button" data-pm aria-label="Bớt">−</button><b>'+l.qty+'</b><button type="button" data-pp aria-label="Thêm"'+((l.auto&&l.qty>=l.max)||(!l.auto&&(P.cart[l.id]||0)>=10)?' disabled':'')+'>+</button></span>'
   +'<span class="c-p">'+(l.base>l.cents?'<s>'+money(l.base*l.qty)+'</s> ':'')+(l.cents?money(l.cents*l.qty):'0 €')+'</span></li>'};}),
  function(x){return x.html;},function(g){return '<li class="c-gh">'+esc(g)+'</li>';}):'<li class="empty">Chạm vào món để thêm vào đơn.</li>';
 $$('#pos-lines .pos-line').forEach(function(li){var l=c.lines[+li.dataset.i];
  li.querySelector('[data-pm]').addEventListener('click',function(){pstep(l,-1);});
  li.querySelector('[data-pp]').addEventListener('click',function(){pstep(l,1);});});
 var info=$('#pos-info');
 if(E.missing&&E.missing.length){info.hidden=false;info.className='pos-info warn';info.textContent='Không còn trong menu hôm nay, sẽ bị bỏ khi lưu: '+E.missing.map(function(x){return x.qty+'× '+itemName(x);}).join(', ')+'.';}
 else if(c.lines.some(function(l){return l.fid;})){info.hidden=false;info.className='pos-info';info.textContent='Combo đã tự áp dụng: nước ngọt, trà, cà phê 0 € với khai vị + món chính, 1 € với khai vị + bánh mì / bánh giò. Bia không giảm.';}
 else if(c.upsell){info.hidden=false;info.className='pos-info up';info.textContent='Gợi ý khách: thêm một món khai vị để được combo (tặng nước hoặc nước 1 €).';}
 else info.hidden=true;
 $('#pos-total').innerHTML=(E.mode==='edit'&&E.order&&E.order.total_cents!==c.total?'<s>'+money(E.order.total_cents)+'</s>':'')+money(c.total);
 $$('[data-psvc]').forEach(function(b){b.setAttribute('aria-checked',P.svc===b.dataset.psvc);});
 $('#pos-n').textContent=n;
 var j=$('#pos-jump');j.hidden=!n||$('#pos-body').dataset.view!=='menu';j.textContent='Xem đơn · '+n+' món · '+money(c.total);
 if(E.mode==='edit')posEditBox(c);
}
// khung vàng khi sửa: thay đổi so với bản đang lưu + bản khách gửi ban đầu
function posEditBox(c){
 var o=E.order,now=asItems(c.lines),chg=diffItems(o.items,now),parts=chg.map(function(x){return '<span class="'+(x.to>x.from?'up':'down')+'">'+esc(chgTxt(x))+'</span>';});
 if(P.svc!==o.service)parts.push('<span>'+esc(SVC[P.svc]||'—')+'</span>');
 if($('#pos-name').value.trim()!==(o.name||''))parts.push('<span>Tên: '+esc($('#pos-name').value.trim()||'—')+'</span>');
 if($('#pos-note').value.trim()!==(o.note||''))parts.push('<span>Ghi chú mới</span>');
 var h='<div class="pe-h">Đơn số '+o.no+' · gửi lúc '+hm(o.created_at)+' '+(o.src==='staff'?'tại quầy':'qua QR')+(o.status==='confirmed'?' · bếp đang làm':'')+'</div>'
  +(parts.length?'<div class="pe-chg">'+parts.join('')+'</div>':'<div class="pe-none">Chưa có thay đổi. Thêm, bớt món hoặc sửa thông tin bên dưới.</div>');
 if(o.orig)h+='<details><summary>Bản khách gửi ban đầu · '+money(o.orig.total)+'</summary><ul>'+o.orig.items.map(function(x){return '<li>'+x.qty+'× '+esc(itemName(x))+'</li>';}).join('')+'</ul>'
  +'<button type="button" class="b b-out" data-orig>Dùng lại bản khách gửi</button></details>';
 $('#pos-edit').innerHTML=h;
}
function pstep(l,d){
 if(l.auto){P.decl[l.fid]=Math.max(0,Math.min(l.max,l.max-(l.qty+d)));}
 else{var q=(P.cart[l.id]||0)+d;if(q>0)P.cart[l.id]=Math.min(10,q);else delete P.cart[l.id];}
 $('#pos-msg').textContent='';posAll();
}
function posAll(){posGrid();posCart();}
function setView(v){$('#pos-body').dataset.view=v;$$('.pos-views [data-view]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.view===v);});posCart();}

// nạp một đơn đã lưu vào trình nhập (giỏ món + số nước combo khách đã bỏ)
function loadItems(items){
 P.cart={};P.decl={};E.missing=[];
 (items||[]).forEach(function(x){if(x.auto)return;if(!PITEMS[x.id]){E.missing.push(x);return;}P.cart[x.id]=Math.min(10,(P.cart[x.id]||0)+x.qty);});
 var want={};(items||[]).forEach(function(x){if(x.auto&&x.fid)want[x.fid]=(want[x.fid]||0)+x.qty;});
 pcalc().lines.forEach(function(l){if(l.auto)P.decl[l.fid]=Math.max(0,l.max-(want[l.fid]||0));});
}
function fillEditor(o){
 E={mode:'edit',id:o.id,ver:o.ver||0,order:o,missing:[]};
 loadItems(o.items);
 P.svc=o.service||null;$('#pos-name').value=o.name||'';$('#pos-note').value=o.note||'';
 E.base=snapshot();
}
function openEditor(o){
 resetForm();
 var pos=$('#pos');
 if(o){
  fillEditor(o);
  pos.classList.add('is-edit');
  $('#pos-title').textContent='Sửa đơn số '+o.no+(o.name?' · '+o.name:'');
  $('#pos-sub').textContent=(o.src==='staff'?'Nhập tại quầy':'Khách đặt qua QR')+' lúc '+hm(o.created_at);
  $('#pos-edit').hidden=false;$('#pos-send').textContent='Lưu thay đổi';$('#pos-clear').textContent='Hoàn tác';
 }else{
  E={mode:'new',base:null};
  pos.classList.remove('is-edit');
  $('#pos-title').textContent='Đơn mới tại quầy';$('#pos-sub').textContent='Khách gọi trực tiếp, không dùng điện thoại';
  $('#pos-edit').hidden=true;$('#pos-send').textContent='Tạo đơn';$('#pos-clear').textContent='Xóa hết';
  E.base=snapshot();
 }
 posCats();
 if(!pos.open)pos.showModal();
 setView(o?'cart':'menu');posAll();
}
function resetForm(){P.cart={};P.decl={};P.svc=null;P.q='';P.cat='all';$('#pos-q').value='';$('#pos-name').value='';$('#pos-note').value='';$('#pos-msg').textContent='';
 $('.pos-svc').classList.remove('need');$('#pos-name').classList.remove('need');}
function closeEditor(force){
 if(!force&&dirty()&&!confirm(E.mode==='edit'?'Bỏ các thay đổi chưa lưu?':'Bỏ đơn đang nhập?'))return false;
 $('#pos').close();E={mode:'new'};return true;
}
// bản trên máy chủ thay đổi khi đang sửa (máy khác vừa lưu, đổi trạng thái)
function syncEditor(){
 var o=find(E.id);if(!o)return;
 if((o.ver||0)===E.ver){E.order=o;posCart();return;}
 if(!dirty()){fillEditor(o);posAll();$('#pos-msg').textContent='Đơn vừa được sửa trên máy khác, đã tải bản mới.';}
 else $('#pos-msg').textContent='Chú ý: đơn này vừa được sửa trên máy khác.';
}

$('#open-pos').addEventListener('click',function(){openEditor(null);});
$('#pos-close').addEventListener('click',function(){closeEditor(false);});
$('#pos').addEventListener('cancel',function(e){e.preventDefault();closeEditor(false);});
$$('.pos-views [data-view]').forEach(function(b){b.addEventListener('click',function(){setView(b.dataset.view);});});
$('#pos-back').addEventListener('click',function(){setView('menu');});
$('#pos-jump').addEventListener('click',function(){setView('cart');$('#pos-cart').scrollTop=0;});
$('#pos-cats').addEventListener('click',function(e){var b=e.target.closest('[data-pc]');if(!b)return;P.cat=b.dataset.pc;P.q='';$('#pos-q').value='';posCats();posGrid();$('.pos-menu').scrollTop=0;});
$('#pos-grid').addEventListener('click',function(e){
 var t=e.target.closest('[data-add],[data-minus]');if(!t)return;
 var id=t.closest('[data-pid]').dataset.pid;
 if(t.hasAttribute('data-minus')){var q=(P.cart[id]||0)-1;if(q>0)P.cart[id]=q;else delete P.cart[id];}
 else P.cart[id]=Math.min(10,(P.cart[id]||0)+1);
 $('#pos-msg').textContent='';posAll();
});
$('#pos-q').addEventListener('input',function(){P.q=this.value;posGrid();});
['#pos-name','#pos-note'].forEach(function(k){$(k).addEventListener('input',function(){this.classList.remove('need');if(E.mode==='edit')posCart();});});
$$('[data-psvc]').forEach(function(b){b.addEventListener('click',function(){P.svc=b.dataset.psvc;$('.pos-svc').classList.remove('need');posCart();});});
$('#pos-edit').addEventListener('click',function(e){
 if(!e.target.closest('[data-orig]')||!E.order||!E.order.orig)return;
 var g=E.order.orig;loadItems(g.items);P.svc=g.service||P.svc;$('#pos-name').value=g.name||'';$('#pos-note').value=g.note||'';posAll();
});
$('#pos-clear').addEventListener('click',function(){
 if(E.mode==='edit'){if(dirty()&&!confirm('Bỏ mọi thay đổi chưa lưu, quay về bản đang lưu?'))return;fillEditor(E.order);$('#pos-msg').textContent='';posAll();return;}
 if(Object.keys(P.cart).length&&!confirm('Xóa toàn bộ đơn đang nhập?'))return;resetForm();posAll();
});
var ERR={name:'Nhập tên hoặc số bàn.',note:'Nhập ghi chú.',items:'Có món không còn trong menu hôm nay hoặc quá số lượng cho phép (10 phần mỗi món, 30 phần mỗi đơn).',service:'Chọn « Ăn tại chỗ » hoặc « Mang đi ».',auth:'Hết phiên đăng nhập, đăng nhập lại.',locked:'Đơn đã hủy hoặc hết hạn, không sửa được. Khôi phục đơn trước.',gone:'Đơn không còn trên máy chủ.'};
$('#pos-send').addEventListener('click',function(){
 var items=Object.keys(P.cart).map(function(id){return {id:id,qty:P.cart[id]};});
 var msg=$('#pos-msg');
 function need(m,sel){msg.textContent=m;setView('cart');if(sel){var e=$(sel);e.classList.add('need');if(e.focus&&e.tagName!=='DIV')e.focus();}}
 if(!items.length)return need(E.mode==='edit'?'Đơn phải còn ít nhất một món. Muốn bỏ cả đơn thì dùng « Khác » → « Hủy đơn ».':'Chưa có món nào.');
 if(!P.svc)return need('Chọn « Ăn tại chỗ » hoặc « Mang đi ».','.pos-svc');
 if(!$('#pos-name').value.trim())return need('Nhập tên hoặc số bàn.','#pos-name');
 if(E.mode==='edit'&&!dirty()){closeEditor(true);return;}
 var b=this;b.disabled=true;msg.textContent='';
 var body={items:items,decline:P.decl,service:P.svc,name:$('#pos-name').value,note:$('#pos-note').value,lang:'vi'};
 if(E.mode==='edit'){
  var o=E.order;body.id=o.id;body.ver=E.ver;
  api('POST','/edit',body).then(function(r){
   b.disabled=false;
   if(!r.ok){
    if(r.err==='stale'){msg.textContent='Đơn vừa được sửa trên máy khác. Đã tải bản mới, kiểm tra rồi sửa lại.';refresh(true).then(function(){var n=find(o.id);if(n){fillEditor(n);posAll();}});return;}
    msg.textContent=ERR[r.err]||'Lỗi, thử lại.';return;
   }
   var after={id:o.id,no:o.no,day:o.day,created_at:o.created_at,service:body.service,name:body.name.trim(),note:body.note.trim(),items:r.items,total_cents:r.total},prev=o.items;
   var kitchen=o.status==='confirmed';
   closeEditor(true);
   if(kitchen&&$('#auto-print').checked){printTicket(after,prev);toast('Đã lưu đơn số '+o.no+', đã in phiếu sửa');}
   else toast('Đã lưu đơn số '+o.no+' · '+money(r.total),kitchen||o.status==='new'?{label:'In phiếu sửa',fn:function(){printTicket(after,prev);}}:null);
   refresh(true);
  },function(){b.disabled=false;msg.textContent='Lỗi kết nối, thử lại.';});
  return;
 }
 api('POST','/orders',body).then(function(r){
  b.disabled=false;
  if(!r.ok){msg.textContent=ERR[r.err]||'Lỗi, thử lại.';return;}
  closeEditor(true);toast('Đã tạo đơn số '+r.no+' · '+money(r.total));
  if($('#auto-print').checked)printNo=r.no;
  refresh(true);
 },function(){b.disabled=false;msg.textContent='Lỗi kết nối, thử lại.';});
});
var toastT=null;
function toast(m,action){
 var t=$('#toast');t.innerHTML='<span>'+esc(m)+'</span>'+(action?'<button type="button" class="b">'+esc(action.label)+'</button>':'');
 if(action)$('.b',t).addEventListener('click',function(){t.hidden=true;action.fn();});
 t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},action?9000:4000);
}

// ---------------- khởi động
api('GET','/state').then(function(r){if(r.ok){S.rev=null;start();}else showLogin(r.err==='auth'?'':'Lỗi kết nối hoặc máy chủ chưa cài đặt xong.');},function(){showLogin('Lỗi kết nối.');});
setInterval(function(){if(!$('#app').hidden)paintTimes();},30000);
})();
