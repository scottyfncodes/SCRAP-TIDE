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
  const trace = new Map();
  Math.random = () => {
    if (window.__sim?.trace) { const k = (new Error().stack || '').split('\n')[2]?.trim().replace(/\?[^:)]*/, '') ?? '?'; trace.set(k, (trace.get(k) ?? 0) + 1); }
    return rnd();
  };
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
  // Timers: once the harness takes over, setTimeout/setInterval run on the virtual clock, inside step(), in due-time
  // order. The game's delayed effects (the winch's next zone, the loot roll, fades, panels, the save debounce) then
  // happen on the same frame every run instead of whenever the machine gets to them.
  // The audio clock too: the game's music/ambience scheduler reads AudioContext.currentTime (the sound card's clock)
  // and draws random numbers for each sound it schedules, so on a real-time audio clock the number of draws per
  // frame varied run to run. Under the harness it reads the virtual clock.
  const BAC = window.BaseAudioContext || window.AudioContext;
  const ctDesc = BAC && Object.getOwnPropertyDescriptor(BAC.prototype, 'currentTime');
  if (ctDesc?.get) {
    const realCt = ctDesc.get;
    Object.defineProperty(BAC.prototype, 'currentTime', { configurable: true, get() { return manual ? vt / 1000 : realCt.call(this); } });
  }
  const realST = window.setTimeout.bind(window), realCT = window.clearTimeout.bind(window);
  const realSI = window.setInterval.bind(window), realCI = window.clearInterval.bind(window);
  const timers = new Map();
  let nextTimer = 1e9;
  const addTimer = (fn, ms, a, every) => { const id = nextTimer++; timers.set(id, { due: vt + Math.max(0, +ms || 0), fn, a, every }); return id; };
  window.setTimeout = (fn, ms, ...a) => (manual ? addTimer(fn, ms, a, 0) : realST(fn, ms, ...a));
  window.setInterval = (fn, ms, ...a) => (manual ? addTimer(fn, ms, a, Math.max(1, +ms || 0)) : realSI(fn, ms, ...a));
  window.clearTimeout = (id) => { if (!timers.delete(id)) realCT(id); };
  window.clearInterval = (id) => { if (!timers.delete(id)) realCI(id); };
  const runTimers = () => {
    for (let guard = 0; guard < 10000; guard++) {
      let bid = null, bt = null;
      for (const [id, t] of timers) if (t.due <= vt && (!bt || t.due < bt.due || (t.due === bt.due && id < bid))) { bid = id; bt = t; }
      if (!bt) return;
      if (bt.every) bt.due += bt.every; else timers.delete(bid);
      try { typeof bt.fn === 'function' ? bt.fn(...bt.a) : (0, eval)(bt.fn); } catch (e) { console.error(e); }
    }
  };
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
      // The game's own generator (Game.rng, a mulberry32 with state \`s\`) advances on every frame, including the
      // dt = 0 title-screen frames, whose number depends on load time: start it from the same state every run.
      const g = window.__game;
      if (g?.rng && typeof g.rng.s === 'number') g.rng.s = ((s ?? baseSeed) ^ 0x5bd1e995) >>> 0 || 1;
      return new Promise((res) => realRAF(() => realRAF(() => realST(() => { if (s !== undefined) seed = baseSeed = s >>> 0; res(queue.size); }, 30))));
    },
    /** Run n frames of every rAF callback (the game loop, UI animations) at a fixed dt in seconds. */
    step(n = 1, dt = 1 / 30) {
      // Reseed from the frame number: timers that fire on real time (sounds, UI delays) may draw random numbers
      // between steps, and must not shift what the next frames roll.
      if (manual) seed = (baseSeed ^ Math.imul(sim.frames + 1, 0x9e3779b1)) >>> 0;
      for (let i = 0; i < n; i++) {
        if (sim.onFrame) sim.onFrame(dt);
        vt += dt * 1000;
        runTimers();
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
    advance(ms) { vt += ms; runTimers(); },
    /** Change only the device clock (Date.now), like a player setting the phone's clock: no real time passes. */
    jumpWall(ms) { baseD += ms; },
    /** Virtual timers still pending (for waits in scripts). */
    get pendingTimers() { return timers.size; },
    trace: false,
    traceDump() { return [...trace].sort((a, b) => b[1] - a[1]); },
  };
  window.__sim = sim;
  // once the game exists, let the harness skip drawing (state is unaffected)
  const hook = realSI(() => {
    const g = window.__game;
    if (!g || !g.renderer || g.renderer.__simWrapped) return;
    const orig = g.renderer.render.bind(g.renderer);
    g.renderer.render = (s, c) => { if (sim.render) orig(s, c); };
    g.renderer.__simWrapped = true;
    realCI(hook);
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

/** Wait `ms`: on the virtual clock (frames + timers, not drawn) once the harness has taken over, else in real time. */
export async function pause(page, ms) {
  const manual = await page.evaluate((ms) => {
    const s = window.__sim;
    if (!s?.manual) return false;
    const r = s.render;
    s.render = false;
    s.step(Math.max(1, Math.round(ms / (1000 / 30))), 1 / 30);
    s.render = r;
    return true;
  }, ms);
  if (!manual) await page.waitForTimeout(ms);
  else await page.waitForTimeout(0); // let the page settle (microtasks, DOM) between scripted steps
}

/** Reveal cards queue up (welcome, discoveries, Captain's Log): tap them away until none arrive for a while. */
export async function dismissCards(page, quietRounds = 4) {
  let quiet = 0, n = 0;
  while (quiet < quietRounds) {
    // under the harness the tap is dispatched in-page with a reseed, in one task (no input-latency jitter)
    const hit = await page.evaluate((n) => {
      const b = document.querySelector('.reveal button, .reveal .btn');
      if (!b) return 0;
      if (window.__sim?.manual) {
        window.__sim.checkpoint(500 + n);
        b.click();
        return 1;
      }
      return 2;
    }, n);
    if (hit) {
      quiet = 0;
      n++;
      if (hit === 2) await page.click('.reveal button, .reveal .btn', { force: true }).catch(() => {});
    } else quiet++;
    await pause(page, 200);
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
