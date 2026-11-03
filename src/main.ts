import './ui/styles.css';
import { Game } from './game/game';
import { loadReport } from './world/assets';
import { VESSELS } from './data/ship';

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
    msg.textContent = 'TIDEBREAKERS needs WebGL2. Please update your browser.';
    return;
  }
  const game = new Game(canvas, progress);
  (window as any).__game = game;
  await game.init();
  (window as any).__loadReport = loadReport;
  if (game.store.preview) {
    // ?ship= preview link: say so, so nobody mistakes it for their real save
    const tag = document.createElement('div');
    tag.className = 'preview-tag';
    tag.textContent = `PREVIEW · ${VESSELS[game.store.preview].name} · not saved`;
    document.body.append(tag);
  }
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 900);
}

boot().catch(fail);

// iOS: prevent double-tap zoom & rubber-banding
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
