# Drop-in verification kit

This proves that the MeshCraft chest GLBs behave like the game's own `chestMesh()`. It uses the game's real code (`src/game/fx.ts`, `src/world/materials.ts`), the game's `tsconfig`, and three@0.170. Nothing here is part of the game build.

```bash
# from the repo root, in a scratch copy so src/ is never touched
H=$(mktemp -d); cp -r src package.json tsconfig.json "$H"; ln -s "$PWD/node_modules" "$H/node_modules"
cp creative/3d/integration/chestGLB.ts "$H/src/game/chestGLB.ts"
cp creative/3d/integration/verify/harness.ts "$H/src/"; cp creative/3d/integration/verify/{harness.html,vite.harness.mjs,run.cjs} "$H/"
mkdir -p "$H/public/models"; cp creative/3d/chest_*/exports/tb_chest_*.three-web-toon.glb "$H/public/models/"
cd "$H" && npx tsc --noEmit -p . && npx vite build -c vite.harness.mjs && OUT_DIR="$H" node run.cjs
```

**What it checks:**
1. `chestGLB.ts` typechecks under the game's strict `tsconfig`.
2. All three tiers load through `GLTFLoader`.
3. Each GLB lid pivot sits exactly where the procedural lid pivot does, relative to the chest root.
4. `lid.rotation.x = -1.9` (what `game.ts` does) opens both chests identically.

It writes `dropin_closed.png` and `dropin_open.png`, with each procedural chest to the left of its GLB counterpart.

**Result on 2026-11-02 (Chromium headless, SwiftShader WebGL):**
- all tiers loaded;
- hinges identical: small at y 0.8, grand at 1.2, sea at 0.88, with the same −Z offsets;
- no console warnings or errors.
