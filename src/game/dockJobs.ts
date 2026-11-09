// Dock contracts (loop pass Phase 2): three rotating jobs on the dock board, each with a clear reward. A finished
// job pays out the next time you dock, and its slot is refilled with a new one. Pure data in and out, seeded, so
// tests can check it and the same seed always deals the same board.
import { RNG } from '../core/noise';

export type JobKind = 'hauls' | 'bank' | 'perfect' | 'rare' | 'deliver' | 'harpoon';
export interface Job {
  id: string; // unique per deal
  kind: JobKind;
  n: number; // target
  item?: string; // for deliver
  progress: number;
  reward: number; // gold
  done: boolean;
}

const DELIVER = ['scrap_metal', 'rope', 'wire', 'plastic', 'canvas', 'fish', 'driftwood', 'iron_nails'];

export function jobText(j: Job, itemName: (id: string) => string = (id) => id): string {
  switch (j.kind) {
    case 'hauls': return `Make ${j.n} hauls in one trip`;
    case 'bank': return `Bank a hold worth ${j.n}g`;
    case 'perfect': return `Land ${j.n} perfect pulls`;
    case 'rare': return `Haul up a Rare or better find`;
    case 'deliver': return `Bank ${j.n} ${itemName(j.item!)}`;
    case 'harpoon': return `Land ${j.n} harpoon shots`;
  }
}

/** Deal one job. `level` (0..) scales targets and rewards with progress (number of vessels, upgrades). */
export function dealJob(seed: number, serial: number, level: number, avoid: JobKind[] = []): Job {
  const rng = new RNG((seed * 9301 + serial * 49297) % 233280 || 1);
  const kinds: JobKind[] = (['hauls', 'bank', 'perfect', 'rare', 'deliver', 'harpoon'] as JobKind[]).filter((k) => !avoid.includes(k));
  const kind = kinds[Math.floor(rng.next() * kinds.length)] ?? 'hauls';
  const L = Math.max(0, level);
  let n = 1, reward = 30, item: string | undefined;
  switch (kind) {
    case 'hauls': n = 2 + Math.min(2, Math.floor(L / 3)); reward = 35 + 12 * n + 6 * L; break;
    case 'bank': n = Math.round((60 + 40 * L) / 10) * 10; reward = Math.round(n * 0.35); break;
    case 'perfect': n = 2 + Math.floor(rng.next() * 2); reward = 30 + 15 * n; break;
    case 'rare': n = 1; reward = 70 + 10 * L; break;
    case 'deliver': item = DELIVER[Math.floor(rng.next() * DELIVER.length)]; n = 4 + Math.floor(rng.next() * 4) + L; reward = 25 + 6 * n; break;
    case 'harpoon': n = 2; reward = 50 + 5 * L; break;
  }
  return { id: `j${seed}_${serial}`, kind, n, item, progress: 0, reward, done: false };
}

/** A full board of three different kinds. */
export function dealBoard(seed: number, startSerial: number, level: number): Job[] {
  const out: Job[] = [];
  for (let i = 0; i < 3; i++) out.push(dealJob(seed, startSerial + i, level, out.map((j) => j.kind)));
  return out;
}

export type JobEvent =
  | { kind: 'haul'; tripHauls: number; perfects: number; best: 'junk' | 'common' | 'rare' | 'legendary' }
  | { kind: 'bank'; value: number; items: { id: string; n: number }[] }
  | { kind: 'harpoon' };

/** Advance the board for one event. Returns the jobs that just finished. Mutates the jobs' progress. */
export function progressJobs(jobs: Job[], e: JobEvent): Job[] {
  const fin: Job[] = [];
  for (const j of jobs) {
    if (j.done) continue;
    if (e.kind === 'haul') {
      if (j.kind === 'hauls') j.progress = Math.max(j.progress, e.tripHauls);
      if (j.kind === 'perfect') j.progress += e.perfects;
      if (j.kind === 'rare' && (e.best === 'rare' || e.best === 'legendary')) j.progress = 1;
    } else if (e.kind === 'bank') {
      if (j.kind === 'bank') j.progress = Math.max(j.progress, e.value);
      if (j.kind === 'deliver') j.progress += e.items.filter((i) => i.id === j.item).reduce((a, b) => a + b.n, 0);
    } else if (e.kind === 'harpoon' && j.kind === 'harpoon') j.progress++;
    if (j.progress >= j.n) {
      j.progress = j.n;
      j.done = true;
      fin.push(j);
    }
  }
  return fin;
}

/** Pay out finished jobs and refill their slots. Returns the gold paid and the new board (same length). */
export function claimJobs(jobs: Job[], seed: number, nextSerial: number, level: number): { paid: number; claimed: Job[]; board: Job[]; serial: number } {
  let serial = nextSerial;
  const claimed = jobs.filter((j) => j.done);
  const board = jobs.map((j) => {
    if (!j.done) return j;
    return dealJob(seed, serial++, level, jobs.filter((o) => !o.done).map((o) => o.kind));
  });
  return { paid: claimed.reduce((a, j) => a + j.reward, 0), claimed, board, serial };
}
