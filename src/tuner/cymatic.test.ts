import { describe, expect, it } from 'vitest';
import { detectPitch } from '../pitch/mpm';
import {
  IN_TUNE_CENTS,
  STRINGS,
  midiToFrequency,
  openStrings,
  toDisplay,
} from '../pitch/notes';
import { tone } from '../pitch/synth';
import { skins } from '../theme/tokens';
import {
  GRAIN_COUNT,
  GRAIN_RADII,
  SAND_WANDER,
  grainRadiusCss,
  sandDrift,
  LETTER_REST,
  PLATE_MODES,
  SAND_GRAY,
  SAND_GREEN,
  SCATTER_CENTS,
  closeness,
  fieldSample,
  fieldValue,
  letterColor,
  mixHex,
  modeForFrequency,
  nodalPoints,
  nodeScore,
  plateReadout,
  sandColor,
} from './cymatic';

function rgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

describe('cymatic plate', () => {
  it('gives lower notes a simpler figure than higher ones', () => {
    const low = modeForFrequency(STRINGS[0].frequency);
    const middle = modeForFrequency(STRINGS[3].frequency);
    const high = modeForFrequency(STRINGS[5].frequency);
    const above = modeForFrequency(700);
    expect(low.id).toBe('clover');
    expect(low.complexity).toBeLessThan(middle.complexity);
    expect(middle.complexity).toBeLessThan(high.complexity);
    expect(high.complexity).toBeLessThan(above.complexity);
    expect(above.id).toBe('weave');

    let previous = 0;
    for (const string of STRINGS) {
      const mode = modeForFrequency(string.frequency);
      expect(mode.complexity, string.id).toBeGreaterThan(previous);
      previous = mode.complexity;
    }
  });

  it('keeps the same figures when the strings are tuned to 432', () => {
    const strings = openStrings(432);
    expect(modeForFrequency(strings[0].frequency).id).toBe('clover');
    expect(modeForFrequency(strings[1].frequency).id).toBe(modeForFrequency(STRINGS[1].frequency).id);
    expect(modeForFrequency(strings[5].frequency).complexity).toBeGreaterThan(
      modeForFrequency(strings[0].frequency).complexity,
    );
    let previous = 0;
    for (const string of strings) {
      const mode = modeForFrequency(string.frequency);
      expect(mode.complexity, string.id).toBeGreaterThan(previous);
      previous = mode.complexity;
    }
  });

  it('shares one closeness for the figure and the green', () => {
    expect(closeness(null)).toBe(0);
    expect(closeness(Number.NaN)).toBe(0);
    expect(closeness(0)).toBe(1);
    expect(closeness(IN_TUNE_CENTS)).toBe(1);
    expect(closeness(-IN_TUNE_CENTS)).toBe(1);
    expect(closeness(SCATTER_CENTS)).toBe(0);
    expect(closeness(-80)).toBe(0);
    const linear32 = (SCATTER_CENTS - 32) / (SCATTER_CENTS - IN_TUNE_CENTS);
    expect(closeness(32)).toBeCloseTo(1 - (1 - linear32) * (1 - linear32), 8);
    expect(closeness(32)).toBeGreaterThan(0.55);
    expect(closeness(32)).toBeLessThan(0.75);
    expect(closeness(46)).toBeLessThan(0.25);

    let previous = Infinity;
    for (const cents of [0, 5, 10, 20, 32, 46, 50, 70]) {
      const amount = closeness(cents);
      expect(amount).toBeLessThanOrEqual(previous + 1e-9);
      previous = amount;
    }

    const partial = closeness(32);
    const readout = plateReadout(-32, STRINGS[0].frequency);
    expect(readout.closeness).toBeCloseTo(partial, 8);
    expect(readout.organization).toBe(readout.closeness);
    expect(readout.locked).toBe(false);
    expect(readout.sand).toBe(sandColor(partial));
    expect(readout.line).toBe(readout.sand);
    expect(readout.sand).not.toBe(SAND_GRAY);
    expect(readout.sand).not.toBe(SAND_GREEN);
    expect(readout.modeId).toBe('clover');

    const locked = plateReadout(1, STRINGS[1].frequency);
    expect(locked.locked).toBe(true);
    expect(locked.sand).toBe(SAND_GREEN);
    expect(locked.line).toBe(SAND_GREEN);
    expect(locked.letter).toBe(SAND_GREEN);
  });

  it('walks the sand from gray to green without a jump at the lock', () => {
    expect(sandColor(0)).toBe(SAND_GRAY);
    expect(sandColor(1)).toBe(SAND_GREEN);
    expect(letterColor(0)).toBe(LETTER_REST);
    expect(letterColor(0)).toBe(skins.campfire.text);
    expect(letterColor(1)).toBe(sandColor(1));
    expect(mixHex(SAND_GRAY, SAND_GREEN, 0.4)).toBe(sandColor(0.4));

    const gray = rgb(SAND_GRAY);
    const mid = rgb(sandColor(0.4));
    const green = rgb(SAND_GREEN);
    const bias = (color: { r: number; g: number }) => color.g - color.r;
    expect(bias(mid)).toBeGreaterThan(bias(gray));
    expect(bias(mid)).toBeLessThan(bias(green));
    expect(mid.g).toBe(Math.round(gray.g + (green.g - gray.g) * 0.4));

    const justOutside = closeness(IN_TUNE_CENTS + 0.2);
    expect(justOutside).toBeLessThan(1);
    expect(justOutside).toBeGreaterThan(0.9);
    const approaching = sandColor(closeness(18));
    expect(approaching).not.toBe(SAND_GREEN);
    expect(approaching).not.toBe(SAND_GRAY);
  });

  it('names a 432 Hz A as locked green, and the same tone as flat gray-green at 440', () => {
    const a4 = 432;
    const a = midiToFrequency(45, a4);
    const heard = detectPitch(tone(a, 48000, 4096), 48000);
    expect(heard).not.toBeNull();
    const tuned = toDisplay(heard!.frequency, a4);
    const plate = plateReadout(tuned.cents, heard!.frequency);
    expect(tuned.letter).toBe('A');
    expect(tuned.inTune).toBe(true);
    expect(plate.locked).toBe(true);
    expect(plate.sand).toBe(SAND_GREEN);
    expect(plate.line).toBe(plate.sand);
    expect(plate.modeId).toBe('loops');

    const concert = toDisplay(heard!.frequency, 440);
    const drifted = plateReadout(concert.cents, heard!.frequency);
    expect(concert.inTune).toBe(false);
    expect(concert.cents).toBeLessThan(-20);
    expect(drifted.locked).toBe(false);
    expect(drifted.closeness).toBeGreaterThan(0.45);
    expect(drifted.closeness).toBeLessThan(0.8);
    expect(drifted.sand).not.toBe(SAND_GREEN);
    expect(drifted.line).toBe(drifted.sand);
    expect(drifted.organization).toBe(drifted.closeness);
  });

  it('lays each figure on its nodal lines, clover included', () => {
    expect(GRAIN_COUNT).toBeGreaterThanOrEqual(5000);
    expect(GRAIN_COUNT).toBeLessThanOrEqual(10000);
    expect(Math.max(...GRAIN_RADII)).toBeLessThan(0.8);
    expect(Math.min(...GRAIN_RADII)).toBeGreaterThan(0.2);
    expect(grainRadiusCss(0, 0)).toBe(grainRadiusCss(0, 1));
    expect(grainRadiusCss(1, 0.4)).toBe(grainRadiusCss(1, 1));
    expect(grainRadiusCss(2, 1)).toBe(GRAIN_RADII[2]);

    const loose = sandDrift(1400, 0.7, 0);
    const locked = sandDrift(1400, 0.7, 1);
    expect(locked.x).toBeCloseTo(loose.x, 8);
    expect(locked.y).toBeCloseTo(loose.y, 8);
    expect(Math.hypot(locked.x, locked.y)).toBeGreaterThan(0.008);
    expect(Math.hypot(locked.x, locked.y)).toBeLessThanOrEqual(SAND_WANDER * Math.SQRT2 + 1e-9);
    const later = sandDrift(3200, 0.7, 1);
    expect(later.x).not.toBeCloseTo(locked.x, 2);

    for (const mode of PLATE_MODES) {
      const points = nodalPoints(mode);
      expect(points.length, mode.id).toBeGreaterThan(80);
      for (const point of points) {
        expect(nodeScore(mode, point.x, point.y), mode.id).toBeLessThan(0.025);
      }
    }

    const clover = PLATE_MODES[0];
    const radii = nodalPoints(clover).map((point) => Math.hypot(point.x - 0.5, point.y - 0.5));
    expect(Math.min(...radii)).toBeLessThan(0.2);
    expect(Math.max(...radii)).toBeGreaterThan(0.3);

    const loops = PLATE_MODES.find((mode) => mode.id === 'loops');
    expect(loops).toBeTruthy();
    const x = 0.37;
    const y = 0.62;
    const eps = 1e-4;
    const sample = fieldSample(loops!, x, y);
    expect(sample.f).toBeCloseTo(fieldValue(loops!, x, y), 8);
    expect(sample.fx).toBeCloseTo(
      (fieldValue(loops!, x + eps, y) - fieldValue(loops!, x - eps, y)) / (2 * eps),
      3,
    );
    expect(sample.fy).toBeCloseTo(
      (fieldValue(loops!, x, y + eps) - fieldValue(loops!, x, y - eps)) / (2 * eps),
      3,
    );
  });
});
