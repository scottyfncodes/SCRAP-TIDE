// Icons for living plants. Drawn as salvaged containers holding something green: the container is grimy
// survivor stuff, the plant is the one clean, saturated thing in the picture.
const G = '#57e05f';
const GD = '#239a3a';
const GH = '#a8f56e';
const leaf = (x: number, y: number, r: number, rot: number, c = G) =>
  `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * 0.5).toFixed(1)}" transform="rotate(${rot} ${x} ${y})" fill="${c}"/>`;

export const LIVING_ICONS: Record<string, (a: string, b: string) => string> = {
  algae: (a, b) =>
    `<path d="M8 40c6-6 14-8 22-6s14 4 26-2c-2 8-10 14-22 14S10 48 8 40z" fill="${b}"/><path d="M12 38c6-4 12-6 20-4s12 2 20-2c-4 6-10 9-20 9s-16-1-20-3z" fill="${a}"/>` +
    `<circle cx="22" cy="38" r="2.5" fill="${GH}"/><circle cx="36" cy="40" r="2" fill="${GH}"/><circle cx="44" cy="36" r="1.6" fill="${GH}"/><path d="M6 46c10 3 40 3 52 0" stroke="#3c4a5c" stroke-width="2" fill="none" opacity=".5"/>`,
  seaweed: (a, b) =>
    `<rect x="10" y="44" width="44" height="7" rx="3" fill="#a3916c" transform="rotate(-6 32 47)"/>` +
    `<path d="M18 46c-4-10 6-16 0-30M28 45c4-10-6-18 2-34M38 44c-4-8 8-14 2-28M46 43c3-6-2-12 4-20" stroke="${a}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<path d="M28 45c4-10-6-18 2-34" stroke="${b}" stroke-width="2" fill="none"/>`,
  sprout: (a, b) =>
    `<rect x="20" y="30" width="24" height="24" rx="2" fill="${b}"/><rect x="20" y="34" width="24" height="8" fill="#c8352a" opacity=".85"/><path d="M20 30h24v3H20z" fill="#5a5f66"/>` +
    `<path d="M32 30V18" stroke="${GD}" stroke-width="2.5"/>${leaf(25, 16, 8, -25, a)}${leaf(39, 14, 8, 25, GH)}`,
  moss: (a, b) =>
    `<path d="M10 36h44l-4 18H14z" fill="${b}"/><path d="M10 36h44v4H10z" fill="#6e4b2a"/><path d="M18 40v14M32 40v14M46 40v14" stroke="#4e2f1a" stroke-width="2"/>` +
    `<path d="M12 36c0-10 8-14 14-12 2-6 12-8 16-2 6-2 12 4 10 14z" fill="${a}"/><circle cx="24" cy="28" r="3" fill="${GH}"/><circle cx="40" cy="27" r="2.5" fill="${GH}"/>`,
  soiljar: (a, b) =>
    `<rect x="18" y="10" width="28" height="7" rx="2" fill="#7f8a94"/><path d="M20 17h24v34c0 3-2 5-5 5H25c-3 0-5-2-5-5z" fill="${b}" opacity=".55"/>` +
    `<path d="M21 30h22v20c0 3-2 5-5 5H26c-3 0-5-2-5-5z" fill="${a}"/><circle cx="27" cy="38" r="1.5" fill="#8a6a45"/><circle cx="36" cy="45" r="1.5" fill="#8a6a45"/>` +
    `<path d="M32 30v-6" stroke="${GD}" stroke-width="2"/>${leaf(35, 23, 4, 20, G)}<path d="M23 20v28" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`,
  plant: (a, b) =>
    `<path d="M20 38h24l-3 18H23z" fill="${b}"/><path d="M19 36h26v4H19z" fill="#7f8a94"/><path d="M32 38V24" stroke="${GD}" stroke-width="3"/>` +
    `${leaf(22, 28, 10, -30, GD)}${leaf(42, 28, 10, 30, GD)}${leaf(24, 18, 9, -55, a)}${leaf(40, 18, 9, 55, a)}${leaf(32, 12, 8, 90, GH)}`,
  bloom: (a, b) =>
    `<rect x="16" y="46" width="32" height="8" rx="2" fill="#6e4b2a"/><path d="M32 46V28" stroke="${GD}" stroke-width="2.5"/>${leaf(25, 38, 7, -30, b)}${leaf(39, 36, 7, 30, b)}` +
    `${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="32" cy="18" rx="4" ry="7" transform="rotate(${r} 32 24)" fill="${r % 144 ? '#f2eedd' : a}"/>`).join('')}<circle cx="32" cy="24" r="3.5" fill="#d2702f"/>` +
    `<path d="M14 54V24c0-10 8-16 18-16s18 6 18 16v30" fill="none" stroke="#cfe6f0" stroke-width="2.5" opacity=".8"/>`,
  fruitvine: (a, b) =>
    `<path d="M18 40h28v16H18z" fill="#a24b21"/><path d="M17 38h30v4H17z" fill="#6b2e14"/><path d="M24 40L28 8M40 40L36 8" stroke="#c9a97a" stroke-width="2"/>` +
    `${leaf(24, 26, 8, -40, GD)}${leaf(40, 22, 8, 40, b)}${leaf(30, 14, 7, -10, GH)}${leaf(36, 32, 7, 20, b)}` +
    `<circle cx="22" cy="32" r="5" fill="${a}"/><circle cx="41" cy="30" r="5" fill="${a}"/><circle cx="33" cy="22" r="4.5" fill="${a}"/><circle cx="20" cy="31" r="1.4" fill="#fff" opacity=".6"/>`,
  sapling: (a, b) =>
    `<path d="M16 40h32v16H16z" fill="${b}"/><path d="M15 38h34v4H15z" fill="#6b2e14"/><path d="M32 40V20" stroke="#4e2f1a" stroke-width="3.5"/><path d="M32 30l7-6" stroke="#4e2f1a" stroke-width="2"/>` +
    `<circle cx="32" cy="18" r="11" fill="${GD}"/><circle cx="26" cy="20" r="7" fill="${a}"/><circle cx="38" cy="16" r="7" fill="${a}"/><circle cx="33" cy="11" r="5" fill="${GH}"/>` +
    `<circle cx="27" cy="25" r="2.2" fill="#f6d343"/><circle cx="39" cy="22" r="2.2" fill="#f6d343"/>` +
    `<path d="M12 56V8M52 56V8M12 8h40M12 24h40M12 40h40" stroke="#7f8a94" stroke-width="1.6" fill="none"/>`,
};
