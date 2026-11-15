import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Calls onChange (debounced) whenever anyone adds, edits or removes a row in the table, on any device.
export function useRealtimeTable(table: string, onChange: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(timer);
        timer = setTimeout(onChange, 250);
      })
      .subscribe();
    return () => { clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [table, onChange]);
}
