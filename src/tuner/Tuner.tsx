import { useEffect, useMemo, useState } from 'react';
import { InkMark } from '../shell/InkMark';
import { LineMeter } from './LineMeter';
import { ReferencePitch } from './ReferencePitch';
import { previewStatus, type PreviewName } from './preview';
import './tuner.css';
import { useReferencePitch } from './useReferencePitch';
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
  const reference = useReferencePitch();
  const live = useTuner(preview != null, reference.hz);
  const previewView = useMemo(
    () => (preview ? previewStatus(preview, reference.hz) : null),
    [preview, reference.hz],
  );
  const view = previewView ?? live.view;
  const [spoken, setSpoken] = useState('');

  const phrase = phraseFor(view);
  useEffect(() => {
    const id = window.setTimeout(() => setSpoken(phrase), 350);
    return () => window.clearTimeout(id);
  }, [phrase]);

  const tuning = view.status === 'tuning' ? view.display : null;
  const showStop = preview == null && (view.status === 'listening' || view.status === 'tuning');

  return (
    <div className="tuner">
      <div className="tuner-readout">
        <div className="hero-slot" aria-hidden={tuning ? undefined : true}>
          {tuning ? (
            <p className={tuning.inTune ? 'hero is-in-tune' : 'hero'}>{tuning.letter}</p>
          ) : null}
        </div>

        <div className="meter">
          <LineMeter tuning={tuning != null} cents={tuning?.cents ?? 0} inTune={tuning?.inTune ?? false} />
        </div>

        <p className="cents" aria-hidden={tuning ? undefined : true}>
          {tuning?.text ?? ''}
        </p>
      </div>

      <div className="tuner-controls">
        {view.status === 'denied' ? (
          <>
            <p className="line">{DENIED[view.reason]}</p>
            <button type="button" className="text-button" onClick={live.start}>
              try again
              <InkMark width={28} />
            </button>
          </>
        ) : showStop ? (
          <button type="button" className="text-button" onClick={live.stop}>
            stop
            <InkMark width={28} />
          </button>
        ) : (
          <button type="button" className="text-button" onClick={live.start} disabled={preview != null}>
            listen
            <InkMark width={28} />
          </button>
        )}

        <ReferencePitch hz={reference.hz} onChange={reference.setHz} />
      </div>

      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
    </div>
  );
}

function phraseFor(view: TunerStatus): string {
  if (view.status === 'listening') return 'listening';
  if (view.status === 'requesting') return 'asking for the microphone';
  if (view.status === 'denied') return DENIED[view.reason];
  if (view.status === 'tuning') {
    const label = view.display.stringLabel;
    const where = label && label !== view.display.letter ? `${label}, ` : '';
    return `${view.display.letter}, ${where}${view.display.text}`;
  }
  return '';
}
