// 3D tycoon-style campus map (Three.js). Same public API as the 2D MapEngine (see render/engineApi.ts).
// World: x east, y north, metres. Positions, footprints and heights come only from the layout data.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import type { Category } from '../geo/types';
import { LEVELS, tierOf, type Rot, type Tier } from '../render/iso';
import type { EngineOptions, Hit, IMapEngine, Layers, Pin, View } from '../render/engineApi';
import type { WorldModel } from '../render/world';
import { Terrain, type TerrainData } from './terrain';
const DEV_CAM = typeof location !== 'undefined' ? (new URLSearchParams(location.search).get('cam')?.split(',').map(Number) ?? null) : null;
import { applyPose, azimuth, distanceFor, PITCH, screenRay, screenToGround, screenToPlane, worldToScreen } from './camera';
import { bakeGroundTexture, bakeGroundWeights, buildTerrainGeometry, groundMaterial, type SurfaceAt } from './ground';
import { iconFor } from '../ui/mapIcons';
import { Buckets } from './mesh';
import { addBuilding, addHouses, type BuiltInfo } from './buildings';
import { addRoads } from './roads';
import { addHardscape } from './hardscape3d';
import { buildWater, type Water } from './water';
import { buildTrees, forestSpots, type TreeSet } from './trees';
import { addLife, addProps } from './props';
import { installMist, Lighting, MIST } from './lighting';
import { Post } from './post';
import { Labels, type LabelItem } from './labels';
import { Markers, type UserFix } from './markers';
import { partFootprint } from './terrain';
import { createMaterial, loadTextures } from './materials';
import { isPhone, lower, webgl2Available, type Quality } from '../render/quality';

export type { Quality };
export { webgl2Available };
export interface Surroundings { houses: { p: XY[]; f: number }[]; attribution?: string }
export interface Assets { terrain: TerrainData; surroundings: Surroundings | null; tex: Record<string, THREE.Texture> }

const K_MIN = LEVELS[0], K_MAX = LEVELS[LEVELS.length - 1] * 1.25;
const FOREST_BUDGET = 28000;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

async function loadAssets(): Promise<Assets> {
  const [terrain, surroundings, tex] = await Promise.all([
    fetch('/data/terrain.json').then(r => r.json()),
    fetch('/data/surroundings.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
    loadTextures(),
  ]);
  return { terrain, surroundings, tex };
}
/** `auto`: let the engine step the quality down by itself when frames are slow. */
export async function createEngine3D(canvas: HTMLCanvasElement, world: WorldModel, view: View | null, opts: EngineOptions = {}, quality: Quality = isPhone() ? 'medium' : 'high', auto = false): Promise<Engine3D> {
  return new Engine3D(canvas, world, await loadAssets(), view, opts, quality, auto);
}

interface BuiltBuilding extends BuiltInfo { id: string; category: Category; meshes: THREE.Mesh[] }

export class Engine3D implements IMapEngine {
  readonly kind = '3d' as const;
  view: View; pins: Pin[] = []; filter: Category | 'all' = 'all'; selected: string | null = null;
  layers: Layers = { labels: true, illustrated: true, trees: true };
  readonly terrain: Terrain;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly renderer: THREE.WebGLRenderer;
  readonly buildings = new Map<string, BuiltBuilding>();
  private k: number; private rotF: number;
  private W = 1; private H = 1; private dist = 1000;
  private dirty = true; private raf = 0; private anim: ((t: number) => boolean) | null = null;
  private pitch = PITCH;                                   // tilt, degrees down from the horizon (free, like Google Maps)
  private fling: { v: XY; t: number } | null = null;        // pan glide after a flick (px per ms), time-based decay
  private zoomGoal: { z: number; at: XY; t: number } | null = null; // smooth wheel zoom: log-zoom target round an anchor
  private spin: { v: number; t: number } | null = null;     // rotation glide after a twist (quarter turns per ms)
  private abort = new AbortController(); private ro: ResizeObserver;
  private pickables: THREE.Mesh[] = []; private unnamed: THREE.Mesh[] = []; private ray = new THREE.Raycaster();
  private mats = new Map<string, THREE.Material>();
  private surfaceAt: SurfaceAt = () => 0;
  private lighting: Lighting; private post: Post | null = null; private labels: Labels; private markers: Markers;
  private water: Water[] = []; private forest: TreeSet | null = null; private campusTrees: TreeSet | null = null;
  private onAir = new Set<string>(); private pulseT0 = -1; private idle = 0; private probe = 0;
  quality: Quality;
  private fpsEl: HTMLDivElement | null = null; private lastT = 0;
  buildMs = 0;
  frameMs: number[] = [];

  constructor(private canvas: HTMLCanvasElement, public world: WorldModel, private assets: Assets, view: View | null, private opts: EngineOptions = {}, quality: Quality = 'high', private auto = false) {
    const t0 = performance.now();
    this.view = view ?? { cx: world.centre[0], cy: world.centre[1], level: 1, rot: 0 };
    this.k = this.view.k ?? LEVELS[Math.max(0, Math.min(LEVELS.length - 1, this.view.level))]; this.rotF = this.view.turn ?? this.view.rot; this.pitch = clampPitch(this.view.pitch ?? PITCH);
    canvas.style.imageRendering = 'auto';
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // used on the Low tier; with post-processing the composer tone-maps instead
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap; this.renderer.shadowMap.autoUpdate = false;
    this.renderer.info.autoReset = false;
    installMist(world.centre, 820, 1380);
    this.scene.background = new THREE.Color(MIST); this.scene.fog = new THREE.Fog(MIST, 1e5, 2e5); // the mist ring does the work; no camera-distance fog

    this.terrain = new Terrain(assets.terrain, { buildings: world.buildings, areas: world.areas, paths: world.paths, bounds: world.bounds });
    // structures added from the footage without a surveyed level stand on the natural ground (their pad used the same level)
    for (const b of world.buildings) if (b.groundElev == null) b.groundElev = this.terrain.baseAt(b.parts[0].cx, b.parts[0].cy);
    this.lighting = new Lighting(this.scene);
    this.buildGround(); this.buildBuildings(); this.buildHouses(); this.buildRoadsAndProps(); this.buildTrees();
    this.markers = new Markers(this.scene, this.surfaceAt);
    this.labels = new Labels(canvas.parentElement ?? document.body);
    this.setQuality(quality, false);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.invalidate(); }, { signal: this.abort.signal });

    this.bindInput();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas); this.resize();
    if (new URLSearchParams(location.search).get('fps')) this.showFps();
    this.buildMs = Math.round(performance.now() - t0);
    if (opts.intro && !reducedMotion() && !DEV_CAM) { this.introMs = 0; this.applyIntro(0); this.kick(); }
  }

  // ---------- sky entrance (Lovable brief section 4) ----------
  // The camera drops from high above, nearly straight down, through the clouds (a DOM layer in CampusPage), swings round
  // to the hero view and settles at the normal pitch; trees, then buildings, rise out of the ground; the labels come last.
  private introMs = -1; private introLast = 0; // -1: no intro; else the intro's own clock, which advances at most 100 ms a frame so slow first frames (shader compiles) don't skip it
  private static readonly INTRO_MS = 3400;
  get introActive() { return this.introMs >= 0; }
  skipIntro() { if (this.introMs < 0) return; this.introMs = Engine3D.INTRO_MS; this.kick(); }
  private introPose(u: number) {
    const sm = (a: number, b: number) => { const x = Math.max(0, Math.min(1, (u - a) / (b - a))); return x * x * (3 - 2 * x); };
    const drop = 1 - (1 - Math.min(1, u / 0.92)) ** 4; // fast fall, long soft landing
    const kEnd = this.k, kStart = kEnd / 14;
    return { k: Math.exp(Math.log(kStart) + (Math.log(kEnd) - Math.log(kStart)) * drop), pitch: 86 - (86 - this.pitch) * sm(0.12, 1), rot: this.rotF + 0.55 * (1 - sm(0, 1)), trees: sm(0.3, 0.8), build: sm(0.42, 0.9), labels: u > 0.86 };
  }
  private applyIntro(u: number) {
    const p = this.introPose(u), root = this.scene.getObjectByName('buildings'), props = this.scene.getObjectByName('props');
    if (root) root.position.y = -30 * (1 - p.build);
    if (props) props.position.y = -6 * (1 - p.build);
    for (const t of [this.campusTrees, this.forest]) if (t) t.group.position.y = -16 * (1 - p.trees);
    this.labels.root.style.opacity = p.labels ? '1' : '0';
    this.renderer.shadowMap.needsUpdate = true;
    this.opts.onIntro?.(u);
  }

  // ---------- scene ----------
  private mat(key: string): THREE.Material {
    let m = this.mats.get(key); if (!m) { m = createMaterial(key, this.assets.tex); this.mats.set(key, m); }
    return m;
  }
  /** The material of a building in its highlighted (selected) or dimmed (filtered out) form. */
  private variant(key: string, mode: 'hi' | 'dim'): THREE.Material {
    const id = `${key}:${mode}`; let m = this.mats.get(id); if (m) return m;
    const c = this.mat(key).clone() as THREE.MeshStandardMaterial;
    if (mode === 'hi') { c.emissive = new THREE.Color('#FFD23F'); c.emissiveIntensity = 0.06; } // a light lift; the yellow ring does the pointing
    else c.color.multiply(new THREE.Color(0.42, 0.45, 0.47)); // relative to the material's own tint, so dark roofs stay readable
    this.mats.set(id, c); return c;
  }
  private buildGround() {
    const tex = bakeGroundTexture(this.world, this.quality === 'high' ? 2600 : 1300); tex.anisotropy = this.quality === 'low' ? 1 : 8;
    const { geometry, surfaceAt } = buildTerrainGeometry(this.terrain, this.quality === 'low' ? 8 : 4); this.surfaceAt = surfaceAt;
    const mesh = new THREE.Mesh(geometry, groundMaterial(tex, bakeGroundWeights(this.world), this.assets.tex));
    mesh.name = 'terrain'; mesh.receiveShadow = true; this.scene.add(mesh);
    for (const a of this.world.areas.filter(a => a.kind === 'water' && a.pts.length >= 3)) { const w = buildWater(a.pts); this.water.push(w); this.scene.add(w.mesh); }
  }
  private buildRoadsAndProps() {
    const b = this.world.bounds, near = (x: number, y: number) => x > b.minX - 120 && x < b.maxX + 120 && y > b.minY - 120 && y < b.maxY + 120;
    // the hardscape footpaths (garden paths, the paved walks) as crisp paver ribbons with a kerb, like the data paths
    const walks = (this.world.src.getHardscape?.() ?? []).filter(it => it.type === 'footpath' && it.pts && it.pts.length > 1)
      .map(it => ({ id: 'hs:' + it.id, kind: 'footpath' as const, pts: it.pts!, width: it.width ?? 1.8, colour: typeof it.colour === 'string' ? it.colour : undefined, kerb: true }));
    const R = new Buckets(); addRoads(R, [...this.world.paths, ...walks], this.surfaceAt, near);
    for (const m of R.meshes(k => this.mat(k))) { m.name = 'roads'; m.receiveShadow = true; this.scene.add(m); }
    const P = new Buckets(); addProps(P, this.world, this.surfaceAt); addHardscape(P, this.world.src.getHardscape?.() ?? [], this.surfaceAt); if (this.quality !== 'low') addLife(P, this.world.src.getHardscape?.() ?? [], this.surfaceAt);
    const g = new THREE.Group(); g.name = 'props';
    for (const m of P.meshes(k => this.mat(k))) { m.castShadow = m.receiveShadow = true; g.add(m); }
    this.scene.add(g);
  }
  private buildTrees() {
    this.campusTrees = buildTrees(this.world.campusTrees, this.surfaceAt, 0.4, 'campus-trees');
    this.forest = buildTrees(forestSpots(this.world, this.assets.surroundings?.houses ?? [], FOREST_BUDGET), this.surfaceAt, 0.86, 'forest');
    this.scene.add(this.campusTrees.group, this.forest.group);
  }
  private buildBuildings() {
    const entrances = this.world.src.getEntrances(), ctx = { entrances, landmarks: this.world.landmarks, areas: this.world.areas, forecourt: false }, plain = new Buckets(), root = new THREE.Group(); root.name = 'buildings';
    for (const b of this.world.buildings) {
      if (b.unnamed) { addBuilding(plain, b, entrances); continue; }
      const B = new Buckets(), info = addBuilding(B, b, entrances, ctx), g = new THREE.Group(); g.name = b.id;
      const meshes = B.meshes(k => this.mat(k)); for (const m of meshes) { m.userData.buildingId = b.id; m.castShadow = m.receiveShadow = true; g.add(m); this.pickables.push(m); }
      root.add(g); this.buildings.set(b.id, { ...info, id: b.id, category: b.category, meshes });
    }
    const g = new THREE.Group(); g.name = 'unnamed'; for (const m of plain.meshes(k => this.mat(k))) { m.castShadow = m.receiveShadow = true; g.add(m); this.unnamed.push(m); } root.add(g);
    this.scene.add(root);
  }
  private buildHouses() {
    const hs = this.assets.surroundings?.houses; if (!hs?.length) return;
    const B = new Buckets(); addHouses(B, hs, this.surfaceAt);
    for (const m of B.meshes(k => this.mat(k))) { m.name = 'surroundings'; m.castShadow = m.receiveShadow = true; this.scene.add(m); }
  }

  // ---------- public API ----------
  get tier(): Tier { return tierOf(this.k); }
  invalidate() { this.dirty = true; this.kick(); }
  setFilter(f: Category | 'all') { this.filter = f; this.restyle(); this.invalidate(); }
  setSelected(id: string | null) {
    if (id === this.selected) return;
    this.selected = id; this.restyle();
    const b = id ? this.world.buildings.find(x => x.id === id && !x.unnamed) : null, pin = id ? this.pins.find(p => p.id === id) : null;
    this.markers.select(b ? { polys: b.parts.map(partFootprint), level: b.groundElev ?? this.surfaceAt(b.parts[0].cx, b.parts[0].cy) } : pin ? { at: pin.at } : null);
    this.pulseT0 = id ? performance.now() : -1; this.invalidate();
  }
  setLayers(l: Partial<Layers>) {
    this.layers = { ...this.layers, ...l };
    if (this.campusTrees) this.campusTrees.group.visible = this.layers.trees;
    this.renderer.shadowMap.needsUpdate = true; this.invalidate();
  }
  /** Switch tier on the fly: shadows, post-processing, tree count and pixel ratio. */
  setQuality(q: Quality, manual = true) {
    if (manual) this.auto = false;
    this.quality = q;
    this.lighting.setShadowSize(q === 'high' ? 2048 : q === 'medium' ? 1024 : 0);
    this.post?.dispose(); this.post = q === 'low' ? null : new Post(this.renderer, this.scene, this.camera, q === 'high');
    this.forest?.setFraction(q === 'high' ? 1 : q === 'medium' ? 0.6 : 0.3); this.campusTrees?.setFraction(q === 'low' ? 0.6 : 1);
    this.renderer.shadowMap.needsUpdate = true; this.frameMs = []; this.probe = 0;
    this.resize();
  }
  // ---- hooks for later phases (live location, directions, ON AIR); shown with ?demo=hooks ----
  setRoute(pts: XY[] | null) { this.markers.setRoute(pts); this.invalidate(); }
  setUser(u: UserFix | null) { this.markers.setUser(u); this.invalidate(); }
  setOnAir(buildingIds: string[]) { this.onAir = new Set(buildingIds); this.invalidate(); }
  rotate(dir: 1 | -1 = 1) {
    const from = this.rotF, to = Math.round(from) + dir, t0 = performance.now(); this.stopMotion();
    this.anim = t => { const u = Math.min(1, (t - t0) / 600), e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2; this.rotF = from + (to - from) * e; this.syncRot(); if (u >= 1) { this.persist(); return false; } return true; };
    this.kick();
  }
  /** North up (the camera due south of the centre: turn 0.5, the nearest such) and the default tilt, smoothly. */
  resetNorth(ms = 550) {
    const from = this.rotF, to = 0.5 + 4 * Math.round((from - 0.5) / 4), p0 = this.pitch, t0 = performance.now(); this.stopMotion();
    this.anim = t => { const u = Math.min(1, (t - t0) / ms), e = 1 - (1 - u) ** 3; this.rotF = from + (to - from) * e; this.pitch = p0 + (PITCH - p0) * e; this.view.pitch = this.pitch; this.syncRot(); if (u >= 1) { this.persist(); return false; } return true; };
    this.kick();
  }
  /** The compass heading the view looks toward: 0 = north up, clockwise. */
  get bearing() { const az = azimuth(this.rotF), lx = -Math.cos(az), ly = -Math.sin(az); return (((Math.atan2(lx, ly) * 180) / Math.PI) % 360 + 360) % 360; }
  recentre() { this.flyTo([this.world.centre[0] + 20, this.world.centre[1]], this.W < 700 ? 2 : 3); }
  /** Fly so `at` lands at screen fraction (fx, fy): callers use it to keep the place clear of the bottom sheet. */
  flyTo(at0: XY, level?: number, ms = 650, fx = 0.5, fy = 0.5) {
    const lv = Math.max(0, Math.min(LEVELS.length - 1, level ?? Math.max(this.view.level, 5))), toK = LEVELS[lv];
    // where would (fx, fy) fall if we centred on `at`? Shift the centre the other way by that much.
    const tmp = new THREE.PerspectiveCamera(), h = this.terrain.baseAt(at0[0], at0[1]);
    applyPose(tmp, { cx: at0[0], cy: at0[1], h, k: toK, rot: this.rotF, pitch: this.pitch }, this.W, this.H);
    const p = screenToPlane(tmp, fx * this.W, fy * this.H, this.W, this.H, h), at: XY = [2 * at0[0] - p[0], 2 * at0[1] - p[1]];
    const from = { x: this.view.cx, y: this.view.cy, z: Math.log(this.k) }, toZ = Math.log(toK), t0 = performance.now(); this.stopMotion();
    this.anim = t => {
      const u = Math.min(1, (t - t0) / ms), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      this.view.cx = from.x + (at[0] - from.x) * e; this.view.cy = from.y + (at[1] - from.y) * e; this.setK(Math.exp(from.z + (toZ - from.z) * e));
      if (u >= 1) { this.persist(); return false; } return true;
    };
    this.kick();
  }
  zoomBy(f: number, anchor?: XY) {
    const a = anchor ?? [this.W / 2, this.H / 2], from = Math.log(this.k), to = Math.log(Math.max(K_MIN, Math.min(K_MAX, this.k * f))), t0 = performance.now();
    let last = from;
    this.stopMotion();
    this.anim = t => { const u = Math.min(1, (t - t0) / 300), z = from + (to - from) * (1 - (1 - u) ** 3); this.zoomAround(Math.exp(z - last), a); last = z; if (u >= 1) { this.persist(); return false; } return true; };
    this.kick();
  }
  /** World position (on the ground) of a CSS-pixel point on the canvas. */
  screenToWorld(px: number, py: number): XY { this.sync(); return screenToGround(this.camera, px, py, this.W, this.H, (x, y) => this.terrain.heightAt(x, y), this.centreH()); }
  /** CSS-pixel position of a world point; z = metres above the ground there. */
  worldToScreen(x: number, y: number, z = 0): XY { this.sync(); return worldToScreen(this.camera, x, y, this.terrain.heightAt(x, y) + z, this.W, this.H); }
  hitTest(px: number, py: number): Hit | null {
    const tag = this.layers.labels ? this.labels.hit(px, py) : null;
    if (tag) return { buildingId: tag, at: this.buildings.get(tag)?.centre ?? this.pins.find(p => p.id === tag)?.at ?? this.screenToWorld(px, py) };
    this.sync(); const { o, d } = screenRay(this.camera, px, py, this.W, this.H);
    this.ray.set(o, d); this.ray.far = this.dist * 4;
    const hit = this.ray.intersectObjects(this.pickables, false)[0];
    if (hit) { const b = this.buildings.get(hit.object.userData.buildingId)!; return { buildingId: b.id, at: b.centre }; }
    return { at: this.screenToWorld(px, py) };
  }
  destroy() {
    cancelAnimationFrame(this.raf); this.raf = -1; clearTimeout(this.idle); this.abort.abort(); this.ro.disconnect(); this.fpsEl?.remove();
    this.labels.destroy(); this.markers.dispose(); this.post?.dispose();
    this.scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose(); });
    for (const m of this.mats.values()) m.dispose();
    this.renderer.dispose();
  }
  /** Draw calls and triangles of the last frame (for the performance report). */
  stats() { const r = this.renderer.info.render; return { calls: r.calls, triangles: r.triangles, buildMs: this.buildMs, frameMs: this.avgFrame(), quality: this.quality, dpr: this.renderer.getPixelRatio() }; }

  // ---------- internals ----------
  private centreH() { return this.terrain.baseAt(this.view.cx, this.view.cy); }
  private setK(k: number) {
    this.k = Math.max(K_MIN, Math.min(K_MAX, k)); this.view.k = this.k;
    let lv = 0; LEVELS.forEach((l, i) => { if (Math.abs(Math.log(l / this.k)) < Math.abs(Math.log(LEVELS[lv] / this.k))) lv = i; }); this.view.level = lv;
  }
  private sync() {
    if (this.introMs >= 0) {
      const p = this.introPose(Math.min(1, this.introMs / Engine3D.INTRO_MS));
      this.dist = applyPose(this.camera, { cx: this.view.cx, cy: this.view.cy, h: this.centreH(), k: p.k, rot: p.rot, pitch: p.pitch }, this.W, this.H);
      return;
    }
    this.dist = applyPose(this.camera, { cx: this.view.cx, cy: this.view.cy, h: this.centreH(), k: this.k, rot: this.rotF, pitch: this.pitch }, this.W, this.H);
    if (DEV_CAM) { // dev only: ?cam=x,y,az,pitch,dist,fov frees the camera to match a drone photo (aerial match sheets)
      const [x, y, az, pitch, d, fov] = DEV_CAM, a = (az * Math.PI) / 180, pt = (pitch * Math.PI) / 180, h = this.terrain.baseAt(x, y);
      this.camera.fov = fov; this.camera.position.set(x + d * Math.cos(pt) * Math.cos(a), h + d * Math.sin(pt), -(y + d * Math.cos(pt) * Math.sin(a)));
      this.camera.near = 5; this.camera.far = d * 4 + 9000; this.camera.lookAt(x, h, -y); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld(true);
    }
  }
  private emitView() { this.opts.onView?.({ ...this.view, tier: this.tier, bearing: this.bearing }); }
  private syncRot() { this.view.turn = this.rotF; this.view.rot = (((Math.round(this.rotF) % 4) + 4) % 4) as Rot; }
  private stopMotion() { this.anim = null; this.fling = null; this.zoomGoal = null; this.spin = null; }
  private persist() { try { sessionStorage.setItem('campus.view', JSON.stringify(this.view)); } catch { /* ignore */ } this.emitView(); }
  private resize() {
    const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    this.W = r.width; this.H = r.height;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : this.quality === 'medium' ? 1.5 : 1));
    this.renderer.setSize(r.width, r.height, false); this.post?.setSize(r.width, r.height); this.invalidate();
  }
  /** The selected building glows; with a filter on, buildings of other categories are dimmed. */
  private restyle() {
    for (const b of this.buildings.values()) {
      const mode = b.id === this.selected ? 'hi' : this.filter !== 'all' && b.category !== this.filter ? 'dim' : null;
      for (const m of b.meshes) m.material = mode ? this.variant(m.name, mode) : this.mat(m.name);
    }
    for (const m of this.unnamed) m.material = this.filter !== 'all' ? this.variant(m.name, 'dim') : this.mat(m.name);
  }
  private labelItems(): LabelItem[] {
    const tier = this.tier, maxP = tier === 'campus' ? 1 : tier === 'area' ? 2 : 3, out: LabelItem[] = [];
    for (const b of this.world.buildings) {
      if (b.unnamed) continue; const sel = this.selected === b.id, info = this.buildings.get(b.id); if (!info) continue;
      if (b.labelPriority > maxP && !sel) continue;
      if (this.filter !== 'all' && b.category !== this.filter && !sel) continue;
      out.push({ id: b.id, text: tier === 'campus' ? (b.short ?? b.name) : (b.short && b.name.length > 26 ? b.short : b.name), at: info.centre, h: info.top + 1.5, pri: b.labelPriority, cat: b.category, sel, onAir: this.onAir.has(b.id), icon: iconFor(b.id, b.category) });
    }
    for (const pin of this.pins) {
      const sel = this.selected === pin.id;
      if (pin.priority > maxP && !sel) continue; if (this.filter !== 'all' && pin.category !== this.filter && !sel) continue;
      out.push({ id: pin.id, text: pin.label, at: pin.at, h: this.surfaceAt(pin.at[0], pin.at[1]) + 4, pri: pin.priority, cat: pin.category, sel, icon: iconFor(pin.id, pin.category) });
    }
    return out;
  }
  private animated() { return this.quality === 'high' && !reducedMotion() && !document.hidden; }
  private kick() { if (!this.raf) this.raf = requestAnimationFrame(t => this.frame(t)); }
  private frame(t: number) {
    if (this.raf === -1) return; this.raf = 0; let more = false;
    clearTimeout(this.idle); this.idle = 0;
    if (this.introMs >= 0) {
      if (this.introLast) this.introMs += Math.min(100, t - this.introLast); this.introLast = t;
      const u = Math.min(1, this.introMs / Engine3D.INTRO_MS); this.applyIntro(u); this.dirty = true;
      if (u >= 1) { this.introMs = -1; this.labels.root.style.opacity = ''; } else more = true;
    }
    if (this.anim) { more = this.anim(t); if (!more) this.anim = null; this.dirty = true; }
    if (this.pulseT0 >= 0) { // selection ring: a soft pulse for 1.6 s, then steady
      const u = Math.min(1, (performance.now() - this.pulseT0) / 1600); this.markers.pulse(u); this.dirty = true;
      if (u >= 1) this.pulseT0 = -1; else more = true;
    }
    if (this.glide(t)) more = true;
    if (this.dirty || more) {
      this.draw(t); this.dirty = false;
      if (this.lastT) { this.frameMs.push(t - this.lastT); if (this.frameMs.length > 40) this.frameMs.shift(); this.probe++; this.checkSpeed(); }
      this.lastT = more ? t : 0; this.updateFps();
    }
    if (more || this.anim) this.kick();
    else if (this.animated()) this.idle = window.setTimeout(() => { this.idle = 0; this.dirty = true; this.kick(); }, 40); // water and trees keep moving at about 25 fps
  }
  /** Automatic quality only: after a stretch of slow frames while the map is moving, drop one tier. */
  private checkSpeed() {
    if (!this.auto || this.probe < 45) return;
    const ms = this.avgFrame(), next = lower(this.quality);
    if (next && ms > (this.quality === 'high' ? 30 : 40)) { this.setQuality(next, false); this.opts.onQuality?.(next); }
    else if (this.probe > 240) this.auto = false;
  }
  private draw(t: number) {
    this.sync(); this.renderer.info.reset();
    if (this.lighting.fit(this.camera, this.W, this.H, this.centreH())) this.renderer.shadowMap.needsUpdate = true;
    const time = this.animated() ? t / 1000 : 0;
    for (const w of this.water) w.time.value = time;
    if (this.forest) this.forest.time.value = time; if (this.campusTrees) this.campusTrees.time.value = time;
    if (this.post) { this.post.setTilt(!this.selected, this.tier, this.H > this.W); this.post.render(); } else this.renderer.render(this.scene, this.camera);
    if (this.layers.labels) this.labels.update(this.labelItems(), (x, y, h) => worldToScreen(this.camera, x, y, h, this.W, this.H), this.W, this.H); else this.labels.clear();
  }
  private avgFrame() { return this.frameMs.length ? Math.round((this.frameMs.reduce((s, v) => s + v, 0) / this.frameMs.length) * 10) / 10 : 0; }
  private showFps() {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:8px;bottom:calc(var(--tabbar,64px) + 96px);z-index:9;background:rgba(16,20,24,.78);color:#fff;font:600 12px/1.35 ui-monospace,monospace;padding:6px 8px;border-radius:8px;pointer-events:none;white-space:pre';
    this.canvas.parentElement?.appendChild(el); this.fpsEl = el; this.updateFps();
  }
  private updateFps() {
    if (!this.fpsEl) return; const ms = this.avgFrame(), r = this.renderer.info.render;
    this.fpsEl.textContent = `${ms ? `${ms} ms/frame  ${Math.round(1000 / ms)} fps` : 'drag the map to measure'}\n${this.quality} · ${r.calls} calls · ${Math.round(r.triangles / 1000)}k tris · dpr ${this.renderer.getPixelRatio()}`;
  }

  // ---------- navigation: Google Maps-style gestures (H A, 21 Nov) ----------
  // One finger or the left mouse button: grab and drag (the ground point under the finger stays under it), and a flick
  // glides on and slows smoothly. Two fingers: pinch zooms round the fingers, twisting rotates (after a 10° threshold so
  // a pinch never rotates by accident), moving pans; both fingers up or down together tilts. Double-tap zooms in,
  // double-tap and drag zooms with one finger, a two-finger tap zooms out. Mouse: the wheel zooms smoothly at the cursor
  // (trackpad pinch too); right-drag or Ctrl-drag rotates (across) and tilts (up and down); double-click zooms in
  // (Shift: out). Keyboard on the map: arrows pan, + and − zoom, Shift+arrows rotate and tilt, N turns north up.
  private plane(px: number, py: number): XY { return screenToPlane(this.camera, px, py, this.W, this.H, this.centreH()); }
  /** The ground plane point under a screen point, or null near the horizon (where a small move would fling the map). */
  private planeAt(px: number, py: number): XY | null {
    const { o, d } = screenRay(this.camera, px, py, this.W, this.H); if (d.y > -0.03) return null;
    const t = (this.centreH() - o.y) / d.y; if (t < 0 || t > this.dist * 6) return null;
    return [o.x + d.x * t, -(o.z + d.z * t)];
  }
  /** Move the content by (dx, dy) screen pixels (the glide, the keyboard). */
  private panBy(dx: number, dy: number) { this.sync(); const a = this.plane(this.W / 2 - dx, this.H / 2 - dy); this.view.cx = a[0]; this.view.cy = a[1]; this.clamp(); this.dirty = true; }
  /** Keep the world point grab under the screen point (px, py): a 1:1 drag at any tilt. */
  private holdAt(grab: XY, px: number, py: number) {
    this.sync(); const cur = this.planeAt(px, py); if (!cur) return;
    this.view.cx += grab[0] - cur[0]; this.view.cy += grab[1] - cur[1]; this.clamp(); this.dirty = true;
  }
  private zoomAround(f: number, anchor: XY) {
    this.sync(); const before = this.planeAt(anchor[0], anchor[1]) ?? this.plane(this.W / 2, this.H / 2);
    this.setK(this.k * f); this.sync(); const after = this.planeAt(anchor[0], anchor[1]) ?? this.plane(this.W / 2, this.H / 2);
    this.view.cx += before[0] - after[0]; this.view.cy += before[1] - after[1]; this.clamp(); this.invalidate();
  }
  /** Rotate by dTurn quarter turns round a screen point (it stays where it is). */
  private turnAround(dTurn: number, anchor: XY) {
    this.sync(); const before = this.planeAt(anchor[0], anchor[1]);
    this.rotF += dTurn; this.syncRot(); this.sync(); const after = before && this.planeAt(anchor[0], anchor[1]);
    if (before && after) { this.view.cx += before[0] - after[0]; this.view.cy += before[1] - after[1]; this.clamp(); }
    this.dirty = true;
  }
  private tiltBy(dDeg: number) { this.pitch = clampPitch(this.pitch + dDeg); this.view.pitch = this.pitch; this.dirty = true; }
  private clamp() {
    const b = this.world.bounds, m = 380;
    this.view.cx = Math.max(b.minX - m, Math.min(b.maxX + m, this.view.cx)); this.view.cy = Math.max(b.minY - m, Math.min(b.maxY + m, this.view.cy));
  }
  /** One frame of the glides: the pan fling (time constant 325 ms), the smooth wheel zoom (90 ms) and the twist glide. */
  private glide(t: number): boolean {
    let more = false;
    if (this.fling) {
      const dt = Math.min(50, t - this.fling.t); this.fling.t = t;
      if (dt > 0) { this.panBy(this.fling.v[0] * dt, this.fling.v[1] * dt); const k = Math.exp(-dt / 325); this.fling.v = [this.fling.v[0] * k, this.fling.v[1] * k]; }
      if (Math.hypot(this.fling.v[0], this.fling.v[1]) < 0.012) { this.fling = null; this.persist(); } else more = true;
    }
    if (this.zoomGoal) {
      const g = this.zoomGoal, dt = Math.min(50, t - g.t); g.t = t;
      const dz = g.z - Math.log(this.k), step = dz * (1 - Math.exp(-Math.max(1, dt) / 90));
      this.zoomAround(Math.exp(step), g.at);
      if (Math.abs(dz - step) < 0.003) { this.zoomGoal = null; this.persist(); } else more = true;
    }
    if (this.spin) {
      const dt = Math.min(50, t - this.spin.t); this.spin.t = t;
      if (dt > 0) { this.turnAround(this.spin.v * dt, [this.W / 2, this.H / 2]); this.spin.v *= Math.exp(-dt / 250); }
      if (Math.abs(this.spin.v) < 0.00002) { this.spin = null; this.persist(); } else more = true;
    }
    return more;
  }
  private bindInput() {
    const el = this.canvas, o = { signal: this.abort.signal };
    el.tabIndex = 0; el.style.outline = 'none';
    interface Ptr { x: number; y: number; x0: number; y0: number; t0: number; touch: boolean }
    interface Two { d: number; a: number; c: XY; grab: XY | null; rot: number; rotOn: boolean; kind: 'undecided' | 'transform' | 'tilt'; t0: number; moved: number; spinV: number; lastT: number }
    const pts = new Map<number, Ptr>(), local = (e: MouseEvent): XY => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let mode: 'none' | 'pan' | 'orbit' | 'two' | 'quick' = 'none', grab: XY | null = null, hist: { t: number; x: number; y: number }[] = [];
    let moved = 0, downT = 0, orbitLast: XY = [0, 0], two: Two | null = null;
    let lastType = 'mouse', lastTap = { t: 0, x: 0, y: 0 }, quick: { y0: number; z0: number; at: XY; moved: number; t0: number } | null = null;
    const D2R = Math.PI / 180, wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    const pair = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), c: [(a.x + b.x) / 2, (a.y + b.y) / 2] as XY }; };
    el.addEventListener('contextmenu', e => e.preventDefault(), o);
    el.addEventListener('pointerdown', e => {
      if (this.introActive) { this.skipIntro(); return; }
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      try { el.focus({ preventScroll: true }); } catch { /* not focusable */ }
      const [x, y] = local(e), now = performance.now(); this.stopMotion(); lastType = e.pointerType;
      pts.set(e.pointerId, { x, y, x0: x, y0: y, t0: now, touch: e.pointerType !== 'mouse' });
      if (pts.size === 1) {
        moved = 0; downT = now; hist = [{ t: now, x, y }];
        if (e.pointerType === 'mouse' && (e.button === 2 || e.ctrlKey || e.metaKey)) { mode = 'orbit'; orbitLast = [x, y]; return; }
        // a second tap close to the first: double-tap zooms in, double-tap and drag zooms with one finger
        if (e.pointerType !== 'mouse' && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) { mode = 'quick'; quick = { y0: y, z0: Math.log(this.k), at: [x, y], moved: 0, t0: now }; return; }
        mode = 'pan'; this.sync(); grab = this.planeAt(x, y);
      } else if (pts.size === 2) {
        const p = pair(); mode = 'two'; this.sync();
        two = { d: p.d, a: p.ang, c: p.c, grab: this.planeAt(p.c[0], p.c[1]), rot: 0, rotOn: false, kind: 'undecided', t0: now, moved: 0, spinV: 0, lastT: now };
      }
      this.kick();
    }, o);
    el.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId); if (!p) return;
      const [x, y] = local(e), now = performance.now(), dx = x - p.x, dy = y - p.y; p.x = x; p.y = y;
      if (mode === 'pan' && pts.size === 1) {
        moved += Math.abs(dx) + Math.abs(dy); hist.push({ t: now, x, y }); while (hist.length > 2 && now - hist[0].t > 100) hist.shift();
        if (grab) this.holdAt(grab, x, y); else { this.panBy(dx, dy); this.sync(); grab = this.planeAt(x, y); }
      } else if (mode === 'orbit') {
        const ox = x - orbitLast[0], oy = y - orbitLast[1]; orbitLast = [x, y]; moved += Math.abs(ox) + Math.abs(oy);
        this.turnAround((-ox * 0.4) / 90, [this.W / 2, this.H / 2]); this.tiltBy(oy * 0.3);
      } else if (mode === 'quick' && quick) {
        quick.moved += Math.abs(dy); const z = quick.z0 + (y - quick.y0) * 0.012; this.zoomAround(Math.exp(z - Math.log(this.k)), quick.at);
      } else if (mode === 'two' && two && pts.size === 2) {
        const q = pair(); two.moved += Math.abs(dx) + Math.abs(dy);
        if (two.kind === 'undecided' && two.moved > 14) {
          // both fingers moving up or down together, little pinch or twist: tilt; anything else: pan, zoom and rotate
          const vs = [...pts.values()], fy = vs.map(v => v.y - v.y0), fx = vs.map(v => v.x - v.x0);
          const together = fy[0] * fy[1] > 0 && fy.every((v, i) => Math.abs(v) > 1.6 * Math.abs(fx[i]));
          two.kind = together && Math.abs(q.d - two.d) < 0.25 * Math.min(Math.abs(fy[0]), Math.abs(fy[1])) + 6 && Math.abs(wrap(q.ang - two.a)) < 8 * D2R ? 'tilt' : 'transform';
        }
        if (two.kind === 'tilt') this.tiltBy((dy * 0.3) / 2);
        else if (two.kind === 'transform') {
          if (two.grab) this.holdAt(two.grab, q.c[0], q.c[1]);
          if (two.d > 0 && q.d > 0) this.zoomAround(q.d / two.d, q.c);
          const da = wrap(q.ang - two.a); two.rot += da;
          if (!two.rotOn && Math.abs(two.rot) > 10 * D2R) two.rotOn = true;
          if (two.rotOn) {
            const dTurn = -da / (Math.PI / 2); this.turnAround(dTurn, q.c);
            const dt = Math.max(8, now - two.lastT); two.spinV = 0.7 * two.spinV + 0.3 * (dTurn / dt);
          }
          this.sync(); two.grab = this.planeAt(q.c[0], q.c[1]);
        }
        two.d = q.d; two.a = q.ang; two.c = q.c; two.lastT = now;
      }
      this.kick();
    }, o);
    const up = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return; pts.delete(e.pointerId);
      const now = performance.now(), [x, y] = local(e);
      if (mode === 'two' && two) {
        // a quick two-finger tap zooms out; after a twist, the rotation glides a little
        if (pts.size === 1 && two.moved < 12 && now - two.t0 < 280) this.zoomBy(0.5, two.c);
        else if (two.rotOn && Math.abs(two.spinV) > 0.00015) this.spin = { v: Math.max(-0.004, Math.min(0.004, two.spinV)), t: now };
        two = null;
        if (pts.size === 1) { const r = [...pts.values()][0]; mode = 'pan'; this.sync(); grab = this.planeAt(r.x, r.y); hist = [{ t: now, x: r.x, y: r.y }]; moved = 99; }
        this.persist(); this.kick(); return;
      }
      if (pts.size > 0) return;
      if (mode === 'quick' && quick) {
        if (quick.moved < 10 && now - quick.t0 < 300) this.zoomBy(2, quick.at); // a plain double-tap
        quick = null; lastTap = { t: 0, x: 0, y: 0 };
      } else if (mode === 'pan') {
        if (moved < 8 && now - downT < 500) {
          this.opts.onSelect?.(this.hitTest(x, y));
          if (p.touch) lastTap = { t: now, x, y };
        } else {
          // the flick: speed over the last 100 ms, only if the finger was still moving when it lifted
          const h0 = hist[0], h1 = hist[hist.length - 1];
          if (h0 && h1 && now - h1.t < 60 && h1.t - h0.t > 8) {
            let vx = (h1.x - h0.x) / (h1.t - h0.t), vy = (h1.y - h0.y) / (h1.t - h0.t); const sp = Math.hypot(vx, vy), cap = 4;
            if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
            if (sp > 0.1) this.fling = { v: [vx, vy], t: now };
          }
        }
      }
      mode = 'none'; grab = null; this.persist(); this.kick();
    };
    el.addEventListener('pointerup', up, o); el.addEventListener('pointercancel', up, o);
    el.addEventListener('wheel', e => {
      e.preventDefault(); if (this.introActive) { this.skipIntro(); return; }
      this.fling = null; this.anim = null;
      const at = local(e), dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1), now = performance.now();
      if (e.ctrlKey) { this.zoomGoal = null; this.zoomAround(Math.exp(-dy * 0.012), at); this.persistSoon(); } // trackpad pinch
      else if (Math.abs(dy) >= 40) {                                                                              // a mouse wheel notch: a smooth step
        const z0 = this.zoomGoal ? this.zoomGoal.z : Math.log(this.k), z = Math.max(Math.log(K_MIN), Math.min(Math.log(K_MAX), z0 - (dy / 100) * Math.log(1.6)));
        this.zoomGoal = { z, at, t: now };
      } else { this.zoomGoal = null; this.zoomAround(Math.exp(-dy * 0.005), at); this.persistSoon(); }            // a trackpad scroll
      this.kick();
    }, { passive: false, signal: this.abort.signal });
    // double-click is the mouse's; a touch double-tap is handled above (some browsers send both, which would zoom twice)
    el.addEventListener('dblclick', e => { if (lastType !== 'mouse') return; if (e.shiftKey || e.altKey) this.zoomBy(0.5, local(e)); else this.zoomBy(2, local(e)); }, o);
    el.addEventListener('keydown', e => {
      const c: XY = [this.W / 2, this.H / 2], k = e.key, now = performance.now(); let used = true;
      if (e.shiftKey && k === 'ArrowLeft') this.turnAround(15 / 90, c); else if (e.shiftKey && k === 'ArrowRight') this.turnAround(-15 / 90, c);
      else if (e.shiftKey && k === 'ArrowUp') this.tiltBy(-8); else if (e.shiftKey && k === 'ArrowDown') this.tiltBy(8);
      else if (k === 'ArrowLeft') this.fling = { v: [1.2, 0], t: now }; else if (k === 'ArrowRight') this.fling = { v: [-1.2, 0], t: now };
      else if (k === 'ArrowUp') this.fling = { v: [0, 1.2], t: now }; else if (k === 'ArrowDown') this.fling = { v: [0, -1.2], t: now };
      else if (k === '+' || k === '=') this.zoomBy(1.6); else if (k === '-' || k === '_') this.zoomBy(1 / 1.6);
      else if (k === 'n' || k === 'N') this.resetNorth(); else used = false;
      if (used) { e.preventDefault(); this.persistSoon(); this.kick(); }
    }, o);
  }
  private persistT: ReturnType<typeof setTimeout> | undefined;
  private persistSoon() { clearTimeout(this.persistT); this.persistT = setTimeout(() => this.persist(), 160); }
}

/** Tilt limits: from nearly straight down to a low view over the hills (degrees down from the horizon). */
function clampPitch(p: number) { return Math.max(24, Math.min(88.5, p)); }
export { distanceFor };
