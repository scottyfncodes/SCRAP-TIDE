// The 14 people of the Drift (src/data/characters.ts): everyone named in the game has a voice, and lines are picked
// by trigger and context the way the game expects.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHARACTERS, CHARACTER_MAP, pickLine } from '../src/data/characters';
import { CREW } from '../src/data/crew';

// the settlement NPCs are declared in the UI (src/ui/ui.ts NPCS); read their ids from the source
const uiSrc = readFileSync(new URL('../src/ui/ui.ts', import.meta.url), 'utf8');
const npcBlock = uiSrc.slice(uiSrc.indexOf('const NPCS = {'), uiSrc.indexOf('};', uiSrc.indexOf('const NPCS = {')));
const NPC_IDS = [...npcBlock.matchAll(/^\s+(\w+): \{ name:/gm)].map((m) => m[1]);

describe('the cast', () => {
  it('covers all 14 named characters: every crew member and every settlement NPC', () => {
    expect(NPC_IDS.length).toBe(8);
    for (const c of CREW) expect(CHARACTER_MAP[c.id]?.kind, c.id).toBe('crew');
    for (const id of NPC_IDS) expect(CHARACTER_MAP[id]?.kind, id).toBe('npc');
    expect(CHARACTERS).toHaveLength(14);
  });

  it('gives every character at least 6 lines, a want, a wound, a voice and pronouns', () => {
    for (const c of CHARACTERS) {
      expect(c.lines.length, c.id).toBeGreaterThanOrEqual(6);
      for (const k of ['want', 'wound', 'voice', 'pronouns'] as const) expect(c[k].length, `${c.id}.${k}`).toBeGreaterThan(3);
      expect(new Set(c.lines.map((l) => l.text)).size, `${c.id} repeats a line`).toBe(c.lines.length);
    }
  });

  it('every NPC has a greeting that needs no context, and every crew member has a join line', () => {
    for (const c of CHARACTERS) {
      if (c.kind === 'npc') expect(c.lines.some((l) => l.trigger === 'dock' && !l.when), c.id).toBe(true);
      else expect(c.lines.some((l) => l.trigger === 'join'), c.id).toBe(true);
    }
  });

  it('stays in the drowned-world register: no storybook pirate talk', () => {
    const banned = /\b(ahoy|matey|arr+|me hearties|shiver|landlubber|yo-ho|doubloons?|pieces of eight|walk the plank)\b/i;
    for (const c of CHARACTERS) for (const l of c.lines) expect(banned.test(l.text), `${c.id}: ${l.text}`).toBe(false);
  });
});

describe('pickLine', () => {
  const lo = () => 0, hi = () => 0.99;
  it('never uses a line whose context is not present', () => {
    for (let i = 0; i < 50; i++) expect(pickLine('vik', 'dock', {})).not.toMatch(/Vale/);
  });
  it('lets a context line through when its key is set', () => {
    expect(pickLine('vik', 'dock', { juno_aboard: true }, { rng: lo })).toMatch(/Vale/);
  });
  it('specificOnly returns only context lines, or nothing', () => {
    expect(pickLine('juno', 'dock', {}, { specificOnly: true })).toBeNull();
    expect(pickLine('juno', 'dock', { helios: true }, { specificOnly: true })).toMatch(/Vik/);
  });
  it('avoids recently said lines while there is an alternative', () => {
    const all = CHARACTER_MAP.odessa.lines.map((l) => l.text);
    const recent = new Set(all.slice(1));
    expect(pickLine('odessa', 'dock', {}, { recent, rng: hi })).toBe(all[0]);
  });
  it('returns null for unknown characters and triggers nobody has', () => {
    expect(pickLine('nobody', 'dock')).toBeNull();
    expect(pickLine('pip', 'storm')).toBeNull();
  });
});
