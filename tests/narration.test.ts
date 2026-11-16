// Old Wren on the radio (game/narration.ts): every step of the First Voyage has a spoken line, and every line ships.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { STEP_LINES, SPEAKERS, readTime } from '../src/game/narration';
import { VOICE_LINES } from '../src/audio/pack';
import { FIRST_VOYAGE } from '../src/data/progress';

describe('narration', () => {
  it('every live step of the First Voyage has a line from Wren', () => {
    for (const q of FIRST_VOYAGE) {
      expect(STEP_LINES, q.id).toHaveProperty(q.id);
      expect(VOICE_LINES, STEP_LINES[q.id]).toHaveProperty(STEP_LINES[q.id]);
    }
  });
  it('every narrator line is voiced in both formats and has a speaker to caption it with', () => {
    const lines = Object.keys(VOICE_LINES).filter((k) => k.startsWith('wren_'));
    expect(lines.length).toBeGreaterThanOrEqual(25);
    for (const id of lines) {
      for (const ext of ['ogg', 'm4a']) expect(existsSync(`public/audio/vo/${id}.${ext}`), `${id}.${ext}`).toBe(true);
      expect(SPEAKERS[id.split('_')[0]], id).toBeTruthy();
    }
  });
  it('lines are short enough to read in a caption on a phone', () => {
    for (const [id, text] of Object.entries(VOICE_LINES)) if (id.startsWith('wren_')) expect(text.length, id).toBeLessThanOrEqual(140);
  });
  it('the raiders are described as what they are now: riders on wave runners', () => {
    expect(VOICE_LINES.wren_raiders).toMatch(/wave runners/);
    expect(VOICE_LINES.kai_raiders).not.toMatch(/skiff/i);
  });
  it('with the sound off a caption stays up long enough to read, and never forever', () => {
    expect(readTime('Short.')).toBeGreaterThan(2);
    expect(readTime('x'.repeat(130))).toBeGreaterThan(7);
    expect(readTime('x'.repeat(900))).toBeLessThanOrEqual(9);
  });
});
