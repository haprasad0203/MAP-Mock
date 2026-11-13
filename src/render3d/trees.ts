// Instanced low-poly trees: two pines and a broadleaf. Campus trees come from the world model;
// the forest outside the boundary is seeded from noise on wild ground, thinned to a budget.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import { G, HALF, SIZE, type WorldModel } from '../render/world';
import { fbm, hash2 } from '../render/noise';

interface Geo { pos: number[]; nor: number[]; col: number[] }
const C = (hex: string) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b] as [number, number, number]; };

function cone(g: Geo, r: number, y0: number, y1: number, n: number, c0: [number, number, number], c1: [number, number, number], turn = 0) {
  const up = y1 > y0, sl = r / Math.abs(y1 - y0);
  for (let k = 0; k < n; k++) {
    const a0 = turn + (k / n) * Math.PI * 2, a1 = turn + ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    const p0 = [Math.cos(a0) * r, y0, Math.sin(a0) * r], p1 = [Math.cos(a1) * r, y0, Math.sin(a1) * r], ap = [0, y1, 0];
    const nrm = (a: number) => { const v = new THREE.Vector3(Math.cos(a), up ? sl : -sl, Math.sin(a)).normalize(); return [v.x, v.y, v.z]; };
    const tri = up ? [[p0, nrm(a0), c0], [ap, nrm(am), c1], [p1, nrm(a1), c0]] : [[p0, nrm(a0), c0], [p1, nrm(a1), c0], [ap, nrm(am), c1]];
    for (const [p, nn, c] of tri) { g.pos.push(...p); g.nor.push(...nn); g.col.push(...c); }
  }
}
function trunk(g: Geo, r: number, h: number, c: [number, number, number]) {
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * Math.PI * 2, a1 = ((k + 1) / 4) * Math.PI * 2, am = (a0 + a1) / 2, n = [Math.cos(am), 0, Math.sin(am)];
    const b0 = [Math.cos(a0) * r, -1.5, Math.sin(a0) * r], b1 = [Math.cos(a1) * r, -1.5, Math.sin(a1) * r], t0 = [b0[0] * 0.7, h, b0[2] * 0.7], t1 = [b1[0] * 0.7, h, b1[2] * 0.7];
    for (const p of [b0, t0, t1, b0, t1, b1]) { g.pos.push(...p); g.nor.push(...n); g.col.push(...c); }
  }
}
function finish(g: Geo): THREE.BufferGeometry {
  const b = new THREE.BufferGeometry();
  b.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3)); b.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3)); b.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
  return b;
}
function variants(): THREE.BufferGeometry[] {
  const bark = C('#6B4A32'), d = C('#2B6E3E'), m = C('#3F8F4C'), l = C('#62AE5E'), bl = C('#7DBB55'), bd = C('#4F9443');
  const tall: Geo = { pos: [], nor: [], col: [] }; trunk(tall, 0.4, 6, bark);
  cone(tall, 3.3, 4, 10.5, 6, d, m); cone(tall, 2.5, 8.2, 14, 6, d, m, 0.5); cone(tall, 1.6, 12, 17.5, 5, m, l, 0.2);
  const mid: Geo = { pos: [], nor: [], col: [] }; trunk(mid, 0.36, 4, bark);
  cone(mid, 3.7, 2.6, 8.4, 6, d, m); cone(mid, 2.6, 6.3, 12.6, 6, m, l, 0.6);
  const leaf: Geo = { pos: [], nor: [], col: [] }; trunk(leaf, 0.34, 4.2, bark);
  cone(leaf, 3.5, 5.6, 10, 7, bd, bl); cone(leaf, 3.5, 5.6, 3, 7, bd, bd);
  return [finish(tall), finish(mid), finish(leaf)];
}

export interface TreeSpot { x: number; y: number; s: number; v: number }

/** Forest outside the campus: wild ground, in noise-shaped groves, clear of the village houses. At most `budget` trees. */
export function forestSpots(world: WorldModel, houses: { p: XY[] }[], budget: number): TreeSpot[] {
  const CELL = 4, n = Math.ceil(SIZE / CELL), occ = new Uint8Array(n * n);
  for (const hs of houses) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of hs.p) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let j = Math.floor((minY - 3 + HALF) / CELL); j <= Math.floor((maxY + 3 + HALF) / CELL); j++) for (let i = Math.floor((minX - 3 + HALF) / CELL); i <= Math.floor((maxX + 3 + HALF) / CELL); i++)
      if (i >= 0 && j >= 0 && i < n && j < n) occ[j * n + i] = 1;
  }
  const cand: (TreeSpot & { w: number })[] = []; let sum = 0;
  const [ccx, ccy] = world.centre, STEP = 8, lim = HALF - 6;
  const clear = (x: number, y: number) => { // wild ground with a little room around the trunk
    for (const [dx, dy] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) { const q = Math.floor(y + dy + HALF) * SIZE + Math.floor(x + dx + HALF); if (world.mask[q] !== G.WILD) return false; }
    return true;
  };
  for (let gy = -lim; gy < lim; gy += STEP) for (let gx = -lim; gx < lim; gx += STEP) {
    const x = gx + hash2(gx, gy, 51) * (STEP - 1), y = gy + hash2(gx, gy, 52) * (STEP - 1);
    const q = Math.floor(y + HALF) * SIZE + Math.floor(x + HALF);
    if (world.inCampus[q] || !clear(x, y)) continue;
    if (occ[Math.floor((y + HALF) / CELL) * n + Math.floor((x + HALF) / CELL)]) continue;
    if (fbm(x / 170, y / 170, 3, 23) < 0.4) continue; // clearings
    const dist = Math.hypot(x - ccx, y - ccy), w = 1 / (1 + (dist / 800) ** 2);
    cand.push({ x, y, s: 0.8 + hash2(gx, gy, 53) * 0.55, v: hash2(gx, gy, 54), w }); sum += w;
  }
  if (cand.length <= budget) return cand;
  return cand.filter((c, i) => hash2(i, 7, 55) < (budget * c.w) / sum);
}

export interface TreeSet { group: THREE.Group; time: { value: number }; count: number; setFraction(f: number): void }

/** Instanced trees for a list of spots. `pineShare`: how many are pines rather than broadleaf. */
export function buildTrees(spots: TreeSpot[], heightAt: (x: number, y: number) => number, pineShare: number, name: string): TreeSet {
  const geos = variants(), time = { value: 0 };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = sh => { // gentle sway, more at the top
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.07 + instanceMatrix[3].z * 0.05;
        float bend = max(0.0, transformed.y) * max(0.0, transformed.y) * 0.0016;
        transformed.x += sin(uTime * 1.2 + ph) * bend; transformed.z += cos(uTime * 0.9 + ph * 1.3) * bend * 0.6;
      #endif`);
  };
  const lists: TreeSpot[][] = [[], [], []];
  for (const t of spots) lists[t.v < pineShare * 0.55 ? 0 : t.v < pineShare ? 1 : 2].push(t);
  const group = new THREE.Group(); group.name = name;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color(), meshes: THREE.InstancedMesh[] = [];
  lists.forEach((list, vi) => {
    if (!list.length) return;
    // random order, so drawing only a fraction thins the forest evenly
    list.sort((a, b) => hash2(Math.round(a.x * 3), Math.round(a.y * 3), 63) - hash2(Math.round(b.x * 3), Math.round(b.y * 3), 63));
    const im = new THREE.InstancedMesh(geos[vi], mat, list.length);
    list.forEach((t, i) => {
      const r = hash2(Math.round(t.x * 3), Math.round(t.y * 3), 61), w = t.s * (0.88 + r * 0.26);
      q.setFromAxisAngle(up, r * Math.PI * 2);
      m4.compose(new THREE.Vector3(t.x, heightAt(t.x, t.y), -t.y), q, new THREE.Vector3(w, t.s, w)); im.setMatrixAt(i, m4);
      const k = 0.82 + hash2(Math.round(t.x), Math.round(t.y), 62) * 0.36; col.setRGB(k * (0.94 + r * 0.14), k, k * (0.9 + r * 0.1)); im.setColorAt(i, col);
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.userData.full = list.length;
    group.add(im); meshes.push(im);
  });
  return {
    group, time, count: spots.length,
    setFraction(f: number) { for (const m of meshes) m.count = Math.max(1, Math.round(m.userData.full * Math.max(0, Math.min(1, f)))); },
  };
}
