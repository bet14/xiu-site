# -*- coding: utf-8 -*-
"""
Đồng bộ thư mục xiu-site với GitHub qua GitHub REST API (không cần cài git).

- Token GitHub lưu ở  ~/.xiu-site-admin.json  (thư mục người dùng, NGOÀI thư mục
  xiu-site) nên không bao giờ bị đẩy lên GitHub và không bao giờ gửi về trình duyệt.
- admin/backups/github-base.json ghi lại trạng thái tệp ở lần đồng bộ gần nhất,
  để phân biệt « mình sửa trên máy » với « trên GitHub có bản mới hơn ».
- Không bao giờ xoá tệp trên GitHub.
"""
import base64, hashlib, json, os, re, shutil, ssl, time, urllib.error, urllib.request

API = os.environ.get("XIU_GH_API", "https://api.github.com")  # biến môi trường chỉ dùng khi thử nghiệm
CONFIG = os.path.join(os.path.expanduser("~"), ".xiu-site-admin.json")
DEFAULT_REPO = "bet14/xiu-site"
DEFAULT_BRANCH = "main"
MAX_FILE = 25 * 1024 * 1024
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".vscode", ".idea"}
SKIP_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}
KEEP_DOT = {".nojekyll", ".gitignore", ".gitattributes"}


class GHError(Exception):
    def __init__(self, msg, code=400):
        super().__init__(msg)
        self.code = code


# ---------------- cấu hình ----------------
def load_config():
    try:
        with open(CONFIG, encoding="utf-8") as f:
            c = json.load(f)
        return c if isinstance(c, dict) else {}
    except Exception:
        return {}


def save_config(c):
    tmp = CONFIG + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(c, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CONFIG)
    try:
        os.chmod(CONFIG, 0o600)
    except Exception:
        pass


def public_status():
    c = load_config()
    t = c.get("token") or ""
    return {
        "configured": bool(t),
        "token_hint": ("…" + t[-4:]) if len(t) > 8 else "",
        "repo": c.get("repo") or DEFAULT_REPO,
        "branch": c.get("branch") or DEFAULT_BRANCH,
        "last_push": c.get("last_push") or None,
        "config_path": CONFIG,
    }


def set_config(data):
    c = load_config()
    if data.get("clear"):
        c.pop("token", None)
        save_config(c)
        return public_status()
    repo = str(data.get("repo") or c.get("repo") or DEFAULT_REPO).strip()
    branch = str(data.get("branch") or c.get("branch") or DEFAULT_BRANCH).strip()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise GHError("Tên kho không hợp lệ (dạng chủ/kho, ví dụ bet14/xiu-site)")
    if not re.fullmatch(r"[A-Za-z0-9_./-]{1,100}", branch):
        raise GHError("Tên nhánh không hợp lệ")
    token = str(data.get("token") or "").strip()
    if token and not re.fullmatch(r"[A-Za-z0-9_]{20,255}", token):
        raise GHError("Token không đúng định dạng (thường bắt đầu bằng github_pat_ hoặc ghp_)")
    new = dict(c, repo=repo, branch=branch)
    if token:
        new["token"] = token
    if not new.get("token"):
        raise GHError("Chưa nhập token")
    gh = GitHub(new)
    info = gh.check()  # thử đọc kho trước khi lưu
    if token and token != c.get("token"):
        new.pop("last_head", None)
    save_config(new)
    out = public_status()
    out["check"] = info
    return out


# ---------------- gọi API ----------------
class GitHub:
    def __init__(self, c=None):
        c = c if c is not None else load_config()
        self.token = c.get("token") or ""
        self.repo = c.get("repo") or DEFAULT_REPO
        self.branch = c.get("branch") or DEFAULT_BRANCH
        if not self.token:
            raise GHError("Chưa kết nối GitHub: nhập token ở mục « Kết nối » trước.", 400)
        self.ctx = ssl.create_default_context()

    def call(self, method, path, body=None, timeout=60):
        url = API + path
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", "Bearer " + self.token)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        req.add_header("User-Agent", "xiu-site-admin")
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=self.ctx) as r:
                raw = r.read()
                return json.loads(raw.decode("utf-8")) if raw else {}
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read().decode("utf-8")).get("message", "")
            except Exception:
                msg = ""
            if e.code == 401:
                raise GHError("GitHub từ chối token (401): token sai hoặc đã hết hạn.", 401)
            if e.code == 403:
                raise GHError("Token không có quyền (403): cần quyền Contents: Read and write cho kho %s. %s" % (self.repo, msg), 403)
            if e.code == 404:
                raise GHError("Không thấy kho %s hoặc nhánh %s (404) — kiểm tra tên kho và quyền của token." % (self.repo, self.branch), 404)
            if e.code == 409 or e.code == 422:
                raise GHError("GitHub không nhận thay đổi (%d): %s" % (e.code, msg), 409)
            raise GHError("Lỗi GitHub %d: %s" % (e.code, msg), 502)
        except urllib.error.URLError as e:
            raise GHError("Không kết nối được GitHub (mạng?): %s" % e.reason, 502)

    def check(self):
        head = self.head()
        return {"repo": self.repo, "branch": self.branch, "head": head[:7]}

    def head(self):
        r = self.call("GET", "/repos/%s/git/ref/heads/%s" % (self.repo, self.branch))
        return r["object"]["sha"]

    def tree(self, commit):
        c = self.call("GET", "/repos/%s/git/commits/%s" % (self.repo, commit))
        t = self.call("GET", "/repos/%s/git/trees/%s?recursive=1" % (self.repo, c["tree"]["sha"]))
        if t.get("truncated"):
            raise GHError("Kho quá lớn, GitHub trả danh sách tệp không đầy đủ.", 502)
        files = {x["path"]: {"sha": x["sha"], "mode": x["mode"]} for x in t.get("tree", []) if x.get("type") == "blob"}
        return c["tree"]["sha"], files


# ---------------- tệp trên máy ----------------
def blob_sha(data):
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def skipped(rel):
    parts = rel.split("/")
    if parts[:2] == ["admin", "backups"]:
        return True
    if any(p in SKIP_DIRS for p in parts[:-1]):
        return True
    name = parts[-1]
    if name in SKIP_FILES or name.endswith((".tmp", ".pyc", "~")):
        return True
    if any(p.startswith(".") and p not in KEEP_DOT for p in parts):
        return True
    return False


def local_files(root):
    out = {}
    for d, dirs, files in os.walk(root):
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS and not x.startswith("."))
        for f in sorted(files):
            full = os.path.join(d, f)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            if skipped(rel) or os.path.islink(full):
                continue
            size = os.path.getsize(full)
            if size > MAX_FILE:
                continue
            with open(full, "rb") as fh:
                out[rel] = blob_sha(fh.read())
    return out


def base_path(root):
    return os.path.join(root, "admin", "backups", "github-base.json")


def load_base(root):
    try:
        with open(base_path(root), encoding="utf-8") as f:
            b = json.load(f)
        return b.get("files", {}) if isinstance(b, dict) else {}
    except Exception:
        return {}


def save_base(root, files, head):
    p = base_path(root)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"head": head, "time": time.strftime("%Y-%m-%d %H:%M:%S"), "files": files}, f, indent=0, sort_keys=True)
    os.replace(tmp, p)


def init_base_from_local(root, head=""):
    """Dùng khi chắc chắn thư mục trên máy đang giống hệt GitHub."""
    save_base(root, local_files(root), head)


# ---------------- so sánh ----------------
def compare(root):
    gh = GitHub()
    head = gh.head()
    _, remote = gh.tree(head)
    local = local_files(root)
    base = load_base(root)
    push, conflict, newer, remote_only = [], [], [], []
    same = 0
    for p, sha in local.items():
        r = remote.get(p)
        if r and r["sha"] == sha:
            same += 1
            continue
        b = base.get(p)
        if not r:
            # chưa có trên GitHub (hoặc bị xoá trên GitHub sau lần đồng bộ trước)
            (conflict if b and b == sha else push).append({"path": p, "kind": "removed_remote" if b == sha else "added"})
        elif b and b == r["sha"]:
            push.append({"path": p, "kind": "modified"})
        elif b and b == sha:
            newer.append({"path": p, "kind": "remote_newer"})
        else:
            conflict.append({"path": p, "kind": "both" if b else "unknown"})
    for p in remote:
        if p not in local and not skipped(p):
            remote_only.append({"path": p, "kind": "remote_only"})
    cfg = load_config()
    last = cfg.get("last_head")
    return {
        "head": head,
        "repo": gh.repo,
        "branch": gh.branch,
        "push": sorted(push, key=lambda x: x["path"]),
        "conflict": sorted(conflict, key=lambda x: x["path"]),
        "newer": sorted(newer, key=lambda x: x["path"]),
        "remote_only": sorted(remote_only, key=lambda x: x["path"]),
        "same": same,
        "has_base": bool(base),
        "moved_since_last": bool(last and last != head),
    }


def _safe_rel(root, rel):
    if not isinstance(rel, str) or not rel or rel.startswith("/") or "\\" in rel or ".." in rel.split("/") or skipped(rel):
        raise GHError("Đường dẫn không hợp lệ: %r" % rel)
    full = os.path.normpath(os.path.join(root, rel))
    if not full.startswith(os.path.normpath(root) + os.sep):
        raise GHError("Đường dẫn không hợp lệ: %r" % rel)
    return full


def push(root, paths, message, expected_head):
    gh = GitHub()
    head = gh.head()
    if expected_head and head != expected_head:
        raise GHError("Trên GitHub vừa có thay đổi mới. Bấm « Kiểm tra thay đổi » lại rồi mới đẩy.", 409)
    tree_sha, remote = gh.tree(head)
    paths = sorted(set(paths or []))
    if not paths:
        raise GHError("Chưa chọn tệp nào để đẩy.")
    entries, pushed = [], {}
    for rel in paths:
        full = _safe_rel(root, rel)
        if not os.path.isfile(full):
            raise GHError("Không thấy tệp trên máy: %s" % rel)
        with open(full, "rb") as f:
            data = f.read()
        if len(data) > MAX_FILE:
            raise GHError("Tệp quá lớn (> 25 MB): %s" % rel)
        sha = blob_sha(data)
        if remote.get(rel, {}).get("sha") == sha:
            continue
        b = gh.call("POST", "/repos/%s/git/blobs" % gh.repo,
                    {"content": base64.b64encode(data).decode("ascii"), "encoding": "base64"}, timeout=180)
        if b.get("sha") != sha:
            raise GHError("GitHub trả mã tệp không khớp cho %s" % rel, 502)
        entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": sha})
        pushed[rel] = sha
    if not entries:
        raise GHError("Các tệp đã chọn đã giống trên GitHub, không có gì để đẩy.")
    msg = (str(message or "").strip() or "Cập nhật từ trang quản trị")[:500]
    t = gh.call("POST", "/repos/%s/git/trees" % gh.repo, {"base_tree": tree_sha, "tree": entries})
    c = gh.call("POST", "/repos/%s/git/commits" % gh.repo, {"message": msg, "tree": t["sha"], "parents": [head]})
    gh.call("PATCH", "/repos/%s/git/refs/heads/%s" % (gh.repo, gh.branch), {"sha": c["sha"], "force": False})
    # ghi lại trạng thái đồng bộ
    base = load_base(root)
    local = local_files(root)
    for p, r in remote.items():
        if local.get(p) == r["sha"]:
            base[p] = r["sha"]
    base.update(pushed)
    save_base(root, base, c["sha"])
    cfg = load_config()
    cfg["last_head"] = c["sha"]
    cfg["last_push"] = time.strftime("%Y-%m-%d %H:%M")
    save_config(cfg)
    return {"ok": True, "commit": c["sha"], "files": sorted(pushed),
            "url": "https://github.com/%s/commit/%s" % (gh.repo, c["sha"])}


def pull(root, paths, backups_dir):
    gh = GitHub()
    head = gh.head()
    _, remote = gh.tree(head)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    done = []
    base = load_base(root)
    for rel in sorted(set(paths or [])):
        full = _safe_rel(root, rel)
        r = remote.get(rel)
        if not r:
            raise GHError("Tệp không có trên GitHub: %s" % rel)
        b = gh.call("GET", "/repos/%s/git/blobs/%s" % (gh.repo, r["sha"]), timeout=180)
        data = base64.b64decode(b.get("content", ""))
        if blob_sha(data) != r["sha"]:
            raise GHError("Tải về bị lỗi: %s" % rel, 502)
        if os.path.exists(full):
            bk = os.path.join(backups_dir, "truoc-khi-tai-ve-" + stamp, rel)
            os.makedirs(os.path.dirname(bk), exist_ok=True)
            shutil.copy2(full, bk)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        tmp = full + ".tmp"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, full)
        base[rel] = r["sha"]
        done.append(rel)
    save_base(root, base, head)
    return {"ok": True, "files": done}
