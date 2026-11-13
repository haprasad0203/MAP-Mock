// Tycoon asset processing (sharp).
//   node scripts/process-asset.mjs render  <input.png> <output.webp> [size=512]
//     -> removes the plain white/grey background (flood fill from the border), trims, fits in size×size, WebP with alpha
//   node scripts/process-asset.mjs texture <input.png> <output.webp> [size=1024]
//     -> centre-crops to square, cross-fades the edges so it tiles, resizes to a power of two, WebP
import sharp from 'sharp';

const [mode, input, output, sizeArg] = process.argv.slice(2);
if (!mode || !input || !output) { console.error('usage: process-asset.mjs render|texture <in> <out> [size]'); process.exit(1); }

async function render(size = 512) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info; const N = W * H;
  // background = light, low-saturation pixels connected to the image border
  const isBg = (i) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx > 214 && (mx - mn) < 26;
  };
  const bg = new Uint8Array(N); const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(); if (bg[i] || !isBg(i)) continue; bg[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
  }
  // remove the small Gemini sparkle mark in the bottom-right corner
  const cw = Math.round(W * 0.07), ch = Math.round(H * 0.09);
  for (let y = H - ch; y < H; y++) for (let x = W - cw; x < W; x++) { const i = y * W + x; const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; if (Math.min(r, g, b) > 170 && Math.max(r, g, b) - Math.min(r, g, b) < 30) bg[i] = 1; }
  // 1-px soft edge: foreground pixels touching background get half alpha
  for (let i = 0; i < N; i++) {
    if (bg[i]) { data[i * 4 + 3] = 0; continue; }
    const x = i % W, y = (i / W) | 0;
    const edge = (x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (y > 0 && bg[i - W]) || (y < H - 1 && bg[i + W]);
    if (edge) data[i * 4 + 3] = 140;
  }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .trim({ threshold: 1 })
    .resize(size, size, { fit: 'inside', kernel: 'lanczos3' })
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile(output);
}

async function texture(size = 1024) {
  const img = sharp(input); const m = await img.metadata(); const s = Math.min(m.width, m.height);
  const sq = await img.extract({ left: ((m.width - s) / 2) | 0, top: ((m.height - s) / 2) | 0, width: s, height: s }).resize(size, size).removeAlpha().raw().toBuffer();
  // seam fix: blend each pixel with its half-offset copy near the edges so opposite edges match
  const out = Buffer.alloc(sq.length); const band = size * 0.12;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = Math.min(x, size - 1 - x), dy = Math.min(y, size - 1 - y); const d = Math.min(dx, dy);
    const w = d >= band ? 0 : 0.5 * (1 - d / band); // 0.5 at the very edge, 0 inside
    const ox = (x + size / 2) % size, oy = (y + size / 2) % size;
    for (let c = 0; c < 3; c++) out[(y * size + x) * 3 + c] = Math.round(sq[(y * size + x) * 3 + c] * (1 - w) + sq[(oy * size + ox) * 3 + c] * w);
  }
  await sharp(out, { raw: { width: size, height: size, channels: 3 } }).webp({ quality: 90 }).toFile(output);
}

if (mode === 'render') await render(+(sizeArg ?? 512));
else if (mode === 'texture') await texture(+(sizeArg ?? 1024));
else { console.error('mode must be render or texture'); process.exit(1); }
console.log('wrote', output);
