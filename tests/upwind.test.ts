// Upwind cues (balance pass 1, #5, option A): every crew member can say something when the sails luff.
import { describe, expect, it } from 'vitest';
import { CHARACTERS, pickLine } from '../src/data/characters';
import { CREW } from '../src/data/crew';

describe('upwind cues', () => {
  it('every crew member has a line for luffing sails', () => {
    for (const c of CREW) {
      const ch = CHARACTERS.find((x) => x.id === c.id);
      expect(ch, c.id).toBeTruthy();
      expect(ch!.lines.some((l) => l.trigger === 'upwind'), `${c.id} upwind line`).toBe(true);
      expect(pickLine(c.id, 'upwind'), c.id).toBeTruthy();
    }
  });
});
