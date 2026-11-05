import { describe, expect, it } from 'vitest';
import {
  REFERENCE_DEFAULT,
  REFERENCE_MAX,
  REFERENCE_MIN,
  REFERENCE_PRESETS,
  REFERENCE_STORAGE_KEY,
  type ReferenceStore,
  clampReference,
  readReference,
  writeReference,
} from './referencePitch';

function memoryStore(initial: string | null = null): ReferenceStore {
  const data = new Map<string, string>();
  if (initial != null) data.set(REFERENCE_STORAGE_KEY, initial);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('reference pitch', () => {
  it('defaults to concert 440 and offers 432 in one tap', () => {
    expect(REFERENCE_DEFAULT).toBe(440);
    expect(REFERENCE_MIN).toBe(430);
    expect(REFERENCE_MAX).toBe(450);
    expect(REFERENCE_PRESETS).toEqual([432, 440, 442]);
    for (const preset of REFERENCE_PRESETS) {
      expect(preset).toBeGreaterThanOrEqual(REFERENCE_MIN);
      expect(preset).toBeLessThanOrEqual(REFERENCE_MAX);
    }
  });

  it('steps by whole hertz and stays inside 430 to 450', () => {
    expect(clampReference(440)).toBe(440);
    expect(clampReference(432.4)).toBe(432);
    expect(clampReference(441.6)).toBe(442);
    expect(clampReference(429)).toBe(430);
    expect(clampReference(451)).toBe(450);
    expect(clampReference(Number.NaN)).toBe(440);
    expect(clampReference(Number.POSITIVE_INFINITY)).toBe(440);
  });

  it('remembers the choice and ignores a blank or broken store', () => {
    expect(readReference(null)).toBe(440);

    const store = memoryStore();
    expect(readReference(store)).toBe(440);
    expect(writeReference(store, 432)).toBe(432);
    expect(readReference(store)).toBe(432);
    expect(store.getItem(REFERENCE_STORAGE_KEY)).toBe('432');

    writeReference(store, 451);
    expect(readReference(store)).toBe(450);
    writeReference(store, 400);
    expect(readReference(store)).toBe(430);

    store.setItem(REFERENCE_STORAGE_KEY, 'nope');
    expect(readReference(store)).toBe(440);
    store.setItem(REFERENCE_STORAGE_KEY, '');
    expect(readReference(store)).toBe(440);
    store.setItem(REFERENCE_STORAGE_KEY, '441.6');
    expect(readReference(store)).toBe(442);

    const blocked: ReferenceStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readReference(blocked)).toBe(440);
    expect(writeReference(blocked, 432)).toBe(432);
  });
});
