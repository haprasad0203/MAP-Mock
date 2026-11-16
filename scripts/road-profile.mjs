// Measure (not trace) a road's width on a satellite screenshot: sample the image across the road at a point and print
// a strip of the profile, so the asphalt, kerbs, pavement and covered walkway can be read off and converted to metres
// with the screenshot's scale bar. Also writes a zoomed crop with the sample line drawn, for the log.
// Usage: node scripts/road-profile.mjs <image> <pxPerM> <x> <y> <axisAngleDeg> <halfLenPx> <out.png>
import sharp from 'sharp';

const [file, pxPerM, X, Y, ang, half, out] = process.argv.slice(2);
const s = +pxPerM, x0 = +X, y0 = +Y, a = (+ang * Math.PI) / 180, H = +half;
const nx = -Math.sin(a), ny = Math.cos(a); // normal to the road axis (image coordinates, y down)
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const at = (x, y) => { const i = (Math.round(y) * info.width + Math.round(x)) * 3; return [data[i], data[i + 1], data[i + 2]]; };
const rows = [];
for (let k = -H; k <= H; k++) {
  // average 5 samples along the axis to smooth cars and markings
  let r = 0, g = 0, b = 0;
  for (let t = -2; t <= 2; t++) { const c = at(x0 + nx * k + Math.cos(a) * t * 2, y0 + ny * k + Math.sin(a) * t * 2); r += c[0]; g += c[1]; b += c[2]; }
  r /= 5; g /= 5; b /= 5;
  const L = (r + g + b) / 3, sat = Math.max(r, g, b) - Math.min(r, g, b);
  rows.push({ k, m: +(k / s).toFixed(1), L: Math.round(L), sat: Math.round(sat), hex: '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('') });
}
console.log(rows.map(r => `${String(r.m).padStart(6)} m  L${String(r.L).padStart(4)} s${String(r.sat).padStart(3)} ${r.hex} ${'#'.repeat(Math.round(r.L / 8))}`).join('\n'));
const R = Math.round(H * 1.3), Z = 6, l = Math.max(0, Math.round(x0 - R)), t = Math.max(0, Math.round(y0 - R));
const line = `<svg width="${2 * R * Z}" height="${2 * R * Z}"><line x1="${(x0 - l - nx * H) * Z}" y1="${(y0 - t - ny * H) * Z}" x2="${(x0 - l + nx * H) * Z}" y2="${(y0 - t + ny * H) * Z}" stroke="#ff0" stroke-width="2"/></svg>`;
const crop = await sharp(file).extract({ left: l, top: t, width: 2 * R, height: 2 * R }).resize(2 * R * Z, 2 * R * Z, { kernel: 'nearest' }).png().toBuffer();
await sharp(crop).composite([{ input: Buffer.from(line) }]).toFile(out);
