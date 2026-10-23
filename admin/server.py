#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Xíu — máy chủ quản trị chạy trên máy tính của mình (không cần cài thêm gì).

Chạy:  nhấp đúp  Quan-ly-menu.bat   (hoặc:  python admin/server.py)
Mở:    http://localhost:8765/admin/   (trang web xem thử: http://localhost:8765/)

Máy chủ chỉ nghe trên 127.0.0.1, người khác trong mạng không vào được.
Mỗi lần lưu, bản cũ được chép vào admin/backups/ trước khi ghi đè.
"""
import json, os, re, sys, time, threading, webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
IMG = os.path.join(ASSETS, "img")
IMG_MENU = os.path.join(IMG, "menu")
BACKUPS = os.path.join(ROOT, "admin", "backups")
PORT = int(os.environ.get("XIU_PORT", "8765"))
HOST = "127.0.0.1"
LANGS = ["fr", "en", "vi", "zh", "ko"]
BADGES = {"", "signature", "top1", "top2", "top3", "populaire", "nouveau"}
MAX_UPLOAD = 10 * 1024 * 1024

HEAD_MENU = """// =====================================================================
// MENU XÍU — tạo bởi trang quản trị (admin). Nên sửa bằng trang quản trị:
//   nhấp đúp Quan-ly-menu.bat rồi mở http://localhost:8765/admin/
// Vẫn có thể sửa tay bằng Notepad. Mỗi danh mục: id, icon, title (5 ngôn ngữ),
// hide (ẩn cả danh mục), items. Mỗi món:
//   id    : mã món (không dấu, dùng cho đặt món sau này)
//   img   : tên ảnh trong assets/img/menu/ (không ghi đuôi = .webp); "" nếu chưa có ảnh
//   price : giá hiển thị, ví dụ "12,5 €"
//   veg   : true nếu là món chay (tự hiện thêm trong mục Veggie)
//   badge : "signature", "top1", "top2", "top3", "populaire", "nouveau" hoặc ""
//   icon  : biểu tượng trước tên món
//   hide  : true để tạm ẩn món (hết hàng) mà không xoá
//   fr/en/vi/zh/ko : [tên món, mô tả]
// =====================================================================
"""
HEAD_SEMAINE = """// =====================================================================
// MÓN CỦA TUẦN — tạo bởi trang quản trị (admin), vẫn sửa tay được.
//   special : món đặc biệt thứ Sáu – thứ Bảy (img: ảnh trong assets/img/)
//   next    : món dự kiến tuần sau ("" nếu chưa biết)
//   past    : các món đã bán mấy tuần trước
// =====================================================================
"""
HEAD_SITE = """// =====================================================================
// LIÊN KẾT MẠNG XÃ HỘI — sửa bằng trang quản trị (admin) hoặc Notepad.
// Để "" nếu chưa có: nút tương ứng sẽ tự ẩn.
// =====================================================================
"""


def j(v):
    return json.dumps(v, ensure_ascii=False)


def s(v, n=2000):
    return str(v if v is not None else "")[:n]


def clean_lang(v):
    v = v if isinstance(v, list) else ["", ""]
    v = (v + ["", ""])[:2]
    return [s(v[0], 300), s(v[1], 2000)]


def clean_menu(menu):
    if not isinstance(menu, list):
        raise ValueError("menu phải là danh sách")
    out, ids = [], set()
    for c in menu:
        cid = s(c.get("id"), 60)
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", cid) or cid in ids or cid == "veggie":
            raise ValueError("Mã danh mục không hợp lệ hoặc bị trùng: %r" % cid)
        ids.add(cid)
        title = c.get("title") if isinstance(c.get("title"), dict) else {}
        cat = {"id": cid, "icon": s(c.get("icon"), 16), "title": {l: s(title.get(l), 200) for l in LANGS}}
        if c.get("hide"):
            cat["hide"] = True
        items, iids = [], set()
        for it in c.get("items") or []:
            iid = s(it.get("id"), 80)
            if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", iid):
                raise ValueError("Mã món không hợp lệ: %r" % iid)
            img = s(it.get("img"), 120)
            if img and not re.fullmatch(r"[A-Za-z0-9._-]+", img):
                raise ValueError("Tên ảnh không hợp lệ: %r" % img)
            badge = s(it.get("badge"), 20)
            if badge not in BADGES:
                badge = ""
            item = {"id": iid, "icon": s(it.get("icon"), 16), "img": img, "price": s(it.get("price"), 40), "veg": bool(it.get("veg"))}
            if badge:
                item["badge"] = badge
            if it.get("hide"):
                item["hide"] = True
            for l in LANGS:
                item[l] = clean_lang(it.get(l))
            items.append(item)
        cat["items"] = items
        out.append(cat)
    return out


def menu_js(menu):
    parts = []
    for c in menu:
        head = {k: v for k, v in c.items() if k != "items"}
        h = j(head)[:-1] + ', "items": ['
        rows = ",\n".join("  " + j(it) for it in c["items"])
        parts.append(h + ("\n" + rows + "\n" if rows else "") + "]}")
    return HEAD_MENU + "window.MENU = [\n" + ",\n".join(parts) + "\n];\n"


def clean_semaine(w):
    w = w if isinstance(w, dict) else {}
    sp = w.get("special") if isinstance(w.get("special"), dict) else {}
    def langs(o, n):
        o = o if isinstance(o, dict) else {}
        return {l: s(o.get(l), n) for l in LANGS}
    img = s(sp.get("img"), 120)
    if img and not re.fullmatch(r"[A-Za-z0-9._-]+", img):
        img = ""
    special = {"name": langs(sp.get("name"), 200), "desc": langs(sp.get("desc"), 1500)}
    if img:
        special["img"] = img
    past = [s(x, 120) for x in (w.get("past") or []) if s(x).strip()][:30]
    return {"special": special, "next": langs(w.get("next"), 200), "past": past}


def clean_site(x):
    x = x if isinstance(x, dict) else {}
    out = {}
    for k in ("instagram", "facebook"):
        v = s(x.get(k), 300).strip()
        if v and not re.match(r"^https://", v):
            raise ValueError("Liên kết %s phải bắt đầu bằng https://" % k)
        out[k] = v
    return out


def backup(name):
    src = os.path.join(ASSETS, name)
    if not os.path.exists(src):
        return
    os.makedirs(BACKUPS, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    with open(src, "rb") as f, open(os.path.join(BACKUPS, "%s-%s" % (stamp, name)), "wb") as g:
        g.write(f.read())


def write_atomic(path, text):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    os.replace(tmp, path)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/") or "404" in (fmt % args):
            sys.stderr.write("%s  %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _host_ok(self):
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("localhost", "127.0.0.1")

    def _origin_ok(self):
        o = self.headers.get("Origin")
        return o is None or re.fullmatch(r"http://(localhost|127\.0\.0\.1):%d" % PORT, o) is not None

    def _json(self, code, obj):
        body = j(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._host_ok():
            return self.send_error(403)
        u = urlparse(self.path)
        if u.path == "/api/ping":
            return self._json(200, {"ok": True})
        if u.path == "/api/images":
            os.makedirs(IMG_MENU, exist_ok=True)
            files = sorted(f for f in os.listdir(IMG_MENU) if re.search(r"\.(webp|jpe?g|png)$", f, re.I))
            return self._json(200, {"images": files})
        if u.path.startswith("/admin/backups"):
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        if not self._host_ok() or not self._origin_ok():
            return self.send_error(403)
        u = urlparse(self.path)
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_UPLOAD:
            return self._json(413, {"error": "Tệp quá lớn (tối đa 10 MB)"})
        body = self.rfile.read(n)
        try:
            if u.path == "/api/save":
                data = json.loads(body.decode("utf-8"))
                done = []
                if "menu" in data:
                    menu = clean_menu(data["menu"])
                    backup("menu.js")
                    write_atomic(os.path.join(ASSETS, "menu.js"), menu_js(menu))
                    done.append("menu")
                if "semaine" in data:
                    w = clean_semaine(data["semaine"])
                    backup("semaine.js")
                    write_atomic(os.path.join(ASSETS, "semaine.js"), HEAD_SEMAINE + "window.SEMAINE = " + json.dumps(w, ensure_ascii=False, indent=2) + ";\n")
                    done.append("semaine")
                if "site" in data:
                    x = clean_site(data["site"])
                    backup("site.js")
                    write_atomic(os.path.join(ASSETS, "site.js"), HEAD_SITE + "window.SITE = " + json.dumps(x, ensure_ascii=False, indent=2) + ";\n")
                    done.append("site")
                return self._json(200, {"ok": True, "saved": done, "time": time.strftime("%H:%M:%S")})
            if u.path == "/api/upload":
                q = parse_qs(u.query)
                kind = (q.get("kind") or ["menu"])[0]
                name = (q.get("name") or [""])[0]
                if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,80}\.(webp|jpg|jpeg|png)", name):
                    raise ValueError("Tên ảnh không hợp lệ")
                is_img = (body[:4] == b"RIFF" and body[8:12] == b"WEBP") or body[:3] == b"\xff\xd8\xff" or body[:8] == b"\x89PNG\r\n\x1a\n"
                if not is_img:
                    raise ValueError("Tệp không phải ảnh WebP/JPEG/PNG")
                folder = IMG_MENU if kind == "menu" else IMG
                os.makedirs(folder, exist_ok=True)
                with open(os.path.join(folder, name), "wb") as f:
                    f.write(body)
                return self._json(200, {"ok": True, "name": name})
            return self._json(404, {"error": "Không có chức năng này"})
        except ValueError as e:
            return self._json(400, {"error": str(e)})
        except Exception as e:  # noqa
            return self._json(500, {"error": "Lỗi máy chủ: %s" % e})


def main():
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    url = "http://localhost:%d/admin/" % PORT
    try:
        srv = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:
        print("Cổng %d đang được dùng — có thể trang quản trị đã chạy rồi. Mở: %s" % (PORT, url))
        webbrowser.open(url)
        return
    print("Xíu — trang quản trị đang chạy.")
    print("  Quản trị : " + url)
    print("  Xem web  : http://localhost:%d/" % PORT)
    print("Đóng cửa sổ này (hoặc Ctrl+C) để tắt.")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
