/**
 * The A the tuner measures from.
 * 440 is concert pitch. 432 is one tap away. The phone remembers the choice.
 */

export const REFERENCE_MIN = 430;
export const REFERENCE_MAX = 450;
export const REFERENCE_DEFAULT = 440;
export const REFERENCE_PRESETS = [432, 440, 442] as const;
export const REFERENCE_STORAGE_KEY = 'campfire.a4';

export type ReferenceStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function clampReference(hz: number): number {
  if (!Number.isFinite(hz)) return REFERENCE_DEFAULT;
  const rounded = Math.round(hz);
  if (rounded < REFERENCE_MIN) return REFERENCE_MIN;
  if (rounded > REFERENCE_MAX) return REFERENCE_MAX;
  return rounded;
}

export function readReference(store: ReferenceStore | null): number {
  if (!store) return REFERENCE_DEFAULT;
  let raw: string | null;
  try {
    raw = store.getItem(REFERENCE_STORAGE_KEY);
  } catch {
    return REFERENCE_DEFAULT;
  }
  if (raw == null || raw.trim() === '') return REFERENCE_DEFAULT;
  return clampReference(Number(raw));
}

export function writeReference(store: ReferenceStore | null, hz: number): number {
  const next = clampReference(hz);
  if (!store) return next;
  try {
    store.setItem(REFERENCE_STORAGE_KEY, String(next));
  } catch {
    // A blocked store still tunes for this visit.
  }
  return next;
}
