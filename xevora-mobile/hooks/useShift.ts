import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Shift = {
  id: string;
  worker_id: string;
  client_id: string;
  clock_in: string;
  clock_out: string | null;
  meal_breaks: Array<{ start: string; end: string | null }> | null;
  status: 'active' | 'meal_break' | 'completed';
  total_hours: number | null;
  regular_hours: number | null;
  ot_hours: number | null;
};

export function useShift(workerId: string) {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveShift = async () => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('worker_id', workerId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setActiveShift(data as Shift);
    } else {
      setActiveShift(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActiveShift();

    const channel = supabase
      .channel('shifts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
          filter: `worker_id=eq.${workerId}`,
        },
        () => {
          fetchActiveShift();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workerId]);

  return { activeShift, loading, refetch: fetchActiveShift };
}
