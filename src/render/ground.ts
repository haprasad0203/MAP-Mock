import { BAYER, C, hexToRgb } from './palette';
import { fbm, hash2, terrain, valueNoise } from './noise';
import { project, unproject, depth, type Rot } from './iso';
import { campusAt, cls, G, HALF, type WorldModel } from './world';
import { treeSprite } from './sprites';

export const CHUNK = 256;
const rgb = (h: string) => hexToRgb(h);
const P = {
  grass: [rgb('#4E9655'), rgb(C.grass), rgb(C.grassLight)], forest: [rgb(C.pine), rgb(C.pineDark), rgb(C.pineMid), rgb(C.pineLight)],
  lawn: [rgb('#68AD62'), rgb(C.lawn), rgb(C.lawnLight)], road: rgb(C.road), roadEdge: rgb(C.roadEdge), service: rgb(C.service), track: rgb(C.track),
  path: rgb(C.path), water: rgb(C.water), waterDeep: rgb(C.waterDeep), waterLight: rgb(C.waterLight), glint: rgb(C.waterGlint),
  court: rgb(C.court), courtLine: rgb(C.courtLine), courtRed: rgb(C.courtRed), ground: rgb(C.ground), stripe: rgb(C.groundStripe),
  plaza: rgb(C.plaza), plazaDark: rgb(C.plazaDark), parking: rgb(C.parking), parkingLine: rgb(C.parkingLine), garden: rgb(C.garden), flower: rgb(C.flower),
  building: rgb('#BFB49C'), courtBlue: rgb('#3E95B8'), covered: rgb('#5FB7B0'), coveredDark: rgb('#2F8A8A'),
  roadLine: rgb('#ECE8DC'), roadDash: rgb('#F3EFE3'), earth: rgb('#C9B48A'), earthDark: rgb('#BFB49C'), mist: [rgb(C.mist3), rgb(C.mist2), rgb(C.mist)],
};

// Coarse hill-shade raster (8 m cells) so the per-pixel pass stays cheap.
const SH = 8, SN = Math.ceil((HALF * 2 + 800) / SH), SOFF = HALF + 400;
let shadeGrid: Float32Array | null = null;
function shadeAt(x: number, y: number) {
  if (!shadeGrid) {
    shadeGrid = new Float32Array(SN * SN);
    for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
      const wx = i * SH - SOFF, wy = j * SH - SOFF;
      const dx = terrain(wx + 4, wy) - terrain(wx - 4, wy), dy = terrain(wx, wy + 4) - terrain(wx, wy - 4);
      shadeGrid[j * SN + i] = Math.max(-1, Math.min(1, (dx * 0.7 + dy * 0.7) / 6)); // light from NE
    }
  }
  const i = Math.floor((x + SOFF) / SH), j = Math.floor((y + SOFF) / SH);
  if (i < 0 || j < 0 || i >= SN || j >= SN) return 0;
  return shadeGrid[j * SN + i];
}
// Pine forest everywhere outside; thinner (but not absent) inside campus so there is no hard edge.
const isForestRaw = (x: number, y: number) => fbm(x / 160, y / 160, 3, 41);
function isForestAt(m: WorldModel, x: number, y: number) { return isForestRaw(x, y) > (campusAt(m, x, y) ? 0.6 : 0.42); }

/** Fog 0..1 by distance from the campus, with a noisy rim: the world fades into mist instead of ending. */
export function fogAt(m: WorldModel, x: number, y: number) {
  const d = Math.hypot(x - m.centre[0], (y - m.centre[1]) * 1.1) + (fbm(x / 220, y / 220, 3, 61) - 0.5) * 420;
  return Math.max(0, Math.min(1, (d - 780) / 700));
}

export function renderChunk(m: WorldModel, rot: Rot, k: number, ci: number, cj: number): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = CHUNK; cv.height = CHUNK;
  const g = cv.getContext('2d')!; const img = g.createImageData(CHUNK, CHUNK); const d = img.data;
  const ox = ci * CHUNK, oy = cj * CHUNK, mpp = 1 / k; // metres per buffer px (approx)
  for (let py = 0; py < CHUNK; py++) for (let px = 0; px < CHUNK; px++) {
    const [x, y] = unproject(ox + px + 0.5, oy + py + 0.5, rot, k);
    const c = cls(m, x, y); const b = BAYER[(py & 3) * 4 + (px & 3)];
    let col: number[];
    switch (c) {
      case G.WILD: {
        const s = shadeAt(x, y) + (b - 0.5) * 0.5;
        if (isForestAt(m, x, y)) {
          const n = valueNoise(x / 4.5, y / 4.5, 3);
          col = n > 0.62 ? (s > 0.1 ? P.forest[3] : P.forest[2]) : n > 0.38 ? P.forest[0] : P.forest[1];
          if (s < -0.35) col = P.forest[1];
        } else col = P.grass[s > 0.25 ? 2 : s < -0.25 ? 0 : 1];
        break;
      }
      case G.LAWN: { const s = shadeAt(x, y) * 0.6 + (valueNoise(x / 9, y / 9, 8) - 0.5) * 0.6 + (b - 0.5) * 0.4; col = P.lawn[s > 0.22 ? 2 : s < -0.22 ? 0 : 1]; break; }
      case G.ROAD: col = P.road; break;
      // markings only once a line is at least ~1 px wide; further out they read as plain asphalt
      case G.ROAD_LINE: col = k >= 0.64 ? P.roadLine : P.road; break;
      case G.ROAD_DASH: col = k >= 0.9 ? P.roadDash : P.road; break;
      case G.ROAD_EDGE: col = P.roadEdge; break;
      case G.SERVICE: col = P.service; break;
      case G.TRACK: col = P.track; break;
      case G.PATH: col = P.path; break;
      case G.WATER: {
        const edge = cls(m, x + 2.5, y) !== G.WATER || cls(m, x - 2.5, y) !== G.WATER || cls(m, x, y + 2.5) !== G.WATER || cls(m, x, y - 2.5) !== G.WATER;
        col = edge ? P.waterLight : (hash2(Math.floor(x / 3), Math.floor(y), 77) > 0.94 ? P.glint : valueNoise(x / 14, y / 14, 4) > 0.55 ? P.water : P.waterDeep); break;
      }
      case G.COURT: { const edge = cls(m, x + 1.2, y) !== G.COURT || cls(m, x - 1.2, y) !== G.COURT || cls(m, x, y + 1.2) !== G.COURT || cls(m, x, y - 1.2) !== G.COURT; col = edge ? P.courtLine : P.court; break; }
      case G.COURT_RED: col = P.courtRed; break;
      case G.COURT_BLUE: { const edge = cls(m, x + 1.2, y) !== G.COURT_BLUE || cls(m, x - 1.2, y) !== G.COURT_BLUE || cls(m, x, y + 1.2) !== G.COURT_BLUE || cls(m, x, y - 1.2) !== G.COURT_BLUE; col = edge ? P.courtLine : P.courtBlue; break; }
      case G.COVERED: col = (Math.floor(x / 2.5) + Math.floor(y / 2.5)) & 1 ? P.covered : P.coveredDark; break;
      case G.EARTH: {
        const edge = cls(m, x + 1.5, y) !== G.EARTH || cls(m, x - 1.5, y) !== G.EARTH || cls(m, x, y + 1.5) !== G.EARTH || cls(m, x, y - 1.5) !== G.EARTH;
        col = edge ? P.courtLine : valueNoise(x / 6, y / 6, 17) + (b - 0.5) * 0.3 > 0.55 ? P.earthDark : P.earth; break;
      }
      case G.GROUND: {
        const edge = cls(m, x + 1.5, y) !== G.GROUND || cls(m, x - 1.5, y) !== G.GROUND || cls(m, x, y + 1.5) !== G.GROUND || cls(m, x, y - 1.5) !== G.GROUND;
        col = edge ? P.courtLine : (Math.floor((x * 0.866 + y * 0.5) / 6) & 1 ? P.ground : P.stripe); break;
      }
      case G.PLAZA: col = (Math.floor(x / 2) + Math.floor(y / 2)) & 1 && k > 1 ? P.plazaDark : P.plaza; break;
      case G.PARKING: col = Math.floor(x / 3) % 2 === 0 && k > 0.8 && hash2(Math.floor(x), Math.floor(y / 5), 3) > 0.5 ? P.parkingLine : P.parking; break;
      case G.GARDEN: col = hash2(Math.floor(x * 1.3), Math.floor(y * 1.3), 12) > 0.86 ? P.flower : P.garden; break;
      case G.BUILDING: col = P.building; break;
      default: col = P.grass[1];
    }
    // world fades into dithered mist
    const f = fogAt(m, x, y);
    if (f > 0 && f > b * 0.999) col = P.mist[f > 0.75 ? 2 : f > 0.45 ? 1 : 0];
    const i = (py * CHUNK + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);

  // Forest trees (outside campus) baked into the chunk at area/building detail.
  if (k >= 0.3) {
    const sp = k >= 0.9 ? 6 : k >= 0.6 ? 8 : 11;
    // world bbox of this chunk, padded for tree height
    const corners = [[ox, oy], [ox + CHUNK, oy], [ox, oy + CHUNK + 40 * k], [ox + CHUNK, oy + CHUNK + 40 * k]].map(([a, b]) => unproject(a, b, rot, k));
    const xs = corners.map(q => q[0]), ys = corners.map(q => q[1]);
    const x0 = Math.floor(Math.min(...xs) / sp) - 1, x1 = Math.ceil(Math.max(...xs) / sp) + 1, y0 = Math.floor(Math.min(...ys) / sp) - 1, y1 = Math.ceil(Math.max(...ys) / sp) + 1;
    const trees: { x: number; y: number; s: number; v: number; dd: number }[] = [];
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const x = (i + hash2(i, j, 91) * 0.9) * sp, y = (j + hash2(i, j, 92) * 0.9) * sp;
      if (cls(m, x, y) !== G.WILD || !isForestAt(m, x, y)) continue;
      const cl = campusAt(m, x, y) ? 9 : 3; // keep baked trees well clear of buildings inside campus
      if (cls(m, x + cl, y) !== G.WILD || cls(m, x - cl, y) !== G.WILD || cls(m, x, y + cl) !== G.WILD || cls(m, x, y - cl) !== G.WILD) continue;
      const f = fogAt(m, x, y); if (f > 0.55 || hash2(i, j, 93) < f * 1.6) continue;
      trees.push({ x, y, s: hash2(i, j, 94) > 0.6 ? 2 : 1, v: hash2(i, j, 95) > 0.5 ? 1 : 0, dd: depth(x, y, rot) });
    }
    trees.sort((a, b) => a.dd - b.dd);
    for (const t of trees) {
      const s = treeSprite(k, t.s, t.v); const [sx, sy] = project(t.x, t.y, 0, rot, k);
      const dx = Math.round(sx - ox + s.x0), dy = Math.round(sy - oy + s.y0);
      if (dx > CHUNK || dy > CHUNK || dx + s.w < 0 || dy + s.h < 0) continue;
      g.drawImage(s.canvas, dx, dy);
    }
  }
  return cv;
}
