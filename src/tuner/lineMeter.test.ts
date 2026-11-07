import { describe, expect, it } from 'vitest';
import { NEEDLE_CENTS } from '../pitch/notes';
import { closeness, sandColor } from './cymatic';
import { CENT_MARKS, LINE_METER, MARK_COLOR, centMarks, lineCenter, lineColor, markerX } from './lineMeter';

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
    expect(markerX(0)).toBe(lineCenter());
    expect(markerX(3)).not.toBe(markerX(0));
    expect(markerX(3)).toBeGreaterThan(markerX(0));
    expect(markerX(-3)).toBeLessThan(markerX(0));
  });

  it('marks the cents the line already spans', () => {
    const marks = centMarks();
    expect(marks.map((mark) => mark.cents)).toEqual([...CENT_MARKS]);
    const ends = marks.filter((mark) => mark.role === 'end');
    expect(ends.map((mark) => mark.cents)).toEqual([-NEEDLE_CENTS, NEEDLE_CENTS]);
    expect(ends[0].x).toBe(markerX(-NEEDLE_CENTS));
    expect(ends[1].x).toBe(markerX(NEEDLE_CENTS));
    expect(ends[0].x).toBe(LINE_METER.inset);
    expect(ends[1].x).toBe(LINE_METER.width - LINE_METER.inset);
    expect(ends[0].label).toBe('50¢');
    expect(ends[1].label).toBe('50¢');

    const steps = marks.filter((mark) => mark.role === 'step');
    expect(steps.map((mark) => mark.cents)).toEqual([-NEEDLE_CENTS / 2, NEEDLE_CENTS / 2]);
    for (const step of steps) {
      expect(step.x).toBe(markerX(step.cents));
      expect(step.label).toBe('25');
    }

    const center = marks.find((mark) => mark.role === 'center');
    expect(center?.cents).toBe(0);
    expect(center?.x).toBe(markerX(0));
    expect(center?.x).toBe(lineCenter());
    expect(center?.label).toBe('0');
    expect(LINE_METER.centerTickHalf).toBeGreaterThan(LINE_METER.markerHalf);
    expect(MARK_COLOR).toBe('#EDE6DA');
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
