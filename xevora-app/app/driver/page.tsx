"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ClientChip from "@/components/driver/ClientChip";
import ShiftTimer from "@/components/driver/ShiftTimer";
import { useCurrentShift, useDriverProfile } from "@/components/driver/DriverProvider";
import {
  activeMealBreak,
  getPayPeriodSummary,
  resolvePayPeriodForSummary,
  type ShiftRow,
} from "@/lib/driver";
import { createClient } from "@/lib/supabase";

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DriverHomePage() {
  const { profile, loading: profileLoading, error: profileError } = useDriverProfile();
  const { shift, loading: shiftLoading } = useCurrentShift();
  const [recent, setRecent] = useState<ShiftRow[]>([]);
  const [summaryHours, setSummaryHours] = useState(0);
  const [summaryPay, setSummaryPay] = useState(0);
  const [summaryRange, setSummaryRange] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    if (!profile?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shifts")
      .select("*, clients:client_id (abbreviation)")
      .eq("worker_id", profile.id)
      .order("clock_in", { ascending: false })
      .limit(3);
    if (!error && data) {
      setRecent(data as ShiftRow[]);
    }
  }, [profile?.id]);

  const loadSummary = useCallback(async () => {
    if (!profile?.id || !profile.company_id) return;
    setSummaryLoading(true);
    const supabase = createClient();
    const periodId = await resolvePayPeriodForSummary(supabase, profile.company_id);
    if (!periodId) {
      setSummaryHours(0);
      setSummaryPay(0);
      setSummaryRange(null);
      setSummaryLoading(false);
      return;
    }
    const { data: period } = await supabase
      .from("pay_periods")
      .select("start_date, end_date")
      .eq("id", periodId)
      .maybeSingle();
    if (period) {
      setSummaryRange(`${period.start_date as string} – ${period.end_date as string}`);
    } else {
      setSummaryRange(null);
    }
    const rate = profile.hourly_rate ?? profile.pay_rate ?? 0;
    const { summary } = await getPayPeriodSummary(supabase, profile.id, rate, periodId, {
      otWeeklyThreshold: profile.company.ot_weekly_threshold,
      workerPay: profile.workerPay,
      billingRates: profile.primaryRates ?? { billing_rate: rate, ot_billing_rate: rate * 1.5 },
    });
    setSummaryHours(summary.totalHours);
    setSummaryPay(summary.estimatedGross);
    setSummaryLoading(false);
  }, [profile]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const displayName = profile?.full_name?.trim() || "Driver";
  const firstName = displayName.split(/\s+/)[0] ?? displayName;
  const primaryClient =
    profile?.assignedClients.find((c) => c.is_primary) ?? profile?.assignedClients[0] ?? null;
  const meal = shift ? activeMealBreak(shift.meal_breaks) : null;

  if (profileLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-[#060B14]" />
        <div className="h-36 rounded-2xl bg-[#060B14]" />
        <div className="h-28 rounded-2xl bg-[#060B14]" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {profileError ?? "Unable to load driver profile."}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="space-y-6"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#4E6D92]">{greetingLabel()},</p>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-[#F1F5FF]">{firstName}</h1>
        </div>
        {primaryClient ? (
          <ClientChip abbreviation={primaryClient.abbreviation} pulse />
        ) : profile.truck_label ? (
          <div className="flex items-center gap-2 rounded-full border border-[#0f1729] bg-[#060B14] px-3 py-1.5">
            <span className="font-jb text-xs font-medium uppercase tracking-wider text-[#F1F5FF]">
              {profile.truck_label}
            </span>
          </div>
        ) : null}
      </header>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl border border-[#0f1729] bg-[#060B14] p-5 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)]"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#2563EB]" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4E6D92]">Shift status</p>
        {shiftLoading ? (
          <div className="mt-4 h-10 w-40 animate-pulse rounded bg-[#03060D]" />
        ) : shift && meal ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
              </span>
              <div>
                <p className="font-jb text-3xl tabular-nums tracking-tight text-amber-100">
                  <ShiftTimer startedAtIso={meal.start} />
                </p>
                <p className="text-xs text-amber-200/80">On meal break</p>
              </div>
            </div>
            <Link
              href="/driver/clock"
              className="flex w-full items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
            >
              End meal
            </Link>
          </div>
        ) : shift ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-50" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#22C55E]" />
              </span>
              <div>
                <p className="font-jb text-3xl tabular-nums tracking-tight text-[#F1F5FF]">
                  <ShiftTimer startedAtIso={shift.clock_in} />
                </p>
                <p className="text-xs text-[#4E6D92]">On the clock</p>
              </div>
            </div>
            <Link
              href="/driver/clock"
              className="flex w-full items-center justify-center rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] transition hover:bg-[#3B82F6]"
            >
              End shift
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-[#4E6D92]">You are not clocked in.</p>
            <Link
              href="/driver/clock"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2563EB]/50 bg-[#2563EB]/10 py-3 text-sm font-semibold text-[#93C5FD] transition hover:border-[#3B82F6] hover:bg-[#2563EB]/20"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              Start shift
            </Link>
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-[#0f1729] bg-[#060B14] p-5 shadow-[inset_4px_0_0_0_#2563EB]"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4E6D92]">This pay period</p>
        {summaryLoading ? (
          <div className="mt-3 h-16 animate-pulse rounded-lg bg-[#03060D]" />
        ) : (
          <div className="mt-3 space-y-3">
            {summaryRange ? (
              <p className="text-[11px] font-medium text-[#4E6D92]">{summaryRange}</p>
            ) : null}
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-jb text-2xl tabular-nums text-[#F1F5FF]">{summaryHours.toFixed(2)}h</p>
                <p className="text-xs text-[#4E6D92]">Total hours</p>
              </div>
              <div className="text-right">
                <p className="font-jb text-xl tabular-nums text-[#3B82F6]">${summaryPay.toFixed(2)}</p>
                <p className="text-xs text-[#4E6D92]">Est. gross pay</p>
              </div>
            </div>
          </div>
        )}
      </motion.section>

      <div className="grid grid-cols-3 gap-2">
        {[
          { href: "/driver/timecard", label: "Timecard" },
          { href: "/driver/pay", label: "Pay" },
          { href: "/driver/vault", label: "Vault" },
        ].map((a, i) => (
          <motion.div key={a.href} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.04 }}>
            <Link
              href={a.href}
              className="flex h-full min-h-[4.5rem] flex-col items-center justify-center rounded-xl border border-[#0f1729] bg-[#060B14] px-2 py-3 text-center text-xs font-semibold text-[#F1F5FF] transition hover:border-[#2563EB]/40 hover:shadow-[0_0_16px_rgba(37,99,235,0.12)]"
            >
              {a.label}
            </Link>
          </motion.div>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-sans text-sm font-extrabold uppercase tracking-wider text-[#4E6D92]">
            Recent shifts
          </h2>
          <Link href="/driver/timecard" className="text-xs font-medium text-[#3B82F6]">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {recent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#0f1729] bg-[#060B14]/50 py-8 text-center text-sm text-[#4E6D92]">
              No shifts yet
            </p>
          ) : (
            recent.map((s) => {
              const abbr = (s as ShiftRow & { clients?: { abbreviation: string } | null }).clients?.abbreviation;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[#F1F5FF]">{formatShortDate(s.clock_in)}</p>
                    <p className="font-jb text-xs text-[#4E6D92]">
                      {s.total_hours != null ? `${Number(s.total_hours).toFixed(2)}h` : "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {abbr ? (
                      <span className="rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-2 py-0.5 font-jb text-[10px] uppercase text-[#93C5FD]">
                        {abbr}
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                        s.status === "completed" || s.status === "approved"
                          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                          : s.status === "active"
                            ? "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#93C5FD]"
                            : "border-amber-500/35 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </motion.div>
  );
}
