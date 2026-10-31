import { describe, expect, it } from 'vitest';
import { detectPitch } from './mpm';
import { STRINGS, centsBetween, toDisplay } from './notes';
import { harmonicTone, silence, tone, whiteNoise } from './synth';

const SAMPLE_RATES = [44100, 48000];
const BUFFER = 4096;
const GUITAR_LIKE = [1, 0.55, 0.32, 0.18, 0.1];
const WEAK_FUNDAMENTAL = [0.4, 0.85, 0.45, 0.22];

function centsOff(actual: number, expected: number): number {
  return Math.abs(centsBetween(actual, expected));
}

describe('McLeod pitch detection', () => {
  it('finds every open string from a pure sine, at both phone sample rates', () => {
    for (const sampleRate of SAMPLE_RATES) {
      for (const string of STRINGS) {
        const detected = detectPitch(tone(string.frequency, sampleRate, BUFFER), sampleRate);
        expect(detected, `${string.id} @ ${sampleRate}`).not.toBeNull();
        const error = centsOff(detected!.frequency, string.frequency);
        expect(error, `${string.id} @ ${sampleRate} off by ${error.toFixed(2)}¢`).toBeLessThan(1.5);
        expect(detected!.clarity).toBeGreaterThan(0.9);

        const display = toDisplay(detected!.frequency);
        expect(display.letter).toBe(string.letter);
        expect(display.stringLabel).toBe(string.label);
        expect(display.inTune).toBe(true);
      }
    }
  });

  it('keeps a known flat or sharp offset on every string', () => {
    const sampleRate = 48000;
    for (const string of STRINGS) {
      for (const shift of [-20, -8, 8, 20]) {
        const expected = string.frequency * 2 ** (shift / 1200);
        const detected = detectPitch(tone(expected, sampleRate, BUFFER), sampleRate);
        expect(detected, `${string.id} ${shift}¢`).not.toBeNull();
        const display = toDisplay(detected!.frequency);
        expect(display.stringLabel).toBe(string.label);
        expect(display.letter).toBe(string.letter);
        expect(Math.abs(display.cents - shift)).toBeLessThan(1.5);
        expect(display.inTune).toBe(false);
        expect(display.text.endsWith(shift < 0 ? 'flat' : 'sharp')).toBe(true);
      }
    }
  });

  it('prefers the fundamental of a plucked-string spectrum', () => {
    const sampleRate = 48000;
    for (const string of STRINGS) {
      const rich = harmonicTone(string.frequency, sampleRate, BUFFER, GUITAR_LIKE);
      const detected = detectPitch(rich, sampleRate);
      expect(detected, string.id).not.toBeNull();
      const error = centsOff(detected!.frequency, string.frequency);
      expect(error, `${string.id} harmonic off by ${error.toFixed(2)}¢`).toBeLessThan(4);
      expect(toDisplay(detected!.frequency).stringLabel).toBe(string.label);
    }
  });

  it('does not jump to the octave when the fundamental is weaker', () => {
    const sampleRate = 44100;
    for (const string of STRINGS) {
      const wave = harmonicTone(string.frequency, sampleRate, 8192, WEAK_FUNDAMENTAL);
      const detected = detectPitch(wave, sampleRate);
      expect(detected, string.id).not.toBeNull();
      const error = centsOff(detected!.frequency, string.frequency);
      expect(error, `${string.id} weak fundamental off by ${error.toFixed(2)}¢`).toBeLessThan(8);
    }
  });

  it('covers the guitar range and rejects what is outside it', () => {
    const sampleRate = 48000;
    for (const frequency of [70, 82.41, 196, 329.63, 1000]) {
      const detected = detectPitch(tone(frequency, sampleRate, BUFFER), sampleRate);
      expect(detected, `expected ${frequency}`).not.toBeNull();
      expect(centsOff(detected!.frequency, frequency)).toBeLessThan(frequency >= 1000 ? 8 : 2);
    }
    expect(detectPitch(tone(50, sampleRate, BUFFER), sampleRate)).toBeNull();
    expect(detectPitch(tone(1800, sampleRate, BUFFER), sampleRate)).toBeNull();
  });

  it('ignores silence, a dc offset, and noise', () => {
    const sampleRate = 48000;
    expect(detectPitch(silence(BUFFER), sampleRate)).toBeNull();
    expect(detectPitch(tone(110, sampleRate, BUFFER, 0.0001), sampleRate)).toBeNull();
    expect(detectPitch(whiteNoise(BUFFER, 0.25, 7), sampleRate)).toBeNull();

    const biased = tone(110, sampleRate, BUFFER);
    for (let i = 0; i < biased.length; i++) biased[i] += 0.2;
    const detected = detectPitch(biased, sampleRate);
    expect(detected).not.toBeNull();
    expect(centsOff(detected!.frequency, 110)).toBeLessThan(1.5);
  });
});
