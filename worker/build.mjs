// Chép các tệp CÔNG KHAI của trang web vào dist/ để Cloudflare phục vụ.
// Chỉ những gì nằm trong danh sách dưới đây mới lên mạng: admin/, worker/,
// README, .bat, thư mục ghi chú… không bao giờ bị công khai.
import { cpSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const ROOT_FILES = /\.(html|txt|xml|ico|png|svg|webmanifest)$/i;
for (const f of readdirSync(root)) {
  if (ROOT_FILES.test(f) || f === '_headers' || f === '_redirects') cpSync(join(root, f), join(out, f));
}
if (existsSync(join(root, 'assets'))) cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });
console.log('dist/ sẵn sàng');
