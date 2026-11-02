// Illustrated SVG icons for every collectible. Silhouette mode renders undiscovered entries.
import { ITEM_MAP } from '../data/items';

function shape(icon: string, a: string, b: string): string {
  switch (icon) {
    case 'coin':
      return `<circle cx="32" cy="34" r="20" fill="${b}"/><circle cx="32" cy="31" r="20" fill="${a}"/><circle cx="32" cy="31" r="14" fill="none" stroke="${b}" stroke-width="2.5"/><path d="M27 24h10M32 22v18M27 38h10" stroke="${b}" stroke-width="3" stroke-linecap="round"/><ellipse cx="25" cy="22" rx="5" ry="3" fill="#fff" opacity=".45"/>`;
    case 'pearl':
      return `<ellipse cx="32" cy="46" rx="18" ry="6" fill="${b}" opacity=".5"/><circle cx="32" cy="32" r="16" fill="${a}"/><circle cx="32" cy="32" r="16" fill="url(#sh)"/><ellipse cx="26" cy="25" rx="5" ry="4" fill="#fff" opacity=".9"/>`;
    case 'ring':
      return `<ellipse cx="32" cy="38" rx="17" ry="13" fill="none" stroke="${a}" stroke-width="7"/><ellipse cx="32" cy="38" rx="17" ry="13" fill="none" stroke="#000" stroke-opacity=".15" stroke-width="2"/><rect x="24" y="14" width="16" height="13" rx="3" fill="${a}"/><circle cx="32" cy="20" r="5" fill="${b}"/>`;
    case 'gem':
      return `<path d="M18 24 26 14h12l8 10-14 26z" fill="${a}"/><path d="M18 24h28L32 50z" fill="${b}" opacity=".55"/><path d="M26 14l6 10 6-10" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/><path d="M22 22l4-5" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`;
    case 'bar':
      return `<path d="M10 40 20 26h28l8 14z" fill="${b}"/><path d="M20 26h28l-4-6H24z" fill="${a}"/><path d="M10 40h46v6H10z" fill="${b}" opacity=".7"/><path d="M14 40l8-12h24l6 12z" fill="${a}"/><path d="M28 30v8M34 30v8" stroke="${b}" stroke-width="2"/>`;
    case 'idol':
      return `<ellipse cx="32" cy="50" rx="18" ry="4" fill="#000" opacity=".2"/><ellipse cx="32" cy="38" rx="20" ry="11" fill="${a}"/><path d="M16 36c4-12 28-12 32 0" fill="${b}" opacity=".5"/><circle cx="50" cy="32" r="7" fill="${a}"/><circle cx="52" cy="30" r="1.6" fill="#111"/><path d="M14 44l-4 4M20 46l-2 5M44 46l2 5M48 44l4 4" stroke="${a}" stroke-width="4" stroke-linecap="round"/><path d="M22 34l5 4 5-4 5 4 5-4" stroke="${b}" stroke-width="2" fill="none"/>`;
    case 'whistle':
      return `<ellipse cx="30" cy="36" rx="16" ry="12" fill="${a}"/><path d="M44 32l12-4v10l-12-2z" fill="${b}"/><circle cx="26" cy="32" r="3" fill="${b}"/><path d="M18 26c4-6 12-8 18-4" stroke="#fff" stroke-opacity=".4" stroke-width="2" fill="none"/><path d="M16 28l-6-6M20 24l-2-8" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`;
    case 'mask':
      return `${Array.from({ length: 12 }, (_, i) => { const an = (i / 12) * Math.PI * 2; const x = 32 + Math.cos(an) * 24, y = 32 + Math.sin(an) * 24; return `<path d="M32 32 L${x.toFixed(1)} ${y.toFixed(1)}" stroke="${a}" stroke-width="5" stroke-linecap="round"/>`; }).join('')}<circle cx="32" cy="32" r="16" fill="${a}"/><circle cx="32" cy="32" r="16" fill="none" stroke="${b}" stroke-width="2"/><ellipse cx="26" cy="29" rx="3.5" ry="2.5" fill="#fff"/><ellipse cx="38" cy="29" rx="3.5" ry="2.5" fill="#fff"/><path d="M27 39q5 4 10 0" stroke="${b}" stroke-width="2.5" fill="none"/>`;
    case 'page':
      return `<path d="M14 12h30l8 8v32H14z" fill="${a}"/><path d="M44 12v8h8" fill="${b}" opacity=".3"/><path d="M20 24h24M20 30h26M20 36h20M20 42h24" stroke="${b}" stroke-width="2" opacity=".7"/><path d="M14 52c6-3 10 2 16-1s10 2 22-1" stroke="${b}" stroke-width="1.5" fill="none" opacity=".5"/>`;
    case 'flag':
      return `<path d="M14 8v50" stroke="#5a3a1e" stroke-width="4" stroke-linecap="round"/><path d="M16 10h34l-4 7 6 6-4 6 4 5H16z" fill="${a}"/><circle cx="32" cy="20" r="6" fill="${b}"/><path d="M24 30l16 6M40 30l-16 6" stroke="${b}" stroke-width="3"/>`;
    case 'conch':
      return `<path d="M12 40c0-14 16-26 30-24 8 1 12 8 10 14-2 10-14 18-28 18-6 0-12-3-12-8z" fill="${a}"/><path d="M42 16l6-8M48 22l8-4M50 30l8 2" stroke="${a}" stroke-width="4" stroke-linecap="round"/><path d="M18 42c8 2 18-2 24-10" stroke="${b}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 32c6-6 14-8 20-6" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/>`;
    case 'spiral':
      return `<path d="M32 52c-12 0-20-8-20-18 0-8 6-14 14-14 6 0 10 4 10 10 0 4-3 7-7 7-3 0-5-2-5-5" fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round"/><path d="M32 52c10 0 20-8 20-20 0-14-12-22-24-20" fill="${a}" opacity=".95"/><path d="M32 52c-12 0-20-8-20-18 0-8 6-14 14-14 6 0 10 4 10 10 0 4-3 7-7 7-3 0-5-2-5-5" fill="none" stroke="${b}" stroke-width="3" stroke-linecap="round"/>`;
    case 'sanddollar':
      return `<circle cx="32" cy="32" r="20" fill="${a}"/><circle cx="32" cy="32" r="20" fill="none" stroke="${b}" stroke-width="2"/>${[0, 1, 2, 3, 4].map((i) => { const an = (i / 5) * Math.PI * 2 - Math.PI / 2; return `<ellipse cx="${(32 + Math.cos(an) * 8).toFixed(1)}" cy="${(32 + Math.sin(an) * 8).toFixed(1)}" rx="2.4" ry="5" transform="rotate(${(an * 180) / Math.PI + 90} ${(32 + Math.cos(an) * 8).toFixed(1)} ${(32 + Math.sin(an) * 8).toFixed(1)})" fill="${b}"/>`; }).join('')}`;
    case 'starfish': {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const an = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 9 : 22;
        d += `${i ? 'L' : 'M'}${(32 + Math.cos(an) * r).toFixed(1)} ${(33 + Math.sin(an) * r).toFixed(1)}`;
      }
      return `<path d="${d}z" fill="${a}" stroke="${b}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="32" cy="33" r="3" fill="${b}"/>`;
    }
    case 'seaglass':
      return `<path d="M18 28l10-12 16 4 6 14-10 14-16-2z" fill="${a}" opacity=".85"/><path d="M28 16l16 4 6 14" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/><path d="M22 30l8-8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
    case 'coral':
      return `<path d="M32 56V36M32 40l-10-10V18M32 38l10-12V14M22 28l-6-6M42 26l8-4M32 46l-12-4" stroke="${a}" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="22" cy="18" r="3" fill="${b}"/><circle cx="42" cy="14" r="3" fill="${b}"/><circle cx="16" cy="22" r="3" fill="${b}"/><circle cx="50" cy="22" r="3" fill="${b}"/>`;
    case 'bell':
      return `<path d="M30 8h4v6h-4z" fill="${b}"/><path d="M18 44c2-4 2-10 2-16 0-8 5-14 12-14s12 6 12 14c0 6 0 12 2 16z" fill="${a}"/><path d="M14 44h36v4H14z" fill="${b}"/><circle cx="32" cy="52" r="4" fill="${b}"/><path d="M24 22c2-3 5-4 8-4" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" fill="none"/>`;
    case 'spyglass':
      return `<g transform="rotate(-30 32 32)"><rect x="6" y="27" width="16" height="10" rx="2" fill="${a}"/><rect x="20" y="25" width="18" height="14" rx="2" fill="${b}"/><rect x="36" y="23" width="22" height="18" rx="3" fill="${a}"/><rect x="22" y="25" width="3" height="14" fill="${a}"/><rect x="40" y="23" width="3" height="18" fill="${b}"/><ellipse cx="58" cy="32" rx="2" ry="8" fill="#9fd3ff"/></g>`;
    case 'sextant':
      return `<path d="M14 48 32 12l18 36z" fill="none" stroke="${a}" stroke-width="4"/><path d="M14 48q18 10 36 0" fill="none" stroke="${a}" stroke-width="5"/><path d="M32 12l10 30" stroke="${b}" stroke-width="3"/><circle cx="32" cy="12" r="3.5" fill="${b}"/><rect x="22" y="28" width="8" height="5" fill="${b}"/>`;
    case 'key':
      return `<circle cx="20" cy="32" r="10" fill="none" stroke="${a}" stroke-width="5"/><path d="M30 32h24M46 32v8M52 32v6" stroke="${a}" stroke-width="5" stroke-linecap="round"/><circle cx="16" cy="26" r="3" fill="${b}"/><circle cx="40" cy="30" r="2.5" fill="${b}"/>`;
    case 'bottle':
      return `<path d="M26 8h12v6h-12z" fill="#a0703a"/><path d="M27 14h10v6c8 4 10 10 10 16v16c0 3-2 5-5 5H22c-3 0-5-2-5-5V36c0-6 2-12 10-16z" fill="${a}" opacity=".8"/><rect x="23" y="32" width="18" height="14" rx="2" fill="${b}" transform="rotate(-8 32 39)"/><path d="M21 34v14" stroke="#fff" stroke-opacity=".6" stroke-width="2.5"/>`;
    case 'plank':
      return `<rect x="8" y="22" width="48" height="12" rx="3" fill="${a}" transform="rotate(-10 32 28)"/><rect x="10" y="34" width="44" height="11" rx="3" fill="${b}" transform="rotate(6 32 40)"/><path d="M16 26h18M20 39h22" stroke="${b}" stroke-width="1.5" opacity=".5"/>`;
    case 'rope':
      return `<ellipse cx="32" cy="34" rx="20" ry="16" fill="none" stroke="${b}" stroke-width="7"/><ellipse cx="32" cy="34" rx="20" ry="16" fill="none" stroke="${a}" stroke-width="5" stroke-dasharray="6 3"/><ellipse cx="32" cy="34" rx="11" ry="8" fill="none" stroke="${a}" stroke-width="5"/>`;
    case 'nails':
      return `${[0, 1, 2].map((i) => `<g transform="rotate(${-20 + i * 20} 32 32)"><rect x="${28 + i * 0}" y="12" width="5" height="34" fill="${a}"/><rect x="24" y="10" width="13" height="4" rx="1" fill="${b}"/><path d="M28 46l2.5 6 2.5-6z" fill="${a}"/></g>`).join('')}`;
    case 'cloth':
      return `<path d="M12 18c8-4 16 4 24 0s12-2 16 2v28c-6-4-10 0-16 2s-16-6-24-2z" fill="${a}"/><path d="M12 18v28" stroke="${b}" stroke-width="2"/><path d="M18 26c6 2 10-2 16 0M18 36c6 2 12-2 18 0" stroke="${b}" stroke-width="1.5" fill="none" stroke-dasharray="3 2"/>`;
    case 'map':
      return `<path d="M10 16l14-4 16 4 14-4v36l-14 4-16-4-14 4z" fill="#efdcb0"/><path d="M24 12v36M40 16v36" stroke="#b08a50" stroke-width="1.5"/><path d="M14 40c6-6 10 2 16-6s10-2 14-8" stroke="#7a4a21" stroke-width="2" stroke-dasharray="3 3" fill="none"/><path d="M42 22l6 6M48 22l-6 6" stroke="#c0392b" stroke-width="3"/>`;
    default:
      return `<circle cx="32" cy="32" r="16" fill="${a}"/>`;
  }
}

export function iconSVG(id: string, opts: { silhouette?: boolean; size?: number } = {}) {
  const d = ITEM_MAP[id];
  const icon = d ? d.icon : id;
  let [a, b] = d ? d.colors : ['#efdcb0', '#7a4a21'];
  if (opts.silhouette) {
    a = '#3b2c22';
    b = '#2a1f18';
  }
  const size = opts.size ?? 48;
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sh" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient></defs>${shape(icon, a, b)}</svg>`;
}
