/**
 * Chladni figures for the tuner plate.
 * Frequency picks the figure. One closeness number, from the cents,
 * both gathers the sand and turns it from gray to green.
 */

import { IN_TUNE_CENTS, isInTune } from '../pitch/notes';
import { skins } from '../theme/tokens';

/** Warm gray dust. Far from the note, this is all you see. */
export const SAND_GRAY = '#9C9892';
/** Leaf green. Clear on charcoal, not a neon light. */
export const SAND_GREEN = '#3EAE56';
export const LETTER_REST = skins.campfire.text;

/** Grains on the plate. Enough to read a figure, light enough for a phone. */
export const GRAIN_COUNT = 2400;

/**
 * At this many cents the sand is fully scattered.
 * Inside the in-tune window it is fully gathered.
 */
export const SCATTER_CENTS = 50;

export type PlateMode = {
  id: string
  complexity: number
  kind: 'clover' | 'chladni'
  n: number
  m: number
};

/**
 * Low guitar notes use the simple ring-and-clover.
 * Each open string steps up. Past the high E the web gets denser.
 */
export const PLATE_MODES: readonly PlateMode[] = [
  { id: 'clover', complexity: 1, kind: 'clover', n: 0, m: 0 },
  { id: 'loops', complexity: 2, kind: 'chladni', n: 5, m: 2 },
  { id: 'cells', complexity: 3, kind: 'chladni', n: 4, m: 3 },
  { id: 'lattice', complexity: 4, kind: 'chladni', n: 7, m: 4 },
  { id: 'dense', complexity: 5, kind: 'chladni', n: 8, m: 5 },
  { id: 'web', complexity: 6, kind: 'chladni', n: 9, m: 6 },
  { id: 'weave', complexity: 7, kind: 'chladni', n: 8, m: 6 },
];

/** Upper edge of each mode, in Hz. The last mode is everything above the last edge. */
const MODE_EDGES = [96, 128, 171, 221, 288, 430];

const CLOVER_RING = 0.26;
const CLOVER_OUTER = 0.78;
const CLOVER_AMP = 0.16;

export type NodalPoint = { x: number; y: number };

const pointCache = new Map<string, readonly NodalPoint[]>();

export function modeForFrequency(hz: number): PlateMode {
  if (!Number.isFinite(hz) || hz <= 0) return PLATE_MODES[0];
  let index = 0;
  while (index < MODE_EDGES.length && hz >= MODE_EDGES[index]) index += 1;
  return PLATE_MODES[index];
}

/**
 * 0 is scattered gray. 1 is a locked green figure.
 * The in-tune window is fully locked. Outside it, closeness eases up
 * as the cents fall, so the figure and the green arrive together.
 */
export function closeness(cents: number | null): number {
  if (cents == null || !Number.isFinite(cents)) return 0;
  if (isInTune(cents)) return 1;
  const abs = Math.abs(cents);
  if (abs >= SCATTER_CENTS) return 0;
  const linear = (SCATTER_CENTS - abs) / (SCATTER_CENTS - IN_TUNE_CENTS);
  return 1 - (1 - linear) * (1 - linear);
}

export function mixHex(from: string, to: string, t: number): string {
  if (t <= 0) return from;
  if (t >= 1) return to;
  let hex = '#';
  for (let i = 0; i < 3; i++) {
    const a = Number.parseInt(from.slice(1 + i * 2, 3 + i * 2), 16);
    const b = Number.parseInt(to.slice(1 + i * 2, 3 + i * 2), 16);
    hex += Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, '0');
  }
  return hex;
}

export function sandColor(amount: number): string {
  return mixHex(SAND_GRAY, SAND_GREEN, amount);
}

export function letterColor(amount: number): string {
  return mixHex(LETTER_REST, SAND_GREEN, amount);
}

/** Pattern, sand, letter, and the line under the plate all read this same closeness. */
export function plateReadout(cents: number | null, hz: number | null): {
  closeness: number;
  organization: number;
  sand: string;
  line: string;
  letter: string;
  locked: boolean;
  modeId: string | null;
} {
  const amount = closeness(cents);
  const mode =
    hz == null || !Number.isFinite(hz) || hz <= 0 ? null : modeForFrequency(hz);
  const sand = sandColor(amount);
  return {
    closeness: amount,
    organization: amount,
    sand,
    line: sand,
    letter: letterColor(amount),
    locked: amount === 1,
    modeId: mode ? mode.id : null,
  };
}

export function fieldValue(mode: PlateMode, x: number, y: number): number {
  if (mode.kind === 'clover') return cloverValue(x, y);
  return chladniValue(x, y, mode.n, mode.m);
}

export function fieldSample(
  mode: PlateMode,
  x: number,
  y: number,
): { f: number; fx: number; fy: number } {
  if (mode.kind === 'clover') {
    const eps = 0.01;
    const f = cloverValue(x, y);
    return {
      f,
      fx: (cloverValue(x + eps, y) - cloverValue(x - eps, y)) / (2 * eps),
      fy: (cloverValue(x, y + eps) - cloverValue(x, y - eps)) / (2 * eps),
    };
  }
  const { n, m } = mode;
  const cnx = Math.cos(n * Math.PI * x);
  const snx = Math.sin(n * Math.PI * x);
  const cmy = Math.cos(m * Math.PI * y);
  const smy = Math.sin(m * Math.PI * y);
  const cmx = Math.cos(m * Math.PI * x);
  const smx = Math.sin(m * Math.PI * x);
  const cny = Math.cos(n * Math.PI * y);
  const sny = Math.sin(n * Math.PI * y);
  return {
    f: cnx * cmy - cmx * cny,
    fx: -n * Math.PI * snx * cmy + m * Math.PI * smx * cny,
    fy: -m * Math.PI * cnx * smy + n * Math.PI * cmx * sny,
  };
}

/** Small when (x, y) sits on a nodal line. */
export function nodeScore(mode: PlateMode, x: number, y: number): number {
  const { f, fx, fy } = fieldSample(mode, x, y);
  return Math.abs(f) / (Math.hypot(fx, fy) + 0.08);
}

/** Points the sand is allowed to settle on. Built once per figure. */
export function nodalPoints(mode: PlateMode): readonly NodalPoint[] {
  const cached = pointCache.get(mode.id);
  if (cached) return cached;
  const grid = 160;
  const found: NodalPoint[] = [];
  for (let iy = 0; iy < grid; iy++) {
    const y = (iy + 0.5) / grid;
    for (let ix = 0; ix < grid; ix++) {
      const x = (ix + 0.5) / grid;
      if (nodeScore(mode, x, y) < 0.02) found.push({ x, y });
    }
  }
  const cap = 1100;
  let points = found;
  if (found.length > cap) {
    const step = found.length / cap;
    points = [];
    for (let i = 0; i < cap; i++) points.push(found[Math.floor(i * step)]);
  }
  pointCache.set(mode.id, points);
  return points;
}

function chladniValue(x: number, y: number, n: number, m: number): number {
  return (
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) -
    Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y)
  );
}

/** A ring inside a four-lobe clover. The low-note plate. */
function cloverValue(x: number, y: number): number {
  const u = x * 2 - 1;
  const v = y * 2 - 1;
  const r2 = u * u + v * v;
  const r = Math.sqrt(r2);
  const cos4 =
    r2 < 1e-8 ? 1 : (u * u * u * u - 6 * u * u * v * v + v * v * v * v) / (r2 * r2);
  const ring = r - CLOVER_RING;
  const outer = r - CLOVER_OUTER - CLOVER_AMP * cos4;
  return ring * outer;
}
