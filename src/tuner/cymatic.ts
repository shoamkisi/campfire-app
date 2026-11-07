/**
 * Radial figures for the tuner.
 * Frequency picks a circular mandala. Closeness, from the cents, turns the
 * sand from gray to green. Gather is a separate curve: far from the note
 * the figure stays scattered, and it only sharpens as the note locks.
 * The field fades out before the canvas edge, so there is no plate frame.
 */

import { IN_TUNE_CENTS, isInTune } from '../pitch/notes';
import { skins } from '../theme/tokens';

/** Warm gray dust. Far from the note, this is all you see. */
export const SAND_GRAY = '#9C9892';
/** Leaf green. Clear on charcoal, not a neon light. */
export const SAND_GREEN = '#3EAE56';
export const LETTER_REST = skins.campfire.text;

/** Fine dust. Enough grains to hold a finer mandala without thickening the lines. */
export const GRAIN_COUNT = 9600;
/** CSS-pixel radii. The same fine size loose or locked. */
export const GRAIN_RADII = [0.42, 0.52, 0.64] as const;
/** Gentle drift, in plate units. It does not shrink when the figure locks. */
export const SAND_WANDER = 0.011;

/**
 * How fast the closeness reading eases toward a new cents value.
 * A little slower than the 0.07 rate, so the figure does not arrive at once.
 */
export const ORGANIZE_EASE = 0.05;

/** How fast each grain walks toward its aim. A little slower than 0.10. */
export const GRAIN_FOLLOW = 0.068;

/**
 * At this many cents the sand is fully scattered.
 * Inside the in-tune window it is fully gathered.
 */
export const SCATTER_CENTS = 50;

export type PlateMode = {
  id: string;
  complexity: number;
  /** Angular order. Zero is concentric rings. */
  petals: number;
  /** Wave number of the petal field, measured across the figure disk. */
  k: number;
  /** Wave number of the ring field that bends the petals. */
  q: number;
  /** How strongly a pure ring field bows the petals. */
  bow: number;
  /** Second petal wave. Zero skips it. Nested rings of the same flower. */
  k2: number;
  inner: number;
  /** Multiplied in, so its circles cut through the petals. Zero skips it. */
  ringK: number;
};

/**
 * One rounded figure per open string, then a denser one past the high E.
 * Each is a circular mode with nested rings and finer petals, not a square plate.
 */
export const PLATE_MODES: readonly PlateMode[] = [
  { id: 'rings', complexity: 1, petals: 0, k: 14.9, q: 7.6, bow: 0.55, k2: 0, inner: 0, ringK: 0 },
  { id: 'triad', complexity: 2, petals: 6, k: 11.2, q: 5.6, bow: 0.14, k2: 16.4, inner: 0.45, ringK: 9.6 },
  { id: 'rose', complexity: 3, petals: 8, k: 13.4, q: 6.4, bow: 0.1, k2: 18.2, inner: 0.35, ringK: 8.7 },
  { id: 'bloom', complexity: 4, petals: 10, k: 15.5, q: 7.2, bow: 0.08, k2: 0, inner: 0, ringK: 10.4 },
  { id: 'lotus', complexity: 5, petals: 12, k: 17.2, q: 6.8, bow: 0.08, k2: 13, inner: 0.4, ringK: 11.6 },
  { id: 'crown', complexity: 6, petals: 8, k: 16.4, q: 9.1, bow: 0.12, k2: 11, inner: 0.55, ringK: 12.2 },
  { id: 'seal', complexity: 7, petals: 14, k: 19.2, q: 8, bow: 0.06, k2: 0, inner: 0, ringK: 13.4 },
];

/** Upper edge of each mode, in Hz. The last mode is everything above the last edge. */
const MODE_EDGES = [96, 128, 171, 221, 288, 430];

/**
 * Mathematical disk of a figure, in plate units from the center.
 * Nodes past this radius are dropped so a Bessel rim never draws a frame.
 */
export const FIGURE_LIMIT = 0.4;
const FIGURE_SPAN = FIGURE_LIMIT;

/** Sand inside this radius is solid. Past it, the field dissolves. */
export const FADE_START = 0.26;
/** By this radius the sand is gone, before the square canvas edge. */
export const FADE_END = 0.48;
/** How far scattered homes reach. They run out into the fade. */
export const SCATTER_RADIUS = 0.47;

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

/** Drawn radius in CSS pixels. Closeness does not scale it. */
export function grainRadiusCss(index: number, closeness: number): number {
  const count = GRAIN_RADII.length;
  const band = ((index % count) + count) % count;
  const radius = GRAIN_RADII[band];
  return Number.isFinite(closeness) ? radius : radius;
}

/**
 * How organized the figure is. Separate from the gray-to-green mix.
 * Closeness is already an ease-out, which made a moderate miss look finished.
 * This ease-in keeps that miss loose and only reaches the tight nodal figure
 * when closeness itself is locked at 1.
 */
export function gather(closeness: number): number {
  if (!Number.isFinite(closeness)) return 0;
  const u = closeness < 0 ? 0 : closeness > 1 ? 1 : closeness;
  return u * u * u;
}

/** Slow wander around wherever the grain is. Locked sand uses the same reach. */
export function sandDrift(
  timeMs: number,
  phase: number,
  closeness: number,
): { x: number; y: number } {
  const reach = Number.isFinite(closeness) ? SAND_WANDER : SAND_WANDER;
  return {
    x: Math.sin(timeMs * 0.00105 + phase) * reach,
    y: Math.cos(timeMs * 0.00082 + phase * 1.7) * reach,
  };
}

export function letterColor(amount: number): string {
  return mixHex(LETTER_REST, SAND_GREEN, amount);
}

/** Sand, letter, and the line read closeness. Organization is the looser gather curve. */
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
    organization: gather(amount),
    sand,
    line: sand,
    letter: letterColor(amount),
    locked: amount === 1,
    modeId: mode ? mode.id : null,
  };
}

/** 1 in the middle of the field, 0 before the canvas edge. Smooth, with no step. */
export function edgeFade(radius: number): number {
  if (!Number.isFinite(radius) || radius <= FADE_START) return 1;
  if (radius >= FADE_END) return 0;
  const t = (radius - FADE_START) / (FADE_END - FADE_START);
  const smooth = t * t * (3 - 2 * t);
  return 1 - smooth;
}

/** Bessel J_n. The circular figures are nodal lines of this field. */
export function besselJ(order: number, x: number): number {
  const n = Math.abs(order);
  const ax = Math.abs(x);
  if (ax < 1e-8) return n === 0 ? 1 : 0;
  let term = 1;
  for (let i = 1; i <= n; i++) term *= ax / (2 * i);
  if (x < 0 && n % 2 === 1) term = -term;
  let sum = term;
  const quarter = (ax * ax) / 4;
  for (let k = 1; k < 80; k++) {
    term *= -quarter / (k * (k + n));
    sum += term;
    if (Math.abs(term) < 1e-14 * (Math.abs(sum) + 1)) break;
  }
  return sum;
}

export function fieldValue(mode: PlateMode, x: number, y: number): number {
  const u = (x - 0.5) / FIGURE_SPAN;
  const v = (y - 0.5) / FIGURE_SPAN;
  const rho = Math.hypot(u, v);
  const theta = Math.atan2(v, u);
  const petal = mode.petals === 0 ? 1 : Math.cos(mode.petals * theta);
  let flower = besselJ(mode.petals, mode.k * rho) * petal;
  if (mode.inner !== 0 && mode.k2 !== 0) {
    flower += mode.inner * besselJ(mode.petals, mode.k2 * rho) * petal;
  }
  if (mode.bow !== 0) flower += mode.bow * besselJ(0, mode.q * rho);
  if (mode.ringK !== 0) flower *= besselJ(0, mode.ringK * rho);
  return flower;
}

export function fieldSample(
  mode: PlateMode,
  x: number,
  y: number,
): { f: number; fx: number; fy: number } {
  const eps = 1e-4;
  const f = fieldValue(mode, x, y);
  return {
    f,
    fx: (fieldValue(mode, x + eps, y) - fieldValue(mode, x - eps, y)) / (2 * eps),
    fy: (fieldValue(mode, x, y + eps) - fieldValue(mode, x, y - eps)) / (2 * eps),
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
  const grid = 220;
  const found: NodalPoint[] = [];
  for (let iy = 0; iy < grid; iy++) {
    const y = (iy + 0.5) / grid;
    for (let ix = 0; ix < grid; ix++) {
      const x = (ix + 0.5) / grid;
      if (Math.hypot(x - 0.5, y - 0.5) > FIGURE_LIMIT) continue;
      if (nodeScore(mode, x, y) < 0.008) found.push({ x, y });
    }
  }
  const cap = 9000;
  let points = found;
  if (found.length > cap) {
    const step = found.length / cap;
    points = [];
    for (let i = 0; i < cap; i++) points.push(found[Math.floor(i * step)]);
  }
  pointCache.set(mode.id, points);
  return points;
}

type Point = { x: number; y: number };

/**
 * Places one grain on each even step of the figure.
 * Nearest-home assignment piles grains onto a few points and leaves gaps.
 * These targets stay on the lines, spaced along them, and the grains stay thin.
 */
export function packOntoFigure(homes: readonly Point[], points: readonly Point[]): Point[] {
  if (homes.length === 0) return [];
  if (points.length === 0) return homes.map((home) => ({ x: home.x, y: home.y }));

  const chains = linkChains(points, 0.011);
  const slots = evenSlots(points, chains, homes.length);
  return claimSlots(homes, slots);
}

function linkChains(points: readonly Point[], link: number): number[][] {
  const link2 = link * link;
  const cols = Math.max(1, Math.ceil(1 / link));
  const bins: number[][] = Array.from({ length: cols * cols }, () => []);
  const clampC = (value: number) => Math.max(0, Math.min(cols - 1, value));
  for (let i = 0; i < points.length; i++) {
    const cx = clampC(Math.floor(points[i].x / link));
    const cy = clampC(Math.floor(points[i].y / link));
    bins[cy * cols + cx].push(i);
  }
  const used = new Uint8Array(points.length);
  const nearest = (index: number): number => {
    const point = points[index];
    const cx = clampC(Math.floor(point.x / link));
    const cy = clampC(Math.floor(point.y / link));
    let best = -1;
    let bestD = link2;
    for (let y = cy - 1; y <= cy + 1; y++) {
      if (y < 0 || y >= cols) continue;
      for (let x = cx - 1; x <= cx + 1; x++) {
        if (x < 0 || x >= cols) continue;
        for (const other of bins[y * cols + x]) {
          if (used[other] || other === index) continue;
          const dx = points[other].x - point.x;
          const dy = points[other].y - point.y;
          const distance = dx * dx + dy * dy;
          if (distance < bestD && distance > 1e-10) {
            bestD = distance;
            best = other;
          }
        }
      }
    }
    return best;
  };

  const chains: number[][] = [];
  for (let i = 0; i < points.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const chain = [i];
    let head = i;
    for (;;) {
      const next = nearest(head);
      if (next < 0) break;
      used[next] = 1;
      chain.push(next);
      head = next;
    }
    chains.push(chain);
  }
  return chains;
}

function evenSlots(points: readonly Point[], chains: readonly number[][], count: number): Point[] {
  let total = 0;
  const lengths: number[] = [];
  for (const chain of chains) {
    let length = 0;
    for (let i = 1; i < chain.length; i++) {
      length += Math.hypot(
        points[chain[i]].x - points[chain[i - 1]].x,
        points[chain[i]].y - points[chain[i - 1]].y,
      );
    }
    lengths.push(length);
    total += length;
  }
  if (total < 1e-6) return points.map((point) => ({ x: point.x, y: point.y }));

  const sample = (spacing: number): Point[] => {
    const found: Point[] = [];
    for (const chain of chains) {
      if (chain.length < 2) continue;
      let x = points[chain[0]].x;
      let y = points[chain[0]].y;
      let carried = 0;
      for (let i = 1; i < chain.length; i++) {
        const nextX = points[chain[i]].x;
        const nextY = points[chain[i]].y;
        let remain = Math.hypot(nextX - x, nextY - y);
        if (remain < 1e-8) {
          x = nextX;
          y = nextY;
          continue;
        }
        const ux = (nextX - x) / remain;
        const uy = (nextY - y) / remain;
        while (carried + remain >= spacing) {
          const need = spacing - carried;
          x += ux * need;
          y += uy * need;
          found.push({ x, y });
          remain -= need;
          carried = 0;
        }
        carried += remain;
        x = nextX;
        y = nextY;
      }
    }
    return found;
  };

  let slots = sample(total / count);
  if (slots.length < count) slots = sample(total / (count + chains.length + 1));
  if (slots.length === 0) return points.map((point) => ({ x: point.x, y: point.y }));
  if (slots.length > count) {
    const step = slots.length / count;
    const trimmed: Point[] = [];
    for (let i = 0; i < count; i++) {
      trimmed.push(slots[Math.min(slots.length - 1, Math.floor((i + 0.5) * step))]);
    }
    return trimmed;
  }
  return slots;
}

function claimSlots(homes: readonly Point[], slots: readonly Point[]): Point[] {
  const cell = 0.02;
  const cols = Math.max(1, Math.ceil(1 / cell));
  const bins: number[][] = Array.from({ length: cols * cols }, () => []);
  const clampC = (value: number) => Math.max(0, Math.min(cols - 1, value));
  for (let i = 0; i < slots.length; i++) {
    const cx = clampC(Math.floor(slots[i].x / cell));
    const cy = clampC(Math.floor(slots[i].y / cell));
    bins[cy * cols + cx].push(i);
  }
  const taken = new Uint8Array(slots.length);
  const nearestFree = (home: Point): number => {
    const cx = clampC(Math.floor(home.x / cell));
    const cy = clampC(Math.floor(home.y / cell));
    let best = -1;
    let bestD = Infinity;
    for (let radius = 0; radius < cols && best < 0; radius++) {
      for (let y = cy - radius; y <= cy + radius; y++) {
        if (y < 0 || y >= cols) continue;
        for (let x = cx - radius; x <= cx + radius; x++) {
          if (x < 0 || x >= cols) continue;
          if (radius > 0 && Math.abs(x - cx) !== radius && Math.abs(y - cy) !== radius) continue;
          for (const index of bins[y * cols + x]) {
            if (taken[index]) continue;
            const dx = slots[index].x - home.x;
            const dy = slots[index].y - home.y;
            const distance = dx * dx + dy * dy;
            if (distance < bestD) {
              bestD = distance;
              best = index;
            }
          }
        }
      }
    }
    return best;
  };

  const order = homes.map((_, index) => ({ index, distance: 0 }));
  for (const item of order) {
    const home = homes[item.index];
    let bestD = Infinity;
    const cx = clampC(Math.floor(home.x / cell));
    const cy = clampC(Math.floor(home.y / cell));
    for (let y = Math.max(0, cy - 2); y <= Math.min(cols - 1, cy + 2); y++) {
      for (let x = Math.max(0, cx - 2); x <= Math.min(cols - 1, cx + 2); x++) {
        for (const index of bins[y * cols + x]) {
          const dx = slots[index].x - home.x;
          const dy = slots[index].y - home.y;
          const distance = dx * dx + dy * dy;
          if (distance < bestD) bestD = distance;
        }
      }
    }
    item.distance = bestD;
  }
  order.sort((a, b) => a.distance - b.distance);

  const targets: Point[] = homes.map((home) => ({ x: home.x, y: home.y }));
  const assigned = new Uint8Array(homes.length);
  for (const item of order) {
    const slot = nearestFree(homes[item.index]);
    if (slot < 0) break;
    taken[slot] = 1;
    assigned[item.index] = 1;
    targets[item.index] = { x: slots[slot].x, y: slots[slot].y };
  }
  for (let i = 0; i < homes.length; i++) {
    if (assigned[i]) continue;
    let slot = 0;
    let bestD = Infinity;
    for (let s = 0; s < slots.length; s++) {
      const dx = slots[s].x - homes[i].x;
      const dy = slots[s].y - homes[i].y;
      const distance = dx * dx + dy * dy;
      if (distance < bestD) {
        bestD = distance;
        slot = s;
      }
    }
    const shift = ((i % 5) - 2) * 0.002;
    targets[i] = { x: slots[slot].x + shift, y: slots[slot].y };
  }
  return targets;
}

