// SCENE_LOOK check (reference/style/SCENE_LOOK.md "How to check it"): the style target on the left, the map's default hero
// view at phone portrait 390×844 and at 1280×800 → reference/style/compare/scene_v<N>.png.
// Usage: node scripts/scene-compare.mjs <pass> [--base=http://localhost:5173] [--view=cx,cy,level,rot]
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const [pass = '0', ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));
const base = opt.base ?? 'http://localhost:5173', q = opt.view ? `?view=${opt.view}` : '';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const shot = async (w, h, mobile) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage(); await page.addInitScript(() => { try { sessionStorage.clear(); } catch { /* */ } });
    await page.goto(`${base}/campus${q}`); await page.waitForTimeout(14000);
    const b = await page.screenshot({ type: 'png' }); await ctx.close(); return b;
  };
  const phone = await shot(390, 844, true), desk = await shot(1280, 800, false);
  const H = 844, tgt = await sharp('reference/style/tycoon_style_target.png').resize({ height: H }).png().toBuffer(), tw = (await sharp(tgt).metadata()).width;
  const desk2 = await sharp(desk).resize({ height: H }).png().toBuffer(), dw = (await sharp(desk2).metadata()).width;
  const lab = (t, w) => Buffer.from(`<svg width="${w}" height="28"><rect width="100%" height="100%" fill="#101418"/><text x="8" y="19" font-family="Arial" font-size="15" font-weight="700" fill="#FFD23F">${t}</text></svg>`);
  const W = tw + 390 + dw + 40, out = `reference/style/compare/scene_v${pass}.png`;
  await sharp({ create: { width: W, height: H + 38, channels: 3, background: '#101418' } }).composite([
    { input: lab('TARGET (style only)', tw), left: 10, top: 0 }, { input: tgt, left: 10, top: 30 },
    { input: lab(`MAP pass ${pass} · 390×844`, 390), left: tw + 20, top: 0 }, { input: phone, left: tw + 20, top: 30 },
    { input: lab(`MAP pass ${pass} · 1280×800`, dw), left: tw + 400, top: 0 }, { input: desk2, left: tw + 400, top: 30 },
  ]).png().toFile(out);
  console.log(out);
} finally { await browser.close(); }
