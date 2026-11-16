// Makes the self-signed HTTPS certificate for `npm run dev:phone` (phone testing on the local network), valid for every
// current IPv4 address of this PC plus localhost, for 30 days. Run it again when the PC's address changes (a new Wi-Fi or
// a phone hotspot), then restart dev:phone. Writes .cache/cert/key.pem and cert.pem (git-ignored). Needs openssl (Git Bash has it).
// Usage: node scripts/phone-cert.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';

const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')).map(i => i.address);
fs.mkdirSync('.cache/cert', { recursive: true });
const san = ['DNS:localhost', 'IP:127.0.0.1', ...ips.map(ip => `IP:${ip}`)].join(',');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-keyout', '.cache/cert/key.pem', '-out', '.cache/cert/cert.pem',
  '-subj', '/CN=WMC campus map local test', '-addext', `subjectAltName=${san}`], { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
console.log(`Certificate for: localhost, ${ips.join(', ')}\nOn the phone open: ${ips.map(ip => `https://${ip}:5174/campus`).join('  or  ')}`);
