// Raider crew rendering for the Jury-Rigged look (docs/jury-rigged): per-boat crew batching and pose-proof culling.
// Pure three.js, so tests/jury.test.ts can check it on the shipped rig.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** the crew's root objects with their (already playing) actions; matches assets.ts Character */
export interface CrewMember { root: THREE.Object3D }

/**
 * Characters are built with culling off (assets.ts: a skinned mesh's bounds don't follow its animation), so every
 * raider crew member in a spawned patrol is drawn even when its boat is behind the camera or far off-screen. On a look
 * visit (docs/jury-rigged) each crew mesh gets its own bounding sphere instead, computed in the bind pose and padded
 * for the widest swing (the glaive), so off-screen crews cost no draw calls and on-screen ones never pop.
 */
const CREW_SWING = 0.9;
export function cullable(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    m.skeleton.update(); // bone matrices are zero until the first render: skin the bounds with the real pose
    m.computeBoundingSphere(); // per instance: the shared geometry and every other character are untouched
    m.boundingSphere!.radius += CREW_SWING;
    m.frustumCulled = true;
  });
}

/**
 * One draw call for a boat's whole crew (look visits, docs/jury-rigged). The crew of a Jawboat are two copies of the
 * same rigged GLB with the same material, so their meshes merge into ONE skinned mesh over a combined skeleton (both
 * characters' bones, 44 in all). Each character keeps its own bones and mixer, so they still animate independently
 * (one swings the glaive while the other idles); only the draw is shared. Halves the crew's main-pass and shadow-pass
 * draws. Falls back to the per-character meshes (each culled) if the rigs aren't the expected shape.
 */
export function batchCrew(boat: THREE.Object3D, crew: CrewMember[]): THREE.SkinnedMesh | null {
  const meshes = crew.map((c) => {
    const found: THREE.SkinnedMesh[] = [];
    c.root.traverse((o) => (o as THREE.SkinnedMesh).isSkinnedMesh && found.push(o as THREE.SkinnedMesh));
    return found;
  });
  const ok =
    crew.length > 1 &&
    meshes.every((m) => m.length === 1) &&
    meshes.every(([m]) => m.material === meshes[0][0].material && m.bindMatrix.equals(IDENTITY) && m.geometry.attributes.skinIndex);
  if (!ok) {
    for (const c of crew) cullable(c.root);
    return null;
  }
  const bones: THREE.Bone[] = [], inverses: THREE.Matrix4[] = [], geos: THREE.BufferGeometry[] = [];
  for (const [m] of meshes) {
    const g = m.geometry.clone();
    const si = g.attributes.skinIndex as THREE.BufferAttribute;
    const arr = new (si.array.constructor as Uint16ArrayConstructor)(si.array.length);
    for (let i = 0; i < arr.length; i++) arr[i] = si.array[i] + bones.length; // this character's bones follow the last's
    g.setAttribute('skinIndex', new THREE.BufferAttribute(arr, si.itemSize, si.normalized));
    geos.push(g);
    bones.push(...m.skeleton.bones);
    inverses.push(...m.skeleton.boneInverses);
  }
  const merged = mergeGeometries(geos, false);
  if (!merged || bones.length > 255) {
    for (const c of crew) cullable(c.root);
    return null;
  }
  const sm = new THREE.SkinnedMesh(merged, meshes[0][0].material);
  sm.name = 'jury_crew_batch';
  sm.castShadow = true;
  boat.add(sm);
  boat.updateMatrixWorld(true);
  sm.bind(new THREE.Skeleton(bones, inverses), new THREE.Matrix4());
  sm.updateMatrixWorld(true); // attached bind mode: bindMatrixInverse follows the boat from here on
  for (const [m] of meshes) m.parent?.remove(m);
  // cull as one: the bind-pose bounds of both crew, padded for the widest swing
  sm.skeleton.update(); // bone matrices are zero until the first render: skin the bounds with the real pose
  sm.computeBoundingSphere();
  sm.boundingSphere!.radius += CREW_SWING;
  sm.frustumCulled = true;
  return sm;
}
const IDENTITY = new THREE.Matrix4();

/**
 * Free what a look visit built for one raider boat when its patrol despawns (sailing ~650 m+ away). Without this,
 * every spawn/despawn cycle leaked the boat's own Jawboat geometry, its merged crew geometry and the merged
 * skeleton's bone texture (measured: +6 geometries per Rustfang Graveyard cycle). Only per-boat resources are
 * disposed: the shared GLB geometry and the materials stay cached for the next spawn.
 */
export function releaseBoat(boat: THREE.Object3D) {
  boat.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) {
      m.skeleton.dispose(); // per-clone skeleton (or the merged one): only its bone texture
      if (m.name === 'jury_crew_batch') m.geometry.dispose(); // built by batchCrew for this boat alone
    } else if ((m as THREE.Mesh).isMesh && m.parent === boat && boat.userData.jury === 'jawboat') {
      m.geometry.dispose(); // the Jawboat hull, built per boat by jury.ts jawboat()
    }
  });
}
