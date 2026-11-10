// The Rustfang Toll (docs/jury-rigged): criteria C1 (proportions) and C2 (factions read without colour).
//
//   node scripts/jury-measure.mjs <built dist folder> <output folder>
//
// Opens a ?look=jury visit (sandboxed) and, in the page:
//   C1  measures each character's height in heads on the shipped GLB in its rest pose: skin-coloured vertices that
//       ride the Head bone give the chin and the crown (hats and hair are other colours, so they are excluded);
//       heads = (crown - floor) / (crown - chin).
//   C2  renders solid-black silhouettes 40 px tall with an orthographic camera (characters from the front in their
//       Idle pose, boats from the side), aligned on the feet/keel and centred, and reports their overlap (IoU) for
//       the new pairs and for the same pairs today.
// Writes report.json, the silhouette sheet (silhouettes.png) and a colour line-up (lineup.png).
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const playwright = require('playwright');
const [dist, out] = [resolve(process.argv[2] ?? 'dist'), resolve(process.argv[3] ?? 'jury-measure')];
mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join(dist, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
page.on('pageerror', (e) => console.error('page error', e.message));
await page.goto(`${url}/?ship=skiff&look=jury`);
await page.waitForFunction(() => window.__jury && window.__game?.ship, null, { timeout: 180000 });
await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
await page.waitForFunction(() => window.__jury.assets.gltfOf('tb_jury_captain') && window.__jury.assets.gltfOf('tb_raider'), null, { timeout: 180000 });

const result = await page.evaluate(() => {
  const { THREE: T, assets, jury } = window.__jury;
  const g = window.__game;
  const r = g.renderer;

  // ---------- C1: heads tall, on the GLB as shipped
  const SKIN = { tb_captain: '#B98458', tb_jury_captain: '#B98458', tb_raider: '#E2B79A', tb_jury_raider: '#E2B79A' };
  const heads = (file) => {
    const gl = assets.gltfOf(file);
    let mesh = null;
    gl.scene.traverse((o) => (o.isSkinnedMesh && !mesh ? (mesh = o) : 0));
    gl.scene.updateMatrixWorld(true);
    const geo = mesh.geometry, P = geo.attributes.position, C = geo.attributes.color, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
    const head = mesh.skeleton.bones.findIndex((b) => /Head$/.test(b.name));
    const skin = new T.Color(SKIN[file]);
    const v = new T.Vector3();
    let floor = Infinity, chin = Infinity, crown = -Infinity, n = 0;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld);
      floor = Math.min(floor, v.y);
      let w = 0;
      for (let k = 0; k < 4; k++) if (SI.getComponent(i, k) === head) w += SW.getComponent(i, k);
      if (w < 0.5) continue;
      const d = Math.abs(C.getX(i) - skin.r) + Math.abs(C.getY(i) - skin.g) + Math.abs(C.getZ(i) - skin.b);
      if (d > 0.12) continue;
      n++;
      chin = Math.min(chin, v.y);
      crown = Math.max(crown, v.y);
    }
    return { heads: +((crown - floor) / (crown - chin)).toFixed(2), height: +(crown - floor).toFixed(3), head: +(crown - chin).toFixed(3), skinVerts: n };
  };
  const C1 = {};
  for (const f of ['tb_captain', 'tb_raider', 'tb_jury_captain', 'tb_jury_raider']) C1[f] = heads(f);

  // ---------- C2: silhouettes
  const W = 160, H = 48, HPX = 40;
  const rt = new T.WebGLRenderTarget(W, H);
  const black = new T.MeshBasicMaterial({ color: 0x000000, side: T.DoubleSide });
  const posed = (file) => {
    const c = assets.characterModel(file);
    const idle = c.actions.Idle;
    if (idle) {
      idle.play();
      c.mixer.setTime(0.5);
    }
    c.root.updateMatrixWorld(true);
    return c.root;
  };
  const mask = (obj, view) => {
    const sc = new T.Scene();
    sc.background = new T.Color(0xffffff);
    sc.overrideMaterial = black;
    const parent = obj.parent;
    sc.add(obj);
    obj.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(obj, true);
    const h = box.max.y - box.min.y, ppm = HPX / h;
    const cx = view === 'side' ? (box.min.z + box.max.z) / 2 : (box.min.x + box.max.x) / 2;
    const bottom = box.min.y - 4 / ppm, top = bottom + H / ppm;
    const cam = new T.OrthographicCamera(-W / 2 / ppm, W / 2 / ppm, top, bottom, 0.01, 200);
    if (view === 'side') {
      cam.position.set(box.max.x + 50, 0, cx);
      cam.lookAt(box.max.x, 0, cx);
    } else {
      cam.position.set(cx, 0, box.max.z + 50);
      cam.lookAt(cx, 0, box.max.z);
    }
    // ortho frustum top/bottom are in camera space: shift the camera vertically instead
    cam.top = H / 2 / ppm;
    cam.bottom = -H / 2 / ppm;
    cam.position.y = (top + bottom) / 2;
    cam.updateProjectionMatrix();
    r.setRenderTarget(rt);
    r.render(sc, cam);
    const px = new Uint8Array(W * H * 4);
    r.readRenderTargetPixels(rt, 0, 0, W, H, px);
    r.setRenderTarget(null);
    sc.remove(obj);
    if (parent) parent.add(obj);
    const m = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) m[i] = px[i * 4] < 128 ? 1 : 0;
    return m;
  };
  const iou = (a, b) => {
    let i = 0, u = 0;
    for (let k = 0; k < a.length; k++) {
      i += a[k] & b[k];
      u += a[k] | b[k];
    }
    return +(i / u).toFixed(3);
  };
  // the player's skiff (no crew aboard, so the boats compare as boats)
  const skiff = g.shipRoot;
  const crewVis = [];
  skiff.traverse((o) => {
    if (o.isSkinnedMesh) {
      crewVis.push([o, o.visible]);
      o.visible = false;
    }
  });
  const savedRot = skiff.rotation.clone(), savedPos = skiff.position.clone();
  skiff.rotation.set(0, 0, 0);
  skiff.position.set(0, 0, 0);
  const masks = {
    tb_captain: mask(posed('tb_captain'), 'front'),
    tb_raider: mask(posed('tb_raider'), 'front'),
    tb_jury_captain: mask(posed('tb_jury_captain'), 'front'),
    tb_jury_raider: mask(posed('tb_jury_raider'), 'front'),
    patchwork_skiff: mask(skiff, 'side'),
    raider_skiff: mask(assets.model('tb_raider_skiff', 'raider_body'), 'side'),
    jawboat: mask(jury.jawboat(1), 'side'),
  };
  skiff.rotation.copy(savedRot);
  skiff.position.copy(savedPos);
  for (const [o, v] of crewVis) o.visible = v;
  const C2 = {
    characters: { today: iou(masks.tb_captain, masks.tb_raider), jury: iou(masks.tb_jury_captain, masks.tb_jury_raider) },
    boats: { today: iou(masks.patchwork_skiff, masks.raider_skiff), jury: iou(masks.patchwork_skiff, masks.jawboat) },
  };
  // the sheet: each mask at 4× (nearest), in rows
  const order = [['tb_captain', 'tb_raider', 'tb_jury_captain', 'tb_jury_raider'], ['patchwork_skiff', 'raider_skiff', 'jawboat']];
  const S = 4, cv = document.createElement('canvas');
  cv.width = W * S * 4 + 30;
  cv.height = H * S * 2 + 20;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ece0c2';
  ctx.fillRect(0, 0, cv.width, cv.height);
  order.forEach((row, ri) =>
    row.forEach((k, ci) => {
      const m = masks[k];
      ctx.fillStyle = '#10384a';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[(H - 1 - y) * W + x]) ctx.fillRect(10 + ci * (W * S + 3) + x * S, 10 + ri * H * S + y * S, S, S);
    })
  );
  return { C1, C2, sheet: cv.toDataURL('image/png') };
});
writeFileSync(`${out}/silhouettes.png`, Buffer.from(result.sheet.split(',')[1], 'base64'));
delete result.sheet;
writeFileSync(`${out}/report.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
server.close();
