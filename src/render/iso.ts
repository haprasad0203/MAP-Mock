// 2:1 isometric projection, camera at the south-east looking north-west (rotation 0).
// World: metres, x east, y north.  Iso "buffer" units: k buffer-pixels per metre.
export type Rot = 0 | 1 | 2 | 3;
export const H_SCALE = 0.95; // vertical metres -> horizontal-equivalent

export function rotate(x: number, y: number, r: Rot): [number, number] {
  switch (r) { case 0: return [x, y]; case 1: return [-y, x]; case 2: return [-x, -y]; default: return [y, -x]; }
}
export function unrotate(u: number, v: number, r: Rot): [number, number] {
  switch (r) { case 0: return [u, v]; case 1: return [v, -u]; case 2: return [-u, -v]; default: return [-v, u]; }
}
/** World (x,y,z metres) -> buffer px at scale k. */
export function project(x: number, y: number, z: number, r: Rot, k: number): [number, number] {
  const [u, v] = rotate(x, y, r);
  return [(u + v) * k, ((u - v) * 0.5 - z * H_SCALE) * k];
}
/** Buffer px (ground plane) -> world. */
export function unproject(sx: number, sy: number, r: Rot, k: number): [number, number] {
  const a = sx / k, b = (2 * sy) / k; // a = u+v, b = u-v
  return unrotate((a + b) / 2, (a - b) / 2, r);
}
/** Painter's depth (bigger = nearer the camera). */
export function depth(x: number, y: number, r: Rot): number { const [u, v] = rotate(x, y, r); return u - v; }
/** Camera "towards viewer" direction in rotated coords is (1,-1). */
export function facesViewer(nu: number, nv: number) { return nu - nv > 1e-6; }

export const LEVELS = [0.16, 0.22, 0.32, 0.45, 0.64, 0.9, 1.3, 1.8, 2.6];
export type Tier = 'campus' | 'area' | 'building';
export function tierOf(k: number): Tier { return k < 0.3 ? 'campus' : k < 0.85 ? 'area' : 'building'; }
