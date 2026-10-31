import { useEffect, useMemo, useState } from 'react';
import { InkMark } from '../shell/InkMark';
import { Gauge } from './Gauge';
import { Peg } from './Peg';
import { previewStatus, type PreviewName } from './preview';
import { useTuner, type MicReason, type TunerStatus } from './useTuner';

type Props = {
  preview: PreviewName | null;
};

const DENIED: Record<MicReason, string> = {
  blocked: 'microphone is blocked',
  missing: 'no microphone',
  busy: 'microphone is busy',
  insecure: 'needs a secure link',
};

export function Tuner({ preview }: Props) {
  const live = useTuner(preview != null);
  const previewView = useMemo(() => (preview ? previewStatus(preview) : null), [preview]);
  const view = previewView ?? live.view;
  const [spoken, setSpoken] = useState('');

  const phrase = phraseFor(view);
  useEffect(() => {
    const id = window.setTimeout(() => setSpoken(phrase), 350);
    return () => window.clearTimeout(id);
  }, [phrase]);

  const tuning = view.status === 'tuning' ? view.display : null;
  const gaugeMode = tuning ? 'tuning' : view.status === 'listening' ? 'live' : 'idle';
  const showPeg = view.status === 'idle' || view.status === 'requesting' || view.status === 'denied';
  const showStop = preview == null && (view.status === 'listening' || view.status === 'tuning');

  return (
    <>
      {showStop && (
        <button type="button" className="stop" onClick={live.stop}>
          stop
        </button>
      )}

      {showPeg && <Peg />}

      <div className="hero-slot" aria-hidden={tuning ? undefined : true}>
        {tuning && (
          <p className={tuning.inTune ? 'hero is-in-tune' : 'hero'}>{tuning.letter}</p>
        )}
      </div>

      <div className="dial">
        <Gauge mode={gaugeMode} cents={tuning?.cents ?? 0} inTune={tuning?.inTune ?? false} />
      </div>

      <div className="caption">
        {view.status === 'idle' || view.status === 'requesting' ? (
          <button type="button" className="text-button" onClick={live.start} disabled={preview != null}>
            listen
            <InkMark width={28} />
          </button>
        ) : null}

        {view.status === 'denied' ? (
          <>
            <p className="line">{DENIED[view.reason]}</p>
            <button type="button" className="text-button" onClick={live.start}>
              try again
              <InkMark width={28} />
            </button>
          </>
        ) : null}

        {view.status === 'listening' ? <p className="line quiet">listening</p> : null}

        {tuning ? (
          <>
            {tuning.stringLabel && tuning.stringLabel !== tuning.letter ? (
              <p className="line">{tuning.stringLabel}</p>
            ) : null}
            <p className={centsClass(tuning)}>{tuning.text}</p>
          </>
        ) : null}
      </div>

      {tuning ? <p className="hz">{Math.round(tuning.hz)} hz</p> : null}

      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
    </>
  );
}

function centsClass(display: { inTune: boolean; far: boolean }): string {
  if (display.inTune) return 'line is-in-tune';
  if (display.far) return 'line is-far';
  return 'line';
}

function phraseFor(view: TunerStatus): string {
  if (view.status === 'listening') return 'listening';
  if (view.status === 'requesting') return 'asking for the microphone';
  if (view.status === 'denied') return DENIED[view.reason];
  if (view.status === 'tuning') {
    const where = view.display.stringLabel ? `${view.display.stringLabel}, ` : '';
    return `${view.display.letter}, ${where}${view.display.text}`;
  }
  return '';
}
