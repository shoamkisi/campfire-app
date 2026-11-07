import { detectPitch } from '../pitch/mpm';
import { A4, openStrings, toDisplay } from '../pitch/notes';
import { tone } from '../pitch/synth';
import type { TunerStatus } from './useTuner';

export type PreviewName =
  | 'idle'
  | 'listening'
  | 'denied'
  | 'far'
  | 'hint'
  | 'flat'
  | 'loose'
  | 'near'
  | 'sharp'
  | 'intune'
  | 'high';

export function readPreview(search: string): PreviewName | null {
  const value = new URLSearchParams(search).get('preview');
  if (value === 'in-tune' || value === 'intune') return 'intune';
  if (
    value === 'idle' ||
    value === 'listening' ||
    value === 'denied' ||
    value === 'far' ||
    value === 'hint' ||
    value === 'flat' ||
    value === 'loose' ||
    value === 'near' ||
    value === 'sharp' ||
    value === 'high'
  ) {
    return value;
  }
  return null;
}

/** Runs the real detector on a known tone, so a preview is not a painted fake. */
export function previewStatus(name: PreviewName, a4: number = A4): TunerStatus {
  if (name === 'idle') return { status: 'idle' };
  if (name === 'listening') return { status: 'listening' };
  if (name === 'denied') return { status: 'denied', reason: 'blocked' };

  const strings = openStrings(a4);
  const onA = name === 'intune' || name === 'hint' || name === 'loose' || name === 'near';
  const string = name === 'high' ? strings[5] : onA ? strings[1] : strings[0];
  const shift =
    name === 'far'
      ? -46
      : name === 'hint'
        ? -38
        : name === 'sharp'
          ? 46
          : name === 'flat' || name === 'loose'
            ? -32
            : name === 'near'
              ? -16
              : 0;
  const frequency = string.frequency * 2 ** (shift / 1200);
  const detected = detectPitch(tone(frequency, 48000, 4096), 48000);
  if (!detected) return { status: 'listening' };
  return { status: 'tuning', display: toDisplay(detected.frequency, a4) };
}
