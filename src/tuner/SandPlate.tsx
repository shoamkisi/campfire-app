import { useEffect, useRef } from 'react';
import {
  GRAIN_COUNT,
  closeness,
  modeForFrequency,
  nodalPoints,
  sandColor,
  type NodalPoint,
} from './cymatic';

type Props = {
  hz: number | null;
  cents: number | null;
  onCloseness?: (amount: number) => void;
};

type Grain = {
  x: number;
  y: number;
  bx: number;
  by: number;
  phase: number;
  tx: number;
  ty: number;
  jx: number;
  jy: number;
};

const SIZES = [1.9, 2.4, 2.9];

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(value: number): number {
  if (value < 0.03) return 0.03;
  if (value > 0.97) return 0.97;
  return value;
}

function makeGrains(count: number): Grain[] {
  const rand = mulberry32(0x0c0a11);
  const grains: Grain[] = [];
  for (let i = 0; i < count; i++) {
    const x = 0.05 + rand() * 0.9;
    const y = 0.05 + rand() * 0.9;
    grains.push({
      x,
      y,
      bx: x,
      by: y,
      phase: rand() * Math.PI * 2,
      tx: x,
      ty: y,
      jx: (rand() - 0.5) * 0.01,
      jy: (rand() - 0.5) * 0.01,
    });
  }
  return grains;
}

/** Sand walks toward the nearest part of the figure, so the shape appears as it gathers. */
function assignTargets(grains: Grain[], points: readonly NodalPoint[]): void {
  if (points.length === 0) return;
  for (const grain of grains) {
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - grain.bx;
      const dy = points[i].y - grain.by;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    grain.tx = points[best].x;
    grain.ty = points[best].y;
  }
}

export function SandPlate({ hz, cents, onCloseness }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hzRef = useRef(hz);
  const centsRef = useRef(cents);
  const onClosenessRef = useRef(onCloseness);
  hzRef.current = hz;
  centsRef.current = cents;
  onClosenessRef.current = onCloseness;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const grains = makeGrains(GRAIN_COUNT);
    let modeId = '';
    let shown = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    let frame = 0;
    const tick = (now: number) => {
      const heard = hzRef.current;
      const mode =
        heard == null || !Number.isFinite(heard) || heard <= 0 ? null : modeForFrequency(heard);
      if (mode && mode.id !== modeId) {
        assignTargets(grains, nodalPoints(mode));
        modeId = mode.id;
      }

      const target = closeness(centsRef.current);
      const ease = reduce.matches ? 1 : 0.05;
      shown += (target - shown) * ease;
      if (Math.abs(target - shown) < 0.004) shown = target;
      onClosenessRef.current?.(shown);

      const wobble = (1 - shown) * 0.032;
      const follow = reduce.matches ? 1 : 0.085;
      const tighten = 0.4 + 0.6 * shown;
      for (const grain of grains) {
        const hx = clamp01(grain.bx + Math.sin(now * 0.00105 + grain.phase) * wobble);
        const hy = clamp01(grain.by + Math.cos(now * 0.00082 + grain.phase * 1.7) * wobble);
        const aimX = hx + (grain.tx + grain.jx * tighten - hx) * shown;
        const aimY = hy + (grain.ty + grain.jy * tighten - hy) * shown;
        grain.x += (aimX - grain.x) * follow;
        grain.y += (aimY - grain.y) * follow;
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = sandColor(shown);
      for (let i = 0; i < grains.length; i++) {
        const grain = grains[i];
        const size = SIZES[i % 3] * dpr;
        context.fillRect(grain.x * width - size * 0.5, grain.y * height - size * 0.5, size, size);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="plate">
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
