/** Default concert A. Note names and cents use this unless a reference is passed. */
export const A4 = 440;

export const IN_TUNE_CENTS = 2;
/** How close a pitch must be before we call it an open string. */
export const STRING_LOCK_CENTS = 50;
export const NEEDLE_CENTS = 50;
/** A pitch this far off is marked as far. */
export const FAR_CENTS = 35;

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type StringId = 'E2' | 'A2' | 'D3' | 'G3' | 'B3' | 'E4';

export type GuitarString = {
  id: StringId;
  letter: string;
  label: string;
  midi: number;
  frequency: number;
};

const OPEN_STRINGS: Array<Omit<GuitarString, 'frequency'>> = [
  { id: 'E2', letter: 'E', label: 'low E', midi: 40 },
  { id: 'A2', letter: 'A', label: 'A', midi: 45 },
  { id: 'D3', letter: 'D', label: 'D', midi: 50 },
  { id: 'G3', letter: 'G', label: 'G', midi: 55 },
  { id: 'B3', letter: 'B', label: 'B', midi: 59 },
  { id: 'E4', letter: 'E', label: 'high E', midi: 64 },
];

export function midiToFrequency(midi: number, a4: number = A4): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

export function frequencyToMidi(frequency: number, a4: number = A4): number {
  return 69 + 12 * Math.log2(frequency / a4);
}

export function centsBetween(frequency: number, reference: number): number {
  return 1200 * Math.log2(frequency / reference);
}

export function openStrings(a4: number = A4): readonly GuitarString[] {
  return OPEN_STRINGS.map((string) => ({
    ...string,
    frequency: midiToFrequency(string.midi, a4),
  }));
}

export const STRINGS: readonly GuitarString[] = openStrings();

export type NamedPitch = {
  letter: string;
  octave: number;
  midi: number;
  cents: number;
  frequency: number;
  referenceFrequency: number;
};

export function namePitch(frequency: number, a4: number = A4): NamedPitch {
  const midiFloat = frequencyToMidi(frequency, a4);
  const midi = Math.round(midiFloat);
  const referenceFrequency = midiToFrequency(midi, a4);
  const cents = centsBetween(frequency, referenceFrequency);
  const letter = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { letter, octave, midi, cents, frequency, referenceFrequency };
}

export function nearestString(
  frequency: number,
  a4: number = A4,
): {
  string: GuitarString;
  cents: number;
} {
  const strings = a4 === A4 ? STRINGS : openStrings(a4);
  let best = strings[0];
  let bestAbs = Infinity;
  let bestCents = 0;
  for (const string of strings) {
    const cents = centsBetween(frequency, string.frequency);
    const abs = Math.abs(cents);
    if (abs < bestAbs) {
      best = string;
      bestAbs = abs;
      bestCents = cents;
    }
  }
  return { string: best, cents: bestCents };
}

export function isInTune(cents: number): boolean {
  // A hair of float error should not knock a dead-center string out of tune.
  return Math.abs(cents) <= IN_TUNE_CENTS + 1e-6;
}

export function formatOffset(cents: number): string {
  if (isInTune(cents)) return 'in tune';
  const rounded = Math.max(1, Math.round(Math.abs(cents)));
  return cents < 0 ? `${rounded}¢ flat` : `${rounded}¢ sharp`;
}

export type TunerDisplay = {
  letter: string;
  stringLabel: string | null;
  cents: number;
  text: string;
  inTune: boolean;
  far: boolean;
  hz: number;
};

/**
 * What the screen is allowed to say about a frequency.
 * Near an open string, the letter and the cents belong to that string.
 * Anywhere else, they belong to the nearest note, and no string is claimed.
 */
export function toDisplay(frequency: number, a4: number = A4): TunerDisplay {
  const named = namePitch(frequency, a4);
  const near = nearestString(frequency, a4);
  const lock = Math.abs(near.cents) <= STRING_LOCK_CENTS;
  const cents = lock ? near.cents : named.cents;
  const inTune = isInTune(cents);
  return {
    letter: lock ? near.string.letter : named.letter,
    stringLabel: lock ? near.string.label : null,
    cents,
    text: formatOffset(cents),
    inTune,
    far: !inTune && Math.abs(cents) >= FAR_CENTS,
    hz: frequency,
  };
}
