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
    const btns = await page.$$('.actions .act');
    for (const b of btns) if (re.test(await b.textContent())) { await b.click(); return true; }
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

  // ── save & reload
  await g(() => { window.__game.persistShip?.(); window.__game.store.saveNow(); });
  await page.reload();
  await page.waitForSelector('.title-screen .act', { timeout: 180000 });
  const after = await g(() => ({ crew: window.__game.store.data.crew, hauls: window.__game.store.data.hauls, v: window.__game.store.data.version, ups: window.__game.store.data.upgrades.length }));
  check('progress survives a reload (save v2)', after.v === 2 && after.crew.includes('kai') && after.hauls === 1 && after.ups >= 2, JSON.stringify(after));

  check('no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  const fails = results.filter((r) => !r.ok).length;
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 1));
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
