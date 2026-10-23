# Xíu — street food vietnamienne, Paris 5e

Site statique (HTML/CSS/JS), 5 langues (FR, EN, VI, 中文, 한국어).

Pages : `index.html` (accueil) · `menu.html` · `traiteur.html` · `infos.html` · `mentions-legales.html`

## Sửa menu (trang quản trị)
1. Nhấp đúp `Quan-ly-menu.bat` (cần Python 3). Trình duyệt tự mở http://localhost:8765/admin/
2. Sửa danh mục, món, giá, ảnh, mô tả 5 ngôn ngữ, món của tuần, link mạng xã hội → bấm **Lưu thay đổi** (hoặc Ctrl+S).
3. Đưa thư mục lên GitHub (commit + push) để khách thấy bản mới.

Mỗi lần lưu, bản cũ được chép vào `admin/backups/`. Trang quản trị chỉ chạy trên máy mình (127.0.0.1).

## Dữ liệu
- Menu : `assets/menu.js` · ảnh món : `assets/img/menu/`
- Món của tuần : `assets/semaine.js` · liên kết mạng xã hội : `assets/site.js`
- Câu chữ các trang : `assets/i18n.js`
