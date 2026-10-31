import { describe, expect, it } from 'vitest';
import { createFrequencySmoother } from './smooth';

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
});
