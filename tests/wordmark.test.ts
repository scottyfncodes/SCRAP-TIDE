import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { wordmarkSVG } from '../src/ui/brand';
import { WORDMARK_D } from '../src/ui/wordmarkPath';

describe('SCRAP TIDE wordmark', () => {
  it('is outlines, not live text (Safari ignores the textLength stretch live text needed)', () => {
    const svg = wordmarkSVG();
    expect(svg).not.toMatch(/<text/);
    expect(svg).not.toMatch(/textLength/);
  });

  it('keeps every letter inside its 640-wide box, so nothing is clipped', () => {
    const xs = [...WORDMARK_D.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map((m) => +m[1]);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(12);
    expect(Math.max(...xs)).toBeLessThanOrEqual(628);
  });

  it('has no brown layer, and the branding file matches the game', () => {
    expect(wordmarkSVG()).not.toMatch(/5E2A19/i);
    const file = readFileSync('creative/branding/wordmark_scrap-tide_v1.svg', 'utf8');
    expect(file).toContain(WORDMARK_D);
    expect(file).not.toMatch(/5E2A19|<text/i);
  });
});
