// =====================================================================
// Chạy thử bằng điện thoại (Chay-thu-dien-thoai.bat):
//   1) máy chủ thử trên máy (wrangler dev, cổng 8787)
//   2) đường hầm HTTPS tạm thời của Cloudflare (*.trycloudflare.com), không cần tài khoản
// Điện thoại mở được qua Wi-Fi hay 4G, không phụ thuộc tường lửa hay cấu hình mạng.
// Địa chỉ tạm đổi mỗi lần chạy; tắt cửa sổ là đường hầm đóng.
// =====================================================================
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const toolDir = join(root, '.tools');
const exe = join(toolDir, isWin ? 'cloudflared.exe' : 'cloudflared');
const children = [];

function quit(code = 0) {
  for (const c of children) { try { isWin ? spawn('taskkill', ['/pid', String(c.pid), '/T', '/F']) : c.kill(); } catch {} }
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => quit(0));

async function getCloudflared() {
  if (existsSync(exe)) return exe;
  const arch = process.arch === 'arm64' && !isWin ? 'arm64' : 'amd64';
  const file = isWin ? `cloudflared-windows-${arch}.exe` : process.platform === 'darwin' ? `cloudflared-darwin-${arch}.tgz` : `cloudflared-linux-${arch}`;
  if (file.endsWith('.tgz')) throw new Error('Trên macOS: cài cloudflared bằng « brew install cloudflared » rồi chạy lại.');
  console.log('Đang tải cloudflared (chỉ lần đầu, khoảng 60 MB)…');
  const r = await fetch('https://github.com/cloudflare/cloudflared/releases/latest/download/' + file);
  if (!r.ok) throw new Error('Không tải được cloudflared: HTTP ' + r.status);
  mkdirSync(toolDir, { recursive: true });
  writeFileSync(exe, Buffer.from(await r.arrayBuffer()));
  if (!isWin) chmodSync(exe, 0o755);
  return exe;
}

async function waitLocal() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch('http://127.0.0.1:8787/'); if (r.status < 500) return true; } catch {}
    await new Promise((ok) => setTimeout(ok, 1000));
  }
  return false;
}

function openBrowser(url) {
  if (isWin) spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' });
}

const bin = await getCloudflared().catch((e) => { console.error(e.message); quit(1); });
if (!bin) await new Promise(() => {});

// 1) máy chủ thử
const wr = spawn(isWin ? 'npx.cmd' : 'npx', ['--yes', 'wrangler@4', 'dev', '--port', '8787', '--ip', '127.0.0.1'],
  { cwd: root, stdio: 'inherit', shell: isWin });
children.push(wr);
wr.on('exit', (c) => { console.log('Máy chủ thử đã dừng.'); quit(c || 0); });

if (!(await waitLocal())) { console.error('Máy chủ thử không khởi động được.'); quit(1); }

// 2) đường hầm HTTPS
const tn = spawn(bin, ['tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:8787'], { cwd: root });
children.push(tn);
let shown = false;
const scan = (buf) => {
  const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(buf.toString());
  if (m && !shown) {
    shown = true;
    const url = m[0];
    console.log('\n==========================================================');
    console.log('  Trang của tiệm (mở trên máy tính): ' + url + '/quan-ly');
    console.log('  Mật khẩu thử: xem dòng STAFF_PASSWORD trong tệp .dev.vars');
    console.log('  Vào Cài đặt → quét mã QR bằng điện thoại (Wi-Fi hay 4G đều được)');
    console.log('  Địa chỉ này chỉ dùng tạm, đổi mỗi lần chạy. Đóng cửa sổ để tắt.');
    console.log('==========================================================\n');
    // chờ vài giây cho địa chỉ tạm sẵn sàng rồi mới mở
    setTimeout(() => openBrowser(url + '/quan-ly'), 4000);
  }
};
tn.stdout.on('data', scan);
tn.stderr.on('data', scan);
tn.on('exit', (c) => { if (!shown) console.error('Không mở được đường hầm (mạng chặn trycloudflare.com?).'); });
