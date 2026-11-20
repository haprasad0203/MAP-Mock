import type { XY } from '../geo/grid';
import type { Category } from '../geo/types';
import type { Rot, Tier } from './iso';

/** `level` indexes LEVELS (iso.ts). The 3D engine also stores the exact zoom in `k`. */
export interface View { cx: number; cy: number; level: number; rot: Rot; k?: number }
export interface Pin { id: string; at: XY; label: string; kind: 'place' | 'landmark'; category: Category; priority: 1 | 2 | 3 }
export interface Hit { buildingId?: string; at: XY }
export interface EngineOptions {
  onSelect?: (hit: Hit | null) => void;
  onView?: (v: View & { tier: Tier }) => void;
  /** 3D only: the engine lowered its own quality tier because frames were slow. */
  onQuality?: (q: 'high' | 'medium' | 'low') => void;
  /** 3D only: open with the sky entrance (camera drops through the clouds and settles). `onIntro(u)` reports progress 0..1. */
  intro?: boolean;
  onIntro?: (u: number) => void;
}
export interface Layers { labels: boolean; illustrated: boolean; trees: boolean }

/** What CampusPage needs from a map engine. MapEngine (2D pixel) and Engine3D (tycoon) both implement it. */
export interface IMapEngine {
  readonly kind: '2d' | '3d';
  view: View;
  pins: Pin[];
  filter: Category | 'all';
  selected: string | null;
  readonly tier: Tier;
  invalidate(): void;
  setFilter(f: Category | 'all'): void;
  setSelected(id: string | null): void;
  setLayers(l: Partial<Layers>): void;
  rotate(dir?: 1 | -1): void;
  recentre(): void;
  flyTo(at: XY, level?: number, ms?: number, fx?: number, fy?: number): void;
  zoomBy(f: number, anchor?: XY): void;
  screenToWorld(px: number, py: number): XY;
  worldToScreen(x: number, y: number, z?: number): XY;
  hitTest(px: number, py: number): Hit | null;
  destroy(): void;
  // ---- 3D only ----
  quality?: 'high' | 'medium' | 'low';
  setQuality?(q: 'high' | 'medium' | 'low'): void;
  /** Hooks for later phases: walking route, live position, buildings with a session on now. */
  setRoute?(pts: XY[] | null): void;
  setUser?(u: { at: XY; accuracy: number; heading?: number } | null): void;
  setOnAir?(buildingIds: string[]): void;
}
