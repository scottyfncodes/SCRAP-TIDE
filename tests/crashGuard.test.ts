import { describe, it, expect } from 'vitest';
import { isReportable, errorText, guardFrame } from '../src/core/crashGuard';

describe('crash guard', () => {
  const origin = 'https://scrap-tide.example';

  it('reports the game’s own errors', () => {
    expect(isReportable("Cannot read properties of undefined (reading 'x')", `${origin}/assets/game-abc.js`, origin)).toBe(true);
    expect(isReportable('boom', '', origin)).toBe(true);
  });

  it('ignores browser noise and other origins', () => {
    expect(isReportable('ResizeObserver loop completed with undelivered notifications.', '', origin)).toBe(false);
    expect(isReportable('Script error.', '', origin)).toBe(false);
    expect(isReportable('x', 'chrome-extension://abc/inject.js', origin)).toBe(false);
    expect(isReportable('x', 'https://ads.other.example/w.js', origin)).toBe(false);
    expect(isReportable("NotAllowedError: play() failed because the user didn't interact", '', origin)).toBe(false);
    expect(isReportable('', '', origin)).toBe(false);
  });

  it('turns anything thrown into readable text', () => {
    expect(errorText(new Error('sank'))).toBe('sank');
    expect(errorText('plain')).toBe('plain');
    expect(errorText({ code: 7 })).toBe('{"code":7}');
  });

  it('keeps the loop running through a bad frame and resets on a good one', () => {
    const state = { fails: 0 };
    let threw = false;
    const ok = guardFrame(() => {
      if (!threw) {
        threw = true;
        throw new Error('one bad frame');
      }
    }, state, 99);
    expect(ok).toBe(true);
    expect(state.fails).toBe(1);
    expect(guardFrame(() => {}, state)).toBe(true);
    expect(state.fails).toBe(0);
  });

  it('stops the loop when every frame keeps throwing', () => {
    const state = { fails: 0 };
    const bad = () => {
      throw new Error('stuck');
    };
    let runs = 0;
    while (guardFrame(bad, state, 30)) runs++;
    expect(runs).toBe(29);
    expect(state.fails).toBe(30);
  });
});
