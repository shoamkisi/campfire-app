import { describe, expect, it } from 'vitest';
import { RING_HOLD_FRAMES, RING_HOLD_MS, TUNER_FRAME_MS, createFrequencySmoother } from './smooth';

describe('pitch smoother', () => {
  it('settles on the median instead of the latest jitter', () => {
    const smoother = createFrequencySmoother();
    const frames = [110, 112, 108, 110.4, 109.2, 140];
    let last = 0;
    for (const frequency of frames) last = smoother.push({ frequency }) ?? 0;
    expect(Math.abs(last - 110)).toBeLessThan(2);
  });

  it('waits for a few frames before believing a new note', () => {
    const smoother = createFrequencySmoother({ switchAfter: 3 });
    smoother.push({ frequency: 110 });
    smoother.push({ frequency: 110 });
    const spike = smoother.push({ frequency: 220 });
    expect(spike).toBeCloseTo(110, 3);
    smoother.push({ frequency: 220 });
    const switched = smoother.push({ frequency: 220 });
    expect(switched).toBeCloseTo(220, 3);
  });

  it('holds through a short silence, then lets go', () => {
    const smoother = createFrequencySmoother({ hold: 3 });
    smoother.push({ frequency: 146.83 });
    expect(smoother.push(null)).toBeCloseTo(146.83, 2);
    expect(smoother.push(null)).toBeCloseTo(146.83, 2);
    expect(smoother.push(null)).toBeNull();
  });

  it('keeps a ringing note for several seconds, then clears on true silence', () => {
    expect(RING_HOLD_MS).toBeGreaterThanOrEqual(4000);
    expect(RING_HOLD_MS).toBeLessThanOrEqual(7000);
    expect(RING_HOLD_FRAMES * TUNER_FRAME_MS).toBe(RING_HOLD_MS);

    const smoother = createFrequencySmoother();
    smoother.push({ frequency: 82.41 });
    for (let i = 0; i < RING_HOLD_FRAMES - 1; i++) {
      expect(smoother.push(null)).toBeCloseTo(82.41, 2);
    }
    expect(smoother.push(null)).toBeNull();
  });

  it('keeps tracking a note that is still arriving, and swaps when a new one settles', () => {
    const smoother = createFrequencySmoother();
    smoother.push({ frequency: 110 });
    const flatter = 110 * 2 ** (-10 / 1200);
    const tracked = smoother.push({ frequency: flatter });
    expect(tracked).toBeLessThan(110);
    expect(tracked).toBeGreaterThan(flatter - 0.01);

    for (let i = 0; i < 12; i++) expect(smoother.push(null)).toBeCloseTo(tracked!, 2);

    expect(smoother.push({ frequency: 146.83 })).toBeCloseTo(tracked!, 2);
    expect(smoother.push({ frequency: 146.83 })).toBeCloseTo(tracked!, 2);
    expect(smoother.push({ frequency: 146.83 })).toBeCloseTo(146.83, 2);
  });
});
