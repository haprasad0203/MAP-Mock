// The sky entrance (Lovable brief section 4): soft clouds while the campus loads (no spinner), then, as the 3D engine
// drops the camera from the sky, the clouds part and thin out. Plays once per session; a tap skips it.
import { forwardRef, useImperativeHandle, useRef } from 'react';

/** Should this open play the sky entrance? Not with reduced motion, a deep link, a dev camera or a saved view. */
export function wantsIntro(): boolean {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const qs = new URLSearchParams(location.search);
    if (qs.get('intro') === '1') return true; // dev: force it
    if (['view', 'place', 'room', 'route', 'cam', 'list', 'model', 'q'].some(k => qs.has(k))) return false;
    if (sessionStorage.getItem('campus.intro') === '1' || sessionStorage.getItem('campus.view')) return false;
    return true;
  } catch { return false; }
}
export function markIntroPlayed() { try { sessionStorage.setItem('campus.intro', '1'); } catch { /* private mode */ } }

// cloud puffs: position (vw/vh from the centre), size (vmax) and the way each one leaves (dx, dy in vw)
const PUFFS = [
  [-30, -28, 70, -95, -60], [26, -32, 74, 95, -70], [-38, 18, 80, -110, 50], [34, 22, 78, 105, 60],
  [0, -40, 64, 10, -110], [2, 38, 70, -10, 115], [-12, -6, 60, -70, -20], [14, 6, 62, 75, 25],
  [-48, -4, 58, -120, 0], [50, -2, 60, 120, 5], [-20, 34, 54, -60, 95], [22, -18, 56, 65, -85],
] as const;

export interface SkyIntroHandle { progress(u: number): void }

const SkyIntro = forwardRef<SkyIntroHandle, { onSkip: () => void }>(function SkyIntro({ onSkip }, ref) {
  const el = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({
    progress(u: number) {
      const e = el.current; if (!e) return;
      const s = (a: number, b: number) => { const x = Math.max(0, Math.min(1, (u - a) / (b - a))); return x * x * (3 - 2 * x); };
      e.style.setProperty('--part', String(s(0.02, 0.6)));  // the clouds slide apart
      e.style.setProperty('--thin', String(1 - s(0.12, 0.62))); // and thin out
      e.style.setProperty('--sky', String(1 - s(0, 0.3)));      // the plain sky behind them goes first
      e.classList.add('dropping');
    },
  }), []);
  return (
    <div ref={el} className="sky-intro" onPointerDown={onSkip} aria-hidden="true">
      <div className="sky-intro-sky" />
      {PUFFS.map(([x, y, s, dx, dy], i) => (
        <div key={i} className="sky-puff" style={{ left: `calc(50% + ${x}vw)`, top: `calc(50% + ${y}vh)`, width: `${s}vmax`, height: `${s * 0.62}vmax`, ['--dx' as string]: `${dx}vw`, ['--dy' as string]: `${dy}vh`, animationDelay: `${-i * 1.7}s` }} />
      ))}
    </div>
  );
});
export default SkyIntro;
