// Phase 3S: the approved Phase 2 renders, used as the buildings on the map (reference/style/LANDMARK_SPRITES.md).
// Each sprite is an upright quad that stands on the ground at the front edge of its picture and faces the fixed camera,
// stretched in height so that it shows undistorted from the map's pitch. The picture's anchor point lands exactly on
// the building's footprint centre. Positions, entrances and hit areas still come from campus-layout.json.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import type { Building } from '../geo/types';
import { PITCH, azimuth } from './camera';

export interface SpriteDef {
  file: string; buildingId?: string; placed?: boolean;
  anchorPx?: XY; metresPerPx?: number; offset?: XY; tint?: number;
}
export interface SpriteSize { w: number; h: number; trim: XY }
export interface LoadedSprite { id: string; def: SpriteDef; size: SpriteSize; tex: THREE.Texture; alpha: { w: number; h: number; data: Uint8Array } }

const D2R = Math.PI / 180;
const url = (id: string, big = false) => `/campus-art/tycoon/sprites/${id}${big ? '@2x' : ''}.webp`;

/** Sprites marked `placed` in sprites.json whose cut-out exists. A sprite that fails to load is skipped (its 3D model is drawn instead). */
export async function loadSprites(): Promise<LoadedSprite[]> {
  try {
    const [cfg, manifest] = await Promise.all([fetch('/data/sprites.json').then(r => r.json()), fetch('/campus-art/tycoon/sprites/manifest.json').then(r => r.json())]);
    const out: LoadedSprite[] = [];
    await Promise.all(Object.entries(cfg.sprites as Record<string, SpriteDef>).map(async ([id, def]) => {
      if (!def.placed || !def.buildingId || !def.anchorPx || !def.metresPerPx || !manifest[id]) return;
      try {
        const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url(id); });
        const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
        // a small copy of the alpha channel, so a tap can be tested against the visible picture
        const aw = 256, ah = Math.max(1, Math.round((256 * img.height) / img.width)), c = document.createElement('canvas'); c.width = aw; c.height = ah;
        const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0, aw, ah);
        const px = g.getImageData(0, 0, aw, ah).data, data = new Uint8Array(aw * ah); for (let i = 0; i < aw * ah; i++) data[i] = px[i * 4 + 3];
        out.push({ id, def, size: manifest[id], tex, alpha: { w: aw, h: ah, data } });
      } catch { /* missing cut-out: keep the 3D model */ }
    }));
    return out;
  } catch { return []; }
}

export interface PlacedSprite {
  id: string; buildingId: string; group: THREE.Group; top: number; centre: XY;
  /** Ground the picture covers: trees and props are cleared inside this circle, and the terrain is levelled under `pad`. */
  clear: { c: XY; r: number }; pad: XY[];
  setState(mode: 'hi' | 'dim' | null): void;
  /** Is the picture opaque under this point? `project` maps a world point (x, y, absolute height) to CSS pixels. */
  hit(px: number, py: number, project: (x: number, y: number, h: number) => XY): boolean;
  useBig(): void;
}

/** Geometry of a sprite on the ground, for the camera's fixed direction (rot 0). */
export function spriteLayout(s: { def: SpriteDef; size: SpriteSize }, b: Building) {
  const def = s.def, mpp = def.metresPerPx!, g = b.groundElev ?? 0, az = azimuth(0), p = PITCH * D2R;
  const cam: XY = [Math.cos(az), Math.sin(az)], right: XY = [-cam[1], cam[0]];          // towards the camera, and screen-right, on the ground
  let sx = 0, sy = 0, sw = 0; for (const q of b.parts) { const w = q.w * q.d; sx += q.cx * w; sy += q.cy * w; sw += w; }
  const centre: XY = [sx / sw + (def.offset?.[0] ?? 0), sy / sw + (def.offset?.[1] ?? 0)];
  const ax = def.anchorPx![0] - s.size.trim[0], ay = def.anchorPx![1] - s.size.trim[1], W = s.size.w * mpp;
  const front = ((s.size.h - ay) * mpp) / Math.sin(p);                                    // the picture's bottom edge meets the ground this far in front of the anchor
  const base: XY = [centre[0] + cam[0] * front + right[0] * (s.size.w / 2 - ax) * mpp, centre[1] + cam[1] * front + right[1] * (s.size.w / 2 - ax) * mpp];
  const H = (s.size.h * mpp) / Math.cos(p);                                               // stretched, so it reads true from the map's pitch
  const back = Math.min(60, (ay * mpp) / Math.sin(p) * 0.35);
  const corner = (r: number, f: number): XY => [base[0] + right[0] * r - cam[0] * f, base[1] + right[1] * r - cam[1] * f];
  const pad = [corner(-W / 2, -2), corner(W / 2, -2), corner(W / 2, front + back), corner(-W / 2, front + back)];
  const mid = corner(0, front / 2);
  return { g, cam, right, centre, base, W, H, front, pad, clear: { c: mid, r: Math.max(W * 0.5, front * 0.6) + 4 }, top: g + (ay * mpp) / Math.cos(p) };
}

function shadowTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64); grad.addColorStop(0, 'rgba(20,28,40,0.55)'); grad.addColorStop(0.6, 'rgba(20,28,40,0.28)'); grad.addColorStop(1, 'rgba(20,28,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
let shadowTex: THREE.Texture | null = null;

export function placeSprite(s: LoadedSprite, b: Building): PlacedSprite {
  const L = spriteLayout(s, b), group = new THREE.Group(); group.name = `sprite:${s.id}`;
  const quad = (out: number, grow: number) => {
    const w = (L.W / 2) * grow, bx = L.base[0] - L.cam[0] * out, by = L.base[1] - L.cam[1] * out, h0 = L.g - (grow - 1) * L.H * 0.5, h1 = L.g + L.H * (1 + (grow - 1) * 0.5);
    const geo = new THREE.BufferGeometry();
    const P = (r: number, h: number) => [bx + L.right[0] * r, h, -(by + L.right[1] * r)];
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...P(-w, h0), ...P(w, h0), ...P(w, h1), ...P(-w, h1)], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); geo.setIndex([0, 1, 2, 0, 2, 3]);
    return geo;
  };
  const tint = s.def.tint ?? 1;
  // unlit: the picture carries its own light and shade. It goes through the scene's tone mapping and grade like everything else.
  const mat = new THREE.MeshBasicMaterial({ map: s.tex, alphaTest: 0.5, side: THREE.DoubleSide }); mat.color.setScalar(tint);
  const mesh = new THREE.Mesh(quad(0, 1), mat); mesh.name = 'sprite'; mesh.renderOrder = 2;
  // selection: a yellow copy just behind and slightly larger shows as a glow round the picture's edge
  const glowMat = new THREE.MeshBasicMaterial({ map: s.tex, alphaTest: 0.5, color: new THREE.Color('#FFD23F').multiplyScalar(2.2), side: THREE.DoubleSide });
  glowMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = diffuse;'); }; // flat colour, picture's alpha
  const glow = new THREE.Mesh(quad(0.6, 1.035), glowMat); glow.visible = false; glow.renderOrder = 1;
  // soft contact shadow on the ground, pushed away from the sun (the sun is on the camera's left)
  shadowTex ??= shadowTexture();
  const sw = L.W * 0.5, sd = L.front * 0.7 + 8, c: XY = [L.centre[0] + L.right[0] * 4 + L.cam[0] * (L.front * 0.5), L.centre[1] + L.right[1] * 4 + L.cam[1] * (L.front * 0.5)];
  const sg = new THREE.BufferGeometry(), S = (r: number, f: number) => [c[0] + L.right[0] * r + L.cam[0] * f, L.g + 0.22, -(c[1] + L.right[1] * r + L.cam[1] * f)];
  sg.setAttribute('position', new THREE.Float32BufferAttribute([...S(-sw, sd / 2), ...S(sw, sd / 2), ...S(sw, -sd / 2), ...S(-sw, -sd / 2)], 3));
  sg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); sg.setIndex([0, 1, 2, 0, 2, 3]);
  const shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.4, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
  shadow.renderOrder = 1;
  group.add(shadow, glow, mesh);
  let big = false;
  return {
    id: s.id, buildingId: b.id, group, top: L.top, centre: L.centre, clear: L.clear, pad: L.pad,
    setState(mode) { glow.visible = mode === 'hi'; mat.color.setScalar(mode === 'dim' ? tint * 0.42 : tint); },
    hit(px, py, project) {
      const o = project(L.base[0] - L.right[0] * L.W / 2, L.base[1] - L.right[1] * L.W / 2, L.g), r = project(L.base[0] + L.right[0] * L.W / 2, L.base[1] + L.right[1] * L.W / 2, L.g);
      const t = project(L.base[0] - L.right[0] * L.W / 2, L.base[1] - L.right[1] * L.W / 2, L.g + L.H);
      const ux = r[0] - o[0], uy = r[1] - o[1], vx = t[0] - o[0], vy = t[1] - o[1], det = ux * vy - uy * vx; if (Math.abs(det) < 1e-6) return false;
      const dx = px - o[0], dy = py - o[1], u = (dx * vy - dy * vx) / det, v = (ux * dy - uy * dx) / det;
      if (u < 0 || u > 1 || v < 0 || v > 1) return false;
      const a = s.alpha; return a.data[Math.min(a.h - 1, Math.floor((1 - v) * a.h)) * a.w + Math.min(a.w - 1, Math.floor(u * a.w))] > 128;
    },
    useBig() { // full-size picture when zoomed in
      if (big) return; big = true;
      new THREE.TextureLoader().load(url(s.id, true), t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; mat.map = t; glowMat.map = t; mat.needsUpdate = true; });
    },
  };
}
