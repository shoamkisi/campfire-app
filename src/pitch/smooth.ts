/**
 * Keeps the needle from chasing every wobble.
 * A short median rejects single bad frames. A run of new pitches
 * is required before the note is allowed to change. Brief silence
 * holds the last pitch so a string decay does not flicker.
 */

export type PitchFrame = { frequency: number } | null;

export type FrequencySmoother = {
  push: (frame: PitchFrame) => number | null;
  reset: () => void;
};

export function createFrequencySmoother(options?: {
  window?: number;
  hold?: number;
  switchAfter?: number;
  /** Cents from the current median that still count as "the same note". */
  stickCents?: number;
}): FrequencySmoother {
  const window = options?.window ?? 5;
  const hold = options?.hold ?? 8;
  const switchAfter = options?.switchAfter ?? 3;
  const stickCents = options?.stickCents ?? 70;

  let recent: number[] = [];
  let pending: number[] = [];
  let misses = 0;

  function current(): number | null {
    if (recent.length === 0) return null;
    return median(recent);
  }

  return {
    reset() {
      recent = [];
      pending = [];
      misses = 0;
    },
    push(frame) {
      if (!frame || !Number.isFinite(frame.frequency) || frame.frequency <= 0) {
        pending = [];
        misses += 1;
        if (misses >= hold) recent = [];
        return current();
      }

      misses = 0;
      const baseline = current();
      if (baseline == null) {
        recent = [frame.frequency];
        pending = [];
        return frame.frequency;
      }

      const cents = 1200 * Math.log2(frame.frequency / baseline);
      if (Math.abs(cents) <= stickCents) {
        pending = [];
        recent.push(frame.frequency);
        if (recent.length > window) recent.shift();
        return current();
      }

      pending.push(frame.frequency);
      if (pending.length >= switchAfter) {
        recent = pending.slice(-window);
        pending = [];
        return current();
      }
      return baseline;
    },
  };
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}
