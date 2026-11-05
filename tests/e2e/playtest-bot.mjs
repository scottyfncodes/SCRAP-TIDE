// PLAYCRAFT scripted playtest bot: plays the first money loop of TIDEBREAKERS on the PRODUCTION BUILD the way a
// player does, through the real UI.
//
//   1. start a voyage (title → SET SAIL → welcome card)
//   2. steer toward the Sunken Tower's beacon by dragging the wheel
//   3. slow down, tap SALVAGE, play the winch (tap REEL IN when the needle is in the green)
//   4. sail back and DOCK at Driftholm
//   5. sell the haul to Pip (appraiser panel)
//   6. install an upgrade from Marlo (shipwright panel)
//   7. reload the page: the upgrade is still installed (save → load) and visibly on the boat
//
// Deterministic: seeded Math.random, a virtual clock and fixed 1/30 s frames from the harness (tests/sim/harness.mjs).
// Runs in a fresh browser context (its own empty localStorage): no real save is read or written.
//
//   npm run build && npm run bot            (two runs with the same seed + a reproducibility check)
//   node tests/e2e/playtest-bot.mjs --runs 1 --seed 7
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadPlaywright, previewServer, boot, dismissCards, pause, provenance, hashJSON } from '../sim/harness.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const RUNS = +arg('--runs', 2);
const SEED = +arg('--seed', 1105);
const OUT = path.join(ROOT, 'docs/playcraft-evidence/playtest');
mkdirSync(OUT, { recursive: true });

const pw = loadPlaywright();
const srv = await previewServer();
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const DT = 1 / 30;

async function playOnce(runNo) {
  const t0 = Date.now();
  const timeline = [];
  const checks = [];
  const shots = [];
  const check = (name, ok, detail = '') => {
    checks.push({ name, ok: !!ok, detail });
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  };
  const { ctx, page, errors, bootMs } = await boot(browser, pw, srv.url, { seed: SEED });
  const st = () => page.evaluate(() => {
    const g = window.__game, d = g.store.data;
    return { t: +g.renderT.toFixed(2), x: +g.boat.x.toFixed(1), z: +g.boat.z.toFixed(1), heading: g.boat.heading, camYaw: g.camYaw, speed: +g.boat.speed.toFixed(2),
      docked: g.boat.docked, gold: d.gold, quest: d.quest, hull: +d.hull.toFixed(1), cargo: d.cargo.map((c) => `${c.id}×${c.n}`), vault: d.vault.map((c) => `${c.id}×${c.n}`),
      upgrades: [...d.upgrades], hauls: d.hauls, acts: [...document.querySelectorAll('.actions .act')].map((b) => b.textContent.trim()), panel: g.ui.panelOpen };
  });
  const event = async (what, extra = {}) => {
    const s = await st();
    timeline.push({ event: what, game_t: s.t, wall_ms: Date.now() - t0, x: s.x, z: s.z, speed: s.speed, gold: s.gold, docked: s.docked, ...extra });
    return s;
  };
  // A tap = reseed + the DOM event, in ONE page task: nothing (not even a stray real-time timer) can draw a random
  // number between them, so what the game rolls on the tap (the winch's needle and zone, the loot) is the same every run.
  let taps = 0;
  const tap = async (target, type = 'click') => {
    const ok = await page.evaluate(([sel, type, n]) => {
      const el = typeof sel === 'string' ? [...document.querySelectorAll(sel.split('::text=')[0])].find((e) => !sel.includes('::text=') || e.textContent.includes(sel.split('::text=')[1])) : sel;
      if (!el) return false;
      if (window.__sim.manual) window.__sim.checkpoint(1000 + n);
      if (type === 'pointerdown') el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      else el.click();
      return true;
    }, [target, type, taps++]);
    await page.waitForTimeout(0);
    return ok;
  };
  const step = (sec) => page.evaluate(([n, dt]) => { window.__sim.render = false; window.__sim.step(n, dt); }, [Math.max(1, Math.round(sec / DT)), DT]);
  const shot = async (name) => {
    await page.evaluate((dt) => { window.__sim.render = true; window.__sim.step(1, dt); window.__sim.render = false; }, DT);
    const file = `bot_run${runNo}_${name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    shots.push(file);
  };
  const sailBox = () => page.evaluate(() => {
    const g = window.__game;
    const box = { minY: Infinity, maxY: -Infinity };
    g.ship.group.updateMatrixWorld(true);
    for (const m of g.ship.sails) {
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
      box.minY = Math.min(box.minY, b.min.y);
      box.maxY = Math.max(box.maxY, b.max.y);
    }
    const named = [];
    g.ship.group.traverse((o) => o.name.startsWith('upgrade_') && named.push(o.name));
    return { sails: g.ship.sails.length, sail_top: +box.maxY.toFixed(2), sail_height: +(box.maxY - box.minY).toFixed(2), parts: named };
  });

  if (process.env.SIM_TRACE) await page.evaluate(() => (window.__sim.trace = true));
  // ── 1. voyage started
  let s = await event('title → SET SAIL → welcome dismissed; harness takes the clock', { boot_ms: bootMs });
  check('voyage starts docked at Driftholm on the first-voyage quest', s.docked && s.quest === 'leave_dock', `quest=${s.quest}, gold=${s.gold}`);
  const before = await sailBox();
  await shot('1_start');

  // ── 2. steer with the wheel toward the beacon
  const wheel = await page.$('.stick');
  const wb = await wheel.boundingBox();
  const cx = wb.x + wb.width / 2, cy = wb.y + wb.height / 2, R = 50;
  // the Sunken Tower (data/world.ts sv_stump), the Captain's Log's first salvage beacon
  const site = await page.evaluate(async () => {
    const t = window.__game.salvage.nearestReady(92, 150);
    return { x: t.x, z: t.z, name: t.name };
  });
  const pier = await page.evaluate(() => ({ x: window.__game.env.pierTip.x, z: window.__game.env.pierTip.z }));
  const speeds = [];
  // Real mouse input reaches the page asynchronously (Chromium aligns pointer moves to its own frames). Before the
  // next game step, wait until the game has registered it, so a wheel move always lands on the same frame.
  const settleWheel = async (want) => {
    for (let k = 0; k < 200; k++) {
      const j = await page.evaluate(() => ({ ...window.__game.ui.joy }));
      if (want === 'up' ? !j.active : j.active && (want === 'down' || (Math.abs(j.x - want.x) < 0.02 && Math.abs(j.y - want.y) < 0.02))) return true;
      await page.waitForTimeout(5);
    }
    throw new Error(`wheel input not registered (${JSON.stringify(want)})`);
  };
  async function sailTo(points, { until, maxS = 240, label }) {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await settleWheel('down');
    let wp = 0, t = 0, stuck = 0, detour = 0, dir = 1, cast = false;
    while (t < maxS) {
      s = await st();
      if (!cast && !s.docked) {
        cast = true;
        await event('cast off (first drag on the wheel)');
      }
      if (await until(s)) break;
      const p = points[Math.min(wp, points.length - 1)];
      const dist = Math.hypot(p.x - s.x, p.z - s.z);
      if (wp < points.length - 1 && dist < (p.r ?? 18)) {
        wp++;
        continue;
      }
      let h = Math.atan2(p.x - s.x, p.z - s.z);
      if (detour > 0) {
        h += dir * 1.1;
        detour -= 0.25;
      }
      const mag = wp === points.length - 1 && dist < 45 ? 0.45 : 1;
      const jx = -Math.sin(h - s.camYaw) * mag, jy = Math.cos(h - s.camYaw) * mag;
      await page.mouse.move(cx + jx * R, cy - jy * R);
      await settleWheel({ x: jx, y: jy });
      await step(0.25);
      t += 0.25;
      speeds.push(s.speed);
      if (s.speed < 1 && t > 4) stuck += 0.25;
      else stuck = 0;
      if (stuck > 2) {
        detour = 3;
        dir = -dir;
        stuck = 0;
        timeline.push({ event: `${label}: stalled, steering round`, game_t: s.t, x: s.x, z: s.z });
      }
    }
    await page.mouse.up();
    await settleWheel('up');
    return t < maxS;
  }
  const reachedSite = await sailTo([{ x: 6, z: 130 }, { x: 50, z: 128 }, { x: site.x - 18, z: site.z - 14, r: 6 }], {
    label: 'to the beacon', maxS: 240,
    until: async (s) => s.acts.some((a) => /SALVAGE/.test(a)),
  });
  const outboundMax = Math.max(...speeds);
  s = await event('beacon in reach: SALVAGE offered', { acts: s.acts });
  check('steered from the dock to the Sunken Tower beacon with the wheel', reachedSite, `game ${s.t}s, at (${s.x}, ${s.z})`);
  // let her slow down, then drop the hook
  for (let i = 0; i < 40 && (await st()).speed > 2.2; i++) await step(0.25);
  await shot('2_beacon');

  // ── 3. salvage: the winch mini-game
  await tap('.actions .act::text=SALVAGE');
  await page.waitForSelector('.winch-wrap', { timeout: 10000 }).catch(() => {});
  const winchOpen = !!(await page.$('.winch-wrap'));
  check('SALVAGE opens the winch', winchOpen);
  await event('winch opened');
  let pulls = 0, winchHits = 0;
  for (let f = 0; f < 3000 && (await page.$('.winch-wrap')); f++) {
    const w = await page.evaluate(() => {
      const z = document.querySelector('.w-zone'), n = document.querySelector('.w-needle');
      return z && n ? { zl: parseFloat(z.style.left), zw: parseFloat(z.style.width), nl: parseFloat(n.style.left) } : null;
    });
    if (w && w.nl >= w.zl + w.zw * 0.2 && w.nl <= w.zl + w.zw * 0.8) {
      await tap('.w-reel', 'pointerdown');
      pulls++;
      winchHits = await page.evaluate(() => document.querySelectorAll('.w-pips i.hit').length);
      await pause(page, 650); // the reel locks for 550 ms between pulls (virtual time: the needle keeps moving, as in the game)
    } else await page.evaluate((dt) => window.__sim.step(1, dt), DT);
  }
  s = await st();
  const haul = s.cargo;
  const reeled = await page.evaluate(() => window.__game.store.data.hauls);
  await event('winch done; haul in the hold', { cargo: haul, pulls, winch_hits: winchHits, hauls: reeled });
  if (process.env.SIM_TRACE) writeFileSync(path.join(OUT, `trace_run${runNo}.json`), JSON.stringify({ frames: await page.evaluate(() => window.__sim.frames), calls: await page.evaluate(() => window.__sim.traceDump()) }, null, 1));
  check('the winch was played to the end and the haul came aboard', s.hauls === 1 && haul.length > 0, `${winchHits}/${pulls} pulls in the green; cargo ${haul.join(', ')}`);
  await dismissCards(page, 3);

  // ── 4. back to the harbour
  const reachedPier = await sailTo([{ x: 50, z: 128 }, { x: 6, z: 128 }, { x: pier.x, z: pier.z, r: 6 }], {
    label: 'home', maxS: 240, until: async (s) => s.acts.some((a) => /^⚓ DOCK$/.test(a)),
  });
  for (let i = 0; i < 20 && (await st()).speed > 2; i++) await step(0.25);
  s = await event('DOCK offered at the Driftholm pier');
  check('sailed back to the Driftholm pier', reachedPier, `game ${s.t}s`);
  await tap('.actions .act::text=DOCK');
  for (let i = 0; i < 30 && !(await st()).docked; i++) {
    await pause(page, 150);
    await step(0.1);
  }
  await pause(page, 800);
  s = await event('docked; hold unloaded to the vault', { vault: s.vault });
  check('docking unloads the hold into the vault', s.docked && s.cargo.length === 0 && (await st()).vault.length > 0, `vault ${(await st()).vault.join(', ')}`);
  await dismissCards(page, 2);

  // ── 5. sell the haul to Pip
  if (!(await page.$('.npc[data-go="appraiser"]'))) await tap('.actions .act::text=HARBOR');
  await page.waitForSelector('.npc[data-go="appraiser"]', { timeout: 5000 }).catch(() => {});
  await tap('.npc[data-go="appraiser"]');
  await pause(page, 300);
  const gold0 = (await st()).gold;
  for (let i = 0; i < 30; i++) {
    const b = (await page.$('.row .sa')) ?? (await page.$('.row .s1'));
    if (!b) break;
    await tap(b);
    await pause(page, 120);
  }
  s = await event('sold the haul to Pip');
  check('selling turns the haul into gold', s.gold > gold0 && s.vault.length === 0, `${gold0}g → ${s.gold}g`);

  // ── 6. install an upgrade from Marlo
  await tap('button.btn.ghost::text=Back to');
  await pause(page, 250);
  await tap('.npc[data-go="shipwright"]');
  await pause(page, 300);
  const offer = await page.evaluate(() => [...document.querySelectorAll('.row')].filter((r) => r.querySelector('button.btn:not([disabled])') && /Install/.test(r.textContent)).map((r) => r.querySelector('.r-title').textContent.trim()));
  const want = offer.find((t) => /Canvas Mainsail/.test(t)) ?? offer[0];
  check('the shipwright offers an affordable upgrade', !!want, `affordable: ${offer.join(', ') || 'none'}`);
  if (want) {
    const btn = await page.evaluateHandle((w) => [...document.querySelectorAll('.row')].find((r) => r.querySelector('.r-title')?.textContent.trim() === w)?.querySelector('button.btn'), want);
    await tap(btn);
  }
  await pause(page, 400);
  s = await st();
  const bought = s.upgrades[0];
  await event('upgrade installed', { upgrade: bought });
  check('the upgrade is installed through the shipwright', !!bought, `${want} → ${bought}; gold ${s.gold}`);
  await dismissCards(page, 3);
  await page.keyboard.press('Escape');
  await pause(page, 300);
  const after = await sailBox();
  await shot('3_upgraded');
  check('the upgrade is visible on the boat', JSON.stringify(after) !== JSON.stringify(before),
    `sail ${before.sail_height} m → ${after.sail_height} m tall (top ${before.sail_top} → ${after.sail_top}); parts ${after.parts.join(', ') || 'none'}`);

  // ── 7. persistence: wait for the debounced save, reload, load the same save
  await pause(page, 1200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tidebreakers.save.v1') || 'null'));
  check('the save in localStorage has the upgrade', !!saved && saved.upgrades.includes(bought), `saved upgrades: ${saved?.upgrades}`);
  await page.reload();
  await page.waitForFunction(() => window.__game?.ship && window.__game.renderer?.__simWrapped, null, { timeout: 180000 });
  await page.waitForSelector('.title-screen .act', { timeout: 180000 });
  const titleBtn = await page.$eval('.title-screen .act', (b) => b.textContent.trim());
  await page.click('.title-screen .act');
  await dismissCards(page, 3);
  await page.evaluate((sd) => window.__sim.takeOver(sd), SEED + 1);
  s = await st();
  const reloaded = await sailBox();
  check('after a reload the save loads with the upgrade installed', s.upgrades.includes(bought) && s.gold === saved?.gold, `title button "${titleBtn}"; upgrades ${s.upgrades}; gold ${s.gold}`);
  // sails billow with the wind, so compare sizes within 5 % (the upgrade made them ~30 % taller)
  check('after a reload the boat is still rebuilt with it', Math.abs(reloaded.sail_height - after.sail_height) < after.sail_height * 0.05 && reloaded.sail_height > before.sail_height * 1.15 && JSON.stringify(reloaded.parts) === JSON.stringify(after.parts),
    `sail ${reloaded.sail_height} m after reload (${after.sail_height} m after install, ${before.sail_height} m stock)`);
  await shot('4_reloaded');
  // measured effect: sail out the same way and compare top speed with the outbound leg
  speeds.length = 0;
  await sailTo([{ x: 6, z: 130 }, { x: 50, z: 128 }, { x: site.x - 18, z: site.z - 14, r: 6 }], { label: 'after the upgrade', maxS: 40, until: async () => false });
  const afterMax = Math.max(...speeds);
  const stat = await page.evaluate(() => window.__game.store.stats.speed);
  await event('sailed the outbound leg again', { top_speed_before: outboundMax, top_speed_after: afterMax });
  check('the upgrade changes how the boat sails', bought !== 'sail_canvas' || afterMax > outboundMax * 1.15, `top speed on the same leg ${outboundMax.toFixed(2)} → ${afterMax.toFixed(2)} (sail speed stat now ${stat.toFixed(2)})`);
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await ctx.close();
  // reproducibility fingerprint: what happened, not how long the machine took
  const fingerprint = hashJSON({ timeline: timeline.map(({ wall_ms, boot_ms, ...e }) => e), haul, bought, gold: s.gold });
  return { run: runNo, seed: SEED, wall_s: +((Date.now() - t0) / 1000).toFixed(1), checks, passed: checks.every((c) => c.ok), timeline, haul, bought, final_gold: s.gold, screenshots: shots, fingerprint, errors };
}

const runs = [];
for (let i = 1; i <= RUNS; i++) {
  console.log(`playtest bot run ${i} (seed ${SEED})`);
  runs.push(await playOnce(i));
}
const reproducible = runs.length > 1 ? runs.every((r) => r.fingerprint === runs[0].fingerprint) : null;
if (runs.length > 1) console.log(reproducible ? `reproducible: ${RUNS} runs, identical fingerprint ${runs[0].fingerprint}` : `NOT reproducible: ${runs.map((r) => r.fingerprint).join(' vs ')}`);
const doc = {
  ...provenance({ server: srv.kind, seed: SEED }),
  evidence_class: 'runtime-observed',
  what: 'The production build (dist/) played end to end through its real UI by a scripted bot: wheel drags, the winch mini-game, DOCK, the appraiser and shipwright panels, a page reload. Game state read from window.__game.',
  determinism: 'seeded Math.random, virtual clock, fixed 1/30 s frames (tests/sim/harness.mjs); UI waits that the game times with setTimeout use real time',
  reproducible, runs,
};
writeFileSync(path.join(OUT, 'playtest_bot.json'), JSON.stringify(doc, null, 2) + '\n');
await browser.close();
await srv.close();
process.exit(runs.every((r) => r.passed) && reproducible !== false ? 0 : 1);
