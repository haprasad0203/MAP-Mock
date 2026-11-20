// Review screenshots of the map at exact sizes (headless Edge with the GPU).
// Usage: node scripts/shot.mjs <out.png> "<query>" [--base=http://localhost:5173] [--w=1280] [--h=800] [--wait=12000] [--clean]
//   query: e.g. "view=125,-110,7,0" or "cam=120,-110,-60,35,160,30"; --clean hides the UI (map only).
//   Several shots in one run: separate "out|query" pairs with ';;' in place of out and query: node scripts/shot.mjs --multi "a.png|view=…;;b.png|cam=…"
import { chromium } from 'playwright-core';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : 'true']; }));
const pos = args.filter(a => !a.startsWith('--'));
const jobs = opt.multi ? opt.multi.split(';;').map(s => s.split('|')) : [[pos[0], pos[1] ?? '']];
const base = opt.base ?? 'http://localhost:5173', W = +(opt.w ?? 1280), H = +(opt.h ?? 800), wait = +(opt.wait ?? 12000);
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  for (const [out, q] of jobs) {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.goto(`${base}/campus?${q}`);
    if (opt.clean) await page.addStyleTag({ content: '.app > *:not(canvas):not(.map-labels) { display: none !important; } nav, .tabbar, footer { display: none !important; }' });
    await page.waitForTimeout(wait);
    await page.screenshot({ path: out });
    await page.close();
    console.log(out);
  }
} finally { await browser.close(); }
