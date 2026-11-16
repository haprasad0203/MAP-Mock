// Materials shared by the map engine and the ?model= viewer, one per bucket key.
import * as THREE from 'three';
import { ATLASES, facadeKey, type Atlas } from './facadeAtlas';

export const TEX_FILES = {
  facadeCream: 'tex-facade-cream-plaster', facadeWhite: 'tex-facade-white-tealglass', stone: 'tex-stone-cladding',
  roofGreen: 'tex-roof-green-metal', roofSlate: 'tex-roof-slate-grey',
  road: 'tex-asphalt', lawn: 'tex-lawn-grass', forestFloor: 'tex-pine-forest-floor', brick: 'tex-plaza-red-brick',
} as const;

export async function loadTextures(): Promise<Record<string, THREE.Texture>> {
  const loader = new THREE.TextureLoader(), tex: Record<string, THREE.Texture> = {};
  await Promise.all([
    ...Object.entries(TEX_FILES).map(async ([key, file]) => {
      const t = await loader.loadAsync(`/campus-art/tycoon/${file}.webp`);
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; tex[key] = t;
    }),
    loadFacadeAtlases(loader, tex),
  ]);
  return tex;
}

/** Facade atlases (Phase 3M): one per landmark that has one in facades.json. A missing atlas leaves that building procedural. */
async function loadFacadeAtlases(loader: THREE.TextureLoader, tex: Record<string, THREE.Texture>) {
  try {
    const cfg = await fetch('/data/facades.json').then(r => r.json());
    await Promise.all(Object.entries<{ atlas?: Omit<Atlas, 'id'> }>(cfg.facades ?? {}).map(async ([id, F]) => {
      if (!F.atlas) return;
      try {
        const t = await loader.loadAsync(F.atlas.file);
        t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8;
        tex[facadeKey(id)] = t; ATLASES[id] = { ...F.atlas, id };
      } catch { /* keep the procedural walls */ }
    }));
  } catch { /* no facades.json */ }
}

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
/** Teal curtain-wall glass with pale mullions. */
const glassTexture = () => canvasTexture(64, (g, s) => {
  const grad = g.createLinearGradient(0, 0, 0, s); grad.addColorStop(0, '#3FA9AE'); grad.addColorStop(1, '#1F7F8C');
  g.fillStyle = grad; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(255,255,255,0.20)'; g.fillRect(6, 6, 20, 52);
  g.strokeStyle = '#17616B'; g.lineWidth = 5; g.strokeRect(0, 0, s, s);
});
/** Hero wall: one bay × one floor. Pure white plaster (tinted by the vertex colour), one big window with a white
 *  frame and dark teal-grey glass, and a thin grey-green floor band along the bottom. */
const heroWallTexture = () => canvasTexture(256, (g, s) => {
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#A9B8AC'; g.fillRect(0, s - 12, s, 12);                       // floor band (v = 0 is the bottom of the floor)
  const x = s * 0.22, w = s * 0.56, y = s * 0.2, h = s * 0.5;
  g.fillStyle = '#D5DAD6'; g.fillRect(x - 12, y - 12, w + 24, h + 30);         // shadow line round the frame
  g.fillStyle = '#FFFFFF'; g.fillRect(x - 9, y - 9, w + 18, h + 18);           // white frame
  g.fillStyle = '#EEF1EE'; g.fillRect(x - 14, y + h + 9, w + 28, 8);           // sill
  const gl = g.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, '#3B5C66'); gl.addColorStop(1, '#22383F');
  g.fillStyle = gl; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(x, y + h * 0.55); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.72, y); g.lineTo(x, y + h * 0.82); g.fill();
  g.fillStyle = '#FFFFFF'; g.fillRect(x + w / 2 - 3, y, 6, h);                 // mullion
});
/** The same plaster and floor band with no window (blank end walls, towers). */
const heroBlankTexture = () => canvasTexture(64, (g, s) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, s, s); g.fillStyle = '#B4C1B6'; g.fillRect(0, s - 3, s, 3); });

export function createMaterial(key: string, tex: Record<string, THREE.Texture>): THREE.Material {
  const map = tex[key] ?? null, std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, ...o });
  // facade atlas cut from a render: the painted light is evened out in the atlas, so the scene light shades it.
  // Glass pieces use the same atlas with a slight sheen ('facade:<id>#glass').
  if (key.startsWith('facade:')) {
    const glass = key.endsWith('#glass'), m = tex[glass ? key.slice(0, -6) : key] ?? null;
    return std(glass ? { map: m, roughness: 0.28, metalness: 0.12 } : { map: m, roughness: 0.84 });
  }
  switch (key) {
    case 'glass': return new THREE.MeshStandardMaterial({ map: glassTexture(), roughness: 0.22, metalness: 0.1, emissive: '#0E3A40', emissiveIntensity: 0.3 });
    case 'house': return new THREE.MeshLambertMaterial({ vertexColors: true });
    case 'road': return std({ map, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    case 'heroWall': return std({ map: heroWallTexture(), roughness: 0.82 });
    case 'heroBlank': return std({ map: heroBlankTexture(), roughness: 0.82 });
    // the roof textures are tinted: green to a muted sage, slate to a lighter grey so it never reads black in shade
    case 'roofGreen': { const m = std({ map, roughness: 0.88 }); m.color.setRGB(1.9, 1.02, 1.3); return m; }
    case 'roofSlate': { const m = std({ map, roughness: 0.88 }); m.color.setRGB(1.75, 1.72, 1.7); return m; }
    case 'brick': { const m = std({ map, roughness: 0.95 }); m.color.setRGB(0.92, 0.8, 0.78); return m; }
    case 'lawn': { const m = std({ map, roughness: 1 }); m.color.setRGB(0.74, 0.6, 0.5); return m; }
    default: return std({ map });
  }
}
