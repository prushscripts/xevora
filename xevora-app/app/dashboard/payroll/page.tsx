"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStaffCompanyId } from "@/lib/staffCompany";
import { shiftHoursLive, type PayPeriodRow, type ShiftRow } from "@/lib/driver";
import { createClient } from "@/lib/supabase";

type WorkerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  pay_type: "hourly" | "flat_weekly";
  hourly_rate: number | null;
  pay_rate: number | null;
  flat_weekly_rate: number | null;
};

type WorkerPayrollRow = {
  worker: WorkerRow;
  shifts: ShiftRow[];
  totalHours: number;
  grossPay: number;
  status: "draft" | "approved" | "paid";
};

function workerName(w: WorkerRow) {
  return `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() || "Unnamed worker";
}

function calculateGrossPay(worker: WorkerRow, totalHours: number): number {
  if (worker.pay_type === "flat_weekly") {
    return Number(worker.flat_weekly_rate) || 0;
  }
  const hourlyRate = Number(worker.pay_rate) || Number(worker.hourly_rate) || 0;
  const regularHours = Math.min(totalHours, 40);
  const otHours = Math.max(0, totalHours - 40);
  return regularHours * hourlyRate + otHours * hourlyRate * 1.5;
}

export default function DashboardPayrollPage() {
  const supabase = useMemo(() => createClient(), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PayPeriodRow | null>(null);
  const [rows, setRows] = useState<WorkerPayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { companyId: cid } = await getStaffCompanyId(supabase);
    setCompanyId(cid);
    if (!cid) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: openPeriod } = await supabase
      .from("pay_periods")
      .select("id, company_id, start_date, end_date, status")
      .eq("company_id", cid)
      .eq("status", "open")
      .order("start_date", { ascending: false })
      .maybeSingle();

    const targetPeriod =
      (openPeriod as PayPeriodRow | null) ??
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
    setPeriod(targetPeriod);

    const { data: workersData } = await supabase
      .from("workers")
      .select("id, first_name, last_name, pay_type, hourly_rate, pay_rate, flat_weekly_rate")
      .eq("company_id", cid)
      .order("first_name", { ascending: true });
    const workers = (workersData ?? []) as WorkerRow[];

    if (!targetPeriod) {
      setRows(
        workers.map((w) => ({
          worker: w,
          shifts: [],
          totalHours: 0,
          grossPay: calculateGrossPay(w, 0),
          status: "draft",
        })),
      );
      setLoading(false);
      return;
    }

    const start = `${targetPeriod.start_date}T00:00:00.000Z`;
    const end = `${targetPeriod.end_date}T23:59:59.999Z`;
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("*")
      .eq("company_id", cid)
      .gte("clock_in", start)
      .lte("clock_in", end);
    const shifts = (shiftsData ?? []) as ShiftRow[];

    const { data: weeklyData } = await supabase
      .from("weekly_summaries")
      .select("worker_id, status")
      .eq("pay_period_id", targetPeriod.id);
    const statusByWorker = new Map<string, "draft" | "approved" | "paid">();
    for (const row of weeklyData ?? []) {
      const status = String(row.status ?? "").toLowerCase();
      statusByWorker.set(
        row.worker_id as string,
        status === "paid" ? "paid" : status === "approved" || status === "locked" ? "approved" : "draft",
      );
    }

    const nextRows: WorkerPayrollRow[] = workers.map((worker) => {
      const ownShifts = shifts.filter((s) => s.worker_id === worker.id);
      const totalHours = ownShifts.reduce((sum, s) => sum + shiftHoursLive(s), 0);
      return {
        worker,
        shifts: ownShifts,
        totalHours,
        grossPay: calculateGrossPay(worker, totalHours),
        status: statusByWorker.get(worker.id) ?? "draft",
      };
    });

    setRows(nextRows);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approveWorker(workerId: string) {
    if (!period) return;
    await supabase
      .from("weekly_summaries")
      .upsert({ pay_period_id: period.id, worker_id: workerId, status: "approved" }, { onConflict: "pay_period_id,worker_id" });
    setRows((prev) => prev.map((row) => (row.worker.id === workerId ? { ...row, status: "approved" } : row)));
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.workers += 1;
        acc.hours += row.totalHours;
        acc.payroll += row.grossPay;
        return acc;
      },
      { workers: 0, hours: 0, payroll: 0 },
    );
  }, [rows]);

  const exportData = useMemo(() => {
    if (!period) return null;
    return {
      period: { start: period.start_date, end: period.end_date },
      workers: rows.map((r) => ({
        name: workerName(r.worker),
        type: r.worker.pay_type,
        totalHours: Number(r.totalHours.toFixed(2)),
        estimatedPay: Number(r.grossPay.toFixed(2)),
        shifts: r.shifts,
      })),
    };
  }, [period, rows]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-[#060B14]" />;
  }

  if (!companyId) {
    return <p className="text-sm text-[#4E6D92]">No company found for this account.</p>;
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-[#F1F5FF]">
          Payroll — Week of{" "}
          {period
            ? new Date(period.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
            : "No period"}
        </h1>
        <button
          type="button"
          disabled
          title="Coming Q3 2026 — Check.com integration"
          className="cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#4E6D92]"
        >
          Run payroll
        </button>
      </div>

      {rows.map((row) => (
        <section key={row.worker.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#F1F5FF]">{workerName(row.worker)}</p>
              <p className="text-xs text-[#4E6D92]">{row.worker.pay_type === "flat_weekly" ? "1099 / flat weekly" : "W2 / hourly"}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] uppercase ${
                row.status === "paid"
                  ? "bg-[#10B981]/15 text-[#6EE7B7]"
                  : row.status === "approved"
                    ? "bg-[#3B82F6]/15 text-[#93C5FD]"
                    : "bg-[#F59E0B]/15 text-[#FCD34D]"
              }`}
            >
              {row.status}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <p className="text-[#C8D8F0]">Hours: <span className="font-mono">{row.totalHours.toFixed(2)}</span></p>
            <p className="text-[#C8D8F0]">
              Rate:{" "}
              <span className="font-mono">
                {row.worker.pay_type === "flat_weekly"
                  ? `$${(Number(row.worker.flat_weekly_rate) || 0).toFixed(2)}`
                  : `$${(Number(row.worker.pay_rate) || Number(row.worker.hourly_rate) || 0).toFixed(2)}/hr`}
              </span>
            </p>
            <p className="text-[#C8D8F0]">Gross: <span className="font-mono">${row.grossPay.toFixed(2)}</span></p>
            <div className="text-right">
              {row.status === "draft" ? (
                <button type="button" onClick={() => void approveWorker(row.worker.id)} className="rounded-md bg-[#2563EB] px-3 py-1 text-xs text-white">
                  Approve
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <p className="text-[#C8D8F0]">Total workers: {totals.workers}</p>
          <p className="text-[#C8D8F0]">Total hours: {totals.hours.toFixed(2)}h</p>
          <p className="text-[#C8D8F0]">Total payroll: ${totals.payroll.toFixed(2)}</p>
        </div>
        <button type="button" onClick={() => setExportOpen(true)} className="mt-4 w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white">
          Export for payroll
        </button>
      </section>

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
