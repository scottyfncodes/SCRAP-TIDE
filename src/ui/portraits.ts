// Harbor portraits: the faces on the settlement cards (art pass, prototype: Pip Farthing only).
//
// Direction: CUT-PLATE PORTRAITS. Each face is built the way the world's people are (docs/art-direction/STYLE-GUIDE.md
// §2): flat, faceted planes of colour with a sunward side and a shadow side, no ink outline, minimal features (brow,
// nose plane, a beard or moustache mass). Personality comes from the silhouette (headgear, hair), one signature piece
// of salvage, and one sun-faded accent. Drawn on a 64-unit sheet and framed tight (the hat brim breaks the ring) so
// the face reads at 56 px on a phone; inline SVG, so no download and no blur at any pixel density.
//
// Light falls from the upper left on every portrait. Skin, cloth and metal each get a lit tone and a shadow tone and
// nothing else; the backdrop is the character's own colour, sun-bleached.

/** Pip Farthing, trader: a delighted old magpie. Dented bowler with a rag band, a jar-lid monocle on a wire, a
 *  moustache you could lose a coin in, and an old-world coin pinned where a medal would go. */
const PIP = `
<rect width="64" height="64" fill="#b9995c"/><path d="M0 0h64L0 46z" fill="#cbb077"/>
<path d="M4 64 11 55 24 50h16l13 5 7 9z" fill="#5d7073"/><path d="M32 50h8l13 5 7 9H32z" fill="#46575b"/>
<path d="M12 57l8-3 1.5 6.5-7.5 2.5z" fill="#c2693a"/>
<circle cx="45.5" cy="58.5" r="2.8" fill="#b88c3c"/><circle cx="45.5" cy="58.5" r="1.2" fill="#7c5a20"/>
<path d="M26 44h12v7l-6 5-6-5z" fill="#9c6a49"/>
<path d="M23 49.5 32 57l9-7.5-3-2.5H26z" fill="#e6dfcc"/><path d="M32 57l9-7.5-3-2.5h-6z" fill="#bdb49d"/>
<path d="M13.5 28 20 26v12l-4.5 1.5-3.5-5z" fill="#ece6d4"/><path d="M50.5 28 44 26v12l4.5 1.5 3.5-5z" fill="#b9b19b"/>
<path d="M20 25h24l2 10-4.5 10L32 49l-9.5-4L18 35z" fill="#c8906a"/>
<path d="M36 25h8l2 10-4.5 10L32 49l3.5-12z" fill="#a67050"/>
<path d="M32 31l3.5 8-3.5 1.2z" fill="#8a5a3f"/>
<path d="M21.5 29.5 29 27.5v2.3l-7.5 2.2z" fill="#f1ecdc"/><path d="M42.5 29.5 35 27.5v2.3l7.5 2.2z" fill="#d2cab4"/>
<path d="M22 34.5q3.5-4.2 7 0-3.5-1.6-7 0z" fill="#2b1c15"/><path d="M19.5 33.5l2.2 1.3-2 1.2z" fill="#a67050"/><path d="M20.5 38.5l5.5-1.5-3 4z" fill="#d6a07a"/>
<circle cx="39" cy="34" r="5.3" fill="#cfe6df" fill-opacity=".62" stroke="#b88c3c" stroke-width="1.7"/>
<circle cx="39" cy="34.2" r="1.8" fill="#2b1c15"/>
<path d="M35.8 31.5 38.2 30l-2.7 4.3z" fill="#f4f1e4" fill-opacity=".8"/>
<path d="M43.8 36.8Q47 44 44.5 55" fill="none" stroke="#8f6a2a" stroke-width=".9"/>
<path d="M27 43.5h10l-2 4h-6z" fill="#3a2019"/><path d="M28 43.5h8l-.8 1.9h-6.4z" fill="#efe8d6"/><path d="M33.3 43.5h1.5l-.2 1.9h-1.3z" fill="#b88c3c"/>
<path d="M32 39.5l-5-1-7.5 3-2.5 4 8-1 7-1.5z" fill="#f1ecdc"/><path d="M32 39.5l5-1 7.5 3 2.5 4-8-1-7-1.5z" fill="#cfc7b1"/>
<path d="M9 26.5h46l-3.5-4.5h-39z" fill="#2f2a35"/><path d="M9 26.5h23V22H12.5z" fill="#3d3745"/>
<path d="M17 22l1-9.5 6-5h16l6 5 1 9.5z" fill="#39323f"/><path d="M17 22l1-9.5 6-5h7L28 22z" fill="#4f4658"/>
<path d="M17.3 22h29.4l-.4-4H17.7z" fill="#c08a86"/><path d="M32 22h14.7l-.4-4H32z" fill="#a06f6d"/>
<path d="M37.5 10l5 1.5-.8 4-4.8-1z" fill="#6b6372"/>`;

const PORTRAITS: Record<string, string> = { pip: PIP };

/** The portrait for a harbor character, or null while theirs is still to be drawn. */
export function portraitSVG(id: string): string | null {
  const art = PORTRAITS[id];
  return art ? `<svg class="portrait" viewBox="7 5 50 50" aria-hidden="true">${art}</svg>` : null;
}
