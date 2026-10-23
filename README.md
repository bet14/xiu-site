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

## Đặt món tại tiệm (giai đoạn 2)
Khách quét mã QR trong tiệm → `menu.html?t=MÃ` → chọn món, gửi đơn → nhân viên nhận ở `/quan-ly`, xác nhận, in phiếu hoặc đọc cho bếp, nhập máy tính tiền như cũ. Không có thanh toán online.

- Máy chủ: Cloudflare Worker `worker/index.js`, cấu hình `wrangler.jsonc`; hai cơ sở D1 `xiu-orders` (đơn trong 24 giờ) và `xiu-stats` (thống kê ẩn danh).
- Trang khách: `assets/order.js`, `assets/order.css` (chỉ bật khi có mã QR). Trang tiệm: `quan-ly.html`, `assets/quan-ly.js`, `assets/quan-ly.css`.
- Chỉ những tệp được `worker/build.mjs` chép vào `dist/` mới được công khai (các trang .html, `assets/`, robots, sitemap, `_headers`). `admin/`, `worker/`, README… không lên mạng.
- Chống spam: mã QR bí mật (đổi được), tối đa 5 đơn / 10 phút / thiết bị → khóa 60 phút; 20 đơn / 10 phút / IP; quá 25 đơn chờ thì ngừng nhận; nhận đơn theo giờ mở cửa; tùy chọn Turnstile.
- Mỗi đêm (02:15 UTC) đơn cũ hơn 24 giờ được chép sang `xiu-stats` không kèm tên, ghi chú, thiết bị, IP, rồi xóa.
- Bí mật đặt trên Cloudflare (Settings → Variables and Secrets): `APP_SECRET`, `STAFF_PASSWORD`, tùy chọn `STATS_KEY`, `TURNSTILE_SITEKEY`, `TURNSTILE_SECRET`.
- Tải thống kê: `/api/stats.csv?key=STATS_KEY` (thêm `&what=orders` để lấy theo đơn).
- Hướng dẫn triển khai chi tiết: `.nghien-cuu/huong-dan-trien-khai.html` (không đẩy lên GitHub).
