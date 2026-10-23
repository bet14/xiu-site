(function(){
'use strict';
var LANGS=['fr','en','de','es','vi','zh','ko'];
var LNAME={fr:'FR · Tiếng Pháp',en:'EN · Tiếng Anh',de:'DE · Tiếng Đức',es:'ES · Tiếng Tây Ban Nha',vi:'VI · Tiếng Việt',zh:'中文 · Tiếng Trung',ko:'한국어 · Tiếng Hàn'};
var BADGES=[['','Không có'],['signature','Signature'],['top1','Le nº 1 le plus aimé'],['top2','Le nº 2 le plus aimé'],['top3','Le nº 3 le plus aimé'],['populaire','Populaire'],['nouveau','Nouveau']];
var MENU=[],WEEK=null,SITE=null,IMAGES=[],online=false;
var selCat=0,selItem=-1,saved={menu:'',semaine:'',site:''},GH={diff:null,st:null};

function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function clone(o){return JSON.parse(JSON.stringify(o));}
function slug(s){s=String(s||'').replace(/œ/g,'oe').replace(/Œ/g,'oe').replace(/æ/g,'ae').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);return s;}
function imgUrl(n){return '../assets/img/menu/'+(n.indexOf('.')>0?n:n+'.webp');}
function toast(msg,err){var t=$('#toast');t.textContent=msg;t.className='toast show'+(err?' err':'');clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='toast';},err?6000:2800);}
function loadScript(src){return new Promise(function(ok){var s=document.createElement('script');s.src=src+'?t='+Date.now();s.onload=ok;s.onerror=ok;document.head.appendChild(s);});}

// ---------------- dữ liệu ----------------
function allItemIds(except){var set={};MENU.forEach(function(c){c.items.forEach(function(it){if(it!==except)set[it.id]=1;});});return set;}
function uniqueItemId(base,except){base=slug(base)||'mon';var ids=allItemIds(except),id=base,n=2;while(ids[id])id=base+'-'+(n++);return id;}
function uniqueCatId(base,except){base=slug(base)||'danh-muc';var ids={veggie:1};MENU.forEach(function(c){if(c!==except)ids[c.id]=1;});var id=base,n=2;while(ids[id])id=base+'-'+(n++);return id;}
function normLang(v){v=Array.isArray(v)?v:['',''];return [String(v[0]||''),String(v[1]||'')];}
function normalize(src){
 MENU=[];
 (src||[]).forEach(function(c){
  var cat={id:'',icon:c.icon||'',title:{},items:[]};LANGS.forEach(function(l){cat.title[l]=(c.title&&c.title[l])||'';});
  if(c.hide)cat.hide=true;
  cat.id=uniqueCatId(c.id||cat.title.fr,cat);MENU.push(cat);
 });
 (src||[]).forEach(function(c,ci){
  (c.items||[]).forEach(function(it){
   var o={id:'',icon:it.icon||'',img:it.img||'',price:it.price||'',veg:!!it.veg};
   if(it.badge)o.badge=it.badge;if(it.hide)o.hide=true;
   LANGS.forEach(function(l){o[l]=normLang(it[l]);});
   MENU[ci].items.push(o);
   o.id=uniqueItemId(it.id||(o.fr[0]),o);
  });
 });
}
function normWeek(w){
 w=w||{};var sp=w.special||{},o={special:{name:{},desc:{}},next:{},past:(w.past||[]).slice()};
 LANGS.forEach(function(l){o.special.name[l]=(sp.name&&sp.name[l])||'';o.special.desc[l]=(sp.desc&&sp.desc[l])||'';o.next[l]=(w.next&&w.next[l])||'';});
 if(sp.img)o.special.img=sp.img;return o;
}
function strip(m){return JSON.stringify(m,function(k,v){return k==='_auto'?undefined:v;});}
function snap(){saved.menu=strip(MENU);saved.semaine=JSON.stringify(WEEK);saved.site=JSON.stringify(SITE);dirty();}
function changed(){var c={};if(strip(MENU)!==saved.menu)c.menu=1;if(JSON.stringify(WEEK)!==saved.semaine)c.semaine=1;if(JSON.stringify(SITE)!==saved.site)c.site=1;return c;}
function dirty(){var c=changed(),n=Object.keys(c).length,st=$('#state');
 $('#save').disabled=!n||!online;
 if(!online){st.textContent='Chỉ xem — máy chủ quản trị chưa bật';st.className='state dirty';return;}
 st.textContent=n?'Có thay đổi chưa lưu':(saved.time?'Đã lưu lúc '+saved.time:'Không có thay đổi');st.className='state'+(n?' dirty':'');
 if(GH.diff)ghCount();else $('#gh-dirty').hidden=!n;}

// ---------------- danh mục ----------------
function cat(){return MENU[selCat];}
function renderCats(){
 var ol=$('#cat-list');
 ol.innerHTML=MENU.map(function(c,i){
  var n=c.items.length,h=c.items.filter(function(x){return x.hide;}).length;
  return '<li class="row'+(i===selCat?' on':'')+(c.hide?' off':'')+'" draggable="true" data-idx="'+i+'"><span class="h" title="Kéo để đổi thứ tự">⋮⋮</span>'
  +'<span class="t"><b>'+esc((c.icon?c.icon+' ':'')+(c.title.fr||'(chưa đặt tên)'))+'</b><small>'+esc(c.title.vi||c.id)+'</small></span>'
  +'<span class="n">'+n+(h?' · '+h+' ẩn':'')+(c.hide?' · ẩn':'')+'</span>'
  +'<span class="mv"><button data-mv="-1" title="Lên">▲</button><button data-mv="1" title="Xuống">▼</button></span></li>';
 }).join('')||'<li class="empty">Chưa có danh mục.</li>';
 $$('.row',ol).forEach(function(r){var i=+r.dataset.idx;
  r.addEventListener('click',function(e){var b=e.target.closest('[data-mv]');if(b){e.stopPropagation();move(MENU,i,i+(+b.dataset.mv));if(selCat===i)selCat=Math.max(0,Math.min(MENU.length-1,i+(+b.dataset.mv)));update(true);return;}selCat=i;selItem=-1;renderMenuView();});
 });
 sortable(ol,'cat');
}
function renderCatEdit(){
 var c=cat(),box=$('#cat-edit');
 if(!c){box.innerHTML='<p class="empty">Thêm một danh mục để bắt đầu.</p>';$('#items-title').textContent='Món';$('#add-item').disabled=true;return;}
 $('#add-item').disabled=false;
 $('#items-title').textContent='Món trong « '+(c.title.fr||c.id)+' »';
 box.innerHTML='<h2>Danh mục</h2><div class="g3"><label class="f"><span>Tên (FR)</span><input type="text" data-ct="fr" value="'+esc(c.title.fr)+'"></label>'
 +'<label class="f"><span>Biểu tượng</span><input type="text" data-k="icon" value="'+esc(c.icon)+'" maxlength="8"></label>'
 +'<label class="f"><span>Mã (dùng cho đường dẫn #cat-…)</span><input type="text" data-k="id" value="'+esc(c.id)+'"></label></div>'
 +'<div class="g2">'+LANGS.filter(function(l){return l!=='fr';}).map(function(l){return '<label class="f"><span>'+LNAME[l]+'</span><input type="text" data-ct="'+l+'" value="'+esc(c.title[l])+'"></label>';}).join('')+'</div>'
 +'<div class="checks"><label><input type="checkbox" data-k="hide"'+(c.hide?' checked':'')+'> Ẩn cả danh mục trên trang web</label></div>'
 +'<div class="actions"><button class="btn danger small" id="del-cat">Xoá danh mục</button></div>';
 $$('[data-ct]',box).forEach(function(inp){inp.addEventListener('input',function(){c.title[inp.dataset.ct]=inp.value;update();});});
 $('[data-k=icon]',box).addEventListener('input',function(e){c.icon=e.target.value;update();});
 $('[data-k=id]',box).addEventListener('change',function(e){c.id=uniqueCatId(e.target.value||c.title.fr,c);e.target.value=c.id;update();});
 $('[data-k=hide]',box).addEventListener('change',function(e){if(e.target.checked)c.hide=true;else delete c.hide;update();});
 $('#del-cat').addEventListener('click',function(){
  if(c.items.length&&!confirm('Xoá danh mục « '+(c.title.fr||c.id)+' » cùng '+c.items.length+' món bên trong?'))return;
  if(!c.items.length&&!confirm('Xoá danh mục « '+(c.title.fr||c.id)+' »?'))return;
  MENU.splice(selCat,1);selCat=Math.max(0,selCat-1);selItem=-1;renderMenuView();dirty();
 });
}

// ---------------- món ----------------
function renderItems(){
 var c=cat(),ol=$('#item-list');
 if(!c){ol.innerHTML='';return;}
 ol.innerHTML=c.items.map(function(it,i){
  var b=it.badge?(BADGES.filter(function(x){return x[0]===it.badge;})[0]||[,it.badge])[1]:'';
  return '<li class="row'+(i===selItem?' on':'')+(it.hide?' off':'')+'" draggable="true" data-idx="'+i+'"><span class="h" title="Kéo để đổi thứ tự">⋮⋮</span>'
  +'<span class="thumb">'+(it.img?'<img src="'+esc(imgUrl(it.img))+'" alt="" loading="lazy">':'không ảnh')+'</span>'
  +'<span class="t"><b>'+esc((it.icon?it.icon+' ':'')+(it.fr[0]||'(chưa đặt tên)'))+'</b><small>'+esc(it.price||'— chưa có giá')+(it.vi[0]?' · '+esc(it.vi[0]):'')+'</small>'
  +'<small>'+(it.veg?'<span class="tag veg">chay</span>':'')+(b?'<span class="tag badge">'+esc(b)+'</span>':'')+(it.hide?'<span class="tag hide">đang ẩn</span>':'')+'</small></span>'
  +'<span class="mv"><button data-mv="-1" title="Lên">▲</button><button data-mv="1" title="Xuống">▼</button></span></li>';
 }).join('')||'<li class="empty">Danh mục này chưa có món.</li>';
 $$('.row',ol).forEach(function(r){var i=+r.dataset.idx;
  r.addEventListener('click',function(e){var b=e.target.closest('[data-mv]');if(b){e.stopPropagation();var to=i+(+b.dataset.mv);if(to<0||to>=c.items.length)return;move(c.items,i,to);if(selItem===i)selItem=to;else if(selItem===to)selItem=i;update(true);return;}selItem=i;renderItems();renderEditor();});
 });
 sortable(ol,'item');
}
function item(){var c=cat();return c&&selItem>=0?c.items[selItem]:null;}
function renderEditor(){
 var it=item(),box=$('#item-edit');
 if(!it){box.innerHTML='<p class="empty">Chọn một món để sửa, hoặc bấm « + Thêm món ».</p>';return;}
 box.innerHTML='<h2>Sửa món</h2>'
 +'<div class="pv-l">Xem trước trên điện thoại (FR):</div><div class="pv" id="pv"></div>'
 +'<div class="imgrow"><div class="thumb lg" id="it-thumb"></div><div class="stack">'
 +'<label class="btn">Tải ảnh mới<input type="file" accept="image/*" id="it-file" hidden></label>'
 +'<button class="btn" id="it-pick">Chọn ảnh có sẵn</button>'
 +(it.img?'<button class="btn danger small" id="it-noimg">Bỏ ảnh</button>':'')
 +'<span class="code">'+esc(it.img||'chưa có ảnh')+'</span></div></div>'
 +'<div class="g3"><label class="f"><span>Giá</span><input type="text" data-f="price" value="'+esc(it.price)+'" placeholder="12,5 €"></label>'
 +'<label class="f"><span>Biểu tượng</span><input type="text" data-f="icon" value="'+esc(it.icon)+'" maxlength="8"></label>'
 +'<label class="f"><span>Nhãn</span><select data-f="badge">'+BADGES.map(function(b){return '<option value="'+b[0]+'"'+((it.badge||'')===b[0]?' selected':'')+'>'+esc(b[1])+'</option>';}).join('')+'</select></label></div>'
 +'<div class="checks"><label><input type="checkbox" data-f="veg"'+(it.veg?' checked':'')+'> Món chay (tự hiện thêm trong mục Veggie)</label><label><input type="checkbox" data-f="hide"'+(it.hide?' checked':'')+'> Tạm ẩn (hết hàng)</label></div>'
 +'<label class="f"><span>Thuộc danh mục</span><select id="it-cat">'+MENU.map(function(c,i){return '<option value="'+i+'"'+(i===selCat?' selected':'')+'>'+esc((c.icon?c.icon+' ':'')+(c.title.fr||c.id))+'</option>';}).join('')+'</select></label>'
 +LANGS.map(function(l){return '<div class="lang"><h3>'+LNAME[l]+'</h3><label class="f"><span>Tên món</span><input type="text" data-l="'+l+'" data-n="0" value="'+esc(it[l][0])+'"></label><label class="f"><span>Mô tả (hiện khi khách bấm vào món)</span><textarea rows="3" data-l="'+l+'" data-n="1">'+esc(it[l][1])+'</textarea></label></div>';}).join('')
 +'<label class="f" style="margin-top:10px"><span>Mã món (không dấu; dùng cho đặt món sau này)</span><input type="text" id="it-id" value="'+esc(it.id)+'"></label>'
 +'<div class="actions"><button class="btn small" id="it-dup">Nhân bản món</button><button class="btn danger small" id="it-del">Xoá món</button></div>';
 paintThumb();paintPreview();
 $$('[data-f]',box).forEach(function(el){el.addEventListener(el.type==='checkbox'||el.tagName==='SELECT'?'change':'input',function(){
  var k=el.dataset.f;
  if(el.type==='checkbox'){if(k==='veg')it.veg=el.checked;else if(el.checked)it.hide=true;else delete it.hide;}
  else if(k==='badge'){if(el.value)it.badge=el.value;else delete it.badge;}
  else it[k]=el.value;
  update();paintPreview();
 });});
 $$('[data-l]',box).forEach(function(el){el.addEventListener('input',function(){
  it[el.dataset.l][+el.dataset.n]=el.value;
  if(it._auto&&el.dataset.l==='fr'&&el.dataset.n==='0'){it.id=uniqueItemId(el.value,it);$('#it-id').value=it.id;}
  update();paintPreview();
 });});
 $('#it-id').addEventListener('change',function(e){it.id=uniqueItemId(e.target.value||it.fr[0],it);e.target.value=it.id;delete it._auto;update();});
 $('#it-cat').addEventListener('change',function(e){var to=+e.target.value;if(to===selCat)return;cat().items.splice(selItem,1);MENU[to].items.push(it);selCat=to;selItem=MENU[to].items.length-1;renderMenuView();dirty();toast('Đã chuyển món sang « '+(MENU[to].title.fr||MENU[to].id)+' »');});
 $('#it-file').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;uploadImage('menu',it.id,f).then(function(name){it.img=name;if(IMAGES.indexOf(name)<0)IMAGES.push(name);update(true);renderEditor();toast('Đã tải ảnh lên. Bấm « Lưu thay đổi » để áp dụng.');}).catch(function(er){toast(er.message,true);});});
 $('#it-pick').addEventListener('click',function(){openPicker(function(name){it.img=name;update(true);renderEditor();});});
 var ni=$('#it-noimg');if(ni)ni.addEventListener('click',function(){it.img='';update(true);renderEditor();});
 $('#it-dup').addEventListener('click',function(){var c=cat(),cp=clone(it);delete cp._auto;cp.fr[0]=cp.fr[0]+' (copie)';cp.id=uniqueItemId(cp.id+'-2',cp);c.items.splice(selItem+1,0,cp);selItem++;update(true);renderEditor();toast('Đã nhân bản món.');});
 $('#it-del').addEventListener('click',function(){if(!confirm('Xoá món « '+(it.fr[0]||it.id)+' »? (Nếu chỉ tạm hết hàng, nên dùng « Tạm ẩn ».)'))return;cat().items.splice(selItem,1);selItem=-1;update(true);renderEditor();});
}
function paintThumb(){var it=item(),t=$('#it-thumb');if(!t)return;t.innerHTML=it.img?'<img src="'+esc(imgUrl(it.img))+'" alt="">':'chưa có ảnh';}
function paintPreview(){
 var it=item(),pv=$('#pv');if(!pv)return;var b=it.badge?(BADGES.filter(function(x){return x[0]===it.badge;})[0]||[,''])[1]:'';
 pv.innerHTML='<div class="pt"><div class="pn">'+esc((it.icon?it.icon+' ':'')+(it.fr[0]||'Tên món'))+'</div>'+(it.vi[0]?'<div class="pvi">'+esc(it.vi[0])+'</div>':'')
 +'<div class="pp">'+esc(it.price||'—')+(it.veg?' <span style="color:#2E7D32;font-weight:700;font-size:11px">veggie</span>':'')+'</div>'+(it.fr[1]?'<div class="pd">'+esc(it.fr[1])+'</div>':'')+(b?'<span class="pb"'+(it.badge==='signature'?' style="background:#D62F23"':it.badge==='populaire'?' style="background:#FFD23F;color:#222"':it.badge==='nouveau'?' style="background:#FF7A00;color:#222"':'')+'>'+esc(b)+'</span>':'')+'</div>'
 +(it.img?'<div class="pi" style="background-image:url(\''+imgUrl(it.img).replace(/'/g,'%27')+'\')"></div>':'');
}
function renderMenuView(){if(selCat>=MENU.length)selCat=Math.max(0,MENU.length-1);renderCats();renderCatEdit();renderItems();renderEditor();}
function update(lists){renderCats();renderItems();var c=cat();if(c)$('#items-title').textContent='Món trong « '+(c.title.fr||c.id)+' »';dirty();}
function move(arr,from,to){if(to<0||to>=arr.length||from===to)return;var x=arr.splice(from,1)[0];arr.splice(to,0,x);}

// ---------------- kéo thả ----------------
var drag=null;
function clearDrop(){$$('.drop-before,.drop-after,.drop-into').forEach(function(r){r.classList.remove('drop-before','drop-after','drop-into');});}
function sortable(ol,kind){
 $$('.row',ol).forEach(function(r){
  r.addEventListener('dragstart',function(e){drag={kind:kind,idx:+r.dataset.idx};e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',kind);}catch(x){}r.style.opacity='.4';});
  r.addEventListener('dragend',function(){r.style.opacity='';drag=null;clearDrop();});
  r.addEventListener('dragover',function(e){if(!drag)return;
   if(drag.kind===kind){e.preventDefault();clearDrop();var b=r.getBoundingClientRect();r.classList.add(e.clientY<b.top+b.height/2?'drop-before':'drop-after');}
   else if(drag.kind==='item'&&kind==='cat'&&+r.dataset.idx!==selCat){e.preventDefault();clearDrop();r.classList.add('drop-into');}
  });
  r.addEventListener('dragleave',function(){r.classList.remove('drop-before','drop-after','drop-into');});
  r.addEventListener('drop',function(e){if(!drag)return;e.preventDefault();var to=+r.dataset.idx,before=r.classList.contains('drop-before'),into=r.classList.contains('drop-into');clearDrop();
   if(into){var it=cat().items.splice(drag.idx,1)[0];MENU[to].items.push(it);selItem=-1;toast('Đã chuyển « '+(it.fr[0]||it.id)+' » sang « '+(MENU[to].title.fr||MENU[to].id)+' »');renderMenuView();dirty();drag=null;return;}
   var arr=kind==='cat'?MENU:cat().items,from=drag.idx,dest=before?to:to+1;if(from<dest)dest--;
   var selObj=kind==='cat'?MENU[selCat]:item();move(arr,from,dest);
   if(kind==='cat')selCat=MENU.indexOf(selObj);else if(selObj)selItem=arr.indexOf(selObj);
   drag=null;renderMenuView();dirty();
  });
 });
}

// ---------------- ảnh ----------------
function toWebp(file,max){
 return createImageBitmap(file).then(function(bmp){
  var sc=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.round(bmp.width*sc),h=Math.round(bmp.height*sc);
  var cv=document.createElement('canvas');cv.width=w;cv.height=h;var cx=cv.getContext('2d');cx.drawImage(bmp,0,0,w,h);
  return new Promise(function(ok){cv.toBlob(function(b){if(b&&b.type==='image/webp')return ok({blob:b,ext:'webp'});cv.toBlob(function(j){ok({blob:j,ext:'jpg'});},'image/jpeg',0.86);},'image/webp',0.84);});
 });
}
function uploadImage(kind,base,file){
 if(!online)return Promise.reject(new Error('Máy chủ quản trị chưa bật — chưa thể tải ảnh.'));
 toast('Đang xử lý ảnh…');
 return toWebp(file,kind==='menu'?1000:1200).then(function(r){
  var name=(slug(base)||'anh')+'-'+Date.now().toString(36)+'.'+r.ext;
  return fetch('/api/upload?kind='+kind+'&name='+encodeURIComponent(name),{method:'POST',body:r.blob,headers:{'Content-Type':r.blob.type}})
   .then(function(res){return res.json().then(function(j){if(!res.ok)throw new Error(j.error||'Lỗi tải ảnh');return j.name;});});
 });
}
function loadImages(){if(!online)return;fetch('/api/images').then(function(r){return r.json();}).then(function(j){IMAGES=j.images||[];}).catch(function(){});}
var pickCb=null;
function openPicker(cb){pickCb=cb;$('#picker-q').value='';paintPicker();var d=$('#picker');d.showModal?d.showModal():d.setAttribute('open','');}
function paintPicker(){var q=$('#picker-q').value.toLowerCase(),list=IMAGES.filter(function(n){return n.toLowerCase().indexOf(q)>=0;});
 $('#picker-grid').innerHTML=list.map(function(n){return '<button type="button" data-n="'+esc(n)+'"><img src="'+esc(imgUrl(n))+'" alt="" loading="lazy"><span>'+esc(n)+'</span></button>';}).join('')||'<p class="hint">Không có ảnh'+(online?'':' (máy chủ chưa bật)')+'.</p>';
 $$('#picker-grid button').forEach(function(b){b.addEventListener('click',function(){var n=b.dataset.n.replace(/\.webp$/,'');$('#picker').close();if(pickCb)pickCb(n);});});}
$('#picker-q').addEventListener('input',paintPicker);
$('[data-close]',$('#picker')).addEventListener('click',function(){$('#picker').close();});

// ---------------- món của tuần + liên kết ----------------
function renderWeek(){
 if(!$('#sp-fields'))return;
 var sp=WEEK.special;
 $('#sp-thumb').innerHTML='<img src="../assets/img/'+esc(sp.img||'special.webp')+'?t='+Date.now()+'" alt="">';
 $('#sp-fields').innerHTML=LANGS.map(function(l){return '<div class="lang"><h3>'+LNAME[l]+'</h3><label class="f"><span>Tên món</span><input type="text" data-w="name" data-l="'+l+'" value="'+esc(sp.name[l])+'"></label><label class="f"><span>Mô tả</span><textarea rows="2" data-w="desc" data-l="'+l+'">'+esc(sp.desc[l])+'</textarea></label></div>';}).join('');
 $('#nx-fields').innerHTML='<div class="g2">'+LANGS.map(function(l){return '<label class="f"><span>'+LNAME[l]+'</span><input type="text" data-nx="'+l+'" value="'+esc(WEEK.next[l])+'"></label>';}).join('')+'</div>';
 $('#past').value=WEEK.past.join('\n');
 $$('[data-w]').forEach(function(el){el.addEventListener('input',function(){sp[el.dataset.w][el.dataset.l]=el.value;dirty();});});
 $$('[data-nx]').forEach(function(el){el.addEventListener('input',function(){WEEK.next[el.dataset.nx]=el.value;dirty();});});
}
if($('#past'))$('#past').addEventListener('input',function(e){WEEK.past=e.target.value.split('\n').map(function(s){return s.trim();}).filter(Boolean);dirty();});
if($('#sp-file'))$('#sp-file').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;uploadImage('special','special',f).then(function(n){WEEK.special.img=n;renderWeek();dirty();toast('Đã tải ảnh lên. Bấm « Lưu thay đổi » để áp dụng.');}).catch(function(er){toast(er.message,true);});});
function renderLinks(){$('#l-ig').value=SITE.instagram||'';$('#l-fb').value=SITE.facebook||'';}
$('#l-ig').addEventListener('input',function(e){SITE.instagram=e.target.value.trim();dirty();});
$('#l-fb').addEventListener('input',function(e){SITE.facebook=e.target.value.trim();dirty();});

// ---------------- lưu ----------------
function save(){
 var c=changed(),body={};if(!Object.keys(c).length||!online)return;
 if(c.menu)body.menu=JSON.parse(strip(MENU));if(c.semaine)body.semaine=WEEK;if(c.site)body.site=SITE;
 var noPrice=[];MENU.forEach(function(ct){ct.items.forEach(function(it){if(!it.hide&&/\[|\]/.test(it.price||''))noPrice.push(it.fr[0]||it.id);});});
 $('#save').disabled=true;$('#state').textContent='Đang lưu…';
 fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||'Lỗi khi lưu');return j;});})
  .then(function(j){MENU.forEach(function(ct){ct.items.forEach(function(it){delete it._auto;});});saved.time=j.time;snap();
   toast('Đã lưu trên máy. Bấm « Đẩy lên GitHub » để khách thấy bản mới.'+(noPrice.length?' Lưu ý: giá còn để tạm — '+noPrice.slice(0,3).join(', '):''));})
  .catch(function(e){dirty();toast(e.message,true);});
}
$('#save').addEventListener('click',save);
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}});
window.addEventListener('beforeunload',function(e){if(Object.keys(changed()).length){e.preventDefault();e.returnValue='';}});

// ---------------- thêm ----------------
$('#add-cat').addEventListener('click',function(){
 var c={id:'',icon:'',title:{fr:'Nouvelle catégorie',en:'',de:'',es:'',vi:'Danh mục mới',zh:'',ko:''},items:[]};c.id=uniqueCatId('nouvelle-categorie',c);
 MENU.push(c);selCat=MENU.length-1;selItem=-1;renderMenuView();dirty();var i=$('#cat-edit [data-ct=fr]');if(i){i.focus();i.select();}
});
$('#add-item').addEventListener('click',function(){
 var c=cat();if(!c)return;var it={id:'',icon:c.icon||'',img:'',price:'',veg:false,_auto:true};LANGS.forEach(function(l){it[l]=['',''];});it.fr[0]='Nouveau plat';it.id=uniqueItemId('nouveau-plat',it);
 c.items.push(it);selItem=c.items.length-1;update(true);renderEditor();var i=$('#item-edit [data-l=fr][data-n="0"]');if(i){i.focus();i.select();}
});

// ---------------- chuyển tab ----------------
function showView(name){
 $$('.views button').forEach(function(x){x.setAttribute('aria-selected',x.dataset.view===name);});
 $$('.view').forEach(function(v){v.hidden=v.id!=='view-'+name;});
 $('#preview').href=name==='menu'||name==='week'?'../menu.html':'../index.html';
 if(name==='github'&&!GH.st)ghStatus();
}
$$('.views button').forEach(function(b){b.addEventListener('click',function(){showView(b.dataset.view);});});

// ---------------- GitHub ----------------
function api(path,body){
 return fetch('/api/github/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})})
  .then(function(r){return r.json().catch(function(){return {error:'Lỗi máy chủ ('+r.status+')'};}).then(function(j){if(!r.ok)throw new Error(j.error||('Lỗi '+r.status));return j;});});
}
function ghStatus(){
 if(!online){$('#gh-status').textContent='Máy chủ quản trị chưa bật.';$('#gh-diff').disabled=true;return Promise.resolve(null);}
 return api('status').then(function(s){GH.st=s;
  $('#gh-repo').value=s.repo;$('#gh-branch').value=s.branch;$('#gh-cfg').textContent=s.config_path;
  $('#gh-status').textContent=s.configured?('Đã kết nối: token '+s.token_hint+', kho '+s.repo+', nhánh '+s.branch+'.'+(s.last_push?' Lần đẩy gần nhất từ máy này: '+s.last_push+'.':'')):'Chưa có token. Làm theo « Cách tạo token » bên dưới rồi dán token vào ô Token.';
  $('#gh-diff').disabled=!s.configured;return s;
 }).catch(function(e){$('#gh-status').textContent=e.message;return null;});
}
var KN={added:'mới',modified:'đã sửa',both:'cả hai bên đều sửa',unknown:'khác nhau',removed_remote:'đã bị xoá trên GitHub',remote_newer:'GitHub mới hơn',remote_only:'chỉ có trên GitHub'};
function ghGroup(cls,title,note,list,ctl){
 if(!list.length)return '';
 return '<div class="ghg '+cls+'"><h3>'+title+' ('+list.length+')</h3>'+(note?'<p>'+note+'</p>':'')+'<ul>'
  +list.map(function(x){return '<li>'+ctl(x)+'<code>'+esc(x.path)+'</code><span class="tag">'+esc(KN[x.kind]||x.kind)+'</span></li>';}).join('')+'</ul></div>';
}
function ghDiff(keepDone){
 if(!keepDone)$('#gh-done').hidden=true;
 GH.diff=null;$('#gh-acts').hidden=true;$('#gh-msg-wrap').hidden=true;$('#gh-info').textContent='';
 $('#gh-result').innerHTML='<p class="hint">Đang so sánh với GitHub…</p>';$('#gh-diff').disabled=true;
 return api('diff').then(function(d){GH.diff=d;renderDiff();}).catch(function(e){$('#gh-result').innerHTML='<div class="warn">'+esc(e.message)+'</div>';}).then(function(){$('#gh-diff').disabled=false;});
}
function renderDiff(){
 var d=GH.diff,h='',cb=function(attr){return function(x){return '<input type="checkbox" '+attr+'="'+esc(x.path)+'" checked>';};};
 $('#gh-info').textContent=d.repo+' · '+d.branch+' @ '+d.head.slice(0,7)+' · '+d.same+' tệp giống nhau';
 h+=ghGroup('push','Sẽ đẩy lên GitHub','Các tệp đã sửa hoặc thêm trên máy này.',d.push,cb('data-push'));
 h+=ghGroup('conflict','Cần chọn','Tệp khác nhau ở cả máy này và GitHub. Chọn giữ bản nào; mặc định là bỏ qua.',d.conflict,function(x){return '<select data-conf="'+esc(x.path)+'"><option value="">Bỏ qua</option><option value="push">Giữ bản trên máy (đẩy lên)</option><option value="pull">Lấy bản GitHub (tải về)</option></select>';});
 h+=ghGroup('newer','GitHub có bản mới hơn','Nên tải về để bản trên máy không bị cũ. Bản đang có được chép vào admin/backups trước khi thay.',d.newer,cb('data-pull'));
 h+=ghGroup('ronly','Chỉ có trên GitHub','Tệp trên GitHub mà máy này chưa có.',d.remote_only,cb('data-pull'));
 if(!h)h='<div class="ok">Trên máy và GitHub đang giống nhau, không có gì để đẩy.</div>';
 if(!d.has_base&&(d.push.length||d.conflict.length))h='<div class="warn">Lần đồng bộ đầu tiên: chưa biết bên nào sửa sau, nên tệp khác nhau được xếp vào « Cần chọn ».</div>'+h;
 if(d.moved_since_last)h='<div class="warn">GitHub đã được cập nhật từ nơi khác kể từ lần đẩy gần nhất ở máy này.</div>'+h;
 $('#gh-result').innerHTML=h;
 $$('#gh-result input,#gh-result select').forEach(function(el){el.addEventListener('change',ghCount);});
 ghCount();
}
function ghSel(){
 var push=[],pull=[];
 $$('[data-push]').forEach(function(c){if(c.checked)push.push(c.dataset.push);});
 $$('[data-pull]').forEach(function(c){if(c.checked)pull.push(c.dataset.pull);});
 $$('[data-conf]').forEach(function(x){if(x.value==='push')push.push(x.dataset.conf);else if(x.value==='pull')pull.push(x.dataset.conf);});
 return {push:push,pull:pull};
}
function ghCount(){
 var dirtyNow=Object.keys(changed()).length>0;$('#gh-dirty').hidden=!dirtyNow;
 if(!GH.diff)return;
 var d=GH.diff,s=ghSel(),any=d.push.length+d.conflict.length+d.newer.length+d.remote_only.length;
 $('#gh-acts').hidden=!any;$('#gh-msg-wrap').hidden=!s.push.length;
 $('#gh-push').textContent='Đẩy '+s.push.length+' tệp lên GitHub';$('#gh-push').disabled=!s.push.length||dirtyNow;
 $('#gh-pull').textContent='Tải '+s.pull.length+' tệp về máy';$('#gh-pull').hidden=!s.pull.length;$('#gh-pull').disabled=dirtyNow;
}
function reloadData(){
 return Promise.all([loadScript('../assets/menu.js'),loadScript('../assets/semaine.js'),loadScript('../assets/site.js')]).then(function(){
  normalize(window.MENU);WEEK=normWeek(window.SEMAINE);SITE={instagram:(window.SITE&&window.SITE.instagram)||'',facebook:(window.SITE&&window.SITE.facebook)||''};
  selItem=-1;snap();renderMenuView();renderWeek();renderLinks();loadImages();
 });
}
$('#gh-diff').addEventListener('click',function(){ghDiff();});
$('#gh-open').addEventListener('click',function(){
 showView('github');
 (GH.st?Promise.resolve(GH.st):ghStatus()).then(function(s){if(s&&s.configured&&!Object.keys(changed()).length)ghDiff();});
});
$('#gh-save').addEventListener('click',function(){
 var b=$('#gh-save');b.disabled=true;
 api('config',{token:$('#gh-token').value.trim(),repo:$('#gh-repo').value.trim(),branch:$('#gh-branch').value.trim()})
  .then(function(s){$('#gh-token').value='';toast('Kết nối GitHub được: '+s.check.repo+' · '+s.check.branch+' @ '+s.check.head);return ghStatus();})
  .catch(function(e){toast(e.message,true);}).then(function(){b.disabled=false;});
});
$('#gh-clear').addEventListener('click',function(){
 if(!confirm('Xoá token GitHub khỏi máy này? (Sau đó muốn đẩy lên phải dán token lại.)'))return;
 api('config',{clear:true}).then(function(){GH.diff=null;$('#gh-result').innerHTML='';$('#gh-acts').hidden=true;toast('Đã xoá token khỏi máy.');ghStatus();}).catch(function(e){toast(e.message,true);});
});
$('#gh-push').addEventListener('click',function(){
 var s=ghSel(),d=GH.diff;if(!d||!s.push.length)return;
 if(Object.keys(changed()).length){toast('Còn thay đổi chưa lưu. Bấm « Lưu thay đổi » trước.',true);return;}
 if(!confirm('Đẩy '+s.push.length+' tệp lên GitHub ('+d.repo+', nhánh '+d.branch+')?\n\n'+s.push.slice(0,12).join('\n')+(s.push.length>12?'\n…':'')+'\n\nTrang web sẽ cập nhật sau khoảng 1–2 phút.'))return;
 var b=$('#gh-push');b.disabled=true;b.textContent='Đang đẩy…';
 api('push',{paths:s.push,message:$('#gh-msg').value,head:d.head}).then(function(r){
  var dn=$('#gh-done');dn.hidden=false;
  dn.innerHTML='Đã đẩy '+r.files.length+' tệp lên GitHub ('+esc(r.commit.slice(0,7))+'). <a href="'+esc(r.url)+'" target="_blank" rel="noopener">Xem trên GitHub</a>. Trang web cập nhật sau khoảng 1–2 phút.';
  $('#gh-msg').value='';toast('Đã đẩy lên GitHub.');GH.st=null;ghStatus();return ghDiff(true);
 }).catch(function(e){toast(e.message,true);ghCount();});
});
$('#gh-pull').addEventListener('click',function(){
 var s=ghSel();if(!s.pull.length)return;
 if(Object.keys(changed()).length){toast('Còn thay đổi chưa lưu. Bấm « Lưu thay đổi » trước.',true);return;}
 if(!confirm('Tải '+s.pull.length+' tệp từ GitHub về máy này?\n\n'+s.pull.slice(0,12).join('\n')+(s.pull.length>12?'\n…':'')+'\n\nBản đang có trên máy được chép vào admin/backups trước khi thay.'))return;
 var b=$('#gh-pull');b.disabled=true;b.textContent='Đang tải…';
 api('pull',{paths:s.pull}).then(function(r){
  toast('Đã tải '+r.files.length+' tệp về máy.');
  var data=r.files.some(function(f){return /^assets\/(menu|semaine|site)\.js$/.test(f);});
  return (data?reloadData():Promise.resolve()).then(function(){return ghDiff();});
 }).catch(function(e){toast(e.message,true);ghCount();});
});

// ---------------- khởi động ----------------
fetch('/api/ping',{cache:'no-store'}).then(function(r){online=r.ok;}).catch(function(){online=false;}).then(function(){
 $('#offline').hidden=online;$('#gh-open').disabled=!online;
 return Promise.all([loadScript('../assets/menu.js'),loadScript('../assets/semaine.js'),loadScript('../assets/site.js')]);
}).then(function(){
 normalize(window.MENU);WEEK=normWeek(window.SEMAINE);SITE={instagram:(window.SITE&&window.SITE.instagram)||'',facebook:(window.SITE&&window.SITE.facebook)||''};
 snap();
 // các mã món mới sinh ra lần đầu (menu cũ chưa có mã) được tính là thay đổi cần lưu
 var hadIds=(window.MENU||[]).every(function(c){return (c.items||[]).every(function(it){return !!it.id;});});
 if(!hadIds)saved.menu='';
 dirty();renderMenuView();renderWeek();renderLinks();loadImages();
});
})();
