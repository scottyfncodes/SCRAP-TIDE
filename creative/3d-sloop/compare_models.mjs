// Before/after check for compress_models.mjs: decode both GLBs and compare what the game relies on.
//   node creative/3d-sloop/compare_models.mjs <before.glb> <after.glb> [...more pairs]   -> one JSON line per pair
// node names, material names, triangles, mesh bounds (world space, metres) and every vertex colour (max abs diff in
// linear 0..1 and in 8-bit sRGB steps, the unit a player could see).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { getBounds } from '@gltf-transform/functions';
import { statSync } from 'node:fs';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const srgb = (l) => (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055) * 255;

async function summary(path) {
  const doc = await io.read(path), root = doc.getRoot();
  const nodes = root.listNodes().map((n) => n.getName()).sort();
  const materials = root.listMaterials().map((m) => m.getName()).sort();
  let tris = 0;
  const colours = {};   // material name -> flat list of decoded colours, in primitive order
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
    const idx = p.getIndices(), pos = p.getAttribute('POSITION');
    tris += (idx ? idx.getCount() : pos.getCount()) / 3;
    const c = p.getAttribute('COLOR_0'), key = p.getMaterial()?.getName() ?? '?', v = [];
    // compare by index order: decode the colours each triangle corner references (weld may renumber vertices)
    const out = (colours[key] ??= []);
    const n = idx ? idx.getCount() : pos.getCount();
    for (let i = 0; i < n && c; i++) { c.getElement(idx ? idx.getScalar(i) : i, v); out.push(v[0], v[1], v[2]); }
  }
  const b = getBounds(root.listScenes()[0]);
  return { nodes, materials, tris, colours, bounds: [...b.min, ...b.max], bytes: statSync(path).size };
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const a = await summary(args[i]), b = await summary(args[i + 1]);
  let lin = 0, steps = 0, compared = 0;
  for (const k of Object.keys(a.colours)) {
    const x = a.colours[k], y = b.colours[k] || [];
    for (let j = 0; j < Math.min(x.length, y.length); j++) {
      lin = Math.max(lin, Math.abs(x[j] - y[j])); steps = Math.max(steps, Math.abs(srgb(x[j]) - srgb(y[j]))); compared++;
    }
  }
  const boundsErr = Math.max(...a.bounds.map((v, k) => Math.abs(v - b.bounds[k])));
  console.log(JSON.stringify({
    file: args[i].split('/').pop(), before: a.bytes, after: b.bytes,
    nodes_same: JSON.stringify(a.nodes) === JSON.stringify(b.nodes), materials_same: JSON.stringify(a.materials) === JSON.stringify(b.materials),
    tris: [a.tris, b.tris], bounds_err_mm: +(boundsErr * 1000).toFixed(2),
    colour_values_compared: compared, colour_max_diff_linear: +lin.toFixed(6), colour_max_diff_srgb_steps: +steps.toFixed(3),
  }));
}
