// SCRAP TIDE world-art style spec, as code: "stylized, not cartoon-outlined".
// The human-readable version, with the reasoning and the checklist for new assets, is docs/art-direction/STYLE-GUIDE.md.
// Every number here is something the renderer reads; change it here, not in the call sites.
import * as THREE from 'three';

/**
 * Outline policy. There is NO universal outline. Silhouettes separate by (in order): shape, material/colour contrast,
 * light (rim + baked form shading), depth/fog, and only then a selective, thin, non-black line.
 * `heroize(root, width)` still supports an inverted-hull line for the rare case it earns its place; pass a width from
 * here so every use is visible in one file. 0 = off.
 */
export const OUTLINE = {
  /** world ink (hero.ts inkWorld: settlements, drowned structures, the harbour): off. A universal line is exactly what
   * the policy rules out; > 0 re-enables the distance-scaled shell as a multiplier on its width. */
  world: 0,
  hull: 0,
  crew: 0,
  captain: 0,
  /** if a line is ever used: a deep sea tone, never black, and never thicker than this many metres */
  ink: '#1d3440',
  maxWidth: 0.012,
} as const;

/**
 * Light ramp for every toon surface (MeshToonMaterial.gradientMap), sampled at N·L mapped to 0..1.
 * Was 4 hard bands with the shadow step at 23% of the sun: every terminator became a dark contour line, which is
 * most of what read as "black outlines" on buildings. Now: a lifted, soft ramp, linearly filtered, so flat-shaded
 * low-poly faces still read as facets (the geometry carries the stylisation) but shading falls off like soft sun.
 */
export const LIGHT_RAMP = [78, 100, 140, 196, 236, 255] as const;
export const LIGHT_RAMP_FILTER: THREE.MagnificationTextureFilter = THREE.LinearFilter;

/** Surface wear (materials.ts weather()): believable, matte, never a black band. 0..1 strengths. */
export const WEAR = {
  /** grime darkens toward this multiplier (was 0.42: a near-black smear) */
  grimeFloor: 0.58,
  grimeMix: 0.45,
  /** the tide line below the water: dark sea-green algae, not black (was 0.09,0.12,0.09 at up to 75%) */
  algae: [0.17, 0.24, 0.21] as const,
  algaeMix: 0.38,
} as const;

/**
 * Restrained, sun-weathered maritime palette for world assets (linear-agnostic hex; tints are fine, new hues are not).
 * UI tokens live in src/ui/brand.ts; these are the world-side equivalents.
 */
export const WORLD_PALETTE = {
  dustyTeal: '#4f7f80',
  mutedTurquoise: '#6fa3a0',
  warmSand: '#cdb48a',
  fadedCream: '#e3d7bb',
  rustyOrange: '#b0603a',
  weatheredCoral: '#c27a62',
  desatNavy: '#2e4250',
  agedBrass: '#a88a4f',
  oxidisedMetal: '#6f7f76',
  /** important interactive things only (waypoints, pickups that glow, the dock lamp) */
  goldAccent: '#e5c65e',
  /** openings (windows, hatches, doorways): a deep, desaturated navy shadow, never pure black */
  opening: '#34404a',
} as const;

/**
 * Jury-Rigged sun-faded plastic accents (approved Nov 2026, docs/art-direction/STYLE-GUIDE.md §5a). The one place
 * new hues are allowed: small, hand-sized salvage (floats, jugs, crates, sail patches, signage) covering at most
 * ~10 % of a frame. Never green (living things only) and never Sun Gold (interactive things only): tests/jury.test.ts
 * checks both. Geometry painted with these is tagged with an `accent` vertex attribute so the weathering shader
 * treats it as plastic (PLASTIC below).
 */
export const PLASTIC_ACCENTS = {
  poolBlue: '#5a9fbf',
  coneOrange: '#d9733a',
  buoyRed: '#c2443a',
  laundryPink: '#d69a94',
  bleachWhite: '#ede6d6',
} as const;
export const ACCENT_BUDGET = 0.1;

/**
 * How the weathering shader treats accent-tagged plastic (materials.ts weather, `accent` attribute): plastic fades in
 * the sun but less than paint (keep is the share of the authored saturation that survives, vs 0.62 for everything
 * else), it does not rust, and it holds less grime.
 */
export const PLASTIC = { keep: 0.84, grime: 0.45, rust: 0 } as const;

/**
 * Baked form shading (assets.ts formShade): ambient occlusion in the vertex colours, so a building or prop is defined
 * by light instead of lines. Contact darkening toward the base, soft darkening under overhangs (down-facing faces),
 * a sun-bleached lift on top faces, and near-black vertex colours lifted to WORLD_PALETTE.opening.
 */
export const FORM_SHADE = {
  /** share of the piece's height, from its base, that gets contact occlusion */
  contactHeight: 0.32,
  /** brightness at the very base */
  contactFloor: 0.74,
  /** brightness of faces pointing straight down (eaves, deck undersides) */
  underside: 0.8,
  /** extra brightness on faces pointing straight up */
  topLift: 1.06,
  /** linear luminance below which a vertex colour is lifted toward `opening` (the kits' TBD_Navy windows are ~0.01) */
  blackLift: 0.07,
} as const;

/** The same form shading, gentler, for people: boots grounded, head and shoulders a touch lighter so faces read. */
export const CHARACTER_FORM = {
  contactHeight: 0.2,
  contactFloor: 0.82,
  underside: 0.9,
  topLift: 1.05,
  blackLift: 0.03,
} as const;
export type FormShadeParams = { contactHeight: number; contactFloor: number; underside: number; topLift: number; blackLift: number };

/**
 * Characters that get CHARACTER_FORM (GLB file names). The captain is the representative; the crew and Driftholm's
 * shopkeepers (who stand by the form-shaded shacks) share the path. Raiders are the next candidates.
 */
export const FORM_SHADED_CHARACTERS: readonly string[] = [
  'tb_captain',
  'tb_npc_trader',
  'tb_npc_elder',
  'tb_npc_dockhand',
  'tb_crew_mechanic',
  'tb_crew_navigator',
  'tb_crew_salvager',
  'tb_crew_fisher',
  'tb_crew_lookout',
  'tb_crew_defender',
];

/**
 * Where the representative refinement is applied (kit file -> node names). This is the rollout list: adding a node
 * here gives it baked form shading with no other change. Keep the hero/important pieces first (see the detail
 * hierarchy in the style guide); background scenery can stay as it is.
 */
export const FORM_SHADED: Record<string, readonly string[]> = {
  // one building family: Driftholm's patchwork shack and the salvaged-container homes beside it
  tb_settlement_kit: ['mod_shack', 'mod_market'],
  tb_atoll_kit: ['container_home', 'water_tank'],
  // props: the pier and market furniture the player walks and moors beside
  tb_coast_kit: ['barrel', 'cargo_crate', 'bollard', 'pier_lamp', 'pier_section', 'fence_panel'],
  tb_outpost_kit: ['market_stall', 'rain_catcher'],
};

/** Procedural salvage dwellings (shanty.ts) are form-shaded as one unit each, from their ground/water line up. */
export const FORM_SHADE_SHANTY = true;

export const isFormShaded = (file: string, node: string) => !!FORM_SHADED[file]?.includes(node);
