// Frames of the sky entrance for review: node scripts/intro-frames.mjs <out.png> [--base=http://localhost:5173] [--w=1280 --h=800]
import { chromium } from 'playwright-core';
import sharp from 'sharp';
const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const out = args.find(a => !a.startsWith('--')) ?? 'intro_frames.png', base = opt.base ?? 'http://localhost:5173', W = +(opt.w ?? 1280), H = +(opt.h ?? 800);
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`${base}/campus?intro=1`);
  await page.waitForFunction(() => !!document.querySelector('.sky-intro.dropping'), null, { timeout: 90000 });
  const t0 = Date.now(), shots = [];
  for (const at of [0, 700, 1400, 2100, 2800, 3600, 4600, 6500]) { const w = at - (Date.now() - t0); if (w > 0) await page.waitForTimeout(w); shots.push({ at: Date.now() - t0, img: await page.screenshot({ type: 'png' }) }); }
  const tw = 480, th = Math.round(tw * H / W), comp = [];
  for (const [i, s] of shots.entries()) {
    comp.push({ input: await sharp(s.img).resize(tw, th).png().toBuffer(), left: (i % 4) * tw, top: Math.floor(i / 4) * (th + 22) + 22 });
    comp.push({ input: Buffer.from(`<svg width="${tw}" height="22"><text x="6" y="16" font-family="Arial" font-size="14" fill="#ffd23f">${(s.at / 1000).toFixed(1)} s</text></svg>`), left: (i % 4) * tw, top: Math.floor(i / 4) * (th + 22) });
  }
  await sharp({ create: { width: tw * 4, height: (th + 22) * 2, channels: 3, background: '#101418' } }).composite(comp).png().toFile(out);
  console.log(out);
} finally { await browser.close(); }
