import { describe, expect, it } from 'vitest';
import { previewStatus, readPreview } from './preview';

describe('tuner preview', () => {
  it('reads the query', () => {
    expect(readPreview('?preview=flat')).toBe('flat');
    expect(readPreview('?preview=in-tune')).toBe('intune');
    expect(readPreview('?preview=far')).toBe('far');
    expect(readPreview('?preview=hint')).toBe('hint');
    expect(readPreview('?preview=loose')).toBe('loose');
    expect(readPreview('?preview=near')).toBe('near');
    expect(readPreview('?preview=close')).toBe('close');
    expect(readPreview('?preview=sharp')).toBe('sharp');
    expect(readPreview('?preview=high')).toBe('high');
    expect(readPreview('')).toBeNull();
  });

  it('builds flat and in-tune from detected sine waves', () => {
    const flat = previewStatus('flat');
    const tuned = previewStatus('intune');
    expect(flat.status).toBe('tuning');
    expect(tuned.status).toBe('tuning');
    if (flat.status !== 'tuning' || tuned.status !== 'tuning') return;
    expect(flat.display.letter).toBe('E');
    expect(flat.display.stringLabel).toBe('low E');
    expect(flat.display.inTune).toBe(false);
    expect(flat.display.text).toContain('flat');
    expect(Math.abs(flat.display.cents + 32)).toBeLessThan(2);
    expect(tuned.display.letter).toBe('A');
    expect(tuned.display.stringLabel).toBe('A');
    expect(tuned.display.inTune).toBe(true);
    expect(tuned.display.text).toBe('in tune');
  });

  it('measures the preview tone from a 432 Hz reference', () => {
    const tuned = previewStatus('intune', 432);
    const flat = previewStatus('flat', 432);
    expect(tuned.status).toBe('tuning');
    expect(flat.status).toBe('tuning');
    if (tuned.status !== 'tuning' || flat.status !== 'tuning') return;
    expect(tuned.display.letter).toBe('A');
    expect(tuned.display.inTune).toBe(true);
    expect(Math.abs(tuned.display.cents)).toBeLessThan(2);
    expect(flat.display.letter).toBe('E');
    expect(flat.display.inTune).toBe(false);
    expect(flat.display.cents).toBeLessThan(-20);
  });

  it('builds a far low string and an in-tune high string', () => {
    const far = previewStatus('far');
    const high = previewStatus('high');
    expect(far.status).toBe('tuning');
    expect(high.status).toBe('tuning');
    if (far.status !== 'tuning' || high.status !== 'tuning') return;
    expect(far.display.letter).toBe('E');
    expect(far.display.stringLabel).toBe('low E');
    expect(far.display.inTune).toBe(false);
    expect(far.display.cents).toBeLessThan(-40);
    const sharp = previewStatus('sharp');
    expect(sharp.status).toBe('tuning');
    if (sharp.status === 'tuning') {
      expect(sharp.display.inTune).toBe(false);
      expect(sharp.display.cents).toBeGreaterThan(30);
      expect(sharp.display.text).toContain('sharp');
    }
    expect(high.display.letter).toBe('E');
    expect(high.display.stringLabel).toBe('high E');
    expect(high.display.inTune).toBe(true);
    expect(high.display.hz).toBeGreaterThan(300);
  });

  it('steps the same A string from a hint through a loose figure to nearly sharp', () => {
    const hint = previewStatus('hint');
    const loose = previewStatus('loose');
    const near = previewStatus('near');
    expect(hint.status).toBe('tuning');
    expect(loose.status).toBe('tuning');
    expect(near.status).toBe('tuning');
    if (hint.status !== 'tuning' || loose.status !== 'tuning' || near.status !== 'tuning') return;
    expect(hint.display.letter).toBe('A');
    expect(loose.display.letter).toBe('A');
    expect(near.display.letter).toBe('A');
    expect(hint.display.cents).toBeLessThan(-34);
    expect(hint.display.cents).toBeGreaterThan(-42);
    expect(loose.display.cents).toBeLessThan(-28);
    expect(loose.display.cents).toBeGreaterThan(-36);
    expect(near.display.cents).toBeLessThan(-12);
    expect(near.display.cents).toBeGreaterThan(-20);
    expect(hint.display.inTune).toBe(false);
    expect(loose.display.inTune).toBe(false);
    expect(near.display.inTune).toBe(false);
  });

  it('calls about 4 cents flat by its cents, not in tune', () => {
    const close = previewStatus('close');
    expect(close.status).toBe('tuning');
    if (close.status !== 'tuning') return;
    expect(close.display.letter).toBe('A');
    expect(close.display.inTune).toBe(false);
    expect(close.display.cents).toBeLessThan(-3);
    expect(close.display.cents).toBeGreaterThan(-5);
    expect(close.display.text).toBe('4¢ flat');
    const tuned = previewStatus('intune');
    expect(tuned.status).toBe('tuning');
    if (tuned.status !== 'tuning') return;
    expect(tuned.display.inTune).toBe(true);
    expect(tuned.display.text).toBe('in tune');
    expect(Math.abs(tuned.display.cents)).toBeLessThan(0.5);
  });
});
