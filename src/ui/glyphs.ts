// Interface glyphs: the small marks on action plates, service buttons and tabs. One hand drew all of them: a 24-unit
// frame, a 2.2 stroke, round caps and joins, no fills, inked in the button's own colour (the same recipe as the
// Maps / Menu / Ship icons in the top bar). They replace the platform emoji that used to sit on these buttons, which
// arrived in whatever full-colour style the phone felt like and never matched the stencilled steel around them.
const P = {
  anchor: '<circle cx="12" cy="4.6" r="2.1"/><path d="M12 6.7V21M8.2 10.6h7.6M4 13.2c.5 4.5 3.8 7.8 8 7.8s7.5-3.3 8-7.8M2.3 15.8 4 13.2l2.7 1.3M21.7 15.8 20 13.2l-2.7 1.3"/>',
  shovel: '<path d="M16.5 3.5l4 4M18.5 5.5 10.8 13.2M8.3 10.7l5 5-3.6 3.6c-1.6 1.6-4.3 2-6.7 1.7-.3-2.4.1-5.1 1.7-6.7z"/>',
  sail: '<path d="M3 16h18l-3 4H6zM12 3v13M12 4l6 10h-6M11 6l-5 8h5"/>',
  harpoon: '<path d="M3.5 20.5 16.5 7.5M13.5 4.8 20 4l-.8 6.5zM9.3 11.700l3 3"/><circle cx="4.6" cy="19.4" r=".4"/>',
  runner: '<path d="M2 13.5h20l-3.2 5H5zM7.5 13.5V9.5h5.5l3.5 4M2.5 21.5c1.6-1 3.2-1 4.8 0s3.2 1 4.8 0 3.2-1 4.8 0 3.1 1 4.6 0"/>',
  balloon: '<path d="M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 3.2-2.4 5.3-4.3 7h-4.4C7.9 14.3 5.5 12.2 5.5 9A6.5 6.5 0 0 1 12 2.5zM10.2 16l.3 2.5M13.8 16l-.3 2.5"/><rect x="9.5" y="18.5" width="5" height="3.3" rx=".7"/>',
  bolt: '<path d="M13.5 2.5 5 13.5h6L10 21.5l9-11.5h-6z"/>',
  down: '<path d="M12 4v15.5M5.5 13l6.5 6.5 6.5-6.5"/>',
  hook: '<circle cx="14.5" cy="4.3" r="1.8"/><path d="M14.5 6.1v7.4a5 5 0 0 1-10 0v-2M2.5 13.8l2-2.3 2.3 2.1"/>',
  flame: '<path d="M12 2.5c.8 4 5.5 5.8 5.5 11.2a5.5 5.5 0 0 1-11 0c0-2 .8-3.7 2-4.9.2 1.8 1 3 2.1 3.4C10.3 9.3 10.6 5.6 12 2.5z"/>',
  wave: '<path d="M2 8.5c2.2-2.6 4.4-2.6 6.7 0s4.4 2.6 6.6 0 4.4-2.6 6.7 0M2 15.5c2.2-2.6 4.4-2.6 6.7 0s4.4 2.6 6.6 0 4.4-2.6 6.7 0"/>',
  fuel: '<rect x="5" y="7.5" width="14" height="13.5" rx="2"/><path d="M8 7.5V4h6l2.5 3.5M9.2 11.2l5.6 6M14.8 11.2l-5.6 6"/>',
  wrench: '<path d="M15 4.2a4.6 4.6 0 0 0-5.7 6L3.5 16l4.5 4.5 5.8-5.8a4.6 4.6 0 0 0 6-5.7l-3 3-2.6-.5-.5-2.6z"/>',
  hammer: '<path d="M13.5 3.5l7 7-3 3-7-7zM12 8l-8.5 8.5 3 3L15 11"/>',
  patch: '<rect x="3.5" y="8" width="17" height="8" rx="2" transform="rotate(-45 12 12)"/><path d="M10.2 10.2l3.6 3.6M13.8 10.2l-3.6 3.6"/>',
  crew: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20.5c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17.2" cy="9.2" r="2.5"/><path d="M17 14.5c2.4.4 4 2.6 4 5.5"/>',
  pin: '<path d="M12 21.5S5.5 15.2 5.5 10a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11.5-6.5 11.5z"/><circle cx="12" cy="10" r="2.3"/>',
  crane: '<path d="M6 21V4M3 21h7M6 5l13.5 4M6 10.5 11 6.5M17.5 8.5v5.7M17.5 14.2a2.2 2.2 0 1 1-2.2 2.2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.3 3.2 3.3 14.8 0 18M12 3c-3.3 3.2-3.3 14.8 0 18"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  display: '<path d="M12 3.5l2.3 5.2 5.7.6-4.3 3.8 1.3 5.6-5-3-5 3 1.3-5.6L4 9.3l5.7-.6z"/>',
} as const;

export type Glyph = keyof typeof P;

/** An inline glyph, sized by the text it sits in (1.15em) and drawn in its colour. Decorative: the label says it. */
export function glyph(name: Glyph): string {
  return `<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;
}
