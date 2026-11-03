// Lazy upgrade models: every upgrade model file is reachable from an upgrade, and a boat with no upgrades needs none.
import { describe, expect, it } from 'vitest';
import { UPGRADE_MODEL_FILES } from '../src/world/assets';
import { sloopUpgradeFiles } from '../src/ship/shipModel';
import { UPGRADES } from '../src/data/ship';

describe('lazy upgrade models', () => {
  it('a fresh Trimaran (no upgrades) needs no upgrade model files', () => {
    expect(sloopUpgradeFiles([])).toEqual([]);
  });
  it('every upgrade model file belongs to an upgrade, so buying it is what loads it', () => {
    const all = sloopUpgradeFiles(UPGRADES.map((u) => u.id)).sort();
    expect(all).toEqual([...UPGRADE_MODEL_FILES].sort());
  });
  it('buying one upgrade asks for only its own file', () => {
    expect(sloopUpgradeFiles(['radar_mast'])).toEqual(['tb_upg_radar_mast']);
    expect(sloopUpgradeFiles(['sail_canvas', 'sail_cutter'])).toEqual(['tb_upg_canvas_mainsail']); // the jib needs no file
  });
});
