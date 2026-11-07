import { describe, expect, it } from 'vitest';
import { detectPitch } from '../pitch/mpm';
import {
  IN_TUNE_CENTS,
  STRINGS,
  midiToFrequency,
  openStrings,
  toDisplay,
} from '../pitch/notes';
import { tone } from '../pitch/synth';
import { skins } from '../theme/tokens';
import {
  FADE_END,
  FADE_START,
  FIGURE_LIMIT,
  GRAIN_COUNT,
  GRAIN_FOLLOW,
  GRAIN_RADII,
  ORGANIZE_EASE,
  LOCKED_WANDER,
  SAND_WANDER,
  SCATTER_RADIUS,
  besselJ,
  edgeFade,
  gather,
  grainRadiusCss,
  sandDrift,
  LETTER_REST,
  PLATE_MODES,
  SAND_GRAY,
  SAND_GREEN,
  SCATTER_CENTS,
  closeness,
  fieldSample,
  fieldValue,
  letterColor,
  mixHex,
  modeForFrequency,
  nodalPoints,
  nodeScore,
  packOntoFigure,
  plateReadout,
  sandColor,
} from './cymatic';

function neighborGaps(points: { x: number; y: number }[]): number[] {
  const cell = 0.02;
  const cols = Math.ceil(1 / cell);
  const bins: number[][] = Array.from({ length: cols * cols }, () => []);
  for (let i = 0; i < points.length; i++) {
    const cx = Math.max(0, Math.min(cols - 1, Math.floor(points[i].x / cell)));
    const cy = Math.max(0, Math.min(cols - 1, Math.floor(points[i].y / cell)));
    bins[cy * cols + cx].push(i);
  }
  return points.map((point, index) => {
    const cx = Math.max(0, Math.min(cols - 1, Math.floor(point.x / cell)));
    const cy = Math.max(0, Math.min(cols - 1, Math.floor(point.y / cell)));
    let best = Infinity;
    for (let y = cy - 2; y <= cy + 2; y++) {
      if (y < 0 || y >= cols) continue;
      for (let x = cx - 2; x <= cx + 2; x++) {
        if (x < 0 || x >= cols) continue;
        for (const other of bins[y * cols + x]) {
          if (other === index) continue;
          const distance = Math.hypot(points[other].x - point.x, points[other].y - point.y);
          if (distance < best) best = distance;
        }
      }
    }
    return best;
  });
}

function rgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

describe('cymatic plate', () => {
  it('gives lower notes a simpler figure than higher ones', () => {
    const low = modeForFrequency(STRINGS[0].frequency);
    const middle = modeForFrequency(STRINGS[3].frequency);
    const high = modeForFrequency(STRINGS[5].frequency);
    const above = modeForFrequency(700);
    expect(low.id).toBe('rings');
    expect(low.complexity).toBeLessThan(middle.complexity);
    expect(middle.complexity).toBeLessThan(high.complexity);
    expect(high.complexity).toBeLessThan(above.complexity);
    expect(above.id).toBe('seal');
    const figures = STRINGS.map((string) => modeForFrequency(string.frequency).id);
    expect(new Set(figures).size).toBe(STRINGS.length);

    let previous = 0;
    for (const string of STRINGS) {
      const mode = modeForFrequency(string.frequency);
      expect(mode.complexity, string.id).toBeGreaterThan(previous);
      previous = mode.complexity;
    }
  });

  it('keeps the same figures when the strings are tuned to 432', () => {
    const strings = openStrings(432);
    expect(modeForFrequency(strings[0].frequency).id).toBe('rings');
    expect(modeForFrequency(strings[1].frequency).id).toBe(modeForFrequency(STRINGS[1].frequency).id);
    expect(modeForFrequency(strings[5].frequency).complexity).toBeGreaterThan(
      modeForFrequency(strings[0].frequency).complexity,
    );
    let previous = 0;
    for (const string of strings) {
      const mode = modeForFrequency(string.frequency);
      expect(mode.complexity, string.id).toBeGreaterThan(previous);
      previous = mode.complexity;
    }
  });

  it('shares one closeness for the figure and the green', () => {
    expect(closeness(null)).toBe(0);
    expect(closeness(Number.NaN)).toBe(0);
    expect(closeness(0)).toBe(1);
    expect(closeness(IN_TUNE_CENTS)).toBe(1);
    expect(closeness(-IN_TUNE_CENTS)).toBe(1);
    expect(closeness(SCATTER_CENTS)).toBe(0);
    expect(closeness(-80)).toBe(0);
    const linear32 = (SCATTER_CENTS - 32) / (SCATTER_CENTS - IN_TUNE_CENTS);
    expect(closeness(32)).toBeCloseTo(1 - (1 - linear32) * (1 - linear32), 8);
    expect(closeness(32)).toBeGreaterThan(0.55);
    expect(closeness(32)).toBeLessThan(0.75);
    expect(closeness(46)).toBeLessThan(0.25);

    let previous = Infinity;
    for (const cents of [0, 5, 10, 20, 32, 46, 50, 70]) {
      const amount = closeness(cents);
      expect(amount).toBeLessThanOrEqual(previous + 1e-9);
      previous = amount;
    }

    const partial = closeness(32);
    const readout = plateReadout(-32, STRINGS[0].frequency);
    expect(readout.closeness).toBeCloseTo(partial, 8);
    expect(readout.organization).toBeCloseTo(gather(partial), 8);
    expect(readout.organization).toBeLessThan(0.35);
    expect(readout.locked).toBe(false);
    expect(readout.sand).toBe(sandColor(partial));
    expect(readout.line).toBe(readout.sand);
    expect(readout.sand).not.toBe(SAND_GRAY);
    expect(readout.sand).not.toBe(SAND_GREEN);
    expect(readout.modeId).toBe('rings');

    const locked = plateReadout(1, STRINGS[1].frequency);
    expect(locked.locked).toBe(true);
    expect(locked.sand).toBe(SAND_GREEN);
    expect(locked.line).toBe(SAND_GREEN);
    expect(locked.letter).toBe(SAND_GREEN);
  });

  it('walks the sand from gray to green without a jump at the lock', () => {
    expect(sandColor(0)).toBe(SAND_GRAY);
    expect(sandColor(1)).toBe(SAND_GREEN);
    expect(letterColor(0)).toBe(LETTER_REST);
    expect(letterColor(0)).toBe(skins.campfire.text);
    expect(letterColor(1)).toBe(sandColor(1));
    expect(mixHex(SAND_GRAY, SAND_GREEN, 0.4)).toBe(sandColor(0.4));

    const gray = rgb(SAND_GRAY);
    const mid = rgb(sandColor(0.4));
    const green = rgb(SAND_GREEN);
    const bias = (color: { r: number; g: number }) => color.g - color.r;
    expect(bias(mid)).toBeGreaterThan(bias(gray));
    expect(bias(mid)).toBeLessThan(bias(green));
    expect(mid.g).toBe(Math.round(gray.g + (green.g - gray.g) * 0.4));

    const justOutside = closeness(IN_TUNE_CENTS + 0.2);
    expect(justOutside).toBeLessThan(1);
    expect(justOutside).toBeGreaterThan(0.9);
    const approaching = sandColor(closeness(18));
    expect(approaching).not.toBe(SAND_GREEN);
    expect(approaching).not.toBe(SAND_GRAY);
  });

  it('names a 432 Hz A as locked green, and the same tone as flat gray-green at 440', () => {
    const a4 = 432;
    const a = midiToFrequency(45, a4);
    const heard = detectPitch(tone(a, 48000, 4096), 48000);
    expect(heard).not.toBeNull();
    const tuned = toDisplay(heard!.frequency, a4);
    const plate = plateReadout(tuned.cents, heard!.frequency);
    expect(tuned.letter).toBe('A');
    expect(tuned.inTune).toBe(true);
    expect(plate.locked).toBe(true);
    expect(plate.sand).toBe(SAND_GREEN);
    expect(plate.line).toBe(plate.sand);
    expect(plate.modeId).toBe('triad');

    const concert = toDisplay(heard!.frequency, 440);
    const drifted = plateReadout(concert.cents, heard!.frequency);
    expect(concert.inTune).toBe(false);
    expect(concert.cents).toBeLessThan(-20);
    expect(drifted.locked).toBe(false);
    expect(drifted.closeness).toBeGreaterThan(0.45);
    expect(drifted.closeness).toBeLessThan(0.8);
    expect(drifted.sand).not.toBe(SAND_GREEN);
    expect(drifted.line).toBe(drifted.sand);
    expect(drifted.organization).toBeCloseTo(gather(drifted.closeness), 8);
    expect(drifted.organization).toBeLessThan(drifted.closeness);
  });

  it('lays each figure on round nodal lines', () => {
    expect(GRAIN_COUNT).toBeGreaterThanOrEqual(5000);
    expect(GRAIN_COUNT).toBeLessThanOrEqual(10000);
    expect(Math.max(...GRAIN_RADII)).toBeLessThan(0.8);
    expect(Math.min(...GRAIN_RADII)).toBeGreaterThan(0.2);
    expect(grainRadiusCss(0, 0)).toBe(grainRadiusCss(0, 1));
    expect(grainRadiusCss(1, 0.4)).toBe(grainRadiusCss(1, 1));
    expect(grainRadiusCss(2, 1)).toBe(GRAIN_RADII[2]);
    expect(gather(0)).toBe(0);
    expect(gather(1)).toBe(1);
    expect(gather(closeness(32))).toBeLessThan(0.35);

    const loose = sandDrift(1400, 0.7, 0);
    const locked = sandDrift(1400, 0.7, 1);
    const farDrift = sandDrift(1400, 0.7, closeness(38));
    expect(Math.hypot(loose.x, loose.y)).toBeGreaterThan(0.008);
    expect(Math.hypot(loose.x, loose.y)).toBeLessThanOrEqual(SAND_WANDER * Math.SQRT2 + 1e-9);
    expect(Math.hypot(locked.x, locked.y)).toBeGreaterThan(0.001);
    expect(Math.hypot(locked.x, locked.y)).toBeLessThan(LOCKED_WANDER * Math.SQRT2 + 1e-9);
    expect(Math.hypot(locked.x, locked.y)).toBeLessThan(Math.hypot(loose.x, loose.y) * 0.4);
    expect(Math.hypot(farDrift.x, farDrift.y)).toBeGreaterThan(Math.hypot(locked.x, locked.y) * 2);
    const later = sandDrift(3200, 0.7, 1);
    expect(later.x).not.toBeCloseTo(locked.x, 3);

    for (const mode of PLATE_MODES) {
      const points = nodalPoints(mode);
      expect(points.length, mode.id).toBeGreaterThan(80);
      for (const point of points) {
        expect(nodeScore(mode, point.x, point.y), mode.id).toBeLessThan(0.025);
      }
    }

    const rings = PLATE_MODES[0];
    const radii = nodalPoints(rings).map((point) => Math.hypot(point.x - 0.5, point.y - 0.5));
    expect(Math.min(...radii)).toBeLessThan(0.2);
    expect(Math.max(...radii)).toBeGreaterThan(0.22);
    expect(Math.max(...radii)).toBeLessThanOrEqual(FIGURE_LIMIT);

    const triad = PLATE_MODES.find((mode) => mode.id === 'triad');
    expect(triad).toBeTruthy();
    const x = 0.62;
    const y = 0.58;
    const eps = 1e-4;
    const sample = fieldSample(triad!, x, y);
    expect(sample.f).toBeCloseTo(fieldValue(triad!, x, y), 8);
    expect(sample.fx).toBeCloseTo(
      (fieldValue(triad!, x + eps, y) - fieldValue(triad!, x - eps, y)) / (2 * eps),
      3,
    );
    expect(sample.fy).toBeCloseTo(
      (fieldValue(triad!, x, y + eps) - fieldValue(triad!, x, y - eps)) / (2 * eps),
      3,
    );
  });

  it('scatters a far note and only sharpens the figure as it locks', () => {
    expect(gather(Number.NaN)).toBe(0);
    expect(gather(-0.2)).toBe(0);
    expect(gather(1.4)).toBe(1);

    const far = gather(closeness(46));
    const hint = gather(closeness(38));
    const flat = gather(closeness(-32));
    const nearer = gather(closeness(16));
    const locked = gather(closeness(0));

    expect(far).toBeLessThan(0.05);
    expect(hint).toBeGreaterThan(far);
    expect(hint).toBeLessThan(0.15);
    expect(flat).toBeGreaterThan(hint);
    expect(flat).toBeLessThan(0.35);
    expect(nearer).toBeGreaterThan(flat * 2);
    expect(nearer).toBeGreaterThan(0.7);
    expect(nearer).toBeLessThan(0.95);
    expect(locked).toBe(1);
    expect(gather(1)).toBe(gather(closeness(IN_TUNE_CENTS)));
  });

  it('eases the gathering a little more slowly than the previous rates', () => {
    const framesTo = (rate: number, goal: number) => {
      let value = 0;
      let frames = 0;
      while (value < goal && frames < 2000) {
        value += (1 - value) * rate;
        frames += 1;
      }
      return frames;
    };

    const previousOrganize = 0.07;
    const previousFollow = 0.1;
    expect(ORGANIZE_EASE).toBeLessThan(previousOrganize);
    expect(GRAIN_FOLLOW).toBeLessThan(previousFollow);
    expect(ORGANIZE_EASE).toBeGreaterThan(0.035);
    expect(GRAIN_FOLLOW).toBeGreaterThan(0.045);
    expect(framesTo(ORGANIZE_EASE, 0.9)).toBeGreaterThan(framesTo(previousOrganize, 0.9));
    expect(framesTo(GRAIN_FOLLOW, 0.9)).toBeGreaterThan(framesTo(previousFollow, 0.9));
    expect(framesTo(ORGANIZE_EASE, 0.9)).toBeLessThan(framesTo(previousOrganize, 0.9) * 1.7);
    expect(framesTo(GRAIN_FOLLOW, 0.9)).toBeLessThan(framesTo(previousFollow, 0.9) * 1.7);
  });

  it('keeps every figure inside a fading circle', () => {
    expect(besselJ(0, 0)).toBeCloseTo(1, 8);
    expect(besselJ(1, 0)).toBe(0);
    expect(Math.abs(besselJ(0, 2.4048255577))).toBeLessThan(1e-6);

    expect(edgeFade(0)).toBe(1);
    expect(edgeFade(FADE_START)).toBe(1);
    expect(edgeFade(FADE_END)).toBe(0);
    expect(edgeFade(0.9)).toBe(0);
    expect(SCATTER_RADIUS).toBeGreaterThan(FADE_START);
    expect(SCATTER_RADIUS).toBeLessThanOrEqual(FADE_END + 0.01);
    expect(FIGURE_LIMIT).toBeLessThan(FADE_END);

    let previous = edgeFade(FADE_START);
    for (let step = 1; step <= 8; step++) {
      const radius = FADE_START + ((FADE_END - FADE_START) * step) / 8;
      const value = edgeFade(radius);
      expect(value).toBeLessThan(previous);
      expect(previous - value).toBeLessThan(0.25);
      previous = value;
    }

    const ids = new Set<string>();
    for (const mode of PLATE_MODES) {
      ids.add(mode.id);
      const points = nodalPoints(mode);
      expect(points.length, mode.id).toBeGreaterThan(80);
      let balanceX = 0;
      let balanceY = 0;
      for (const point of points) {
        const dx = point.x - 0.5;
        const dy = point.y - 0.5;
        const radius = Math.hypot(dx, dy);
        expect(radius, mode.id).toBeLessThanOrEqual(FIGURE_LIMIT + 1e-9);
        expect(Math.abs(dx) > 0.36 && Math.abs(dy) > 0.36, mode.id).toBe(false);
        balanceX += dx;
        balanceY += dy;
      }
      expect(Math.hypot(balanceX, balanceY) / points.length, mode.id).toBeLessThan(0.03);

      if (mode.petals === 0) {
        expect(fieldValue(mode, 0.66, 0.5)).toBeCloseTo(fieldValue(mode, 0.5, 0.66), 5);
      } else {
        const radius = 0.16;
        const turn = (2 * Math.PI) / mode.petals;
        const theta = 0.37;
        const left = fieldValue(
          mode,
          0.5 + radius * Math.cos(theta),
          0.5 + radius * Math.sin(theta),
        );
        const right = fieldValue(
          mode,
          0.5 + radius * Math.cos(theta + turn),
          0.5 + radius * Math.sin(theta + turn),
        );
        expect(left, mode.id).toBeCloseTo(right, 4);
      }
    }
    expect(ids.size).toBe(PLATE_MODES.length);
  });

  it('packs locked grains along the figure instead of leaving gaps', () => {
    const points = [];
    for (let i = 0; i < 180; i++) {
      const angle = (i / 180) * Math.PI * 2;
      points.push({ x: 0.5 + Math.cos(angle) * 0.25, y: 0.5 + Math.sin(angle) * 0.25 });
    }
    const homes = [];
    for (let i = 0; i < 180; i++) {
      const angle = (i / 180) * 0.35;
      homes.push({ x: 0.5 + Math.cos(angle) * 0.22, y: 0.5 + Math.sin(angle) * 0.22 });
    }
    const packed = packOntoFigure(homes, points);
    expect(packed).toHaveLength(homes.length);
    const angles = packed
      .map((point) => Math.atan2(point.y - 0.5, point.x - 0.5))
      .sort((a, b) => a - b);
    let maxGap = angles[0] + Math.PI * 2 - angles[angles.length - 1];
    for (let i = 1; i < angles.length; i++) maxGap = Math.max(maxGap, angles[i] - angles[i - 1]);
    expect(maxGap).toBeLessThan(0.25);
    for (const point of packed) {
      expect(Math.abs(Math.hypot(point.x - 0.5, point.y - 0.5) - 0.25)).toBeLessThan(0.02);
    }

    const crown = PLATE_MODES.find((mode) => mode.id === 'crown');
    expect(crown).toBeTruthy();
    const figure = nodalPoints(crown!);
    const sample = [];
    for (let i = 0; i < 2400; i++) {
      const angle = i * 2.399;
      const radius = Math.sqrt((i % 97) / 97) * 0.42;
      sample.push({ x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius });
    }
    const onFigure = packOntoFigure(sample, figure);
    const gaps = neighborGaps(onFigure);
    gaps.sort((a, b) => a - b);
    const p90 = gaps[Math.floor(gaps.length * 0.9)];
    expect(p90).toBeLessThan(0.02);
    expect(gaps[Math.floor(gaps.length * 0.5)]).toBeGreaterThan(0.001);

    const triad = PLATE_MODES.find((mode) => mode.id === 'triad');
    expect(triad).toBeTruthy();
    const disk = [];
    for (let i = 0; i < 4800; i++) {
      const angle = i * 2.399;
      const radius = Math.sqrt((i % 97) / 97) * 0.42;
      disk.push({ x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius });
    }
    const aGaps = neighborGaps(packOntoFigure(disk, nodalPoints(triad!))).sort((a, b) => a - b);
    const eGaps = neighborGaps(packOntoFigure(disk, nodalPoints(crown!))).sort((a, b) => a - b);
    const aMid = aGaps[Math.floor(aGaps.length * 0.5)];
    const eMid = eGaps[Math.floor(eGaps.length * 0.5)];
    expect(aMid).toBeLessThan(0.008);
    expect(eMid).toBeLessThan(0.008);
    expect(eMid).toBeLessThan(aMid * 1.8);
  });

  it('keeps inner geometry in every locked figure', () => {
    for (const mode of PLATE_MODES) {
      const radii = nodalPoints(mode).map((point) => Math.hypot(point.x - 0.5, point.y - 0.5));
      const inner = radii.filter((radius) => radius < 0.18).length;
      const outer = radii.filter((radius) => radius > 0.26).length;
      expect(inner, mode.id).toBeGreaterThan(12);
      expect(outer, mode.id).toBeGreaterThan(40);
      expect(mode.petals === 0 || mode.petals >= 6, mode.id).toBe(true);
    }
  });
});
