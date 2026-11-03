// Workbench recipes: turn salvage into the parts that upgrades and survival need.
// A workbench is available at Driftholm and Rig Helios, and aboard once you own the Container Cabin.

export interface RecipeDef {
  id: string;
  name: string;
  makes: { id: string; n: number };
  needs: { id: string; n: number }[];
  desc: string;
}

export const RECIPES: RecipeDef[] = [
  { id: 'r_fuel', name: 'Refine Fuel', makes: { id: 'fuel_can', n: 1 }, needs: [{ id: 'crude_oil', n: 2 }],
    desc: 'Settle, skim, filter, pray. Two crude makes one can of fuel.' },
  { id: 'r_patch', name: 'Hull Patch Kit', makes: { id: 'hull_patch', n: 1 }, needs: [{ id: 'driftwood', n: 2 }, { id: 'plastic', n: 2 }],
    desc: 'Repairs 35 hull anywhere on the water.' },
  { id: 'r_plate', name: 'Alloy Plate', makes: { id: 'alloy_plate', n: 1 }, needs: [{ id: 'scrap_metal', n: 3 }, { id: 'iron_nails', n: 2 }],
    desc: 'Beat flat, rivet, repeat. Needed for armour and the Ironwake.' },
  { id: 'r_engine', name: 'Engine Parts', makes: { id: 'engine_parts', n: 1 }, needs: [{ id: 'scrap_metal', n: 2 }, { id: 'wire', n: 1 }, { id: 'electronics', n: 1 }],
    desc: 'Rebuild a carburettor from three broken ones.' },
  { id: 'r_canvas', name: 'Stitch Sailcloth', makes: { id: 'canvas', n: 2 }, needs: [{ id: 'plastic', n: 2 }, { id: 'rope', n: 1 }],
    desc: 'Tarp, twine and patience make passable sailcloth.' },
  { id: 'r_wire', name: 'Strip Wire', makes: { id: 'wire', n: 2 }, needs: [{ id: 'electronics', n: 1 }],
    desc: 'Pull the copper out of a dead board.' },
];
export const RECIPE_MAP: Record<string, RecipeDef> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
