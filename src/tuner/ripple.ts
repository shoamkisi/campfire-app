/** One expanding ring when a reading first locks in tune. Not a loop. */

export const RIPPLE_MS = 1200;

export function shouldStartRipple(
  wasLocked: boolean,
  locked: boolean,
  reduceMotion: boolean,
): boolean {
  if (reduceMotion) return false;
  return locked && !wasLocked;
}

/** 0 at the start, 1 at the end. Null once the ring is gone. */
export function rippleProgress(ageMs: number): number | null {
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs >= RIPPLE_MS) return null;
  return ageMs / RIPPLE_MS;
}
