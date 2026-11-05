import { describe, expect, it } from 'vitest';
import { NEEDLE_CENTS } from '../pitch/notes';
import { LINE_METER, markerX } from './lineMeter';

describe('line meter', () => {
  it('rests on center and moves flat left, sharp right', () => {
    const center = LINE_METER.width / 2;
    expect(markerX(0)).toBe(center);
    expect(markerX(-1)).toBeLessThan(center);
    expect(markerX(1)).toBeGreaterThan(center);
    expect(markerX(-NEEDLE_CENTS)).toBe(LINE_METER.inset);
    expect(markerX(NEEDLE_CENTS)).toBe(LINE_METER.width - LINE_METER.inset);
    expect(markerX(-NEEDLE_CENTS - 30)).toBe(markerX(-NEEDLE_CENTS));
    expect(markerX(NEEDLE_CENTS + 30)).toBe(markerX(NEEDLE_CENTS));
    expect(markerX(0) - markerX(-15)).toBeCloseTo(markerX(15) - markerX(0), 8);
  });
});
