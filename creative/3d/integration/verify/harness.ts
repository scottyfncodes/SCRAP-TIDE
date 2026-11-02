// Side-by-side: the game's procedural chestMesh() vs the MeshCraft GLB through chestMeshGLB(), same calls as game.ts.
import * as THREE from 'three';
import { chestMesh } from './game/fx';
import { preloadChests, chestMeshGLB, type ChestTier } from './game/chestGLB';
const out: Record<string, unknown> = {};
(async () => {
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c') as HTMLCanvasElement, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1500, 700, false); renderer.setClearColor(0xbfe3ea); renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x6a8fb0, 1.5));
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.4); sun.position.set(-6, 10, 8); sun.castShadow = true; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshToonMaterial({ color: 0xf7d9a0 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  out.loaded = await preloadChests('./models/');
  const tiers: ChestTier[] = ['small', 'grand', 'sea'];
  const pairs: { proc: ReturnType<typeof chestMesh>; glb: NonNullable<ReturnType<typeof chestMeshGLB>> }[] = [];
  tiers.forEach((t, i) => {
    const proc = chestMesh(t); const glb = chestMeshGLB(t);
    if (!glb) throw new Error('GLB chest missing: ' + t);
    proc.root.position.set(-7 + i * 5, 0, 0); glb.root.position.set(-5 + i * 5, 0, 0);
    proc.root.rotation.y = glb.root.rotation.y = 0.35;
    scene.add(proc.root, glb.root); pairs.push({ proc, glb });
  });
  const cam = new THREE.PerspectiveCamera(32, 1500 / 700, 0.1, 100); cam.position.set(0, 5.2, 12.5); cam.lookAt(0, 0.9, 0);
  const snap = (label: string) => { renderer.render(scene, cam); out[label] = (renderer.domElement as HTMLCanvasElement).toDataURL('image/png'); };
  snap('closed');
  // what game.ts does when a chest is opened: c.lid.rotation.x = -1.9; glow on
  const hinge = (o: THREE.Object3D) => { const p = new THREE.Vector3(); o.getWorldPosition(p); return p.toArray().map((v) => +v.toFixed(3)); };
  out.hinges = pairs.map(({ proc, glb }) => ({ proc: hinge(proc.lid), glb: hinge(glb.lid), procRoot: proc.root.position.toArray(), glbRoot: glb.root.position.toArray() }));
  for (const { proc, glb } of pairs) { proc.lid.rotation.x = glb.lid.rotation.x = -1.9; proc.glow.intensity = glb.glow.intensity = 3; }
  snap('open');
  (window as unknown as { __out: unknown }).__out = out;
})().catch((e) => { (window as unknown as { __out: unknown }).__out = { error: String(e) }; });
