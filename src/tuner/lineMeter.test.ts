import { describe, expect, it } from 'vitest';
import { NEEDLE_CENTS } from '../pitch/notes';
import { closeness, sandColor } from './cymatic';
import { LINE_METER, lineColor, markerX } from './lineMeter';

describe('line meter', () => {
  it('rests on center and moves flat left, sharp right', () => {
    const center = LINE_METER.width / 2;
    expect(markerX(0)).toBe(center);
    expect(markerX(-1)).toBeLessThan(center);
    expect(markerX(1)).toBeGreaterThan(center);
    expect(markerX(-20)).toBeLessThan(markerX(-5));
    expect(markerX(20)).toBeGreaterThan(markerX(5));
    expect(markerX(-NEEDLE_CENTS)).toBe(LINE_METER.inset);
    expect(markerX(NEEDLE_CENTS)).toBe(LINE_METER.width - LINE_METER.inset);
    expect(markerX(-NEEDLE_CENTS - 30)).toBe(markerX(-NEEDLE_CENTS));
    expect(markerX(NEEDLE_CENTS + 30)).toBe(markerX(NEEDLE_CENTS));
    expect(markerX(0) - markerX(-15)).toBeCloseTo(markerX(15) - markerX(0), 8);
  });

  it('takes the same green as the sand from the same closeness', () => {
    expect(lineColor(null)).toBe(sandColor(0));
    expect(lineColor(0)).toBe(sandColor(closeness(0)));
    expect(lineColor(-32)).toBe(sandColor(closeness(-32)));
    expect(lineColor(32)).toBe(lineColor(-32));
    expect(lineColor(46)).toBe(sandColor(closeness(46)));
    expect(lineColor(4)).toBe(sandColor(1));
    expect(lineColor(0)).not.toBe(lineColor(32));
    expect(lineColor(null)).not.toBe(lineColor(0));
  });
});
