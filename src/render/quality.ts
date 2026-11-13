// Which map to draw: the 3D map at one of three quality tiers, or the 2D pixel map as the fallback.
// No Three.js imports here: this file is loaded before the 3D engine is.
export type Quality = 'high' | 'medium' | 'low';
export type QualityChoice = 'auto' | Quality | '2d';
const KEY = 'campus.quality';
const isChoice = (v: unknown): v is QualityChoice => v === 'auto' || v === 'high' || v === 'medium' || v === 'low' || v === '2d';

/** `?q=high|medium|low|2d` wins, then the saved choice from the Layers panel, else automatic. */
export function currentChoice(): QualityChoice {
  const q = new URLSearchParams(location.search).get('q'); if (isChoice(q)) return q;
  try { const s = localStorage.getItem(KEY); if (isChoice(s)) return s; } catch { /* storage blocked */ }
  return 'auto';
}
export function saveChoice(c: QualityChoice) { try { localStorage.setItem(KEY, c); } catch { /* storage blocked */ } }

export function webgl2Available(): boolean {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
export const isPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 820;

/** Starting tier when the choice is automatic. The engine steps down by itself if frames are slow. */
export function autoQuality(): Quality {
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8, cores = navigator.hardwareConcurrency ?? 8;
  if (isPhone()) return mem <= 2 || cores <= 4 ? 'low' : 'medium';
  return mem <= 4 || cores <= 4 ? 'medium' : 'high';
}
export const lower = (q: Quality): Quality | null => (q === 'high' ? 'medium' : q === 'medium' ? 'low' : null);
