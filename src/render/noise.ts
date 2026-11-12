// Deterministic hash + value noise (no deps).
export function hash2(x: number, y: number, seed = 1337): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t: number) => t * t * (3 - 2 * t);
export function valueNoise(x: number, y: number, seed = 7): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  const u = fade(xf), v = fade(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, y: number, oct = 4, seed = 7): number {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * valueNoise(x * f, y * f, seed + i * 31); a *= 0.5; f *= 2; }
  return s / (1 - Math.pow(0.5, oct));
}
/** Terrain height (m) for hill shading only: rolling hills that rise away from the campus. */
export function terrain(x: number, y: number): number {
  const d = Math.hypot(x + 80, y - 40);
  return fbm(x / 260, y / 260, 4, 11) * 70 + Math.min(1, d / 900) * 35;
}
