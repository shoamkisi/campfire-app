/** Hand-placed gauge. The arc is intentionally not a circle. */

export const GAUGE = {
  width: 360,
  height: 196,
  pivotX: 180,
  pivotY: 168,
  needleLength: 96,
} as const;

const STEPS = 26;
const NEEDLE_LIMIT = 50;
const SQUASH = 0.94;

function wobble(t: number): number {
  return (
    Math.sin(t * Math.PI * 0.92) * 11 +
    Math.sin(t * 4.7 + 0.55) * 5.4 +
    Math.sin(t * 10.8 + 0.3) * 2.3
  );
}

function place(cents: number, radius: number): { x: number; y: number } {
  const clamped = Math.max(-NEEDLE_LIMIT, Math.min(NEEDLE_LIMIT, cents));
  const t = (clamped + NEEDLE_LIMIT) / (NEEDLE_LIMIT * 2);
  const angle = Math.PI * (1 - t);
  return {
    x: GAUGE.pivotX + Math.cos(angle) * radius,
    y: GAUGE.pivotY - Math.sin(angle) * radius * SQUASH,
  };
}

/** Radius at each step. Wandering on purpose, so the arc is not a compass curve. */
export function arcRadii(): number[] {
  const radii: number[] = [];
  for (let i = 0; i <= STEPS; i++) radii.push(128 + wobble(i / STEPS));
  return radii;
}

export function arcPath(): string {
  const radii = arcRadii();
  let path = '';
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const cents = -NEEDLE_LIMIT + t * NEEDLE_LIMIT * 2;
    const p = place(cents, radii[i]);
    path += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return path;
}

export const TICKS: Array<{ cents: number; length: number }> = [
  { cents: -46, length: 8 },
  { cents: -22, length: 14 },
  { cents: 0, length: 18 },
  { cents: 24, length: 11 },
  { cents: 47, length: 9 },
];

export function tickLine(cents: number, length: number): { x1: number; y1: number; x2: number; y2: number } {
  const t = (Math.max(-NEEDLE_LIMIT, Math.min(NEEDLE_LIMIT, cents)) + NEEDLE_LIMIT) / (NEEDLE_LIMIT * 2);
  const base = 128 + wobble(t);
  const inner = place(cents, base - 1);
  const outer = place(cents, base + length);
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
}

export function needleGeometry(cents: number): { tipX: number; tipY: number; bendX: number; bendY: number } {
  const tip = place(cents, GAUGE.needleLength);
  const mid = place(cents, GAUGE.needleLength * 0.52);
  const clamped = Math.max(-NEEDLE_LIMIT, Math.min(NEEDLE_LIMIT, cents));
  const t = (clamped + NEEDLE_LIMIT) / (NEEDLE_LIMIT * 2);
  const angle = Math.PI * (1 - t);
  const bow = 2.2;
  return {
    tipX: tip.x,
    tipY: tip.y,
    bendX: mid.x + Math.cos(angle + Math.PI / 2) * bow,
    bendY: mid.y - Math.sin(angle + Math.PI / 2) * bow * SQUASH,
  };
}

export function crownPoint(): { x: number; y: number } {
  return place(0, GAUGE.needleLength);
}
