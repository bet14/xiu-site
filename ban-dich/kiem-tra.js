// Kiểm tra bản dịch menu so với tiếng Pháp (bản gốc).
//   node ban-dich/kiem-tra.js         -> liệt kê món cần dịch lại
//   node ban-dich/kiem-tra.js --chot  -> ghi nhận tiếng Pháp hiện tại là "đã dịch xong"
// Thư mục ban-dich/ không được đưa lên mạng (build.mjs chỉ chép vào dist/ các tệp công khai).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SNAP = path.join(__dirname, 'fr-da-dich.json');
const LANGS = ['en', 'de', 'es', 'vi', 'zh', 'ko', 'ja'];
global.window = {};
eval(fs.readFileSync(path.join(ROOT, 'assets/menu.js'), 'utf8'));
const items = [];
window.MENU.forEach(c => {
  items.push({ id: 'danh-muc:' + c.id, fr: [c.title.fr, ''], tr: l => [c.title[l] || '', ''], cat: true });
  (c.items || []).forEach(i => items.push({ id: i.id, fr: i.fr || ['', ''], tr: l => i[l] || ['', ''] }));
});
const cur = {}; items.forEach(i => cur[i.id] = i.fr);
if (process.argv.includes('--chot')) {
  fs.writeFileSync(SNAP, JSON.stringify(cur, null, 1));
  console.log('Đã ghi nhận ' + items.length + ' mục là đã dịch xong.');
  process.exit(0);
}
const snap = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {};
let n = 0;
items.forEach(i => {
  const old = snap[i.id], why = [];
  if (!old) why.push('món mới');
  else {
    if (old[0] !== i.fr[0]) why.push('tên FR đổi: "' + old[0] + '" -> "' + i.fr[0] + '"');
    if (old[1] !== i.fr[1]) why.push('mô tả FR đổi');
  }
  const empty = LANGS.filter(l => (i.fr[0] && !i.tr(l)[0]) || (i.fr[1] && !i.tr(l)[1] && !i.cat));
  if (empty.length) why.push('trống: ' + empty.join(','));
  if (why.length) { n++; console.log('- ' + i.id + ': ' + why.join(' | ')); }
});
console.log(n ? n + ' mục cần xem.' : 'Tất cả bản dịch khớp với tiếng Pháp.');
