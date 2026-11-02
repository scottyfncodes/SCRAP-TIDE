// Drop-in GLB chests for TIDEBREAKERS, produced by GITCRAFT MeshCraft (creative/3d/chest*/).
//
// Not wired into the game. To adopt:
//   1. copy creative/3d/chest_{small,grand,sea}/exports/tb_chest_<tier>.three-web-toon.glb to public/models/
//   2. copy this file to src/game/chestGLB.ts
//   3. call `await preloadChests()` during loading (main.ts), then in game.ts replace
//        const c = chestMesh(tier)        with        const c = chestMeshGLB(tier) ?? chestMesh(tier)
// It returns the same { root, lid, glow } shape as chestMesh(): the lid hinges at the same
// point, opens with the same `lid.rotation.x = -1.9`, and the glow light sits where it did.
// If a file fails to load, chestMeshGLB returns null and the procedural chest is used.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { vcMat } from '../world/materials';

export type ChestTier = 'small' | 'grand' | 'sea';
const templates = new Map<ChestTier, THREE.Object3D>();

/** Load the three chest tiers once. Missing files are skipped (the procedural chest is used instead). */
export async function preloadChests(baseUrl = './models/'): Promise<ChestTier[]> {
  const loader = new GLTFLoader();
  const tiers: ChestTier[] = ['small', 'grand', 'sea'];
  await Promise.all(
    tiers.map(async (tier) => {
      try {
        const gltf = await loader.loadAsync(`${baseUrl}tb_chest_${tier}.three-web-toon.glb`);
        const root = gltf.scene.getObjectByName(`chest_${tier}`) ?? gltf.scene;
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          // the GLB carries COLOR_0, so the game's own toon material renders it like procedural geometry
          m.material = vcMat();
          m.castShadow = true;
        });
        templates.set(tier, root);
      } catch (err) {
        console.warn(`chestGLB: ${tier} not loaded, using the procedural chest`, err);
      }
    })
  );
  return [...templates.keys()];
}

/** Same contract as chestMesh(tier) in fx.ts, or null when the GLB isn't loaded. */
export function chestMeshGLB(tier: ChestTier): { root: THREE.Group; lid: THREE.Object3D; glow: THREE.PointLight } | null {
  const tpl = templates.get(tier);
  if (!tpl) return null;
  const root = new THREE.Group();
  const model = tpl.clone(true);
  model.position.set(0, 0, 0);
  root.add(model);
  const lid = model.getObjectByName('chest_lid');
  const anchor = model.getObjectByName('glow_anchor');
  if (!lid || !anchor) return null;
  const glow = new THREE.PointLight(0xffd36b, 0, 8, 2);
  glow.position.copy(anchor.position);
  root.add(glow);
  return { root, lid, glow };
}
