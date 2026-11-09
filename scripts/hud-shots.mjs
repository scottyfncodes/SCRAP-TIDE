// HUD layout check (mobile HUD pass): screenshots plus measured overlap, off-screen, horizontal-scroll and touch-target
// checks at iPhone 17, iPhone 13, a narrow phone, a tall phone, landscape and desktop; then drives the Menu tray, the
// Maps button, the hold chip and the radar toggle with real clicks.
//
//   node scripts/hud-shots.mjs <built dist folder> <output folder>      (VPS=iphone13,narrow to pick viewports)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
const require = createRequire('/home/user/SCRAP-TIDE/package.json');
const playwright = require('playwright');
const [dist, out] = [resolve(process.argv[2]), resolve(process.argv[3])];
mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try { const body = await readFile(join(dist, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}`;
const VPS = (process.env.VPS || 'iphone17,iphone13,narrow,tall,landscape,desktop').split(',');
const ALL = {
  iphone17: { viewport: { width: 402, height: 874 }, isMobile: true, hasTouch: true },
  iphone13: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  narrow: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true },
  tall: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 720 }, isMobile: false, hasTouch: false },
};
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = {};
for (const id of VPS) {
  const vp = ALL[id];
  const ctx = await browser.newContext({ ...vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`${id}: page error ${e.message}`));
  await page.goto(`${url}/?ship=skiff`);
  await page.waitForFunction(() => window.__game?.ship, null, { timeout: 120000 });
  await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const clear = async () => { for (let i = 0; i < 8; i++) { const r = await page.$('.reveal button'); if (r) { await r.click({ force: true }).catch(() => {}); await page.waitForTimeout(350); continue; } const b = await page.$('button:visible:has-text("EARNED"), button:visible:has-text("Let"), button:visible:has-text("OK"), button:visible:has-text("Got it"), button:visible:has-text("Nice"), button:visible:has-text("Onward")'); if (!b) break; await b.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); } };
  await clear();
  await page.evaluate(() => {
    const g = window.__game; g.started = true;
    const s = { x: 4, z: 128, h: 0, yaw: 0.18, pitch: 0.3, tod: 0.42 };
    setInterval(() => { Object.assign(g.boat, { docked: false, anchored: false, x: s.x, z: s.z, heading: s.h, speed: 0 }); g.ui.joy.x = 0; g.ui.joy.y = 0; g.camYaw = s.h + s.yaw; g.camPitch = s.pitch; g.zoom = 1; g.atmo.time = s.tod; }, 4);
  });
  const t0 = await page.evaluate(() => window.__game.renderT);
  await page.waitForFunction((t) => window.__game.renderT >= t, t0 + 2, { timeout: 180000, polling: 100 });
  await clear();
  await page.waitForTimeout(1500);
  await clear();
  await page.screenshot({ path: `${out}/${id}-sail.png` });
  // geometry: visible HUD controls must not overlap each other or leave the screen; no horizontal scroll
  const geo = await page.evaluate(() => {
    const sel = ['.status-plate', '.stats', '.quest', '.nav-btns', '.menu-btns', '.radar', '.helm-row .speed', '.speed', '.engine-btn', '.stick', '.actions .act'];
    const seen = new Set(); const boxes = [];
    for (const q of sel) document.querySelectorAll(q).forEach((e) => { if (seen.has(e)) return; seen.add(e); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width && r.height && cs.display !== 'none' && cs.visibility !== 'hidden') boxes.push({ q, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }); });
    const overl = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a.q === b.q && a.q.startsWith('.actions')) continue; const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 1 && oy > 1) overl.push(`${a.q} × ${b.q}`); }
    const off = boxes.filter((b) => b.l < -1 || b.t < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1).map((b) => b.q);
    const small = [...document.querySelectorAll('.hud button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width && getComputedStyle(b).display !== 'none' && (r.width < 44 || r.height < 30) && !b.closest('.nav-tray:not(.open)'); }).map((b) => `${b.className}:${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`);
    const hudTop = document.querySelector('.hud-top').getBoundingClientRect().bottom;
    const ctrlTop = Math.min(...boxes.filter((b) => /speed|engine|stick|actions/.test(b.q)).map((b) => b.t));
    return { overlaps: overl, offscreen: off, hscroll: document.documentElement.scrollWidth > innerWidth, smallTargets: small, topHudBottom: Math.round(hudTop), controlsTop: Math.round(ctrlTop), clearWorldPx: Math.round(ctrlTop - hudTop), vh: innerHeight };
  });
  report[id] = geo;
  // tray + radar
  if (await page.$('.nav-toggle')) {
    await page.click('.nav-toggle');
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${id}-menu.png` });
    report[id].trayItems = await page.$$eval('.nav-tray.open .tray-btn', (b) => b.map((x) => x.textContent.trim()));
    // each tray item opens its panel
    const opened = {};
    for (const p of ['maps', 'ship', 'cargo', 'catalog', 'settings']) {
      if (!(await page.$('.nav-tray.open'))) await page.click('.nav-toggle');
      await page.click(`.nav-tray .tray-btn[data-p="${p}"]`);
      await page.waitForTimeout(250);
      opened[p] = await page.evaluate(() => ({ open: window.__game.ui.panelOpen, title: document.querySelector('.sheet h2')?.textContent, trayClosed: !document.querySelector('.nav-tray.open') }));
      await page.evaluate(() => window.__game.ui.closePanel());
    }
    await page.click('.icon-btn[data-p="maps"]'); await page.waitForTimeout(200);
    opened.mapsDirect = await page.evaluate(() => window.__game.ui.panelOpen); await page.evaluate(() => window.__game.ui.closePanel());
    await page.click('.cargo-pill'); await page.waitForTimeout(200);
    opened.cargoChip = await page.evaluate(() => document.querySelector('.sheet h2')?.textContent); await page.evaluate(() => window.__game.ui.closePanel());
    // outside tap closes the tray
    await page.click('.nav-toggle'); await page.mouse.click(30, vp.viewport.height / 2); await page.waitForTimeout(100);
    opened.outsideCloses = !(await page.$('.nav-tray.open'));
    report[id].nav = opened;
    await page.click('.radar'); await page.waitForTimeout(600);
    report[id].radarBig = await page.$eval('.radar', (r) => [r.classList.contains('big'), r.getBoundingClientRect().width]);
    await page.screenshot({ path: `${out}/${id}-radar.png` });
    await page.click('.radar'); await page.waitForTimeout(300);
  }
  console.log(id, JSON.stringify(report[id]));
  await ctx.close();
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close(); server.close();
