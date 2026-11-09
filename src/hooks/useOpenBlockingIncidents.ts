import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Count of open blocking incidents for the admin nav badge (RLS returns 0 rows for non-admins). */
export function useOpenBlockingIncidents(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      const { count: c, error } = await supabase.from('system_incidents' as never).select('id', { count: 'exact', head: true }).eq('status', 'open').eq('severity', 'blocking');
      if (!cancelled && !error) setCount(c ?? 0);
    };
    load();
    const timer = setInterval(load, 5 * 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [enabled]);
  return count;
}
