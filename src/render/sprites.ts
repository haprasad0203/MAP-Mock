import type { Building, Part } from '../geo/types';
import type { XY } from '../geo/grid';
import { C, pixelize, shade } from './palette';
import { depth, facesViewer, project, rotate, type Rot } from './iso';
import { partCorners } from './world';

export interface Sprite { canvas: HTMLCanvasElement; x0: number; y0: number; w: number; h: number; alpha: Uint8Array; baseY: number; topY: number; cx: number }

const FLOOR = 3.4, GROUND = 4.0;
export const partHeight = (p: Part) => GROUND + Math.max(0, p.floors - 1) * FLOOR;

function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
function alphaOf(cv: HTMLCanvasElement): Uint8Array {
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data; const a = new Uint8Array(cv.width * cv.height);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 0 ? 1 : 0; return a;
}

// ---------------- Trees ----------------
const treeCache = new Map<string, Sprite>();
/** Pine tree sprite. size: 0..2 (small..large), tint: 0..1 */
export function treeSprite(k: number, size: number, tint: number): Sprite {
  const key = `${k}:${size}:${tint}`; const hit = treeCache.get(key); if (hit) return hit;
  const hM = [10, 13, 17][size];
  const H = Math.max(4, Math.round(hM * k * 0.95)), W = Math.max(3, Math.round(H * 0.48) | 1);
  const cv = canvas(W + 2, H + 2); const g = cv.getContext('2d')!;
  const dark = tint ? C.pineDark : C.pine, mid = tint ? C.pineLight : C.pineMid, lite = tint ? '#57A05C' : C.pineLight;
  const trunk = Math.max(1, Math.round(H * 0.12)), canopy = H - trunk, cx = (W + 2) / 2;
  const tiers = canopy >= 9 ? 3 : canopy >= 6 ? 2 : 1;
  for (let y = 0; y < canopy; y++) {
    const t = y / canopy, tierPos = (t * tiers) % 1, tier = Math.floor(t * tiers);
    const wide = (W / 2) * (0.35 + 0.65 * ((tier + tierPos) / tiers)) * (0.75 + 0.25 * tierPos);
    const x0 = Math.round(cx - wide), x1 = Math.round(cx + wide);
    for (let x = x0; x < x1; x++) { g.fillStyle = x < cx - 0.5 ? dark : (x > cx + wide * 0.45 && tierPos > 0.4 ? lite : mid); g.fillRect(x, y + 1, 1, 1); }
  }
  g.fillStyle = '#4E3626'; g.fillRect(Math.floor(cx - 0.5), canopy + 1, Math.max(1, Math.round(W / 6)), trunk);
  pixelize(g, cv.width, cv.height, H >= 6);
  const s: Sprite = { canvas: cv, x0: -Math.floor(cv.width / 2), y0: -(cv.height - 1), w: cv.width, h: cv.height, alpha: alphaOf(cv), baseY: 0, topY: -cv.height, cx: 0 };
  treeCache.set(key, s); return s;
}

// ---------------- Buildings ----------------
type Pt = [number, number];
interface Face { pts: Pt[]; fill: string; d: number; visible: boolean; detail?: (g: CanvasRenderingContext2D) => void }

const lighten = (hex: string, nu: number, nv: number) => {
  // screen-right faces (nu+nv>0) are lit, screen-left faces are in shade
  const s = nu + nv; return shade(hex, s > 0.3 ? 1.04 : s < -0.3 ? 0.8 : 0.92);
};

function poly(g: CanvasRenderingContext2D, pts: Pt[], fill: string) {
  g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill();
}

function partFaces(b: Building, p: Part, rot: Rot, k: number, P: (x: number, y: number, z: number) => Pt): Face[] {
  const faces: Face[] = [];
  const wall = p.wall ?? b.wall, roofC = p.roofColor ?? b.roofColor, h = partHeight(p);
  const ring: XY[] = p.roof === 'octagon'
    ? Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return [p.cx + Math.cos(a) * p.w / 2, p.cy + Math.sin(a) * p.w / 2] as XY; })
    : partCorners(p);
  const n = ring.length;
  const detailOK = k >= 0.4;
  // ---- walls ----
  for (let i = 0; i < n; i++) {
    const a = ring[i], c = ring[(i + 1) % n]; const ex = c[0] - a[0], ey = c[1] - a[1], L = Math.hypot(ex, ey);
    const [nu, nv] = rotate(ey / L, -ex / L, rot); const visible = facesViewer(nu, nv);
    if (!visible) continue;
    const col = lighten(wall, nu, nv);
    const isLong = p.roof !== 'octagon' && L >= Math.min(p.w, p.d) + 0.1 && L > (p.w + p.d) / 2 - 0.1;
    faces.push({
      pts: [P(a[0], a[1], 0), P(c[0], c[1], 0), P(c[0], c[1], h), P(a[0], a[1], h)], fill: col, d: 0, visible: true,
      detail: g => {
        const at = (t: number, z: number) => P(a[0] + ex * t, a[1] + ey * t, z);
        const quad = (t0: number, t1: number, z0: number, z1: number, f: string) => poly(g, [at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1)], f);
        if (p.stoneBase) quad(0, 1, 0, GROUND - 0.6, lighten(C.stone, nu, nv));
        if (detailOK) {
          const nWin = Math.max(1, Math.floor(L / 3.3));
          for (let f = 0; f < p.floors; f++) {
            const z0 = (f === 0 ? 1.2 : GROUND + (f - 1) * FLOOR + 1.0), z1 = z0 + 1.5;
            if (p.balconies && isLong && f > 0) quad(0.02, 0.98, z0 - 0.6, z0 - 0.1, shade(wall, 1.08));
            for (let j = 0; j < nWin; j++) { const t0 = (j + 0.32) / nWin, t1 = (j + 0.68) / nWin; quad(t0, t1, z0, z1, C.window); }
          }
        }
        if (p.glass === 'atrium' && (isLong || p.roof === 'octagon')) {
          const [t0, t1] = p.roof === 'octagon' ? [0.08, 0.92] : [0.4, 0.6];
          quad(t0, t1, 0.2, h - 0.4, nu + nv > 0 ? C.glass : C.glassDark);
          if (detailOK) for (let f = 1; f < p.floors; f++) quad(t0, t1, GROUND + (f - 1) * FLOOR - 0.15, GROUND + (f - 1) * FLOOR + 0.15, C.glassDark);
        }
        if (p.glass === 'stair' && isLong) quad(0.16, 0.24, 0.2, h + 1.2, nu + nv > 0 ? C.glass : C.glassDark);
        if (detailOK) quad(0.45, 0.55, 0, Math.min(2.6, h), f2(C.window));
      },
    });
  }
  // ---- roof ----
  const top = h, eave = 0.7, rf = (hex: string, nu: number, nv: number) => lighten(hex, nu, nv);
  const pushRoof = (pts3: [number, number, number][], baseHex: string) => {
    // normal from first three points (world), for shading + visibility
    const [a, b2, c] = pts3; const ux = b2[0] - a[0], uy = b2[1] - a[1], uz = b2[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const [nu, nv] = rotate(nx, ny, rot); const l = Math.hypot(nu, nv) || 1;
    faces.push({ pts: pts3.map(q => P(q[0], q[1], q[2])), fill: rf(baseHex, nu / l, nv / l), d: (nu - nv) / l, visible: nu - nv > -0.05 });
  };
  if (p.roof === 'flat') {
    const cs = partCorners(p);
    faces.push({ pts: cs.map(q => P(q[0], q[1], top)), fill: '#D7CFBE', d: 1, visible: true, detail: g => {
      g.strokeStyle = roofC; g.lineWidth = 1; g.beginPath(); cs.forEach((q, i) => { const s = P(q[0], q[1], top); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }); g.closePath(); g.stroke();
    } });
    if (p.stoneTowers) {
      // two square stone towers at the ends, one floor higher, with green caps
      const a = (p.angle * Math.PI) / 180, ax = Math.cos(a), ay = Math.sin(a), s = p.d * 0.45;
      for (const sgn of [-1, 1]) {
        const tc: Part = { cx: p.cx + ax * sgn * (p.w / 2 - s / 2), cy: p.cy + ay * sgn * (p.w / 2 - s / 2), w: s, d: s, angle: p.angle, floors: p.floors + 1, roof: 'hip', wall: C.stone, roofColor: roofC };
        faces.push(...partFaces(b, tc, rot, k, P).map(f => ({ ...f, d: f.d + 2 + depth(tc.cx, tc.cy, rot) * 1e-3 })));
      }
    }
  } else if (p.roof === 'hip' || p.roof === 'gable' || p.roof === 'shed') {
    const ex: Part = { ...p, w: p.w + eave * 2, d: p.d + eave * 2 };
    const cs = partCorners(ex); const along = p.w >= p.d;
    const short = Math.min(ex.w, ex.d), rh = p.roof === 'shed' ? short * 0.22 : short * 0.34;
    const a = (p.angle * Math.PI) / 180; const ax = along ? Math.cos(a) : -Math.sin(a), ay = along ? Math.sin(a) : Math.cos(a);
    const halfLong = (along ? ex.w : ex.d) / 2;
    const inset = p.roof === 'hip' ? short / 2 : 0;
    const r0: [number, number, number] = [p.cx - ax * (halfLong - inset), p.cy - ay * (halfLong - inset), top + rh];
    const r1: [number, number, number] = [p.cx + ax * (halfLong - inset), p.cy + ay * (halfLong - inset), top + rh];
    const c3 = cs.map(q => [q[0], q[1], top] as [number, number, number]);
    if (p.roof === 'shed') {
      // single slope rising across the short axis: corners 0,1 low, 2,3 high (if along) else rotated
      const hi = along ? [2, 3] : [1, 2];
      const s3 = c3.map((q, i) => [q[0], q[1], hi.includes(i) ? top + rh : top] as [number, number, number]);
      pushRoof([s3[0], s3[1], s3[2], s3[3]], roofC);
    } else {
      // corners order: 0(-w,-d) 1(+w,-d) 2(+w,+d) 3(-w,+d). Long sides are 0-1 & 2-3 when along, else 1-2 & 3-0.
      const [A, B, Cc, D] = along ? [c3[0], c3[1], c3[2], c3[3]] : [c3[1], c3[2], c3[3], c3[0]];
      const [R0, R1] = along ? [r0, r1] : [r0, r1];
      pushRoof([A, B, R1, R0], roofC);
      pushRoof([Cc, D, R0, R1], roofC);
      if (p.roof === 'hip') { pushRoof([B, Cc, R1], roofC); pushRoof([D, A, R0], roofC); }
      else { pushRoof([B, Cc, R1], p.wall ?? b.wall); pushRoof([D, A, R0], p.wall ?? b.wall); }
    }
  } else if (p.roof === 'octagon') {
    const R = p.w / 2 + eave, r2 = p.w * 0.22;
    const ringAt = (rad: number, z: number) => Array.from({ length: 8 }, (_, i) => { const an = (i / 8) * Math.PI * 2 + Math.PI / 8; return [p.cx + Math.cos(an) * rad, p.cy + Math.sin(an) * rad, z] as [number, number, number]; });
    const lo = ringAt(R, top), mid = ringAt(r2 + 0.6, top + p.w * 0.22), drumTop = ringAt(r2, top + p.w * 0.22 + 1.2), cap = ringAt(r2 + 0.5, top + p.w * 0.22 + 1.2);
    const apex: [number, number, number] = [p.cx, p.cy, top + p.w * 0.22 + 1.2 + p.w * 0.16];
    for (let i = 0; i < 8; i++) pushRoof([lo[i], lo[(i + 1) % 8], mid[(i + 1) % 8], mid[i]], roofC);
    for (let i = 0; i < 8; i++) pushRoof([mid[i], mid[(i + 1) % 8], drumTop[(i + 1) % 8], drumTop[i]], C.wall);
    for (let i = 0; i < 8; i++) pushRoof([cap[i], cap[(i + 1) % 8], apex], roofC);
  }
  return faces;
}

const imgCache = new Map<string, HTMLImageElement | null>();
export function loadArt(slug: string, onload: () => void): HTMLImageElement | null {
  if (imgCache.has(slug)) return imgCache.get(slug)!;
  imgCache.set(slug, null);
  const im = new Image(); im.onload = () => { imgCache.set(slug, im); onload(); }; im.src = `/campus-art/${slug}.png`;
  return null;
}

/** Builds one pixelized sprite for a whole building at (rot, k). */
export function buildingSprite(b: Building, rot: Rot, k: number, illustrated: boolean, onArt: () => void): Sprite {
  const P0 = (x: number, y: number, z: number): Pt => project(x, y, z, rot, k);
  // bounds from all parts incl. roof headroom
  const pts: Pt[] = [];
  for (const p of b.parts) { const h = partHeight(p) + Math.min(p.w, p.d) * 0.6 + 6; for (const c of partCorners({ ...p, w: p.w + 2, d: p.d + 2 })) { pts.push(P0(c[0], c[1], 0), P0(c[0], c[1], h)); } }
  let minX = Math.floor(Math.min(...pts.map(q => q[0]))) - 2, maxX = Math.ceil(Math.max(...pts.map(q => q[0]))) + 2;
  let minY = Math.floor(Math.min(...pts.map(q => q[1]))) - 2, maxY = Math.ceil(Math.max(...pts.map(q => q[1]))) + 2;
  const baseY = Math.max(...b.parts.flatMap(p => partCorners(p).map(c => P0(c[0], c[1], 0)[1])));

  // Optional illustrated sprite (only drawn at rotation 0, the angle Gemini drew).
  const art = illustrated && rot === 0 && k >= 0.3 && b.sprite ? loadArt(b.sprite, onArt) : null;
  let artBox: { x: number; y: number; w: number; h: number } | null = null;
  if (art) {
    const footW = maxX - minX - 4; const w = Math.round(footW * 1.04), h = Math.round(art.height * (w / art.width));
    const cx = (minX + maxX) / 2; artBox = { x: Math.round(cx - w / 2), y: Math.round(baseY - h + h * 0.06), w, h };
    minY = Math.min(minY, artBox.y - 2); maxY = Math.max(maxY, artBox.y + h + 2); minX = Math.min(minX, artBox.x - 2); maxX = Math.max(maxX, artBox.x + w + 2);
  }
  const W = maxX - minX, H = maxY - minY; const cv = canvas(W, H); const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  if (art && artBox) {
    g.drawImage(art, artBox.x - minX, artBox.y - minY, artBox.w, artBox.h);
  } else {
    const P = (x: number, y: number, z: number): Pt => { const q = P0(x, y, z); return [q[0] - minX, q[1] - minY]; };
    const parts = [...b.parts].sort((a, c) => depth(a.cx, a.cy, rot) - depth(c.cx, c.cy, rot));
    for (const p of parts) {
      const faces = partFaces(b, p, rot, k, P);
      const walls = faces.filter(f => f.d === 0), roofs = faces.filter(f => f.d !== 0).sort((a, c) => a.d - c.d);
      for (const f of walls) { poly(g, f.pts, f.fill); f.detail?.(g); }
      for (const f of roofs) { poly(g, f.pts, f.fill); f.detail?.(g); }
    }
  }
  pixelize(g, W, H, true);
  return { canvas: cv, x0: minX, y0: minY, w: W, h: H, alpha: alphaOf(cv), baseY, topY: minY, cx: (minX + maxX) / 2 };
}

function f2(hex: string) { return shade(hex, 0.9); }

// ---------------- Small props ----------------
export function propSprite(kind: string, k: number): Sprite {
  const key = `prop:${kind}:${k}`; const hit = treeCache.get(key); if (hit) return hit;
  const s = Math.max(0.45, k * 1.1);
  const W = Math.round(14 * s) + 2, H = Math.round(18 * s) + 2; const cv = canvas(W, H); const g = cv.getContext('2d')!;
  const px = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x * s) + 1, Math.round(y * s) + 1, Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
  // Main gate (from photo): white portal frame, green pitched roof, name band, stone name wall.
  if (kind === 'gate') { px(1, 6, 3, 12, C.wall); px(10, 6, 3, 12, C.wall); px(0, 5, 14, 2, '#F4F2EA'); px(0, 3, 14, 2, C.pineLight); px(3, 1, 8, 2, C.pineLight); px(2, 7, 10, 1, C.pine); px(4, 12, 6, 6, '#9AA3AB'); px(12, 14, 2, 4, C.stone); }
  else if (kind === 'statue') { px(4, 12, 6, 6, C.plazaDark); px(5.5, 4, 3, 8, '#5E6872'); px(5.5, 2, 3, 3, '#77808A'); }
  else if (kind === 'tank') { px(2, 4, 10, 12, '#C3C9CD'); px(2, 3, 10, 2, '#9AA3AB'); px(3, 16, 1, 2, '#5E6872'); px(10, 16, 1, 2, '#5E6872'); }
  else if (kind === 'flag') { px(6, 0, 1, 18, '#C3C9CD'); px(7, 0, 5, 1.2, '#FF8A3D'); px(7, 1.2, 5, 1.2, '#FFFFFF'); px(7, 2.4, 5, 1.2, '#2E6E43'); }
  else if (kind === 'atm') { px(3, 6, 8, 12, '#B5463A'); px(4, 8, 6, 3, '#A6DCEA'); }
  else { px(5, 6, 4, 12, C.pine); }
  pixelize(g, W, H, true);
  const sp: Sprite = { canvas: cv, x0: -Math.floor(W / 2), y0: -(H - 1), w: W, h: H, alpha: alphaOf(cv), baseY: 0, topY: -H, cx: 0 };
  treeCache.set(key, sp); return sp;
}
