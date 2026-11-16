// GITCRAFT Studio pass: the lazy audio pack and the flipbook effects.
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { audioExt, themeMix, VOICE_LINES, TAPES, autoTape, tapePool } from '../src/audio/pack';
import { FX_BUDGET, fxQualityFromUrl } from '../src/game/flipfx';
import { CREW } from '../src/data/crew';

const AUDIO = 'public/audio';
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));

describe('audio pack', () => {
  it('every voice line, stem, stinger and layer ships as OGG and AAC', () => {
    const need = [
      ...Object.keys(VOICE_LINES).map((v) => `vo/${v}`),
      ...['pad', 'bass', 'arp', 'lead', 'drums'].map((s) => `music/tb_theme_${s}`),
      ...['salvage', 'discovery', 'upgrade', 'crew'].map((s) => `stingers/stinger_${s}`),
      'sfx/sfx_hull_thud_01', 'sfx/sfx_harpoon_whoosh', 'sfx/sfx_harpoon_hit_01',
    ];
    for (const n of need) for (const ext of ['ogg', 'm4a']) expect(existsSync(`${AUDIO}/${n}.${ext}`), `${n}.${ext}`).toBe(true);
  });
  it('stays inside its budgets: the always-on pack, and each music tape on its own', () => {
    // sounds, stingers, every voice line and the theme: what any player can end up downloading in one format
    const size = (list: string[]) => list.reduce((a, f) => a + statSync(f).size, 0);
    const all = files(AUDIO), tapes = all.filter((f) => f.includes('/tb_tape_'));
    for (const ext of ['ogg', 'm4a']) expect(size(all.filter((f) => !tapes.includes(f) && f.endsWith(ext))), `core .${ext}`).toBeLessThan(2.5 * 1024 * 1024);
    // a tape is five stems, fetched only while it is the one playing
    for (const t of TAPES.filter((x) => x.file !== 'tb_theme'))
      for (const ext of ['ogg', 'm4a']) expect(size(tapes.filter((f) => f.includes(`${t.file}_`) && f.endsWith(ext))), `${t.id} .${ext}`).toBeLessThan(1.2 * 1024 * 1024);
  });
  it('every tape on the shelf ships all five stems in both formats', () => {
    for (const t of TAPES) for (const s of ['pad', 'bass', 'arp', 'lead', 'drums']) for (const ext of ['ogg', 'm4a']) expect(existsSync(`${AUDIO}/music/${t.file}_${s}.${ext}`), `${t.file}_${s}.${ext}`).toBe(true);
    expect(new Set(TAPES.map((t) => t.id)).size).toBe(TAPES.length);
    expect(TAPES.length).toBeGreaterThanOrEqual(6);
  });
  it('AUTO opens on a tape that suits the water, lets it play, then moves along the pool', () => {
    const day = { region: 'shallows', night: 0, storm: 0 }, night = { region: 'shallows', night: 1, storm: 0 }, storm = { region: 'emerald', night: 0, storm: 1 };
    expect(autoTape(day, null, 0)).toBe(tapePool(day)[0]);
    expect(autoTape(day, 'drowned', 1.5)).toBe('drowned'); // mid-run: leave it alone
    expect(autoTape(day, 'drowned', 3)).toBe(tapePool(day)[1]); // three times through: next tape
    expect(autoTape(night, 'fairwind', 0.4)).toBe('fairwind'); // night fell mid-loop: the loop plays out
    expect(tapePool(night)).toContain(autoTape(night, 'fairwind', 1));
    expect(tapePool(storm)).toContain(autoTape(storm, 'slackwater', 2));
    for (const sea of [day, night, storm, { region: 'harbor', night: 0, storm: 0 }, { region: 'stormwall', night: 0, storm: 0 }]) {
      // every pool is real tapes, and cycling it visits all of them
      const pool = tapePool(sea);
      for (const id of pool) expect(TAPES.some((t) => t.id === id), id).toBe(true);
      let cur = autoTape(sea, null, 0);
      const seen = new Set([cur]);
      for (let i = 0; i < pool.length; i++) seen.add((cur = autoTape(sea, cur, 3)));
      expect(seen.size).toBe(pool.length);
    }
  });
  it('picks OGG where the browser can decode Vorbis and AAC on iPhone Safari', () => {
    expect(audioExt(() => 'probably')).toBe('ogg');
    expect(audioExt(() => '')).toBe('m4a');
    expect(audioExt(() => { throw new Error('no audio element'); })).toBe('m4a');
  });
  it('the theme thickens with the region and the raider threat', () => {
    const drift = themeMix('shallows', 0), reach = themeMix('emerald', 0), wall = themeMix('stormwall', 0), fight = themeMix('shallows', 1);
    expect(drift.pad).toBeGreaterThan(0);
    expect(drift.drums + drift.arp + drift.lead).toBe(0); // the Drift is just the bed
    expect(reach.arp).toBeGreaterThan(0);
    expect(wall.lead).toBeGreaterThan(0);
    expect(fight.drums).toBeGreaterThan(wall.drums);
    expect(themeMix('nowhere', 0)).toEqual(drift);
    for (const v of Object.values(themeMix('stormwall', 5))) expect(v).toBeLessThanOrEqual(1);
  });
  it('the joining crew have their own first words (and one consistent voice each)', () => {
    for (const id of ['kai', 'tomas', 'ines', 'bram', 'juno']) expect(VOICE_LINES, id).toHaveProperty(`${id}_joined`);
    for (const k of Object.keys(VOICE_LINES)) {
      const who = k.split('_')[0];
      expect(['dockhand', 'raider', 'wren', ...CREW.map((c) => c.id)], k).toContain(who);
    }
  });
});

describe('flipbook effects', () => {
  it('ship their atlases', () => {
    for (const f of ['fx_splash', 'fx_engine_smoke', 'fx_harpoon_sparks', 'fx_rain', 'fx_lightning']) expect(existsSync(`public/fx/${f}.png`), f).toBe(true);
  });
  it('the low budget never draws more than the high one, and drops smoke and rain sheets', () => {
    for (const [k, [hi, lo]] of Object.entries(FX_BUDGET)) expect(lo, k).toBeLessThanOrEqual(hi);
    expect(FX_BUDGET.smoke[1]).toBe(0);
    expect(FX_BUDGET.rain[1]).toBe(0);
  });
  it('?fx= pins the quality', () => {
    expect(fxQualityFromUrl('?fx=low')).toBe('low');
    expect(fxQualityFromUrl('?ship=sloop&fx=high')).toBe('high');
    expect(fxQualityFromUrl('?fx=ultra')).toBeNull();
    expect(fxQualityFromUrl('')).toBeNull();
  });
});
