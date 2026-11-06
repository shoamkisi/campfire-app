import { useCallback, useState } from 'react';
import { readReference, writeReference, type ReferenceStore } from './referencePitch';

function browserStore(): ReferenceStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function useReferencePitch(): { hz: number; setHz: (hz: number) => void } {
  const [hz, setHzState] = useState(() => readReference(browserStore()));
  const setHz = useCallback((next: number) => {
    setHzState(writeReference(browserStore(), next));
  }, []);
  return { hz, setHz };
}
