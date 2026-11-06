import { describe, expect, it } from 'vitest';
import { RIPPLE_MS, rippleProgress, shouldStartRipple } from './ripple';

describe('in-tune ripple', () => {
  it('fires once when the reading locks, and again only after it leaves', () => {
    expect(shouldStartRipple(false, true, false)).toBe(true);
    expect(shouldStartRipple(true, true, false)).toBe(false);
    expect(shouldStartRipple(true, false, false)).toBe(false);
    expect(shouldStartRipple(false, true, false)).toBe(true);
  });

  it('stays quiet when motion is reduced', () => {
    expect(shouldStartRipple(false, true, true)).toBe(false);
    expect(shouldStartRipple(true, true, true)).toBe(false);
  });

  it('runs a single ring out from the start and then ends', () => {
    expect(rippleProgress(0)).toBe(0);
    expect(rippleProgress(RIPPLE_MS / 2)).toBeCloseTo(0.5, 5);
    expect(rippleProgress(RIPPLE_MS - 1)).toBeGreaterThan(0.9);
    expect(rippleProgress(RIPPLE_MS)).toBeNull();
    expect(rippleProgress(-1)).toBeNull();
  });
});