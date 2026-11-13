// Golden-hour light: a low warm sun from the south-west with soft shadows fitted to the visible ground,
// a sky/ground fill, and a mist that closes in around the campus so the world has no hard edge.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import { screenToPlane } from './camera';

export const MIST = '#E3D3B0';
const ELEV = (26 * Math.PI) / 180;
/** Unit vector towards the sun, in Three.js space (sun in the south-west). */
export const SUN_DIR = new THREE.Vector3(-Math.cos(ELEV) * Math.SQRT1_2, Math.sin(ELEV), Math.cos(ELEV) * Math.SQRT1_2);

let mistInstalled = false;
/** Replace the stock distance fog with a mist ring around `centre`: clear to r0 metres, fully misted by r1.
 *  Camera-distance fog is no use on a map: it would follow the camera instead of hiding the world's edge. */
export function installMist(centre: XY, r0: number, r1: number) {
  if (mistInstalled) return; mistInstalled = true;
  const C = THREE.ShaderChunk, f = (n: number) => n.toFixed(1);
  C.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogWorld;\n#endif';
  C.fog_vertex = `#ifdef USE_FOG
    vFogDepth = - mvPosition.z;
    vec4 fogW = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      fogW = instanceMatrix * fogW;
    #endif
    vFogWorld = ( modelMatrix * fogW ).xyz;
  #endif`;
  C.fog_pars_fragment = '#ifdef USE_FOG\n uniform vec3 fogColor;\n varying float vFogDepth;\n varying vec3 vFogWorld;\n uniform float fogNear;\n uniform float fogFar;\n#endif';
  C.fog_fragment = `#ifdef USE_FOG
    float mistR = length( vFogWorld.xz - vec2( ${f(centre[0])}, ${f(-centre[1])} ) );
    float fogFactor = max( smoothstep( ${f(r0)}, ${f(r1)}, mistR ), smoothstep( fogNear, fogFar, vFogDepth ) );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
  #endif`;
}

export class Lighting {
  readonly sun = new THREE.DirectionalLight('#FFD9A3', 8.2);
  readonly fill = new THREE.HemisphereLight('#B4CDE4', '#A07A45', 2.0);
  private key = '';
  constructor(scene: THREE.Scene) {
    scene.add(this.sun, this.sun.target, this.fill);
    this.sun.shadow.bias = -0.0003;
  }
  /** 0 = no shadows. */
  setShadowSize(size: number) {
    this.sun.castShadow = size > 0;
    if (size > 0 && this.sun.shadow.mapSize.x !== size) { this.sun.shadow.mapSize.set(size, size); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null as never; }
    this.key = '';
  }
  /** Fit the shadow camera to the ground on screen. Returns true when the shadow map must be redrawn. */
  fit(cam: THREE.PerspectiveCamera, W: number, H: number, h: number): boolean {
    const pts = [[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => screenToPlane(cam, x, y, W, H, h));
    const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
    const need = Math.max(...pts.map(p => Math.hypot(p[0] - cx, p[1] - cy))) + 60;
    // radius in steps, with a margin: the map is redrawn only after a good stretch of panning or zooming, not every frame
    const r = Math.min(1600, 80 * Math.pow(1.2, Math.ceil(Math.log((need * 1.22) / 80) / Math.log(1.2))));
    const size = this.sun.shadow.mapSize.x, grid = Math.max(1, Math.floor((r - need) / ((2 * r) / size))) * ((2 * r) / size), texel = grid;
    // snap the centre to a grid of whole shadow texels (in the light's own axes) so shadows don't shimmer
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIR).normalize(), up = new THREE.Vector3().crossVectors(SUN_DIR, right).normalize();
    const c = new THREE.Vector3(cx, h, -cy), a = Math.round(c.dot(right) / texel) * texel, b = Math.round(c.dot(up) / texel) * texel, d = Math.round(c.dot(SUN_DIR) / 50) * 50;
    c.copy(right).multiplyScalar(a).addScaledVector(up, b).addScaledVector(SUN_DIR, d);
    this.sun.target.position.copy(c); this.sun.position.copy(c).addScaledVector(SUN_DIR, 1800);
    this.sun.target.updateMatrixWorld(); this.sun.updateMatrixWorld();
    const key = `${a.toFixed(1)}|${b.toFixed(1)}|${d.toFixed(0)}|${r.toFixed(0)}|${size}`;
    if (key === this.key || !this.sun.castShadow) return false;
    this.key = key;
    const sc = this.sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 50; sc.far = 3900; sc.updateProjectionMatrix();
    this.sun.shadow.normalBias = Math.max(0.12, Math.min(1.6, ((2 * r) / size) * 0.9));
    return true;
  }
}
