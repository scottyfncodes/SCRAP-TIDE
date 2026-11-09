// Draw-call attribution for The Rustfang Toll (docs/jury-rigged): which meshes, materials and render passes the
// ?look=jury frames add over the default look, and how stable the Driftholm storm count is across paired runs.
//
//   node scripts/jury-profile.mjs <built dist> <out folder>            toll attribution + Driftholm storm pairs
//   RUNS=5 PROFILE=toll,storm node scripts/jury-profile.mjs dist out
//   BASE=<main's built dist> …  also serves a build of main, so the storm pairs compare against the main baseline
//
// Every draw goes through WebGLRenderer.renderBufferDirect (the main pass and the shadow pass). For one rendered
// frame the profiler wraps it and records, per draw: the pass (game camera = main, anything else = shadow), the
// category of the object (Jawboat, raider crew, the default raider skiff, captain, player boat, harbour batch,
// ocean, sky, FX…), its material type and object type. Frames are pinned exactly like scripts/jury-shots.mjs.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const playwright = require('playwright');
const [dist, out] = [resolve(process.argv[2] ?? 'dist'), resolve(process.argv[3] ?? 'jury-profile')];
mkdirSync(out, { recursive: true });
const RUNS = +(process.env.RUNS ?? 5);
const PROFILE = (process.env.PROFILE ?? 'toll,storm').split(',');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
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
// optional second server for main's build (the baseline)
let baseUrl = null;
if (process.env.BASE) {
  const baseDir = resolve(process.env.BASE);
  const s2 = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    try {
      const body = await readFile(join(baseDir, p));
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => s2.listen(0, r));
  baseUrl = `http://127.0.0.1:${s2.address().port}`;
}

// the same frames as scripts/jury-shots.mjs
const TOLL = { id: 'toll', x: 47, z: 133, h: 2.5, yaw: 0.0, pitch: 0.22, raiders: [[57, 118, -0.6], [73, 113, -2.0]], tod: 0.5, storm: 0 };
const STORM = { id: 'driftholm-storm', x: 4, z: 128, h: 0, yaw: 0.18, pitch: 0.3, tod: 0.5, storm: 1 };

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(look, base = url) {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`${look}: page error ${e.message}`));
  await page.goto(`${base}/?ship=skiff${look === 'jury' ? '&look=jury' : ''}`);
  await page.waitForFunction(() => window.__game?.ship, null, { timeout: 180000 });
  await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !!window.__game.captain.char, null, { timeout: 120000 }).catch(() => {});
  await page.evaluate(() => {
    const g = window.__game;
    g.started = true;
    g.store.data.flags.includes('met_raiders') || g.store.data.flags.push('met_raiders');
    window.__shot = null;
    setInterval(() => {
      const s = window.__shot;
      if (!s) return;
      Object.assign(g.atmo, { time: s.tod, squall: s.storm, storm: s.storm });
      Object.assign(g.ui.joy, { x: 0, y: 0 });
      g.zoom = 1;
      g.camPitch = s.pitch;
      g.mode = 'sail';
      Object.assign(g.boat, { docked: false, anchored: false, x: s.x, z: s.z, heading: s.h, speed: 0 });
      g.camYaw = s.h + s.yaw;
      const rs = g.raiders.list;
      for (const q of rs) if (q.state === 'chase') Object.assign(q, { state: 'patrol', timer: 99 });
      g.store.data.hull = g.store.stats.hullMax;
      (s.raiders ?? []).forEach(([x, z, h], i) => {
        const r = rs.find((q) => Math.hypot(q.zone.x - x, q.zone.z - z) < q.zone.r + 120 && rs.filter((o) => o.zone === q.zone).indexOf(q) === i);
        if (r) Object.assign(r, { x, z, heading: h, speed: 0, state: 'patrol', timer: 99 });
      });
    }, 4);
  });
  const clear = async () => {
    for (let i = 0; i < 6; i++) {
      const b = await page.$('button:visible:has-text("EARNED"), button:visible:has-text("Let"), button:visible:has-text("OK"), button:visible:has-text("Got it"), button:visible:has-text("Nice"), button:visible:has-text("Onward"), button:visible:has-text("Hold on")');
      if (!b) break;
      await b.click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
    }
  };
  await clear();
  return { ctx, page, clear };
}

async function settle(page, clear, shot) {
  await page.evaluate((s) => (window.__shot = s), shot);
  await page.waitForTimeout(800);
  await clear();
  const t0 = await page.evaluate(() => window.__game.renderT);
  await page.waitForFunction((t) => window.__game.renderT >= t, t0 + 1.0, { timeout: 240000, polling: 100 });
  await clear();
}

/** attribute every draw of the next rendered frame */
const attribute = (page) =>
  page.evaluate(
    () =>
      new Promise((done) => {
        const g = window.__game, r = g.renderer;
        const raiderObjs = new Set(g.raiders.list.map((q) => q.obj));
        const cat = (o) => {
          for (let p = o; p; p = p.parent) {
            if (p.userData?.jury === 'jawboat') return o.isSkinnedMesh ? 'raider crew (Jawboat)' : 'Jawboat hull';
            if (raiderObjs.has(p)) return o.isSkinnedMesh ? 'raider crew (default skiff)' : 'raider skiff (default)';
            if (p === g.captain.root) return 'captain';
            if (p === g.shipRoot) return o.isSkinnedMesh ? 'crew on player boat' : 'player boat';
          }
          if (o.isSkinnedMesh) return 'townsfolk / other character';
          return `other: ${o.name || o.type}`;
        };
        const orig = r.renderBufferDirect;
        const rows = [];
        r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
          rows.push({ pass: camera === g.camera ? 'main' : 'shadow', cat: cat(object), mat: material.type, obj: object.type, tris: (geometry.index ? geometry.index.count : geometry.attributes.position?.count ?? 0) / 3 });
          return orig.apply(this, arguments);
        };
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            r.renderBufferDirect = orig;
            const info = { calls: r.info.render.calls, tris: r.info.render.triangles };
            done({ rows, info });
          })
        );
      })
  );

const summarise = (rows) => {
  const m = {};
  for (const x of rows) {
    const k = `${x.cat} | ${x.pass} | ${x.mat}`;
    m[k] = (m[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(m).sort());
};
const byCat = (rows) => {
  const m = {};
  for (const x of rows) m[x.cat] = (m[x.cat] ?? 0) + 1;
  return m;
};

const report = { toll: {}, storm: {} };
if (PROFILE.includes('toll')) {
  for (const look of ['default', 'jury']) {
    const { ctx, page, clear } = await open(look);
    await settle(page, clear, TOLL);
    const a = await attribute(page);
    report.toll[look] = { draws: a.rows.length, info: a.info, byCategory: byCat(a.rows), detail: summarise(a.rows) };
    await page.screenshot({ path: `${out}/${look}-toll.png` });
    console.log(look, 'toll', a.rows.length, JSON.stringify(byCat(a.rows)));
    await ctx.close();
  }
}
if (PROFILE.includes('storm')) {
  // controlled runs: a fresh page per variant per run, the order rotated each run, the same pinned frame, five frames
  // sampled per page. Variants: main's build (baseline), this build's default look, this build's ?look=jury.
  const variants = [...(baseUrl ? [{ name: 'main', look: 'default', base: baseUrl }] : []), { name: 'default', look: 'default', base: url }, { name: 'jury', look: 'jury', base: url }];
  for (const v of variants) report.storm[v.name] = [];
  for (let i = 0; i < RUNS; i++) {
    const order = variants.map((_, k) => variants[(k + i) % variants.length]);
    for (const v of order) {
      const { ctx, page, clear } = await open(v.look, v.base);
      await settle(page, clear, STORM);
      const samples = [];
      for (let k = 0; k < 5; k++) {
        const a = await attribute(page);
        samples.push({ calls: a.info.calls, draws: a.rows.length, mainDraws: a.rows.filter((x) => x.pass === 'main').length, byCategory: byCat(a.rows.filter((x) => x.pass === 'main')) });
      }
      report.storm[v.name].push(samples);
      console.log(v.name, 'storm run', i, samples.map((s) => s.calls).join(' '));
      await ctx.close();
    }
  }
}
writeFileSync(`${out}/profile.json`, JSON.stringify(report, null, 1));
await browser.close();
server.close();
