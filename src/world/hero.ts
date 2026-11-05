// Hero treatment for the things the player looks at all game: their boat, its crew and the captain.
// The sea is rich and lit; flat toon boats and people dissolved into it, especially at dusk. Two cheap passes fix that:
// - an ink outline (inverted hull along smoothed normals, Deep Tide navy per the art direction), so silhouettes read;
// - a rim light (fresnel) in the sun's colour, so edges catch the low sun and separate from the water behind.
// Both work on skinned meshes (the outline is a SkinnedMesh bound to the same skeleton).
import * as THREE from 'three';
import { weather } from './materials';

/** Rim colour, driven by the atmosphere each frame (strongest when the sun is low). */
export const heroRim = { value: new THREE.Color(0, 0, 0) };
/** The sun's direction in view space, so the rim only lights edges on the sunward side. */
export const heroSunView = { value: new THREE.Vector3(0, 1, 0) };
const outlineColor = { value: new THREE.Color('#0e2233') };

const heroCache = new WeakMap<THREE.Material, THREE.Material>();

function heroMaterial(src: THREE.Material): THREE.Material {
  let m = heroCache.get(src);
  if (m) return m;
  if (!(src as THREE.MeshToonMaterial).isMeshToonMaterial) return src;
  const c = (src as THREE.MeshToonMaterial).clone();
  const amount = (src.userData.weather as { value: number } | undefined)?.value ?? 0;
  if (src.userData.weather) {
    weather(c, amount);
    c.defines = { ...(c.defines ?? {}), WX_LOCAL: '' };
  }
  const inner = c.onBeforeCompile;
  c.onBeforeCompile = (shader, r) => {
    if (src.userData.weather) inner.call(c, shader, r);
    shader.uniforms.uRim = heroRim;
    shader.uniforms.uRimSun = heroSunView;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;\nuniform vec3 uRimSun;')
      .replace(
        '#include <opaque_fragment>',
        `{
          // a thin silhouette line on the sunward edges only: a broad, all-round fresnel read as a glossy grey sheen
          // (like a reflection) over the crew and hull, worst on their shadow sides at dawn and dusk
          vec3 rn = normalize(normal);
          float fr = 1.0 - clamp(dot(rn, normalize(vViewPosition)), 0.0, 1.0);
          float sunward = smoothstep(-0.1, 0.6, dot(rn, uRimSun));
          outgoingLight += uRim * smoothstep(0.62, 0.95, fr) * sunward;
        }
        #include <opaque_fragment>`
      );
  };
  c.customProgramCacheKey = () => `hero-${src.userData.weather ? 1 : 0}`;
  heroCache.set(src, c);
  return c;
}

const outlineMats = new Map<string, THREE.MeshBasicMaterial>();
function outlineMaterial(width: number) {
  const key = width.toFixed(4);
  const cached = outlineMats.get(key);
  if (cached) return cached;
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
  const w = { value: width };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = w;
    shader.uniforms.uInk = outlineColor;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 oNormal;\nuniform float uOutline;')
      // thickness in world metres, whatever scale the model's nodes carry
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(oNormal) * uOutline / max(length(modelMatrix[0].xyz), 1e-4);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uInk;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( uInk, opacity );');
  };
  m.customProgramCacheKey = () => 'hero-outline';
  outlineMats.set(key, m);
  return m;
}

/** Per-vertex normals averaged over every vertex at the same spot, so the shell has no cracks at hard edges. */
const smoothCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
function withSmoothNormals(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const hit = smoothCache.get(g);
  if (hit) return hit;
  const pos = g.attributes.position;
  let nrm = g.attributes.normal;
  if (!nrm) {
    g.computeVertexNormals();
    nrm = g.attributes.normal;
  }
  const sum = new Map<string, THREE.Vector3>();
  const keys: string[] = new Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`;
    keys[i] = k;
    const v = sum.get(k) ?? sum.set(k, new THREE.Vector3()).get(k)!;
    v.x += nrm.getX(i);
    v.y += nrm.getY(i);
    v.z += nrm.getZ(i);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = sum.get(keys[i])!;
    const l = v.length() || 1;
    out[i * 3] = v.x / l;
    out[i * 3 + 1] = v.y / l;
    out[i * 3 + 2] = v.z / l;
  }
  const s = new THREE.BufferGeometry();
  for (const name of Object.keys(g.attributes)) s.setAttribute(name, g.attributes[name]);
  s.setIndex(g.index);
  s.setAttribute('oNormal', new THREE.BufferAttribute(out, 3));
  for (const gr of g.groups) s.addGroup(gr.start, gr.count, gr.materialIndex);
  s.boundingSphere = g.boundingSphere;
  s.boundingBox = g.boundingBox;
  smoothCache.set(g, s);
  return s;
}

/**
 * Give everything under `root` the hero look: rim-lit toon materials and an ink outline `width` metres thick
 * (0: rim only). Glowing parts, transparent cloth (sails, flags) and lines are left alone or rim-only.
 */
export function heroize(root: THREE.Object3D, width = 0.03) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.heroOutline && !m.userData.glow) meshes.push(m);
  });
  for (const m of meshes) {
    if (Array.isArray(m.material)) continue;
    const src = m.material;
    m.material = heroMaterial(src);
    if (!width || src.transparent || !(src as THREE.MeshToonMaterial).isMeshToonMaterial || m.userData.heroDone) continue;
    m.userData.heroDone = true;
    const geo = withSmoothNormals(m.geometry);
    const mat = outlineMaterial(width);
    const sk = m as THREE.SkinnedMesh;
    let o: THREE.Mesh;
    if (sk.isSkinnedMesh) {
      const s = new THREE.SkinnedMesh(geo, mat);
      s.bind(sk.skeleton, sk.bindMatrix);
      s.bindMode = sk.bindMode;
      o = s;
      s.position.copy(sk.position);
      s.quaternion.copy(sk.quaternion);
      s.scale.copy(sk.scale);
      sk.parent?.add(s);
    } else {
      o = new THREE.Mesh(geo, mat);
      m.add(o);
    }
    o.userData.heroOutline = true;
    o.castShadow = false;
    o.receiveShadow = false;
    o.frustumCulled = m.frustumCulled;
    o.renderOrder = m.renderOrder;
    m.userData.heroLink = o;
  }
}

/** Follow the atmosphere: a warm rim from the sun, strongest at dusk and dawn; a faint cool one at night. */
export function updateHeroLight(sunColor: THREE.Color, sunIntensity: number, night: number, sunDir?: THREE.Vector3, camera?: THREE.Camera) {
  const low = THREE.MathUtils.clamp((2.2 - sunIntensity) / 1.6, 0, 1);
  heroRim.value.copy(sunColor).multiplyScalar(0.1 + 0.25 * low * (1 - night));
  if (sunDir && camera) heroSunView.value.copy(sunDir).transformDirection(camera.matrixWorldInverse);
  heroRim.value.lerp(new THREE.Color(0.25, 0.32, 0.45), night * 0.6);
  outlineColor.value.set('#0e2233').multiplyScalar(1 - night * 0.5);
}
