// Turns a raw Gemini image into a crisp map sprite:
//  1. flood-fill the plain light background from the image border -> transparent
//  2. trim to content, downscale with a box filter to the target width
//  3. snap every pixel to the shared map palette, hard alpha (no anti-aliasing)
// Usage: node scripts/process-sprite.mjs <in.png> <out.png> [targetWidth=240]
import sharp from 'sharp';

const PALETTE = [
  '#0F4D32', '#16382A', '#1E5B3A', '#2E6E43', '#3E8A4E', '#57A05C', '#7DBB6A', '#A8D08A',
  '#F4F2EA', '#F1EBDC', '#E4DAC4', '#CDBF9F', '#EDCDA6', '#D9A97C', '#A8784E', '#7A5536', '#4E3626',
  '#4B525A', '#5E6872', '#77808A', '#9AA3AB', '#C3C9CD', '#2A2F35',
  '#2C7DA0', '#3E95B8', '#6CB8D2', '#A6DCEA', '#1F5F78', '#2F8A8A', '#5FB7B0',
  '#B5463A', '#D3705A', '#E2B05A', '#FFD23F', '#FF8A3D', '#FFFFFF', '#101418',
].map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));

const nearest = (r, g, b) => {
  let best = 0, bd = Infinity;
  for (let i = 0; i < PALETTE.length; i++) {
    const [pr, pg, pb] = PALETTE[i];
    const d = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return PALETTE[best];
};

export async function processSprite(input, output, targetW = 240) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  // 1. background flood fill (light, low-saturation pixels connected to the border)
  const isBg = (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return r > 225 && g > 225 && b > 225 && Math.max(r, g, b) - Math.min(r, g, b) < 18; };
  const seen = new Uint8Array(W * H); const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop(); if (seen[p]) continue; if (!isBg(p * 4)) continue;
    seen[p] = 1; data[p * 4 + 3] = 0;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
  }
  // 2. trim + box-downscale
  const trimmed = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const t = await sharp(trimmed).trim({ threshold: 1 }).toBuffer();
  const meta = await sharp(t).metadata();
  const w = Math.min(targetW, meta.width), h = Math.round(meta.height * (w / meta.width));
  const small = await sharp(t).resize(w, h, { kernel: 'cubic' }).raw().toBuffer();
  // 3. palette snap + hard alpha
  for (let i = 0; i < small.length; i += 4) {
    if (small[i + 3] < 140) { small[i] = small[i + 1] = small[i + 2] = small[i + 3] = 0; continue; }
    const [r, g, b] = nearest(small[i], small[i + 1], small[i + 2]); small[i] = r; small[i + 1] = g; small[i + 2] = b; small[i + 3] = 255;
  }
  await sharp(small, { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, colours: 64, dither: 0 }).toFile(output);
  return { w, h };
}

if (process.argv[1]?.endsWith('process-sprite.mjs')) {
  const [, , input, output, tw] = process.argv;
  processSprite(input, output, tw ? Number(tw) : 240).then(r => console.log(output, r.w + 'x' + r.h));
}
