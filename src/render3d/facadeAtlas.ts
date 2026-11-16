// Phase 3M: facade atlases cut from the approved renders (scripts/extract-facades.mjs → public/data/facades.json).
// loadTextures() fills ATLASES before any building is built; with no atlas (tests, a failed load) the landmark
// modules fall back to their procedural walls.

/** One piece of an atlas: its pixel rectangle and its real size in metres. */
export interface Region { x: number; y: number; w: number; h: number; wm: number; hm: number; kind: 'strip' | 'piece' | 'tile'; type?: string }
export interface Atlas { id: string; file: string; w: number; h: number; roofHex: string | null; colours: Record<string, string>; regions: Record<string, Region> }

export const ATLASES: Record<string, Atlas> = {};

/** Material key of a building's atlas. */
export const facadeKey = (id: string) => `facade:${id}`;

/** uv rectangle of a region: [u0, v0 (bottom), u1, v1 (top)], half a texel inside so neighbours never bleed in. */
export function uvOf(A: Atlas, r: Region): [number, number, number, number] {
  return [(r.x + 0.5) / A.w, 1 - (r.y + r.h - 0.5) / A.h, (r.x + r.w - 0.5) / A.w, 1 - (r.y + 0.5) / A.h];
}
