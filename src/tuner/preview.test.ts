import { describe, expect, it } from 'vitest';
import { previewStatus, readPreview } from './preview';

describe('tuner preview', () => {
  it('reads the query', () => {
    expect(readPreview('?preview=flat')).toBe('flat');
    expect(readPreview('?preview=in-tune')).toBe('intune');
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
});
