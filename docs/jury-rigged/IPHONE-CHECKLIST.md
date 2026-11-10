# The Rustfang Toll: real-iPhone validation checklist

Everything measured so far ran in headless Chromium with SwiftShader (software GL): draw calls, triangles and
memory counts are real, but frame times are CPU-rendered and say nothing about an iPhone GPU. This checklist is the
part only a phone can answer. About 30 minutes per device.

## What is already automated, and what only a phone can answer

Reviewed item by item. "Automated" means it runs without a device and catches regressions; none of it is an iPhone
measurement, and none of it verifies the thresholds below.

| Checklist item | Covered without a device | Still needs the iPhone |
|---|---|---|
| §1 Toll FPS / frame pacing | Deterministic cost proxies: draw calls, triangles and their attribution per frame (`scripts/jury-shots.mjs`, `scripts/jury-profile.mjs`); triangle, joint and size budgets in CI (`tests/jury.test.ts`) | **All timing.** Software-GL `msPerFrame` is CPU-rendered and says nothing about an iPhone GPU |
| §1 first-view hitch | No | Yes |
| §2 crews animate independently, no popping | Exact: the batched crew skins identically to separate meshes in mismatched clips, and its cull sphere contains every vertex (`tests/jury.test.ts`) | Visual smoothness and jitter at distance (GPU float precision) |
| §2 shadows | Captures in four lighting keys (`docs/jury-rigged/screens`) | On-device look |
| §3 memory: leak loop | Renderer geometry/texture counts over spawn/despawn cycles (`scripts/jury-leak.mjs`); disposal is unit-tested | Total process memory, Safari reload or kill under pressure |
| §3 memory: baseline vs default | Downloads are fixed and known (two GLBs, 356 + 303 KB) | The actual MB on device |
| §4 walking feel | Foot slip, heel lift and pelvis bob on the shipped rig (`tests/jury.test.ts`, `tests/gait.test.ts`) | Feel, cadence, touch response |
| §5 default regressions | Docking, dock jobs, banking, Daily Tide (CI e2e); default shaders byte-identical to `main` (`tests/jury.test.ts`); no extra default downloads (`scripts/jury-shots.mjs`) | Default frame pacing vs `main` on the phone |

Not available in this repository or its CI: a real-device farm, Safari/WebKit automation on a phone, or GPU timing.
Playwright's WebKit on Linux would exercise Safari's engine for errors (shader compiles, 44-bone skinning) but not
iPhone performance; it isn't installed here and would be the next cheap addition if wanted.

## Setup

- **Devices:** an iPhone 13 (the project's baseline profile) and the newest iPhone available. Same iOS for both.
- **Conditions:** charged above 50 %, Low Power Mode **off**, device cool (not straight after charging or another
  game), brightness mid, no other apps open. Note the iOS version and device model in the results.
- **Two builds, same session:** the PR preview, with and without `?look=jury`. Always compare the two looks on the same
  device back to back; an absolute number alone isn't a pass or fail.
  - Default: `<preview>/?ship=skiff`
  - Jury: `<preview>/?ship=skiff&look=jury`
- **Measuring:** a Mac with Safari, the phone connected by cable, Web Inspector on (iPhone: Settings → Safari →
  Advanced → Web Inspector). Run the snippets below in the Web Inspector console. Test in Safari first, then once
  from the Home Screen install.

### Snippets (Web Inspector console)

Put the boat in the Toll view (the patrol is on screen and will chase you, which is the real worst case):

```js
(() => { const g = __game; g.mode = 'sail'; Object.assign(g.boat, { docked: false, anchored: false, x: 47, z: 133, heading: 2.5, speed: 0 }); g.camYaw = 2.5; })()
```

Frame pacing over 20 seconds (don't touch the phone while it runs):

```js
(() => { const t = []; let l = performance.now(); const end = l + 20000;
  const f = (n) => { t.push(n - l); l = n; if (n < end) return requestAnimationFrame(f);
    t.sort((a, b) => a - b); const q = (p) => t[Math.floor(p * (t.length - 1))].toFixed(1);
    console.log(JSON.stringify({ fps: (t.length / 20).toFixed(1), p50: q(0.5), p95: q(0.95), p99: q(0.99), max: t[t.length - 1].toFixed(1),
      over33ms: t.filter((x) => x > 33.4).length, over50ms: t.filter((x) => x > 50).length })); };
  requestAnimationFrame(f); })()
```

## 1. Toll view: FPS and frame pacing

Run the frame-pacing snippet in each spot, in both looks, at noon (`__game.atmo.time = 0.5`) and once at night
(`__game.atmo.time = 0.95`):

| Spot | How |
|---|---|
| Toll view | the teleport snippet above |
| Driftholm approach | `Object.assign(__game.boat, { x: 4, z: 128, heading: 0, speed: 0 })` |

- [ ] **Toll, jury vs default at the same spot:** p50 and p95 within **10 %** of the default look's.
- [ ] **No new hitches:** `over50ms` no higher than the default look's count (+1 allowed for noise).
- [ ] **Driftholm, jury vs default:** p50 and p95 within **5 %** (nothing Jury-Rigged draws there unless in view).
- [ ] **The first time the Toll comes into view** (the patrol spawns and shaders compile), note the worst single
      frame in both looks. A one-off hitch under 100 ms is acceptable; record it either way.
- [ ] iPhone 13 holds the same frame-rate tier as the default look (60 stays 60; if the default runs at 30, the jury
      look does too).

## 2. Animation smoothness

At the Toll, let the patrol chase you (sail slowly toward the barrier):

- [ ] Both raiders on each Jawboat animate **independently**: different idle timing; the bow raider swings the glaive
      when close while the helmsman keeps idling.
- [ ] No raider pops in or out at the screen edges while you pan the camera across the patrol.
- [ ] No jitter or wobble on raiders at distance (they share one mesh per boat over a 44-bone skeleton).
- [ ] The Jawboats ride the swell smoothly; nothing lags behind the hull (crew, stacks, trophy post).
- [ ] Shadows of the boats and crews look the same as the rest of the scene (no flicker, no missing shadows).

## 3. Memory

Web Inspector → Timelines → Memory, recording throughout:

- [ ] **Baseline:** after 2 minutes at Driftholm in each look, note total memory. The jury look should be within about
      **+25 MB** of the default (two extra character models, about 660 KB on disk, plus their GPU buffers).
- [ ] **Leak loop:** sail into the Rustfang Graveyard (or the Toll) until raiders appear, then far away until they
      despawn, 5 times (`Object.assign(__game.boat, { x: 270, z: 420 })` then `{ x: -700, z: -700 }`, waiting
      ~5 s each). Memory should return to roughly the same level each cycle, not climb steadily. (Software-GL
      measurement after the fix: renderer geometries and textures stay flat across cycles on a look visit. The
      default look has a small pre-existing bone-texture leak, also on `main`, so compare the trend in both looks.)
- [ ] Ten minutes of mixed play in the jury look without Safari reloading the page or the app being killed.

## 4. Walking feel (the 5.5-head captain)

Go ashore at Driftholm (or `__game.mode = 'foot'` while docked) and compare with the default captain:

- [ ] **Walk** (light push on the wheel): feet stay planted, with no sliding on the sand or the pier; the steps look
      quicker than the default captain's but not frantic.
- [ ] **Run** (full push): a clear flight phase, the body leans forward, arms pump, no foot skating.
- [ ] **Stops and starts:** no pop or snap when you let go of the wheel or push it again.
- [ ] **Turning on the spot and slow circles:** the feet don't twist through the ground.
- [ ] **Toe-off:** the heel lifts and the toes stay down as each foot pushes off (the new toe-joint hinge).
- [ ] The captain reads clearly at gameplay distance, in daylight and at night (hat and life vest).
- [ ] Footstep sounds stay in time with the feet.

## 5. Regressions in the default look (no `?look=jury`)

- [ ] The captain wears #66's salvage helmet; nothing from the jury look appears.
- [ ] Docking at Driftholm, banking the hold and a dock-job payout all work.
- [ ] Frame pacing in the Driftholm spot matches `main`'s production build (run the same snippet on both).

## Recording results

For each device: model, iOS, Safari vs Home Screen, and per spot and look the snippet's JSON, plus pass/fail for every
box. A fail in section 1 or 3 blocks merging; a fail in section 2 or 4 is a design call for the reviewer.
