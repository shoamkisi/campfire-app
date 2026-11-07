import { useEffect, useRef } from 'react';
import {
  GRAIN_COUNT,
  GRAIN_FOLLOW,
  GRAIN_RADII,
  ORGANIZE_EASE,
  SCATTER_RADIUS,
  closeness,
  edgeFade,
  gather,
  grainRadiusCss,
  modeForFrequency,
  nodalPoints,
  packOntoFigure,
  sandColor,
  sandDrift,
  type NodalPoint,
} from './cymatic';
import { rippleProgress, shouldStartRipple, waveOffset } from './ripple';

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
};

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
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * SCATTER_RADIUS;
    const x = 0.5 + Math.cos(angle) * radius;
    const y = 0.5 + Math.sin(angle) * radius;
    grains.push({
      x,
      y,
      bx: x,
      by: y,
      phase: rand() * Math.PI * 2,
      tx: x,
      ty: y,
    });
  }
  return grains;
}

/** Even steps along the figure, so locked sand fills the line instead of piling up. */
function assignTargets(grains: Grain[], points: readonly NodalPoint[]): void {
  const packed = packOntoFigure(
    grains.map((grain) => ({ x: grain.bx, y: grain.by })),
    points,
  );
  for (let i = 0; i < grains.length; i++) {
    grains[i].tx = packed[i].x;
    grains[i].ty = packed[i].y;
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
      const pull = gather(shown);
      const readingLocked = closeness(centsRef.current) === 1;
      if (shouldStartRipple(wasLocked, readingLocked, reduce.matches)) rippleStart = now;
      wasLocked = readingLocked;
      const progress = rippleStart == null ? null : rippleProgress(now - rippleStart);
      if (rippleStart != null && progress == null) rippleStart = null;

      for (let i = 0; i < grains.length; i++) {
        const grain = grains[i];
        const drift = sandDrift(now, grain.phase, shown);
        const homeX = grain.bx + drift.x;
        const homeY = grain.by + drift.y;
        const aimX = homeX + (grain.tx - grain.bx) * pull;
        const aimY = homeY + (grain.ty - grain.by) * pull;
        grain.x += (clamp01(aimX) - grain.x) * follow;
        grain.y += (clamp01(aimY) - grain.y) * follow;
      }

      const fadeSteps = 24;
      const drawn: { x: number; y: number; fade: number }[] = new Array(grains.length);
      for (let i = 0; i < grains.length; i++) {
        const grain = grains[i];
        let x = grain.x;
        let y = grain.y;
        if (progress != null) {
          const wave = waveOffset(x, y, progress);
          x += wave.x;
          y += wave.y;
        }
        drawn[i] = { x, y, fade: edgeFade(Math.hypot(x - 0.5, y - 0.5)) };
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = sandColor(shown);
      for (let band = 0; band < GRAIN_RADII.length; band++) {
        const radius = grainRadiusCss(band, shown) * dpr;
        for (let step = 0; step < fadeSteps; step++) {
          context.beginPath();
          let count = 0;
          for (let i = band; i < grains.length; i += GRAIN_RADII.length) {
            const grain = drawn[i];
            if (grain.fade <= 0.02) continue;
            const bucket = Math.min(fadeSteps - 1, Math.floor(grain.fade * fadeSteps));
            if (bucket !== step) continue;
            count += 1;
            const px = grain.x * width;
            const py = grain.y * height;
            context.moveTo(px + radius, py);
            context.arc(px, py, radius, 0, Math.PI * 2);
          }
          if (count === 0) continue;
          context.globalAlpha = (step + 0.5) / fadeSteps;
          context.fill();
        }
      }
      context.globalAlpha = 1;

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
