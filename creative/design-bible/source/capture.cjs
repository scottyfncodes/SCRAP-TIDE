// Captures clean, HUD-free, landscape frames of the real built game for the World & Voyage Design Bible.
// Read-only: drives window.__game through ?ship= preview links (an in-memory save, nothing written back).
//   npm run build && npx vite preview --port 4173 &   node creative/design-bible/source/capture.cjs
const { chromium } = require('playwright');
const out = process.argv[3] || 'creative/design-bible/art/screens';
const base = process.argv[2] || 'http://localhost:4173/';
const SHOTS = [
  // name, ship, boat x/z/heading, camera yaw/pitch/zoom, time of day (0..1)
  { name: 'skiff_driftholm', ship: 'skiff', up: '', x: 10, z: 150, h: 2.6, yaw: 0.2, pitch: 0.28, zoom: 1.25, t: 0.32 },
  { name: 'trimaran_reach', ship: 'trimaran', up: 'sail_cutter,engine_outboard,salvage_crane,cargo_net,fishing_rig', x: 430, z: -330, h: 2.3, yaw: 3.6, pitch: 0.24, zoom: 1.0, t: 0.68 },
  { name: 'ironwake_full', ship: 'ironwake', up: 'all', x: -470, z: 120, h: 1.0, yaw: 2.4, pitch: 0.3, zoom: 1.05, t: 0.72 },
  { name: 'rig_helios', ship: 'trimaran', up: 'sail_canvas', x: -480, z: 222, h: 4.0, yaw: 4.0, pitch: 0.2, zoom: 1.6, t: 0.4 },
  { name: 'rooftop_hollow', ship: 'skiff', up: 'sail_canvas', x: -200, z: -10, h: 3.6, yaw: 3.6, pitch: 0.2, zoom: 1.6, t: 0.36 },
  { name: 'rustfang_hold', ship: 'ironwake', up: 'harpoon_turret,hull_armor,hull_copper', x: 300, z: 560, h: 0.8, yaw: 0.9, pitch: 0.2, zoom: 1.5, t: 0.78 },
  { name: 'old_meridian', ship: 'trimaran', up: 'sail_cutter', x: 405, z: -345, h: 2.36, yaw: 2.36, pitch: 0.18, zoom: 1.4, t: 0.3 },
  { name: 'stormwall_spire', ship: 'ironwake', up: 'all', x: -200, z: -960, h: 3.14, yaw: 3.14, pitch: 0.16, zoom: 1.5, t: 0.5 },
  { name: 'turtle_atoll', ship: 'skiff', up: 'sail_canvas', x: -150, z: 140, h: 3.14, yaw: 3.14, pitch: 0.22, zoom: 1.5, t: 0.3 },
  { name: 'lantern_night', ship: 'skiff', up: 'sail_canvas,deck_lights', x: 175, z: 70, h: 3.14, yaw: 3.14, pitch: 0.2, zoom: 1.4, t: 0.9 },
];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const s of SHOTS) {
    if (only && !only.includes(s.name)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: Number(process.env.DPR || 1) });
    const page = await ctx.newPage();
    await page.goto(`${base}?ship=${s.ship}${s.up ? `&upgrades=${s.up}` : ''}`);
    await page.waitForSelector('.title-screen .act', { timeout: 240000 });
    await page.click('.title-screen .act');
    await page.waitForTimeout(800);
    for (let i = 0; i < 8; i++) { const b = await page.$('.reveal button, .reveal .btn'); if (b) await b.click().catch(() => {}); await page.waitForTimeout(200); }
    await page.evaluate((s) => {
      const G = window.__game; G.ui.closePanel?.();
      const d = G.store.data; d.quest = 'free';
      Object.assign(G.boat, { x: s.x, z: s.z, heading: s.h, speed: 0, docked: false, anchored: true, busy: false });
      G.mode = 'sail'; G.camYaw = s.yaw; G.camPitch = s.pitch; G.zoom = s.zoom; G.atmo.time = s.t;
      window.__shot = s;
      const st = document.createElement('style'); st.textContent = '#ui, #loading, .preview-tag { display: none !important; }';
      document.head.append(st);
      const keep = () => { G.camYaw = s.yaw; G.camPitch = s.pitch; G.zoom = s.zoom; G.atmo.time = s.t; requestAnimationFrame(keep); }; keep();
    }, s);
    const t0 = await page.evaluate(() => window.__game.renderT);
    await page.waitForFunction((t) => window.__game.renderT >= t + 3, t0, { timeout: 240000, polling: 200 }).catch(() => {});
    await page.screenshot({ path: `${out}/${s.name}.jpg`, quality: 92, timeout: 300000 });
    console.log('shot', s.name);
    await ctx.close();
  }
  await browser.close();
})();
