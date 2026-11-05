import { NEEDLE_CENTS } from '../pitch/notes';

/** A straight ink line. Flat is left, sharp is right, in tune is the middle. */
export const LINE_METER = {
  width: 320,
  height: 64,
  inset: 12,
  midY: 32,
  /** Sliding mark. Taller than the line so it reads at arm's length. */
  markerHalf: 18,
  markerWidth: 5,
} as const;

export function markerX(cents: number): number {
  const span = NEEDLE_CENTS;
  const clamped = Math.max(-span, Math.min(span, cents));
  const t = (clamped + span) / (span * 2);
  const travel = LINE_METER.width - LINE_METER.inset * 2;
  return LINE_METER.inset + t * travel;
}
