/**
 * Crash guard: failures are shown to the player instead of a silently frozen sea.
 *
 * Two levels:
 *  - a glitch (one bad frame, a stray async rejection): a small dismissible strip; the game keeps going.
 *  - a wreck (boot failed, or every frame keeps throwing): a full-screen notice with Reload, and the
 *    error text tucked into a details row for bug reports.
 * Pure DOM, no game imports, so it works from the first line of main.ts, before three.js has loaded.
 */

/** Errors that say nothing about the game: browser noise, extensions, cross-origin scripts. */
const NOISE = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i, /AbortError/i, /NotAllowedError/i, /play\(\) (request|failed)/i];

export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return String(e);
  }
}

/** Should this window error / rejection reach the player? (exported for tests) */
export function isReportable(message: string, filename = '', origin = typeof location !== 'undefined' ? location.origin : ''): boolean {
  if (!message) return false;
  if (NOISE.some((r) => r.test(message) || r.test(filename))) return false;
  // a script from another origin (an extension, an injected widget) is not ours to report
  if (filename && origin && /^https?:/.test(filename) && !filename.startsWith(origin)) return false;
  return true;
}

let glitchEl: HTMLElement | null = null;
let wrecked = false;
let lastGlitchAt = -Infinity;
const seen = new Set<string>();

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  n.className = cls;
  if (text) n.textContent = text;
  return n;
}

/** A recoverable failure: the game is still running. One strip at a time, the same error once, at most every 20 s. */
export function reportGlitch(e: unknown) {
  console.error(e);
  if (typeof document === 'undefined') return;
  const text = errorText(e);
  const now = performance.now();
  if (wrecked || glitchEl || seen.has(text) || now - lastGlitchAt < 20000) return;
  seen.add(text);
  lastGlitchAt = now;
  const strip = h('div', 'crash-glitch');
  strip.setAttribute('role', 'status');
  const msg = h('div', 'cg-msg');
  msg.append(h('b', '', 'Something slipped a gear.'), h('span', '', ' The game kept going; reload if anything looks off.'));
  const reload = h('button', 'cg-btn', 'Reload');
  reload.onclick = () => location.reload();
  const close = h('button', 'cg-x', '✕');
  close.setAttribute('aria-label', 'Dismiss');
  close.onclick = () => {
    strip.remove();
    glitchEl = null;
  };
  strip.append(msg, reload, close);
  document.body.append(strip);
  glitchEl = strip;
}

/** The game cannot continue: replace everything with one clear way forward. */
export function reportWreck(
  e: unknown,
  headline = 'Run aground',
  message = 'Something broke and the game had to stop. Your saved progress is safe. Reloading usually puts you back at sea.',
) {
  console.error(e);
  if (wrecked || typeof document === 'undefined') return;
  wrecked = true;
  glitchEl?.remove();
  document.getElementById('loading')?.remove();
  const wrap = h('div', 'crash-wreck');
  wrap.setAttribute('role', 'alertdialog');
  wrap.setAttribute('aria-labelledby', 'crashTitle');
  const card = h('div', 'cw-card');
  const title = h('div', 'cw-title', headline);
  title.id = 'crashTitle';
  const body = h('p', 'cw-body', message);
  const reload = h('button', 'btn cw-reload', 'Reload');
  reload.onclick = () => location.reload();
  const details = h('details', 'cw-details');
  const detailText = `${errorText(e)}\n${navigator.userAgent}`;
  details.append(h('summary', '', 'Error details'), h('pre', '', detailText));
  card.append(title, body, reload, details);
  wrap.append(card);
  document.body.append(wrap);
  reload.focus();
}

/** Window-level nets for anything thrown outside the game loop (event handlers, timers, promises). */
// They only ever raise a glitch: an error thrown off to the side doesn't stop the boot or the loop, and the two
// places that can (main.ts's boot promise, the game loop) report a wreck themselves.
export function installCrashGuard() {
  window.addEventListener('error', (ev) => {
    // resource load failures arrive here too (no message, target is an element): the asset loader reports those itself
    if (!(ev instanceof ErrorEvent)) return;
    if (!isReportable(ev.message, ev.filename)) return;
    reportGlitch(ev.error ?? ev.message);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const text = errorText(ev.reason);
    if (!isReportable(text)) return;
    reportGlitch(ev.reason);
  });
}

/**
 * Run one frame of the game loop. One bad frame is a glitch and the loop goes on;
 * if frames keep throwing (about half a second solid) the game is wrecked and the loop stops.
 * Returns false when the loop should stop.
 */
export function guardFrame(step: () => void, state: { fails: number }, limit = 30): boolean {
  try {
    step();
    state.fails = 0;
    return true;
  } catch (e) {
    state.fails++;
    if (state.fails >= limit) {
      reportWreck(e);
      return false;
    }
    if (state.fails === 1) reportGlitch(e);
    return true;
  }
}
