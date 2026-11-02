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

export function drawTreasureMap(canvas: HTMLCanvasElement, map: TreasureMapDef, owned: string[]) {
  const W = 480, H = 360;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  parchment(ctx, W, H, map.id.length * 13);
  const isl = ISLAND_MAP[map.island];
  const span = isl.r * 1.5;
  const scale = (H * 0.84) / (span * 2);
  const cx = W / 2, cy = H / 2 + 8;
  const toPx = (x: number, z: number) => [cx + (x - isl.x) * scale, cy + (z - isl.z) * scale] as const;
  // coastline: shade land, hatch shallows
  const res = 3;
  for (let py = 0; py < H; py += res) {
    for (let px = 0; px < W; px += res) {
      const x = isl.x + (px - cx) / scale;
      const z = isl.z + (py - cy) / scale;
      const h = heightAt(x, z);
      if (h > 0.4) {
        ctx.fillStyle = h > 4 ? 'rgba(120,140,70,0.35)' : 'rgba(170,140,80,0.28)';
        ctx.fillRect(px, py, res, res);
      } else if (h > -2.5 && (px + py) % 9 === 0) {
        ctx.fillStyle = 'rgba(60,110,140,0.35)';
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }
  }
  // outline
  ctx.fillStyle = '#4a2e14';
  for (let py = 0; py < H; py += 2) {
    for (let px = 0; px < W; px += 2) {
      const x = isl.x + (px - cx) / scale;
      const z = isl.z + (py - cy) / scale;
      const a = heightAt(x, z) > 0.4;
      const b = heightAt(x + 2 / scale, z) > 0.4;
      const c = heightAt(x, z + 2 / scale) > 0.4;
      if (a !== b || a !== c) ctx.fillRect(px, py, 2, 2);
    }
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

/** World chart: islands, drowned cities, settlements, salvage beacons, raider waters, the swell and the Stormwall. */
export function drawWorldChart(canvas: HTMLCanvasElement, visited: string[], ship: { x: number; z: number; heading: number }, target?: { x: number; z: number } | null, ex?: ChartExtras) {
  const W = 480, H = 480;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  parchment(ctx, W, H, 3);
  const half = 1120;
  const scale = W / (half * 2);
  const toPx = (x: number, z: number) => [(x + half) * scale, (z + half - 40) * scale] as const;
  // the Stormwall
  {
    const [cx, cy] = toPx(WORLD.shallowsCenter.x, WORLD.shallowsCenter.z);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(cx, cy, WORLD.stormRadius * scale, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(60,74,92,0.28)';
    ctx.fill('evenodd');
    ctx.restore();
    ctx.strokeStyle = 'rgba(60,74,92,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, WORLD.stormRadius * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,50,64,0.9)';
    ctx.font = 'italic bold 12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('~ THE STORMWALL ~', cx, cy - WORLD.stormRadius * scale + 16);
  }
  if (ex) {
    // drowned buildings (ink squares) and raider waters
    for (const r of ex.raiders) {
      const [px, py] = toPx(r.x, r.z);
      ctx.fillStyle = 'rgba(200,53,42,0.12)';
      ctx.strokeStyle = 'rgba(200,53,42,0.55)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px, py, r.r * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const st of ex.structures) {
      const [px, py] = toPx(st.x, st.z);
      ctx.fillStyle = 'rgba(40,48,58,0.75)';
      const sz = st.kind === 'container' ? 2 : st.kind === 'oil_rig' || st.kind === 'tanker' || st.kind === 'mega_spire' ? 6 : 4;
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
  }
  // swell boundary
  const [sx, sy] = toPx(WORLD.shallowsCenter.x, WORLD.shallowsCenter.z);
  ctx.strokeStyle = 'rgba(40,70,120,0.5)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, WORLD.shallowsRadius * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(40,70,120,0.7)';
  ctx.font = 'italic 12px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('~ the open swell · the Sunken Reach beyond ~', sx, sy - WORLD.shallowsRadius * scale - 6);
  // reef
  const [rx, ry] = toPx(WORLD.reef.x, WORLD.reef.z);
  ctx.strokeStyle = 'rgba(200,80,60,0.6)';
  ctx.lineWidth = 3;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(rx, ry, WORLD.reef.r * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const isl of ISLANDS) {
    const known = visited.includes(isl.id) || isl.region === 'shallows';
    const [px, py] = toPx(isl.x, isl.z);
    ctx.fillStyle = known ? 'rgba(150,130,70,0.55)' : 'rgba(90,70,40,0.2)';
    ctx.beginPath();
    ctx.arc(px, py, Math.max(4, isl.r * scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a2e14';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#4a2e14';
    ctx.font = 'bold 10px Georgia';
    if (isl.id !== 'harbor') ctx.fillText(known ? isl.name : '???', px, py + Math.max(4, isl.r * scale) + 11);
  }
  if (ex) {
    ctx.textAlign = 'center';
    for (const p of ex.pois) {
      if (!ex.flags.includes(`seen_${p.id}`) && p.id !== 'hollow') continue;
      const [px, py] = toPx(p.x, p.z);
      ctx.fillStyle = '#2b3542';
      ctx.font = 'italic bold 12px Georgia';
      ctx.fillText(p.name, px, py - 12);
    }
    for (const s of ex.sites) {
      const [px, py] = toPx(s.x, s.z);
      ctx.fillStyle = s.ready ? '#e0a20f' : 'rgba(224,162,15,0.35)';
      ctx.beginPath();
      ctx.moveTo(px, py - 5);
      ctx.lineTo(px + 5, py);
      ctx.lineTo(px, py + 5);
      ctx.lineTo(px - 5, py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4a2e14';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (const s of ex.settlements) {
      const [px, py] = toPx(s.x, s.z);
      ctx.fillStyle = s.visited ? '#3e8c80' : 'rgba(62,140,128,0.4)';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#173c37';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#173c37';
      ctx.font = 'bold 11px Georgia';
      ctx.fillText(s.name, px, py + 17);
    }
    for (const c of ex.castaways) {
      const [px, py] = toPx(c.x, c.z);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#c8352a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // legend
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px Georgia';
    const lg: [string, string][] = [['#e0a20f', 'salvage'], ['#3e8c80', 'settlement'], ['#c8352a', 'raiders / castaway'], ['#2b3542', 'drowned towers']];
    lg.forEach(([c, t], i) => {
      ctx.fillStyle = c;
      ctx.fillRect(14, H - 62 + i * 13, 8, 8);
      ctx.fillStyle = '#2b3542';
      ctx.fillText(t, 26, H - 54 + i * 13);
    });
  }
  if (target) {
    const [tx, ty] = toPx(target.x, target.z);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tx - 6, ty - 6);
    ctx.lineTo(tx + 6, ty + 6);
    ctx.moveTo(tx + 6, ty - 6);
    ctx.lineTo(tx - 6, ty + 6);
    ctx.stroke();
  }
  // ship marker
  const [bx, by] = toPx(ship.x, ship.z);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-ship.heading + Math.PI);
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 7);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  compassRose(ctx, W - 36, 40, 14);
}
