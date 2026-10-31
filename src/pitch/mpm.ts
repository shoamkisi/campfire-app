/**
 * McLeod Pitch Method.
 *
 * Philip McLeod, Geoff Wyvill, "A Smarter Way to Find Pitch"
 * (University of Otago, 2005).
 *
 * The normalized square difference function (NSDF) is an autocorrelation
 * scaled so a perfect repeat scores 1 and an unrelated lag scores near 0.
 * Pitch is the first strong peak, not the tallest FFT bin. That is what
 * keeps a guitar string from being reported as its octave.
 */

export type PitchDetection = {
  frequency: number;
  clarity: number;
  period: number;
};

export type DetectOptions = {
  minFrequency?: number;
  maxFrequency?: number;
  /** Fraction of the strongest peak a candidate must reach. Paper suggests ~0.93. */
  peakThreshold?: number;
  /** Peaks quieter than this are treated as noise. */
  clarityThreshold?: number;
  rmsThreshold?: number;
};

const DEFAULTS = {
  minFrequency: 70,
  maxFrequency: 1000,
  peakThreshold: 0.9,
  clarityThreshold: 0.75,
  rmsThreshold: 0.008,
};

export function detectPitch(
  samples: ArrayLike<number>,
  sampleRate: number,
  options: DetectOptions = {},
): PitchDetection | null {
  const minFrequency = options.minFrequency ?? DEFAULTS.minFrequency;
  const maxFrequency = options.maxFrequency ?? DEFAULTS.maxFrequency;
  const peakThreshold = options.peakThreshold ?? DEFAULTS.peakThreshold;
  const clarityThreshold = options.clarityThreshold ?? DEFAULTS.clarityThreshold;
  const rmsThreshold = options.rmsThreshold ?? DEFAULTS.rmsThreshold;

  const length = samples.length;
  if (length < 64 || sampleRate <= 0) return null;

  let sum = 0;
  let energy = 0;
  for (let i = 0; i < length; i++) {
    const value = samples[i];
    sum += value;
    energy += value * value;
  }
  const rms = Math.sqrt(energy / length);
  if (rms < rmsThreshold) return null;

  const mean = sum / length;
  const centered = new Float64Array(length);
  for (let i = 0; i < length; i++) centered[i] = samples[i] - mean;

  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency) - 1);
  // One extra lag so a pitch sitting on the 70 Hz edge still has a neighbor to interpolate.
  const maxLag = Math.min(length - 4, Math.ceil(sampleRate / minFrequency) + 2);
  if (maxLag <= minLag + 1) return null;

  const nsdf = normalizedSquareDifference(centered, maxLag);
  if (hasPitchAboveRange(nsdf, minLag)) return null;

  const peaks = positivePeaks(nsdf, minLag, maxLag - 1);
  if (peaks.length === 0) return null;

  let strongest = peaks[0];
  for (const peak of peaks) {
    if (nsdf[peak] > nsdf[strongest]) strongest = peak;
  }
  const gate = nsdf[strongest] * peakThreshold;
  let chosen = -1;
  for (const peak of peaks) {
    if (nsdf[peak] >= gate) {
      chosen = peak;
      break;
    }
  }
  if (chosen < 0) return null;

  const clarity = nsdf[chosen];
  if (clarity < clarityThreshold) return null;

  const period = parabolicPeak(nsdf, chosen);
  if (!Number.isFinite(period) || period <= 0) return null;

  const frequency = sampleRate / period;
  // Interpolation can land a true 70 Hz or 1000 Hz a fraction outside the window.
  if (frequency < minFrequency - 1 || frequency > maxFrequency + 1) return null;

  return { frequency, clarity, period };
}

function normalizedSquareDifference(samples: Float64Array, maxLag: number): Float64Array {
  const length = samples.length;
  const ac = linearAutocorrelation(samples, maxLag);
  const prefix = new Float64Array(length + 1);
  for (let i = 0; i < length; i++) {
    prefix[i + 1] = prefix[i] + samples[i] * samples[i];
  }

  const nsdf = new Float64Array(maxLag + 1);
  nsdf[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    const left = prefix[length - lag];
    const right = prefix[length] - prefix[lag];
    const norm = left + right;
    nsdf[lag] = norm > 1e-12 ? (2 * ac[lag]) / norm : 0;
  }
  return nsdf;
}

function linearAutocorrelation(samples: Float64Array, maxLag: number): Float64Array {
  const length = samples.length;
  let n = 1;
  while (n < length + maxLag) n <<= 1;

  const real = new Float64Array(n);
  const imag = new Float64Array(n);
  real.set(samples);
  transform(real, imag, false);
  for (let i = 0; i < n; i++) {
    real[i] = real[i] * real[i] + imag[i] * imag[i];
    imag[i] = 0;
  }
  transform(real, imag, true);

  const ac = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) ac[lag] = real[lag];
  return ac;
}

/** In-place radix-2 FFT. Inverse transform scales by 1/n. */
function transform(real: Float64Array, imag: Float64Array, inverse: boolean): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const swapReal = real[i];
      real[i] = real[j];
      real[j] = swapReal;
      const swapImag = imag[i];
      imag[i] = imag[j];
      imag[j] = swapImag;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = ((2 * Math.PI) / len) * (inverse ? 1 : -1);
    const wlenReal = Math.cos(angle);
    const wlenImag = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wReal = 1;
      let wImag = 0;
      const half = len >> 1;
      for (let j = 0; j < half; j++) {
        const a = i + j;
        const b = a + half;
        const vReal = real[b] * wReal - imag[b] * wImag;
        const vImag = real[b] * wImag + imag[b] * wReal;
        real[b] = real[a] - vReal;
        imag[b] = imag[a] - vImag;
        real[a] += vReal;
        imag[a] += vImag;
        const nextReal = wReal * wlenReal - wImag * wlenImag;
        wImag = wReal * wlenImag + wImag * wlenReal;
        wReal = nextReal;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] /= n;
    }
  }
}

function hasPitchAboveRange(nsdf: Float64Array, minLag: number): boolean {
  if (minLag <= 3) return false;
  const early = positivePeaks(nsdf, 2, minLag - 1);
  return early.some((peak) => nsdf[peak] >= 0.95);
}

function positivePeaks(nsdf: Float64Array, minLag: number, maxLag: number): number[] {
  const peaks: number[] = [];
  const last = Math.min(maxLag, nsdf.length - 2);
  for (let lag = Math.max(1, minLag); lag <= last; lag++) {
    const value = nsdf[lag];
    if (value > 0 && value >= nsdf[lag - 1] && value > nsdf[lag + 1]) {
      peaks.push(lag);
    }
  }
  return peaks;
}

function parabolicPeak(nsdf: Float64Array, index: number): number {
  const left = nsdf[index - 1] ?? nsdf[index];
  const mid = nsdf[index];
  const right = nsdf[index + 1] ?? nsdf[index];
  const denom = left - 2 * mid + right;
  if (denom === 0) return index;
  const delta = (left - right) / (2 * denom);
  if (!Number.isFinite(delta)) return index;
  return index + Math.max(-1, Math.min(1, delta));
}
