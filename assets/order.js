// =====================================================================
// XÍU — đặt món tại tiệm (giỏ hàng trên trang menu)
// Chỉ bật khi khách mở menu.html?t=MÃ từ mã QR trong tiệm.
// Không có mã → trang menu giữ nguyên như cũ.
// =====================================================================
(function(){
'use strict';
var X=window.XIU;if(!X||!document.getElementById('cats'))return;

var S={
fr:{hint:"Commandez depuis votre téléphone : touchez un plat pour l’ajouter, puis envoyez. Paiement au comptoir.",add:"Ajouter",cart:"Mon panier",view:"Voir le panier",send:"Envoyer la commande",sending:"Envoi…",total:"Total",pay:"Paiement au comptoir après confirmation.",name:"Prénom ou n° de table (facultatif)",note:"Remarque (facultatif)",note_ph:"Ex. : sans coriandre, allergie…",empty:"Votre panier est vide.",sent:"Commande envoyée",your_no:"Votre numéro",show:"Présentez ce numéro au comptoir pour confirmer et payer.",st_new:"En attente de confirmation au comptoir",st_confirmed:"Confirmée · en préparation",st_done:"Terminée · merci !",st_cancelled:"Annulée · merci de voir le comptoir",st_expired:"Expirée · merci de voir le comptoir",again:"Nouvelle commande",closed:"La commande en ligne est fermée pour le moment. Commandez au comptoir.",paused:"La commande en ligne est en pause. Commandez au comptoir.",blocked:"Trop de commandes depuis cet appareil. Réessayez dans {m} min ou commandez au comptoir.",busy:"Beaucoup de commandes en attente. Merci de commander au comptoir.",token:"Ce QR code n’est plus valable. Scannez le QR code affiché en boutique.",robot:"Vérification anti-robot échouée. Réessayez.",err:"Problème de connexion. Réessayez.",formule:"Formule : demandez-la au comptoir au moment de payer.",remove:"Retirer",my_order:"Ma commande"},
en:{hint:"Order from your phone: tap a dish to add it, then send. Pay at the counter.",add:"Add",cart:"My basket",view:"View basket",send:"Send order",sending:"Sending…",total:"Total",pay:"Pay at the counter once confirmed.",name:"First name or table no. (optional)",note:"Note (optional)",note_ph:"e.g. no coriander, allergy…",empty:"Your basket is empty.",sent:"Order sent",your_no:"Your number",show:"Show this number at the counter to confirm and pay.",st_new:"Waiting for confirmation at the counter",st_confirmed:"Confirmed · being prepared",st_done:"Done · thank you!",st_cancelled:"Cancelled · please see the counter",st_expired:"Expired · please see the counter",again:"New order",closed:"Online ordering is closed right now. Please order at the counter.",paused:"Online ordering is paused. Please order at the counter.",blocked:"Too many orders from this device. Try again in {m} min or order at the counter.",busy:"Lots of orders waiting. Please order at the counter.",token:"This QR code is no longer valid. Scan the QR code in the shop.",robot:"Anti-bot check failed. Please try again.",err:"Connection problem. Please try again.",formule:"Set menu: ask for it at the counter when you pay.",remove:"Remove",my_order:"My order"},
de:{hint:"Mit dem Handy bestellen: Gericht antippen, hinzufügen, absenden. Bezahlt wird an der Theke.",add:"Hinzufügen",cart:"Warenkorb",view:"Warenkorb ansehen",send:"Bestellung senden",sending:"Wird gesendet…",total:"Gesamt",pay:"Bezahlung an der Theke nach Bestätigung.",name:"Vorname oder Tischnummer (optional)",note:"Anmerkung (optional)",note_ph:"z. B. ohne Koriander, Allergie…",empty:"Der Warenkorb ist leer.",sent:"Bestellung gesendet",your_no:"Ihre Nummer",show:"Zeigen Sie diese Nummer an der Theke, um zu bestätigen und zu bezahlen.",st_new:"Wartet auf Bestätigung an der Theke",st_confirmed:"Bestätigt · wird zubereitet",st_done:"Fertig · danke!",st_cancelled:"Storniert · bitte an der Theke melden",st_expired:"Abgelaufen · bitte an der Theke melden",again:"Neue Bestellung",closed:"Die Online-Bestellung ist gerade geschlossen. Bitte an der Theke bestellen.",paused:"Die Online-Bestellung ist pausiert. Bitte an der Theke bestellen.",blocked:"Zu viele Bestellungen von diesem Gerät. Bitte in {m} Min. erneut versuchen oder an der Theke bestellen.",busy:"Viele Bestellungen in Wartestellung. Bitte an der Theke bestellen.",token:"Dieser QR-Code ist nicht mehr gültig. Bitte den QR-Code im Laden scannen.",robot:"Bot-Prüfung fehlgeschlagen. Bitte erneut versuchen.",err:"Verbindungsproblem. Bitte erneut versuchen.",formule:"Menü: bitte beim Bezahlen an der Theke angeben.",remove:"Entfernen",my_order:"Meine Bestellung"},
es:{hint:"Pide desde el móvil: toca un plato para añadirlo y envía el pedido. Se paga en el mostrador.",add:"Añadir",cart:"Mi cesta",view:"Ver la cesta",send:"Enviar pedido",sending:"Enviando…",total:"Total",pay:"Pago en el mostrador tras la confirmación.",name:"Nombre o n.º de mesa (opcional)",note:"Comentario (opcional)",note_ph:"P. ej.: sin cilantro, alergia…",empty:"La cesta está vacía.",sent:"Pedido enviado",your_no:"Tu número",show:"Muestra este número en el mostrador para confirmar y pagar.",st_new:"Pendiente de confirmación en el mostrador",st_confirmed:"Confirmado · en preparación",st_done:"Listo · ¡gracias!",st_cancelled:"Cancelado · pasa por el mostrador",st_expired:"Caducado · pasa por el mostrador",again:"Nuevo pedido",closed:"El pedido en línea está cerrado ahora. Pide en el mostrador.",paused:"El pedido en línea está en pausa. Pide en el mostrador.",blocked:"Demasiados pedidos desde este dispositivo. Vuelve a intentarlo en {m} min o pide en el mostrador.",busy:"Hay muchos pedidos en espera. Pide en el mostrador, por favor.",token:"Este código QR ya no es válido. Escanea el código QR de la tienda.",robot:"Falló la verificación anti-robot. Inténtalo de nuevo.",err:"Problema de conexión. Inténtalo de nuevo.",formule:"Menú: pídelo en el mostrador al pagar.",remove:"Quitar",my_order:"Mi pedido"},
vi:{hint:"Gọi món bằng điện thoại: chạm vào món để thêm, rồi gửi đơn. Thanh toán tại quầy.",add:"Thêm",cart:"Giỏ hàng",view:"Xem giỏ hàng",send:"Gửi đơn",sending:"Đang gửi…",total:"Tổng cộng",pay:"Thanh toán tại quầy sau khi xác nhận.",name:"Tên hoặc số bàn (không bắt buộc)",note:"Ghi chú (không bắt buộc)",note_ph:"Ví dụ: không rau mùi, dị ứng…",empty:"Giỏ hàng đang trống.",sent:"Đã gửi đơn",your_no:"Số của quý khách",show:"Đưa số này tại quầy để xác nhận và thanh toán.",st_new:"Đang chờ xác nhận tại quầy",st_confirmed:"Đã xác nhận · đang chuẩn bị",st_done:"Hoàn tất · cảm ơn quý khách!",st_cancelled:"Đã hủy · vui lòng đến quầy",st_expired:"Hết hạn · vui lòng đến quầy",again:"Đơn mới",closed:"Hiện chưa nhận đơn qua điện thoại. Vui lòng gọi món tại quầy.",paused:"Tạm dừng nhận đơn qua điện thoại. Vui lòng gọi món tại quầy.",blocked:"Thiết bị này đã gửi quá nhiều đơn. Thử lại sau {m} phút hoặc gọi món tại quầy.",busy:"Đang có nhiều đơn chờ. Vui lòng gọi món tại quầy.",token:"Mã QR này đã hết hiệu lực. Vui lòng quét mã QR tại tiệm.",robot:"Kiểm tra chống robot không thành công. Vui lòng thử lại.",err:"Lỗi kết nối. Vui lòng thử lại.",formule:"Combo: vui lòng báo tại quầy khi thanh toán.",remove:"Bỏ",my_order:"Đơn của tôi"},
zh:{hint:"用手机点餐：点击菜品加入，再提交订单。到柜台付款。",add:"加入",cart:"购物车",view:"查看购物车",send:"提交订单",sending:"提交中…",total:"合计",pay:"确认后在柜台付款。",name:"名字或桌号（选填）",note:"备注（选填）",note_ph:"例如：不要香菜、过敏…",empty:"购物车是空的。",sent:"订单已提交",your_no:"您的号码",show:"请到柜台出示此号码，确认并付款。",st_new:"等待柜台确认",st_confirmed:"已确认 · 制作中",st_done:"已完成 · 谢谢！",st_cancelled:"已取消 · 请到柜台",st_expired:"已过期 · 请到柜台",again:"再点一单",closed:"目前不接受手机点餐，请到柜台点餐。",paused:"手机点餐已暂停，请到柜台点餐。",blocked:"此设备提交的订单过多。请 {m} 分钟后再试，或到柜台点餐。",busy:"等待中的订单较多，请到柜台点餐。",token:"此二维码已失效，请扫描店内的二维码。",robot:"人机验证失败，请重试。",err:"网络连接问题，请重试。",formule:"套餐：请在柜台付款时说明。",remove:"移除",my_order:"我的订单"},
ko:{hint:"휴대폰으로 주문하세요: 메뉴를 눌러 담고 주문을 보내세요. 결제는 카운터에서 합니다.",add:"담기",cart:"장바구니",view:"장바구니 보기",send:"주문 보내기",sending:"보내는 중…",total:"합계",pay:"확인 후 카운터에서 결제합니다.",name:"이름 또는 테이블 번호 (선택)",note:"요청 사항 (선택)",note_ph:"예: 고수 빼기, 알레르기…",empty:"장바구니가 비어 있습니다.",sent:"주문이 전송되었습니다",your_no:"주문 번호",show:"카운터에서 이 번호를 보여 주시고 확인 후 결제해 주세요.",st_new:"카운터 확인 대기 중",st_confirmed:"확인됨 · 준비 중",st_done:"완료 · 감사합니다!",st_cancelled:"취소됨 · 카운터로 와 주세요",st_expired:"만료됨 · 카운터로 와 주세요",again:"새 주문",closed:"지금은 온라인 주문을 받지 않습니다. 카운터에서 주문해 주세요.",paused:"온라인 주문이 일시 중지되었습니다. 카운터에서 주문해 주세요.",blocked:"이 기기에서 주문이 너무 많습니다. {m}분 후 다시 시도하거나 카운터에서 주문해 주세요.",busy:"대기 중인 주문이 많습니다. 카운터에서 주문해 주세요.",token:"이 QR 코드는 더 이상 유효하지 않습니다. 매장의 QR 코드를 스캔해 주세요.",robot:"로봇 확인에 실패했습니다. 다시 시도해 주세요.",err:"연결 문제가 발생했습니다. 다시 시도해 주세요.",formule:"세트 메뉴: 결제할 때 카운터에 말씀해 주세요.",remove:"빼기",my_order:"내 주문"}
};
var LOC={fr:'fr-FR',en:'en-GB',de:'de-DE',es:'es-ES',vi:'vi-VN',zh:'zh-CN',ko:'ko-KR'};

// chuỗi bổ sung: combo, nút thêm nhanh
(function(A){for(var l in A)for(var k in A[l])S[l][k]=A[l][k];})({
fr:{free:"Offert",f_note:"Formule : boisson ajoutée automatiquement, choix de la canette au comptoir.",upsell:"Ajoutez une entrée (nems, rouleau) pour la formule : boisson offerte avec un plat, à 1 € avec un bánh mì.",added:"Ajouté"},
en:{free:"Free",f_note:"Set menu: drink added automatically, choose your can at the counter.",upsell:"Add a starter (nems, roll) for the set menu: free drink with a main dish, €1 with a bánh mì.",added:"Added"},
de:{free:"Gratis",f_note:"Menü: Getränk automatisch hinzugefügt, Dose an der Theke wählen.",upsell:"Mit einer Vorspeise (Nems, Rolle) gibt es das Menü: Getränk gratis zum Hauptgericht, 1 € zum Bánh mì.",added:"Hinzugefügt"},
es:{free:"Gratis",f_note:"Menú: bebida añadida automáticamente, elige la lata en el mostrador.",upsell:"Añade un entrante (nems, rollito) para el menú: bebida gratis con un plato, a 1 € con un bánh mì.",added:"Añadido"},
vi:{free:"Tặng",f_note:"Combo: nước được thêm tự động, chọn loại lon tại quầy.",upsell:"Thêm một món khai vị (chả giò, gỏi cuốn) để được combo: tặng nước khi gọi món chính, nước 1 € khi gọi bánh mì.",added:"Đã thêm"},
zh:{free:"免费",f_note:"套餐：已自动加入饮料，请在柜台选择罐装饮料。",upsell:"加一份前菜（炸春卷、春卷）即享套餐：配主菜送饮料，配越南法包饮料仅 1 欧元。",added:"已加入"},
ko:{free:"무료",f_note:"세트: 음료가 자동으로 추가됩니다. 캔 음료는 카운터에서 고르세요.",upsell:"애피타이저(넴, 롤)를 추가하면 세트 혜택: 메인 요리와 함께 음료 무료, 반미와 함께 음료 1유로.",added:"담았습니다"}
});

function L(){return X.lang();}
function t(k){var d=S[L()]||S.fr;return d[k]!=null?d[k]:S.fr[k];}
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
var esc=X.esc;
function money(c){try{return new Intl.NumberFormat(LOC[L()]||'fr-FR',{style:'currency',currency:'EUR'}).format(c/100);}catch(e){return (c/100).toFixed(2).replace('.',',')+' €';}}
function cents(p){var m=/(\d+)(?:[.,](\d{1,2}))?/.exec(String(p||''));if(!m)return null;var c=+m[1]*100+(m[2]?+((m[2]+'0').slice(0,2)):0);return c>0?c:null;}
function store(k,v){try{if(v==null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function load(k){try{return JSON.parse(sessionStorage.getItem(k));}catch(e){return null;}}
function lstore(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function lload(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}

// ---------- mã QR: lấy từ địa chỉ rồi xóa khỏi thanh địa chỉ
var token=null;
try{
 var u=new URL(location.href),q=u.searchParams.get('t');
 if(q&&/^[a-z0-9]{4,40}$/i.test(q)){store('xiu-t',q);u.searchParams.delete('t');history.replaceState(null,'',u.pathname+u.search+u.hash);}
 token=load('xiu-t');
}catch(e){}

// ---------- thực đơn: id → món, id → danh mục; mọi món (kể cả combo) để lấy tên
var ITEMS={},CAT={},ALL={};
(window.MENU||[]).forEach(function(c){(c.items||[]).forEach(function(it){if(!it.id)return;if(!ALL[it.id])ALL[it.id]=it;if(c.hide||it.hide||ITEMS[it.id])return;ITEMS[it.id]=it;CAT[it.id]=c.id;});});
function priceOf(it){return it?cents(it.price):null;}
var FORM=(window.FORMULES||[]).filter(function(f){return f&&f.id;});

var info=null;           // trả lời của /api/session
var cart=load('xiu-cart')||{};
var decl=load('xiu-decl')||{};  // số nước combo khách bỏ
var last=lload('xiu-last'); // {code,no,at,total,lines}
if(last&&Date.now()-last.at>6*3600e3){last=null;lstore('xiu-last',null);}
var tsToken=null,tsWidget=null,polling=null,lastStatus=null,sending=false;

function cleanCart(){Object.keys(cart).forEach(function(id){if(!priceOf(ITEMS[id])||!(cart[id]>0))delete cart[id];});}
// combo: cùng thuật toán với máy chủ (worker/index.js → formulaCounts)
function formulas(){
 var used=0,out=[];
 FORM.forEach(function(f){
  var s=0,m=0;
  for(var id in cart){var c=CAT[id];if((f.starters||[]).indexOf(c)>=0)s+=cart[id];else if((f.mains||[]).indexOf(c)>=0&&(f.exclude||[]).indexOf(id)<0)m+=cart[id];}
  var n=Math.min(Math.max(0,s-used),m);used+=n;
  var d=Math.min(n,decl[f.id]|0),q=n-d;
  out.push({f:f,n:n,q:q,m:m,cents:Math.max(0,f.drink_cents|0)});
 });
 return out;
}
function needStarter(fs){var left=0;fs.forEach(function(x){left+=x.m-x.n;});return left>0;}
// các dòng của đơn: món khách chọn + nước theo combo
function lines(){
 var out=[];
 Object.keys(cart).forEach(function(id){var p=priceOf(ITEMS[id]);if(p)out.push({id:id,qty:cart[id],cents:p});});
 formulas().forEach(function(x){if(x.n)out.push({id:x.f.id,drink:x.f.drink,qty:x.q,max:x.n,cents:x.cents,f:1});});
 return out;
}
function cartCount(){var n=0;lines().forEach(function(l){n+=l.qty;});return n;}
function cartTotal(){var s=0;lines().forEach(function(l){s+=l.qty*l.cents;});return s;}
function setQty(id,q){q=Math.max(0,Math.min(10,q|0));if(q)cart[id]=q;else delete cart[id];store('xiu-cart',cart);paint();}
function setDecl(fid,max,q){decl[fid]=Math.max(0,Math.min(max,max-q));store('xiu-decl',decl);paint();}
function active(){return !!(token&&info&&info.ok);}
function canOrder(){return active()&&info.open;}
function reasonText(){if(!info)return '';if(!info.ok)return t('token');if(info.reason==='blocked')return t('blocked').replace('{m}',Math.max(1,Math.ceil(((info.until||0)*1000-Date.now())/60000)));return t(info.reason||'closed');}
// tên + ảnh của một dòng, theo ngôn ngữ đang chọn
function lineView(l){
 if(l.f){var d=ALL[l.drink],fo=ALL[l.id];return {name:d?X.txt(d)[0]:'',sub:fo?X.txt(fo)[0]:'',img:d&&d.img?X.img(d.img):''};}
 var it=ALL[l.id];return {name:it?X.txt(it)[0]:l.id,sub:'',img:it&&it.img?X.img(it.img):''};
}
function thumb(v){return '<span class="oc-img">'+(v.img?'<img src="'+esc(v.img)+'" alt="" loading="lazy" width="56" height="56">':'')+'</span>';}

// ---------- giao diện cố định
var hint=el('div','ord-hint');var cats=$('#cats');cats.parentNode.insertBefore(hint,cats);hint.hidden=true;
var bar=el('div','obar');bar.hidden=true;document.body.appendChild(bar);
var cartDlg=el('dialog','sheet ocart');cartDlg.id='ord-cart';document.body.appendChild(cartDlg);
var doneDlg=el('dialog','sheet odone');doneDlg.id='ord-done';document.body.appendChild(doneDlg);
[cartDlg,doneDlg].forEach(function(d){d.addEventListener('click',function(e){if(e.target===d)d.close();});});
function openDlg(d){if(d.showModal){if(!d.open)d.showModal();}else d.setAttribute('open','');}
var X_SVG='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var PLUS_SVG='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

// nút « + » trên từng món (đặt cạnh nút món, không lồng vào trong)
function decorate(){
 $$('#cats .dish').forEach(function(b){
  var id=b.getAttribute('data-id'),w=b.parentNode,want=canOrder()&&priceOf(ITEMS[id]);
  if(!w.classList.contains('dwrap')){if(!want)return;w=el('div','dwrap');b.parentNode.insertBefore(w,b);w.appendChild(b);}
  w.classList.toggle('has-img',!!$('.dimg',b));
  var a=$('.dadd',w);
  if(!want){if(a)a.remove();return;}
  if(!a){a=el('button','dadd',PLUS_SVG);a.type='button';a.addEventListener('click',function(e){e.stopPropagation();setQty(id,(cart[id]||0)+1);bump(a);});w.appendChild(a);}
  a.setAttribute('aria-label',t('add')+' · '+X.txt(ITEMS[id])[0]);
 });
}
function bump(a){a.classList.remove('bump');void a.offsetWidth;a.classList.add('bump');var c=$('.ob-cart',bar);if(c){c.classList.remove('bump');void c.offsetWidth;c.classList.add('bump');}}

function paint(){
 document.body.classList.toggle('ordering',active());
 if(active()){hint.hidden=false;hint.className='ord-hint'+(canOrder()?'':' off');hint.textContent=canOrder()?t('hint'):reasonText();}
 else if(token&&info&&!info.ok){hint.hidden=false;hint.className='ord-hint off';hint.textContent=t('token');}
 else hint.hidden=true;
 decorate();
 $$('#cats .dish').forEach(function(b){var id=b.getAttribute('data-id'),q=active()&&cart[id],s=$('.oq',b);
  if(q){if(!s){s=el('span','oq');b.appendChild(s);}s.textContent=q;}else if(s)s.remove();});
 var n=active()?cartCount():0,h='';
 if(n)h+='<button type="button" class="btn ob-cart"><span class="ob-n">'+n+'</span><span>'+esc(t('view'))+'</span><b>'+esc(money(cartTotal()))+'</b></button>';
 if(last)h+='<button type="button" class="ob-last"><span>'+esc(t('my_order'))+'</span><b>N° '+esc(last.no)+'</b>'+(lastStatus?'<small>'+esc(t('st_'+lastStatus)||'')+'</small>':'')+'</button>';
 bar.innerHTML=h;bar.hidden=!h;document.body.classList.toggle('has-obar',!!h);
 var c=$('.ob-cart',bar);if(c)c.addEventListener('click',showCart);
 var l=$('.ob-last',bar);if(l)l.addEventListener('click',function(){showDone();});
 if(cartDlg.open)renderCart();
 if(doneDlg.open)renderDone();
}

// ---------- cửa sổ món (mở từ app.js)
function onOpen(it,d){
 var body=$('.md-body',d),box=$('.md-order',d),call=$('.md-call',d);
 if(!active()){if(box)box.remove();if(call)call.hidden=false;return;}
 if(!box){box=el('div','md-order');body.appendChild(box);}
 if(call)call.hidden=true;
 var p=priceOf(it);
 if(!p){box.innerHTML='<p class="md-note">'+esc(FORM.some(function(f){return f.id===it.id;})?t('f_note'):t('formule'))+'</p>';return;}
 if(!canOrder()){box.innerHTML='<p class="md-note off">'+esc(reasonText())+'</p>';return;}
 var q=1;
 function draw(){box.innerHTML='<div class="stepper"><button type="button" class="st-m" aria-label="−">−</button><span class="st-q">'+q+'</span><button type="button" class="st-p" aria-label="+">+</button></div>'
  +'<button type="button" class="btn btn-red md-add"><span>'+esc(t('add'))+'</span><b>'+esc(money(p*q))+'</b></button>';
  $('.st-m',box).addEventListener('click',function(){if(q>1){q--;draw();}});
  $('.st-p',box).addEventListener('click',function(){if(q<10){q++;draw();}});
  $('.md-add',box).addEventListener('click',function(){setQty(it.id,(cart[it.id]||0)+q);d.close();});}
 draw();
}

// ---------- giỏ hàng
function showCart(){renderCart();openDlg(cartDlg);}
function renderCart(msg){
 cleanCart();
 var ls=lines(),fs=formulas(),h='<div class="sheet-head"><b>'+esc(t('cart'))+'</b><button type="button" class="md-close sheet-x" aria-label="'+esc(X.T('close'))+'">'+X_SVG+'</button></div><div class="oc-body">';
 if(!Object.keys(cart).length)h+='<p class="oc-empty">'+esc(t('empty'))+'</p>';
 else{
  h+='<ul class="oc-list">';
  ls.forEach(function(l,i){var v=lineView(l);
   h+='<li class="'+(l.f?'oc-f-line':'')+'" data-i="'+i+'">'+thumb(v)
    +'<div class="oc-name"><b>'+esc(v.name)+'</b>'+(v.sub?'<small>'+esc(v.sub)+'</small>':'')+'<span>'+esc(l.cents?money(l.cents):t('free'))+'</span></div>'
    +'<div class="stepper sm"><button type="button" class="st-m" aria-label="−">−</button><span class="st-q">'+l.qty+'</span><button type="button" class="st-p" aria-label="+"'+(l.f&&l.qty>=l.max?' disabled':'')+'>+</button></div>'
    +'<div class="oc-sum">'+esc(l.cents?money(l.cents*l.qty):t('free'))+'</div></li>';});
  h+='</ul>';
  if(fs.some(function(x){return x.n;}))h+='<p class="oc-info">'+esc(t('f_note'))+'</p>';
  else if(needStarter(fs))h+='<p class="oc-info up">'+esc(t('upsell'))+'</p>';
  var f=load('xiu-form')||{};
  h+='<label class="oc-f"><span>'+esc(t('name'))+'</span><input type="text" class="oc-n" maxlength="30" autocomplete="given-name" value="'+esc(f.name||'')+'"></label>'
   +'<label class="oc-f"><span>'+esc(t('note'))+'</span><textarea class="oc-note" maxlength="140" rows="2" placeholder="'+esc(t('note_ph'))+'">'+esc(f.note||'')+'</textarea></label>'
   +'<div class="oc-ts"></div>'
   +'<div class="oc-total"><span>'+esc(t('total'))+'</span><b>'+esc(money(cartTotal()))+'</b></div>'
   +'<p class="oc-pay">'+esc(t('pay'))+'</p>'
   +(msg?'<p class="oc-msg" role="alert">'+esc(msg)+'</p>':(!canOrder()?'<p class="oc-msg" role="alert">'+esc(reasonText())+'</p>':''))
   +'<button type="button" class="btn btn-red btn-lg oc-send"'+(canOrder()&&!sending?'':' disabled')+'>'+esc(sending?t('sending'):t('send'))+'</button>';
 }
 h+='</div>';
 var sc=cartDlg.scrollTop;cartDlg.innerHTML=h;cartDlg.scrollTop=sc;
 $('.sheet-x',cartDlg).addEventListener('click',function(){cartDlg.close();});
 $$('.oc-list li',cartDlg).forEach(function(li){var l=ls[+li.getAttribute('data-i')];
  $('.st-m',li).addEventListener('click',function(){if(l.f)setDecl(l.id,l.max,l.qty-1);else setQty(l.id,l.qty-1);});
  $('.st-p',li).addEventListener('click',function(){if(l.f)setDecl(l.id,l.max,l.qty+1);else setQty(l.id,l.qty+1);});});
 var n=$('.oc-n',cartDlg),no=$('.oc-note',cartDlg);
 function keep(){store('xiu-form',{name:n.value,note:no.value});}
 if(n){n.addEventListener('input',keep);no.addEventListener('input',keep);}
 var b=$('.oc-send',cartDlg);if(b)b.addEventListener('click',send);
 if(Object.keys(cart).length&&info&&info.sitekey)turnstile($('.oc-ts',cartDlg));
}

// ---------- Turnstile (chỉ khi tiệm đã bật)
function turnstile(box){
 function render(){try{tsToken=null;tsWidget=window.turnstile.render(box,{sitekey:info.sitekey,language:L()==='zh'?'zh-cn':L(),callback:function(x){tsToken=x;},'expired-callback':function(){tsToken=null;}});}catch(e){}}
 if(window.turnstile)return render();
 if(!document.getElementById('cf-ts')){var s=document.createElement('script');s.id='cf-ts';s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=function(){var b=$('.oc-ts',cartDlg);if(b)turnstile(b);};document.head.appendChild(s);}
}

// ---------- gửi đơn
function api(method,path,body){
 var o={method:method,credentials:'same-origin',headers:{}};
 if(body){o.headers['Content-Type']='application/json';o.headers['X-Xiu']='1';o.body=JSON.stringify(body);}
 return fetch('/api'+path,o).then(function(r){return r.json().catch(function(){return {ok:false,err:'err'};});});
}
function send(){
 if(sending||!canOrder())return;
 var items=Object.keys(cart).map(function(id){return {id:id,qty:cart[id]};});if(!items.length)return;
 var snap=lines().filter(function(l){return l.qty>0;}).map(function(l){return {id:l.id,drink:l.drink||null,qty:l.qty,cents:l.cents,f:l.f||0};});
 var d={};formulas().forEach(function(x){if(x.n&&x.q<x.n)d[x.f.id]=x.n-x.q;});
 var f=load('xiu-form')||{};
 sending=true;renderCart();
 api('POST','/orders',{t:token,items:items,decline:d,name:f.name||'',note:f.note||'',lang:L(),ts:tsToken}).then(function(r){
  sending=false;
  if(r.ok){
   cart={};decl={};store('xiu-cart',cart);store('xiu-decl',decl);store('xiu-form',{name:f.name||''});
   last={code:r.code,no:r.no,at:Date.now(),total:r.total,lines:snap};lstore('xiu-last',last);lastStatus='new';
   cartDlg.close();paint();showDone();poll();return;
  }
  if(r.err==='blocked'){info.open=false;info.reason='blocked';info.until=r.until;}
  else if(r.err==='closed'||r.err==='paused'){info.open=false;info.reason=r.err;}
  else if(r.err==='token'){info.ok=false;}
  if(window.turnstile&&tsWidget!=null)try{window.turnstile.reset(tsWidget);}catch(e){}
  var m={blocked:reasonText(),closed:t('closed'),paused:t('paused'),busy:t('busy'),token:t('token'),robot:t('robot'),device:t('err'),items:t('err')}[r.err]||t('err');
  paint();renderCart(m);
 },function(){sending=false;renderCart(t('err'));});
}

// ---------- màn hình số đơn (kèm danh sách món theo ngôn ngữ khách, có ảnh nhỏ)
function showDone(){renderDone();openDlg(doneDlg);}
function renderDone(){
 if(!last){doneDlg.close();return;}
 var st=lastStatus||'new',fin=st==='done'||st==='cancelled'||st==='expired';
 var items=(last.lines||[]).map(function(l){var v=lineView(l);
  return '<li>'+thumb(v)+'<div class="od-n"><b>'+esc(v.name)+'</b>'+(v.sub?'<small>'+esc(v.sub)+'</small>':'')+'</div><span class="od-q">×'+l.qty+'</span><span class="od-p">'+esc(l.cents?money(l.cents*l.qty):t('free'))+'</span></li>';}).join('');
 doneDlg.innerHTML='<div class="sheet-head"><b>'+esc(t('sent'))+'</b><button type="button" class="md-close sheet-x" aria-label="'+esc(X.T('close'))+'">'+X_SVG+'</button></div>'
  +'<div class="od-body"><div class="od-k">'+esc(t('your_no'))+'</div><div class="od-no">'+esc(last.no)+'</div>'
  +'<div class="od-st st-'+esc(st)+'">'+esc(t('st_'+st))+'</div>'
  +(st==='new'?'<p class="od-show">'+esc(t('show'))+'</p>':'')
  +(items?'<ul class="od-list">'+items+'</ul>':'')
  +(last.total!=null?'<div class="od-total"><span>'+esc(t('total'))+'</span><b>'+esc(money(last.total))+'</b></div>':'')
  +(fin&&active()?'<button type="button" class="btn btn-green od-again">'+esc(t('again'))+'</button>':'')+'</div>';
 $('.sheet-x',doneDlg).addEventListener('click',function(){doneDlg.close();});
 var a=$('.od-again',doneDlg);if(a)a.addEventListener('click',function(){last=null;lastStatus=null;lstore('xiu-last',null);doneDlg.close();paint();});
}
function poll(){
 clearTimeout(polling);if(!last)return;
 api('GET','/orders/status?c='+encodeURIComponent(last.code)).then(function(r){
  if(r.ok){if(r.status!==lastStatus){lastStatus=r.status;paint();}
   if(r.status==='new'||r.status==='confirmed')polling=setTimeout(poll,8000);}
  else if(r.err==='gone'){last=null;lastStatus=null;lstore('xiu-last',null);paint();}
  else polling=setTimeout(poll,15000);
 },function(){polling=setTimeout(poll,15000);});
}

// ---------- nối với app.js
window.XIU_ORDER={onRender:paint,onOpen:onOpen,onLang:paint};
paint();
if(last)poll();
if(token){
 api('GET','/session?t='+encodeURIComponent(token)).then(function(r){info=(r.ok||r.err==='token')?r:null;if(!r.ok&&r.err==='token')store('xiu-t',null);paint();},function(){info=null;paint();});
 setInterval(function(){if(document.hidden)return;api('GET','/session?t='+encodeURIComponent(token)).then(function(r){if(r&&r.ok){info=r;paint();}});},120000);
}
})();
