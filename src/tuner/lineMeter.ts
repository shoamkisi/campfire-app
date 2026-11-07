import { NEEDLE_CENTS } from '../pitch/notes';
import { skins } from '../theme/tokens';
import { closeness, sandColor } from './cymatic';

/** A straight ink line. Flat is left, sharp is right, in tune is the middle. */
export const LINE_METER = {
  width: 320,
  height: 96,
  inset: 28,
  midY: 34,
  /** Sliding mark. Taller than the line so it reads at arm's length. */
  markerHalf: 16,
  markerWidth: 5,
  /** Center tick sticks out past the marker, so 0 cents is something to land on. */
  centerTickHalf: 26,
  tickHalf: 8,
  labelY: 76,
} as const;

/** Bone. The scale stays put while the line and marker turn green. */
export const MARK_COLOR = skins.campfire.text;

/** Flat on the left, sharp on the right. Ends are the full ±50, with 25 and 0 between. */
export const CENT_MARKS = [-NEEDLE_CENTS, -NEEDLE_CENTS / 2, 0, NEEDLE_CENTS / 2, NEEDLE_CENTS] as const;

export type CentMark = {
  cents: number;
  x: number;
  label: string;
  role: 'end' | 'step' | 'center';
};

export function lineCenter(): number {
  return (LINE_METER.inset + (LINE_METER.width - LINE_METER.inset)) / 2;
}

export function markerX(cents: number): number {
  const span = NEEDLE_CENTS;
  const clamped = Math.max(-span, Math.min(span, cents));
  const t = (clamped + span) / (span * 2);
  const travel = LINE_METER.width - LINE_METER.inset * 2;
  return LINE_METER.inset + t * travel;
}

export function centMarks(): CentMark[] {
  return CENT_MARKS.map((cents) => {
    const role = cents === 0 ? 'center' : Math.abs(cents) === NEEDLE_CENTS ? 'end' : 'step';
    const magnitude = Math.abs(cents);
    const label = cents === 0 ? '0' : role === 'end' ? `${magnitude}¢` : `${magnitude}`;
    return { cents, x: markerX(cents), label, role };
  });
}

/** Same gray-to-green mix the sand uses, from the same closeness. */
export function lineColor(cents: number | null): string {
  return sandColor(closeness(cents));
}
