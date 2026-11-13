import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State that survives leaving and returning to a screen (for example opening another sidebar tab while filling in
 * an "Add" form). The draft lives in this browser tab's session storage only; it is a convenience, never a data store.
 * Call the returned `clear()` after a successful save or when the user cancels.
 */
export function useDraftState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const initialRef = useRef(initial);
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(`ferex_draft_${key}`);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
    return initial;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`ferex_draft_${key}`, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(`ferex_draft_${key}`);
    } catch {}
    setValue(initialRef.current);
  }, [key]);

  return [value, setValue, clear];
}
