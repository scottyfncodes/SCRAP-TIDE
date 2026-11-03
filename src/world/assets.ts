// Runtime loader for the GITCRAFT MeshCraft/ForgeCraft exports in public/models (three-web-toon GLBs:
// COLOR_0 vertex colours, metres, Y-up, front = +Z). Each named node is flattened into one vertex-coloured
// geometry so it renders with the game's own toon material in a single draw call; emissive parts (lit
// windows, lamps, flares) go to a separate unlit "glow" geometry so they shine at night.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { merge, vcMat, toonGradient, weather } from './materials';

export const MODEL_FILES = [
  'tb_tower_glass',
  'tb_tower_brick',
  'tb_tower_spire',
  'tb_tower_stump',
  'tb_oil_rig',
  'tb_containers',
  'tb_tanker_wreck',
  'tb_settlement_kit',
  'tb_boat_kit',
  'tb_raider_skiff',
  'tb_debris_kit',
  'tb_trawler_wreck',
  'tb_port_crane',
  'tb_flotsam_kit',
  // Waterworld art-direction pass (creative/3d-waterworld): atoll structures, outpost props and boats, living plants
  'tb_atoll_kit',
  'tb_outpost_kit',
  'tb_flora_kit',
] as const;
export type ModelFile = (typeof MODEL_FILES)[number];

export const CREW_FILES = ['mechanic', 'navigator', 'salvager', 'fisher', 'lookout', 'defender'] as const;
/** Apocalyptic-pirate cast (creative/3d-characters): the captain, Driftholm's townsfolk and the Rustfang raiders. */
export const CHARACTER_FILES = ['tb_captain', 'tb_npc_trader', 'tb_npc_elder', 'tb_npc_dockhand', 'tb_raider'] as const;

const gltfs = new Map<string, GLTF>();
const partCache = new Map<string, { geo: THREE.BufferGeometry; glow: THREE.BufferGeometry | null } | null>();
export const loadReport: { file: string; ok: boolean; ms: number; bytes?: number; error?: string }[] = [];

let glowMaterial: THREE.MeshBasicMaterial | null = null;
export function glowMat() {
  if (!glowMaterial) glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: true });
  return glowMaterial;
}

function url(name: string) {
  return `${import.meta.env.BASE_URL}models/${name}.glb`;
}

async function loadOne(loader: GLTFLoader, name: string) {
  const t0 = performance.now();
  try {
    const g = await loader.loadAsync(url(name));
    gltfs.set(name, g);
    loadReport.push({ file: name, ok: true, ms: Math.round(performance.now() - t0) });
  } catch (e) {
    loadReport.push({ file: name, ok: false, ms: Math.round(performance.now() - t0), error: String((e as Error)?.message ?? e) });
    console.warn('model failed to load, using procedural fallback:', name, e);
  }
}

/** Load the world/boat models in parallel (blocking the loading screen). Failures fall back to procedural geometry. */
export async function loadModels(onProgress?: (k: number) => void) {
  const loader = new GLTFLoader();
  const names = [...MODEL_FILES];
  let done = 0;
  await Promise.all(
    names.map((n) =>
      loadOne(loader, n).then(() => {
        done++;
        onProgress?.(done / names.length);
      })
    )
  );
}

/** Crew characters stream in after the title screen so first load stays light on cellular. */
let crewPromise: Promise<void> | null = null;
export function loadCrew() {
  if (!crewPromise) {
    const loader = new GLTFLoader();
    crewPromise = Promise.all([...CREW_FILES.map((r) => `tb_crew_${r}`), ...CHARACTER_FILES].map((n) => loadOne(loader, n))).then(() => undefined);
  }
  return crewPromise;
}

export function hasModel(file: string) {
  return gltfs.has(file);
}

function isGlowMaterial(m: THREE.Material | THREE.Material[]) {
  const mm = (Array.isArray(m) ? m[0] : m) as THREE.MeshStandardMaterial;
  return !!mm?.emissive && mm.emissive.r + mm.emissive.g + mm.emissive.b > 0.05 && (mm.emissiveIntensity ?? 1) > 0;
}

/** Flatten node `name` of `file` (its meshes, in the node's own space) into toon + glow geometries. */
export function part(file: string, name: string) {
  const key = `${file}#${name}`;
  if (partCache.has(key)) return partCache.get(key)!;
  const g = gltfs.get(file);
  const node = g?.scene.getObjectByName(name);
  if (!g || !node) {
    partCache.set(key, null);
    return null;
  }
  g.scene.updateMatrixWorld(true);
  const inv = node.matrixWorld.clone().invert();
  const solid: THREE.BufferGeometry[] = [];
  const glow: THREE.BufferGeometry[] = [];
  node.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh) return;
    const geo = m.geometry.clone();
    // de-interleave (some optimisers pack vertex attributes together; the static batcher needs plain arrays)
    for (const [k, a] of Object.entries(geo.attributes)) if ((a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) geo.setAttribute(k, (a as THREE.InterleavedBufferAttribute).clone());
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    if (!geo.attributes.color) {
      const c = (m.material as THREE.MeshStandardMaterial).color ?? new THREE.Color(1, 1, 1);
      const n = geo.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    } else if (geo.attributes.color.itemSize === 4 || geo.attributes.color.normalized) {
      // drop alpha / unpack 8-bit colours so all parts merge with the procedural (float RGB) layout
      const src = geo.attributes.color;
      const arr = new Float32Array(src.count * 3);
      for (let i = 0; i < src.count; i++) arr.set([src.getX(i), src.getY(i), src.getZ(i)], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    (isGlowMaterial(m.material) ? glow : solid).push(geo);
  });
  const out = { geo: solid.length ? merge(solid) : new THREE.BufferGeometry(), glow: glow.length ? merge(glow) : null };
  partCache.set(key, out);
  return out;
}

/** A renderable group for a node: toon mesh + unlit glow mesh. Shares geometry between instances. */
export function model(file: string, name: string, opts: { shadows?: boolean; side?: THREE.Side } = {}): THREE.Group | null {
  const p = part(file, name);
  if (!p) return null;
  const grp = new THREE.Group();
  grp.name = name;
  const mesh = new THREE.Mesh(p.geo, vcMat({ side: opts.side }));
  mesh.castShadow = !!opts.shadows;
  mesh.receiveShadow = !!opts.shadows;
  grp.add(mesh);
  if (p.glow) {
    const gm = new THREE.Mesh(p.glow, glowMat());
    gm.userData.glow = true;
    grp.add(gm);
  }
  return grp;
}

/**
 * A node's geometry baked into world space, ready to merge into a static batch (one draw call for a whole
 * settlement). Returns null if the model failed to load so callers can skip or fall back.
 */
export function kitGeo(file: string, name: string, x: number, y: number, z: number, ry = 0, s = 1) {
  const p = part(file, name);
  if (!p) return null;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, s, s));
  return { geo: p.geo.clone().applyMatrix4(m), glow: p.glow ? p.glow.clone().applyMatrix4(m) : null };
}

const skinMats = new Map<THREE.Material, THREE.Material>();
/** A rigged crew member (MeshCraft survivor, Mixamo-named bones) with its own mixer and actions. */
export function crewModel(role: string) {
  return characterModel(`tb_crew_${role}`);
}

export type Character = { root: THREE.Object3D; mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction> };
/** Any rigged character GLB: a skeleton-safe clone, the game's toon material, a mixer and one action per clip. */
export function characterModel(file: string): Character | null {
  const g = gltfs.get(file);
  if (!g) return null;
  const root = SkeletonUtils.clone(g.scene);
  mergeSkinned(root);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    let tm = skinMats.get(src);
    if (!tm) {
      tm = weather(new THREE.MeshToonMaterial({ vertexColors: !!m.geometry.attributes.color, color: m.geometry.attributes.color ? 0xffffff : src.color, gradientMap: toonGradient() }), 0.45);
      skinMats.set(src, tm);
    }
    m.material = tm;
    m.castShadow = true;
    m.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(root);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
  return { root, mixer, actions };
}

/** Merge sibling SkinnedMesh primitives that share a skeleton into one vertex-coloured SkinnedMesh. */
function mergeSkinned(root: THREE.Object3D) {
  const groups = new Map<THREE.Object3D, THREE.SkinnedMesh[]>();
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh && m.parent) {
      const k = m.parent;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(m);
    }
  });
  for (const [parent, list] of groups) {
    if (list.length < 2 || list.some((m) => m.skeleton.bones[0] !== list[0].skeleton.bones[0] || !m.matrix.equals(list[0].matrix))) continue;
    const geos = list.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      const n = g.attributes.position.count;
      if (!g.attributes.color) {
        const c = (m.material as THREE.MeshStandardMaterial).color ?? new THREE.Color(1, 1, 1);
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      } else if (g.attributes.color.itemSize === 4) {
        const src = g.attributes.color;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) arr.set([src.getX(i), src.getY(i), src.getZ(i)], i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      }
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'skinIndex', 'skinWeight'].includes(k)) g.deleteAttribute(k);
      for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const first = list[0];
    const sm = new THREE.SkinnedMesh(merged, weather(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() }), 0.45));
    sm.name = first.name;
    sm.position.copy(first.position);
    sm.quaternion.copy(first.quaternion);
    sm.scale.copy(first.scale);
    sm.bind(first.skeleton, first.bindMatrix);
    for (const m of list) parent.remove(m);
    parent.add(sm);
  }
}
