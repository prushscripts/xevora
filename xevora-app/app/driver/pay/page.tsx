"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import PayPeriodCard from "@/components/driver/PayPeriodCard";
import { useDriverProfile } from "@/components/driver/DriverProvider";
import { getPayPeriodSummary, listPayPeriods, shiftHoursLive, type PayPeriodRow, type ShiftRow } from "@/lib/driver";
import { createClient } from "@/lib/supabase";

function PeriodPayInline({
  profileId,
  hourlyRate,
  period,
}: {
  profileId: string;
  hourlyRate: number;
  period: PayPeriodRow;
}) {
  const [text, setText] = useState("…");

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const { summary } = await getPayPeriodSummary(supabase, profileId, hourlyRate, period.id);
      setText(`$${summary.estimatedGross.toFixed(2)} est. · ${summary.totalHours.toFixed(2)}h`);
    };
    void run();
  }, [profileId, hourlyRate, period.id]);

  return <span>{text}</span>;
}

export default function DriverPayPage() {
  const { profile, loading: profileLoading, error: profileError } = useDriverProfile();
  const [periods, setPeriods] = useState<PayPeriodRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [breakdown, setBreakdown] = useState<Record<string, ShiftRow[] | undefined>>({});
  const [breakdownLoading, setBreakdownLoading] = useState<Record<string, boolean>>({});
  const [currentSummary, setCurrentSummary] = useState<{
    hours: number;
    gross: number;
    status: PayPeriodRow["status"];
    range: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const heroPeriod = useMemo(
    () => periods.find((x) => x.status === "open") ?? periods[0] ?? null,
    [periods],
  );

  const historyRows = useMemo(() => {
    if (!heroPeriod) return periods;
    return periods.filter((p) => p.id !== heroPeriod.id);
  }, [periods, heroPeriod]);

  const load = useCallback(async () => {
    if (!profile?.company_id || !profile.id) return;
    setLoading(true);
    const supabase = createClient();
    const { periods: p } = await listPayPeriods(supabase, profile.company_id);
    setPeriods(p);
    const openOrFirst = p.find((x) => x.status === "open") ?? p[0];
    if (openOrFirst) {
      const rate = profile.hourly_rate ?? 0;
      const { summary } = await getPayPeriodSummary(supabase, profile.id, rate, openOrFirst.id);
      setCurrentSummary({
        hours: summary.totalHours,
        gross: summary.estimatedGross,
        status: openOrFirst.status,
        range: `${openOrFirst.start_date} – ${openOrFirst.end_date}`,
      });
    } else {
      setCurrentSummary(null);
    }
    setLoading(false);
  }, [profile?.company_id, profile?.hourly_rate, profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePeriod = async (period: PayPeriodRow) => {
    const nextOpen = !expanded[period.id];
    setExpanded((prev) => ({ ...prev, [period.id]: nextOpen }));
    if (!nextOpen || !profile?.id || breakdown[period.id]) return;

    setBreakdownLoading((m) => ({ ...m, [period.id]: true }));
    const supabase = createClient();
    const start = `${period.start_date}T00:00:00.000Z`;
    const end = `${period.end_date}T23:59:59.999Z`;
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .eq("worker_id", profile.id)
      .gte("clock_in", start)
      .lte("clock_in", end)
      .order("clock_in", { ascending: false });
    setBreakdown((b) => ({ ...b, [period.id]: (data as ShiftRow[]) ?? [] }));
    setBreakdownLoading((m) => ({ ...m, [period.id]: false }));
  };

  if (profileLoading) {
    return <div className="h-56 animate-pulse rounded-2xl bg-[#060B14]" />;
  }

  if (profileError || !profile) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {profileError ?? "Unable to load profile."}
      </div>
    );
  }

  const rate = profile.hourly_rate ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <h1 className="font-[family-name:var(--font-syne)] text-xl font-extrabold text-[#F1F5FF]">Pay</h1>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-[#060B14]" />
      ) : currentSummary && heroPeriod ? (
        <PayPeriodCard
          hoursWorked={currentSummary.hours}
          hourlyRate={rate}
          grossPay={currentSummary.gross}
          status={currentSummary.status}
          title="Current pay period"
          subtitle={currentSummary.range}
        />
      ) : (
        <div className="rounded-2xl border border-[#0f1729] bg-[#060B14] p-6 text-sm text-[#4E6D92]">
          No pay periods available yet.
        </div>
      )}

      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4E6D92]">Pay history</h2>
        {historyRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#0f1729] py-8 text-center text-sm text-[#4E6D92]">
            No prior pay periods
          </p>
        ) : (
          <div className="space-y-2">
            {historyRows.map((period) => {
              const isOpen = expanded[period.id];
              return (
                <div key={period.id} className="overflow-hidden rounded-xl border border-[#0f1729] bg-[#060B14]">
                  <button
                    type="button"
                    onClick={() => void togglePeriod(period)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-[#0a1424]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#F1F5FF]">
                        {period.start_date} → {period.end_date}
                      </p>
                      <p className="font-jb mt-1 text-xs text-[#4E6D92]">
                        <PeriodPayInline profileId={profile.id} hourlyRate={rate} period={period} />
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${
                        period.status === "paid"
                          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                          : period.status === "processing"
                            ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
                            : "border-[#3B82F6]/35 bg-[#3B82F6]/10 text-[#93C5FD]"
                      }`}
                    >
                      {period.status}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="border-t border-[#0f1729]"
                      >
                        <ul className="max-h-64 space-y-2 overflow-y-auto px-4 py-3">
                          {breakdownLoading[period.id] ? (
                            <li className="text-xs text-[#4E6D92]">Loading shifts…</li>
                          ) : (breakdown[period.id] ?? []).length === 0 ? (
                            <li className="text-xs text-[#4E6D92]">No shifts in this period</li>
                          ) : (
                            (breakdown[period.id] ?? []).map((s) => (
                              <li
                                key={s.id}
                                className="flex items-center justify-between rounded-lg bg-[#03060D] px-3 py-2 font-jb text-xs text-[#F1F5FF]"
                              >
                                <span>{new Date(s.clock_in).toLocaleDateString()}</span>
                                <span>{shiftHoursLive(s).toFixed(2)}h</span>
                              </li>
                            ))
                          )}
                        </ul>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-center text-[11px] leading-relaxed text-[#4E6D92]">
        Final amounts subject to review by your employer.
      </p>
    </motion.div>
  );
}
