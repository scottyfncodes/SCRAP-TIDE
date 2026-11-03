// Mobile delivery pass for MeshCraft three-web-toon exports: drop NORMAL (the game's toon pipeline rebuilds flat
// normals per face), store COLOR_0 as normalized UNSIGNED_BYTE RGB, weld identical vertices, prune.
import { NodeIO, VertexLayout } from '@gltf-transform/core';
import { weld, prune, dedup } from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [src, dst] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).setVertexLayout(VertexLayout.SEPARATE); // three's merge needs plain (non-interleaved) attributes
const doc = await io.read(src);
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const n = prim.getAttribute('NORMAL'); if (n) prim.setAttribute('NORMAL', null);
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
await doc.transform(dedup(), weld(), prune());
await io.write(dst, doc);
