// Loop-pass screenshots, console check and a frame-rate sample (desktop 1280x800 and phone 393x852).
//
//   node scripts/loop-shots.mjs <dist folder | http(s) url> <out folder> [scene,scene,...]
//
// Scenes stage the real game through window.__game (sandboxed ?ship= preview visits: nothing is ever saved).
// A scene whose feature is missing in that build (e.g. the live site before a phase lands) still captures the frame,
// so the same command makes the "before" and the "after" shots.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'); }

const [src, outArg, sceneArg] = process.argv.slice(2);
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
let base = src, server = null;
if (!/^https?:/.test(src)) {
  const dist = resolve(src);
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
  server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    try { const body = await readFile(join(dist, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/`;
}
if (!base.endsWith('/')) base += '/';

const VIEWS = {
  desktop: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
  phone: { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true },
};

// ── scenes: { query, setup(page) } ─────────────────────────────────────────────────────────────────────────
const hold = (g, s) => {
  // pin the boat in place every few ms so headless frame times can't move the shot
  clearInterval(window.__pin);
  window.__pin = setInterval(() => {
    Object.assign(g.boat, { docked: false, anchored: false, x: s.x, z: s.z, heading: s.h, speed: s.speed ?? 0 });
    g.ui.joy.x = 0; g.ui.joy.y = 0; g.camYaw = s.h + (s.yaw ?? 0.2); g.camPitch = s.pitch ?? 0.32; g.atmo.time = s.tod ?? 0.42;
  }, 4);
};
const SCENES = {
  // Phase 1
  hud_trip: { q: '?ship=trimaran', run: () => { const g = window.__game; g.store.data.quest = 'free'; g.store.addCargo('scrap_metal', 6); g.store.addCargo('transistor_radio', 1); g.store.addCargo('gold_watch', 1); g.store.data.trip = { on: true, t: 60, hauls: 2, startGold: 0 }; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); } },
  squall: { q: '?ship=trimaran', run: () => { const g = window.__game; g.store.data.quest = 'free'; g.store.addCargo('scrap_metal', 8); g.store.addCargo('electronics', 3); g.store.addCargo('gold_watch', 1); g.store.data.trip = { on: true, t: g.tripLen + 30, hauls: 3, startGold: 0 }; (window.__hold)(g, { x: 150, z: -40, h: 2.2, tod: 0.55 }); setInterval(() => { g.store.data.hull = Math.max(g.store.data.hull, g.store.stats.hullMax * 0.55); }, 50); } },
  winch: { q: '?ship=trimaran', run: () => { const g = window.__game; (window.__hold)(g, { x: 70, z: 150, h: 1.6 }); g.ui.openWinch({ title: 'The Sunken Tower', sub: 'The top four floors of an office block.', window: 0.26, speed: 0.4, pulls: 3 }); setTimeout(() => { const p = document.querySelectorAll('.w-pips i'); p[0]?.classList.add('perfect'); p[1]?.classList.add('hit'); const m = document.querySelector('.w-msg'); if (m) { m.textContent = 'PERFECT! Bonus loot!'; m.style.color = '#a87400'; } }, 300); } },
  harpoon: { q: '?ship=trimaran&upgrades=harpoon_turret', run: () => { const g = window.__game; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); g.ui.harpoonRing?.('CACHE'); } },
  bank: { q: '?ship=trimaran', run: () => { const g = window.__game; (window.__hold)(g, { x: 20, z: 150, h: 3.0 }); g.ui.stamp ? g.ui.stamp('BANKED', '9 items · worth 186g · Driftholm') : 0; } },
  // HUD facelift: the helm wheel for each vessel, and a panel
  helm_skiff: { q: '?ship=skiff', run: () => { const g = window.__game; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); } },
  helm_trimaran: { q: '?ship=trimaran&upgrades=harpoon_turret', run: () => { const g = window.__game; (window.__hold)(g, { x: 92, z: 128, h: 0, yaw: 0.6 }); } },
  helm_brig: { q: '?ship=brig', run: () => { const g = window.__game; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); } },
  helm_ironwake: { q: '?ship=ironwake&upgrades=all', run: () => { const g = window.__game; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); } },
  panel: { q: '?ship=trimaran', run: () => { const g = window.__game; g.store.data.gold = 900; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); g.ui.openPanel('shipwright'); } },
  // Phase 2
  loot_reveal: { q: '?ship=trimaran&upgrades=radar_mast,compass_brass', run: () => { const g = window.__game; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); g.ui.revealChest('Legendary Wreck: The Last Ferry', [{ id: 'scrap_metal', n: 3 }, { id: 'gold_bar', n: 2 }, { id: 'ship_in_bottle', n: 1 }, { id: 'sextant', n: 1 }], 'PERFECT HAUL!', 'legendary'); } },
  wrecks: { q: '?ship=trimaran&upgrades=radar_mast,compass_brass', run: () => { const g = window.__game; g.store.data.quest = 'free'; g.tripStart(); g.wrecks?.spawnAt(95, 60, 'legendary'); g.wrecks?.spawnAt(20, 40, 'rare'); g.wrecks?.spawnAt(70, 95, 'common'); (window.__hold)(g, { x: 60, z: 130, h: 2.8, yaw: 0.1, pitch: 0.28 }); document.querySelector('.radar')?.classList.add('big'); } },
  salvage_log: { q: '?ship=trimaran', run: () => { const g = window.__game; for (const id of ['conch', 'spiral_shell', 'sand_dollar', 'starfish', 'sea_glass', 'coral_branch', 'transistor_radio', 'vinyl_record', 'sextant', 'ship_bell', 'rubber_duck', 'pearl', 'gold_watch']) g.store.discover(id, 'the Drift'); (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); g.ui.openPanel('catalog', 'sets'); } },
  shop: { q: '?ship=trimaran&upgrades=sail_canvas,cargo_crate,rudder_ash', run: () => { const g = window.__game; g.store.data.gold = 900; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); g.ui.openPanel('shipwright'); setTimeout(() => { const b = document.querySelector('.sheet-body, .sheet .body'); const t = [...document.querySelectorAll('.section-title')].find((e) => /Salvage Gear|Navigation/.test(e.textContent)); t?.scrollIntoView(); }, 200); } },
  dock_board: { q: '?ship=trimaran', run: () => { const g = window.__game; const j = g.store.data.jobs.board; j[0].progress = Math.ceil(j[0].n / 2); j[1].progress = j[1].n; j[1].done = true; (window.__hold)(g, { x: 60, z: 120, h: 0.9 }); g.ui.openPanel('harbor'); setTimeout(() => [...document.querySelectorAll('.section-title')].find((e) => /Dock board/.test(e.textContent))?.scrollIntoView(), 200); } },
  // Phase 3
  rogue_wave: { q: '?ship=trimaran', run: () => { const g = window.__game; g.store.data.quest = 'free'; g.tripStart(); g.events.trigger('rogue_wave'); g.events.active[0].data.dist = 60; g.events.active[0].data.from = 2.4; (window.__hold)(g, { x: 60, z: 120, h: 0.9, yaw: 1.2, pitch: 0.24 }); setInterval(() => { const a = g.events.active[0]; if (a) a.data.dist = Math.max(a.data.dist, 34); }, 20); } },
  rival: { q: '?ship=trimaran', run: () => { const g = window.__game; g.store.data.quest = 'free'; g.tripStart(); g.events.trigger('rival'); const a = g.events.active[0]; if (a) { a.data.speed = 0.01; const w = a.data.wreck.site; const h = Math.atan2(w.x - (w.x - 30), w.z - (w.z - 40)); (window.__hold)(g, { x: w.x - 14, z: w.z - 20, h, yaw: -0.5, pitch: 0.22 }); a.data.x = w.x + 6; a.data.z = w.z - 2; g.zoom = 0.75; } } },
  creature: { q: '?ship=trimaran&upgrades=radar_mast,compass_brass', run: () => { const g = window.__game; g.store.data.quest = 'free'; g.tripStart(); g.events.trigger('creature'); const a = g.events.active[0]; if (a) { const w = a.data.wreck.site; (window.__hold)(g, { x: w.x - 30, z: w.z - 45, h: Math.atan2(30, 45), yaw: 0.15, pitch: 0.3 }); } } },
  daily_end: { q: '?ship=trimaran', run: () => { const g = window.__game; (window.__hold)(g, { x: 20, z: 150, h: 3.0 }); g.ui.dailyEnd?.('2026-11-09', { banked: 214, perfects: 4, events: 2, legendary: 1, sunk: false, total: 404 }, 3, 'SCRAP TIDE · Daily Tide 2026-11-09\n💰 404 pts · banked 214g\n🎯 🟨🟨🟨🟨⬛\n🌊⛵🐙 2/3 events beaten · 👑 legendary\n🔥 3-day streak', true); } },
  // Phase 4 (the ?vehicle= previews launch the vehicle by themselves)
  docked: { q: '?ship=trimaran&upgrades=all&vehicle=all', run: () => { const g = window.__game; g.started = true; g.ui.closePanel(); (window.__hold)(g, { x: 40, z: 112, h: 0.6, yaw: 2.2, pitch: 0.2 }); g.zoom = 0.7; } },
  runner_jump: { q: '?vehicle=waverunner', run: () => { const g = window.__game; clearInterval(window.__pin); setTimeout(() => { const v = g.vehicles; v.rSpeed = 18; v.rY = 1.6; v.rVy = 0.5; window.__pin2 = setInterval(() => { v.rY = Math.max(v.rY, 1.4); v.rVy = Math.max(v.rVy, 0.2); v.rSpeed = 18; g.ui.joy.x = 0; g.ui.joy.y = 0.9; g.camYaw = v.rHeading + 0.5; }, 10); }, 1700); } },
  raider_chase: { q: '?vehicle=waverunner&upgrades=harpoon_turret', run: () => { const g = window.__game; clearInterval(window.__pin); setTimeout(() => { g.store.addCargo('gold_watch', 2); g.store.addCargo('scrap_metal', 4); g.events.trigger('raiders'); const v = g.vehicles; window.__pin2 = setInterval(() => { for (const [i, r] of g.raiderRun.riders.entries()) { r.state = 'circle'; r.r = 9; r.ang = 2.6 + i * 0.7; } v.rx = g.boat.x - 16; v.rz = g.boat.z - 12; v.rHeading = 0.93; v.rSpeed = 12; g.camYaw = 0.93; g.zoom = 1.1; }, 10); }, 1700); } },
  balloon_high: { q: '?vehicle=balloon', run: () => { const g = window.__game; clearInterval(window.__pin); setTimeout(() => { g.wrecks.spawnAt(g.boat.x + 120, g.boat.z + 160, 'legendary'); g.wrecks.spawnAt(g.boat.x - 150, g.boat.z + 60, 'rare'); g.wrecks.spawnAt(g.boat.x + 40, g.boat.z - 140, 'common'); g.events.trigger('rogue_wave'); window.__pin2 = setInterval(() => { g.vehicles.alt = 110; g.vehicles.burning = true; }, 20); document.querySelector('.radar')?.classList.add('big'); }, 1700); } },
  winch_lift: { q: '?vehicle=balloon', run: () => { const g = window.__game; clearInterval(window.__pin); setTimeout(() => { const v = g.vehicles; const w = g.wrecks.spawnAt(v.bx + 4, v.bz + 4, 'legendary', { name: 'Heavy Wreck in the Shallows' }); v.alt = 20; v.winchLift(); window.__pin2 = setInterval(() => { v.alt = 22; g.camYaw = 0.7; }, 20); }, 1900); } },
};

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const want = (sceneArg || Object.keys(SCENES).join(',')).split(',');
const report = { base, scenes: {}, console: {}, fps: {} };
for (const [vid, vp] of Object.entries(VIEWS)) {
  report.console[vid] = [];
  for (const name of want) {
    const sc = SCENES[name];
    if (!sc) continue;
    const ctx = await browser.newContext({ ...vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => report.console[vid].push(`${name}: pageerror ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && report.console[vid].push(`${name}: ${m.text()}`));
    await page.goto(base + sc.q);
    await page.waitForFunction(() => window.__game?.ship, null, { timeout: 180000 });
    await page.waitForSelector('.title-screen .act', { timeout: 180000 }).catch(() => {});
    await page.click('.title-screen .act', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
    const clear = async () => { for (let i = 0; i < 10; i++) { const r = await page.$('.reveal button'); if (!r) break; await r.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); } };
    await clear();
    await page.evaluate(`window.__hold = ${hold.toString()}`);
    await page.evaluate(`(${sc.run.toString()})()`);
    const t0 = await page.evaluate(() => window.__game.renderT);
    const w0 = Date.now();
    await page.waitForFunction((t) => window.__game.renderT >= t, t0 + 1.5, { timeout: 120000, polling: 100 }).catch(() => {});
    if (name === want[0]) report.fps[vid] = await page.evaluate(() => new Promise((r) => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 4000) requestAnimationFrame(f); else r(+(n / ((performance.now() - t) / 1000)).toFixed(2)); }; requestAnimationFrame(f); }));
    await clear();
    if (['harpoon', 'bank', 'loot_reveal', 'daily_end'].includes(name)) await page.evaluate(`(${sc.run.toString()})()`);
    await page.waitForTimeout(name === 'bank' ? 250 : name === 'harpoon' ? 120 : name === 'loot_reveal' ? 1600 : name === 'daily_end' ? 900 : 500);
    await page.screenshot({ path: `${out}/${name}-${vid}.png`, timeout: 120000 });
    // thumb reach (Phase 4): where the vehicle controls sit on this screen
    report.scenes[`${name}-${vid}`] = await page.evaluate(() => {
      const r = (e) => { const b = e.getBoundingClientRect(); return { label: e.textContent.trim().slice(0, 24), x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
      return { vw: innerWidth, vh: innerHeight, actions: [...document.querySelectorAll('.actions .act')].map(r), hold: [...document.querySelectorAll('.hold-btn')].map(r), stick: [...document.querySelectorAll('.stick')].map(r) };
    });
    await ctx.close();
  }
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
server?.close();
