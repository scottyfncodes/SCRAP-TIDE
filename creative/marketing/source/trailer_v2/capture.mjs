// Run from the repo root: node creative/marketing/source/trailer_v2/capture.mjs <out-dir> [shot,names]
// Frame-stepped gameplay capture for the teaser: the game loop is driven one fixed 1/24 s step per screenshot, so the
// clip is smooth even though headless WebGL renders a frame or two a second. HUD hidden; nothing is saved (?ship= preview).
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const require = createRequire(process.cwd() + '/');
const playwright = require('playwright');
const OUT = process.argv[2];
const FPS = 24;
const server = await createServer({ server: { port: 5203 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const SHOTS = [
  { name: 'shot1_driftholm', ship: 'dinghy', frames: 168, setup: `g.atmo.time = 0.77; V.yaw = 0.75; V.pitch = 0.22; V.spin = -0.0025;` },
  { name: 'shot2_salvage', ship: 'sloop', frames: 168, setup: `g.boat.x = 70; g.boat.z = 128; g.boat.heading = 0.75; g.atmo.time = 0.42; V.yaw = 1.9; V.pitch = 0.3; V.spin = 0.004; V.throttle = 0.25;
      V.at = { 40: () => { const p = new THREE_V(g.boat.x, 0.5, g.boat.z); g.foam.emit(p, 40, '#ffffff', 3, 5, 1.2, 8, 1); g.sparkle.emit(p.clone().setY(1.5), 40, '#ffd25e', 3, 4, 1.2, 5, 0.6); g.flip.burst('splash', p.clone().setY(1.2), 4.5); g.crewCheer(0); } };` },
  { name: 'shot3_stormwall', ship: 'ironwake', realtime: true, frames: Number(process.env.F3 || 168), setup: `g.engineOn = true; g.atmo.time = 0.6; V.storm = 0.85; V.yaw = 0.25; V.pitch = 0.32; V.spin = 0.002;
      V.at = { 30: () => { strike(240); }, 100: () => { strike(180); } };` },
];

for (const s of SHOTS.filter((x) => !process.argv[3] || process.argv[3].split(',').includes(x.name))) {
  const dir = `${OUT}/${s.name}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const real = window.requestAnimationFrame.bind(window);
    const q = [];
    window.__manual = false;
    window.requestAnimationFrame = (cb) => (window.__manual ? (q.push(cb), q.length) : real(cb));
    let t = 0;
    window.__step = (ms) => { t += ms; const run = q.splice(0); for (const cb of run) cb(window.__t0 + t); };
  });
  await page.goto(`${url}/?ship=${s.ship}&fx=high`);
  await page.waitForFunction(() => window.__game?.ship, null, { timeout: 120000 });
  await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const b = await page.$('button:visible:has-text("Let"), button:visible:has-text("OK"), button:visible:has-text("Got it")'); if (!b) break; await b.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); }
  await page.addStyleTag({ content: '* { visibility: hidden !important } canvas.__main { visibility: visible !important }' });
  await page.evaluate(() => [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0].classList.add('__main'));
  await page.evaluate((rt) => (window.__realtime = rt), !!s.realtime);
  await page.evaluate((setup) => {
    const g = window.__game;
    g.started = true; g.boat.docked = false; g.boat.anchored = false;
    const V = (window.__V = { yaw: 0, pitch: 0.3, spin: 0, storm: 0, throttle: 1, at: {} });
    const THREE_V = g.shipRoot.position.constructor;
    const strike = (d) => { const v = new THREE_V(g.boat.x + Math.sin(g.boat.heading) * d, 0, g.boat.z + Math.cos(g.boat.heading) * d); g.sky.strike(v); g.atmo.lightning = 1; };
    eval(setup);
    window.__drive = (f) => {
      g.ui.joy.x = 0; g.ui.joy.y = V.throttle;
      V.yaw += V.spin; g.camYaw = g.boat.heading + V.yaw; g.camPitch = V.pitch;
      if (V.storm && f >= 0) g.atmo.storm = V.storm;
      V.at[f]?.();
    };
    window.__t0 = performance.now();
    if (window.__realtime) { window.__iv = setInterval(() => window.__drive(-1), 8); return; }
    window.__manual = true;
  }, s.setup);
  if (s.realtime) {
    await page.waitForTimeout(6000); // under way in real time first
    await page.evaluate(() => { clearInterval(window.__iv); window.__t0 = performance.now(); window.__manual = true; });
  }
  await page.waitForTimeout(200);
  for (let i = 0; i < 48; i++) await page.evaluate(() => { window.__drive(-1); window.__step(1000 / 24); }); // settle: wake, speed
  if (process.env.PROBE) console.log(await page.evaluate(() => { const g = window.__game; return JSON.stringify({ cam: g.camera.position, ship: g.shipRoot.position, boat: g.boat, panel: g.ui.panelOpen, eng: g.engineOn, fuel: g.store.data.fuel, storm: g.atmo.storm, wall: g.atmo.wall, pitch: g.camPitch }); }));
  for (let f = 0; f < s.frames; f++) {
    await page.evaluate((f) => { window.__drive(f); window.__step(1000 / 24); }, f);
    await page.screenshot({ path: `${dir}/${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92, timeout: 120000 });
  }
  await ctx.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%04d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', `${OUT}/${s.name}.mp4`]);
  console.log('done', s.name);
}
await browser.close();
await server.close();
