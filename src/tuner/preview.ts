import { detectPitch } from '../pitch/mpm';
import { STRINGS, toDisplay } from '../pitch/notes';
import { tone } from '../pitch/synth';
import type { TunerStatus } from './useTuner';

export type PreviewName = 'idle' | 'listening' | 'denied' | 'flat' | 'intune';

export function readPreview(search: string): PreviewName | null {
  const value = new URLSearchParams(search).get('preview');
  if (value === 'in-tune' || value === 'intune') return 'intune';
  if (value === 'idle' || value === 'listening' || value === 'denied' || value === 'flat') {
    return value;
  }
  return null;
}

/** Runs the real detector on a known tone, so a preview is not a painted fake. */
export function previewStatus(name: PreviewName): TunerStatus {
  if (name === 'idle') return { status: 'idle' };
  if (name === 'listening') return { status: 'listening' };
  if (name === 'denied') return { status: 'denied', reason: 'blocked' };

  const string = name === 'flat' ? STRINGS[0] : STRINGS[1];
  const shift = name === 'flat' ? -32 : 1;
  const frequency = string.frequency * 2 ** (shift / 1200);
  const detected = detectPitch(tone(frequency, 48000, 4096), 48000);
  if (!detected) return { status: 'listening' };
  return { status: 'tuning', display: toDisplay(detected.frequency) };
}
