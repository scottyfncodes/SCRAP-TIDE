// GITCRAFT Studio pass: the lazy audio pack and the flipbook effects.
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { audioExt, themeMix, VOICE_LINES } from '../src/audio/pack';
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
  it('stays under the 3 MB budget (both formats together)', () => {
    const bytes = files(AUDIO).reduce((a, f) => a + statSync(f).size, 0);
    expect(bytes).toBeLessThan(3 * 1024 * 1024);
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
      expect(['dockhand', 'raider', ...CREW.map((c) => c.id)], k).toContain(who);
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
