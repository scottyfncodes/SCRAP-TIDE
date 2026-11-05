// PLAYCRAFT evidence harness: boots the REAL game in headless Chromium and makes it deterministic and steppable
// without touching the game's source.
//
// Injected before any game script runs (page.addInitScript):
//   - Math.random → a seeded mulberry32 stream (reseeded when the harness takes over)
//   - performance.now / Date.now → a virtual clock once the harness takes over
//   - requestAnimationFrame → a manual queue once the harness takes over, so `__sim.step(n, dt)` runs exactly n
//     frames of the game's own loop at a fixed dt (the loop computes dt from the rAF timestamp; it caps it at 0.05)
//   - an optional per-frame hook (`__sim.onFrame`) so a driver can hold the wheel like a player would
//
// The renderer can be switched off between frames (`__sim.render = false`): drawing changes no game state, it only
// costs time in software WebGL. Nothing here alters game rules, numbers or saves.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    console.error('Playwright is not installed (npm i -D playwright && npx playwright install chromium)');
    process.exit(2);
  }
}

/** Facts about the build under test, stamped into every report. */
export function provenance(extra = {}) {
  const sh = (c) => {
    try {
      return execSync(c, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      return null;
    }
  };
  return {
    generated_at: new Date().toISOString(),
    commit: sh('git rev-parse HEAD'),
    branch: sh('git rev-parse --abbrev-ref HEAD'),
    dirty_src: !!sh('git status --porcelain -- src public'),
    environment: 'headless Chromium (Playwright) with SwiftShader software WebGL on a Linux container. NOT a real device.',
    ...extra,
  };
}

/** Vite dev server (serves /src modules, so a page can import the game's real data/state modules). */
export async function devServer(port = 5311) {
  const { createServer } = await import('vite');
  // no HMR / file watching: editing a file mid-run must not reload the page under a running simulation
  const server = await createServer({ root: ROOT, server: { port, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
  await server.listen();
  return { url: server.resolvedUrls.local[0].replace(/\/$/, ''), close: () => server.close(), kind: 'vite dev server (src/)' };
}

/** Vite preview of the production build in dist/ (run `npm run build` first). */
export async function previewServer(port = 5312) {
  const { preview } = await import('vite');
  const server = await preview({ root: ROOT, preview: { port, strictPort: false }, logLevel: 'error' });
  return { url: server.resolvedUrls.local[0].replace(/\/$/, ''), close: () => new Promise((r) => server.httpServer.close(r)), kind: 'vite preview (dist/ production build)' };
}

export const INIT = String.raw`(() => {
  let seed = 0x2f6b7a11 >>> 0;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = rnd;
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now.bind(Date);
  const realRAF = window.requestAnimationFrame.bind(window);
  const realCAF = window.cancelAnimationFrame.bind(window);
  let manual = false, vt = 0, baseP = 0, baseD = 0, nextId = 1, baseSeed = seed;
  let queue = new Map();
  // Before the harness takes over, time stands still: the game's loop sees dt = 0 through loading and the title
  // screen (so the clock, time of day and storm cells start every run in the same place), and anything seeded from
  // Date.now() at boot (the game's own RNG) gets the same seed every run.
  const EPOCH = 1793000000000, P0 = 1000;
  performance.now = () => (manual ? baseP + vt : P0);
  Date.now = () => (manual ? Math.floor(baseD + vt) : EPOCH);
  window.requestAnimationFrame = (cb) => {
    if (manual) { const id = nextId++; queue.set(id, cb); return id; }
    return realRAF(() => cb(performance.now()));
  };
  window.cancelAnimationFrame = (id) => { queue.delete(id); realCAF(id); };
  const sim = {
    frames: 0,
    render: true,
    onFrame: null,
    get manual() { return manual; },
    get virtualMs() { return vt; },
    reseed(s) { seed = s >>> 0; baseSeed = seed; },
    /** Switch to the virtual clock. Resolves once callbacks already handed to the real rAF have come back and
     *  re-registered in the manual queue (the game loop among them). */
    takeOver(s) {
      baseP = P0; baseD = EPOCH; vt = 0; manual = true;
      if (s !== undefined) seed = baseSeed = s >>> 0;
      return new Promise((res) => realRAF(() => realRAF(() => setTimeout(() => { if (s !== undefined) seed = baseSeed = s >>> 0; res(queue.size); }, 30))));
    },
    /** Run n frames of every rAF callback (the game loop, UI animations) at a fixed dt in seconds. */
    step(n = 1, dt = 1 / 30) {
      // Reseed from the frame number: timers that fire on real time (sounds, UI delays) may draw random numbers
      // between steps, and must not shift what the next frames roll.
      if (manual) seed = (baseSeed ^ Math.imul(sim.frames + 1, 0x9e3779b1)) >>> 0;
      for (let i = 0; i < n; i++) {
        if (sim.onFrame) sim.onFrame(dt);
        vt += dt * 1000;
        const q = queue; queue = new Map();
        const now = performance.now();
        for (const cb of q.values()) cb(now);
        sim.frames++;
      }
      return sim.frames;
    },
    /** Reseed at a scripted moment (e.g. right after a tap whose outcome the game rolls on a real-time timer). */
    checkpoint(n = 0) { seed = (baseSeed ^ Math.imul(sim.frames + 7919 * (n + 1), 0x85ebca6b)) >>> 0; },
    /** Move the virtual clock without running frames (e.g. a salvage site's respawn timer). */
    advance(ms) { vt += ms; },
  };
  window.__sim = sim;
  // once the game exists, let the harness skip drawing (state is unaffected)
  const hook = setInterval(() => {
    const g = window.__game;
    if (!g || !g.renderer || g.renderer.__simWrapped) return;
    const orig = g.renderer.render.bind(g.renderer);
    g.renderer.render = (s, c) => { if (sim.render) orig(s, c); };
    g.renderer.__simWrapped = true;
    clearInterval(hook);
  }, 20);
})();`;

/**
 * Boot the game: fresh browser context (its own empty localStorage, so no real save is ever touched), wait for the
 * title screen with every model loaded, tap SET SAIL, dismiss the welcome cards, then take over the clock.
 */
export async function boot(browser, playwright, url, { seed = 1, query = '', viewport = { width: 390, height: 844 }, setSail = true } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: playwright.devices['iPhone 13'].userAgent });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 300)}`));
  await page.addInitScript(INIT);
  const t0 = Date.now();
  await page.goto(`${url}/${query}`);
  await page.waitForFunction(() => window.__game?.ship && window.__game.renderer?.__simWrapped, null, { timeout: 180000 });
  await page.waitForSelector('.title-screen .act', { timeout: 180000 });
  const bootMs = Date.now() - t0;
  if (setSail) {
    await page.click('.title-screen .act');
    await dismissCards(page);
  }
  const queued = await page.evaluate((s) => window.__sim.takeOver(s), seed);
  if (!queued) throw new Error('harness: no rAF callback came back after takeOver (the game loop is not under control)');
  return { ctx, page, errors, bootMs };
}

/** Reveal cards queue up (welcome, discoveries, Captain's Log): tap them away until none arrive for a while. */
export async function dismissCards(page, quietRounds = 4) {
  let quiet = 0, n = 0;
  while (quiet < quietRounds) {
    const b = await page.$('.reveal button, .reveal .btn');
    if (b) {
      quiet = 0;
      n++;
      await b.click({ force: true }).catch(() => {});
    } else quiet++;
    await page.waitForTimeout(200);
  }
  return n;
}

/** Step the game `seconds` of game time at 30 fps without drawing; draws one frame at the end if asked. */
export async function stepGame(page, seconds, { draw = false, dt = 1 / 30 } = {}) {
  const n = Math.max(1, Math.round(seconds / dt));
  return page.evaluate(([n, dt, draw]) => {
    const s = window.__sim;
    s.render = false;
    s.step(n - (draw ? 1 : 0), dt);
    if (draw) {
      s.render = true;
      s.step(1, dt);
    }
    return window.__game.renderT;
  }, [n, dt, draw]);
}

/** Small deterministic hash for reproducibility checks. */
export function hashJSON(v) {
  const s = JSON.stringify(v);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0');
}
