// Draw a NAB plan given in the building's own frame (u along the front line from its SW corner, v back from it, in
// full-size photo pixels) over H A's straight-down drone still, to check the reading before it becomes map data.
// Usage: node scripts/nab-uv-check.mjs <plan.json> <out.jpg> [--zoom=1.25]
import sharp from 'sharp';
import fs from 'node:fs';
const [planFile, out, ...rest] = process.argv.slice(2), opt = Object.fromEntries(rest.map(a => a.slice(2).split('=')));
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8')), file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
const r = plan.deg * Math.PI / 180, U = [Math.cos(r), -Math.sin(r)], V = [Math.sin(r), Math.cos(r)], [ax, ay] = plan.A;
const px = ([u, v]) => [ax + u * U[0] + v * V[0], ay + u * U[1] + v * V[1]];
const L = 840, T = 2400, W = 940, H = 880, Z = +(opt.zoom ?? 1.25);
const P = q => { const [x, y] = px(q); return `${((x - L) * Z).toFixed(1)},${((y - T) * Z).toFixed(1)}`; };
let svg = `<svg width="${W * Z}" height="${H * Z}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="2">`;
svg += `<polygon points="${plan.outline.map(P).join(' ')}" stroke="#00ff66"/>`;
for (const [u0, u1, v0, v1] of plan.towers) svg += `<polygon points="${[[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(P).join(' ')}" stroke="#ffa000"/>`;
{ const [cu, cv, rr] = plan.pyramid; svg += `<polygon points="${[[cu, cv - rr], [cu + rr, cv], [cu, cv + rr], [cu - rr, cv]].map(P).join(' ')}" stroke="#00e5ff"/>`; }
svg += `<polyline points="${plan.vcanopy.map(P).join(' ')}" stroke="#ff00ff" stroke-width="4"/>`;
for (const b of plan.boxes) svg += `<polygon points="${b.map(P).join(' ')}" stroke="#ffff00"/>`;
for (let u = -100; u <= 800; u += 100) { const [x, y] = px([u, -12]); svg += `<text x="${(x - L) * Z}" y="${(y - T) * Z}" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke" font-size="12" font-family="Arial">u${u}</text>`; }
svg += '</g></svg>';
await sharp(file).extract({ left: L, top: T, width: W, height: H }).resize(Math.round(W * Z)).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(out);
console.log(out);
