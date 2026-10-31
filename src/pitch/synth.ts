/** Synthetic tones for tests and for the preview links. Not used on the mic path. */

export function tone(
  frequency: number,
  sampleRate: number,
  length: number,
  amplitude = 0.65,
): Float32Array {
  const out = new Float32Array(length);
  const step = (2 * Math.PI * frequency) / sampleRate;
  for (let i = 0; i < length; i++) out[i] = amplitude * Math.sin(step * i);
  return out;
}

/** amplitudes[0] is the fundamental, amplitudes[1] the octave, and so on. */
export function harmonicTone(
  frequency: number,
  sampleRate: number,
  length: number,
  amplitudes: readonly number[],
): Float32Array {
  const out = new Float32Array(length);
  const step = (2 * Math.PI * frequency) / sampleRate;
  for (let i = 0; i < length; i++) {
    let sample = 0;
    for (let h = 0; h < amplitudes.length; h++) {
      sample += amplitudes[h] * Math.sin(step * (h + 1) * i);
    }
    out[i] = sample;
  }
  return out;
}

export function silence(length: number): Float32Array {
  return new Float32Array(length);
}

export function whiteNoise(length: number, amplitude: number, seed = 1): Float32Array {
  const out = new Float32Array(length);
  let state = seed >>> 0;
  for (let i = 0; i < length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out[i] = ((state / 4294967296) * 2 - 1) * amplitude;
  }
  return out;
}
