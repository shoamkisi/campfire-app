import { useEffect, useRef } from 'react';
import { tokens } from '../theme/tokens';
import { GAUGE, TICKS, arcPath, crownPoint, needleGeometry, tickLine } from './gauge';

type Props = {
  mode: 'idle' | 'live' | 'tuning';
  cents: number;
  inTune: boolean;
};

export function Gauge({ mode, cents, inTune }: Props) {
  const needleRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const centsRef = useRef(cents);
  const modeRef = useRef(mode);
  centsRef.current = cents;
  modeRef.current = mode;

  useEffect(() => {
    const needle = needleRef.current;
    const dot = dotRef.current;
    if (!needle || !dot) return;

    let frame = 0;
    let shown = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (value: number) => {
      const geometry = needleGeometry(value);
      needle.setAttribute(
        'd',
        `M ${GAUGE.pivotX} ${GAUGE.pivotY} Q ${geometry.bendX.toFixed(2)} ${geometry.bendY.toFixed(2)} ${geometry.tipX.toFixed(2)} ${geometry.tipY.toFixed(2)}`,
      );
      dot.setAttribute('cx', geometry.tipX.toFixed(2));
      dot.setAttribute('cy', geometry.tipY.toFixed(2));
    };

    const tick = () => {
      const target = modeRef.current === 'tuning' ? centsRef.current : 0;
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

  const crown = crownPoint();

  return (
    <svg
      className={`gauge gauge-${mode}${inTune ? ' is-in-tune' : ''}`}
      viewBox={`0 0 ${GAUGE.width} ${GAUGE.height}`}
      aria-hidden="true"
    >
      <path className="arc" d={arcPath()} />
      {TICKS.map((tick) => {
        const line = tickLine(tick.cents, tick.length);
        return (
          <line
            key={`${tick.cents}-${tick.length}`}
            className="tick"
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
          />
        );
      })}
      <path ref={needleRef} className="needle" />
      <circle ref={dotRef} className="ember" cx={crown.x} cy={crown.y} r="3.5" />
    </svg>
  );
}
