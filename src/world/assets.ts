// Runtime loader for the GITCRAFT MeshCraft/ForgeCraft exports in public/models (three-web-toon GLBs:
// COLOR_0 vertex colours, metres, Y-up, front = +Z). Each named node is flattened into one vertex-coloured
// geometry so it renders with the game's own toon material in a single draw call; emissive parts (lit
// windows, lamps, flares) go to a separate unlit "glow" geometry so they shine at night.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// the ship models ship Meshopt-compressed (EXT_meshopt_compression + KHR_mesh_quantization); the decoder comes with three
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { merge, vcMat, toonGradient, weather, paint } from './materials';
import { CHARACTER_FORM, FORM_SHADE, FORM_SHADED_CHARACTERS, WORLD_PALETTE, isFormShaded, type FormShadeParams } from './style';

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
  // island scatter + Driftholm's pier furniture, and the one-off landmarks (MeshCraft, creative/3d-coast)
  'tb_coast_kit',
  'tb_landmark_kit',
  // finds and wildlife (chests, crate, bottle, dig mound, crab, gull, beach pickups) and ship fittings (anchor, paddle,
  // the skiff's rudder and mast, deck trophies), MeshCraft, creative/3d-finds
  'tb_finds_kit',
  'tb_fittings_kit',
  // the Patchwork Skiff starter boat: a scrap-welded Waterworld x Mad Max hull in the dinghy's frame (creative/3d-skiff)
  'tb_patchwork_skiff',
  // GITCRAFT TIDEBREAKERS 3D package: the Coastal Sloop player boat (hull, deck, cabin, rig, sails, socket_* nodes)
  'tb_coastal_sloop',
  // its outrigger floats and cross-beams (MeshCraft, creative/3d-sloop/outriggers), placed in the sloop's frame
  'tb_sloop_outriggers',
  // its welded scrap dress (MeshCraft, creative/3d-sloop/scrap): patches, ram, spikes, tyres, chain, in the sloop's frame
  'tb_sloop_scrap',
  // the sloop's upgrade models (GITCRAFT TIDEBREAKERS 3D package), each mounted on its socket_* node when owned
  'tb_upg_canvas_mainsail',
  'tb_upg_cargo_crates',
  'tb_upg_brass_compass',
  'tb_upg_wheel_rudder',
  'tb_upg_copper_hull',
  // the rest of the Trimaran's upgrades, modelled in MeshCraft in the sloop's frame (creative/3d-sloop/upgrades)
  'tb_upg_container_cabin',
  'tb_upg_solar_array',
  'tb_upg_radar_mast',
  'tb_upg_deck_turbine',
  'tb_upg_fishing_rig',
  'tb_upg_outboard',
  'tb_upg_twin_diesel',
  'tb_upg_harpoon_turret',
  'tb_upg_salvage_crane',
  'tb_upg_fuel_drums',
  'tb_upg_cargo_nets',
  'tb_upg_armour_plating',
  'tb_upg_deck_lights',
  // the Ironwake Expedition Cat (MeshCraft, creative/3d-ironwake): twin hulls, bridge deck, wheelhouse and mast in
  // shipModel.ts's own frame; loaded lazily like the upgrades, only when the save sails it
  'tb_ironwake',
] as const;
export type ModelFile = (typeof MODEL_FILES)[number];
/**
 * Upgrade models load lazily: at boot only the ones the save already owns (on the Trimaran), the rest when bought
 * (loadModelFiles). Until a file arrives, its upgrade's code-built part stands in.
 */
export const UPGRADE_MODEL_FILES: readonly string[] = MODEL_FILES.filter((f) => f.startsWith('tb_upg_'));
/** Vessel models that load lazily too: only a save that sails the vessel fetches it. */
export const VESSEL_MODEL_FILES: readonly string[] = ['tb_ironwake'];
const lazyFile = (f: string) => UPGRADE_MODEL_FILES.includes(f) || VESSEL_MODEL_FILES.includes(f);
const CORE_MODEL_FILES: readonly string[] = MODEL_FILES.filter((f) => !lazyFile(f));

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

const requested = new Map<string, Promise<void>>();
let sharedLoader: GLTFLoader | null = null;
const loaderFor = () => (sharedLoader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder));
/** Load model files once each (a second request for the same file shares the first). Failures fall back. */
export function loadModelFiles(files: readonly string[]) {
  return Promise.all(
    files.map((n) => {
      let p = requested.get(n);
      if (!p) requested.set(n, (p = loadOne(loaderFor(), n)));
      return p;
    })
  ).then(() => undefined);
}
/** Has this file been asked for (loaded, loading or failed)? */
export const modelRequested = (file: string) => requested.has(file);

/**
 * Load the world/boat models in parallel (blocking the loading screen), plus the upgrade models in `upgrades` (the
 * ones the save owns). Failures fall back to procedural geometry.
 */
export async function loadModels(onProgress?: (k: number) => void, upgrades: readonly string[] = []) {
  const names = [...CORE_MODEL_FILES, ...upgrades.filter(lazyFile)];
  let done = 0;
  await Promise.all(
    names.map((n) =>
      loadModelFiles([n]).then(() => {
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
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
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

/**
 * Plain float attributes: de-interleaved, and de-quantized (KHR_mesh_quantization stores positions/normals as
 * normalized integers behind a node scale). Baking a node's matrix into an int16 position attribute would clamp the
 * result to +-1, so anything that is transformed or merged goes through this first.
 */
function toFloat(geo: THREE.BufferGeometry) {
  for (const [k, a] of Object.entries(geo.attributes)) {
    const at = a as THREE.BufferAttribute;
    if (!(at as unknown as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute && at.array instanceof Float32Array && !at.normalized) continue;
    const out = new Float32Array(at.count * at.itemSize);
    for (let i = 0; i < at.count; i++) for (let j = 0; j < at.itemSize; j++) out[i * at.itemSize + j] = at.getComponent(i, j);
    geo.setAttribute(k, new THREE.BufferAttribute(out, at.itemSize));
  }
  return geo;
}

/**
 * Flatten node `name` of `file` (its meshes) into toon + glow geometries, in the node's own space, or with
 * `inFile` in the file's space (for models built in a shared frame, e.g. the sloop's upgrades, whose parts keep
 * their placement as node transforms).
 */
export function part(file: string, name: string, inFile = false) {
  const key = `${file}#${name}${inFile ? '@file' : ''}`;
  if (partCache.has(key)) return partCache.get(key)!;
  const g = gltfs.get(file);
  if (!g) return null; // not loaded (yet): don't cache, the file may still arrive (lazy upgrade models)
  const node = g.scene.getObjectByName(name);
  if (!node) {
    partCache.set(key, null);
    return null;
  }
  g.scene.updateMatrixWorld(true);
  const inv = inFile ? g.scene.matrixWorld.clone().invert() : node.matrixWorld.clone().invert();
  const solid: THREE.BufferGeometry[] = [];
  const glow: THREE.BufferGeometry[] = [];
  node.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh) return;
    const geo = toFloat(m.geometry.clone());
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
  if (solid.length && isFormShaded(file, name)) formShade(out.geo);
  partCache.set(key, out);
  return out;
}

/**
 * Baked form shading (style.ts FORM_SHADE): ambient occlusion written into the vertex colours once, at load, so a
 * building or prop is defined by light instead of outlines. Contact darkening toward the piece's base, soft darkening
 * under overhangs (down-facing faces), a slight sun-bleached lift on top faces, and near-black colours (window holes,
 * hatches) lifted to a deep warm shadow. Free at runtime: same vertex count, same material, same draw calls.
 */
export function formShade(geo: THREE.BufferGeometry, F: FormShadeParams = FORM_SHADE) {
  const pos = geo.attributes.position;
  const col = geo.attributes.color as THREE.BufferAttribute | undefined;
  if (!col || !pos.count) return geo;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const span = Math.max(1e-4, (bb.max.y - bb.min.y) * FORM_SHADE.contactHeight);
  const open = new THREE.Color(WORLD_PALETTE.opening);
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - bb.min.y) / span, 0, 1);
    let k = F.contactFloor + (1 - F.contactFloor) * t * t * (3 - 2 * t);
    const ny = nrm.getY(i);
    k *= ny < 0 ? 1 + (F.underside - 1) * -ny : 1 + (F.topLift - 1) * ny;
    let r = col.getX(i) * k, g = col.getY(i) * k, b = col.getZ(i) * k;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < F.blackLift) {
      const w = lum / F.blackLift;
      r = open.r + (r - open.r) * w;
      g = open.g + (g - open.g) * w;
      b = open.b + (b - open.b) * w;
    }
    col.setXYZ(i, r, g, b);
  }
  col.needsUpdate = true;
  return geo;
}

/**
 * A whole model file as a live scene graph (node names, socket_* empties and transforms intact) rendered with the
 * game's toon material (vertex colours) and the unlit glow material for emissive parts. Geometry is shared between
 * clones. Returns null if the file failed to load so callers can fall back to procedural geometry.
 */
export function sceneModel(file: string, opts: { shadows?: boolean; side?: THREE.Side } = {}): THREE.Object3D | null {
  const g = gltfs.get(file);
  if (!g) return null;
  const root = g.scene.clone(true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    m.userData.srcMaterial = src.name;
    if (isGlowMaterial(src)) {
      m.material = glowMat();
      m.userData.glow = true;
    } else {
      m.material = vcMat({ side: opts.side });
      m.castShadow = !!opts.shadows;
      m.receiveShadow = !!opts.shadows;
    }
  });
  return root;
}

/**
 * Bake a sceneModel() clone (after tintModel, node transforms and scales applied) into plain toon and glow geometries
 * in `root`'s space, so a many-material model joins a batched mesh: one draw call instead of one per material.
 * `skip` names nodes to leave out (with their children); `only`, if given, bakes just those nodes.
 */
export function bakeModel(
  root: THREE.Object3D,
  solid: THREE.BufferGeometry[],
  glow: THREE.BufferGeometry[],
  opts: { skip?: readonly string[]; only?: readonly string[] } = {}
) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const under = (o: THREE.Object3D | null, names: readonly string[]): boolean => !!o && o !== root && (names.includes(o.name) || under(o.parent, names));
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || under(m, opts.skip ?? []) || (opts.only && !under(m, opts.only))) return;
    const geo = toFloat(m.geometry.clone());
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const c = geo.attributes.color;
    if (c && c.itemSize === 4) {
      const arr = new Float32Array(c.count * 3);
      for (let i = 0; i < c.count; i++) arr.set([c.getX(i), c.getY(i), c.getZ(i)], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    geo.deleteAttribute('normal'); // flat toon normals are rebuilt on merge (and a non-uniform scale would skew these)
    (m.userData.glow ? glow : solid).push(geo);
  });
}

const tintCache = new Map<string, THREE.BufferGeometry>();
/** A colour for every face of a material, or a base colour with a horizontal band (a sail's stripe). */
export type Tint = THREE.ColorRepresentation | { base: THREE.ColorRepresentation; band: THREE.ColorRepresentation; from: number; to: number };

/**
 * Recolour a sceneModel() clone by source material name: every face of a matching mesh takes the new colour, keeping
 * its own light/dark variation from MeshCraft's per-face bake (vertex luminance relative to the mesh's mean). A band
 * tint colours the faces whose centre sits between `from` and `to` (0..1 of the mesh's own height) with `band`.
 * Geometry is cloned once per (mesh, colours) and shared, never edited in place, so other clones keep their colours.
 */
export function tintModel(root: THREE.Object3D, colors: Record<string, Tint>) {
  const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const want = m.isMesh ? colors[m.userData.srcMaterial as string] : undefined;
    if (want === undefined) return;
    const src = (m.userData.srcGeometry as THREE.BufferGeometry | undefined) ?? m.geometry;
    m.userData.srcGeometry = src;
    const banded = typeof want === 'object' && want !== null && 'band' in want;
    const base = new THREE.Color(banded ? want.base : (want as THREE.ColorRepresentation)); // linear, like glTF COLOR_0
    const band = banded ? new THREE.Color(want.band) : base;
    const key = `${src.uuid}|${base.getHexString()}|${banded ? `${band.getHexString()}|${want.from}|${want.to}` : ''}`;
    let geo = tintCache.get(key);
    if (!geo) {
      if (!src.attributes.color) return;
      // bands need whole faces, so work on unshared vertices (MeshCraft already bakes colour per face)
      const g = banded && src.index ? src.toNonIndexed() : src.clone();
      const c = g.attributes.color;
      const pos = g.attributes.position;
      let mean = 0;
      for (let i = 0; i < c.count; i++) mean += lum(c.getX(i), c.getY(i), c.getZ(i));
      mean = mean / c.count || 1;
      let y0 = 0, y1 = 1;
      if (banded) {
        g.computeBoundingBox();
        y0 = g.boundingBox!.min.y;
        y1 = g.boundingBox!.max.y;
      }
      const arr = new Float32Array(c.count * 3);
      for (let i = 0; i < c.count; i++) {
        let col = base;
        if (banded && !g.index) {
          // a face's vertical mid-span (not its centroid): both triangles of a sail quad agree, so band edges stay straight
          const f = i - (i % 3);
          const ya = pos.getY(f), yb = pos.getY(f + 1), yc = pos.getY(f + 2);
          const cy = (Math.min(ya, yb, yc) + Math.max(ya, yb, yc)) / 2;
          const t = (cy - y0) / (y1 - y0 || 1);
          if (t >= want.from && t <= want.to) col = band;
        }
        const k = Math.min(1.35, Math.max(0.65, lum(c.getX(i), c.getY(i), c.getZ(i)) / mean));
        arr[i * 3] = col.r * k;
        arr[i * 3 + 1] = col.g * k;
        arr[i * 3 + 2] = col.b * k;
      }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      geo = g;
      tintCache.set(key, geo);
    }
    m.geometry = geo;
  });
}

/**
 * Drop the faces of one material whose centre (in `root`'s space) passes `cut`, e.g. a model's own mainsail when an
 * upgrade sail replaces it. Shared, cached geometry like tintModel (tint afterwards: it starts from the cut mesh).
 */
export function cullModel(root: THREE.Object3D, material: string, tag: string, cut: (c: THREE.Vector3) => boolean) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.srcMaterial !== material) return;
    const src = (m.userData.srcGeometry as THREE.BufferGeometry | undefined) ?? m.geometry;
    const key = `${src.uuid}|cut:${tag}`;
    let geo = tintCache.get(key);
    if (!geo) {
      const g = src.index ? src.toNonIndexed() : src.clone();
      const pos = g.attributes.position;
      const mtx = new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld);
      const keep: number[] = [];
      const c = new THREE.Vector3(), v = new THREE.Vector3();
      for (let f = 0; f < pos.count; f += 3) {
        c.set(0, 0, 0);
        for (let k = 0; k < 3; k++) c.add(v.fromBufferAttribute(pos, f + k));
        c.multiplyScalar(1 / 3).applyMatrix4(mtx);
        if (!cut(c)) keep.push(f, f + 1, f + 2);
      }
      for (const [name, a] of Object.entries(g.attributes)) {
        // read through getComponent (handles interleaved and normalized data); write plain floats
        const attr = a as THREE.BufferAttribute;
        const out = new Float32Array(keep.length * attr.itemSize);
        keep.forEach((src2, i) => {
          for (let k = 0; k < attr.itemSize; k++) out[i * attr.itemSize + k] = attr.getComponent(src2, k);
        });
        g.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize));
      }
      geo = g;
      tintCache.set(key, geo);
    }
    m.geometry = geo;
    m.userData.srcGeometry = geo;
    m.visible = geo.attributes.position.count > 0;
  });
}

/** Where node `name` of `file` sits in the file's space (a moving part's pivot), or null. */
export function nodeOrigin(file: string, name: string) {
  const g = gltfs.get(file);
  const node = g?.scene.getObjectByName(name);
  if (!g || !node) return null;
  g.scene.updateMatrixWorld(true);
  return node.getWorldPosition(new THREE.Vector3()).applyMatrix4(g.scene.matrixWorld.clone().invert());
}

/** Move one material's faces by `delta` (shared, cached geometry), e.g. a fitting relocated to make room. */
export function offsetModel(root: THREE.Object3D, material: string, delta: THREE.Vector3) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.srcMaterial !== material) return;
    const src = (m.userData.srcGeometry as THREE.BufferGeometry | undefined) ?? m.geometry;
    // `delta` is in the model's (root) space; the mesh's own space may be scaled (quantized meshes)
    const toMesh = new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld).invert();
    const d = delta.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(toMesh));
    const key = `${src.uuid}|move:${d.toArray().map((v) => v.toFixed(5)).join(',')}`;
    let geo = tintCache.get(key);
    if (!geo) {
      geo = src.clone();
      const pos = src.attributes.position;
      const out = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        out[i * 3] = pos.getX(i) + d.x;
        out[i * 3 + 1] = pos.getY(i) + d.y;
        out[i * 3 + 2] = pos.getZ(i) + d.z;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(out, 3));
      geo.computeBoundingSphere();
      tintCache.set(key, geo);
    }
    m.geometry = geo;
    m.userData.srcGeometry = geo;
  });
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
export function kitGeo(file: string, name: string, x: number, y: number, z: number, ry = 0, s = 1, rz = 0) {
  const p = part(file, name);
  if (!p) return null;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(s, s, s));
  return { geo: p.geo.clone().applyMatrix4(m), glow: p.glow ? p.glow.clone().applyMatrix4(m) : null };
}

/**
 * A kit piece in an item's own colours: node `base` as modelled, plus `base__a` / `base__b` recoloured to `a` / `b`
 * (an item's two colours in items.ts). Null if the kit is not loaded or has no such piece.
 */
export function tintedPart(file: string, base: string, a: THREE.ColorRepresentation, b: THREE.ColorRepresentation = a) {
  const fixed = part(file, base);
  const pa = part(file, `${base}__a`);
  const pb = part(file, `${base}__b`);
  if (!pa) return null;
  const geos = [paint(pa.geo.clone(), a, 0.06)];
  if (pb) geos.push(paint(pb.geo.clone(), b, 0.06));
  if (fixed && fixed.geo.attributes.position) geos.push(fixed.geo.clone());
  return merge(geos);
}

const skinMats = new Map<THREE.Material, THREE.Material>();
/** A rigged crew member (MeshCraft survivor, Mixamo-named bones) with its own mixer and actions. */
export function crewModel(role: string) {
  return characterModel(`tb_crew_${role}`);
}

const formShaded = new WeakSet<THREE.BufferGeometry>();
export type Character = { root: THREE.Object3D; mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction> };
/** Any rigged character GLB: a skeleton-safe clone, the game's toon material, a mixer and one action per clip. */
export function characterModel(file: string): Character | null {
  const g = gltfs.get(file);
  if (!g) return null;
  const root = SkeletonUtils.clone(g.scene);
  mergeSkinned(root);
  const shapeByLight = FORM_SHADED_CHARACTERS.includes(file);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    // style.ts CHARACTER_FORM, once per geometry (clones share the GLB's geometry unless mergeSkinned rebuilt it)
    if (shapeByLight && m.geometry.attributes.color && !formShaded.has(m.geometry)) {
      formShaded.add(m.geometry);
      formShade(m.geometry, CHARACTER_FORM);
    }
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
