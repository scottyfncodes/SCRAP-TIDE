// Run from the repo root: node scripts/perf-sail.mjs ["&fx=high" | "&fx=low"]
// In-play perf on the iPhone 13 profile (DPR 1 so SwiftShader gets enough frames to measure): the Ironwake under engine in
// a forced storm with lightning, for 12 s, after 6 s to get under way. Same script for the baseline and this branch.
import { createRequire } from 'node:module';
import { createServer } from 'vite';
const require = createRequire(process.cwd() + '/');
const playwright = require('playwright');
const q = process.argv[2] ?? '';
const server = await createServer({ server: { port: 5207 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ ...playwright.devices['iPhone 13'], deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`${url}/?ship=ironwake${q}`);
await page.waitForFunction(() => window.__game?.ship, null, { timeout: 120000 });
await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1500);
for (let i = 0; i < 6; i++) { const b = await page.$('button:visible:has-text("Let"), button:visible:has-text("OK"), button:visible:has-text("Got it")'); if (!b) break; await b.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); }
await page.evaluate(() => {
  const g = window.__game; g.started = true; g.boat.docked = false; g.boat.anchored = false; g.engineOn = true; const h0 = g.boat.heading;
  setInterval(() => { g.ui.joy.x = 0; g.ui.joy.y = 1; g.camYaw = h0 + 0.25; g.camPitch = 0.32; g.atmo.time = 0.5; g.atmo.storm = 0.9; }, 8);
  setInterval(() => { const v = g.shipRoot.position.clone(); v.x += 150; g.sky.strike(v); g.atmo.lightning = 1; }, 2500);
});
await page.waitForTimeout(6000);
const r = await page.evaluate(() => new Promise((res) => {
  const t = []; let last = performance.now(); const end = last + 12000;
  const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(t); };
  requestAnimationFrame(f);
}));
const s = [...r].sort((a, b) => a - b), p = (k) => s[Math.min(s.length - 1, Math.floor(k * s.length))];
const heap = await page.evaluate(() => performance.memory?.usedJSHeapSize / 1048576);
const fx = await page.evaluate(() => window.__game.flip?.quality ?? 'n/a');
console.log(JSON.stringify({ q, frames: r.length, fps: +(r.length / 12).toFixed(2), p50: +p(0.5).toFixed(0), p95: +p(0.95).toFixed(0), heapMB: +heap.toFixed(1), fx, speed: +(await page.evaluate(() => window.__game.boat.speed)).toFixed(1) }));
await browser.close(); await server.close();
