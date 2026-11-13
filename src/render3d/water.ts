// The lake: a flat surface at height 0 whose colour comes from the distance to the shore
// (pale shallows, deep teal middle), with ripples, a sky tint at grazing angles and a foam line.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import { signedDist } from './terrain';
import { Buckets } from './mesh';

export interface Water { mesh: THREE.Mesh; time: { value: number } }

export function buildWater(poly: XY[]): Water {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  // shore distance, baked once: 0 at the shore, 1 at 40 m out into the lake
  const N = 128, data = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = minX + ((i + 0.5) / N) * (maxX - minX), y = minY + ((j + 0.5) / N) * (maxY - minY);
    data[j * N + i] = Math.max(0, Math.min(255, (-signedDist(x, y, poly) / 40) * 255));
  }
  const dist = new THREE.DataTexture(data, N, N, THREE.RedFormat); dist.magFilter = dist.minFilter = THREE.LinearFilter; dist.needsUpdate = true;

  const B = new Buckets(); B.cap('water', poly, 0, [1, 1, 1]);
  const time = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.22, metalness: 0.05 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = time; sh.uniforms.uDist = { value: dist };
    sh.uniforms.uBox = { value: new THREE.Vector4(minX, minY, maxX - minX, maxY - minY) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vW; uniform float uTime; uniform sampler2D uDist; uniform vec4 uBox;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 wp = vec2(vW.x, -vW.z);
      float sd = texture2D(uDist, (wp - uBox.xy) / uBox.zw).r;                       // 0 shore .. 1 deep
      vec3 shallow = vec3(0.36, 0.74, 0.70), deep = vec3(0.035, 0.27, 0.36);
      vec3 wcol = mix(shallow, deep, smoothstep(0.0, 0.55, sd));
      float r1 = sin(wp.x * 0.55 + wp.y * 0.21 + uTime * 0.9) * sin(wp.y * 0.47 - wp.x * 0.13 - uTime * 0.7);
      float r2 = sin(wp.x * 1.7 - uTime * 1.3) * sin(wp.y * 1.9 + uTime * 1.1);
      wcol += (r1 * 0.035 + r2 * 0.02) * vec3(0.8, 1.0, 1.0);
      float graze = pow(1.0 - abs(normalize(cameraPosition - vW).y), 3.0);            // sky tint at grazing angles
      wcol = mix(wcol, vec3(0.62, 0.78, 0.86), graze * 0.5);
      float foam = smoothstep(0.035, 0.0, sd + sin(wp.x * 0.9 + wp.y * 0.7 + uTime * 1.2) * 0.008);
      wcol = mix(wcol, vec3(0.93, 0.97, 0.95), foam * 0.75);
      diffuseColor.rgb = wcol;`);
  };
  const mesh = B.meshes(() => mat)[0]; mesh.name = 'lake'; mesh.receiveShadow = true;
  return { mesh, time };
}
