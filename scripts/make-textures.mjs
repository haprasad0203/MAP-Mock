// Procedural seamless textures for the tycoon 3D map (fallback while Gemini's image quota was exhausted).
// Every texture is periodic by construction (torus noise, whole-number repeats), so it tiles with no seam.
//   node scripts/make-textures.mjs [outDir=public/campus-art/tycoon] [size=1024]
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = process.argv[2] ?? 'public/campus-art/tycoon';
const S = +(process.argv[3] ?? 1024);
fs.mkdirSync(OUT, { recursive: true });

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// value noise on a torus: period p cells across the whole texture
function tnoise(u, v, p, seed) {
  const x = u * p, y = v * p, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const w = (i, j) => hash(((i % p) + p) % p, ((j % p) + p) % p, seed);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return (w(x0, y0) * (1 - sx) + w(x0 + 1, y0) * sx) * (1 - sy) + (w(x0, y0 + 1) * (1 - sx) + w(x0 + 1, y0 + 1) * sx) * sy;
}
const fbm = (u, v, p, seed, oct = 4) => { let a = 0, amp = 0.5, t = 0; for (let o = 0; o < oct; o++) { a += amp * tnoise(u, v, p << o, seed + o); t += amp; amp *= 0.5; } return a / t; };

async function save(name, fn) {
  const buf = Buffer.alloc(S * S * 3);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const c = fn(x / S, y / S, x, y); const i = (y * S + x) * 3; buf[i] = clamp(c[0]); buf[i + 1] = clamp(c[1]); buf[i + 2] = clamp(c[2]); }
  await sharp(buf, { raw: { width: S, height: S, channels: 3 } }).webp({ quality: 90 }).toFile(`${OUT}/tex-${name}.webp`);
  console.log('tex-' + name);
}

// Facade: cols × rows window bays per tile; colours from the photos / Gemini texture 1.
function facade(wall, glass, frame, { cols = 4, rows = 4, ww = 0.46, wh = 0.5, grain = 6 }) {
  const W = hex(wall), G = hex(glass), F = hex(frame), sill = mix(F, [0, 0, 0], 0.06), shade = mix(W, [0, 0, 0], 0.12);
  return (u, v) => {
    const cu = (u * cols) % 1, cv = (v * rows) % 1;               // position inside one bay
    const x0 = (1 - ww) / 2, y0 = 0.18, x1 = x0 + ww, y1 = y0 + wh, f = 0.035;
    let c = mix(W, mix(W, [255, 255, 255], 0.5), (fbm(u, v, 32, 7, 3) - 0.5) * grain * 0.04); // faint plaster grain
    if (cu > x0 - f && cu < x1 + f && cv > y0 - f && cv < y1 + f) {
      c = F;                                                         // frame
      if (cu > x0 && cu < x1 && cv > y0 && cv < y1) {
        const mid = Math.abs(cu - (x0 + x1) / 2) < 0.012;            // centre mullion
        const streak = ((cu - x0) + (cv - y0) * 0.9) % 0.22 < 0.035;  // diagonal sky glint
        c = mid ? F : streak ? mix(G, [255, 255, 255], 0.28) : mix(G, [0, 0, 0], (cv - y0) / wh * 0.18);
      }
    }
    if (cu > x0 - f * 2 && cu < x1 + f * 2 && cv > y1 + f && cv < y1 + f * 2.6) c = sill;      // sill
    if (cv > y1 + f * 2.6 && cv < y1 + f * 3.4 && cu > x0 - f * 2 && cu < x1 + f * 2) c = shade; // sill shadow
    return c;
  };
}

// Stone cladding: random-height courses of split-face blocks, wrapping across the tile edge.
function stone() {
  const pal = ['#8A6A4A', '#9C7A55', '#B08B62', '#7A5C41', '#A88F72', '#8E8579', '#C2A27A'].map(hex), mortar = hex('#CFC6B8');
  const courses = 9;
  return (u, v) => {
    const row = Math.floor(v * courses), rv = (v * courses) % 1;
    const n = 4 + Math.floor(hash(row, 1, 3) * 3);                  // blocks in this course (whole number → seamless)
    const off = hash(row, 2, 3), bu = ((u + off) % 1) * n, col = Math.floor(bu), cu = bu % 1;
    if (rv < 0.07 || cu < 0.03) return mortar;
    const base = pal[Math.floor(hash(row, col % n, 9) * pal.length)];
    const face = (fbm(u, v, 24, 11 + row, 3) - 0.5) * 60 + (rv < 0.2 ? 18 : 0) - (rv > 0.88 ? 22 : 0);
    return base.map(x => x + face);
  };
}

// Ribbed metal roofing (green or slate), ribs along v, sheet laps across.
function roof(colour, ribs = 16) {
  const C = hex(colour), hi = mix(C, [255, 255, 255], 0.28), lo = mix(C, [0, 0, 0], 0.28);
  return (u, v) => {
    const r = (u * ribs) % 1, lap = (v * 4) % 1;
    let c = r < 0.1 ? hi : r < 0.16 ? lo : mix(C, [0, 0, 0], (fbm(u, v, 16, 21, 2) - 0.5) * 0.12);
    if (lap < 0.012) c = lo;
    return c;
  };
}

// Brick pavers in a herringbone-ish running bond (pink/terracotta, like the Admin forecourt).
function brick() {
  const pal = ['#C9776A', '#D48A79', '#BB6B5D', '#D99A88', '#C47F6E'].map(hex), joint = hex('#E7D7C9');
  const rows = 16, cols = 8;
  return (u, v) => {
    const r = Math.floor(v * rows), rv = (v * rows) % 1;
    const bu = (u * cols + (r % 2) * 0.5) % cols, c = Math.floor(bu), cu = bu % 1;
    if (rv < 0.08 || cu < 0.04) return joint;
    const base = pal[Math.floor(hash(r, c, 5) * pal.length)];
    return base.map(x => x + (fbm(u, v, 32, 31, 2) - 0.5) * 22);
  };
}

const speckle = (base, dark, light, p, amt) => { const B = hex(base), D = hex(dark), L = hex(light);
  return (u, v, x, y) => { const n = fbm(u, v, p, 41, 4); const h = hash(x % S, y % S, 43); let c = mix(B, n < 0.5 ? D : L, Math.abs(n - 0.5) * amt);
    if (h > 0.985) c = mix(c, L, 0.6); if (h < 0.01) c = mix(c, D, 0.6); return c; }; };

// Lawn: warm green with mowing stripes and grass flecks (periodic).
function lawn() { const A = hex('#6FB04F'), B = hex('#5E9F44'), L = hex('#8CC765');
  return (u, v, x, y) => { const stripe = (Math.floor(u * 4) % 2) ? A : B; const n = fbm(u, v, 16, 51, 4);
    let c = mix(stripe, n > 0.5 ? L : mix(B, [0, 0, 0], 0.2), Math.abs(n - 0.5) * 0.9); if (hash(x, y, 53) > 0.97) c = mix(c, L, 0.7); return c; }; }

// Pine forest floor: dark green-brown, needle litter and moss patches.
function forestFloor() { const A = hex('#3E4A2C'), B = hex('#5A4A33'), M = hex('#4F6B35');
  return (u, v, x, y) => { const n = fbm(u, v, 8, 61, 5), m = fbm(u, v, 12, 67, 3);
    let c = mix(A, B, n); if (m > 0.62) c = mix(c, M, (m - 0.62) * 2.5);
    const h = hash(x, y, 71); if (h > 0.975) c = mix(c, hex('#8A6A40'), 0.7); return c; }; }

await save('facade-cream-plaster', facade('#F2DFC4', '#2F4A66', '#F7F3EC', { cols: 4, rows: 4 }));
await save('facade-white-tealglass', facade('#F4F2EA', '#2F7F80', '#FFFFFF', { cols: 4, rows: 4, ww: 0.52, wh: 0.52 }));
await save('stone-cladding', stone());
await save('roof-green-metal', roof('#3E8A4E'));
await save('roof-slate-grey', roof('#4B525A'));
await save('plaza-red-brick', brick());
await save('asphalt', speckle('#4F555C', '#3E4349', '#6B7076', 24, 0.5));
await save('lawn-grass', lawn());
await save('pine-forest-floor', forestFloor());
