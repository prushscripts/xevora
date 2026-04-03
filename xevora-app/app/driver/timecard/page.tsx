"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import HexLogo from "@/components/auth/HexLogo";
import ShiftCard from "@/components/driver/ShiftCard";
import { useDriverProfile } from "@/components/driver/DriverProvider";
import { listPayPeriods, shiftHoursLive, type PayPeriodRow, type ShiftRow } from "@/lib/driver";
import { createClient } from "@/lib/supabase";

export default function DriverTimecardPage() {
  const { profile, loading: profileLoading, error: profileError } = useDriverProfile();
  const [periods, setPeriods] = useState<PayPeriodRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(false);

  const loadPeriods = useCallback(async () => {
    if (!profile?.company_id) return;
    setListLoading(true);
    const supabase = createClient();
    const { periods: p } = await listPayPeriods(supabase, profile.company_id);
    setPeriods(p);
    setListLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    if (periods.length > 0 && selectedId == null) {
      setSelectedId(periods[0].id);
    }
  }, [periods, selectedId]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedId) ?? null,
    [periods, selectedId],
  );

  const loadShifts = useCallback(async () => {
    if (!profile?.id || !selectedPeriod) {
      setShifts([]);
      return;
    }
    setShiftsLoading(true);
    const supabase = createClient();
    const start = `${selectedPeriod.start_date}T00:00:00.000Z`;
    const end = `${selectedPeriod.end_date}T23:59:59.999Z`;
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("worker_id", profile.id)
      .gte("clock_in", start)
      .lte("clock_in", end)
      .order("clock_in", { ascending: false });

    if (!error && data) {
      setShifts(data as ShiftRow[]);
    } else {
      setShifts([]);
    }
    setShiftsLoading(false);
  }, [profile?.id, selectedPeriod]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  const totals = useMemo(() => {
    let total = 0;
    for (const s of shifts) {
      total += shiftHoursLive(s);
    }
    const regular = Math.min(total, 40);
    const ot = Math.max(0, total - 40);
    return { total, regular, ot };
  }, [shifts]);

  if (profileLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[#060B14]" />;
  }

  if (profileError || !profile) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {profileError ?? "Unable to load profile."}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      <header>
        <h1 className="font-sans text-xl font-extrabold text-[#F1F5FF]">Timecard</h1>
        <p className="mt-1 text-xs text-[#4E6D92]">Pay period</p>
        {listLoading ? (
          <div className="mt-3 h-11 animate-pulse rounded-xl bg-[#060B14]" />
        ) : (
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="mt-3 w-full rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-3 text-sm text-[#F1F5FF] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            {periods.length === 0 ? <option value="">No pay periods</option> : null}
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.start_date} → {p.end_date} ({p.status})
              </option>
            ))}
          </select>
        )}
      </header>

      <section className="rounded-xl border border-[#0f1729] bg-[#060B14] p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6D92]">Total</p>
            <p className="font-jb mt-1 text-lg tabular-nums text-[#F1F5FF]">{totals.total.toFixed(2)}h</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6D92]">Regular</p>
            <p className="font-jb mt-1 text-lg tabular-nums text-[#F1F5FF]">{totals.regular.toFixed(2)}h</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6D92]">OT</p>
            <p className="font-jb mt-1 text-lg tabular-nums text-[#F1F5FF]">{totals.ot > 0 ? `${totals.ot.toFixed(2)}h` : "—"}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4E6D92]">Shifts</h2>
        {shiftsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[#060B14]" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#0f1729] bg-[#060B14]/40 py-12"
          >
            <HexLogo />
            <p className="text-sm text-[#4E6D92]">No shifts recorded yet</p>
          </motion.div>
        ) : (
          shifts.map((s, i) => <ShiftCard key={s.id} shift={s} index={i} />)
        )}
      </section>
    </motion.div>
  );
}
