// Ground: the terrain mesh and its colour texture, baked from the 1 m ground-class raster (world.mask).
import * as THREE from 'three';
import { G, HALF, SIZE, type WorldModel } from '../render/world';
import { hash2, valueNoise } from '../render/noise';
import type { Terrain } from './terrain';

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// [colour, noise strength]. Wild ground is split into campus meadow and forest floor below.
const CLASS: Record<number, [[number, number, number], number]> = {
  [G.LAWN]: [hex('#4F7F3D'), 0.1], [G.GARDEN]: [hex('#5A8742'), 0.1], [G.GROUND]: [hex('#4F7F3D'), 0.1],
  // roads and paths are drawn as crisp ribbons (roads.ts); the raster under them is only a soft verge
  [G.ROAD]: [hex('#8E9474'), 0.05], [G.ROAD_LINE]: [hex('#8E9474'), 0.05], [G.ROAD_DASH]: [hex('#8E9474'), 0.05],
  [G.SERVICE]: [hex('#8E9474'), 0.05], [G.ROAD_EDGE]: [hex('#95A070'), 0.06], [G.TRACK]: [hex('#A8A174'), 0.06],
  [G.PATH]: [hex('#A9A77E'), 0.05], [G.WATER]: [hex('#2A6F86'), 0.03], [G.COURT]: [hex('#2F8A6A'), 0.02],
  [G.COURT_BLUE]: [hex('#3E6FB8'), 0.02], [G.COURT_RED]: [hex('#B5564A'), 0.03], [G.EARTH]: [hex('#B07250'), 0.1],
  [G.PLAZA]: [hex('#C99484'), 0.05], [G.PARKING]: [hex('#7E858C'), 0.04], [G.BUILDING]: [hex('#CFC6B4'), 0.02],
  [G.COVERED]: [hex('#A9A77E'), 0.05],
};
const MEADOW = hex('#55773A'), FOREST = hex('#46692F'); // open campus ground is rough woodland floor and scrub (drone, 20 Nov), lawns are authored

/** Ground colour for the whole ±1300 m square. `size` = texture pixels per side (2600 = 1 m per pixel). */
export function bakeGroundTexture(world: WorldModel, size: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4), s = SIZE / size;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const mx = Math.min(SIZE - 1, Math.floor((i + 0.5) * s)), my = Math.min(SIZE - 1, Math.floor((j + 0.5) * s)), q = my * SIZE + mx;
    const c = world.mask[q], x = mx - HALF, y = my - HALF;
    let col: [number, number, number], amp: number;
    if (c === G.WILD) { col = world.inCampus[q] ? MEADOW : FOREST; amp = 0.14; } else [col, amp] = CLASS[c] ?? [MEADOW, 0.1];
    const edge = Math.min(i, j, size - 1 - i, size - 1 - j) * s; // fade the noise out at the border so the clamped edge is even
    const n = amp ? ((valueNoise(x / 46, y / 46, 3) - 0.5) * 1.2 + (valueNoise(x / 9, y / 9, 8) - 0.5) * 0.6 + (hash2(mx, my, 5) - 0.5) * 0.25) * amp * Math.min(1, edge / 80) : 0;
    const o = (j * size + i) * 4;
    data[o] = Math.max(0, Math.min(255, col[0] * (1 + n * 0.8))); data[o + 1] = Math.max(0, Math.min(255, col[1] * (1 + n))); data[o + 2] = Math.max(0, Math.min(255, col[2] * (1 + n * 0.6))); data[o + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}

/** Where each Phase 2 ground texture shows: R = lawn grass, G = pine forest floor, B = red-brick paving. Half the raster's resolution. */
export function bakeGroundWeights(world: WorldModel): THREE.DataTexture {
  const size = SIZE / 2, data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const q = (j * 2) * SIZE + i * 2, c = world.mask[q], o = (j * size + i) * 4;
    if (c === G.LAWN || c === G.GARDEN || c === G.GROUND) data[o] = 255;
    else if (c === G.WILD) { if (world.inCampus[q]) { data[o] = 70; data[o + 1] = 185; } else data[o + 1] = 255; }
    else if (c === G.PLAZA) data[o + 2] = 255;
    data[o + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}

/** Terrain material: the baked colour, with the lawn, forest-floor and brick textures laid over it where they belong. */
export function groundMaterial(colour: THREE.Texture, weights: THREE.Texture, tex: Record<string, THREE.Texture>): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ map: colour, roughness: 1, metalness: 0 });
  if (!tex.lawn || !tex.forestFloor || !tex.brick) return m;
  m.onBeforeCompile = sh => {
    sh.uniforms.uWeights = { value: weights }; sh.uniforms.uLawn = { value: tex.lawn }; sh.uniforms.uFloor = { value: tex.forestFloor }; sh.uniforms.uBrick = { value: tex.brick };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uWeights; uniform sampler2D uLawn; uniform sampler2D uFloor; uniform sampler2D uBrick;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec4 gw = texture2D(uWeights, vMapUv);
      vec2 wuv = vMapUv * ${SIZE.toFixed(1)};                                   // metres
      vec3 lawn = texture2D(uLawn, wuv / 18.0).rgb * vec3(0.72, 0.58, 0.48);   // deeper and warmer than the lime original
      vec3 floorC = texture2D(uFloor, wuv / 24.0).rgb * vec3(1.7, 1.9, 1.3);
      vec3 brick = texture2D(uBrick, wuv / 6.0).rgb * vec3(0.90, 0.80, 0.78);
      diffuseColor.rgb = mix(diffuseColor.rgb, lawn, gw.r * 0.72);
      diffuseColor.rgb = mix(diffuseColor.rgb, floorC, gw.g * 0.6);
      diffuseColor.rgb = mix(diffuseColor.rgb, brick, gw.b * 0.9);`);
  };
  return m;
}

const OUTER = 40;    // outer grid step (m)
const REACH = 3200;  // the world carries on this far, into the mist

export type SurfaceAt = (x: number, y: number) => number;
/** Height on a grid of quads split along the a-c diagonal, exactly as the mesh triangles are. */
function gridSurface(h: Float32Array, nx: number, ny: number, x0: number, y0: number, step: number, x: number, y: number): number {
  const u = (x - x0) / step, v = (y - y0) / step, i = Math.max(0, Math.min(nx - 2, Math.floor(u))), j = Math.max(0, Math.min(ny - 2, Math.floor(v)));
  const fu = Math.max(0, Math.min(1, u - i)), fv = Math.max(0, Math.min(1, v - j)), q = j * nx + i, a = h[q], b = h[q + 1], c = h[q + nx + 1], d = h[q + nx];
  return fu >= fv ? a + (b - a) * fu + (c - b) * fv : a + (c - d) * fu + (d - a) * fv;
}

/** Terrain mesh: a fine grid over the campus inside a coarse grid of hills. `step` = fine grid step (m), a divisor of 40.
 *  `surfaceAt` gives the height of the mesh itself, so ribbons and props sit exactly on it. */
export function buildTerrainGeometry(terrain: Terrain, step: number): { geometry: THREE.BufferGeometry; surfaceAt: SurfaceAt } {
  const f = terrain.fine, x0 = f.x0, y0 = f.y0, x1 = f.x0 + (f.nx - 1) * f.step, y1 = f.y0 + (f.ny - 1) * f.step;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const H = terrain.half, push = (x: number, y: number, h: number) => { pos.push(x, h, -y); uv.push((x + H) / (2 * H), (y + H) / (2 * H)); return pos.length / 3 - 1; };
  const lerpOuter = (x: number, y: number, alongX: boolean) => { // height on an outer-grid edge, so the two grids meet without cracks
    const v = alongX ? x : y, a = Math.floor(v / OUTER) * OUTER, t = (v - a) / OUTER; if (t < 1e-6) return terrain.heightAt(x, y);
    return alongX ? terrain.heightAt(a, y) * (1 - t) + terrain.heightAt(a + OUTER, y) * t : terrain.heightAt(x, a) * (1 - t) + terrain.heightAt(x, a + OUTER) * t;
  };
  // fine grid
  const nx = Math.round((x1 - x0) / step) + 1, ny = Math.round((y1 - y0) / step) + 1, base = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * step, y = y0 + j * step;
    const h = j === 0 || j === ny - 1 ? lerpOuter(x, y, true) : i === 0 || i === nx - 1 ? lerpOuter(x, y, false) : terrain.heightAt(x, y);
    push(x, y, h);
  }
  for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) { const a = base + j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx; idx.push(a, b, c, a, c, d); }
  // coarse grid around it
  const n = Math.round((2 * REACH) / OUTER) + 1, ob = pos.length / 3;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -REACH + i * OUTER, y = -REACH + j * OUTER; push(x, y, terrain.heightAt(x, y)); }
  for (let j = 0; j + 1 < n; j++) for (let i = 0; i + 1 < n; i++) {
    const x = -REACH + i * OUTER, y = -REACH + j * OUTER;
    if (x >= x0 && x + OUTER <= x1 && y >= y0 && y + OUTER <= y1) continue; // covered by the fine grid
    const a = ob + j * n + i, b = a + 1, c = a + n + 1, d = a + n; idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const fineH = new Float32Array(nx * ny), outerH = new Float32Array(n * n);
  for (let q = 0; q < nx * ny; q++) fineH[q] = pos[q * 3 + 1];
  for (let q = 0; q < n * n; q++) outerH[q] = pos[(ob + q) * 3 + 1];
  const surfaceAt: SurfaceAt = (x, y) => (x >= x0 && x <= x1 && y >= y0 && y <= y1 ? gridSurface(fineH, nx, ny, x0, y0, step, x, y) : gridSurface(outerH, n, n, -REACH, -REACH, OUTER, x, y));
  return { geometry: g, surfaceAt };
}
