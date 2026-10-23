// =====================================================================
// XÍU — máy chủ đặt món (Cloudflare Worker)
//   - Phục vụ trang web tĩnh (thư mục dist/, tạo bởi worker/build.mjs)
//   - API khách:   GET  /api/session?t=MÃ      → kiểm tra mã QR, cấp mã thiết bị
//                  POST /api/orders             → gửi đơn
//                  GET  /api/orders/status?c=…  → khách xem trạng thái đơn
//   - API tiệm:    /api/staff/*  (đăng nhập bằng mật khẩu, cookie HttpOnly)
//   - Thống kê:    GET /api/stats.csv?key=…     (khóa riêng STATS_KEY)
//   - Hằng đêm:    chép đơn cũ hơn 24 giờ sang cơ sở STATS (ẩn danh) rồi xóa
// Bí mật (Cloudflare → Worker → Settings → Variables and Secrets):
//   APP_SECRET       chuỗi ngẫu nhiên ≥ 32 ký tự (ký cookie, băm IP)
//   STAFF_PASSWORD   mật khẩu trang /quan-ly (≥ 10 ký tự)
//   STATS_KEY        (tùy chọn) khóa tải thống kê CSV
//   TURNSTILE_SITEKEY, TURNSTILE_SECRET (tùy chọn) chống robot
// =====================================================================

import CALC from '../assets/formule-calc.js';

const LANGS = ['fr', 'en', 'de', 'es', 'vi', 'zh', 'ko'];
const SERVICES = ['place', 'emporter']; // ăn tại chỗ / mang đi

const LIMITS = {
  devOrders: 5, devWindow: 600,     // tối đa 5 đơn / 10 phút / thiết bị
  ipOrders: 20, ipWindow: 600,      // tối đa 20 đơn / 10 phút / IP (Wi-Fi chung)
  ipDevices: 40,                    // tối đa 40 thiết bị mới / 10 phút / IP
  blockSecs: 3600,                  // khóa 60 phút
  maxPending: 25,                   // quá 25 đơn chờ → tạm ngừng nhận
  maxLines: 20, maxQty: 10, maxItems: 30,
  nameLen: 30, noteLen: 140,
  loginFails: 5, loginWindow: 900,  // 5 lần sai / 15 phút / IP → khóa 60 phút
  loginFailsAll: 40,                // 40 lần sai / 15 phút trên mọi IP → khóa đăng nhập 60 phút
  expireNew: 1800,                  // đơn "mới" quá 30 phút → hết hạn
  keepSecs: 86400,                  // giữ đơn 24 giờ
  staffSession: 7 * 86400,
  bodyMax: 6000,
};

// Giờ nhận đơn (giờ Paris), phút trong ngày. 0 = Chủ nhật.
const HOURS = {
  0: [], 1: [[660, 900], [1080, 1260]], 2: [[660, 900], [1080, 1260]], 3: [[660, 900], [1080, 1260]],
  4: [[660, 900], [1080, 1260]], 5: [[660, 1260]], 6: [[660, 1260]],
};
const OPEN_EARLY = 15, CLOSE_BEFORE = 10;

// ---------------------------------------------------------------- tiện ích
const enc = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);

function b64url(buf) {
  const b = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}
function randomId(n = 16) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b64url(b);
}
function randomToken(len = 8) {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789'; // không có i, l, o, 0, 1
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  let s = '';
  for (let i = 0; i < len; i++) s += abc[b[i] % abc.length];
  return s;
}

const keyCache = new Map();
async function hmac(secret, data) {
  let k = keyCache.get(secret);
  if (!k) {
    k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    keyCache.set(secret, k);
  }
  return b64url(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
async function safeEq(a, b) {
  // so sánh thời gian hằng: băm hai phía rồi so
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b))),
  ]);
  return crypto.subtle.timingSafeEqual(x, y);
}

function parisParts(ts) {
  const g = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ts * 1000)).forEach((p) => { g[p.type] = p.value; });
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g.weekday];
  return { day: `${g.year}-${g.month}-${g.day}`, dow, min: +g.hour * 60 + +g.minute, hm: `${g.hour}:${g.minute}` };
}

function withinHours(ts) {
  const p = parisParts(ts);
  return (HOURS[p.dow] || []).some(([a, b]) => p.min >= a - OPEN_EARLY && p.min < b - CLOSE_BEFORE);
}

const SEC_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
};
function json(data, status = 200, extra = {}) {
  const h = new Headers(SEC_HEADERS);
  for (const [k, v] of Object.entries(extra)) {
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x)); else h.set(k, v);
  }
  return new Response(JSON.stringify(data), { status, headers: h });
}
const fail = (err, status = 400, more = {}) => json({ ok: false, err, ...more }, status);

function cookies(req) {
  const out = {};
  (req.headers.get('Cookie') || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}
// Chỉ khi chạy thử trên máy (DEV_HTTP=1 trong .dev.vars) và mở bằng http:// thì bỏ cờ Secure,
// để điện thoại cùng Wi-Fi thử được qua http://IP-máy:8787. Trên Cloudflare không bao giờ đặt DEV_HTTP.
let INSECURE_DEV = false;
function cookie(name, value, { maxAge, path = '/', sameSite = 'Lax' } = {}) {
  return `${name}=${value}; Path=${path}; HttpOnly;${INSECURE_DEV ? '' : ' Secure;'} SameSite=${sameSite}` + (maxAge != null ? `; Max-Age=${maxAge}` : '');
}

async function readJson(req) {
  const len = +(req.headers.get('Content-Length') || 0);
  if (len > LIMITS.bodyMax) throw new HttpError('too_big', 413);
  const txt = await req.text();
  if (txt.length > LIMITS.bodyMax) throw new HttpError('too_big', 413);
  try { return JSON.parse(txt || '{}'); } catch { throw new HttpError('bad_json', 400); }
}
class HttpError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

function cleanText(s, max) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, max);
}

function parsePrice(p) {
  const m = /(\d+)(?:[.,](\d{1,2}))?/.exec(String(p || ''));
  if (!m) return null;
  const cents = +m[1] * 100 + (m[2] ? +(m[2] + '0').slice(0, 2) : 0);
  return cents > 0 ? cents : null;
}

// ---------------------------------------------------------------- cơ sở dữ liệu
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE, code TEXT NOT NULL UNIQUE,
      day TEXT NOT NULL, no INTEGER NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL,
      items TEXT NOT NULL, total_cents INTEGER NOT NULL, name TEXT, note TEXT, lang TEXT, service TEXT, src TEXT,
      device TEXT NOT NULL, iph TEXT NOT NULL, confirmed_at INTEGER, done_at INTEGER)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS ix_orders_dev ON orders(device, created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS ix_orders_ip ON orders(iph, created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS ix_orders_st ON orders(status, created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS ix_orders_ts ON orders(created_at)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS blocks (key TEXT PRIMARY KEY, until INTEGER NOT NULL, reason TEXT, created_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, key TEXT NOT NULL, ts INTEGER NOT NULL)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS ix_events ON events(kind, key, ts)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)'),
  ]);
  const S = statsDb(env);
  await S.batch([
    S.prepare(`CREATE TABLE IF NOT EXISTS orders_archive (
      uid TEXT PRIMARY KEY, day TEXT NOT NULL, hm TEXT NOT NULL, weekday INTEGER NOT NULL, no INTEGER,
      status TEXT NOT NULL, n_items INTEGER NOT NULL, total_cents INTEGER NOT NULL, lang TEXT, service TEXT, src TEXT,
      confirm_secs INTEGER, done_secs INTEGER)`),
    S.prepare(`CREATE TABLE IF NOT EXISTS lines_archive (
      uid TEXT NOT NULL, line INTEGER NOT NULL, item_id TEXT NOT NULL, qty INTEGER NOT NULL,
      unit_cents INTEGER NOT NULL, PRIMARY KEY (uid, line))`),
  ]);
  // cơ sở tạo từ phiên bản trước: thêm cột còn thiếu (bỏ qua lỗi nếu đã có)
  for (const [db, sql] of [[env.DB, 'ALTER TABLE orders ADD COLUMN service TEXT'], [env.DB, 'ALTER TABLE orders ADD COLUMN src TEXT'],
    [S, 'ALTER TABLE orders_archive ADD COLUMN service TEXT'], [S, 'ALTER TABLE orders_archive ADD COLUMN src TEXT']]) {
    try { await db.prepare(sql).run(); } catch { /* đã có */ }
  }
  schemaReady = true;
}
const statsDb = (env) => env.STATS || env.DB;

let settingsInit = false;
async function settings(env) {
  if (!settingsInit) {
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO settings(k, v) VALUES ('token', ?)").bind(randomToken()),
      env.DB.prepare("INSERT OR IGNORE INTO settings(k, v) VALUES ('mode', 'auto')"),
      env.DB.prepare("INSERT OR IGNORE INTO settings(k, v) VALUES ('sess_ver', '1')"),
      env.DB.prepare("INSERT OR IGNORE INTO settings(k, v) VALUES ('rev', '1')"),
    ]);
    settingsInit = true;
  }
  const { results } = await env.DB.prepare("SELECT k, v FROM settings WHERE k IN ('token','mode','sess_ver','rev')").all();
  const s = {};
  results.forEach((r) => { s[r.k] = r.v; });
  return s;
}
// mỗi khi đơn/khóa/cài đặt thay đổi → tăng "rev" để trang của tiệm biết cần tải lại
const bumpRev = (env) => env.DB.prepare("UPDATE settings SET v = CAST(v AS INTEGER) + 1 WHERE k = 'rev'");
async function setSetting(env, k, v) {
  await env.DB.batch([
    env.DB.prepare('INSERT INTO settings(k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, String(v)),
    bumpRev(env),
  ]);
}

async function blockedUntil(env, key) {
  const r = await env.DB.prepare('SELECT until FROM blocks WHERE key = ? AND until > ?').bind(key, now()).first();
  return r ? r.until : 0;
}
async function block(env, key, reason) {
  const until = now() + LIMITS.blockSecs;
  await env.DB.prepare(`INSERT INTO blocks(key, until, reason, created_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET until = excluded.until, reason = excluded.reason, created_at = excluded.created_at`)
    .bind(key, until, reason, now()).run();
  await bumpRev(env).run();
  return until;
}
async function countEvents(env, kind, key, windowSecs) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM events WHERE kind = ? AND key = ? AND ts > ?')
    .bind(kind, key, now() - windowSecs).first();
  return r ? r.n : 0;
}
async function addEvent(env, kind, key) {
  await env.DB.prepare('INSERT INTO events(kind, key, ts) VALUES (?, ?, ?)').bind(kind, key, now()).run();
}

// ---------------------------------------------------------------- thực đơn (assets/menu.js) và combo (assets/formules.js)
function parseAssigned(s, name, open = '[', close = ']') {
  const i = s.indexOf(name);
  return JSON.parse(s.slice(s.indexOf(open, i), s.lastIndexOf(close) + 1));
}
let menuCache = { at: 0, data: null };
async function loadMenu(env, req) {
  if (menuCache.data && Date.now() - menuCache.at < 60000) return menuCache.data;
  const get = async (path) => {
    const r = await env.ASSETS.fetch(new Request(new URL(path, req.url)));
    if (!r.ok) throw new Error(path + ' ' + r.status);
    return r.text();
  };
  const [ms, fs] = await Promise.all([get('/assets/menu.js'), get('/assets/formules.js').catch(() => '')]);
  const M = parseAssigned(ms, 'window.MENU');
  const map = new Map(); // món đặt được (có giá, không ẩn)
  const all = new Map(); // mọi món, kể cả món ẩn và combo (lấy tên, giá nước tự thêm)
  for (const c of M) {
    for (const it of c.items || []) {
      if (!it.id || all.has(it.id)) continue;
      const cents = parsePrice(it.price);
      const v = { id: it.id, cat: c.id, cents: cents || 0, fr: (it.fr || [])[0] || it.id, vi: (it.vi || [])[0] || '' };
      all.set(it.id, v);
      if (!c.hide && !it.hide && cents != null) map.set(it.id, v);
    }
  }
  let cfg = {};
  try { if (fs) cfg = parseAssigned(fs, 'window.FORMULES', '{', '}'); } catch (e) { console.error('formules.js', e); }
  menuCache = { at: Date.now(), data: { map, all, cfg } };
  return menuCache.data;
}

// ---------------------------------------------------------------- nhận diện
const ipOf = (req) => req.headers.get('CF-Connecting-IP') || '0.0.0.0';
const ipHash = (env, ip) => hmac(env.APP_SECRET, 'ip|' + ip).then((h) => h.slice(0, 22));

async function readDevice(req, env) {
  const v = cookies(req).xd || '';
  const [id, sig] = v.split('.');
  if (!id || !sig || id.length > 40) return null;
  return (await safeEq(sig, await hmac(env.APP_SECRET, 'dev|' + id))) ? id : null;
}

function orderState(s) {
  if (s.mode === 'paused') return { open: false, reason: 'paused' };
  if (s.mode === 'open') return { open: true };
  return withinHours(now()) ? { open: true } : { open: false, reason: 'closed' };
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token || String(token).length > 2048) return false;
  const fd = new FormData();
  fd.append('secret', env.TURNSTILE_SECRET);
  fd.append('response', token);
  fd.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: fd });
    const d = await r.json();
    return !!d.success;
  } catch { return false; }
}

// ---------------------------------------------------------------- API khách
async function apiSession(req, env, url) {
  const s = await settings(env);
  const t = (url.searchParams.get('t') || '').slice(0, 40);
  if (!t || !(await safeEq(t, s.token))) return fail('token', 403);
  const iph = await ipHash(env, ipOf(req));
  const headers = {};
  let until = await blockedUntil(env, 'ip:' + iph);
  let dev = await readDevice(req, env);
  if (!until && !dev) {
    if ((await countEvents(env, 'dev', iph, 600)) >= LIMITS.ipDevices) {
      until = await block(env, 'ip:' + iph, 'devices');
    } else {
      dev = randomId(12);
      await addEvent(env, 'dev', iph);
      headers['Set-Cookie'] = cookie('xd', dev + '.' + (await hmac(env.APP_SECRET, 'dev|' + dev)), { maxAge: 30 * 86400, path: '/api' });
    }
  }
  if (!until && dev) until = await blockedUntil(env, 'dev:' + dev);
  const st = orderState(s);
  return json({
    ok: true,
    open: st.open && !until,
    reason: until ? 'blocked' : st.reason || null,
    until: until || null,
    sitekey: env.TURNSTILE_SITEKEY || null,
  }, 200, headers);
}

// Kiểm tra nội dung đơn và tính tiền (dùng cho cả đơn khách và đơn nhân viên nhập)
async function buildOrder(env, req, body, defLang = 'fr') {
  const { map: menu, all, cfg } = await loadMenu(env, req);
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > LIMITS.maxLines) return { err: 'items' };
  const items = [];
  const seen = new Set();
  let count = 0;
  for (const x of body.items) {
    const id = String((x && x.id) || '').slice(0, 80);
    const qty = Number(x && x.qty);
    const m = menu.get(id);
    if (!m || seen.has(id) || !Number.isInteger(qty) || qty < 1 || qty > LIMITS.maxQty) return { err: 'items' };
    seen.add(id);
    items.push({ id, qty, cents: m.cents, cat: m.cat });
    count += qty;
  }
  if (count > LIMITS.maxItems) return { err: 'items' };
  const service = SERVICES.includes(body.service) ? body.service : null;
  if (!service) return { err: 'service' };
  // nhóm món và combo: cùng phép tính với trang khách (assets/formule-calc.js)
  const decline = body.decline && typeof body.decline === 'object' ? body.decline : {};
  const ad = all.get(cfg.auto_drink);
  const calc = CALC.compute(cfg, items, decline, ad ? { id: ad.id, cents: ad.cents, cat: ad.cat } : null);
  const lines = calc.lines.filter((l) => l.qty > 0).map((l) => {
    const it = all.get(l.id) || { fr: l.id, vi: '' };
    const f = l.fid ? all.get(l.fid) : null;
    return { id: l.id, qty: l.qty, cents: l.cents, base: l.base, g: l.group, fr: it.fr, vi: it.vi,
      ...(l.fid ? { fid: l.fid, ffr: f ? f.fr : l.fid, fvi: f ? f.vi : '', auto: l.auto ? 1 : 0 } : {}) };
  });
  // tên/số bàn và ghi chú: bắt buộc
  const name = cleanText(body.name, LIMITS.nameLen);
  const note = cleanText(body.note, LIMITS.noteLen);
  if (!name) return { err: 'name' };
  if (!note) return { err: 'note' };
  return {
    lines, total: calc.total, service, name, note,
    lang: LANGS.includes(body.lang) ? body.lang : defLang,
  };
}

async function insertOrder(env, o, { dev, iph, status, src }) {
  const t0 = now();
  const day = parisParts(t0).day;
  const seq = await env.DB.prepare(`INSERT INTO settings(k, v) VALUES (?, '1')
    ON CONFLICT(k) DO UPDATE SET v = CAST(v AS INTEGER) + 1 RETURNING v`).bind('seq:' + day).first();
  const no = +seq.v;
  const code = randomId(18);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO orders(uid, code, day, no, created_at, status, items, total_cents, name, note, lang, service, src, device, iph, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(randomId(12), code, day, no, t0, status, JSON.stringify(o.lines), o.total, o.name || null, o.note || null,
        o.lang, o.service, src, dev, iph, status === 'confirmed' ? t0 : null),
    bumpRev(env),
  ]);
  return { no, code };
}

async function apiOrder(req, env) {
  const body = await readJson(req);
  const s = await settings(env);
  if (!body.t || !(await safeEq(String(body.t).slice(0, 40), s.token))) return fail('token', 403);
  const dev = await readDevice(req, env);
  if (!dev) return fail('device', 403);
  const ip = ipOf(req);
  const iph = await ipHash(env, ip);

  const until = (await blockedUntil(env, 'ip:' + iph)) || (await blockedUntil(env, 'dev:' + dev));
  if (until) return fail('blocked', 429, { until });
  const st = orderState(s);
  if (!st.open) return fail(st.reason, 409);

  const o = await buildOrder(env, req, body);
  if (o.err) return fail(o.err);
  if (!(await verifyTurnstile(env, body.ts, ip))) return fail('robot', 403);

  // --- giới hạn tần suất (đếm chính xác trong D1)
  const t0 = now();
  const [d, i, p] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE device = ? AND created_at > ?').bind(dev, t0 - LIMITS.devWindow),
    env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE iph = ? AND created_at > ?').bind(iph, t0 - LIMITS.ipWindow),
    env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'new' AND created_at > ?").bind(t0 - LIMITS.expireNew),
  ]);
  if (d.results[0].n >= LIMITS.devOrders) return fail('blocked', 429, { until: await block(env, 'dev:' + dev, 'rate') });
  if (i.results[0].n >= LIMITS.ipOrders) return fail('blocked', 429, { until: await block(env, 'ip:' + iph, 'rate') });
  if (p.results[0].n >= LIMITS.maxPending) return fail('busy', 503);

  const { no, code } = await insertOrder(env, o, { dev, iph, status: 'new', src: 'qr' });
  return json({ ok: true, no, code, total: o.total });
}

// Đơn do nhân viên nhập tại quầy: không cần mã QR, không giới hạn tần suất, không theo giờ mở cửa; xác nhận luôn
async function apiStaffNewOrder(req, env) {
  const body = await readJson(req);
  const o = await buildOrder(env, req, body, 'vi');
  if (o.err) return fail(o.err);
  const { no } = await insertOrder(env, o, { dev: 'staff', iph: 'staff', status: 'confirmed', src: 'staff' });
  return json({ ok: true, no, total: o.total });
}

async function apiStatus(env, url) {
  const c = (url.searchParams.get('c') || '').slice(0, 40);
  if (!c) return fail('code');
  const r = await env.DB.prepare('SELECT no, status, total_cents, created_at FROM orders WHERE code = ?').bind(c).first();
  if (!r) return fail('gone', 404);
  let status = r.status;
  if (status === 'new' && r.created_at < now() - LIMITS.expireNew) status = 'expired';
  return json({ ok: true, no: r.no, status, total: r.total_cents });
}

// ---------------------------------------------------------------- API tiệm
async function staffAuth(req, env) {
  const v = cookies(req).xs || '';
  const [payload, sig] = v.split('.');
  if (!payload || !sig || payload.length > 200) return false;
  if (!(await safeEq(sig, await hmac(env.APP_SECRET, 'staff|' + payload)))) return false;
  let p;
  try { p = JSON.parse(b64urlDecode(payload)); } catch { return false; }
  if (!p || p.exp < now()) return false;
  const s = await settings(env);
  return String(p.v) === String(s.sess_ver);
}

async function loginGuard(env, req) {
  const iph = await ipHash(env, ipOf(req));
  const until = (await blockedUntil(env, 'login:' + iph)) || (await blockedUntil(env, 'login:all'));
  return { iph, until };
}
async function loginFailed(env, iph) {
  await env.DB.batch([
    env.DB.prepare('INSERT INTO events(kind, key, ts) VALUES (?, ?, ?)').bind('loginfail', iph, now()),
    env.DB.prepare('INSERT INTO events(kind, key, ts) VALUES (?, ?, ?)').bind('loginfail', 'all', now()),
  ]);
  // tấn công dò mật khẩu từ nhiều IP cùng lúc → khóa đăng nhập toàn bộ (máy đã đăng nhập vẫn chạy bình thường)
  if ((await countEvents(env, 'loginfail', 'all', LIMITS.loginWindow)) >= LIMITS.loginFailsAll) {
    return block(env, 'login:all', 'login');
  }
  if ((await countEvents(env, 'loginfail', iph, LIMITS.loginWindow)) >= LIMITS.loginFails) {
    return block(env, 'login:' + iph, 'login');
  }
  return 0;
}

async function apiLogin(req, env) {
  if (!env.STAFF_PASSWORD || env.STAFF_PASSWORD.length < 10) return fail('not_configured', 503);
  const { iph, until } = await loginGuard(env, req);
  if (until) return fail('blocked', 429, { until });
  const body = await readJson(req);
  if (!(await safeEq(String(body.password || '').slice(0, 200), env.STAFF_PASSWORD))) {
    const u = await loginFailed(env, iph);
    return fail(u ? 'blocked' : 'password', u ? 429 : 401, u ? { until: u } : {});
  }
  const s = await settings(env);
  const payload = b64url(enc.encode(JSON.stringify({ v: s.sess_ver, exp: now() + LIMITS.staffSession })));
  const sig = await hmac(env.APP_SECRET, 'staff|' + payload);
  return json({ ok: true }, 200, {
    'Set-Cookie': cookie('xs', payload + '.' + sig, { maxAge: LIMITS.staffSession, path: '/api', sameSite: 'Strict' }),
  });
}

let lastHousekeeping = 0;
async function housekeeping(env) {
  if (now() - lastHousekeeping < 60) return;
  lastHousekeeping = now();
  const r = await env.DB.prepare("UPDATE orders SET status = 'expired' WHERE status = 'new' AND created_at < ?")
    .bind(now() - LIMITS.expireNew).run();
  if (r.meta && r.meta.changes) await bumpRev(env).run();
}

async function apiStaffState(env, url) {
  await housekeeping(env);
  const s = await settings(env);
  if (url.searchParams.get('rev') === s.rev) return json({ ok: true, same: true, rev: s.rev, now: now() });
  const since = now() - LIMITS.keepSecs;
  const [o, b] = await env.DB.batch([
    env.DB.prepare(`SELECT id, day, no, created_at, status, items, total_cents, name, note, lang, service, src, confirmed_at, done_at
      FROM orders WHERE created_at > ? ORDER BY id DESC LIMIT 300`).bind(since),
    env.DB.prepare('SELECT key, until, reason FROM blocks WHERE until > ? ORDER BY until DESC LIMIT 100').bind(now()),
  ]);
  const st = orderState(s);
  return json({
    ok: true,
    rev: s.rev,
    now: now(),
    mode: s.mode,
    open: st.open,
    reason: st.reason || null,
    token: s.token,
    orderUrl: `${url.origin}/menu.html?t=${s.token}`,
    orders: o.results.map((r) => ({ ...r, items: JSON.parse(r.items) })),
    blocks: b.results.map((r) => ({ key: r.key, kind: r.key.split(':')[0], until: r.until, reason: r.reason })),
  });
}

const STATUSES = ['new', 'confirmed', 'done', 'cancelled'];
async function apiStaffOrder(req, env) {
  const body = await readJson(req);
  const id = Number(body.id);
  if (!Number.isInteger(id) || !STATUSES.includes(body.status)) return fail('bad');
  const t = now();
  const sets = { new: 'confirmed_at = NULL, done_at = NULL', confirmed: 'confirmed_at = COALESCE(confirmed_at, ?2)', done: 'confirmed_at = COALESCE(confirmed_at, ?2), done_at = ?2', cancelled: 'done_at = ?2' };
  const sql = `UPDATE orders SET status = ?1, ${sets[body.status]} WHERE id = ?3`;
  const stmt = env.DB.prepare(sql);
  await env.DB.batch([body.status === 'new' ? stmt.bind(body.status, null, id) : stmt.bind(body.status, t, id), bumpRev(env)]);
  return json({ ok: true });
}

async function apiStaff(req, env, url, path) {
  if (path === '/api/staff/login' && req.method === 'POST') return apiLogin(req, env);
  if (!(await staffAuth(req, env))) return fail('auth', 401);
  if (path === '/api/staff/state' && req.method === 'GET') return apiStaffState(env, url);
  if (req.method !== 'POST') return fail('method', 405);
  if (path === '/api/staff/order') return apiStaffOrder(req, env);
  if (path === '/api/staff/orders') return apiStaffNewOrder(req, env);
  if (path === '/api/staff/mode') {
    const { mode } = await readJson(req);
    if (!['auto', 'open', 'paused'].includes(mode)) return fail('bad');
    await setSetting(env, 'mode', mode);
    return json({ ok: true });
  }
  if (path === '/api/staff/rotate') {
    await setSetting(env, 'token', randomToken());
    return json({ ok: true });
  }
  if (path === '/api/staff/unblock') {
    const { key } = await readJson(req);
    await env.DB.batch([env.DB.prepare('DELETE FROM blocks WHERE key = ?').bind(String(key || '').slice(0, 80)), bumpRev(env)]);
    return json({ ok: true });
  }
  if (path === '/api/staff/logout') {
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('xs', '', { maxAge: 0, path: '/api', sameSite: 'Strict' }) });
  }
  if (path === '/api/staff/logout-all') {
    const s = await settings(env);
    await setSetting(env, 'sess_ver', (+s.sess_ver || 1) + 1);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('xs', '', { maxAge: 0, path: '/api', sameSite: 'Strict' }) });
  }
  return fail('not_found', 404);
}

// ---------------------------------------------------------------- thống kê CSV
async function apiStats(req, env, url) {
  if (!env.STATS_KEY || env.STATS_KEY.length < 16) return fail('not_found', 404);
  const { iph, until } = await loginGuard(env, req);
  if (until) return fail('blocked', 429, { until });
  if (!(await safeEq((url.searchParams.get('key') || '').slice(0, 200), env.STATS_KEY))) {
    await loginFailed(env, iph);
    return fail('auth', 401);
  }
  const what = url.searchParams.get('what') === 'orders' ? 'orders' : 'lines';
  const S = statsDb(env);
  const sql = what === 'orders'
    ? 'SELECT day, hm, weekday, no, status, service, src, n_items, total_cents, lang, confirm_secs, done_secs FROM orders_archive ORDER BY day, hm'
    : `SELECT o.day, o.hm, o.weekday, o.status, o.service, o.src, o.lang, l.item_id, l.qty, l.unit_cents
       FROM lines_archive l JOIN orders_archive o ON o.uid = l.uid ORDER BY o.day, o.hm`;
  const { results } = await S.prepare(sql).all();
  const cols = results.length ? Object.keys(results[0]) : [];
  const q = (v) => (v == null ? '' : /[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
  const csv = [cols.join(','), ...results.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n');
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="xiu-${what}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// ---------------------------------------------------------------- lưu trữ hằng đêm
async function archive(env) {
  const S = statsDb(env);
  const cut = now() - LIMITS.keepSecs;
  for (let round = 0; round < 40; round++) {
    const { results } = await env.DB.prepare(
      'SELECT uid, no, created_at, status, items, total_cents, lang, service, src, confirmed_at, done_at FROM orders WHERE created_at < ? ORDER BY id LIMIT 40',
    ).bind(cut).all();
    if (!results.length) break;
    const stmts = [];
    for (const r of results) {
      const p = parisParts(r.created_at);
      let items = [];
      try { items = JSON.parse(r.items); } catch { /* bỏ qua */ }
      const status = r.status === 'new' ? 'expired' : r.status;
      stmts.push(S.prepare(`INSERT OR IGNORE INTO orders_archive(uid, day, hm, weekday, no, status, service, src, n_items, total_cents, lang, confirm_secs, done_secs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        r.uid, p.day, p.hm, p.dow, r.no, status, r.service || null, r.src || null, items.reduce((a, x) => a + (x.qty || 0), 0), r.total_cents, r.lang,
        r.confirmed_at ? r.confirmed_at - r.created_at : null, r.done_at ? r.done_at - r.created_at : null));
      items.forEach((x, k) => stmts.push(S.prepare(
        'INSERT OR IGNORE INTO lines_archive(uid, line, item_id, qty, unit_cents) VALUES (?, ?, ?, ?, ?)',
      ).bind(r.uid, k, String(x.id), x.qty | 0, x.cents | 0)));
    }
    await S.batch(stmts);
    // chỉ xóa những đơn đã có mặt trong kho thống kê
    const uids = results.map((r) => r.uid);
    const ph = uids.map(() => '?').join(',');
    const { results: got } = await S.prepare(`SELECT uid FROM orders_archive WHERE uid IN (${ph})`).bind(...uids).all();
    const ok = got.map((g) => g.uid);
    if (ok.length !== uids.length) console.error('archive: thiếu', uids.length - ok.length, 'đơn trong kho thống kê');
    if (!ok.length) break;
    await env.DB.prepare(`DELETE FROM orders WHERE uid IN (${ok.map(() => '?').join(',')})`).bind(...ok).run();
    if (ok.length !== uids.length) break;
  }
  const today = parisParts(now()).day;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM events WHERE ts < ?').bind(cut),
    env.DB.prepare('DELETE FROM blocks WHERE until < ?').bind(now()),
    env.DB.prepare("DELETE FROM settings WHERE k LIKE 'seq:%' AND k < ?").bind('seq:' + today),
    bumpRev(env),
  ]);
}

// ---------------------------------------------------------------- định tuyến
async function route(req, env, url) {
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'POST') {
    // chống CSRF: chỉ nhận JSON từ chính trang này, có tiêu đề riêng
    const origin = req.headers.get('Origin');
    let originHost = null;
    try { originHost = origin ? new URL(origin).host : null; } catch { originHost = 'invalid'; }
    if ((origin && originHost !== url.host) || req.headers.get('X-Xiu') !== '1' ||
        !(req.headers.get('Content-Type') || '').startsWith('application/json')) return fail('forbidden', 403);
  }
  if (path === '/api/session' && req.method === 'GET') return apiSession(req, env, url);
  if (path === '/api/orders' && req.method === 'POST') return apiOrder(req, env);
  if (path === '/api/orders/status' && req.method === 'GET') return apiStatus(env, url);
  if (path.startsWith('/api/staff/')) return apiStaff(req, env, url, path);
  if (path === '/api/stats.csv' && req.method === 'GET') return apiStats(req, env, url);
  return fail('not_found', 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) {
      // địa chỉ ngắn: / → index.html, /quan-ly → quan-ly.html, /menu → menu.html
      const alias = url.pathname === '/' ? '/index.html'
        : /^\/[a-z-]+$/.test(url.pathname) ? url.pathname + '.html' : null;
      if (alias && (req.method === 'GET' || req.method === 'HEAD')) {
        const r = await env.ASSETS.fetch(new Request(new URL(alias + url.search, url), req));
        if (r.status !== 404) return r;
      }
      return env.ASSETS.fetch(req);
    }
    if (!env.APP_SECRET || env.APP_SECRET.length < 32) return fail('not_configured', 503);
    INSECURE_DEV = env.DEV_HTTP === '1' && url.protocol === 'http:';
    try {
      await ensureSchema(env);
      return await route(req, env, url);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.code, e.status);
      console.error(e && e.stack || e);
      return fail('server', 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ensureSchema(env).then(() => archive(env)));
  },
};
