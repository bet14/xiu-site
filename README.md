# Xíu — street food vietnamienne, Paris 5e

Site statique (HTML/CSS/JS), 7 langues (FR, EN, DE, ES, VI, 中文, 한국어).

Pages : `index.html` (accueil) · `menu.html` · `traiteur.html` · `infos.html` · `mentions-legales.html`

## Sửa menu (trang quản trị)
1. Nhấp đúp `Quan-ly-menu.bat` (cần Python 3). Trình duyệt tự mở http://localhost:8765/admin/
2. Sửa danh mục, món, giá, ảnh, mô tả 7 ngôn ngữ (DE, ES để trống thì web dùng tạm tiếng Anh), món của tuần, link mạng xã hội → bấm **Lưu thay đổi** (hoặc Ctrl+S).
3. Bấm **Đẩy lên GitHub** (góc trên bên phải) → « Kiểm tra thay đổi » → « Đẩy … tệp lên GitHub ». Khoảng 1–2 phút sau trang web cập nhật.
   Lần đầu cần dán token GitHub (Fine-grained, chỉ kho xiu-site, quyền Contents: Read and write) ở mục « Kết nối »; token lưu trong `~/.xiu-site-admin.json`, ngoài thư mục web.
   Nếu GitHub có bản mới hơn (sửa từ nơi khác), bấm « Tải … tệp về máy » trước; bản cũ được chép vào `admin/backups/`.

Mỗi lần lưu, bản cũ được chép vào `admin/backups/`. Trang quản trị chỉ chạy trên máy mình (127.0.0.1).

## Dữ liệu
- Menu : `assets/menu.js` · ảnh món : `assets/img/menu/`
- Món của tuần : `assets/semaine.js` · liên kết mạng xã hội : `assets/site.js`
- Câu chữ các trang : `assets/i18n.js`
