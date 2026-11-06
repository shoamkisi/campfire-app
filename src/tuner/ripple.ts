/**
 * One wave through the sand when a reading first locks in tune.
 * It moves the grains. It does not draw a circle on top of the plate.
 */

export const RIPPLE_MS = 1500;
/** How far the crest travels, in plate units from the center. */
export const WAVE_REACH = 0.72;
const WAVE_WIDTH = 0.065;
const WAVE_PUSH = 0.09;

export function shouldStartRipple(
  wasLocked: boolean,
  locked: boolean,
  reduceMotion: boolean,
): boolean {
  if (reduceMotion) return false;
  return locked && !wasLocked;
}

/** 0 at the start, 1 at the end. Null once the wave is gone. */
export function rippleProgress(ageMs: number): number | null {
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs >= RIPPLE_MS) return null;
  return ageMs / RIPPLE_MS;
}

/**
 * Outward nudge for a grain at (x, y) while the wave is in progress.
 * The crest is a narrow ring. Sand behind it settles back to rest.
 */
export function waveOffset(x: number, y: number, progress: number): { x: number; y: number } {
  if (!Number.isFinite(progress) || progress < 0 || progress >= 1) return { x: 0, y: 0 };
  const dx = x - 0.5;
  const dy = y - 0.5;
  const radius = Math.hypot(dx, dy);
  if (radius < 1e-4) return { x: 0, y: 0 };
  const front = progress * WAVE_REACH;
  const delta = radius - front;
  const crest = Math.exp(-(delta * delta) / (2 * WAVE_WIDTH * WAVE_WIDTH));
  const push = WAVE_PUSH * crest;
  return { x: (dx / radius) * push, y: (dy / radius) * push };
}
