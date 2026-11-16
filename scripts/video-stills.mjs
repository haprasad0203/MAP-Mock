// Study stills from a video (Phase 3M v2 source study): headless Edge plays the video, seeks to each time and draws the
// frame to a canvas; the JPEG comes back to Node. No video file is downloaded and no ffmpeg is needed.
// Usage:
//   node scripts/video-stills.mjs <youtubeId | path/to/video.mp4 | https://…mp4> <outDir> [--step=1] [--from=0] [--to=end] [--at=12.5,40,61]
// Writes <outDir>/<name>-<mm.ss.s>.jpg (name = the YouTube id or the file's base name).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [src, outDir] = args.filter(a => !a.startsWith('--'));
const isYT = /^[\w-]{11}$/.test(src), name = isYT ? src : path.basename(src).replace(/\.\w+$/, '');
fs.mkdirSync(outDir, { recursive: true });
const stamp = t => `${String(Math.floor(t / 60)).padStart(2, '0')}.${(t % 60).toFixed(1).padStart(4, '0')}`;

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  if (isYT) await page.goto(`https://www.youtube.com/watch?v=${src}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  else await page.goto(/^https?:/.test(src) ? src : pathToFileURL(path.resolve(src)).href, { timeout: 120000 }); // the browser's own video page: same origin, so the canvas stays readable
  await page.waitForFunction(() => { const v = document.querySelector('video'); return v && v.duration > 0 && v.readyState >= 1; }, null, { timeout: 60000 });
  const info = await page.evaluate(async () => {
    const v = document.querySelector('video'); v.muted = true;
    const p = document.getElementById('movie_player'); // YouTube: ask for the best quality, wait out a pre-roll ad
    if (p?.setPlaybackQualityRange) { p.setPlaybackQualityRange('hd2160'); p.setPlaybackQuality?.('hd2160'); }
    try { await v.play(); } catch { /* muted autoplay may still be refused */ }
    for (let i = 0; i < 60 && document.querySelector('.ad-showing'); i++) { await new Promise(r => setTimeout(r, 1000)); document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button-modern')?.click(); }
    await new Promise(r => setTimeout(r, 2500)); document.querySelector('video').pause();
    return { dur: p?.getDuration?.() || document.querySelector('video').duration, title: document.title };
  });
  // --retry: only the frames that are missing or empty in outDir
  const step = +(opt.step ?? 1), from = +(opt.from ?? step / 2), to = Math.min(+(opt.to ?? info.dur), info.dur - 0.05);
  let times = opt.at ? opt.at.split(',').map(Number) : Array.from({ length: Math.max(0, Math.floor((to - from) / step) + 1) }, (_, i) => +(from + i * step).toFixed(2));
  const fileOf = t => path.join(outDir, `${name}-${stamp(t)}.jpg`);
  if (opt.retry) times = times.filter(t => !fs.existsSync(fileOf(t)) || fs.statSync(fileOf(t)).size < 2000);
  let n = 0, w = 0, bad = 0;
  for (const t of times) {
    const r = await page.evaluate(async t => {
      // wait out a mid-roll ad: the <video> then plays the ad, not the film
      for (let i = 0; i < 90 && document.querySelector('.ad-showing'); i++) { await new Promise(res => setTimeout(res, 1000)); document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button-modern')?.click(); }
      const v = document.querySelector('video'); v.pause(); v.currentTime = t;
      await new Promise(res => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); setTimeout(done, 15000); });
      await new Promise(res => (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => res()) : setTimeout(res, 300)) && setTimeout(res, 1500));
      if (!v.videoWidth || document.querySelector('.ad-showing')) return { w: 0, data: '' };
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
      return { w: v.videoWidth, data: c.toDataURL('image/jpeg', 0.92) };
    }, t);
    const jpg = Buffer.from(r.data.split(',')[1] ?? '', 'base64');
    if (jpg.length < 2000) { bad++; continue; } // no frame (ad or not loaded): left for --retry
    fs.writeFileSync(fileOf(t), jpg); n++; w = r.w;
  }
  console.log(JSON.stringify({ name, title: info.title, duration: +info.dur.toFixed(1), frames: n, missed: bad, width: w, outDir }));
} finally { await browser.close(); }
