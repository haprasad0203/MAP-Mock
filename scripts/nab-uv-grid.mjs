// The NAB part of H A's straight-down drone still, rotated so the building's front line is horizontal, with its own
// (u, v) grid (u along the front from the SW corner, v back from it; full-size photo pixels; 8.8 px ≈ 1 m).
// Usage: node scripts/nab-uv-grid.mjs <out.jpg> <u0,u1,v0,v1> [--zoom=2] [--step=10]
import sharp from 'sharp';
const [out, box, ...rest] = process.argv.slice(2), opt = Object.fromEntries(rest.map(a => a.slice(2).split('=')));
const [u0, u1, v0, v1] = box.split(',').map(Number), Z = +(opt.zoom ?? 2), step = +(opt.step ?? 10);
const file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
const A = [941.8, 2943.2], r = 39.55 * Math.PI / 180, U = [Math.cos(r), -Math.sin(r)], V = [Math.sin(r), Math.cos(r)];
const px = (u, v) => [A[0] + u * U[0] + v * V[0], A[1] + u * U[1] + v * V[1]];
// sample the rotated image directly: output pixel (i, j) ↔ (u, v) = (u0 + i / Z, v0 + j / Z), bilinear
const meta = await sharp(file).metadata(), { data } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = Math.round((u1 - u0) * Z), H = Math.round((v1 - v0) * Z), outBuf = Buffer.alloc(W * H * 3);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const [x, y] = px(u0 + i / Z, v0 + j / Z), xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  for (let c = 0; c < 3; c++) {
    const g = (xx, yy) => data[(Math.min(meta.height - 1, Math.max(0, yy)) * meta.width + Math.min(meta.width - 1, Math.max(0, xx))) * 3 + c];
    outBuf[(j * W + i) * 3 + c] = (g(xi, yi) * (1 - fx) + g(xi + 1, yi) * fx) * (1 - fy) + (g(xi, yi + 1) * (1 - fx) + g(xi + 1, yi + 1) * fx) * fy;
  }
}
let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
for (let u = Math.ceil(u0 / step) * step; u <= u1; u += step) { const big = u % (step * 5) === 0, x = (u - u0) * Z; svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#ff0" stroke-opacity="${big ? 0.55 : 0.15}"/>` + (big ? `<text x="${x + 2}" y="12" fill="#ff0" stroke="#000" stroke-width="2" paint-order="stroke" font-size="12" font-family="Arial">${u}</text>` : ''); }
for (let v = Math.ceil(v0 / step) * step; v <= v1; v += step) { const big = v % (step * 5) === 0, y = (v - v0) * Z; svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${v === 0 ? '#0ff' : '#ff0'}" stroke-opacity="${v === 0 ? 0.8 : big ? 0.55 : 0.15}"/>` + (big ? `<text x="2" y="${y - 2}" fill="#ff0" stroke="#000" stroke-width="2" paint-order="stroke" font-size="12" font-family="Arial">v${v}</text>` : ''); }
svg += '</svg>';
await sharp(outBuf, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(out);
console.log(out, W, H);
