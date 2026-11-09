// The Rustfang Toll (docs/jury-rigged): matched captures of the default look and ?look=jury, in four lighting keys,
// with the measurements behind criteria C3, C4 and C5 (docs/jury-rigged/CRITERIA.md).
//
//   node scripts/jury-shots.mjs <built dist folder> <output folder>
//   SHOTS=toll,driftholm CONDS=noon VP=phone LOOKS=jury node scripts/jury-shots.mjs dist out   (subsets)
//
// Serves the folder itself, opens ?ship=skiff visits (sandboxed, nothing is saved), pins the clock, the weather, the
// boat (or the captain on foot), the camera and the raiders, then for every frame records draw calls and triangles,
// and on ?look=jury also the share of the frame covered by plastic accents (an accent-mask render) and, on the
// Driftholm frame, the Signal Stack's projected height against every other Driftholm structure.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const playwright = require('playwright');
const [dist, out] = [resolve(process.argv[2] ?? 'dist'), resolve(process.argv[3] ?? 'jury-shots')];
mkdirSync(out, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const requested = { default: new Set(), jury: new Set() };
let current = 'default';
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  requested[current].add(p);
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

// The toll sits at (46, 128) (src/world/jury.ts TOLL). Boat frames: x, z parked; h heading (0 = +z); yaw camera offset
// from the heading; pitch. raiders: where to pin up to two raider boats (x, z, heading). foot: the captain on foot.
const SHOTS = [
  { id: 'toll', x: 47, z: 133, h: 2.5, yaw: 0.0, pitch: 0.22, raiders: [[57, 118, -0.6], [73, 113, -2.0]] },
  { id: 'driftholm', x: 4, z: 128, h: 0, yaw: 0.18, pitch: 0.3 },
  { id: 'raiders', x: 236, z: 560, h: 0.75, yaw: 0.0, pitch: 0.26, raiders: [[248, 580, -2.3], [258, 572, -2.0]] },
  { id: 'foot', foot: { x: 3, dz: 9, heading: 2.55 }, yaw: 0, pitch: 0.3 }, // dz: metres inland of the shore at the pier root
];
const CONDS = [
  { id: 'noon', tod: 0.5, storm: 0 },
  { id: 'dusk', tod: 0.78, storm: 0 },
  { id: 'night', tod: 0.95, storm: 0 },
  { id: 'storm', tod: 0.5, storm: 1 },
];
const VIEWPORTS = [
  { id: 'phone', viewport: { width: 402, height: 874 }, isMobile: true, hasTouch: true, scale: 2 },
  { id: 'desktop', viewport: { width: 1280, height: 720 }, isMobile: false, hasTouch: false, scale: 1 },
];
const pick = (env, all) => (process.env[env] ? all.filter((x) => process.env[env].split(',').includes(x.id)) : all);
const LOOKS = process.env.LOOKS ? process.env.LOOKS.split(',') : ['default', 'jury'];

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = {};
for (const look of LOOKS) {
  current = look;
  for (const vp of pick('VP', VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.scale });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.error(`${look}/${vp.id}: page error ${e.message}`));
    await page.goto(`${url}/?ship=skiff${look === 'jury' ? '&look=jury' : ''}`);
    await page.waitForFunction(() => window.__game?.ship, null, { timeout: 180000 });
    await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const clear = async () => {
      for (let i = 0; i < 6; i++) {
        const b = await page.$('button:visible:has-text("EARNED"), button:visible:has-text("Let"), button:visible:has-text("OK"), button:visible:has-text("Got it"), button:visible:has-text("Nice"), button:visible:has-text("Onward"), button:visible:has-text("Hold on")');
        if (!b) break;
        await b.click({ force: true }).catch(() => {});
        await page.waitForTimeout(300);
      }
    };
    await clear();
    // characters stream in after the title: wait for the rigged captain
    await page.waitForFunction(() => !!window.__game.captain.char, null, { timeout: 120000 }).catch(() => console.warn('captain rig did not load'));
    await page.evaluate(() => {
      const g = window.__game;
      g.started = true;
      g.store.data.flags.includes('met_raiders') || g.store.data.flags.push('met_raiders');
      window.__shot = null;
      setInterval(() => {
        const s = window.__shot;
        if (!s) return;
        g.atmo.time = s.tod;
        g.atmo.squall = s.storm;
        g.atmo.storm = s.storm; // pinned, not ramped in or out
        g.ui.joy.x = 0;
        g.ui.joy.y = 0;
        g.zoom = 1;
        g.camPitch = s.pitch;
        if (s.foot) {
          g.mode = 'foot';
          g.boat.docked = true;
          Object.assign(g.foot, { x: s.foot.x, z: g.env.boatRects.find((r) => r.x0 === -3).z1 - 6 + s.foot.dz, heading: s.foot.heading, speed: 0, vel: 0 });
          g.camYaw = s.foot.heading + s.yaw;
        } else {
          g.mode = 'sail';
          g.boat.docked = false;
          g.boat.anchored = false;
          g.boat.x = s.x;
          g.boat.z = s.z;
          g.boat.heading = s.h;
          g.boat.speed = 0;
          g.camYaw = s.h + s.yaw;
        }
        // raiders: pinned in place, patrolling (never chasing, so nothing rams or steals mid-capture)
        const rs = g.raiders.list;
        for (const q of rs) if (q.state === 'chase') Object.assign(q, { state: 'patrol', timer: 99 });
        g.store.data.hull = g.store.stats.hullMax;
        (s.raiders ?? []).forEach(([x, z, h], i) => {
          const r = rs.find((q) => Math.hypot(q.zone.x - x, q.zone.z - z) < q.zone.r + 120 && rs.filter((o) => o.zone === q.zone).indexOf(q) === i);
          if (!r) return;
          Object.assign(r, { x, z, heading: h, speed: 0, state: 'patrol', timer: 99 });
        });
      }, 4);
    });
    for (const s of pick('SHOTS', SHOTS)) {
      for (const c of pick('CONDS', CONDS)) {
        const key = `${look}/${vp.id}/${s.id}/${c.id}`;
        const shot = { ...s, tod: c.tod, storm: c.storm };
        await page.evaluate((s) => (window.__shot = s), shot);
        await page.waitForTimeout(800);
        await clear();
        const t0 = await page.evaluate(() => window.__game.renderT);
        await page.waitForFunction((t) => window.__game.renderT >= t, t0 + 1.0, { timeout: 240000, polling: 100 });
        await clear();
        const info = await page.evaluate(() => ({ calls: window.__game.renderer.info.render.calls, tris: window.__game.renderer.info.render.triangles }));
        const ms = await page.evaluate(
          () =>
            new Promise((r) => {
              let n = 0;
              const a = performance.now();
              const f = () => (++n < 12 ? requestAnimationFrame(f) : r((performance.now() - a) / n));
              requestAnimationFrame(f);
            })
        );
        await page.screenshot({ path: `${out}/${look}-${vp.id}-${s.id}-${c.id}.png`, timeout: 180000 });
        const row = { ...info, msPerFrame: +ms.toFixed(1) };
        if (look === 'jury') {
          // C4: accent-mask render (plastic magenta, everything else black, no fog) into a target, count pixels
          row.accentShare = await page.evaluate(() => {
            const g = window.__game, J = window.__jury, T = J.THREE;
            const r = g.renderer, size = r.getDrawingBufferSize(new T.Vector2());
            const w = Math.round(size.x / 2), h = Math.round(size.y / 2);
            const rt = new T.WebGLRenderTarget(w, h);
            const fog = g.scene.fog;
            g.scene.fog = null;
            J.grade.uAccentMask.value = 1;
            r.setRenderTarget(rt);
            r.render(g.scene, g.camera);
            const px = new Uint8Array(w * h * 4);
            r.readRenderTargetPixels(rt, 0, 0, w, h, px);
            r.setRenderTarget(null);
            J.grade.uAccentMask.value = 0;
            g.scene.fog = fog;
            rt.dispose();
            let n = 0;
            for (let i = 0; i < px.length; i += 4) if (px[i] > 200 && px[i + 1] < 60 && px[i + 2] > 200) n++;
            return +(n / (w * h)).toFixed(4);
          });
          if (s.id === 'driftholm') {
            // C3: the Signal Stack's projected height, and whether anything else in Driftholm reaches higher on screen
            row.skyline = await page.evaluate(() => {
              const g = window.__game, T = window.__jury.THREE, p = g.env.juryProbe;
              const W = innerWidth, H = innerHeight;
              const sy = (v) => ((1 - v.clone().project(g.camera).y) / 2) * H;
              const inView = (v) => {
                const q = v.clone().project(g.camera);
                return q.z < 1 && Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1;
              };
              const top = sy(p.stackTop), base = sy(p.stackBase);
              const ndc = p.stackTop.clone().project(g.camera);
              const stackX = +(((ndc.x + 1) / 2) * W).toFixed(1), stackInView = inView(p.stackTop) && inView(p.stackBase);
              let townTop = Infinity;
              for (const b of p.town) {
                for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) {
                  const v = new T.Vector3(x, b.max.y, z);
                  if (inView(v)) townTop = Math.min(townTop, sy(v));
                }
              }
              return { stackPx: +(base - top).toFixed(1), stackX, stackInView, stackTopY: +top.toFixed(1), townTopY: +townTop.toFixed(1), tallest: stackInView && top < townTop, viewport: [W, H], stackWorld: p.stackBase.toArray().map((v) => +v.toFixed(1)) };
            });
          }
        }
        report[key] = row;
        console.log(key, JSON.stringify(row));
      }
    }
    await ctx.close();
  }
}
// C5 isolation: did a default visit fetch any Jury-Rigged file?
report.isolation = {
  defaultFetchedJuryFiles: [...requested.default].filter((p) => /jury/i.test(p)),
  juryFetchedJuryFiles: [...requested.jury].filter((p) => /jury/i.test(p)),
};
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.isolation));
await browser.close();
server.close();
