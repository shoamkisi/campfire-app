import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitch } from '../pitch/mpm';
import { toDisplay, type TunerDisplay } from '../pitch/notes';
import { createFrequencySmoother, type FrequencySmoother } from '../pitch/smooth';

export type MicReason = 'blocked' | 'missing' | 'busy' | 'insecure';

export type TunerStatus =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'denied'; reason: MicReason }
  | { status: 'listening' }
  | { status: 'tuning'; display: TunerDisplay };

type Engine = {
  context: AudioContext;
  stream: MediaStream;
  analyser: AnalyserNode;
  buffer: Float32Array;
  smoother: FrequencySmoother;
  raf: number;
};

export function useTuner(paused: boolean) {
  const [view, setView] = useState<TunerStatus>({ status: 'idle' });
  const viewRef = useRef<TunerStatus>(view);
  const engineRef = useRef<Engine | null>(null);
  const generation = useRef(0);

  const publish = useCallback((next: TunerStatus) => {
    if (sameStatus(viewRef.current, next)) return;
    viewRef.current = next;
    setView(next);
  }, []);

  const teardown = useCallback(() => {
    const engine = engineRef.current;
    engineRef.current = null;
    if (!engine) return;
    cancelAnimationFrame(engine.raf);
    for (const track of engine.stream.getTracks()) track.stop();
    void engine.context.close();
  }, []);

  const stop = useCallback(() => {
    generation.current += 1;
    teardown();
    publish({ status: 'idle' });
  }, [publish, teardown]);

  const start = useCallback(async () => {
    if (paused) return;
    const ticket = generation.current + 1;
    generation.current = ticket;
    teardown();

    if (!window.isSecureContext) {
      publish({ status: 'denied', reason: 'insecure' });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      publish({ status: 'denied', reason: 'missing' });
      return;
    }

    publish({ status: 'requesting' });

    let stream: MediaStream;
    try {
      stream = await openMicrophone();
    } catch (error) {
      if (generation.current !== ticket) return;
      publish({ status: 'denied', reason: classifyMicError(error) });
      return;
    }

    if (generation.current !== ticket) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }

    try {
      const context = new AudioContext();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);

      const engine: Engine = {
        context,
        stream,
        analyser,
        buffer: new Float32Array(analyser.fftSize),
        smoother: createFrequencySmoother(),
        raf: 0,
      };
      engineRef.current = engine;
      publish({ status: 'listening' });

      let last = 0;
      const loop = (time: number) => {
        if (engineRef.current !== engine) return;
        if (time - last >= 48) {
          last = time;
          readTimeDomain(analyser, engine.buffer);
          const found = detectPitch(engine.buffer, context.sampleRate);
          const frequency = engine.smoother.push(
            found ? { frequency: found.frequency } : null,
          );
          publish(
            frequency == null
              ? { status: 'listening' }
              : { status: 'tuning', display: toDisplay(frequency) },
          );
        }
        engine.raf = requestAnimationFrame(loop);
      };
      engine.raf = requestAnimationFrame(loop);
    } catch (error) {
      for (const track of stream.getTracks()) track.stop();
      if (generation.current !== ticket) return;
      publish({ status: 'denied', reason: classifyMicError(error) });
    }
  }, [paused, publish, teardown]);

  useEffect(() => {
    if (paused) {
      generation.current += 1;
      teardown();
    }
    return () => {
      generation.current += 1;
      teardown();
    };
  }, [paused, teardown]);

  return { view, start, stop };
}

async function openMicrophone(): Promise<MediaStream> {
  const tuned: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  };
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: tuned, video: false });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OverconstrainedError') {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw error;
  }
}

function readTimeDomain(analyser: AnalyserNode, buffer: Float32Array<ArrayBufferLike>): void {
  if (typeof analyser.getFloatTimeDomainData === 'function') {
    analyser.getFloatTimeDomainData(buffer as Float32Array<ArrayBuffer>);
    return;
  }
  const bytes = new Uint8Array(buffer.length);
  analyser.getByteTimeDomainData(bytes);
  for (let i = 0; i < buffer.length; i++) buffer[i] = (bytes[i] - 128) / 128;
}

function classifyMicError(error: unknown): MicReason {
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure';
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'missing';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return 'busy';
  }
  return 'blocked';
}

function sameStatus(prev: TunerStatus, next: TunerStatus): boolean {
  if (prev.status !== next.status) return false;
  if (prev.status === 'denied' && next.status === 'denied') return prev.reason === next.reason;
  if (prev.status !== 'tuning' || next.status !== 'tuning') return true;
  const a = prev.display;
  const b = next.display;
  return (
    a.letter === b.letter &&
    a.text === b.text &&
    a.stringLabel === b.stringLabel &&
    a.inTune === b.inTune &&
    a.far === b.far &&
    Math.abs(a.cents - b.cents) < 0.25 &&
    Math.round(a.hz) === Math.round(b.hz)
  );
}
