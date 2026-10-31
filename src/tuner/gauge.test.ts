import { describe, expect, it } from 'vitest';
import { TICKS, arcRadii } from './gauge';

describe('hand-inked gauge', () => {
  it('does not use a constant radius', () => {
    const radii = arcRadii();
    const min = Math.min(...radii);
    const max = Math.max(...radii);
    expect(max - min).toBeGreaterThan(3);
    expect(radii.length).toBeGreaterThan(16);
  });

  it('places ticks by hand, not on an even grid', () => {
    const gaps = TICKS.slice(1).map((tick, index) => tick.cents - TICKS[index].cents);
    const unique = new Set(gaps.map((gap) => Math.round(gap)));
    expect(unique.size).toBeGreaterThan(1);
    const lengths = new Set(TICKS.map((tick) => tick.length));
    expect(lengths.size).toBeGreaterThan(2);
  });
});
