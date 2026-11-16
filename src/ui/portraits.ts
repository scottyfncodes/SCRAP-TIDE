// Harbor portraits: the eight faces on the settlement cards.
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
<path d="M20 8h24l-1.5 10h-21z" fill="#1b262b"/><path d="M22 9.5h9l-3.5 7h-4.5z" fill="#3f6f78"/>
<circle cx="18" cy="21.5" r="1.9" fill="#c9cfcd"/><circle cx="18" cy="21.5" r=".8" fill="#3a4448"/><circle cx="46" cy="21.5" r="1.9" fill="#8f9997"/><circle cx="46" cy="21.5" r=".8" fill="#2a3236"/>`;

/** Old Wren, cartographer: the Wren's navigator, who stayed ashore. A long, still face, white hair wound into a knot
 *  with a brass chart divider pushed through it, heavy lids, and half a smile she isn't going to explain. */
const WREN = `
<rect width="64" height="64" fill="#8f9c9c"/><path d="M0 0h64L0 46z" fill="#a4b0af"/>
<path d="M45 60l5-17 3.2 1-4.5 17z" fill="#d8ceb2"/><path d="M50 43l3.2 1-.4 1.3-3.1-1z" fill="#8c8368"/>
<path d="M10 64l6-10 10-4h12l10 4 6 10z" fill="#4f5a5c"/><path d="M32 50h6l10 4 6 10H32z" fill="#3e4749"/>
<path d="M28 42h8v8h-8z" fill="#9a7556"/>
<path d="M23 47l9 4 9-4 1 4-10 5.5-10-5.5z" fill="#6f9db3"/><path d="M32 51l9-4 1 4-10 5.5z" fill="#567f94"/>
<path d="M32.5 55.5l4.5 6-3 1.5-3.5-5z" fill="#6f9db3"/>
<path d="M20.5 31l2-.5v6l-1.5-.5z" fill="#b98c62"/><path d="M43.5 31l-2-.5v6l1.5-.5z" fill="#93694a"/>
<circle cx="21.3" cy="39.2" r="1.4" fill="#7fb0ae"/>
<path d="M22 24l4-5h12l4 5 1 10-4 10-7 4-7-4-4-10z" fill="#b98c62"/>
<path d="M34 19h4l4 5 1 10-4 10-7 4 3-13z" fill="#93694a"/>
<path d="M23 37l4 1-2 5z" fill="#a67c55"/><path d="M41 37l-4 1 2 5z" fill="#80583d"/>
<path d="M32 31l2.8 8.5-2.8 1z" fill="#7c563b"/>
<path d="M24 29.5l6-1.5v1.6l-6 1.7z" fill="#f1ecdc"/><path d="M40 29.5l-6-1.5v1.6l6 1.7z" fill="#d2cab4"/>
<path d="M24.3 33h5.4l-.6 1.5h-4.2z" fill="#2b1c15"/><path d="M34.3 33h5.4l-.6 1.5h-4.2z" fill="#2b1c15"/>
<path d="M28.5 43.3l4 .7 3.8-1.6-.4 1.5-3.4 1.4-3.7-.6z" fill="#5a3326"/>
<path d="M21 27.5l1-6.5 5-5h10l5 5 1 6.5-3-4.5-4-3h-8l-4 3z" fill="#e9e4d6"/><path d="M32 16h5l5 5 1 6.5-3-4.5-4-3h-4z" fill="#bfb9a6"/>
<path d="M27 16.5l1-6.5 4-2.5 4 2.5 1 6.5z" fill="#e9e4d6"/><path d="M32 7.5l4 2.5 1 6.5h-5z" fill="#bfb9a6"/>
<path d="M19.5 8.2l1.6-2.3 21 9.6-1.3 2.5z" fill="#b08a3c"/><path d="M19.5 8.2l1.6-2.3-4.3-1z" fill="#4a3a1c"/>`;

/** Odessa Brightly, paint and curios: chin up, one eyebrow higher than the other, a headwrap as tall as her opinion
 *  of herself, washer hoops in her ears and a swipe of her own red on one cheek. */
const ODESSA = `
<rect width="64" height="64" fill="#c7a6a0"/><path d="M0 0h64L0 46z" fill="#d8bbb5"/>
<path d="M4 64l8-11 13-5h14l13 5 8 11z" fill="#cdbf9d"/><path d="M32 48h7l13 5 8 11H32z" fill="#a89b7c"/>
<path d="M14 56.5l6-1.5 2 4-5.5 2z" fill="#b2493b"/>
<path d="M27 42h10v8H27z" fill="#5e3a2a"/>
<circle cx="19.5" cy="38.5" r="3.3" fill="none" stroke="#b88c3c" stroke-width="1.4"/><circle cx="44.5" cy="38.5" r="3.3" fill="none" stroke="#8f6a2a" stroke-width="1.4"/>
<path d="M21 26l4-4h14l4 4 .5 9-4 9-7.5 4-7.5-4-4-9z" fill="#7a4c35"/>
<path d="M35 22h4l4 4 .5 9-4 9-7.5 4 3.5-13z" fill="#5c3727"/>
<path d="M32 30.5l3 8-3 1.1z" fill="#4a2b1e"/>
<path d="M22.5 38.8l4.8-1.600.5 1.6-4.8 1.8z" fill="#b2493b"/>
<path d="M24 28.3l6.5-2.300.3 1.8-6.3 2.5z" fill="#2a1711"/><path d="M40.5 29.3l-6.5-.6v1.8l6.500.8z" fill="#1e100b"/>
<path d="M24.2 32.5l3.1-1.7 3.2 1.5-3.2-.4z" fill="#5f8f94"/><path d="M39.8 33l-3.1-1.2-3.2 1 3.2-.1z" fill="#4a7378"/>
<path d="M24.5 33.3l2.8-.9 3 1-3 1z" fill="#1c0f0a"/><path d="M39.5 33.7l-2.8-.7-3 .8 3 1z" fill="#1c0f0a"/>
<path d="M28 43l4 1 4.5-2.2-.7 2.3-3.8 1.7-3.6-.9z" fill="#a8443a"/>
<path d="M19 27l-1-9 4-8 8-4.5h6l8 4.5 4 8-1 9-5-4.5H24z" fill="#9a6a78"/>
<path d="M32 5.5h4l8 4.5 4 8-1 9-5-4.5H32z" fill="#7a5060"/>
<path d="M19.5 20.5l14-13.5 3.500.8L20.5 24z" fill="#b98893"/><path d="M34 22.5l11.5-10.5 1.5 3.5-9 7z" fill="#8b5d6c"/>
<path d="M28.5 6l3.5-3.5 4.5 1-1.5 3.5z" fill="#b98893"/>`;

/** Old Sal, fish trader: forty mouths on one roof and she feeds them all. A survival-suit hood, bleached from orange,
 *  pulled up round a broad face; one eyebrow asking "and?" while the other eye has already decided. */
const SAL = `
<rect width="64" height="64" fill="#8fb0ad"/><path d="M0 0h64L0 46z" fill="#a6c2bf"/>
<path d="M10 64l1-22 4-16 8-11 9-6 9 6 8 11 4 16 1 22z" fill="#c98350"/><path d="M32 9l9 6 8 11 4 16 1 22H32z" fill="#a5653a"/>
<path d="M17 40l2-13 6-8 7-3 7 3 6 8 2 13-3 10-12 5-12-5z" fill="#6b4f41"/><path d="M32 16l7 3 6 8 2 13-3 10-12 5z" fill="#553c31"/>
<path d="M12.5 38.5l4.5-1 .3 3-4.8 1z" fill="#d9d2c0"/>
<path d="M20 30l4-6h16l4 6v9l-4 8-8 3.5-8-3.5-4-8z" fill="#c08a66"/>
<path d="M36 24h4l4 6v9l-4 8-8 3.5 4-13z" fill="#9c6a4c"/>
<path d="M21.5 36.5l5 .5-2.5 4z" fill="#cc8a6a"/><path d="M42.5 36.5l-5 .5 2.5 4z" fill="#a26347"/>
<path d="M32 31l3.2 7.5-3.2 1.2z" fill="#8f5d42"/>
<path d="M21 31l3-7h7l-5 2.5-2.5 6z" fill="#dcd6c5"/><path d="M43 31l-3-7h-7l5 2.5 2.5 6z" fill="#aea791"/>
<path d="M23.5 29.3l6-1.8v1.8l-6 1.8z" fill="#6b5a4c"/><path d="M40.5 30.6l-6-.4v1.8l6 .4z" fill="#54463b"/>
<circle cx="26.7" cy="33.8" r="1.6" fill="#2b1c15"/><path d="M35 33.4h4.6l-.4 1.4h-3.8z" fill="#2b1c15"/>
<path d="M26.5 42.5l5.5 1.3 5.5-1.3-.5 1.6-5 1.3-5-1.3z" fill="#5a3326"/>
<path d="M27 52.5h1.7l.3 7h-2.2z" fill="#e6dfcc"/><path d="M35.3 52.5H37l.2 6h-2.2z" fill="#bdb49d"/>`;

/** Nori Kettle, raft-wright: young, anxious, and the only thing between the Hollow and the sea. A mop of hair held
 *  back with a strip of rag, ears he hasn't grown into, eyes too wide, and a coil of rope he never puts down. */
const NORI = `
<rect width="64" height="64" fill="#c4b596"/><path d="M0 0h64L0 46z" fill="#d5c8ab"/>
<path d="M9 64l5-9 11-5h14l11 5 5 9z" fill="#6a7480"/><path d="M32 50h7l11 5 5 9H32z" fill="#525b66"/>
<path d="M16 36l6 4 2.5 9-2.5 10-6 4-6-4-2.5-10 2.5-9z" fill="none" stroke="#b89462" stroke-width="5" stroke-linejoin="bevel"/>
<path d="M16 36l6 4 2.5 9-2.5 10-6 4" fill="none" stroke="#7d6240" stroke-width="1.8"/>
<path d="M28.5 43h7v8h-7z" fill="#a57a58"/>
<path d="M19.3 31l2.7-1v7l-2.2-.9z" fill="#d2a57e"/><path d="M44.7 31l-2.7-1v7l2.2-.9z" fill="#ae8360"/>
<path d="M22 24l3-4h14l3 4 .5 10-3.5 9-7 3.5-7-3.5-3.5-9z" fill="#d2a57e"/>
<path d="M35 20h4l3 4 .5 10-3.5 9-7 3.5 3.5-12z" fill="#ae8360"/>
<path d="M32 33l2 5.5-2 .8z" fill="#9a7050"/>
<path d="M24 30.8l6-2.600.4 1.7-6 2.7z" fill="#2a211c"/><path d="M40 30.8l-6-2.6-.4 1.7 6 2.7z" fill="#1f1814"/>
<circle cx="27" cy="34.5" r="2.4" fill="#efe8d6"/><circle cx="37" cy="34.5" r="2.4" fill="#cfc7b1"/>
<circle cx="27.3" cy="34.7" r="1.2" fill="#2b1c15"/><circle cx="36.7" cy="34.7" r="1.2" fill="#2b1c15"/>
<path d="M29.5 42.6l2.5-.9 2.500.9-.5 1.7h-4z" fill="#5a3326"/>
<path d="M20.5 29l.5-8 4-6 3 1.5 1.5-4 3.5 3 3-3 2 4 3.5-.5 2 6 .5 7-3-5-4-1.5-3 2-3.5-2.5-4 2-3 1.5z" fill="#3b3029"/>
<path d="M32 15.5l1-1 3-3 2 4 3.5-.5 2 6 .5 7-3-5-4-1.5-3 2-2-1.4z" fill="#2a211c"/>
<path d="M20.6 21.5h22.8l.3 2.7H20.3z" fill="#c08a86"/><path d="M32 21.5h11.4l.3 2.7H32z" fill="#a06f6d"/>
<path d="M43.5 22.3l5.2-1.500.5 2.1-4.7 1.9zM43.6 24.2l4.2 3.2-1.6 1.2-3-2.6z" fill="#a06f6d"/>`;

/** Foreman Dace, rig trader: rules, numbers and a handshake he means. A scuffed white hard hat, ear defenders he no
 *  longer notices, a jaw like a bollard and a mouth that has never once rounded a price down. */
const DACE = `
<rect width="64" height="64" fill="#8f887a"/><path d="M0 0h64L0 46z" fill="#a39c8d"/>
<path d="M3 64l4-11 16-6h18l16 6 4 11z" fill="#4a4f52"/><path d="M32 47h9l16 6 4 11H32z" fill="#393d40"/>
<path d="M20 48l5 16h-5l-4-13z" fill="#cfc9b6"/><path d="M44 48l-5 16h5l4-13z" fill="#a7a18f"/>
<path d="M26 41h12v8H26z" fill="#7a5238"/>
<path d="M14.5 28.5l5-1 .5 10-5.5-1z" fill="#6e7477"/><path d="M49.5 28.5l-5-1-.5 10 5.5-1z" fill="#4b5154"/>
<path d="M21 23h22l1.5 12-3 9.5-4 3.5h-11l-4-3.5-3-9.5z" fill="#a8744f"/>
<path d="M36 23h7l1.5 12-3 9.5-4 3.5H32l4-12z" fill="#865a3b"/>
<path d="M23.5 40l3.5 4.5h5v3.5h-5.5L24 45z" fill="#96694a"/><path d="M40.5 40L37 44.5h-5V48h5.5l2.5-3z" fill="#74503a"/>
<path d="M32 31l-2.8 7.5 2.8 1z" fill="#b78361"/><path d="M32 31l3.2 7.5-3.2 1z" fill="#6e482f"/>
<path d="M24.5 32.8H30v1.9h-5.5z" fill="#e6dfcc"/><path d="M34 32.8h5.5v1.9H34z" fill="#bdb49d"/>
<circle cx="27.3" cy="33.8" r="1.1" fill="#1c110c"/><circle cx="36.7" cy="33.8" r="1.1" fill="#1c110c"/>
<path d="M23.5 29.5h7v2.1h-7z" fill="#2c1d15"/><path d="M33.5 29.5h7v2.1h-7z" fill="#20140e"/>
<path d="M27.5 42.8h9l-.4 1.5h-8.2z" fill="#4a2a1e"/>
<path d="M18 24l1-9 5-6h16l5 6 1 9z" fill="#e4ddca"/><path d="M32 9h8l5 6 1 9H32z" fill="#b9b29d"/>
<path d="M30 8.5h4V24h-4z" fill="#cfc8b3"/><path d="M21 14.5l4-1-.5 3-3.500.5z" fill="#a9a28e"/>
<path d="M15.5 26.5l2.5-3h28l2.5 3z" fill="#d6cfbb"/><path d="M32 23.5h14l2.5 3H32z" fill="#a59e8a"/>`;

/** Vik Ashby, rig mechanic: a salesman's grin on a mechanic's face. A quiff that survives any weather, sunburn across
 *  the nose, faded blue coveralls with the collar up, and a spanner over his shoulder like he was just leaving. */
const VIK = `
<rect width="64" height="64" fill="#c49a78"/><path d="M0 0h64L0 46z" fill="#d5b092"/>
<path d="M43.5 62l4.5-24 3.5.8-4.5 24z" fill="#5f6b70"/><path d="M45.5 39l-2-7.5 3.5-3 1.5 4.5 3 .8 1-4.5 4 4-3.5 7z" fill="#74828a"/>
<path d="M5 64l5-10 14-5h16l14 5 5 10z" fill="#6c93a8"/><path d="M32 49h8l14 5 5 10H32z" fill="#527589"/>
<path d="M22 46l5 2-2 8-6-5z" fill="#86abbd"/><path d="M42 46l-5 2 2 8 6-5z" fill="#5e8296"/>
<path d="M27 41h10v8H27z" fill="#b98a6c"/>
<path d="M19.5 31l2-.5v6l-1.5-.5z" fill="#dba98a"/><path d="M44.5 31l-2-.5v6l1.5-.5z" fill="#b98263"/>
<path d="M21.5 25l3-4h15l3 4 .5 10-3.5 9-7.5 4-7.5-4-3.5-9z" fill="#dba98a"/>
<path d="M35.5 21h4l3 4 .5 10-3.5 9-7.5 4 3.5-13z" fill="#b98263"/>
<path d="M22.5 37l4.500.5-2 3.5z" fill="#d99378"/><path d="M38.5 37.2l3-.5-.5 2-2.500.5z" fill="#5a4a40"/>
<path d="M32 31l3 7.5-3 1.2z" fill="#b0705a"/>
<path d="M24 29.7l6-1 .2 1.7-6.2 1.3z" fill="#7a5a2e"/><path d="M40 28.5l-6 1.200.2 1.7 6-1.1z" fill="#5f4522"/>
<circle cx="27" cy="33.7" r="1.5" fill="#2b1c15"/><circle cx="37" cy="33.5" r="1.5" fill="#2b1c15"/>
<path d="M25.5 41l13-1.5-1.5 5-5 2-5-1.5z" fill="#3a2019"/><path d="M26.5 41.2l11-1.2-.6 2.2-9.6 1z" fill="#efe8d6"/>
<path d="M32 40.6h.9l-.1 2.2H32z" fill="#3a2019"/>
<path d="M21 28h2l.5 8-2-1z" fill="#b08a4e"/><path d="M43 28h-2l-.5 8 2-1z" fill="#8a693a"/>
<path d="M20.5 28l-.5-7 3-6 7-5 9-1.5 6 3 1 5-2 4.500.5 7-3-6.5-4-2-9 1-4.5 3z" fill="#b08a4e"/>
<path d="M32 9.5l7-1 6 3 1 5-2 4.500.5 7-3-6.5-4-2-5.500.6z" fill="#8a693a"/>
<path d="M23 17.5l8-6 8-1.5-7 4.5-8 5z" fill="#c9a566"/>`;

const PORTRAITS = { pip: PIP, marlo: MARLO, wren: WREN, odessa: ODESSA, sal: SAL, nori: NORI, dace: DACE, vik: VIK };

export type PortraitId = keyof typeof PORTRAITS;

/** A harbor character's portrait, to sit inside the card's ring. Decorative: the card names them. */
export function portraitSVG(id: PortraitId): string {
  return `<svg class="portrait" viewBox="7 5 50 50" aria-hidden="true">${PORTRAITS[id]}</svg>`;
}
