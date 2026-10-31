import { describe, expect, it } from 'vitest';
import { skins, tokens } from './tokens';

describe('theme tokens', () => {
  it('keeps the campfire palette', () => {
    expect(skins.campfire).toEqual({
      background: '#14110F',
      text: '#EDE6DA',
      muted: '#8C8278',
      inTune: '#E8A33D',
      off: '#B5533C',
    });
  });

  it('stores the future skins with their given colors', () => {
    expect(skins.bright.background).toBe('#F3EEE4');
    expect(skins.bright.text).toBe('#1F1B17');
    expect(skins.shamanic.background).toBe('#1B1A14');
    expect(skins.shamanic.text).toBe('#C9A55A');
    expect(skins.shamanic.muted).toBe('#6E7B5B');
  });

  it('has exactly two type sizes and a paper-thin grain', () => {
    expect(tokens.font.heroSize).toBeTruthy();
    expect(tokens.font.labelSize).toBeTruthy();
    expect(tokens.grain).toBeGreaterThanOrEqual(0.02);
    expect(tokens.grain).toBeLessThanOrEqual(0.04);
    expect(tokens.line).toBeGreaterThanOrEqual(1.5);
    expect(tokens.line).toBeLessThanOrEqual(2);
  });
});
