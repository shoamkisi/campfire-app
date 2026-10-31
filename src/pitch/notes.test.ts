import { describe, expect, it } from 'vitest';
import {
  A4,
  IN_TUNE_CENTS,
  STRINGS,
  centsBetween,
  formatOffset,
  frequencyToMidi,
  midiToFrequency,
  namePitch,
  nearestString,
  toDisplay,
} from './notes';

const PUBLISHED = {
  E2: 82.40688922821748,
  A2: 110,
  D3: 146.8323839587038,
  G3: 195.99771799087463,
  B3: 246.94165062806206,
  E4: 329.6275569128699,
} as const;

describe('note and cents math', () => {
  it('builds standard tuning from A4 = 440', () => {
    expect(A4).toBe(440);
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(45)).toBe(110);
    for (const string of STRINGS) {
      expect(string.frequency).toBeCloseTo(PUBLISHED[string.id], 8);
    }
  });

  it('names each open string with zero cents', () => {
    const expected = [
      ['E2', 'E', 2, 'low E'],
      ['A2', 'A', 2, 'A'],
      ['D3', 'D', 3, 'D'],
      ['G3', 'G', 3, 'G'],
      ['B3', 'B', 3, 'B'],
      ['E4', 'E', 4, 'high E'],
    ] as const;

    for (const [id, letter, octave, label] of expected) {
      const string = STRINGS.find((item) => item.id === id)!;
      const named = namePitch(string.frequency);
      const display = toDisplay(string.frequency);
      expect(named.letter).toBe(letter);
      expect(named.octave).toBe(octave);
      expect(named.cents).toBeCloseTo(0, 6);
      expect(display.letter).toBe(letter);
      expect(display.stringLabel).toBe(label);
      expect(display.cents).toBeCloseTo(0, 6);
      expect(display.inTune).toBe(true);
      expect(display.text).toBe('in tune');
      expect(nearestString(string.frequency).string.id).toBe(id);
    }
  });

  it('tells low E from high E', () => {
    expect(toDisplay(STRINGS[0].frequency).stringLabel).toBe('low E');
    expect(toDisplay(STRINGS[5].frequency).stringLabel).toBe('high E');
    expect(toDisplay(STRINGS[0].frequency).letter).toBe('E');
    expect(toDisplay(STRINGS[5].frequency).letter).toBe('E');
  });

  it('reports flat and sharp against the open string', () => {
    const a = STRINGS[1].frequency;
    const flat = toDisplay(a * 2 ** (-12.4 / 1200));
    const sharp = toDisplay(a * 2 ** (12.6 / 1200));
    expect(flat.letter).toBe('A');
    expect(flat.stringLabel).toBe('A');
    expect(flat.cents).toBeCloseTo(-12.4, 5);
    expect(flat.text).toBe('12¢ flat');
    expect(flat.inTune).toBe(false);
    expect(sharp.text).toBe('13¢ sharp');
    expect(sharp.cents).toBeCloseTo(12.6, 5);
  });

  it('treats ±5 cents as in tune and a hair past that as not', () => {
    const a = STRINGS[1].frequency;
    const edge = toDisplay(a * 2 ** (IN_TUNE_CENTS / 1200));
    const past = toDisplay(a * 2 ** ((IN_TUNE_CENTS + 0.2) / 1200));
    const flatEdge = toDisplay(a * 2 ** (-IN_TUNE_CENTS / 1200));
    expect(edge.inTune).toBe(true);
    expect(edge.text).toBe('in tune');
    expect(flatEdge.inTune).toBe(true);
    expect(past.inTune).toBe(false);
    expect(past.text).toBe('5¢ sharp');
  });

  it('does not claim a string for a note that sits between them', () => {
    const e = STRINGS[0].frequency;
    const nearby = toDisplay(e * 2 ** (40 / 1200));
    const between = toDisplay(e * 2 ** (80 / 1200));
    expect(nearby.stringLabel).toBe('low E');
    expect(nearby.letter).toBe('E');
    expect(between.stringLabel).toBeNull();
    expect(between.letter).toBe('F');
    expect(between.text.endsWith('sharp') || between.text.endsWith('flat')).toBe(true);
  });

  it('marks a long way off with the far flag', () => {
    const a = STRINGS[1].frequency;
    expect(toDisplay(a * 2 ** (-40 / 1200)).far).toBe(true);
    expect(toDisplay(a * 2 ** (-10 / 1200)).far).toBe(false);
  });

  it('round-trips midi and cents', () => {
    expect(frequencyToMidi(midiToFrequency(64))).toBeCloseTo(64, 8);
    expect(centsBetween(220, 110)).toBeCloseTo(1200, 6);
    expect(formatOffset(0)).toBe('in tune');
    expect(formatOffset(-4.9)).toBe('in tune');
    expect(formatOffset(8)).toBe('8¢ sharp');
    expect(formatOffset(-8)).toBe('8¢ flat');
  });
});
