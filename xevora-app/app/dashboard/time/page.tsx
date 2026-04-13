"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStaffCompanyId } from "@/lib/staffCompany";
import { shiftHoursLive, type PayPeriodRow, type ShiftRow } from "@/lib/driver";
import type { MealBreak } from "@/lib/payroll";
import { createClient } from "@/lib/supabase";

type WorkerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  pay_type: "hourly" | "flat_weekly";
  hourly_rate: number | null;
  pay_rate: number | null;
  flat_weekly_rate: number | null;
};

type Issue = { type: "missing_break"; label: string; shiftId: string; clockIn: string; clockOut: string | null };

type WorkerPeriodSummary = {
  worker: WorkerRow;
  shifts: ShiftRow[];
  dailyHours: Record<string, number>;
  totalHours: number;
  estimatedPay: number;
  issues: Issue[];
};

function workerName(w: WorkerRow) {
  return `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() || "Unnamed worker";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function asRate(worker: WorkerRow) {
  if (worker.pay_type === "flat_weekly") {
    return (Number(worker.flat_weekly_rate) || 0) / 40;
  }
  return Number(worker.pay_rate) || Number(worker.hourly_rate) || 0;
}

function calculatePay(worker: WorkerRow, totalHours: number): number {
  if (worker.pay_type === "flat_weekly") return Number(worker.flat_weekly_rate) || 0;
  const hourlyRate = Number(worker.pay_rate) || Number(worker.hourly_rate) || 0;
  const regularHours = Math.min(totalHours, 40);
  const otHours = Math.max(0, totalHours - 40);
  return regularHours * hourlyRate + otHours * hourlyRate * 1.5;
}

function detectIssues(shift: ShiftRow): Issue[] {
  const issues: Issue[] = [];
  const clockIn = new Date(shift.clock_in);
  const clockOut = shift.clock_out ? new Date(shift.clock_out) : new Date();
  const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
  const hasMealBreak =
    Array.isArray(shift.meal_breaks) && shift.meal_breaks.some((b: MealBreak) => Boolean(b?.end));
  if (hoursWorked >= 5 && !hasMealBreak) {
    issues.push({
      type: "missing_break",
      label: "Missing break",
      shiftId: shift.id,
      clockIn: shift.clock_in,
      clockOut: shift.clock_out,
    });
  }
  return issues;
}

export default function DashboardTimePage() {
  const supabase = useMemo(() => createClient(), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "period">("live");
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [todayShifts, setTodayShifts] = useState<ShiftRow[]>([]);
  const [payPeriod, setPayPeriod] = useState<PayPeriodRow | null>(null);
  const [periodSummaries, setPeriodSummaries] = useState<WorkerPeriodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});
  const [exportOpen, setExportOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const fetchWorkers = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from("workers")
      .select("id, first_name, last_name, role, pay_type, hourly_rate, pay_rate, flat_weekly_rate")
      .eq("company_id", cid)
      .order("first_name", { ascending: true });
    setWorkers((data ?? []) as WorkerRow[]);
  }, [supabase]);

  const fetchShifts = useCallback(async (cid: string) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .eq("company_id", cid)
      .gte("clock_in", todayStart.toISOString())
      .order("clock_in", { ascending: false });
    setTodayShifts((data ?? []) as ShiftRow[]);
  }, [supabase]);

  const fetchPayPeriodData = useCallback(async (cid: string, sourceWorkers: WorkerRow[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: periodData } = await supabase
      .from("pay_periods")
      .select("id, company_id, start_date, end_date, status")
      .eq("company_id", cid)
      .eq("status", "open")
      .order("start_date", { ascending: false })
      .maybeSingle();

    const period =
      (periodData as PayPeriodRow | null) ??
      ((
        await supabase
          .from("pay_periods")
          .select("id, company_id, start_date, end_date, status")
          .eq("company_id", cid)
          .lte("start_date", today)
          .gte("end_date", today)
          .order("start_date", { ascending: false })
          .maybeSingle()
      ).data as PayPeriodRow | null);

    setPayPeriod(period);
    if (!period) {
      setPeriodSummaries([]);
      return;
    }

    const start = `${period.start_date}T00:00:00.000Z`;
    const end = `${period.end_date}T23:59:59.999Z`;
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("*")
      .eq("company_id", cid)
      .gte("clock_in", start)
      .lte("clock_in", end)
      .order("clock_in", { ascending: false });
    const shifts = (shiftsData ?? []) as ShiftRow[];

    const summaries: WorkerPeriodSummary[] = sourceWorkers.map((worker) => {
      const own = shifts.filter((s) => s.worker_id === worker.id);
      const daily: Record<string, number> = {};
      for (const shift of own) {
        const key = dayKey(shift.clock_in);
        daily[key] = (daily[key] ?? 0) + shiftHoursLive(shift);
      }
      const totalHours = Object.values(daily).reduce((sum, h) => sum + h, 0);
      const issues = own.flatMap((s) => detectIssues(s));
      return {
        worker,
        shifts: own,
        dailyHours: daily,
        totalHours,
        estimatedPay: calculatePay(worker, totalHours),
        issues,
      };
    });

    setPeriodSummaries(summaries);
  }, [supabase]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { companyId: cid } = await getStaffCompanyId(supabase);
    setCompanyId(cid);
    if (!cid) {
      setLoading(false);
      return;
    }
    await fetchWorkers(cid);
    setLoading(false);
  }, [supabase, fetchWorkers]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!companyId) return;
    void fetchShifts(companyId);
  }, [companyId, fetchShifts]);

  useEffect(() => {
    if (!companyId || workers.length === 0) return;
    void fetchPayPeriodData(companyId, workers);
  }, [companyId, workers, fetchPayPeriodData]);

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel("shifts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts", filter: `company_id=eq.${companyId}` },
        () => {
          void fetchShifts(companyId);
          if (workers.length) void fetchPayPeriodData(companyId, workers);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, supabase, fetchShifts, fetchPayPeriodData, workers]);

  useEffect(() => {
    if (!companyId) return;
    const id = window.setInterval(() => {
      void fetchShifts(companyId);
    }, 30000);
    return () => window.clearInterval(id);
  }, [companyId, fetchShifts]);

  const liveRows = useMemo(() => {
    return workers.map((worker) => {
      const own = todayShifts.filter((s) => s.worker_id === worker.id);
      const activeShift = own.find((s) => s.status === "active" && !s.clock_out) ?? null;
      const completed = own.filter((s) => !!s.clock_out && s.status !== "active");
      const todayHours = own.reduce((sum, s) => sum + shiftHoursLive(s), 0);
      return { worker, activeShift, completed, todayHours };
    });
  }, [workers, todayShifts]);

  const liveSummary = useMemo(() => {
    const clockedIn = liveRows.filter((r) => r.activeShift);
    const total = liveRows.reduce((sum, r) => sum + r.todayHours, 0);
    const cost = liveRows.reduce((sum, r) => sum + r.todayHours * asRate(r.worker), 0);
    return { clockedIn: clockedIn.length, totalWorkers: liveRows.length, totalHours: total, laborCost: cost };
  }, [liveRows]);

  const periodDays = useMemo(() => {
    if (!payPeriod) return [] as Date[];
    const days: Date[] = [];
    const cursor = new Date(`${payPeriod.start_date}T00:00:00`);
    const end = new Date(`${payPeriod.end_date}T00:00:00`);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [payPeriod]);

  async function addMissingBreak(issue: Issue) {
    const start = new Date(issue.clockIn).getTime();
    const end = issue.clockOut ? new Date(issue.clockOut).getTime() : Date.now();
    const midpoint = new Date(start + (end - start) / 2);
    const breakEnd = new Date(midpoint.getTime() + 30 * 60 * 1000);
    const newBreak = {
      start: midpoint.toISOString(),
      end: breakEnd.toISOString(),
      type: "meal",
      added_by_admin: true,
    };

    const { data } = await supabase.from("shifts").select("meal_breaks").eq("id", issue.shiftId).single();
    const existing = Array.isArray(data?.meal_breaks) ? data.meal_breaks : [];
    await supabase
      .from("shifts")
      .update({ meal_breaks: [...existing, newBreak] })
      .eq("id", issue.shiftId);

    if (companyId) {
      await fetchShifts(companyId);
      await fetchPayPeriodData(companyId, workers);
    }
    setToast(`Break added — 30 min at ${formatTime(midpoint.toISOString())}`);
  }

  const exportData = useMemo(() => {
    if (!payPeriod) return null;
    return {
      period: { start: payPeriod.start_date, end: payPeriod.end_date },
      workers: periodSummaries.map((w) => ({
        name: workerName(w.worker),
        type: w.worker.pay_type,
        totalHours: Number(w.totalHours.toFixed(2)),
        estimatedPay: Number(w.estimatedPay.toFixed(2)),
        shifts: w.shifts,
      })),
    };
  }, [payPeriod, periodSummaries]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-[#060B14]" />;
  }

  if (!companyId) {
    return <p className="text-sm text-[#4E6D92]">No company found for this account.</p>;
  }

  return (
    <div className="space-y-5 pb-8">
      {toast ? (
        <div className="fixed right-4 top-20 z-50 rounded-lg border border-[#10B981]/30 bg-[#052019] px-4 py-2 text-sm text-[#A7F3D0]">
          {toast}
        </div>
      ) : null}

      <h1 className="text-2xl font-extrabold text-[#F1F5FF]">Time Tracking</h1>

      <div className="inline-flex rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-1">
        <button
          type="button"
          onClick={() => setActiveTab("live")}
          className={`rounded-full px-4 py-1.5 text-sm ${
            activeTab === "live" ? "bg-[rgba(37,99,235,0.15)] text-[#3B82F6]" : "text-[#4E6D92]"
          }`}
        >
          Live View
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("period")}
          className={`rounded-full px-4 py-1.5 text-sm ${
            activeTab === "period" ? "bg-[rgba(37,99,235,0.15)] text-[#3B82F6]" : "text-[#4E6D92]"
          }`}
        >
          Pay Period
        </button>
      </div>

      {activeTab === "live" ? (
        <>
          <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="text-sm text-[#F1F5FF]">
              {liveSummary.clockedIn} of {liveSummary.totalWorkers} workers clocked in
            </p>
            <p className="mt-1 font-mono text-sm text-[#4E6D92]">
              Total hours on clock today: {liveSummary.totalHours.toFixed(1)}h
            </p>
            <p className="font-mono text-sm text-[#4E6D92]">Est. labor cost today: ${liveSummary.laborCost.toFixed(2)}</p>
          </section>

          <div className="space-y-3">
            {liveRows.map(({ worker, activeShift, completed, todayHours }) => {
              const breakActive =
                activeShift &&
                Array.isArray(activeShift.meal_breaks) &&
                activeShift.meal_breaks.some((b: MealBreak) => b && !b.end);
              const runningHours = activeShift ? shiftHoursLive(activeShift) : 0;
              const noBreakWarning = activeShift && runningHours > 5 && !breakActive;
              return (
                <section key={worker.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#F1F5FF]">{workerName(worker)}</p>
                      <p className="text-xs text-[#4E6D92]">{worker.role ?? "worker"}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        activeShift ? "bg-[#10B981]/15 text-[#6EE7B7]" : "bg-white/5 text-[#94A3B8]"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${activeShift ? "animate-pulse bg-[#10B981]" : "bg-[#64748B]"}`} />
                      {activeShift ? "CLOCKED IN" : "NOT IN"}
                    </span>
                  </div>

                  {activeShift ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm text-[#C8D8F0]">Clocked in at {formatTime(activeShift.clock_in)}</p>
                      <p className="font-mono text-xl text-[#F1F5FF]">
                        {new Date(now - new Date(activeShift.clock_in).getTime()).toISOString().slice(11, 19)}
                      </p>
                      {breakActive ? <p className="text-sm text-[#F59E0B]">On break</p> : null}
                      {noBreakWarning ? <p className="text-sm text-[#F59E0B]">⚠ No break yet</p> : null}
                    </div>
                  ) : (
                    <div className="mt-3">
                      {completed.length > 0 ? (
                        <p className="text-sm text-[#4E6D92]">
                          Worked {todayHours.toFixed(1)}h today, clocked out at {formatTime(completed[0].clock_out as string)}
                        </p>
                      ) : (
                        <p className="text-sm text-[#4E6D92]">No activity today</p>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[#C8D8F0]">
            Pay Period:{" "}
            {payPeriod
              ? `${new Date(payPeriod.start_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} – ${new Date(payPeriod.end_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
              : "No open pay period"}
          </section>

          <div className="space-y-3">
            {periodSummaries.map((row) => (
              <section key={row.worker.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#F1F5FF]">
                      {workerName(row.worker)} · {row.worker.pay_type}
                    </p>
                    <p className="mt-1 text-xs text-[#4E6D92]">
                      Total: {row.totalHours.toFixed(1)}h | Est. pay: ${row.estimatedPay.toFixed(2)} | Issues: {row.issues.length}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#10B981]/15 px-2.5 py-1 text-[10px] text-[#6EE7B7]">
                    <span className="h-2 w-2 rounded-full bg-[#10B981]" /> Active
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-2 text-center">
                  {periodDays.map((day) => {
                    const k = day.toISOString().slice(0, 10);
                    const hours = row.dailyHours[k] ?? 0;
                    return (
                      <div key={k} className="rounded-lg bg-[#0B1320] px-2 py-2">
                        <p className="text-[10px] uppercase text-[#4E6D92]">
                          {day.toLocaleDateString(undefined, { weekday: "short" })}
                        </p>
                        <p className="mt-1 font-mono text-sm text-[#F1F5FF]">{hours > 0 ? `${hours.toFixed(1)}h` : "—"}</p>
                      </div>
                    );
                  })}
                </div>

                {row.issues.length > 0 ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setExpandedIssues((prev) => ({ ...prev, [row.worker.id]: !prev[row.worker.id] }))}
                      className="rounded-full bg-[#EF4444]/15 px-3 py-1 text-xs text-[#FCA5A5]"
                    >
                      {row.issues.length} issue{row.issues.length > 1 ? "s" : ""}
                    </button>
                    {expandedIssues[row.worker.id] ? (
                      <div className="mt-3 space-y-2">
                        {row.issues.map((issue) => (
                          <div key={issue.shiftId} className="flex items-center justify-between rounded-lg border border-[#EF4444]/30 bg-[#2A0E11] px-3 py-2">
                            <p className="text-xs text-[#FCA5A5]">
                              Missing 30-min break on {new Date(issue.clockIn).toLocaleDateString()}
                            </p>
                            <button
                              type="button"
                              onClick={() => void addMissingBreak(issue)}
                              className="rounded-md bg-[#2563EB] px-3 py-1 text-xs text-white"
                            >
                              Add break
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white"
          >
            Export to Fynlo →
          </button>
        </>
      )}

      {exportOpen && exportData ? (
        <div className="fixed inset-0 z-50 bg-black/70 p-4" onClick={() => setExportOpen(false)}>
          <div
            className="mx-auto mt-12 max-w-3xl rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#060B14] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#F1F5FF]">Payroll Export Summary</h3>
            <pre className="mt-3 max-h-[55vh] overflow-auto rounded-lg bg-[#03060D] p-3 text-xs text-[#C8D8F0]">
              {JSON.stringify(exportData, null, 2)}
            </pre>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white"
              >
                Copy summary
              </button>
              <button type="button" onClick={() => setExportOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
