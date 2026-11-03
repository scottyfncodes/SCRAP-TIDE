// Meshopt delivery pass for the Trimaran's models (the sloop, its outriggers and every upgrade).
//
//   npm i --no-save @gltf-transform/core@4.1.1 @gltf-transform/extensions@4.1.1 @gltf-transform/functions@4.1.1 meshoptimizer@0.22.0
//   node creative/3d-sloop/compress_models.mjs <src.glb> <dst.glb> [...more pairs]
//
// EXT_meshopt_compression + KHR_mesh_quantization: 14-bit positions, 10-bit normals, 16-bit colours (COLOR_0 was
// already 16-bit, so the baked palette is unchanged). The game decodes it with three's MeshoptDecoder
// (src/world/assets.ts): no extra runtime files.
//
// What must survive, because the game finds parts by name: every node (socket_* empties, moving-part pivots,
// static bodies) and every material (the paint/sail tints and the culls key on GC_* material names). So prune() only with keepLeaves
// (by default it, and weld()/quantize()'s own cleanup, drop empty leaf nodes: the sockets) and no material dedup (GC_Wood_f2ead8 and GC_Plank_f2ead8 share a colour
// but are different roles). The verify step (compare_models.mjs) checks names, triangles, bounds and colours.
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const pairs = process.argv.slice(2);
for (let i = 0; i < pairs.length; i += 2) {
  const [src, dst] = [pairs[i], pairs[i + 1]];
  const doc = await io.read(src);
  await doc.transform(
    dedup({ propertyTypes: [PropertyType.ACCESSOR] }),   // shared buffers only; materials and meshes keep their identity
    // cleanup: false on both: their built-in prune drops empty leaf nodes, i.e. the sloop's socket_* nodes
    weld({ cleanup: false }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 14, quantizeNormal: 10, quantizeColor: 16, quantizeTexcoord: 12, cleanup: false }),
    prune({ keepLeaves: true }),   // drop the orphaned pre-compression data, keep the empty nodes
  );
  await io.write(dst, doc);
  console.log(JSON.stringify({ src, dst }));
}
