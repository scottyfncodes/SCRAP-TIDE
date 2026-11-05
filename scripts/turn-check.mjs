// Turn check: drives Game.update(dt) with scripted stick input on every vessel and fails if turning is not smooth in
// time. It guards two bugs that made boats judder through turns on phones (docs/asset-modernization/polish.md):
//  1. the follow camera's yaw was updated AFTER steering, which is camera-relative, so each frame the heading moved
//     by the previous frame's camera swing: on uneven frame times its angular velocity zig-zagged (2-4x) against a
//     smoothly turning camera;
//  2. pitch/roll/sail eased by a fixed fraction per FRAME, so they stepped unevenly and ran twice as stiff at 120 Hz.
// For each vessel and manoeuvre (sharp turn, rapid reversals, sustained circle, turn-around, turning from a standstill
// under engine) it runs a steady 60 Hz clock, a 120 Hz clock and an uneven phone-like clock, and measures how much
// the heading's and the roll's rates of change jump per second ("jerk"). The uneven clock must stay close to the
// steady one, and steering must still turn the boat as fast as before (heading after 1 s of hard rudder).
//
//   npm run check:turn            (needs Playwright + Chromium, like check:visual)
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('turn-check: Playwright is not installed (npm i -D playwright && npx playwright install chromium)');
  process.exit(2);
}

const SHIPS = ['skiff', 'trimaran', 'ironwake'];
const MAX_HEAD_JERK = 2.0; // rad/s^2 per s on the uneven clock (the bug measured 7-25; fixed ~0.3-0.8)
const MAX_ROLL_RATIO = 1.6; // roll jerk, uneven clock vs steady 60 Hz (the bug measured 3-5x)

const server = await createServer({ server: { port: 5198, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const fails = [];
const rows = [];

for (const ship of SHIPS) {
  const ctx = await browser.newContext({ ...playwright.devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fails.push(`${ship}: page error ${e.message}`));
  await page.goto(`${url}/?ship=${ship}&upgrades=all`);
  await page.waitForFunction(() => window.__game?.ship, null, { timeout: 120000 });
  await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const res = await page.evaluate(() => {
    const g = window.__game;
    g.renderer.render = () => {}; // physics only: the render loop stays out of the measurement
    const wrap = (d) => ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const scen = {
      sharp: (t) => (t < 3 ? [0, 1] : t < 6 ? [1, 0.2] : [-1, 0.2]),
      rapid: (t) => (t < 2 ? [0, 1] : [Math.floor(t * 2) % 2 ? 1 : -1, 0.5]),
      circle: (t) => (t < 2 ? [0, 1] : [0.6, 0.8]),
      reverse: (t) => (t < 3 ? [0, 1] : [0.05, -1]),
      accel: () => [0.7, 0.7],
    };
    const clocks = { hz60: () => 1 / 60, hz120: () => 1 / 120, uneven: (i) => [1 / 60, 1 / 60, 1 / 30, 1 / 60, 1 / 90, 1 / 45][i % 6] };
    const out = {};
    for (const [sn, inp] of Object.entries(scen)) for (const [cn, clk] of Object.entries(clocks)) {
      Object.assign(g.boat, { x: 0, z: 60, heading: 0, speed: 0, docked: false, anchored: false, busy: false });
      g.started = true; g.mode = 'sail'; g.camYaw = 0; g.camPitch = 0.42; g.zoom = 1; g.lastDrag = -99;
      g.engineOn = sn === 'accel'; g.store.data.fuel = 100; g.atmo.time = 0.5; g.atmo.storm = 0;
      const T = [], H = [], Z = [];
      let t = 0;
      for (let i = 0; t < 9; i++) {
        const dt = clk(i);
        [g.ui.joy.x, g.ui.joy.y] = inp(t);
        g.update(dt);
        t += dt;
        T.push(t); H.push(g.boat.heading); Z.push(g.shipRoot.rotation.z);
      }
      const rate = (v) => v.slice(1).map((x, i) => wrap(x - v[i]) / (T[i + 1] - T[i]));
      const jerk = (r) => r.slice(1).reduce((a, x, i) => a + Math.abs(x - r[i]), 0) / (T[T.length - 1] - T[0]);
      const at = (tt) => H[T.findIndex((x) => x >= tt)];
      out[`${sn}.${cn}`] = { head: jerk(rate(H)), roll: jerk(rate(Z)), turned: Math.abs(wrap(at(4) - at(3))) };
    }
    return out;
  });
  for (const sn of ['sharp', 'rapid', 'circle', 'reverse', 'accel']) {
    const s60 = res[`${sn}.hz60`], s120 = res[`${sn}.hz120`], un = res[`${sn}.uneven`];
    rows.push({ ship, manoeuvre: sn, headJerk60: +s60.head.toFixed(2), headJerkUneven: +un.head.toFixed(2), rollJerk60: +s60.roll.toFixed(2),
      rollJerk120: +s120.roll.toFixed(2), rollJerkUneven: +un.roll.toFixed(2) });
    if (un.head > Math.max(MAX_HEAD_JERK, s60.head * 1.6)) fails.push(`${ship} ${sn}: heading judders on an uneven clock (jerk ${un.head.toFixed(2)} vs ${s60.head.toFixed(2)} at a steady 60 Hz)`);
    const rollLimit = Math.max(s60.roll * MAX_ROLL_RATIO, s60.roll + 0.3);
    if (un.roll > rollLimit) fails.push(`${ship} ${sn}: roll steps unevenly on an uneven clock (jerk ${un.roll.toFixed(2)} vs ${s60.roll.toFixed(2)})`);
    if (s120.roll > rollLimit) fails.push(`${ship} ${sn}: roll depends on the frame rate (120 Hz jerk ${s120.roll.toFixed(2)} vs ${s60.roll.toFixed(2)} at 60 Hz)`);
  }
  // responsiveness: a hard rudder turns the boat as far in 1 s on any clock (no smoothing added to steering)
  const t60 = res['sharp.hz60'].turned, tun = res['sharp.uneven'].turned;
  rows.push({ ship, manoeuvre: 'turned in 1 s (rad)', headJerk60: +t60.toFixed(3), headJerkUneven: +tun.toFixed(3) });
  if (Math.abs(tun - t60) > 0.05) fails.push(`${ship}: hard rudder turns ${tun.toFixed(3)} rad/s on an uneven clock vs ${t60.toFixed(3)} at 60 Hz`);
  await ctx.close();
}
await browser.close();
await server.close();
console.table(rows);
console.log(fails.length ? `FAIL\n- ${fails.join('\n- ')}` : 'PASS');
process.exit(fails.length ? 1 : 0);
