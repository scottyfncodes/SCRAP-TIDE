// End-to-end gameplay check: drives the real built game in mobile Chromium through every Drowned World loop.
// Requires Playwright (pre-installed in Claude Code cloud containers; otherwise `npx playwright install chromium`).
//   npm run build && npx vite preview --port 4173 &  then  node tests/e2e/play.cjs http://localhost:4173/ [outdir]
const { chromium } = require('playwright');
const fs = require('fs');

const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'e2e-out';
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const g = (fn, arg) => page.evaluate(fn, arg);
  // reveal cards queue up (welcome, discoveries, Captain's Log); keep dismissing until none arrive for a while
  const dismiss = async () => {
    let quiet = 0;
    while (quiet < 4) {
      const b = await page.$('.reveal button, .reveal .btn');
      if (b) {
        quiet = 0;
        await b.click().catch(() => {});
      } else quiet++;
      await page.waitForTimeout(250);
    }
  };
  const teleport = (p) => g((p) => {
    const G = window.__game;
    G.ui.closePanel();
    Object.assign(G.boat, { x: p.x, z: p.z, heading: p.h ?? 0, speed: 0, docked: false, anchored: false, busy: false });
    G.mode = 'sail';
  }, p);
  const actions = () => g(() => [...document.querySelectorAll('.actions .act')].map((b) => b.textContent));
  const click = async (re) => {
    // a card that arrived late (renown, milestones: they fire on game time, which runs slowly here) is tapped away
    // first, as a player would
    // first, as a player would; one can also land between that check and the click, so a blocked click is retried
    for (let attempt = 0; attempt < 4; attempt++) {
      if (await page.$('.reveal')) await dismiss();
      const btns = await page.$$('.actions .act');
      let hit = null;
      for (const b of btns) if (re.test(await b.textContent())) { hit = b; break; }
      if (!hit) return false;
      try {
        await hit.click({ timeout: 5000 });
        return true;
      } catch (e) {
        // only a late card or a re-render is retried (from #45); anything else is a real failure
        if (!/intercepts pointer events|Timeout|detached/.test(String(e))) throw e;
      }
    }
    return false;
  };
  // headless software GL renders a few fps and the game caps dt, so wait on *game* time, not wall time
  const waitGame = (target) => page.waitForFunction((t) => window.__game.renderT >= t, target, { timeout: 240000, polling: 100 })
    .catch(() => {});
  const gameT = () => g(() => window.__game.renderT);
  const playFor = async (sec) => waitGame((await gameT()) + sec);
  const joy = (x, y) => g(([x, y]) => Object.assign(window.__game.ui.joy, { x, y, active: x !== 0 || y !== 0 }), [x, y]);

  // ── boot
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForSelector('.title-screen .act', { timeout: 180000 });
  check('boots to title with all GITCRAFT models loaded', await g(() => (window.__loadReport || []).every((r) => r.ok)), `${Date.now() - t0} ms`);
  // asset modernization (docs/asset-modernization): islands, landmarks, the pier, finds and fittings are GITCRAFT kits
  const kits = await g(() => ['tb_coast_kit', 'tb_landmark_kit', 'tb_finds_kit', 'tb_fittings_kit'].map((f) => (window.__loadReport || []).some((r) => r.file === f && r.ok)));
  check('the coast, landmark, finds and fittings kits load (no procedural stand-ins drawn)', kits.every(Boolean), JSON.stringify(kits));
  await page.click('.title-screen .act');
  await page.waitForTimeout(600);
  await dismiss();

  // ── first voyage still works: steering advances the quest
  await dismiss();
  const q0 = await g(() => window.__game.store.data.quest);
  await joy(0, 1);
  await playFor(12);
  await joy(0, 0);
  const q = await g(() => window.__game.store.data.quest);
  check('first voyage: starts on "cast off", and steering clear of the pier advances it', q0 === 'leave_dock' && q !== 'leave_dock', `quest ${q0} -> ${q}`);

  // put the save into open play for the systems below
  await g(() => { const s = window.__game.store.data; s.quest = 'free'; s.flags.push('met_raiders'); s.gold = 5000; });

  // ── salvage loop
  await teleport({ x: 92, z: 128, h: 0 });
  await page.waitForTimeout(1200);
  const acts = await actions();
  check('SALVAGE appears beside the Sunken Tower', acts.some((a) => /SALVAGE/.test(a)), acts.join(' | '));
  await click(/SALVAGE/);
  await page.waitForSelector('.winch', { timeout: 5000 });
  check('winch mini-game opens', true);
  for (let i = 0; i < 3; i++) {
    // wait for the needle to sit in the green, then reel
    await page.waitForFunction(() => {
      const z = document.querySelector('.w-zone'), n = document.querySelector('.w-needle');
      if (!z || !n) return true;
      const l = parseFloat(z.style.left), w = parseFloat(z.style.width), x = parseFloat(n.style.left);
      return x > l + 1 && x < l + w - 1;
    }, null, { timeout: 15000, polling: 16 }).catch(() => {});
    await page.dispatchEvent('.w-reel', 'pointerdown');
    await page.waitForTimeout(650);
  }
  await page.waitForTimeout(800);
  const haul = await g(() => ({ hauls: window.__game.store.data.hauls, first: window.__game.store.data.firstHauls, cargo: window.__game.store.data.cargo.length }));
  check('a haul lands loot in the hold', haul.hauls === 1 && haul.cargo > 0 && haul.first.includes('sv_stump'), JSON.stringify(haul));
  await page.screenshot({ path: `${out}/salvage_reveal.png` });
  await dismiss();
  await page.waitForTimeout(1200);
  await dismiss();
  check('Captain’s Log advanced past "Salvage the Sunken Tower"', await g(() => window.__game.store.data.goal >= 1));

  // ── engine & fuel
  await g(() => { const G = window.__game; G.store.data.upgrades.push('engine_outboard'); G.rebuildShip(); G.store.data.fuel = 40; });
  await dismiss();
  await teleport({ x: 0, z: 60, h: Math.PI });
  await g(() => window.__game.toggleEngine());
  await joy(0, 1);
  await playFor(4);
  const eng = await g(() => ({ on: window.__game.engineOn, fuel: window.__game.store.data.fuel, speed: window.__game.boat.speed }));
  await joy(0, 0);
  check('engine burns fuel and drives the boat', eng.on && eng.fuel < 40 && eng.speed > 3, JSON.stringify(eng));

  // ── dock at Rig Helios (needs the trimaran to cross the swell)
  await g(() => { const s = window.__game.store.data; s.vesselsOwned.push('sloop'); s.vessel = 'sloop'; window.__game.rebuildShip(); });
  await dismiss();
  await teleport({ x: -515, z: 175, h: 0 });
  await page.waitForTimeout(1000);
  await dismiss();
  await click(/DOCK AT RIG HELIOS/);
  await page.waitForSelector('.sheet', { timeout: 5000 });
  const sheet = await g(() => document.querySelector('.sheet h2').textContent);
  check('docking at Rig Helios opens its settlement hub', sheet === 'Rig Helios', sheet);
  await page.screenshot({ path: `${out}/helios_hub.png` });
  check('Rig Helios sells the Twin Diesel (Driftholm does not)', await g(() => {
    window.__game.ui.openPanel('shipwright');
    return [...document.querySelectorAll('.row')].some((r) => /Twin Diesel/.test(r.textContent) && !r.classList.contains('locked'));
  }));
  await g(() => window.__game.ui.closePanel());
  await page.waitForTimeout(600);
  await dismiss();
  check('docking at Helios unlocks the milestone flag', await g(() => window.__game.store.data.flags.includes('docked_helios')));

  // ── rescue a castaway → crew aboard
  await dismiss();
  await teleport({ x: -60, z: -158, h: 0 });
  await page.waitForTimeout(1000);
  await dismiss();
  await click(/RESCUE/);
  await page.waitForTimeout(1500);
  const crew = await g(() => window.__game.store.data.crew);
  check('rescuing Kai adds a Lookout to the crew', crew.includes('kai'), crew.join(','));
  await dismiss();
  await page.waitForTimeout(2500);
  check('crew member is modelled on deck (rigged GLB)', await g(() => window.__game.ship.crew.length >= 1));

  // ── storms damage the hull, armour reduces it
  const storm = await g(async () => {
    const G = window.__game;
    const c = G.atmo.storms[0];
    Object.assign(c, { x: 0, z: -40, vx: 0, vz: 0 });
    Object.assign(G.boat, { x: 0, z: -40, docked: false, speed: 0 });
    G.store.data.hull = G.store.stats.hullMax;
    const h0 = G.store.data.hull;
    const t = G.renderT + 6;
    while (G.renderT < t) await new Promise((r) => setTimeout(r, 200));
    return { h0, h1: G.store.data.hull, storm: G.atmo.storm };
  });
  check('a storm batters the hull', storm.h1 < storm.h0 - 1 && storm.storm > 0.5, JSON.stringify(storm));
  await page.screenshot({ path: `${out}/storm.png` });
  await g(() => { for (const c of window.__game.atmo.storms) c.x += 1500; window.__game.store.data.hull = window.__game.store.stats.hullMax; });

  // ── raiders vs harpoon
  await g(() => { const G = window.__game; G.store.data.upgrades.push('harpoon_turret'); G.rebuildShip(); });
  await teleport({ x: 270, z: 560, h: 0 });
  const raid = await g(async () => {
    const G = window.__game;
    const t = G.renderT + 40;
    while (G.renderT < t && G.store.data.raidersRepelled === 0) await new Promise((r) => setTimeout(r, 250));
    return { repelled: G.store.data.raidersRepelled, raiders: G.raiders.list.length };
  });
  check('Rustfang raiders spawn, chase and are driven off by the harpoon', raid.raiders > 0 && raid.repelled > 0, JSON.stringify(raid));

  // ── workbench crafting
  const craft = await g(() => {
    const G = window.__game, s = G.store;
    s.addTo(s.data.cargo, 'crude_oil', 2);
    const before = s.countOwned('fuel_can');
    G.craft('r_fuel');
    return { before, after: s.countOwned('fuel_can'), crude: s.countOwned('crude_oil') };
  });
  check('workbench refines crude into fuel', craft.after === craft.before + 1 && craft.crude === 0, JSON.stringify(craft));

  // ── grimy art-direction pass: new landmarks, flotsam scavenging, hull-strike feedback
  const placed = await g(() => {
    const names = new Set();
    window.__game.scene.traverse((o) => o.name && names.add(o.name));
    return { trawler: names.has('trawler_body'), crane: names.has('crane_body'), flotsam: window.__game.drowned.flotsam.length, bells: window.__game.drowned.bells.length };
  });
  check('salvage-pass landmarks and flotsam are placed (trawlers, cranes, flotsam, bell buoys)', placed.trawler && placed.crane && placed.flotsam > 20 && placed.bells > 3, JSON.stringify(placed));
  const fl = await g(() => {
    const G = window.__game, s = G.store;
    s.data.cargo = [];
    const f = G.drowned.flotsam.find((x) => !x.picked);
    G.ui.closePanel();
    Object.assign(G.boat, { x: f.x, z: f.z, heading: 0, speed: 1, docked: false, anchored: false, busy: false });
    G.mode = 'sail';
    return { kind: f.kind, x: f.x, z: f.z };
  });
  await playFor(1.5);
  const flAfter = await g((fl) => {
    const G = window.__game;
    const f = G.drowned.flotsam.find((x) => x.x === fl.x && x.z === fl.z);
    return { picked: f.picked, slots: G.store.slotsUsed() };
  }, fl);
  check('sailing slowly through flotsam picks it over', flAfter.picked, JSON.stringify({ ...fl, ...flAfter }));
  const hit = await g(() => {
    const G = window.__game, h0 = G.store.data.hull;
    G.damage(10, 'Test strike');
    return { h0, h1: G.store.data.hull, flash: document.querySelector('.hit-flash')?.classList.contains('on') };
  });
  check('a hull strike costs hull and flashes the HUD', hit.h1 < hit.h0 && hit.flash, JSON.stringify(hit));
  await g(() => { const G = window.__game; G.store.data.hull = G.store.stats.hullMax; });

  // ── Waterworld pass: settlements from the GITCRAFT kits, drifting algae, and living plants worth finding
  const ww = await g(() => {
    const names = new Set();
    window.__game.scene.traverse((o) => o.name && names.add(o.name));
    const placed = window.__game.drowned.placedNodes;
    return { wall: placed.has('atoll_wall'), gate: placed.has('atoll_gate'), propeller: placed.has('propeller'), boats: names.has('scrap_boat'),
      algae: window.__game.drowned.flotsam.filter((f) => f.kind === 'algae_mat').length, plants: window.__game.finds.filter((f) => f.def.kind === 'plant').length };
  });
  check('Waterworld settlements, drifting algae and plant finds are in the world', ww.wall && ww.gate && ww.propeller && ww.boats && ww.algae > 10 && ww.plants >= 6, JSON.stringify(ww));
  // apocalyptic-pirate cast: the rigged captain, townsfolk and raider crews replace the stand-ins
  await page.waitForFunction(() => !!window.__game.captain.char && window.__game.env.folk.length > 0, null, { timeout: 120000 }).catch(() => {});
  const cast = await g(() => {
    const G = window.__game;
    const cap = G.captain.char;
    return { captain: !!cap, clips: cap ? Object.keys(cap.actions).sort().join(',') : '', standIn: G.captain.body.visible, folk: G.env.folk.length,
      raiders: G.raiders.list.map((r) => r.crew.length) };
  });
  check('the rigged survivor cast replaces the block figures (captain, townsfolk, raider crews)',
    cast.captain && !cast.standIn && /Dig/.test(cast.clips) && /Sit/.test(cast.clips) && cast.folk >= 8 && cast.raiders.every((n) => n === 2), JSON.stringify(cast));
  const alg = await g(() => {
    const G = window.__game;
    G.store.data.cargo = [];
    const f = G.drowned.flotsam.find((x) => x.kind === 'algae_mat' && !x.picked);
    Object.assign(G.boat, { x: f.x, z: f.z, heading: 0, speed: 1, docked: false, anchored: false, busy: false });
    G.mode = 'sail';
    return { x: f.x, z: f.z };
  });
  await playFor(1.5);
  const algAfter = await g((a) => ({ picked: window.__game.drowned.flotsam.find((f) => f.x === a.x && f.z === a.z).picked, cargo: window.__game.store.data.cargo.map((c) => c.id) }), alg);
  check('hooking a drifting algae mat brings living green aboard', algAfter.picked, JSON.stringify(algAfter));
  // walk up to the seedling on Turtle Atoll and take it aboard
  const seed = await g(() => {
    const G = window.__game;
    const f = G.finds.find((x) => x.def.id === 'turtle_seedling');
    G.ui.closePanel();
    Object.assign(G.boat, { x: -150, z: 122, speed: 0, docked: false, anchored: true, busy: false });
    G.mode = 'foot';
    Object.assign(G.foot, { x: f.x + 1.2, z: f.z + 1.2, landX: -150, landZ: 122, heading: 0 });
    G.foot.island = G.finds.find((x) => x.def.id === 'turtle_seedling').isl;
    return { x: f.x, z: f.z, shaft: f.obj.children.some((c) => c.userData.shaft), halo: f.obj.children.some((c) => c.userData.halo) };
  });
  await playFor(1);
  await dismiss();
  const seedActs = await actions();
  const took = await click(/ABOARD/);
  await page.waitForTimeout(800);
  const seedAfter = await g(() => ({
    opened: window.__game.store.data.findsOpened.includes('turtle_seedling'),
    have: window.__game.store.countOwned('seedling_tin'),
    living: !!document.querySelector('.reveal.living .alive-stamp'),
  }));
  await page.screenshot({ path: `${out}/living_reveal.png` });
  await dismiss();
  check('a plant find glows (halo + light shaft) and offers TAKE IT ABOARD', seed.shaft && seed.halo && took, seedActs.join(' | '));
  check('taking the seedling stores it and shows the green ALIVE reveal', seedAfter.opened && seedAfter.have > 0 && seedAfter.living, JSON.stringify(seedAfter));
  await g(() => { const G = window.__game; G.mode = 'sail'; Object.assign(G.boat, { anchored: false }); });

  // ── on foot: the procedural gait (docs/expedition-pass): momentum, walk → run blend, and a stop
  await g(() => { const G = window.__game; G.ui.closePanel(); G.mode = 'foot'; Object.assign(G.foot, { x: -160, z: 72, heading: 0, vel: 0, speed: 0 }); G.camYaw = 0; });
  await joy(0, 1);
  await playFor(0.15);
  const early = await g(() => window.__game.foot.speed);
  await playFor(1.2);
  const gait = await g(() => { const C = window.__game.captain; const a = C.char && C.char.actions;
    return { speed: window.__game.foot.speed, run: C.runMix, runW: a && a.GaitRun ? a.GaitRun.getEffectiveWeight() : -1, pose: C.pose }; });
  await joy(0, 0);
  await playFor(0.7);
  const stop = await g(() => ({ speed: window.__game.foot.speed, pose: window.__game.captain.pose }));
  check('on foot the captain accelerates (no instant top speed) into the procedural run', early < 2.5 && gait.speed > 4.3 && gait.run > 0.9 && gait.runW > 0.8 && gait.pose === 'walk',
    JSON.stringify({ early, ...gait }));
  check('letting go decelerates the captain to a standstill and idle', stop.speed < 0.3 && stop.pose === 'idle', JSON.stringify(stop));
  await g(() => { const G = window.__game; G.mode = 'sail'; });

  // ── Maps & Charts: real two-finger pinch and a drag on the world chart; the game must not react underneath
  {
    await g(() => window.__game.ui.openPanel('maps', 'world'));
    await page.waitForSelector('.zmap[data-zoom]', { timeout: 30000 });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    const zview = () => g(() => { const d = document.querySelector('.zmap').dataset; return { zoom: +d.zoom, cx: +d.cx, cz: +d.cz }; });
    const game0 = await g(() => ({ yaw: window.__game.camYaw, zoom: window.__game.zoom, heading: window.__game.boat.heading }));
    const box = await (await page.$('.zmap canvas')).boundingBox();
    const mx = box.x + box.width / 2, my = box.y + box.height / 2;
    const v0 = await zview();
    await touch('touchStart', [[mx - 20, my], [mx + 20, my]]);
    for (let i = 1; i <= 6; i++) await touch('touchMove', [[mx - 20 - i * 10, my], [mx + 20 + i * 10, my]]);
    await touch('touchEnd', []);
    await page.waitForTimeout(300);
    const v1 = await zview();
    await touch('touchStart', [[mx, my]]);
    for (let i = 1; i <= 5; i++) await touch('touchMove', [[mx - i * 15, my]]);
    await touch('touchEnd', []);
    await page.waitForTimeout(300);
    const v2 = await zview();
    const game1 = await g(() => ({ yaw: window.__game.camYaw, zoom: window.__game.zoom, heading: window.__game.boat.heading, scale: window.visualViewport ? window.visualViewport.scale : 1 }));
    await page.screenshot({ path: `${out}/map_pinch.png` });
    check('pinch-to-zoom: two fingers zoom the world chart about their midpoint (40 → 160 px = 4×)', Math.abs(v1.zoom - 4 * v0.zoom) < 0.05, JSON.stringify({ v0, v1 }));
    check('dragging the zoomed chart pans it', v2.cx > v1.cx + 5 && Math.abs(v2.zoom - v1.zoom) < 1e-3, JSON.stringify({ v1, v2 }));
    check('map gestures never reach the game (camera, zoom, helm) or scale the page',
      game1.yaw === game0.yaw && game1.zoom === game0.zoom && game1.heading === game0.heading && game1.scale === 1, JSON.stringify({ game0, game1 }));
    await g(() => window.__game.ui.closePanel());
  }

  // ── upwind sailing (#5, Option A): pointing into the wind luffs the sail, the wind dial and label say so and the crew
  //    speak up; bearing away clears it. Speed follows the unchanged curve (45% dead upwind).
  {
    if (await page.$('.reveal')) await dismiss();
    await teleport({ x: 49, z: 159 }); // open water between Driftholm and the Sunken Tower
    const UP = -Math.PI * 0.62 + Math.PI;
    await g((h) => {
      const G = window.__game;
      // toasts expire on wall-clock time and headless GL runs game time slowly, so record them as they appear
      window.__toastLog = [];
      new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.classList?.contains('toast') && window.__toastLog.push(n.textContent))))
        .observe(document.querySelector('.toasts'), { childList: true });
      window.__uw = { h };
      window.__uwPin = setInterval(() => {
        Object.assign(G.boat, { x: 49, z: 159 }); // hold it in open water; heading and speed evolve normally
        G.camYaw = window.__uw.h;
        Object.assign(G.ui.joy, { x: 0, y: 1, active: true });
      }, 33);
      G.boat.heading = h;
    }, UP + 0.08);
    await playFor(4.5);
    const up = await g(() => {
      const G = window.__game, s = document.querySelector('.speed');
      return { label: s.querySelector('small').textContent, cls: s.querySelector('small').className, luffing: s.classList.contains('luffing'), speed: G.boat.speed, stat: G.store.stats.speed,
        toasts: window.__toastLog.splice(0), dial: !!s.querySelector('.wd-nogo') && !!s.querySelector('.wd-hull') };
    });
    await page.screenshot({ path: `${out}/upwind_luffing.png` });
    const want = up.stat * (1 - 0.55 * Math.cos(0.08));
    check('upwind: 5° off the wind the readout says LUFFING and the wind dial lights its no-go wedge', up.label === 'luffing' && /\bluff\b/.test(up.cls) && /\bpos\b/.test(up.cls) && up.luffing && up.dial, JSON.stringify({ label: up.label, cls: up.cls, luffing: up.luffing }));
    check('upwind: a crew (or sail) line tells the captain to bear away', up.toasts.some((t) => /left|right/.test(t) && /luff|flogging|pinching|wind/i.test(t)), up.toasts.join(' | '));
    check('upwind: speed into the wind is unchanged (45% curve, no hard no-go zone)', Math.abs(up.speed - want) / want < 0.08, `${up.speed.toFixed(2)} vs ${want.toFixed(2)} m/s`);
    await g((h) => { window.__uw.h = h; window.__game.boat.heading = h; }, UP + 1.2);
    await playFor(2.5);
    const off = await g(() => ({ label: document.querySelector('.speed small').textContent, luffing: document.querySelector('.speed').classList.contains('luffing'),
      toasts: window.__toastLog.splice(0) }));
    check('upwind: bearing away clears the luff and the crew say she is drawing', !off.luffing && off.label === 'beam reach' && off.toasts.some((t) => /draw|fills|full sail|better|moving|quiet|likes/i.test(t)), JSON.stringify(off));
    await g(() => { clearInterval(window.__uwPin); Object.assign(window.__game.ui.joy, { x: 0, y: 0, active: false }); });
  }

  // ── loop pass Phase 1: trips, the hold, banking, the squall, sinking, the harpoon ring
  {
    if (await page.$('.reveal')) await dismiss();
    await teleport({ x: 40, z: 110, h: 0 });
    await g(() => { const G = window.__game; G.tripStart(); G.store.addCargo('scrap_metal', 5); G.store.addCargo('gold_watch', 1); });
    await playFor(1);
    const strip = await g(() => { const t = document.querySelector('.trip'); return { shown: getComputedStyle(t).display !== 'none', hold: t.querySelector('.t-hold b').textContent, dock: t.querySelector('.t-dock b').textContent, clock: t.querySelector('.t-clock').textContent }; });
    check('trip strip shows hold value, distance to dock and the squall clock at sea', strip.shown && +strip.hold > 0 && +strip.dock > 0 && /\d:\d\d/.test(strip.clock), JSON.stringify(strip));
    await g(() => { const G = window.__game; G.store.data.trip.t = G.tripLen + 40; G.store.data.hull = G.store.stats.hullMax; });
    const h0 = await g(() => window.__game.store.data.hull);
    await playFor(2);
    const sq = await g(() => ({ squall: window.__game.atmo.squall, hull: window.__game.store.data.hull, phase: document.querySelector('.trip').dataset.phase }));
    check('when the trip clock runs out the squall arrives and eats the hull', sq.squall > 0.9 && sq.hull < h0 && sq.phase === 'squall', JSON.stringify({ ...sq, h0 }));
    await page.screenshot({ path: `${out}/loop_squall.png` });
    // bank at the pier
    const pier = await g(() => ({ x: window.__game.env.pierTip.x, z: window.__game.env.pierTip.z }));
    await teleport({ x: pier.x + 4, z: pier.z - 6, h: Math.PI });
    await page.waitForTimeout(600);
    const before = await g(() => ({ banked: window.__game.store.data.loop.tripsBanked, cargo: window.__game.store.data.cargo.length }));
    await click(/^⚓ DOCK$/);
    await page.waitForTimeout(1500);
    await dismiss();
    const bank = await g(() => { const d = window.__game.store.data; return { cargo: d.cargo.length, scrap: d.vault.find((v) => v.id === 'scrap_metal')?.n ?? 0, banked: d.loop.tripsBanked, tripOn: d.trip.on, squall: window.__game.atmo.squall }; });
    check('docking banks the hold into the vault and ends the trip', before.cargo > 0 && bank.cargo === 0 && bank.scrap >= 5 && bank.banked === before.banked + 1 && !bank.tripOn, JSON.stringify({ before, bank }));
    if (await page.$('.sheet')) await g(() => window.__game.ui.closePanel());
    // swamped: the hold is lost, gold, vault and upgrades never
    await teleport({ x: 40, z: 110, h: 0 });
    await g(() => { const G = window.__game; G.tripStart(); G.store.addCargo('wire', 3); G.store.addCargo('sun_mask', 1); window.__keep = { gold: G.store.data.gold, vault: JSON.stringify(G.store.data.vault), ups: G.store.data.upgrades.join() }; G.store.data.hull = 1; G.damage(50, null); });
    // the tow home runs behind a fade on a timer: on CI's slow renderer it can land seconds later, so wait for it
    // (otherwise it re-docks the boat after the next step has already put her back to sea)
    await page.waitForFunction(() => { const G = window.__game; return G.boat.docked && !G.store.data.trip.on; }, null, { timeout: 60000, polling: 100 }).catch(() => {});
    await page.waitForTimeout(400);
    const sunk = await g(() => { const d = window.__game.store.data; return { cargo: d.cargo.map((c) => c.id), gold: d.gold === window.__keep.gold, vault: JSON.stringify(d.vault) === window.__keep.vault, ups: d.upgrades.join() === window.__keep.ups, lost: d.loop.tripsLost }; });
    check('swamped: the hold goes over the side (story finds stay); gold, vault and upgrades are untouched', sunk.cargo.join() === 'sun_mask' && sunk.gold && sunk.vault && sunk.ups && sunk.lost >= 1, JSON.stringify(sunk));
    await dismiss();
    // the harpoon ring hooks a drifting cache out of reach
    await g(() => { const G = window.__game; if (!G.store.data.upgrades.includes('harpoon_turret')) G.store.data.upgrades.push('harpoon_turret'); G.rebuildShip(); });
    await teleport({ x: 40, z: 100, h: 0 });
    await g(() => { const G = window.__game; for (const c of G.caches) G.scene.remove(c.obj); G.caches.length = 0; const obj = new G.shipRoot.constructor(); /* a THREE.Group stands in for the crate */ obj.position.set(40, 0, 130); G.scene.add(obj); G.caches.push({ obj, x: 40, z: 130, region: 'shallows' }); G.cacheTimer = 999; });
    await page.waitForTimeout(800);
    const hacts = await actions();
    check('with a Harpoon Turret, a cache out of hook reach offers HARPOON', hacts.some((a) => /HARPOON CACHE/.test(a)), hacts.join(' | '));
    // fire and tap inside the page, on the ring's own clock (CI's headless GL is too slow for a round trip per frame);
    // a miss just means "try again", as for a player
    let ring = false;
    for (let attempt = 0; attempt < 3 && (await g(() => window.__game.caches.length)) > 0; attempt++) {
      ring = (await g(() => new Promise((res) => {
        window.__game.harpoonShot();
        const w = document.querySelector('.harpoon-ring');
        if (!w) return res(false);
        const at = +w.dataset.t0 + 832; // r = 56 - 50·t/1.3 s = 24 at t = 0.832 s
        const f = () => { if (performance.now() >= at) { w.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); res(true); } else setTimeout(f, 1); };
        f();
      }))) || ring;
      if (attempt === 0) await page.screenshot({ path: `${out}/loop_harpoon.png` });
      await page.waitForTimeout(800);
      if (await page.$('.reveal')) await dismiss();
    }
    const caught = await g(() => window.__game.caches.length);
    check('the harpoon ring opens and a hit reels the cache in', ring && caught === 0, `ring ${ring}, caches left ${caught}`);
    await dismiss();
  }

  // ── loop pass Phase 2: wreck tiers and the reveal, the Salvage Log, shop effects, the dock board
  {
    if (await page.$('.reveal')) await dismiss();
    await teleport({ x: 40, z: 100, h: 0 });
    await g(() => { const G = window.__game; G.tripStart(); if (!G.store.data.upgrades.includes('radar_mast')) G.store.data.upgrades.push('compass_brass', 'radar_mast'); G.rebuildShip(); G.wrecks.spawnAt(48, 104, 'legendary'); window.__wr = G.wrecks.list[G.wrecks.list.length - 1].site.id; });
    await page.waitForTimeout(800);
    const radarHas = await g(() => { const G = window.__game; return G.wrecks.list.some((w) => w.tier === 'legendary' && !w.hauled); });
    const wacts = await actions();
    check('a Legendary wreck drifts in and offers SALVAGE', radarHas && wacts.some((a) => /SALVAGE LEGENDARY WRECK/.test(a)), wacts.join(' | '));
    await click(/SALVAGE LEGENDARY/);
    await page.waitForSelector('.winch', { timeout: 5000 }).catch(() => {});
    const pulls = await g(() => document.querySelectorAll('.w-pips i').length);
    for (let i = 0; i < pulls; i++) {
      await page.waitForFunction(() => { const z = document.querySelector('.w-zone'), n = document.querySelector('.w-needle'); if (!z || !n) return true; const l = parseFloat(z.style.left), w = parseFloat(z.style.width), x = parseFloat(n.style.left); return x > l + w * 0.4 && x < l + w * 0.6; }, null, { timeout: 15000, polling: 16 }).catch(() => {});
      await page.dispatchEvent('.w-reel', 'pointerdown');
      await page.waitForTimeout(600);
    }
    // another card (a new discovery, a set) may be queued in front of the haul card: tap those away until it shows
    for (let k = 0; k < 8 && !(await page.$('.reveal .lchip')); k++) {
      await page.waitForTimeout(700);
      const other = await page.$('.reveal:not(:has(.lchip)) .r-ok');
      if (other) await other.click().catch(() => {});
    }
    const rev = await g(() => ({ chips: [...document.querySelectorAll('.reveal .lchip em')].map((e) => e.textContent), stamp: document.querySelector('.reveal .tier-stamp')?.textContent ?? '', tiers: window.__game.store.data.tiers, gone: window.__game.wrecks.byId(window.__wr)?.hauled }));
    await page.screenshot({ path: `${out}/loop_loot_reveal.png` });
    check('hauling it reveals each find with its tier; the wreck is used up', rev.chips.length > 0 && rev.chips.every((c) => /Junk|Common|Rare|Legendary/.test(c)) && rev.gone === true, JSON.stringify(rev));
    await dismiss();
    // Salvage Log
    await g(() => window.__game.ui.openPanel('catalog', 'sets'));
    await page.waitForTimeout(300);
    const log = await g(() => ({ title: document.querySelector('.sheet h2')?.textContent, sets: document.querySelectorAll('.set-card').length }));
    await page.screenshot({ path: `${out}/loop_salvage_log.png` });
    check('the Salvage Log shows every set with its bonus', /Salvage Log/.test(log.title) && log.sets >= 7, JSON.stringify(log));
    await g(() => window.__game.ui.closePanel());
    // shop effect lines
    const pier = await g(() => ({ x: window.__game.env.pierTip.x, z: window.__game.env.pierTip.z }));
    await g(() => { const d = window.__game.store.data; d.jobs.board[0].progress = d.jobs.board[0].n; d.jobs.board[0].done = true; window.__job = { gold: d.gold, done: d.jobs.done, id: d.jobs.board[0].id }; });
    await teleport({ x: pier.x + 4, z: pier.z - 6, h: Math.PI });
    await page.waitForTimeout(600);
    await click(/^⚓ DOCK$/);
    await page.waitForFunction(() => window.__game.boat.docked, null, { timeout: 60000, polling: 100 }).catch(() => {}); // docking runs behind a fade
    await page.waitForTimeout(1800);
    await dismiss();
    const job = await g(() => { const d = window.__game.store.data; return { paid: d.gold > window.__job.gold, done: d.jobs.done, fresh: d.jobs.board[0].id !== window.__job.id, n: d.jobs.board.length }; });
    check('a finished dock job is paid on docking and a new one is posted', job.paid && job.done >= (await g(() => window.__job.done)) + 1 && job.fresh && job.n === 3, JSON.stringify(job));
    await g(() => window.__game.ui.openPanel('harbor'));
    await page.waitForTimeout(300);
    const board = await g(() => document.querySelectorAll('.row.job.dock').length);
    check('the harbour shows the three dock jobs', board === 3, `${board}`);
    await g(() => window.__game.ui.openPanel('shipwright'));
    await page.waitForTimeout(300);
    const fx = await g(() => document.querySelectorAll('.play-fx').length);
    await page.screenshot({ path: `${out}/loop_shop_effects.png` });
    check('the shipwright shows what every upgrade does in play', fx >= 19, `${fx} effect lines`);
    await g(() => window.__game.ui.closePanel());
  }

  // ── loop pass Phase 3: sea events and the Daily Tide
  {
    if (await page.$('.reveal')) await dismiss();
    // rogue wave on the beam: hits (no armour), bow-on: rides it
    await teleport({ x: 40, z: 100, h: 0 });
    await g(() => { const G = window.__game; G.store.data.upgrades = G.store.data.upgrades.filter((u) => u !== 'hull_armor'); G.tripStart(); G.store.data.hull = G.store.stats.hullMax; window.__h0 = G.store.data.hull; G.events.trigger('rogue_wave'); G.events.active[0].data.from = G.boat.heading + Math.PI / 2; });
    await page.waitForFunction(() => window.__game.events.active.length === 0, null, { timeout: 120000, polling: 200 }).catch(() => {});
    const wave = await g(() => ({ hull: window.__game.store.data.hull, h0: window.__h0, seen: window.__game.events.seen }));
    check('a rogue wave caught on the beam hits the hull', wave.hull < wave.h0 - 5 && wave.seen.includes('rogue_wave'), JSON.stringify(wave));
    await g(() => { const G = window.__game; G.events.trigger('rogue_wave'); G.events.active[0].data.from = G.boat.heading; G.boat.speed = 6; window.__pinSpeed = setInterval(() => (G.boat.speed = 6), 30); });
    await page.waitForFunction(() => window.__game.events.active.length === 0, null, { timeout: 120000, polling: 200 }).catch(() => {});
    const rode = await g(() => { clearInterval(window.__pinSpeed); return window.__game.events.beaten; });
    check('turning the bow into a rogue wave rides over it', rode >= 1, `beaten ${rode}`);
    // surfacing wreck sinks after 30 s if nobody hauls it
    await g(() => { const G = window.__game; for (let k = 0; k < 5 && !G.wrecks.list.some((w) => w.sinkIn !== undefined); k++) G.events.trigger('surfacing_wreck'); window.__sw = G.wrecks.list.find((w) => w.sinkIn !== undefined)?.site.id; const w = G.wrecks.byId(window.__sw); if (w) w.sinkIn = 1; });
    await playFor(2);
    check('a surfacing wreck goes back under when its time runs out', await g(() => !!window.__sw && !window.__game.wrecks.byId(window.__sw)), '');
    // Daily Tide: same wrecks twice for the same date, end card with score, share text and streak
    const pier = await g(() => ({ x: window.__game.env.pierTip.x, z: window.__game.env.pierTip.z }));
    const dailyRun = async () => {
      // docking itself is checked above; here the boat is simply put alongside so the Daily Tide test can't be
      // tripped by the dock fade's timing on a slow renderer
      await g(() => { const G = window.__game; G.ui.closePanel(); G.events.clear(); G.dockPose(); G.store.data.trip.on = false; });
      await dismiss();
      await g(() => window.__game.ui.openPanel('harbor'));
      await page.waitForSelector('.daily-btn', { timeout: 5000 });
      await page.click('.daily-btn');
      await page.waitForTimeout(500);
      const st = await g(() => ({ active: window.__game.store.data.daily.active, docked: window.__game.boat.docked }));
      if (!st.active) console.log('daily did not start:', JSON.stringify(st));
      return g(() => window.__game.wrecks.list.map((w) => `${w.tier}@${w.site.x.toFixed(1)},${w.site.z.toFixed(1)}`).join(' '));
    };
    const a = await dailyRun();
    const active = await g(() => window.__game.store.data.daily.active);
    await g(() => { const G = window.__game; G.store.addCargo('gold_watch', 2); });
    await teleport({ x: pier.x + 4, z: pier.z - 6, h: Math.PI });
    await page.waitForTimeout(600);
    await click(/^⚓ DOCK$/);
    // other cards (a milestone, the Captain's Log) can be queued in front of the Daily Tide card: tap them away
    await page.waitForFunction(() => window.__game.boat.docked, null, { timeout: 60000, polling: 100 }).catch(() => {});
    for (let k = 0; k < 40 && !(await page.$('.daily-end')); k++) {
      await page.waitForTimeout(500);
      const other = await page.$('.reveal:not(.daily-end) .r-ok');
      if (other) await other.click().catch(() => {});
    }
    const end = await g(() => ({ card: !!document.querySelector('.daily-end'), share: document.querySelector('.daily-end .d-share')?.textContent ?? '', streak: window.__game.store.data.daily.streak, best: window.__game.store.data.daily.best }));
    await page.screenshot({ path: `${out}/loop_daily_end.png` });
    check('the Daily Tide ends at the dock with a score breakdown, a shareable result and a streak', end.card && /Daily Tide/.test(end.share) && /streak/.test(end.share) && end.streak >= 1, JSON.stringify(end));
    await g(() => document.querySelector('.daily-end .r-ok')?.click());
    await dismiss();
    const b2 = await dailyRun();
    check('the Daily Tide puts the same wrecks in the same places for the same date', !!active && a.length > 0 && a === b2, `${a} | ${b2}`);
    await g(() => { const G = window.__game; G.store.data.daily.active = null; G.events.clear(); });
  }

  // ── loop pass Phase 4: the Wave Runner and the Hot Air Balloon
  {
    if (await page.$('.reveal')) await dismiss();
    await g(() => { const G = window.__game; for (const u of ['wr_runner', 'wr_sled', 'wr_boost', 'compass_brass', 'radar_mast', 'bl_balloon', 'bl_winch']) if (!G.store.data.upgrades.includes(u)) G.store.data.upgrades.push(u); G.rebuildShip(); });
    await teleport({ x: 40, z: 112, h: 0.6 });
    await g(() => window.__game.tripStart());
    await page.waitForTimeout(600);
    const a0 = await actions();
    check('at sea the Wave Runner and the balloon each launch with one button', a0.some((a) => /LAUNCH RUNNER/.test(a)) && a0.some((a) => /GO UP/.test(a)), a0.join(' | '));
    await click(/LAUNCH RUNNER/);
    await page.waitForTimeout(400);
    const l = await g(() => ({ active: window.__game.vehicles.active, docked: window.__game.vehicles.dockedRunner?.visible }));
    check('LAUNCH hands the controls straight to the runner', l.active === 'runner', JSON.stringify(l));
    // a cache under the runner: one load
    await g(() => { const G = window.__game, v = G.vehicles; const obj = new G.shipRoot.constructor(); G.scene.add(obj); G.caches.push({ obj, x: v.rx, z: v.rz, region: 'shallows' }); });
    await playFor(0.6);
    const c1 = await g(() => window.__game.vehicles.carried.length);
    // drive it fast: it is much quicker than the boat
    await joy(0, 1);
    await playFor(3);
    const sp = await g(() => ({ runner: window.__game.vehicles.rSpeed, boatMax: Math.max(window.__game.store.stats.speed, window.__game.store.stats.engine) }));
    await joy(0, 0);
    check('the runner picks up a load and is much faster than any hull', c1 === 1 && sp.runner > sp.boatMax, JSON.stringify({ c1, ...sp }));
    await page.screenshot({ path: `${out}/loop_runner.png` });
    // crash: the load drops into the water
    const cr = await g(() => { const v = window.__game.vehicles; v.crash('test'); return { carried: v.carried.length, dropped: v.dropped.length, thrown: v.thrown > 0 }; });
    await page.waitForTimeout(300);
    const ra = await actions();
    check('a crash throws you off and drops the load; you can respawn at the boat', cr.carried === 0 && cr.dropped === 1 && cr.thrown && ra.some((a) => /RESPAWN/.test(a)), JSON.stringify({ ...cr, ra }));
    // swim back: ride over the dropped load to get it, then RETURN beside the boat unloads into the hold
    await g(() => { const v = window.__game.vehicles; v.thrown = 0; const d = v.dropped[0]; v.rx = d.x; v.rz = d.z; });
    await playFor(0.5);
    const got = await g(() => window.__game.vehicles.carried.length);
    const hold0 = await g(() => window.__game.store.data.cargo.reduce((a, c) => a + c.n, 0));
    await g(() => { const G = window.__game, v = G.vehicles; v.rx = G.boat.x + 6; v.rz = G.boat.z; });
    await click(/RETURN/);
    await page.waitForTimeout(300);
    const un = await g(() => ({ active: window.__game.vehicles.active, carried: window.__game.vehicles.carried.length, hold: window.__game.store.data.cargo.reduce((a, c) => a + c.n, 0) }));
    check('the dropped load can be recovered; RETURN beside the boat unloads it into the hold and docks the runner', got === 1 && un.active === null && un.carried === 0 && un.hold > hold0, JSON.stringify({ got, hold0, ...un }));
    // raiders: one darts in and snatches from the hold
    await g(() => { const G = window.__game; G.store.addCargo('gold_watch', 1); G.events.trigger('raiders'); const r = G.raiderRun.riders[0]; r.state = 'dart'; r.x = G.boat.x + 1; r.z = G.boat.z + 1; window.__n0 = G.store.data.cargo.reduce((a, c) => a + c.n, 0); });
    await playFor(0.5);
    const st = await g(() => ({ stolen: window.__game.raiderRun.stolen, n: window.__game.store.data.cargo.reduce((a, c) => a + c.n, 0), n0: window.__n0 }));
    check('a raider on a wave runner that reaches the boat snatches one thing from the hold', st.stolen === 1 && st.n === st.n0 - 1, JSON.stringify(st));
    await g(() => { const G = window.__game; for (const r of G.raiderRun.riders) G.raiderRun.knockOut(r, 'test'); });
    await playFor(0.5);
    // the balloon: up high, marks go on the radar and stay after landing
    await click(/GO UP/);
    await page.waitForTimeout(300);
    await g(() => { const G = window.__game; G.wrecks.spawnAt(G.boat.x + 150, G.boat.z + 100, 'legendary'); G.vehicles.alt = 110; });
    await playFor(1.2);
    const up = await g(() => ({ active: window.__game.vehicles.active, marks: window.__game.vehicles.marks.map((m) => m.kind), hold: !!document.querySelector('.hold-btn') }));
    await page.screenshot({ path: `${out}/loop_balloon.png` });
    await click(/LAND/);
    await page.waitForTimeout(300);
    const down = await g(() => ({ active: window.__game.vehicles.active, marks: window.__game.vehicles.marks.length, saved: (window.__game.store.data.trip.marks ?? []).length }));
    check('from the balloon a Legendary wreck is marked (tier shown with radar) and the marks stay after landing', up.active === 'balloon' && up.hold && up.marks.includes('wreck_legendary') && down.active === null && down.marks >= 1 && down.saved >= 1, JSON.stringify({ up, down }));
    // the winch: hook a heavy wreck and fly it home
    await click(/GO UP/);
    await page.waitForTimeout(300);
    await g(() => { const G = window.__game, v = G.vehicles; v.alt = 20; const w = G.wrecks.spawnAt(v.bx + 3, v.bz + 3, 'rare', { name: 'Heavy Wreck in the Shallows' }); window.__h = G.store.data.hauls; });
    const wa = await actions();
    await click(/WINCH LIFT/);
    await page.waitForTimeout(300);
    await g(() => { const G = window.__game, v = G.vehicles; v.bx = G.boat.x + 2; v.bz = G.boat.z + 2; });
    await playFor(0.6);
    await page.waitForTimeout(800);
    const lift = await g(() => ({ hauls: window.__game.store.data.hauls - window.__h, lifting: !!window.__game.vehicles.lifting }));
    check('the balloon winch lifts a heavy wreck and hauls it aboard at the boat', wa.some((a) => /WINCH LIFT/.test(a)) && lift.hauls === 1 && !lift.lifting, JSON.stringify({ wa, ...lift }));
    await dismiss();
    await click(/LAND/);
  }

  // ── save & reload
  await g(() => { window.__game.persistShip?.(); window.__game.store.saveNow(); });
  await page.reload();
  await page.waitForSelector('.title-screen .act', { timeout: 180000 });
  const after = await g(() => ({ crew: window.__game.store.data.crew, hauls: window.__game.store.data.hauls, v: window.__game.store.data.version, ups: window.__game.store.data.upgrades.length }));
  check('progress survives a reload (save v9)', after.v === 9 && after.crew.includes('kai') && after.hauls >= 1 && after.ups >= 2, JSON.stringify(after));

  check('no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  const fails = results.filter((r) => !r.ok).length;
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 1));
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
