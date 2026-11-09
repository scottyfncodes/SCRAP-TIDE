import './ui/styles.css';
import { wordmarkSVG } from './ui/brand';

const loadTitle = document.querySelector('.load-title');
if (loadTitle) loadTitle.innerHTML = wordmarkSVG();

const fill = document.getElementById('loadFill')!;
const msg = document.getElementById('loadMsg')!;
const loading = document.getElementById('loading')!;

const progress = async (p: number, m: string) => {
  fill.style.width = `${Math.round(p * 100)}%`;
  msg.textContent = m;
  // yield so the browser can paint the progress bar between heavy steps
  await new Promise((r) => setTimeout(r, 16));
};

function fail(e: unknown) {
  console.error(e);
  msg.innerHTML = `Something went wrong while setting sail.<br><small>${String((e as Error)?.message ?? e)}</small><br><br><button onclick="location.reload()" style="padding:10px 18px;border-radius:10px;border:none;font-weight:800">Try again</button>`;
}

async function boot() {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    msg.textContent = 'SCRAP TIDE needs WebGL2. Please update your browser.';
    return;
  }
  // The engine (three.js + the game, most of the download) is its own chunk: this small entry paints the loading
  // screen and its progress bar first, and three.js sits in a vendor chunk that stays cached across game updates.
  await progress(0.02, 'Warming the valves…');
  const [{ Game }, { loadReport }, { VESSELS }] = await Promise.all([import('./game/game'), import('./world/assets'), import('./data/ship')]);
  const game = new Game(canvas, progress);
  (window as any).__game = game;
  await game.init();
  (window as any).__loadReport = loadReport;
  if (game.store.look === 'jury') {
    // measurement hooks for docs/jury-rigged (scripts/jury-shots.mjs, scripts/jury-measure.mjs); look visits only
    const [THREE, assets, mats, jury] = await Promise.all([import('three'), import('./world/assets'), import('./world/materials'), import('./world/jury')]);
    (window as any).__jury = { THREE, assets, grade: mats.gradeUniforms, jury };
  }
  if (game.store.sandbox) {
    // ?ship= preview or ?exp= experiment link: say so, so nobody mistakes it for their real save
    const { EXPERIMENTS } = await import('./state/experiments');
    const exps = game.store.experiments.map((id) => EXPERIMENTS[id].title);
    const tag = document.createElement('div');
    tag.className = 'preview-tag';
    const look = game.store.look === 'jury' ? 'JURY-RIGGED' : null;
    tag.textContent = exps.length ? `EXPERIMENT · ${exps.join(' + ')} · NOT SAVED` : look ? `LOOK · ${look} · NOT SAVED` : 'PREVIEW · NOT SAVED';
    tag.title = exps.length
      ? `Phase 3 experiment preview. Nothing from this visit is saved.`
      : look || !game.store.preview
        ? `Art-direction preview (docs/jury-rigged). Nothing from this visit is saved.`
        : `Previewing the ${VESSELS[game.store.preview].name}. Nothing from this visit is saved.`;
    document.body.append(tag);
  }
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 900);
}

boot().catch(fail);

// iOS: prevent double-tap zoom & rubber-banding
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
