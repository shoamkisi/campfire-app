import { useId, useState } from 'react';
import { InkMark } from '../shell/InkMark';
import { REFERENCE_MAX, REFERENCE_MIN, REFERENCE_PRESETS } from './referencePitch';

type Props = {
  hz: number;
  onChange: (hz: number) => void;
};

export function ReferencePitch({ hz, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={open ? 'reference is-open' : 'reference'}>
      <button
        type="button"
        className="reference-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        A = {hz} Hz
      </button>

      {open ? (
        <div id={panelId} className="reference-panel" role="group" aria-label="Reference pitch">
          <div className="reference-presets">
            {REFERENCE_PRESETS.map((preset) => {
              const selected = hz === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={selected ? 'reference-choice is-selected' : 'reference-choice'}
                  aria-pressed={selected}
                  onClick={() => onChange(preset)}
                >
                  <span>{preset}</span>
                  {selected ? <InkMark width={22} /> : <span className="reference-mark-space" />}
                </button>
              );
            })}
          </div>
          <div className="reference-step">
            <button
              type="button"
              className="reference-nudge"
              onClick={() => onChange(hz - 1)}
              disabled={hz <= REFERENCE_MIN}
              aria-label="Lower by 1 hertz"
            >
              −
            </button>
            <span className="reference-now" aria-live="polite">
              {hz}
              <span className="sr-only"> hertz</span>
            </span>
            <button
              type="button"
              className="reference-nudge"
              onClick={() => onChange(hz + 1)}
              disabled={hz >= REFERENCE_MAX}
              aria-label="Raise by 1 hertz"
            >
              +
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
