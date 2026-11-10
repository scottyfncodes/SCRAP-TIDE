// Before/after sheets for docs/jury-rigged from scripts/jury-shots.mjs output (ImageMagick `convert` required).
//
//   node scripts/jury-compose.mjs <shots folder> <docs folder>
//
// For every viewport and frame: one sheet with the four lighting keys as rows, default look left, ?look=jury right.
// Also single noon before/after pairs, downscaled JPEGs, so the PR and the docs stay light.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [shots, docs] = [resolve(process.argv[2] ?? 'jury-shots'), resolve(process.argv[3] ?? 'docs/jury-rigged/screens')];
mkdirSync(docs, { recursive: true });
const CONDS = ['noon', 'dusk', 'night', 'storm'];
const im = (...a) => execFileSync('convert', a, { stdio: 'inherit' });
const label = (src, text, w) => {
  const outp = `${src}.lbl.png`;
  im(src, '-resize', `${w}x`, '-gravity', 'North', '-background', '#10384a', '-fill', '#ece0c2', '-font', 'DejaVu-Sans-Bold', '-pointsize', String(Math.round(w / 22)), '-splice', `0x${Math.round(w / 12)}`, '-annotate', '+0+8', text, outp);
  return outp;
};
for (const vp of ['phone', 'desktop']) {
  const w = vp === 'phone' ? 360 : 640;
  for (const shot of ['toll', 'driftholm', 'raiders', 'foot']) {
    const rows = [];
    for (const c of CONDS) {
      const a = join(shots, `default-${vp}-${shot}-${c}.png`), b = join(shots, `jury-${vp}-${shot}-${c}.png`);
      if (!existsSync(a) || !existsSync(b)) continue;
      const row = join(shots, `row-${vp}-${shot}-${c}.png`);
      im(label(a, `BEFORE · ${c}`, w), label(b, `AFTER · ?look=jury · ${c}`, w), '+append', row);
      rows.push(row);
      if (c === 'noon') im(row, '-quality', '84', join(docs, `${vp}-${shot}_noon_before-after.jpg`));
    }
    if (rows.length) im(...rows, '-append', '-quality', '82', join(docs, `${vp}-${shot}_4-keys_before-after.jpg`));
  }
}
console.log('sheets written to', docs);
