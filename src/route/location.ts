// Live location (Phase 3B): the browser's watchPosition, asked for only when the delegate taps Locate or Directions.
// Readings are smoothed (exponential smoothing weighted by accuracy) and converted to local metres. A dev-only simulator
// (?simgps=1) replaces the GPS: tap the map to put yourself somewhere, or walk the current route at a brisk pace.
import { toLocal, type XY } from '../geo/grid';

export interface Fix { at: XY; accuracy: number; heading?: number; sim?: boolean }
export type FixListener = (f: Fix | null, err?: string) => void;

export const simEnabled = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('simgps') === '1';

/** Exponential smoothing: a precise reading moves the estimate more than a vague one. */
export function smooth(prev: Fix | null, next: Fix): Fix {
  if (!prev) return next;
  const k = Math.max(0.15, Math.min(0.85, prev.accuracy / (prev.accuracy + next.accuracy)));
  const at: XY = [prev.at[0] + (next.at[0] - prev.at[0]) * k, prev.at[1] + (next.at[1] - prev.at[1]) * k];
  const dx = at[0] - prev.at[0], dy = at[1] - prev.at[1], moved = Math.hypot(dx, dy);
  const heading = next.heading ?? (moved > 1.5 ? ((90 - (Math.atan2(dy, dx) * 180) / Math.PI) + 360) % 360 : prev.heading);
  return { at, accuracy: Math.max(3, prev.accuracy * (1 - k) + next.accuracy * k), heading, sim: next.sim };
}

export class LocationSource {
  private id: number | null = null; private last: Fix | null = null; private listeners = new Set<FixListener>();
  private walkTimer: number | null = null;
  readonly sim = simEnabled();
  get fix() { return this.last; }
  get running() { return this.id !== null || (this.sim && !!this.last); }
  on(f: FixListener) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private emit(f: Fix | null, err?: string) { this.last = f; for (const l of this.listeners) l(f, err); }
  /** Start watching. Resolves once watching has started (the first fix arrives through the listener). */
  start() {
    if (this.sim || this.id !== null) return;
    if (!('geolocation' in navigator)) { this.emit(null, 'This browser has no location service.'); return; }
    this.id = navigator.geolocation.watchPosition(
      p => this.emit(smooth(this.last, { at: toLocal(p.coords.latitude, p.coords.longitude), accuracy: p.coords.accuracy, heading: p.coords.heading ?? undefined })),
      e => this.emit(this.last, e.code === e.PERMISSION_DENIED ? 'Location is off for this site. You can pick a start point on the map instead.' : 'No location fix yet.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
  }
  stop() { if (this.id !== null) navigator.geolocation.clearWatch(this.id); this.id = null; this.stopWalk(); }
  // ---- simulator ----
  /** Put the simulated delegate at a point (also used for "pick a start point" without GPS). */
  set(at: XY, sim = true) { this.stopWalk(); this.emit({ at, accuracy: sim ? 5 : 15, sim }); }
  /** Walk a polyline at `speed` m/s (simulated), reporting a fix every 250 ms. */
  walk(pts: XY[], speed = 6, onDone?: () => void) {
    this.stopWalk(); if (pts.length < 2) return;
    let i = 0, t = 0;
    this.walkTimer = window.setInterval(() => {
      let step = speed * 0.25;
      while (step > 0 && i + 1 < pts.length) {
        const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, left = L * (1 - t);
        if (step < left) { t += step / L; step = 0; } else { step -= left; i++; t = 0; }
      }
      if (i + 1 >= pts.length) { this.emit({ at: pts[pts.length - 1], accuracy: 5, sim: true }); this.stopWalk(); onDone?.(); return; }
      const a = pts[i], b = pts[i + 1], at: XY = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      this.emit({ at, accuracy: 5, heading: ((90 - (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI) + 360) % 360, sim: true });
    }, 250);
  }
  stopWalk() { if (this.walkTimer !== null) clearInterval(this.walkTimer); this.walkTimer = null; }
}
