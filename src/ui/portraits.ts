// Harbor portraits: the faces on the settlement cards (art pass, in review: Pip Farthing and Marlo Keelhart).
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

/** Marlo Keelhart, shipwright: gruff, proud, built like a bollard. A welding mask flipped up off a heavy brow, a rust
 *  beard going grey that hides his neck, a scrap of road sign bolted on as a shoulder plate. He does not smile. */
const MARLO = `
<rect width="64" height="64" fill="#9fb5bd"/><path d="M0 0h64L0 46z" fill="#b6c8cd"/>
<path d="M0 64 5 52 22 45h20l17 7 5 12z" fill="#465256"/><path d="M32 45h10l17 7 5 12H32z" fill="#343e42"/>
<path d="M12 49.5l6-2.5 12 17h-8z" fill="#8a5c36"/>
<path d="M44 47.5l12.5 4.5 1.5 7.5L46 56z" fill="#a8483a"/><path d="M45 51.5l12 4 .5 2.5L45.5 54z" fill="#d9d2c0"/>
<path d="M15.5 29 19 28v8l-2.5-1z" fill="#8a5a3f"/><path d="M48.5 29 45 28v8l2.5-1z" fill="#5e3b2a"/>
<path d="M19 21h26l2 13-4 10-11 4-11-4-4-10z" fill="#8a5a3f"/>
<path d="M37 21h8l2 13-4 10-11 4 4-12z" fill="#6a4330"/>
<path d="M19.5 31l3.2 1.6-2.7 1z" fill="#a9755a"/>
<path d="M32 29.5l-3.6 9 3.6 1.7z" fill="#9c694b"/><path d="M32 29.5l4 9-4 1.7z" fill="#573627"/>
<path d="M22.5 32.2l6 .5-.4 1.8-5.2-.3z" fill="#e6dfcc"/><path d="M41.5 32.2l-6 .5.4 1.8 5.2-.3z" fill="#bdb49d"/>
<circle cx="26" cy="33.2" r="1.2" fill="#1c110c"/><circle cx="38" cy="33.2" r="1.2" fill="#1c110c"/>
<path d="M20.5 27 30.5 29.5v2.6L20.5 30z" fill="#2c1b14"/><path d="M43.5 27 33.5 29.5v2.6l10-2.1z" fill="#1f130e"/>
<path d="M17.2 35 23 37.5l9 1.5v19.5l-8-3.5-6.2-8z" fill="#a8532f"/>
<path d="M46.8 35 41 37.5 32 39v19.5l8-3.5 6.2-8z" fill="#7b3a22"/>
<path d="M24 38.5l8-1.7v4.2l-7 1.4z" fill="#bd6538"/><path d="M40 38.5l-8-1.7v4.2l7 1.4z" fill="#8f4527"/>
<path d="M27.5 45.3 32 43.5l4.5 1.8-.4 1.3-4.1-1.5-4.1 1.5z" fill="#2a1410"/>
<path d="M17.2 35 23 37.5l-1.2 5.5-4-2.5z" fill="#c9bfa8"/><path d="M46.8 35 41 37.5l1.2 5.5 4-2.5z" fill="#8f8672"/>
<path d="M17.5 23 15 8.5 22 4h20l7 4.5L46.5 23z" fill="#566064"/><path d="M17.5 23 15 8.5 22 4h10l-3 19z" fill="#778286"/>
<path d="M22.5 9.5h19l-1 6h-17z" fill="#1b262b"/><path d="M24 10.5h6l-2 4h-3.5z" fill="#3f6f78"/>
<path d="M44.2 9.5l1.6.3-.9 9.2-1.3-.2zM40.2 16l1.3.1-.5 6.900h-1.200z" fill="#8a4a30"/>
<circle cx="18" cy="21.5" r="1.9" fill="#c9cfcd"/><circle cx="18" cy="21.5" r=".8" fill="#3a4448"/><circle cx="46" cy="21.5" r="1.9" fill="#8f9997"/><circle cx="46" cy="21.5" r=".8" fill="#2a3236"/>`;

const PORTRAITS: Record<string, string> = { pip: PIP, marlo: MARLO };

/** The portrait for a harbor character, or null while theirs is still to be drawn. */
export function portraitSVG(id: string): string | null {
  const art = PORTRAITS[id];
  return art ? `<svg class="portrait" viewBox="7 5 50 50" aria-hidden="true">${art}</svg>` : null;
}
