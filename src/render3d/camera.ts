// Camera maths for the 3D map: a narrow perspective lens that reads almost isometric.
// World: x east, y north, h up (metres). Three.js: X = x, Y = h, Z = -y.
import * as THREE from 'three';
import type { XY } from '../geo/grid';

export const FOV = 22;      // degrees, vertical
export const PITCH = 40;    // degrees down from the horizon (SCENE_LOOK row 1: low, oblique, like the reference)
const D2R = Math.PI / 180;

/** Screen pixels per ground metre at zoom k: the same scale the 2D engine shows at that k. */
export const pxPerMetre = (k: number) => 2 * Math.SQRT2 * k;
export function distanceFor(k: number, viewH: number): number { return viewH / (2 * Math.tan((FOV * D2R) / 2) * pxPerMetre(k)); }
export function kFor(distance: number, viewH: number): number { return viewH / (2 * Math.tan((FOV * D2R) / 2) * distance * 2 * Math.SQRT2); }

/** Compass direction (radians, from east, CCW) from the target to the camera. rot 0 = camera in the south-east, like the 2D map. */
export const azimuth = (rot: number) => (-45 - 90 * rot) * D2R;

export const toThree = (x: number, y: number, h: number) => new THREE.Vector3(x, h, -y);

export interface Pose { cx: number; cy: number; h: number; k: number; rot: number }
/** Place `cam` for a view centred on (cx, cy) at ground height h. */
export function applyPose(cam: THREE.PerspectiveCamera, p: Pose, viewW: number, viewH: number) {
  const D = distanceFor(p.k, viewH), az = azimuth(p.rot), cp = Math.cos(PITCH * D2R), sp = Math.sin(PITCH * D2R);
  cam.fov = FOV; cam.aspect = viewW / Math.max(1, viewH);
  cam.near = Math.max(5, D * 0.15); cam.far = D * 2.5 + 9000;
  cam.position.set(p.cx + D * cp * Math.cos(az), p.h + D * sp, -(p.cy + D * cp * Math.sin(az)));
  cam.up.set(0, 1, 0); cam.lookAt(p.cx, p.h, -p.cy);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  return D;
}

const _v = new THREE.Vector3(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
/** Ray through a CSS-pixel point: origin and unit direction in Three.js space. */
export function screenRay(cam: THREE.PerspectiveCamera, px: number, py: number, viewW: number, viewH: number) {
  _o.setFromMatrixPosition(cam.matrixWorld);
  _d.set((px / viewW) * 2 - 1, -(py / viewH) * 2 + 1, 0.5).unproject(cam).sub(_o).normalize();
  return { o: _o, d: _d };
}
/** Where a screen point meets the horizontal plane at height h. */
export function screenToPlane(cam: THREE.PerspectiveCamera, px: number, py: number, viewW: number, viewH: number, h: number): XY {
  const { o, d } = screenRay(cam, px, py, viewW, viewH);
  const t = Math.abs(d.y) < 1e-6 ? 0 : (h - o.y) / d.y;
  return [o.x + d.x * t, -(o.z + d.z * t)];
}
/** Where a screen point meets the terrain (ray march + bisection on heightAt). */
export function screenToGround(cam: THREE.PerspectiveCamera, px: number, py: number, viewW: number, viewH: number, heightAt: (x: number, y: number) => number, hGuess: number): XY {
  const { o, d } = screenRay(cam, px, py, viewW, viewH);
  if (d.y > -1e-4) return screenToPlane(cam, px, py, viewW, viewH, hGuess);
  const above = (t: number) => o.y + d.y * t - heightAt(o.x + d.x * t, -(o.z + d.z * t));
  const tEnd = (hGuess - 200 - o.y) / d.y; let t0 = Math.max(0, (hGuess + 200 - o.y) / d.y), t1 = t0;
  const step = Math.max(4, (tEnd - t0) / 160);
  if (above(t0) <= 0) t0 = 0;
  for (t1 = t0 + step; t1 <= tEnd; t1 += step) { if (above(t1) <= 0) break; t0 = t1; }
  if (t1 > tEnd) return screenToPlane(cam, px, py, viewW, viewH, hGuess);
  for (let i = 0; i < 14; i++) { const m = (t0 + t1) / 2; if (above(m) > 0) t0 = m; else t1 = m; }
  const t = (t0 + t1) / 2; return [o.x + d.x * t, -(o.z + d.z * t)];
}
/** CSS-pixel position of a world point (h = absolute height). */
export function worldToScreen(cam: THREE.PerspectiveCamera, x: number, y: number, h: number, viewW: number, viewH: number): XY {
  _v.set(x, h, -y).project(cam);
  return [(_v.x + 1) * 0.5 * viewW, (1 - _v.y) * 0.5 * viewH];
}
