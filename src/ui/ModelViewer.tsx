// Dev route ?model=<buildingId>: one building (with its own forecourt) alone on a plain cream ground, seen as the
// approved renders are: a 3/4 view about 32° down through a narrow lens, warm sun from the left.
// Options: &az=<degrees> (compass direction from the building to the camera, from east, counter-clockwise; default -45 = south-east),
// &pitch=<degrees>, &fov=<degrees> (default 14), &part=<index> (frame on that data part only, for close views),
// &outline=1 (the data footprint in yellow). scripts/compare-model.mjs screenshots this page next to the real photos.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadLayout } from '../geo/source';
import { Buckets } from '../render3d/mesh';
import { addBuilding } from '../render3d/buildings';
import { createMaterial, loadTextures } from '../render3d/materials';
import { partFootprint } from '../render3d/terrain';

const D2R = Math.PI / 180;

export default function ModelViewer({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState('Building the model…');
  useEffect(() => {
    let dead = false, renderer: THREE.WebGLRenderer | null = null;
    const qs = new URLSearchParams(location.search), az = Number(qs.get('az') ?? -45) * D2R, pitch = Number(qs.get('pitch') ?? 32) * D2R;
    Promise.all([loadLayout(), loadTextures()]).then(([{ layout }, tex]) => {
      if (dead || !ref.current) return;
      const b = layout.buildings.find(x => x.id === id);
      if (!b) { setMsg(`No building "${id}". Try: ${layout.buildings.filter(x => !x.unnamed).map(x => x.id).join(', ')}`); return; }
      const g = b.groundElev ?? 0, B = new Buckets();
      addBuilding(B, b, layout.entrances, { entrances: layout.entrances, landmarks: layout.landmarks, areas: layout.areas, forecourt: true });
      const scene = new THREE.Scene(), bg = new THREE.Color('#F4EFE3'); scene.background = bg;
      const mats = new Map<string, THREE.Material>(), group = new THREE.Group();
      for (const m of B.meshes(k => { let x = mats.get(k); if (!x) { x = createMaterial(k, tex); mats.set(k, x); } return x; })) { m.castShadow = m.receiveShadow = true; group.add(m); }
      scene.add(group);
      // &outline=1: the data footprint of every part in yellow, drawn over everything (size check against the real footprint)
      if (qs.get('outline')) for (const p of b.parts) {
        const pts = partFootprint(p).map(([x, y]) => new THREE.Vector3(x, (b.groundElev ?? 0) + 0.5, -y));
        const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#FFD23F', depthTest: false }));
        line.renderOrder = 10; scene.add(line);
      }
      const box = new THREE.Box3().setFromObject(group); box.min.y = g; // ignore the skirt below ground
      const centre = box.getCenter(new THREE.Vector3()), radius = box.getSize(new THREE.Vector3()).length() / 2;
      const ground = new THREE.Mesh(new THREE.CircleGeometry(radius * 12, 48), new THREE.MeshStandardMaterial({ color: '#F1EBDD', roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(centre.x, g - 0.02, centre.z); ground.receiveShadow = true; scene.add(ground);

      // warm low sun from the camera's left, a cool fill from the sky
      const sunAz = az - 55 * D2R, el = 30 * D2R, dir = new THREE.Vector3(Math.cos(el) * Math.cos(sunAz), Math.sin(el), -Math.cos(el) * Math.sin(sunAz));
      const sun = new THREE.DirectionalLight('#FFD9A3', 6.2); sun.position.copy(centre).addScaledVector(dir, radius * 4); sun.target.position.copy(centre);
      sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.08;
      const sc = sun.shadow.camera; sc.left = sc.bottom = -radius * 1.6; sc.right = sc.top = radius * 1.6; sc.near = 1; sc.far = radius * 9; sc.updateProjectionMatrix();
      scene.add(sun, sun.target, new THREE.HemisphereLight('#C9DBEC', '#B79C74', 2.2));

      const cv = ref.current, W = cv.clientWidth, H = cv.clientHeight, fov = Number(qs.get('fov') ?? 14), focus = qs.get('part') !== null ? b.parts[Number(qs.get('part'))] : null;
      const cam = new THREE.PerspectiveCamera(fov, W / H, 1, 1);
      // back off until the whole model just fills the frame, as the renders do
      let dist = radius / Math.sin((fov * D2R) / 2);
      if (focus) { centre.set(focus.cx, g + 8, -focus.cy); dist = (Math.hypot(focus.w, focus.d) / 2 + 8) / Math.sin((fov * D2R) / 2); }
      for (let pass = 0; pass < (focus ? 0 : 4); pass++) {
        cam.position.set(centre.x + dist * Math.cos(pitch) * Math.cos(az), centre.y + dist * Math.sin(pitch), centre.z - dist * Math.cos(pitch) * Math.sin(az));
        cam.near = dist * 0.2; cam.far = dist * 3; cam.lookAt(centre); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
        let m = 0; const v = new THREE.Vector3();
        for (const o of group.children) { // every vertex above the ground, so a building at an angle is framed tightly
          const p = (o as THREE.Mesh).geometry.getAttribute('position');
          for (let i = 0; i < p.count; i++) { if (p.getY(i) < g + 0.6) continue; v.set(p.getX(i), p.getY(i), p.getZ(i)).project(cam); m = Math.max(m, Math.abs(v.x), Math.abs(v.y)); }
        }
        dist *= m / 0.88;
      }
      dist /= Number(qs.get('zoom') ?? 1); // &zoom=: closer than the fitted framing
      cam.position.set(centre.x + dist * Math.cos(pitch) * Math.cos(az), centre.y + dist * Math.sin(pitch), centre.z - dist * Math.cos(pitch) * Math.sin(az));
      cam.near = dist * 0.1; cam.far = dist * 4; cam.lookAt(centre); cam.updateProjectionMatrix();
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(W, H, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.render(scene, cam); renderer.render(scene, cam);
      setMsg('');
      // sizes for the footprint check: the model's highest point above its ground, and each data part's size and floors
      const parts = b.parts.map(p => ({ w: +p.w.toFixed(1), d: +p.d.toFixed(1), floors: p.floors }));
      (window as unknown as Record<string, unknown>).__modelReady = { id, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, topM: +(box.max.y - g).toFixed(1), parts };
    }).catch(e => setMsg(String(e)));
    return () => { dead = true; renderer?.dispose(); };
  }, [id]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F4EFE3' }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      {msg && <div style={{ position: 'absolute', left: 16, top: 16, font: '600 14px Inter, system-ui, sans-serif', color: '#0F4D32' }}>{msg}</div>}
    </div>
  );
}
