// World-art style spec (src/world/style.ts, docs/art-direction/STYLE-GUIDE.md): no universal outline, a soft lifted
// light ramp, and baked form shading that defines buildings, props and people by light instead of ink.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { OUTLINE, LIGHT_RAMP, WEAR, FORM_SHADE, CHARACTER_FORM, FORM_SHADED, WORLD_PALETTE, isFormShaded } from '../src/world/style';
import { formShade } from '../src/world/assets';

function column(colour: [number, number, number]) {
  // a 1 x 4 x 1 box: base at y=0, top at y=4
  const g = new THREE.BoxGeometry(1, 4, 1).toNonIndexed();
  g.translate(0, 2, 0);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set(colour, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

describe('outline policy', () => {
  it('has no universal outline on heroes, and any opt-in line is thin and not black', () => {
    expect(OUTLINE.hull).toBe(0);
    expect(OUTLINE.crew).toBe(0);
    expect(OUTLINE.captain).toBe(0);
    expect(OUTLINE.maxWidth).toBeLessThanOrEqual(0.012);
    const ink = new THREE.Color(OUTLINE.ink);
    expect(ink.r + ink.g + ink.b).toBeGreaterThan(0.03); // not black
  });
});

describe('light ramp and wear', () => {
  it('lifts the shadow band (no dark contour step) and rises monotonically', () => {
    expect(LIGHT_RAMP[0]).toBeGreaterThanOrEqual(70);
    for (let i = 1; i < LIGHT_RAMP.length; i++) expect(LIGHT_RAMP[i]).toBeGreaterThanOrEqual(LIGHT_RAMP[i - 1]);
    expect(LIGHT_RAMP[LIGHT_RAMP.length - 1]).toBe(255);
  });
  it('keeps grime and the tide line off black', () => {
    expect(WEAR.grimeFloor).toBeGreaterThan(0.5);
    expect(Math.min(...WEAR.algae)).toBeGreaterThan(0.12);
  });
});

describe('formShade', () => {
  it('darkens the base, leaves the top lit, and keeps the vertex count', () => {
    const g = column([0.5, 0.5, 0.5]);
    const n = g.attributes.position.count;
    formShade(g);
    expect(g.attributes.position.count).toBe(n);
    let base = 1, top = 0;
    for (let i = 0; i < n; i++) {
      const y = g.attributes.position.getY(i), ny = g.attributes.normal.getY(i), v = g.attributes.color.getX(i);
      if (y < 0.01 && Math.abs(ny) < 0.1) base = Math.min(base, v);
      if (y > 3.99 && ny > 0.9) top = Math.max(top, v);
    }
    expect(base).toBeCloseTo(0.5 * FORM_SHADE.contactFloor, 3);
    expect(top).toBeGreaterThan(0.5);
  });
  it('lifts pure black openings to a deep warm shadow', () => {
    const g = column([0, 0, 0]);
    formShade(g);
    const open = new THREE.Color(WORLD_PALETTE.opening);
    expect(g.attributes.color.getX(0)).toBeCloseTo(open.r, 4);
    expect(g.attributes.color.getX(0)).toBeGreaterThan(0);
  });
  it('is gentler on people than on buildings', () => {
    expect(CHARACTER_FORM.contactFloor).toBeGreaterThan(FORM_SHADE.contactFloor);
  });
  it('covers one building family and several props', () => {
    expect(isFormShaded('tb_settlement_kit', 'mod_shack')).toBe(true);
    expect(FORM_SHADED.tb_coast_kit.length).toBeGreaterThanOrEqual(3);
    expect(isFormShaded('tb_tower_glass', 'anything')).toBe(false);
  });
});
