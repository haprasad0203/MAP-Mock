// A zoomed crop of an image with a metre grid on it, for measuring widths by eye (road, pavement, walkway) on the
// satellite screenshots. Measuring only: nothing is traced (REAL_CAMPUS_MODELS.md section 6).
// Usage: node scripts/grid-crop.mjs <image> <pxPerM> <cx> <cy> <sizeM> <gridM> <out.png> [zoom=5]
import sharp from 'sharp';

const [file, ppm, cx, cy, sizeM, gridM, out, zoom = '5'] = process.argv.slice(2);
const s = +ppm, Z = +zoom, w = Math.round(+sizeM * s), l = Math.max(0, Math.round(+cx - w / 2)), t = Math.max(0, Math.round(+cy - w / 2)), g = +gridM * s;
let svg = '';
for (let k = 0; k * g <= w; k++) {
  const p = k * g * Z, o = k % 5 ? 0.3 : 0.8;
  svg += `<line x1="${p}" y1="0" x2="${p}" y2="${w * Z}" stroke="#ff0" stroke-opacity="${o}"/><line x1="0" y1="${p}" x2="${w * Z}" y2="${p}" stroke="#ff0" stroke-opacity="${o}"/>`;
}
svg += `<text x="6" y="22" font-family="Arial" font-size="18" fill="#ff0" stroke="#000" stroke-width="0.6">grid ${gridM} m (bold every ${5 * +gridM} m)</text>`;
const img = await sharp(file).extract({ left: l, top: t, width: w, height: w }).resize(w * Z, w * Z, { kernel: 'nearest' }).png().toBuffer();
await sharp(img).composite([{ input: Buffer.from(`<svg width="${w * Z}" height="${w * Z}">${svg}</svg>`) }]).toFile(out);
console.log(out);
