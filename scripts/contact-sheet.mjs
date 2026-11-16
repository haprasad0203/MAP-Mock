// A labelled thumbnail grid, for looking through many images at once (source study, Phase 3M v2).
// Usage: node scripts/contact-sheet.mjs <out.jpg> <cols> <thumbW> <file>... (or --list=<file with one path per line>)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2), list = args.find(a => a.startsWith('--list='));
const [out, cols, tw, ...rest] = args.filter(a => !a.startsWith('--'));
const files = (list ? fs.readFileSync(list.slice(7), 'utf8').split(/\r?\n/).filter(Boolean) : rest).filter(f => fs.statSync(f).size > 1000);
const C = +cols, W = +tw, H = Math.round(W * 0.62), LH = 22;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tiles = await Promise.all(files.map(async (f, i) => {
  const img = await sharp(f).resize(W, H, { fit: 'contain', background: '#222' }).toBuffer();
  const lab = Buffer.from(`<svg width="${W}" height="${LH}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="16" font-size="13" font-family="Arial" fill="#ff0">${i}: ${esc(path.basename(f).slice(0, 58))}</text></svg>`);
  return { img, lab, i };
}));
const comp = [];
for (const t of tiles) { const x = (t.i % C) * W, y = Math.floor(t.i / C) * (H + LH); comp.push({ input: t.lab, left: x, top: y }, { input: t.img, left: x, top: y + LH }); }
await sharp({ create: { width: C * W, height: Math.ceil(files.length / C) * (H + LH), channels: 3, background: '#111' } }).composite(comp).jpeg({ quality: 82 }).toFile(out);
console.log(out, files.length);
