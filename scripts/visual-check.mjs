// Visual check: sails each vessel on a phone-sized screen and
//  1. measures how much wake/bow spray is drawn over the boat (Game.wakeOverlap), from behind and from a low side
//     angle, and fails if it's more than a few percent of the puffs (it was ~30-50% before the hull-clear spray fix);
//  2. saves screenshots at noon, dusk and night to visual-check/ for a person to look at.
//
//   npm run check:visual            (needs Playwright + Chromium; uses a global install when there is one)
//
// Runs the Vite dev server itself. Nothing is saved to the game's storage (?ship= preview visits).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('visual-check: Playwright is not installed (npm i -D playwright && npx playwright install chromium)');
  process.exit(2);
}

const MAX_OVER = 0.08; // share of live puffs allowed over the boat
const SHIPS = ['skiff', 'trimaran', 'ironwake'];
const VIEWS = { behind: 0, side: 0.9 };
const TIMES = { noon: 0.5, dusk: 0.81, night: 0.95 };
const out = 'visual-check';
mkdirSync(out, { recursive: true });

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const fails = [];
const rows = [];

for (const ship of SHIPS) {
  const ctx = await browser.newContext({ ...playwright.devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fails.push(`${ship}: page error ${e.message}`));
  await page.goto(`${url}/?ship=${ship}`);
  await page.waitForFunction(() => window.__game?.ship, null, { timeout: 90000 });
  await page.getByText('SET SAIL').click({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) {
    const b = await page.$('button:visible:has-text("Let"), button:visible:has-text("OK"), button:visible:has-text("Got it")');
    if (!b) break;
    await b.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
  // sail straight on; the camera looks from `view` radians off the stern and the clock is pinned to `tod`
  await page.evaluate(() => {
    const g = window.__game;
    g.started = true;
    g.boat.docked = false;
    g.boat.anchored = false;
    window.__vc = { view: 0, tod: 0.5, h0: g.boat.heading };
    setInterval(() => {
      const v = window.__vc;
      g.ui.joy.x = Math.sin(v.view);
      g.ui.joy.y = Math.cos(v.view);
      g.camYaw = v.h0 + v.view;
      g.camPitch = v.view ? 0.3 : 0.42;
      g.atmo.time = v.tod;
    }, 8);
  });
  for (const [view, yaw] of Object.entries(VIEWS)) {
    await page.evaluate((y) => Object.assign(window.__vc, { view: y, tod: 0.5 }), yaw);
    // up to speed, wake established. Wait on *game* time: headless software GL runs a few fps and the game caps each
    // step at 0.05 s, so 4 s of wall time was only ~0.3-0.8 s of sailing and the boat was still pulling away from a
    // standstill (its stern wake tight against the hull), which made the result depend on how fast the runner was.
    const gt0 = await page.evaluate(() => window.__game.renderT);
    await page.waitForFunction((t) => window.__game.renderT >= t, gt0 + 3, { timeout: 120000, polling: 100 });
    let live = 0, over = 0;
    for (let k = 0; k < 40; k++) {
      const r = await page.evaluate(() => window.__game.wakeOverlap());
      live += r.live;
      over += r.over;
      await page.waitForTimeout(100);
    }
    const share = live ? over / live : 0;
    const speed = await page.evaluate(() => window.__game.boat.speed);
    rows.push({ ship, view, speed: +speed.toFixed(1), puffs: live, over, share: +share.toFixed(3) });
    if (speed < 2) fails.push(`${ship} ${view}: boat didn't get under way (${speed.toFixed(1)} m/s)`);
    if (share > MAX_OVER) fails.push(`${ship} ${view}: ${(share * 100).toFixed(1)}% of wake puffs drawn over the boat (max ${MAX_OVER * 100}%)`);
    for (const [name, tod] of Object.entries(TIMES)) {
      if (view !== 'side' && name !== 'noon') continue;
      await page.evaluate((t) => (window.__vc.tod = t), tod);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${ship}-${view}-${name}.png` });
    }
  }
  await ctx.close();
}
await browser.close();
await server.close();
console.table(rows);
console.log(fails.length ? `FAIL\n- ${fails.join('\n- ')}` : `PASS (screenshots in ${out}/)`);
process.exit(fails.length ? 1 : 0);
