// Phase 3B proof screenshots (headless Edge): directions mid-route and on arrival with the GPS simulator, the list view,
// and the ON AIR / event / room-change signs at a set time. → reference/style/compare/p3b_*.png
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:5173', NOW = '2026-11-27T11:40';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${base}/campus?simgps=1&now=${NOW}&route=session:s3&view=150,-190,4,0`); await page.waitForTimeout(12000);
  await page.evaluate(() => (window).__engine.opts.onSelect({ at: [233, -318] })); await page.waitForTimeout(2500);
  await page.screenshot({ path: 'reference/style/compare/p3b_1_route_from_gate.png' });
  await page.evaluate(() => [...document.querySelectorAll('.sim button')].find(b => b.textContent.includes('walk')).click());
  await page.waitForTimeout(9000); await page.screenshot({ path: 'reference/style/compare/p3b_2_walking.png' });
  await page.waitForFunction(() => document.querySelector('.nav.arrived'), null, { timeout: 90000 }); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'reference/style/compare/p3b_3_arrived.png' });
  const p2 = await ctx.newPage(); await p2.goto(`${base}/campus?now=${NOW}&list=1`); await p2.waitForTimeout(6000);
  await p2.screenshot({ path: 'reference/style/compare/p3b_4_list.png' });
  console.log(await page.evaluate(() => document.querySelector('.nav')?.innerText));
} finally { await browser.close(); }
