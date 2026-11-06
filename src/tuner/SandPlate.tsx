import { useEffect, useRef } from 'react';
import {
  GRAIN_COUNT,
  GRAIN_RADII,
  closeness,
  grainRadiusCss,
  modeForFrequency,
  nodalPoints,
  sandColor,
  sandDrift,
  type NodalPoint,
} from './cymatic';
import { rippleProgress, shouldStartRipple } from './ripple';

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

/** How fast the figure and its green catch a new cents reading. */
const ORGANIZE_EASE = 0.22;
/** How fast each grain walks toward that figure. */
const GRAIN_FOLLOW = 0.28;

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawRipple(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
): void {
  const reach = Math.min(width, height) * 0.48;
  context.save();
  context.beginPath();
  context.arc(width / 2, height / 2, Math.max(1, progress * reach), 0, Math.PI * 2);
  context.strokeStyle = '#EDE6DA';
  context.globalAlpha = 0.92 * (1 - progress);
  context.lineWidth = Math.max(2, width / 140);
  context.stroke();
  context.restore();
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
      jx: (rand() - 0.5) * 0.006,
      jy: (rand() - 0.5) * 0.006,
    });
  }
  return grains;
}

/**
 * Nearest point on the figure, so sand gathers into the shape while it is still forming.
 * A coarse grid keeps the search cheap when the note changes.
 */
function assignTargets(grains: Grain[], points: readonly NodalPoint[]): void {
  if (points.length === 0) return;
  const cells = 32;
  const bins: number[][] = Array.from({ length: cells * cells }, () => []);
  for (let i = 0; i < points.length; i++) {
    const cx = Math.min(cells - 1, Math.floor(points[i].x * cells));
    const cy = Math.min(cells - 1, Math.floor(points[i].y * cells));
    bins[cy * cells + cx].push(i);
  }

  for (const grain of grains) {
    const gx = Math.min(cells - 1, Math.max(0, Math.floor(grain.bx * cells)));
    const gy = Math.min(cells - 1, Math.max(0, Math.floor(grain.by * cells)));
    let best = 0;
    let bestDistance = Infinity;
    for (let radius = 0; radius < cells; radius++) {
      if (radius > 0 && bestDistance < ((radius - 1) / cells) ** 2) break;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const cx = gx + dx;
          const cy = gy + dy;
          if (cx < 0 || cy < 0 || cx >= cells || cy >= cells) continue;
          for (const index of bins[cy * cells + cx]) {
            const ox = points[index].x - grain.bx;
            const oy = points[index].y - grain.by;
            const distance = ox * ox + oy * oy;
            if (distance < bestDistance) {
              bestDistance = distance;
              best = index;
            }
          }
        }
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
    let wasLocked = false;
    let rippleStart: number | null = null;
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
      const ease = reduce.matches ? 1 : ORGANIZE_EASE;
      shown += (target - shown) * ease;
      if (Math.abs(target - shown) < 0.004) shown = target;
      onClosenessRef.current?.(shown);

      const follow = reduce.matches ? 1 : GRAIN_FOLLOW;
      const spread = 1 - shown;
      for (let i = 0; i < grains.length; i++) {
        const grain = grains[i];
        const drift = sandDrift(now, grain.phase, shown);
        const hx = clamp01(grain.bx + drift.x);
        const hy = clamp01(grain.by + drift.y);
        const aimX = hx + (grain.tx + grain.jx * spread + drift.x - hx) * shown;
        const aimY = hy + (grain.ty + grain.jy * spread + drift.y - hy) * shown;
        grain.x += (aimX - grain.x) * follow;
        grain.y += (aimY - grain.y) * follow;
      }

      const readingLocked = closeness(centsRef.current) === 1;
      if (shouldStartRipple(wasLocked, readingLocked, reduce.matches)) rippleStart = now;
      wasLocked = readingLocked;

      context.clearRect(0, 0, width, height);
      context.fillStyle = sandColor(shown);
      for (let band = 0; band < GRAIN_RADII.length; band++) {
        const radius = grainRadiusCss(band, shown) * dpr;
        context.beginPath();
        for (let i = band; i < grains.length; i += GRAIN_RADII.length) {
          const grain = grains[i];
          const x = grain.x * width;
          const y = grain.y * height;
          context.moveTo(x + radius, y);
          context.arc(x, y, radius, 0, Math.PI * 2);
        }
        context.fill();
      }

      if (rippleStart != null) {
        const progress = rippleProgress(now - rippleStart);
        if (progress == null) rippleStart = null;
        else drawRipple(context, width, height, progress);
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
