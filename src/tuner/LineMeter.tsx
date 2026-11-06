import { useEffect, useRef } from 'react';
import { tokens } from '../theme/tokens';
import { sandColor } from './cymatic';
import { LINE_METER, markerX } from './lineMeter';

type Props = {
  cents: number | null;
  closeness: number;
};

export function LineMeter({ cents, closeness }: Props) {
  const markerRef = useRef<SVGGElement>(null);
  const centsRef = useRef(cents);
  centsRef.current = cents;

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    let frame = 0;
    let shown = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (value: number) => {
      marker.setAttribute('transform', `translate(${markerX(value).toFixed(2)} ${LINE_METER.midY})`);
    };

    const tick = () => {
      const target = centsRef.current == null ? 0 : centsRef.current;
      const follow = reduce ? 1 : tokens.motion.needleFollow;
      shown += (target - shown) * follow;
      if (Math.abs(target - shown) < 0.04) shown = target;
      draw(shown);
      frame = requestAnimationFrame(tick);
    };

    draw(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const home = markerX(0);

  return (
    <svg
      className="meter-svg"
      style={{ color: sandColor(closeness) }}
      viewBox={`0 0 ${LINE_METER.width} ${LINE_METER.height}`}
      aria-hidden="true"
    >
      <line
        className="meter-line"
        x1={LINE_METER.inset}
        y1={LINE_METER.midY}
        x2={LINE_METER.width - LINE_METER.inset}
        y2={LINE_METER.midY}
      />
      <g ref={markerRef} transform={`translate(${home} ${LINE_METER.midY})`}>
        <rect
          className="meter-marker"
          x={-LINE_METER.markerWidth / 2}
          y={-LINE_METER.markerHalf}
          width={LINE_METER.markerWidth}
          height={LINE_METER.markerHalf * 2}
          rx={LINE_METER.markerWidth / 2}
        />
      </g>
    </svg>
  );
}
