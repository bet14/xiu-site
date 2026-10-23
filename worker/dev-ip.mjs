// In ra địa chỉ IP của máy trong mạng Wi-Fi/LAN (dùng cho Chay-thu-dat-mon.bat)
import { networkInterfaces } from 'node:os';
const skip = /vethernet|virtual|vmware|vbox|wsl|docker|hyper-v|loopback|bluetooth|tailscale|zerotier/i;
const ips = [];
for (const [name, list] of Object.entries(networkInterfaces())) {
  if (skip.test(name)) continue;
  for (const a of list || []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) ips.push({ name, ip: a.address });
}
const rank = (x) => (/^192\.168\./.test(x.ip) ? 0 : /^10\./.test(x.ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(x.ip) ? 2 : 3) + (/wi-?fi|wlan|wireless/i.test(x.name) ? -0.5 : 0);
ips.sort((a, b) => rank(a) - rank(b));
console.log(ips.length ? ips[0].ip : 'localhost');
