// Matched before/after screenshots for art-direction work: the same boat position, heading, camera yaw/pitch,
// time of day and viewport every run, so two builds can be compared frame for frame.
//
//   node scripts/cohesion-shots.mjs <built dist folder> <output folder>
//
// Serves the folder itself (static), opens ?ship=skiff preview visits (nothing is saved), pins the clock, parks the
// boat and frames each shot, and also records the average frame time per shot (software GL: relative numbers only).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const playwright = require('playwright');
const [dist, out] = [resolve(process.argv[2] ?? 'dist'), resolve(process.argv[3] ?? 'cohesion-shots')];
mkdirSync(out, { recursive: true });

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

// x, z: where the boat is parked; h: its heading (0 = +z); yaw: camera offset from the heading; pitch; tod
const SHOTS = [
  { id: 'driftholm', x: 4, z: 128, h: 0, yaw: 0.18, pitch: 0.3, tod: 0.42 },
  { id: 'driftholm-golden', x: 4, z: 128, h: 0, yaw: 0.18, pitch: 0.3, tod: 0.67 },
  { id: 'rafts-close', x: -8, z: 164, h: -0.72, yaw: 0, pitch: 0.24, tod: 0.42 },
  { id: 'gullstep', x: 96, z: 44, h: 0.45, yaw: 0, pitch: 0.32, tod: 0.42 },
  { id: 'hollow', x: -222, z: -12, h: Math.PI + 0.1, yaw: 0, pitch: 0.3, tod: 0.42 },
  { id: 'helios', x: -520, z: 96, h: -0.1, yaw: 0, pitch: 0.3, tod: 0.42 },
  { id: 'boat-side', x: 40, z: 100, h: 0.6, yaw: 1.1, pitch: 0.28, tod: 0.42 },
];
const VIEWPORTS = [
  { id: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, scale: 2 },
  { id: 'desktop', viewport: { width: 1280, height: 720 }, isMobile: false, hasTouch: false, scale: 1 },
];
const only = process.env.SHOTS ? process.env.SHOTS.split(',') : null;
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const perf = {};
for (const vp of VIEWPORTS) {
  if (process.env.VP && process.env.VP !== vp.id) continue;
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.scale });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`${vp.id}: page error ${e.message}`));
  await page.goto(`${url}/?ship=skiff`);
  await page.waitForFunction(() => window.__game?.ship, null, { timeout: 120000 });
  await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  for (let i = 0; i < 6; i++) {
    const b = await page.$('button:visible:has-text("Let"), button:visible:has-text("OK"), button:visible:has-text("Got it")');
    if (!b) break;
    await b.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => {
    const g = window.__game;
    g.started = true;
    window.__shot = null;
    setInterval(() => {
      const s = window.__shot;
      if (!s) return;
      g.boat.docked = false;
      g.boat.anchored = false;
      g.boat.x = s.x;
      g.boat.z = s.z;
      g.boat.heading = s.h;
      g.boat.speed = 0;
      g.ui.joy.x = 0;
      g.ui.joy.y = 0;
      g.camYaw = s.h + s.yaw;
      g.camPitch = s.pitch;
      g.zoom = 1;
      g.atmo.time = s.tod;
    }, 4);
  });
  for (const s of SHOTS) {
    if (only && !only.includes(s.id)) continue;
    await page.evaluate((s) => (window.__shot = s), s);
    // arriving somewhere new can raise a card (renown, region): clear it so it doesn't cover the frame
    const clear = async () => {
      for (let i = 0; i < 4; i++) {
        const b = await page.$('button:visible:has-text("EARNED"), button:visible:has-text("Let"), button:visible:has-text("OK"), button:visible:has-text("Got it"), button:visible:has-text("Nice"), button:visible:has-text("Onward")');
        if (!b) break;
        await b.click({ force: true }).catch(() => {});
        await page.waitForTimeout(400);
      }
    };
    await page.waitForTimeout(1500);
    await clear();
    const t0 = await page.evaluate(() => window.__game.renderT);
    await page.waitForFunction((t) => window.__game.renderT >= t, t0 + 2.5, { timeout: 180000, polling: 100 });
    // frame time over ~2 s of wall clock
    const ms = await page.evaluate(
      () =>
        new Promise((r) => {
          let n = 0;
          const a = performance.now();
          const f = () => (++n < 20 ? requestAnimationFrame(f) : r((performance.now() - a) / n));
          requestAnimationFrame(f);
        })
    );
    await clear();
    const info = await page.evaluate(() => ({ calls: window.__game.renderer.info.render.calls, tris: window.__game.renderer.info.render.triangles }));
    perf[`${vp.id}/${s.id}`] = { msPerFrame: +ms.toFixed(1), ...info };
    await page.screenshot({ path: `${out}/${vp.id}-${s.id}.png` });
    console.log(`${vp.id}-${s.id}`, perf[`${vp.id}/${s.id}`]);
  }
  await ctx.close();
}
writeFileSync(`${out}/perf.json`, JSON.stringify(perf, null, 2));
await browser.close();
server.close();
