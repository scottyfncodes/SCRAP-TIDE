// Raider patrol spawn/despawn cycles (docs/jury-rigged/IPHONE-CHECKLIST.md §3): does renderer memory (geometries,
// textures) return to its level each cycle, in the default look and on ?look=jury?
//
//   npm run build && node scripts/jury-leak.mjs dist
//
// Software GL in headless Chromium: these are renderer object counts (deterministic), not device memory. A count that
// climbs every cycle is a leak; total memory on an iPhone is still a Web Inspector measurement.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const playwright = require('playwright');
const dist = resolve(process.argv[2]);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = createServer(async (q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join(dist, p)); r.writeHead(200, { 'content-type': T[extname(p)] ?? 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((r) => srv.listen(0, r));
const url = `http://127.0.0.1:${srv.address().port}`;
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const look of ['default', 'jury']) {
  const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 })).newPage();
  await page.goto(`${url}/?ship=skiff${look === 'jury' ? '&look=jury' : ''}`);
  await page.waitForFunction(() => window.__game?.ship, null, { timeout: 180000 });
  await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => !!window.__game.captain.char, null, { timeout: 120000 }).catch(() => {});
  await page.evaluate(() => { const g = window.__game; g.started = true; g.store.data.flags.push('met_raiders'); window.__at = null;
    setInterval(() => { if (!window.__at) return; Object.assign(g.boat, { docked: false, anchored: false, x: window.__at[0], z: window.__at[1], speed: 0 }); g.store.data.hull = g.store.stats.hullMax; for (const q of g.raiders.list) if (q.state === 'chase') q.state = 'patrol'; }, 4); });
  // near the graveyard (both looks) and the toll (look visits); far = beyond every despawn radius
  const NEAR = [270, 420], FAR = [-700, -700];
  const mem = () => page.evaluate(() => ({ geo: window.__game.renderer.info.memory.geometries, tex: window.__game.renderer.info.memory.textures, raiders: window.__game.raiders.list.length }));
  const go = async (at) => { await page.evaluate((a) => (window.__at = a), at); const t0 = await page.evaluate(() => window.__game.renderT); await page.waitForFunction((t) => window.__game.renderT >= t, t0 + 1.2, { timeout: 240000, polling: 200 }); };
  const rows = [];
  for (let i = 0; i < 4; i++) {
    await go(NEAR); const n = await mem();
    await go(FAR); const f = await mem();
    rows.push({ cycle: i, near: n, far: f });
  }
  console.log(look, JSON.stringify(rows));
}
await browser.close(); srv.close(); process.exit(0);
