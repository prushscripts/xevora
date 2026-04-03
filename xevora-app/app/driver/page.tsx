"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ShiftTimer from "@/components/driver/ShiftTimer";
import { useDriverProfile } from "@/components/driver/DriverProvider";
import {
  getCurrentShift,
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
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [recent, setRecent] = useState<ShiftRow[]>([]);
  const [summaryHours, setSummaryHours] = useState(0);
  const [summaryPay, setSummaryPay] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadShift = useCallback(async () => {
    if (!profile?.id) return;
    setShiftLoading(true);
    const supabase = createClient();
    const { shift: s } = await getCurrentShift(supabase, profile.id);
    setShift(s);
    setShiftLoading(false);
  }, [profile?.id]);

  const loadRecent = useCallback(async () => {
    if (!profile?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
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
      setSummaryLoading(false);
      return;
    }
    const rate = profile.hourly_rate ?? 0;
    const { summary } = await getPayPeriodSummary(supabase, profile.id, rate, periodId);
    setSummaryHours(summary.totalHours);
    setSummaryPay(summary.estimatedGross);
    setSummaryLoading(false);
  }, [profile?.id, profile?.company_id, profile?.hourly_rate]);

  useEffect(() => {
    void loadShift();
  }, [loadShift]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const displayName = profile?.full_name?.trim() || "Driver";

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#4E6D92]">{greetingLabel()},</p>
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-extrabold tracking-tight text-[#F1F5FF]">
            {displayName}
          </h1>
        </div>
        {profile.truck_label ? (
          <div className="flex items-center gap-2 rounded-full border border-[#0f1729] bg-[#060B14] px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3B82F6] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3B82F6]" />
            </span>
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
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="font-jb text-2xl tabular-nums text-[#F1F5FF]">{summaryHours.toFixed(2)}h</p>
              <p className="text-xs text-[#4E6D92]">Total hours</p>
            </div>
            <div className="text-right">
              <p className="font-jb text-xl tabular-nums text-[#3B82F6]">${summaryPay.toFixed(2)}</p>
              <p className="text-xs text-[#4E6D92]">Est. pay</p>
            </div>
          </div>
        )}
      </motion.section>

      <div className="grid grid-cols-3 gap-2">
        {[
          { href: "/driver/timecard", label: "Timecard" },
          { href: "/driver/pay", label: "Pay history" },
          { href: "/driver/profile", label: "My truck" },
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
          <h2 className="font-[family-name:var(--font-syne)] text-sm font-extrabold uppercase tracking-wider text-[#4E6D92]">
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
            recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-3"
              >
                <div>
                  <p className="text-sm text-[#F1F5FF]">{formatShortDate(s.clock_in)}</p>
                  <p className="font-jb text-xs text-[#4E6D92]">
                    {s.total_hours != null ? `${Number(s.total_hours).toFixed(2)}h` : "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                    s.status === "completed"
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                      : s.status === "active"
                        ? "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#93C5FD]"
                        : "border-amber-500/35 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}
