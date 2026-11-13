import sharp from 'sharp';
const [out, ...pairs] = process.argv.slice(2); const h = 900;
const pane = async (f, label) => { const img = await sharp(f).resize({ height: h - 40 }).toBuffer(); const m = await sharp(img).metadata();
  const lab = Buffer.from(`<svg width="${m.width}" height="40"><rect width="100%" height="100%" fill="#111"/><text x="10" y="27" font-family="Arial" font-size="20" fill="#fff">${label.replace(/&/g, '&amp;')}</text></svg>`);
  return sharp({ create: { width: Math.max(m.width, 10), height: h, channels: 3, background: '#111' } }).composite([{ input: lab, top: 0, left: 0 }, { input: img, top: 40, left: 0 }]).png().toBuffer(); };
const ps = []; for (let i = 0; i < pairs.length; i += 2) ps.push(await pane(pairs[i], pairs[i + 1]));
const ws = await Promise.all(ps.map(async p => (await sharp(p).metadata()).width)); let x = 0;
const comp = ps.map((p, i) => { const r = { input: p, top: 0, left: x }; x += ws[i] + 8; return r; });
await sharp({ create: { width: x - 8, height: h, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 85 }).toFile(out);
