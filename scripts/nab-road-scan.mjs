// Road centrelines around NAB measured on H A's nadir: scan across each road in the building's (u, v) frame and take the
// middle of the longest run of asphalt-like pixels (dark, unsaturated). Prints (u, v) samples in photo pixels.
import sharp from 'sharp';
const file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
const A = [941.8, 2943.2], r = 39.55 * Math.PI / 180, U = [Math.cos(r), -Math.sin(r)], V = [Math.sin(r), Math.cos(r)];
const meta = await sharp(file).metadata(), { data } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const at = (u, v) => { const x = Math.round(A[0] + u * U[0] + v * V[0]), y = Math.round(A[1] + u * U[1] + v * V[1]); if (x < 0 || y < 0 || x >= meta.width || y >= meta.height) return null; const k = (y * meta.width + x) * 3; return [data[k], data[k + 1], data[k + 2]]; };
const asphalt = c => { if (!c) return false; const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], s = Math.max(...c) - Math.min(...c); return l > 35 && l < 118 && s < 22; };
function run(samples) { // samples: [[pos, isAsphalt]...] → centre of the longest asphalt run (allow 3 px gaps for the edge lines)
  let best = null, cur = null, gap = 0;
  for (const [p, ok] of samples) { if (ok) { if (!cur) cur = { a: p, b: p }; cur.b = p; gap = 0; } else if (cur && ++gap > 3) { if (!best || cur.b - cur.a > best.b - best.a) best = cur; cur = null; gap = 0; } }
  if (cur && (!best || cur.b - cur.a > best.b - best.a)) best = cur;
  return best && best.b - best.a > 20 ? [((best.a + best.b) / 2).toFixed(0), (best.b - best.a).toFixed(0)] : null;
}
const out = { front: [], sw: [], back: [] };
for (let u = -100; u <= 950; u += 50) { const s = []; for (let v = -280; v <= -100; v++) s.push([v, asphalt(at(u, v))]); out.front.push([u, run(s)]); }
for (let v = -150; v <= 800; v += 50) { const s = []; for (let u = -300; u <= -40; u++) s.push([u, asphalt(at(u, v))]); out.sw.push([v, run(s)]); }
for (let u = -100; u <= 900; u += 50) { const s = []; for (let v = 270; v <= 420; v++) s.push([v, asphalt(at(u, v))]); out.back.push([u, run(s)]); }
console.log('front road (u → v centre, width):', out.front.map(([u, r]) => `${u}:${r ? r.join('/') : '-'}`).join('  '));
console.log('SW road (v → u centre, width):', out.sw.map(([v, r]) => `${v}:${r ? r.join('/') : '-'}`).join('  '));
console.log('back road (u → v centre, width):', out.back.map(([u, r]) => `${u}:${r ? r.join('/') : '-'}`).join('  '));
