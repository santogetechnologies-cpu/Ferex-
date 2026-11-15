import { useEffect, useState } from 'react';
import { getUniversityFallbackImage, FALLBACK_EVENT } from '../lib/api/universityFallback';

export function useUniversityFallback(): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let live = true;
    const load = (force = false) => getUniversityFallbackImage(force).then(u => live && setUrl(u));
    void load();
    const on = () => void load(true);
    window.addEventListener(FALLBACK_EVENT, on);
    return () => { live = false; window.removeEventListener(FALLBACK_EVENT, on); };
  }, []);
  return url;
}
