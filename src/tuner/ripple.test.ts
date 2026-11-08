import { describe, expect, it } from 'vitest';
import { RIPPLE_MS, WAVE_PUSH, WAVE_REACH, rippleProgress, shouldStartRipple, waveOffset } from './ripple';

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

  it('runs a single wave out from the start and then ends', () => {
    expect(rippleProgress(0)).toBe(0);
    expect(rippleProgress(RIPPLE_MS / 2)).toBeCloseTo(0.5, 5);
    expect(rippleProgress(RIPPLE_MS - 1)).toBeGreaterThan(0.9);
    expect(rippleProgress(RIPPLE_MS)).toBeNull();
    expect(rippleProgress(-1)).toBeNull();
  });

  it('moves the sand itself and lets it settle, instead of drawing a circle', () => {
    const progress = 0.36 / WAVE_REACH;
    const crest = waveOffset(0.5 + 0.36, 0.5, progress);
    const behind = waveOffset(0.5 + 0.08, 0.5, progress);
    const ahead = waveOffset(0.5 + 0.62, 0.5, progress);
    expect(WAVE_PUSH).toBeLessThan(0.09);
    expect(WAVE_PUSH).toBeGreaterThan(0.03);
    expect(crest.x).toBeGreaterThan(0.03);
    expect(crest.x).toBeLessThan(0.06);
    expect(Math.abs(crest.y)).toBeLessThan(0.001);
    expect(Math.hypot(behind.x, behind.y)).toBeLessThan(Math.hypot(crest.x, crest.y) * 0.25);
    expect(Math.hypot(ahead.x, ahead.y)).toBeLessThan(Math.hypot(crest.x, crest.y) * 0.25);
    const passed = waveOffset(0.5 + 0.36, 0.5, 0.95);
    expect(Math.hypot(passed.x, passed.y)).toBeLessThan(0.01);
  });
});