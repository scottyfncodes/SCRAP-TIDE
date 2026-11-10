# The Rustfang Toll: Jury-Rigged proof of concept

*The apocalypse is real. The absurdity is how humanity adapted.*

Beautiful Ruin stays the art direction; **Jury-Rigged** is its new design language for characters, factions,
settlements, vessels and environmental storytelling (`docs/art-direction/STYLE-GUIDE.md` §5a and §10). This pass
proves it on one encounter outside Driftholm, behind **`?look=jury`**. Without the parameter the game is unchanged.

**Try it:** `/?look=jury` (your save, in memory only) or `/?look=jury&fresh=1` (a new game). Sail out of Driftholm
and east past the harbour mouth. Like `?ship=` and `?exp=`, a look visit is a sandbox: nothing is saved.

## What's in it

| Piece | Faction logic | What it was before the flood |
|---|---|---|
| **Captain** (5.6 heads) | Driftholm: round, layered, lashed | wide sun hat cut from a sail (blue patch, goggles on the band); a life jacket worn as armour; rope-wrapped forearm; tin mug on a climbing carabiner. Same face, hair, scar and red scarf. **The tricorn, duster and bandolier are gone.** |
| **Rustfang raider** (5.7 heads) | Rustfang: welded, sharpened, forward-leaning | a circular saw blade bolted upright on one shoulder, a road sign with spikes on the other, a car-bonnet chest plate, two exhaust pipes standing up from the back, and a saw blade on a scaffold pole instead of a cutlass |
| **Jawboat** (raider boat) | Rustfang | an open mouth at the bow: a welded upper jaw with teeth raking forward over a 1.9 m circular saw blade; road-sign warning triangles as shields, an outboard twice the size it needs with four exhaust stacks raked back off the transom, a cage outrigger on one side only, tyre fenders, three car klaxons, and a low trophy post of other crews' nameplates with the Rustfang rag |
| **Signal Stack** (Driftholm landmark, 22 m) | Driftholm | drums under a deck, two containers stacked crosswise, a white plastic water tank, a scaffold lattice, a satellite dish turned up into a crow's nest, a traffic light re-glazed red/amber/bottle-white (its green lens is gone: green means alive here), an airport windsock, four guy lines with laundry bunting and festoon bulbs |
| **Pier** | Driftholm | a clawfoot bath hung from a pipe davit as the lifeboat; supermarket trolleys as lobster pots, one let down on its rope with a jerrycan marker |
| **The Toll** | Rustfang | a striped car-park barrier across the approach with saw teeth welded on top, a plate toll booth with a lit hatch and a STOP sign, two drum rafts, a red rag; two Jawboats patrol it |

The 5.5-head cast is built by the existing MeshCraft script (`creative/3d-characters/scripts/survivors.py`): a
**proportion pass** (`JURY`, `jury_warp`) scales each bone's own vertices and its children's offsets, so the same 22-bone
rig, skin weights and clips carry over. The walk is the same procedural gait, retuned to the new legs (`retune()` in
`src/player/gait.ts`): shorter stride, quicker cadence, livelier arms, and a toe-off that hinges on the toe joint. Everything else is plain vertex-coloured
geometry from `src/world/jury.ts`, merged into the existing batches.

Sun-faded plastic (five approved accents) is tagged as plastic, so the weathering shader keeps more of its colour
and never rusts it; everything untagged is graded exactly as before.

## Results against the criteria

The criteria were committed before implementation (`CRITERIA.md`, commit d9e9391). Numbers come from
`scripts/jury-measure.mjs` (`measure.json`), `scripts/jury-shots.mjs` (`perf.json`) and `tests/jury.test.ts`, re-run
after the final performance pass on the PR head, which includes `main` through PR #66. "Today" means the default look on that
same build: since #66, the default captain wears a salvage helmet instead of the tricorn.

| # | Criterion | Result | Verdict |
|---|---|---|---|
| C1 | 5.5 ± 0.3 heads | captain **5.63**, raider **5.71** (today 7.61 and 7.61, same method) | **Pass** |
| C2 | 40 px silhouettes: IoU ≤ 0.70 and lower than today | captain vs raider **0.642** (today 0.678); Patchwork Skiff vs Jawboat **0.277** (today 0.334) | **Pass** |
| C3 | Signal Stack tallest on screen, ≥ 40 px, lit at night | **157 px** tall on phone (167 on desktop), its top 39 px above anything else in Driftholm, in all four keys; lamps and festoon bulbs render at night | **Pass** |
| C4 | accents ≤ 10 % of every frame; none green or gold | at most **3.0 %** (on foot by the Stack), under 0.8 % at sea; palette test passes | **Pass** |
| C5 | ≤ +10 % triangles, ≤ +2 draw calls, foot slip ≤ 1 cm, default fetches nothing | triangles at most **+8.3 %** in any frame. Foot slip: flat **0.00 / 0.01 cm**, toe-off **0.67 / 0.71 cm** (walk / run). The default visit fetched **no** Jury-Rigged file, and its shaders are byte-identical to `main`'s. Draw calls: within +2 in every like-for-like frame (Driftholm, Graveyard, on foot; all keys, phone and desktop); **the Toll frame +5 (phone, every key) / +6 (desktop), of which +4 is the encounter's own on-screen objects** | **Partial**: Toll-frame draw calls only |

### Correction pass (what changed and what it measured)

- **Raider crew culling.** Characters are built with culling off, because a skinned mesh's bounds don't follow its
  animation. On a look visit each raider crew mesh now gets its own bounding sphere (bind pose plus 0.9 m for the
  glaive's swing) and is culled. A patrol off-screen no longer draws. In the Driftholm frame (the toll patrol behind
  the camera) the overhead fell from +3…+5 calls and +8.7 % triangles to −1…+4 and +1.7 %. The Graveyard frame went
  from +0…+3 / +9 % to −5…−1 / −2.3…+2.1 %. Visible crews still render; there is no pop at the edges of the screen.
  The default look keeps its unculled crews (unchanged by design, so it stays byte-for-byte isolated).
- **Jawboat silhouette.** The 40 px sheet showed the "Jawboat" had no jaw at phone scale, and that its height came
  from a thin whip aerial. The bow is now an open mouth: a welded upper jaw with teeth over the saw blade, which
  replaces two support beams and eight rebar spikes. The stacks moved onto the transom, raked back, and the trophy
  post was lowered with the rag on it. Overlap with the player's skiff: **0.340 → 0.279** (today's raider skiff
  0.334). The first attempt (jaw and stacks only) measured 0.354, worse, and was not kept as is; the low trophy post is
  what lets the boat read low and long.
- **Captain toe-off.** The original solver rocks the foot about the ground under the ball, so the toe *joint*, a few cm
  above the sole, travels with the roll. The stylised rig now hinges on the toe joint itself (`GaitParams.toeHinge`),
  as a foot does at the ball, and bakes 96 keys per stride instead of 40, so the last stance key no longer blends into
  swing. Toe-off slip: **1.72 → 0.67 cm** walking, **2.76 → 0.71 cm** running, with the full toe-off roll (the earlier
  reduced-roll workaround is gone) and the heel still rising 7.3 / 8.6 cm. Running the existing gait-quality suite
  on this rig exposed a weakness from the first retune: the walk's pelvis bob was 0.9 cm (human range 2–5). The walk's
  stride now scales with √(leg length), which restores a **3.2 cm** bob (run 8.1 cm) and still steps quicker than
  today. The default cast's gait is untouched; both checks are now in `tests/jury.test.ts`.

### Final performance pass (draw-call attribution)

`scripts/jury-profile.mjs` wraps `WebGLRenderer.renderBufferDirect`, the single entry point for every draw in both
the main and shadow passes, and attributes each draw to its object, material and pass (`profile/profile.json`). One
thing to know about the C5 metric: three resets `renderer.info` *after* the shadow pass, so the `calls` number counts
main-pass draws only. Shadow-pass draws are real GPU work and are reported beside it.

**The Toll, attributed (phone, both Jawboats and all four crew on screen).** Before this pass the look added
6 main-pass draws: 2 Jawboat hulls (MeshToonMaterial, one mesh each) and 4 raider crew (one SkinnedMesh each), plus
the same 6 again in the shadow pass (MeshDepthMaterial). Nothing else differed: the harbour batch, ocean, sky and FX
draws are identical.

**What changed.**
- **One draw per Jawboat crew** (`src/world/crewBatch.ts`). A boat's two raiders are two copies of the same rig with
  the same material, so they merge into one SkinnedMesh over a combined 44-bone skeleton. Each raider keeps its own
  bones and mixer, so one can swing the glaive while the other idles. `tests/jury.test.ts` skins both versions in
  mismatched poses: worst vertex difference **0.000 mm**, and the cull sphere contains every vertex. Crew draws went
  **4 → 2** in each pass. If a rig isn't the expected shape it falls back to the separate meshes.
- **A latent culling bug fixed.** The previous pass computed each crew's cull sphere before the first skeleton update,
  when bone matrices are still zero, so the sphere collapsed to 0.9 m at the feet: a raider whose feet were just
  off-screen could vanish with the body still visible. Bounds are now skinned from the real pose.
- **Normal-look isolation in the shaders.** The weathering shader's accent grading and measurement mask were compiled
  into every material, default look included: identical output, a few extra instructions per fragment. They now
  compile only into accent materials and into everything on a look visit. A default material's vertex and fragment
  source, program key and uniforms are **byte-identical to `main`'s** (compared against `main`'s `materials.ts`;
  locked in by a test).

**Considered and not done.**
- *Instancing the two Jawboat hulls* (−1 main, −1 shadow draw). Both boats would become identical: each currently
  gets its own plate colours and stack heights. That's a visual cost for one draw, so I rejected it.
- *Folding the crew into the hull's draw.* The hull and crew use different weathering amounts (1.0 vs 0.45) and face
  culling; merging them would change how one of them looks, or need a per-vertex weathering path, a shader change
  beyond "low risk".
- *Turning off crew shadows at range.* A visible change; rejected.

**Driftholm in storm, measured properly.** The last pass's +4 was one reading from the capture harness. Controlled
series, a fresh page per run, order rotated, 5 runs × 5 frames per variant, same pinned frame:

| Variant | Samples | Main-pass calls | SD |
|---|---|---|---|
| build of `main` (751a921) | 25 | 70 (all) | 0 |
| this PR, default look | 25 | 70 (all) | 0 |
| this PR, `?look=jury` | 25 | 70 (all) | 0 |

Reproducing the harness's own frame order on one page (the Toll in four keys, then Driftholm in four keys) gives
72 / 66 / 67 / 67 for both looks, and in the final harness run the per-frame attribution shows **no** Jury-Rigged
object drawn in any Driftholm key. The remaining harness differences there (−0 to +1) are ordinary scene meshes.

### Remaining failures

- **C5 draw calls, the Toll frame: +5 on phone (every key), +6 on desktop.** The attribution: **+4** is the encounter
  itself, 2 Jawboat hulls and 2 batched crews, each on screen and new content the default look doesn't have at that
  spot. The rest is scene-mesh variance (a fresh-page profile measures −1 there). The shadow pass adds another +4.
  With hull instancing rejected, the structural floor for two distinct boats with independent crews is +4. **I'd
  accept this as a tradeoff:** it is the cost of showing the encounter, not overhead, and it's only paid while it's on
  screen. Off screen the patrol now costs nothing.
- **Graveyard in storm, accent share 0 %.** The full squall swell puts the camera in a trough that hides the Jawboats
  (the default storm frame is framed the same way). It's a framing artefact, not missing geometry.

### Performance (phone, matched frames, default → jury)

| Frame | Draw calls (noon / dusk / night / storm) | Triangles | Accent share |
|---|---|---|---|
| The Toll | 107→112, 96→101, 96→101, 98→103 | +8.2 to +8.3 % | 0.20–0.38 % |
| Driftholm approach | 73→74, 66→66, 66→67, 68→69 | +1.7 % | 0.17 % |
| Rustfang Graveyard (raiders) | 71→65, 73→69, 72→64, 71→67 | −2.2 to +2.0 % | 0–0.60 % |
| On foot by the Stack | 109→107, 97→95, 96→92, 95→97 | −0.1 % | 3.0 % |

Desktop, noon: Toll 144→150 (+8.0 % tris), Driftholm 102→100 (+1.6 %; the Stack 167 px tall), Graveyard 84→78
(−2.3 %), on foot 159→154 (−0.2 %); accents 0.07–0.98 %. In the Graveyard and on-foot frames the look is *cheaper*
than the default: the default draws every spawned raider crew even off-screen (6 crew in those frames), while the
look culls them and batches the rest.

**Frame time, software GL only.** Default look, Driftholm at noon, 5 fresh-page runs per build, rotated, same machine:
`main` 885 ms/frame (SD 45), this PR before the shader fix 926 (SD 58), after it 919 (SD 34). The differences are
inside the spread, so these runs can't tell the builds apart; none of this is a phone number.

**Default look unchanged:** the default frames match the previous run within ±2 draw calls (FX noise) and +256
triangles, which is `main`'s helmeted captain, not this PR. A default visit requests no Jury-Rigged file; the code,
about 8 KB gzipped, ships dormant in the game bundle. On a look visit the only extra downloads are
`tb_jury_captain.glb` (356 KB) and `tb_jury_raider.glb` (303 KB).

**Not validated here:** frame times. Every number above comes from headless Chromium with SwiftShader (software
GL); `msPerFrame` in `perf.json` is relative only. Frame rate, GPU time, thermals and memory on an iPhone have **not**
been measured and need a real-device check before rollout.

## Captures

`screens/`: for each frame, `<viewport>-<frame>_4-keys_before-after.jpg` (noon, dusk, night and storm as rows; default
left, `?look=jury` right) and `<viewport>-<frame>_noon_before-after.jpg`. Desktop is captured at noon only. All captures are from the final performance-pass build.
`silhouettes_40px.png`: today's captain, today's raider, the new captain, the new raider; then the Patchwork Skiff,
today's raider skiff, the Jawboat (all solid, 40 px tall, enlarged 4×). `characters/`: MeshCraft previews.

Reproduce: `npm run build`, then `node scripts/jury-shots.mjs dist <out>`, `node scripts/jury-measure.mjs dist <out>`
and `node scripts/jury-compose.mjs <out> docs/jury-rigged/screens`.

## Rollback

- **Visit level:** remove `?look=jury` from the URL. Nothing is saved on a look visit, so nothing persists.
- **Code level:** revert this PR. Every new code path is behind `jury()` (`src/state/look.ts`); the default look loads
  none of the new models and its batches have no `accent` attribute (`tests/jury.test.ts`). The shared changes are
  additive: `merge()` only keeps an `accent` attribute if a part has one, `weather()` compiles the default look's
  shaders byte-for-byte as `main` does, and `vcMat()`, `retune()` and the crew batching are opt-in.
- **Files to delete for a manual rollback:** `src/state/look.ts`, `src/world/jury.ts`, `src/world/crewBatch.ts`, `public/models/tb_jury_*.glb`,
  `creative/3d-characters/jury_*`, `scripts/jury-*.mjs`, `tests/jury.test.ts`, `docs/jury-rigged/`.

## Not done, and next steps if this direction is adopted

- The crew, the townsfolk and the other settlements are unchanged; only the captain and the raiders were rebuilt.
- Exaggerated character busts for dialogue and crew cards, and faction dock-board headers, were proposed for UI but
  are not in this pass (the HUD layout was to stay unchanged).
- The default look's raider crews are still never culled and never batched (existing behaviour); the look-visit
  fixes could graduate to the default look in their own PR.
- Accent coverage is low at sea (under 1 %). If the frames should feel more colourful, the next lever is patched sail
  panels on the player's boats.
- **iPhone-only validation still to do:** frame rate and GPU time at the toll with both Jawboats and crews on screen,
  memory with the two extra character GLBs, and touch/feel of the retuned walk on a real device.
