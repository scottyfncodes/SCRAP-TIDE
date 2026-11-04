// Hand-drawn parchment treasure maps rendered from the real island heightfield + landmark data,
// so what you see on the map is exactly what you find on the island.
import { heightAt } from '../world/terrain';
import { ISLAND_MAP, ISLANDS, WORLD, type TreasureMapDef, type LandmarkType } from '../data/world';
import { RNG } from '../core/noise';

function parchment(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rng = new RNG(seed);
  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.75);
  g.addColorStop(0, '#f5e6c4');
  g.addColorStop(0.7, '#e8d09f');
  g.addColorStop(1, '#c9a46a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(120,80,30,${rng.range(0.02, 0.07)})`;
    ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(1, 3), rng.range(1, 3));
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(140,90,40,${rng.range(0.04, 0.08)})`;
    ctx.beginPath();
    ctx.arc(rng.range(0, w), rng.range(0, h), rng.range(10, 40), 0, Math.PI * 2);
    ctx.fill();
  }
}

function glyph(ctx: CanvasRenderingContext2D, type: LandmarkType, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#4a2e14';
  ctx.fillStyle = '#4a2e14';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const palm = (dx: number, lean: number) => {
    ctx.beginPath();
    ctx.moveTo(dx, 10 * s);
    ctx.quadraticCurveTo(dx + lean * 0.5, 0, dx + lean, -12 * s);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.6;
      ctx.beginPath();
      ctx.moveTo(dx + lean, -12 * s);
      ctx.quadraticCurveTo(dx + lean + Math.cos(a) * 8 * s, -12 * s + Math.sin(a) * 6 * s - 3, dx + lean + Math.cos(a) * 12 * s, -12 * s + Math.sin(a) * 4 * s + 4);
      ctx.stroke();
    }
  };
  switch (type) {
    case 'twin_palms':
      palm(-4 * s, -5 * s);
      palm(4 * s, 5 * s);
      break;
    case 'big_palm':
      ctx.scale(1.4, 1.4);
      palm(0, 3 * s);
      break;
    case 'skull_rock':
      ctx.beginPath();
      ctx.arc(0, -2 * s, 10 * s, Math.PI, 0);
      ctx.lineTo(7 * s, 8 * s);
      ctx.lineTo(-7 * s, 8 * s);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-4 * s, -1 * s, 2.6 * s, 0, Math.PI * 2);
      ctx.arc(4 * s, -1 * s, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 2.5 * s, 5 * s);
        ctx.lineTo(i * 2.5 * s, 8 * s);
        ctx.stroke();
      }
      break;
    case 'lighthouse':
      ctx.beginPath();
      ctx.moveTo(-5 * s, 12 * s);
      ctx.lineTo(-3 * s, -10 * s);
      ctx.lineTo(3 * s, -10 * s);
      ctx.lineTo(5 * s, 12 * s);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4 * s, -10 * s);
      ctx.lineTo(0, -16 * s);
      ctx.lineTo(4 * s, -10 * s);
      ctx.stroke();
      for (const a of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(6 * s, -12 * s);
        ctx.lineTo(16 * s, -12 * s + a * 14 * s);
        ctx.stroke();
      }
      break;
    case 'arch':
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-9 * s, 10 * s);
      ctx.lineTo(-9 * s, -2 * s);
      ctx.arc(0, -2 * s, 9 * s, Math.PI, 0);
      ctx.lineTo(9 * s, 10 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -11 * s, 3 * s, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'pillars':
      for (const dx of [-7, 0, 7]) {
        ctx.strokeRect((dx - 2) * s, -8 * s + Math.abs(dx) * 0.5 * s, 4 * s, 18 * s - Math.abs(dx) * 0.5 * s);
      }
      break;
    case 'waterfall':
      ctx.beginPath();
      ctx.moveTo(-10 * s, -8 * s);
      ctx.lineTo(10 * s, -8 * s);
      ctx.stroke();
      for (const dx of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(dx * s, -8 * s);
        ctx.bezierCurveTo((dx + 2) * s, 0, (dx - 2) * s, 4 * s, dx * s, 10 * s);
        ctx.stroke();
      }
      break;
    case 'wreck':
      ctx.beginPath();
      ctx.moveTo(-12 * s, 2 * s);
      ctx.quadraticCurveTo(0, 12 * s, 12 * s, 2 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 4 * s);
      ctx.lineTo(6 * s, -12 * s);
      ctx.stroke();
      break;
    case 'hut':
      ctx.strokeRect(-6 * s, -2 * s, 12 * s, 10 * s);
      ctx.beginPath();
      ctx.moveTo(-8 * s, -2 * s);
      ctx.lineTo(0, -10 * s);
      ctx.lineTo(8 * s, -2 * s);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 6 * s, 0, Math.PI * 2);
      ctx.stroke();
  }
  ctx.restore();
}

function compassRose(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#4a2e14';
  ctx.fillStyle = '#4a2e14';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.2);
    ctx.lineTo(r * 0.22, 0);
    ctx.lineTo(-r * 0.22, 0);
    ctx.closePath();
    i === 3 ? ctx.fill() : ctx.stroke();
  }
  ctx.font = `bold ${r * 0.7}px Georgia`;
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -r * 1.35);
  ctx.restore();
}

function tornEdge(ctx: CanvasRenderingContext2D, x: number, h: number, seed: number, keepLeft: boolean) {
  const rng = new RNG(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(x, 0);
  let cx = x;
  for (let y = 0; y <= h; y += 10) {
    cx = x + rng.range(-10, 10);
    ctx.lineTo(cx, y);
  }
  if (keepLeft) {
    ctx.lineTo(9999, h);
    ctx.lineTo(9999, 0);
  } else {
    ctx.lineTo(-10, h);
    ctx.lineTo(-10, 0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** `pxRatio` renders the parchment at a higher resolution (the zoomable panel uses 2) with a finer coastline. */
export function drawTreasureMap(canvas: HTMLCanvasElement, map: TreasureMapDef, owned: string[], pxRatio = 1) {
  const W = 480, H = 360;
  canvas.width = W * pxRatio;
  canvas.height = H * pxRatio;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(pxRatio, pxRatio);
  ctx.clearRect(0, 0, W, H);
  parchment(ctx, W, H, map.id.length * 13);
  const isl = ISLAND_MAP[map.island];
  const span = isl.r * 1.5;
  const scale = (H * 0.84) / (span * 2);
  const cx = W / 2, cy = H / 2 + 8;
  const toPx = (x: number, z: number) => [cx + (x - isl.x) * scale, cy + (z - isl.z) * scale] as const;
  // coastline: one height grid feeds the land shading, the shallows hatching and the ink outline
  const res = pxRatio >= 2 ? 1.5 : 3;
  const gw = Math.ceil(W / res), gh = Math.ceil(H / res);
  const grid = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++)
    for (let i = 0; i < gw; i++) grid[j * gw + i] = heightAt(isl.x + (i * res - cx) / scale, isl.z + (j * res - cy) / scale);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const h = grid[j * gw + i];
      const px = i * res, py = j * res;
      if (h > 0.4) {
        ctx.fillStyle = h > 4 ? 'rgba(120,140,70,0.35)' : 'rgba(170,140,80,0.28)';
        ctx.fillRect(px, py, res, res);
      } else if (h > -2.5 && (i + j) % 3 === 0 && (Math.round(px) + Math.round(py)) % 9 < 3) {
        ctx.fillStyle = 'rgba(60,110,140,0.35)';
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }
  }
  ctx.fillStyle = '#4a2e14';
  for (let j = 0; j < gh - 1; j++)
    for (let i = 0; i < gw - 1; i++) {
      const a = grid[j * gw + i] > 0.4;
      if (a !== grid[j * gw + i + 1] > 0.4 || a !== grid[(j + 1) * gw + i] > 0.4) ctx.fillRect(i * res, j * res, res * 1.2, res * 1.2);
    }
  // landmarks
  for (const l of isl.landmarks) {
    if (!map.landmarks.includes(l.type)) continue;
    const [px, py] = toPx(isl.x + l.x, isl.z + l.z);
    glyph(ctx, l.type, px, py, 1.1);
  }
  // dotted trail from beach + X
  const [xx, xy] = toPx(isl.x + map.x, isl.z + map.z);
  ctx.strokeStyle = '#7a3a1a';
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, H - 20);
  ctx.bezierCurveTo(cx + 40, H - 80, xx - 50, xy + 60, xx, xy + 10);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(xx - 8, xy - 8);
  ctx.lineTo(xx + 8, xy + 8);
  ctx.moveTo(xx + 8, xy - 8);
  ctx.lineTo(xx - 8, xy + 8);
  ctx.stroke();
  compassRose(ctx, W - 40, 50, 16);
  ctx.fillStyle = '#4a2e14';
  ctx.font = 'italic bold 18px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(map.name, 16, 28);
  // vignette border
  ctx.strokeStyle = 'rgba(90,50,20,0.6)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // Missing pieces are torn away.
  if (map.fragments.length === 2) {
    const [a, b] = map.fragments;
    if (!owned.includes(a)) tornEdge(ctx, W / 2, H, 7, false);
    if (!owned.includes(b)) tornEdge(ctx, W / 2, H, 7, true);
  }
}

export interface ChartExtras {
  flags: string[];
  sites: { x: number; z: number; name: string; ready: boolean; region: string }[];
  settlements: { x: number; z: number; name: string; visited: boolean }[];
  castaways: { x: number; z: number }[];
  structures: { x: number; z: number; kind: string }[];
  raiders: { x: number; z: number; r: number; name: string }[];
  pois: { id: string; x: number; z: number; name: string }[];
}

// ───────── World chart (zoomable) ─────────

/** The charted world in world units (x east, z south): the Stormwall and a margin of open sea around it. */
export const CHART_BOUNDS = { x0: -1120, z0: -1080, x1: 1120, z1: 1160 };

interface LandLayer {
  id: string;
  canvas: HTMLCanvasElement;
  x0: number;
  z0: number;
  size: number; // world units covered
  ready: boolean;
}
let landLayers: LandLayer[] | null = null;
let baking = false;

function layerFor(isl: (typeof ISLANDS)[number]): LandLayer {
  const size = Math.ceil(isl.r * 2.7);
  const c = document.createElement('canvas');
  // ~2 px per metre for small islands, capped at 360 px (Driftholm ≈ 1.2 px/m)
  c.width = c.height = Math.min(360, size * 2);
  return { id: isl.id, canvas: c, x0: isl.x - size / 2, z0: isl.z - size / 2, size, ready: false };
}

function chartLayers(): LandLayer[] {
  if (!landLayers) landLayers = ISLANDS.map(layerFor);
  return landLayers;
}

/**
 * Bake each island's real coastline, shallows and contour lines from the heightfield, a few rows at a time
 * (~10 ms slices) so opening the chart never stalls a frame. `onProgress` repaints as each island lands.
 */
export function bakeChartLayers(onProgress: () => void) {
  if (baking || chartLayers().every((l) => l.ready)) return;
  baking = true;
  const jobs = chartLayers().filter((l) => !l.ready);
  let li = 0, row = 0;
  let hs: Float32Array | null = null;
  const step = () => {
    const t0 = performance.now();
    while (li < jobs.length && performance.now() - t0 < 10) {
      const L = jobs[li];
      const n = L.canvas.width, k = L.size / n;
      if (!hs) hs = new Float32Array(n * n);
      for (let i = 0; i < n; i++) hs[row * n + i] = heightAt(L.x0 + (i + 0.5) * k, L.z0 + (row + 0.5) * k);
      if (++row < n) continue;
      paintLayer(L, hs);
      L.ready = true;
      li++;
      row = 0;
      hs = null;
      onProgress();
    }
    if (li < jobs.length) setTimeout(step, 0);
    else baking = false;
  };
  setTimeout(step, 0);
}

function paintLayer(L: LandLayer, hs: Float32Array) {
  const n = L.canvas.width;
  const ctx = L.canvas.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  const d = img.data;
  const at = (i: number, j: number) => hs[clampI(j, n) * n + clampI(i, n)];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const h = hs[j * n + i];
      const o = (j * n + i) * 4;
      const land = h > 0.4;
      const edge = land && (at(i - 1, j) <= 0.4 || at(i + 1, j) <= 0.4 || at(i, j - 1) <= 0.4 || at(i, j + 1) <= 0.4);
      const band = Math.floor(h / 3);
      const contour = land && h > 3 && (Math.floor(at(i + 1, j) / 3) !== band || Math.floor(at(i, j + 1) / 3) !== band);
      let r = 0, g = 0, b = 0, a = 0;
      if (edge) [r, g, b, a] = [74, 46, 20, 235];
      else if (contour) [r, g, b, a] = [120, 84, 44, 120];
      else if (land) {
        const t = Math.min(1, h / 14);
        [r, g, b, a] = [205 - t * 45, 182 - t * 52, 132 - t * 50, 200];
      } else if (h > -1.6) {
        // shallows: a pale wash with fine hatching
        const hatch = (i + j) % 5 === 0;
        [r, g, b, a] = hatch ? [70, 100, 110, 70] : [110, 140, 140, 38];
      }
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = b;
      d[o + 3] = a;
    }
  ctx.putImageData(img, 0, 0);
}
const clampI = (i: number, n: number) => (i < 0 ? 0 : i >= n ? n - 1 : i);

let parchmentTile: HTMLCanvasElement | null = null;
function parchmentPattern(ctx: CanvasRenderingContext2D) {
  if (!parchmentTile) {
    parchmentTile = document.createElement('canvas');
    parchmentTile.width = parchmentTile.height = 256;
    const pc = parchmentTile.getContext('2d')!;
    pc.fillStyle = '#ead6a8';
    pc.fillRect(0, 0, 256, 256);
    const rng = new RNG(7);
    for (let i = 0; i < 700; i++) {
      pc.fillStyle = `rgba(120,80,30,${rng.range(0.02, 0.07)})`;
      pc.fillRect(rng.range(0, 256), rng.range(0, 256), rng.range(1, 3), rng.range(1, 3));
    }
  }
  return ctx.createPattern(parchmentTile, 'repeat')!;
}

/** a label below its mark at (x, y); with an anchor (ax, ay, r) it may move above, right or left of the mark to fit */
type Label = { text: string; x: number; y: number; font: string; color: string; pri: number; halo?: boolean; ax?: number; ay?: number; r?: number };

/** Place labels by priority and drop any that would collide with one already placed. */
function drawLabels(ctx: CanvasRenderingContext2D, labels: Label[], W: number, H: number, reserved: { x0: number; y0: number; x1: number; y1: number }[] = []) {
  const placed = [...reserved];
  labels.sort((a, b) => b.pri - a.pri);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const l of labels) {
    ctx.font = l.font;
    const w = ctx.measureText(l.text).width;
    const hgt = parseInt(l.font.match(/(\d+)px/)?.[1] ?? '11', 10);
    const spots: [number, number][] = [[l.x, l.y]];
    if (l.ax !== undefined && l.ay !== undefined) {
      const r = (l.r ?? 6) + 4;
      spots.push([l.ax, 2 * l.ay - l.y], [l.ax + r + w / 2, l.ay], [l.ax - r - w / 2, l.ay]);
    }
    let r: { x0: number; y0: number; x1: number; y1: number } | null = null;
    for (const [sx, sy] of spots) {
      // keep a label that is partly off the edge inside the frame (if its anchor is on screen)
      const x = sx > 0 && sx < W ? Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, sx)) : sx;
      const c = { x0: x - w / 2 - 3, y0: sy - hgt / 2 - 2, x1: x + w / 2 + 3, y1: sy + hgt / 2 + 2 };
      if (c.x1 < 0 || c.x0 > W || c.y1 < 0 || c.y0 > H) continue;
      if (placed.some((p) => c.x0 < p.x1 && c.x1 > p.x0 && c.y0 < p.y1 && c.y1 > p.y0)) continue;
      r = c;
      l.x = x;
      l.y = sy;
      break;
    }
    if (!r) continue;
    placed.push(r);
    if (l.halo !== false) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(240,226,190,0.85)';
      ctx.strokeText(l.text, l.x, l.y);
    }
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, l.x, l.y);
  }
  ctx.textBaseline = 'alphabetic';
}

function scaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // the largest round distance that fits in ~90 px
  const steps = [10, 20, 50, 100, 200, 500, 1000];
  const m = steps.filter((d) => d * s <= 90).pop() ?? 10;
  const w = m * s;
  ctx.fillStyle = 'rgba(240,226,190,0.8)';
  ctx.fillRect(x - 4, y - 14, w + 8, 20);
  ctx.strokeStyle = '#4a2e14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y - 4);
  ctx.stroke();
  ctx.fillStyle = '#4a2e14';
  ctx.font = 'bold 10px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(`${m} m`, x + w / 2, y - 4);
}

/** World chart at any zoom: islands with real coastlines, drowned cities, settlements, salvage beacons, raider waters,
 *  the swell and the Stormwall. Marks and text stay a constant size on screen; labels never overlap. */
export function paintWorldChart(ctx: CanvasRenderingContext2D, W: number, H: number, view: { x0: number; z0: number; s: number; zoom: number },
  visited: string[], ship: { x: number; z: number; heading: number }, target?: { x: number; z: number } | null, ex?: ChartExtras) {
  const s = view.s;
  const P = (x: number, z: number) => [(x - view.x0) * s, (z - view.z0) * s] as const;
  const zk = Math.min(1.6, 0.85 + view.zoom * 0.08); // marks grow a little as you zoom in
  ctx.fillStyle = parchmentPattern(ctx);
  ctx.fillRect(0, 0, W, H);
  // age stains in world space so they travel with the map
  {
    const rng = new RNG(3);
    for (let i = 0; i < 10; i++) {
      const [px, py] = P(rng.range(CHART_BOUNDS.x0, CHART_BOUNDS.x1), rng.range(CHART_BOUNDS.z0, CHART_BOUNDS.z1));
      ctx.fillStyle = `rgba(140,90,40,${rng.range(0.035, 0.07)})`;
      ctx.beginPath();
      ctx.arc(px, py, rng.range(60, 180) * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const labels: Label[] = [];
  // the Stormwall: everything beyond it is shaded
  const [cx, cy] = P(WORLD.shallowsCenter.x, WORLD.shallowsCenter.z);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(cx, cy, WORLD.stormRadius * s, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(60,74,92,0.28)';
  ctx.fill('evenodd');
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,74,92,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, WORLD.stormRadius * s, 0, Math.PI * 2);
  ctx.stroke();
  labels.push({ text: '~ THE STORMWALL ~', x: cx, y: cy - WORLD.stormRadius * s + 14, font: 'italic bold 12px Georgia', color: 'rgba(40,50,64,0.95)', pri: 0 });
  if (ex) {
    for (const r of ex.raiders) {
      const [px, py] = P(r.x, r.z);
      ctx.fillStyle = 'rgba(200,53,42,0.12)';
      ctx.strokeStyle = 'rgba(200,53,42,0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px, py, r.r * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      if (view.zoom > 1.6) labels.push({ text: r.name, x: px, y: py + r.r * s - 12, font: 'italic 11px Georgia', color: '#8f2a20', pri: 1 });
    }
  }
  // swell boundary and the reef
  ctx.strokeStyle = 'rgba(40,70,120,0.5)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, WORLD.shallowsRadius * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  labels.push({ text: '~ the open swell · the Sunken Reach beyond ~', x: cx, y: cy - WORLD.shallowsRadius * s - 8, font: 'italic 11px Georgia', color: 'rgba(40,70,120,0.85)', pri: 0 });
  const [rx, ry] = P(WORLD.reef.x, WORLD.reef.z);
  ctx.strokeStyle = 'rgba(200,80,60,0.6)';
  ctx.lineWidth = 3;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(rx, ry, WORLD.reef.r * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // islands: the baked coastline; unexplored ones are a faint smudge with no name
  const layers = chartLayers();
  const settled = new Set((ex?.settlements ?? []).map((st) => st.name));
  ctx.imageSmoothingEnabled = true;
  for (const isl of ISLANDS) {
    const known = visited.includes(isl.id) || isl.region === 'shallows';
    const L = layers.find((l) => l.id === isl.id)!;
    const [px, py] = P(L.x0, L.z0);
    const sz = L.size * s;
    if (px > W || py > H || px + sz < 0 || py + sz < 0) continue;
    ctx.globalAlpha = known ? 1 : 0.3;
    if (!L.ready) {
      // coastline still baking (first open only): the island's footprint
      const [ix, iy] = P(isl.x, isl.z);
      ctx.fillStyle = 'rgba(190,165,110,0.75)';
      ctx.strokeStyle = '#4a2e14';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ix, iy, Math.max(3, isl.r * s * 0.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (sz < 7) {
      // too small for a coastline at this zoom: a dot
      const [ix, iy] = P(isl.x, isl.z);
      ctx.fillStyle = 'rgba(150,130,70,0.7)';
      ctx.beginPath();
      ctx.arc(ix, iy, 3, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.drawImage(L.canvas, px, py, sz, sz);
    ctx.globalAlpha = 1;
    if (isl.id === 'harbor' || settled.has(isl.name)) continue; // the settlement label names it
    const [ix, iy] = P(isl.x, isl.z);
    const ir = Math.max(6, isl.r * s * 0.75);
    labels.push({ text: known ? isl.name : '???', x: ix, y: iy + ir + 9, font: 'bold 11px Georgia', color: '#4a2e14', pri: 2, ax: ix, ay: iy, r: ir });
  }
  if (ex) {
    for (const st of ex.structures) {
      const [px, py] = P(st.x, st.z);
      if (px < -10 || py < -10 || px > W + 10 || py > H + 10) continue;
      const base = st.kind === 'container' ? 2 : st.kind === 'oil_rig' || st.kind === 'tanker' || st.kind === 'mega_spire' ? 6 : 4;
      const sz = Math.max(base * zk, (st.kind === 'container' ? 6 : 16) * s);
      ctx.fillStyle = 'rgba(40,48,58,0.75)';
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
    for (const p of ex.pois) {
      if (!ex.flags.includes(`seen_${p.id}`) && p.id !== 'hollow') continue;
      if (settled.has(p.name)) continue; // the settlement marker already names it
      const [px, py] = P(p.x, p.z);
      labels.push({ text: p.name, x: px, y: py - 14, font: 'italic bold 12px Georgia', color: '#2b3542', pri: 1 });
    }
    for (const site of ex.sites) {
      const [px, py] = P(site.x, site.z);
      const r = 5 * zk;
      ctx.fillStyle = site.ready ? '#e0a20f' : 'rgba(224,162,15,0.35)';
      ctx.beginPath();
      ctx.moveTo(px, py - r);
      ctx.lineTo(px + r, py);
      ctx.lineTo(px, py + r);
      ctx.lineTo(px - r, py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4a2e14';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (view.zoom > 2.5) labels.push({ text: site.name, x: px, y: py + r + 9, font: '10px Georgia', color: '#6b4a12', pri: 0.5 });
    }
    for (const st of ex.settlements) {
      const [px, py] = P(st.x, st.z);
      const r = 6 * zk;
      ctx.fillStyle = st.visited ? '#3e8c80' : 'rgba(62,140,128,0.45)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#173c37';
      ctx.lineWidth = 2;
      ctx.stroke();
      labels.push({ text: st.name, x: px, y: py + r + 10, font: 'bold 12px Georgia', color: '#173c37', pri: 3, ax: px, ay: py, r });
    }
    for (const c of ex.castaways) {
      const [px, py] = P(c.x, c.z);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#c8352a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 4 * zk, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (target) {
    const [tx, ty] = P(target.x, target.z);
    const r = 6 * zk;
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tx - r, ty - r);
    ctx.lineTo(tx + r, ty + r);
    ctx.moveTo(tx + r, ty - r);
    ctx.lineTo(tx - r, ty + r);
    ctx.stroke();
  }
  // your boat, always on top; labels keep clear of it
  const [bx, by] = P(ship.x, ship.z);
  drawLabels(ctx, labels, W, H, [{ x0: bx - 11, y0: by - 11, x1: bx + 11, y1: by + 11 }]);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-ship.heading + Math.PI);
  ctx.fillStyle = '#c0392b';
  ctx.strokeStyle = 'rgba(255,240,210,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(7, 8);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  // screen furniture: compass, scale, legend
  compassRose(ctx, W - 30, 34, 13);
  scaleBar(ctx, 12, H - 12, s);
  if (ex && view.zoom < 1.5 && W >= 320) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px Georgia';
    const lg: [string, string][] = [['#e0a20f', 'salvage'], ['#3e8c80', 'settlement'], ['#c8352a', 'raiders / castaway'], ['#2b3542', 'drowned towers']];
    ctx.fillStyle = 'rgba(240,226,190,0.8)';
    ctx.fillRect(8, H - 92, 122, 58);
    lg.forEach(([c, t], i) => {
      ctx.fillStyle = c;
      ctx.fillRect(14, H - 86 + i * 13, 8, 8);
      ctx.fillStyle = '#2b3542';
      ctx.fillText(t, 26, H - 78 + i * 13);
    });
  }
  // a worn border
  ctx.strokeStyle = 'rgba(90,50,20,0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);
}
