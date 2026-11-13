// Pulls saturated orange/brick pixels toward pale cream plaster (#EFE3CC), keeping their light/shade.
// Used on the hostel renders where Gemini kept drawing orange balcony bays (photos: cream plaster).
//   node scripts/recolor-orange.mjs <in.png> <out.png>
import sharp from 'sharp';
const [inp, out] = process.argv.slice(2);
const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const cream = [0xEF, 0xE3, 0xCC]; const creamL = (cream[0] * 0.3 + cream[1] * 0.59 + cream[2] * 0.11) / 255;
for (let i = 0; i < data.length; i += 3) {
  const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 1e-6) continue;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360;
  const s = d / (mx + 1e-6);
  if (h < 8 || h > 42 || s < 0.38 || mx < 0.35) continue; // only saturated orange/brick, not stone (lower sat) or shadows
  const w = Math.min(1, (s - 0.38) / 0.2);                 // feather the edge of the selection
  const L = r * 0.3 + g * 0.59 + b * 0.11; const k = Math.min(1.25, (L / creamL) * 1.15);
  for (let c = 0; c < 3; c++) { const v = data[i + c] / 255, t = Math.min(1, cream[c] / 255 * k); data[i + c] = Math.round(255 * (v * (1 - w) + t * w)); }
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toFile(out);
console.log('wrote', out);
