import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateShiftHours } from '../lib/payroll';

export type PayPeriod = {
  start: Date;
  end: Date;
  totalHours: number;
  regularHours: number;
  otHours: number;
  estimatedPay: number;
};

export function usePayPeriod(workerId: string) {
  const [currentPeriod, setCurrentPeriod] = useState<PayPeriod | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentPeriod = async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const { data: shifts, error } = await supabase
      .from('shifts')
      .select('clock_in, clock_out, meal_breaks, regular_hours, ot_hours')
      .eq('worker_id', workerId)
      .gte('clock_in', monday.toISOString())
      .lte('clock_in', sunday.toISOString());

    if (error || !shifts) {
      setLoading(false);
      return;
    }

    let totalHours = 0;
    let regularHours = 0;
    let otHours = 0;

    shifts.forEach((shift) => {
      if (shift.clock_out) {
        const { totalHours: hrs } = calculateShiftHours(
          new Date(shift.clock_in),
          new Date(shift.clock_out),
          shift.meal_breaks
        );
        totalHours += hrs;
        regularHours += shift.regular_hours || 0;
        otHours += shift.ot_hours || 0;
      }
    });

    setCurrentPeriod({
      start: monday,
      end: sunday,
      totalHours,
      regularHours,
      otHours,
      estimatedPay: 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchCurrentPeriod();
  }, [workerId]);

  return { currentPeriod, loading, refetch: fetchCurrentPeriod };
}
