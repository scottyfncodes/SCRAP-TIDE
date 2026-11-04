// Mobile delivery pass for skinned characters: keep smooth NORMALs, 8-bit RGB COLOR_0, resample animation keys, weld, prune.
// normals per face), store COLOR_0 as normalized UNSIGNED_BYTE RGB, weld identical vertices, prune.
import { NodeIO, VertexLayout } from '@gltf-transform/core';
import { weld, prune, dedup, resample, quantize, join } from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [src, dst] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).setVertexLayout(VertexLayout.SEPARATE); // three's merge needs plain (non-interleaved) attributes
const doc = await io.read(src);
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  // characters keep their smooth normals
  for (const k of prim.listSemantics()) if (k.startsWith('TEXCOORD')) prim.setAttribute(k, null);
  const c = prim.getAttribute('COLOR_0');
  if (c) {
    const cnt = c.getCount(), el = c.getElementSize();
    const out = new Uint8Array(cnt * 3), v = [];
    for (let i = 0; i < cnt; i++) { c.getElement(i, v); for (let j = 0; j < 3; j++) out[i * 3 + j] = Math.round(Math.min(1, Math.max(0, v[j])) * 255); }
    const acc = doc.createAccessor().setType('VEC3').setArray(out).setNormalized(true).setBuffer(c.getBuffer());
    prim.setAttribute('COLOR_0', acc);
  }
}
// one material: the game shades characters from COLOR_0, so per-colour materials only cost draw calls and JSON
const keep = doc.getRoot().listMaterials()[0];
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) prim.setMaterial(keep);
// Blender parents the skinned mesh under the armature; glTF ignores that parent transform, so put it back at the scene root
const scene = doc.getRoot().listScenes()[0];
for (const n of doc.getRoot().listNodes()) if (n.getMesh() && n.getSkin()) for (const p of n.listParents()) if (p.propertyType === 'Node') { p.removeChild(n); scene.addChild(n); }
for (const a of doc.getRoot().listAnimations()) if (a.getName() === 'wave') a.setName('Cheer'); // animcraft 'wave' = the crew's arms-up cheer
await doc.transform(dedup(), resample({ tolerance: 0.0005 }), join({ keepNamed: false }), weld(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeWeight: 8, quantizeColor: 8 }), prune());
await io.write(dst, doc);
