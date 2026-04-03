"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import TimecardApproval from "@/components/admin/TimecardApproval";
import WorkerWeeklyView from "@/components/admin/WorkerWeeklyView";
import { shiftHoursLive, type ShiftRow } from "@/lib/driver";
import { calculateWeeklyTotals } from "@/lib/payroll";
import { createClient } from "@/lib/supabase";

function startOfWeekMonday(d: Date) {
  const c = new Date(d);
  const day = c.getDay();
  const diff = (day + 6) % 7;
  c.setDate(c.getDate() - diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: workerId } = use(params);
  const supabase = useMemo(() => createClient(), []);
  const [worker, setWorker] = useState<Record<string, unknown> | null>(null);
  const [wc, setWc] = useState<{ billing_rate: number; ot_billing_rate: number } | null>(null);
  const [companyOt, setCompanyOt] = useState(40);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, { id: string; abbreviation: string }>>({});
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [payPeriodId, setPayPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const weekEnd = useMemo(() => addDays(weekAnchor, 6), [weekAnchor]);
  const weekLabel = `${weekAnchor.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: w } = await supabase.from("workers").select("*").eq("id", workerId).maybeSingle();
    setWorker(w);

    if (w?.company_id) {
      const { data: comp } = await supabase
        .from("companies")
        .select("ot_weekly_threshold")
        .eq("id", w.company_id)
        .maybeSingle();
      setCompanyOt(Number(comp?.ot_weekly_threshold) || 40);
    }

    const { data: wcl } = await supabase
      .from("worker_clients")
      .select("billing_rate, ot_billing_rate, is_primary, client_id, clients:client_id (id, abbreviation)")
      .eq("worker_id", workerId);

    const primary =
      (wcl ?? []).find((r: { is_primary?: boolean }) => r.is_primary) ?? (wcl ?? [])[0] ?? null;
    if (primary) {
      setWc({
        billing_rate: Number(primary.billing_rate) || 0,
        ot_billing_rate: Number(primary.ot_billing_rate) || 0,
      });
    }

    const cmap: Record<string, { id: string; abbreviation: string }> = {};
    for (const row of wcl ?? []) {
      const raw = row.clients as unknown;
      const cl = Array.isArray(raw)
        ? (raw[0] as { id?: string; abbreviation?: string } | undefined)
        : (raw as { id?: string; abbreviation?: string } | null);
      if (cl?.id) cmap[cl.id] = { id: cl.id, abbreviation: String(cl.abbreviation ?? "") };
    }
    setClientsMap(cmap);

    const startIso = weekAnchor.toISOString();
    const endIso = addDays(weekAnchor, 7).toISOString();

    const { data: shiftRows } = await supabase
      .from("shifts")
      .select("*")
      .eq("worker_id", workerId)
      .gte("clock_in", startIso)
      .lt("clock_in", endIso)
      .order("clock_in", { ascending: true });

    setShifts((shiftRows ?? []) as ShiftRow[]);

    const ws = weekAnchor.toISOString().slice(0, 10);
    const weStr = weekEnd.toISOString().slice(0, 10);
    const { data: pp } = await supabase
      .from("pay_periods")
      .select("id")
      .eq("company_id", w?.company_id as string)
      .lte("start_date", weStr)
      .gte("end_date", ws)
      .maybeSingle();

    const pid = pp?.id as string | undefined;
    setPayPeriodId(pid ?? null);

    if (pid) {
      const { data: sum } = await supabase.from("weekly_summaries").select("*").eq("worker_id", workerId).eq("pay_period_id", pid).maybeSingle();
      setSummary(sum);
    } else {
      setSummary(null);
    }

    setLoading(false);
  }, [supabase, workerId, weekAnchor, weekEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const shiftParts = shifts.map((s) => ({ totalHours: shiftHoursLive(s) }));
    const payType = (worker?.pay_type as string) || "hourly";
    const flat = Number(worker?.flat_weekly_rate) || 0;
    const pr = Number(worker?.pay_rate) || Number(worker?.hourly_rate) || 0;
    const otr = worker?.ot_pay_rate != null ? Number(worker.ot_pay_rate) : pr * 1.5;
    if (!wc) {
      return {
        totalHours: shiftParts.reduce((a, s) => a + s.totalHours, 0),
        regularHours: 0,
        otHours: 0,
        clientBilling: 0,
        suggestedOtBonus: 0,
      };
    }
    const t = calculateWeeklyTotals({
      shifts: shiftParts,
      worker: {
        pay_type: payType as "hourly" | "flat_weekly",
        pay_rate: pr,
        ot_pay_rate: otr,
        flat_weekly_rate: flat,
      },
      workerClient: { billing_rate: wc.billing_rate, ot_billing_rate: wc.ot_billing_rate },
      otWeeklyThreshold: companyOt,
    });
    const otHours = t.otHours;
    const rate =
      worker?.ot_bonus_rate != null && Number(worker.ot_bonus_rate) > 0 ? Number(worker.ot_bonus_rate) : 15;
    const suggestedOtBonus = Math.round(otHours * rate * 100) / 100;
    return {
      totalHours: t.totalHours,
      regularHours: t.regularHours,
      otHours: t.otHours,
      clientBilling: t.clientBilling,
      suggestedOtBonus,
    };
  }, [shifts, wc, worker, companyOt]);

  const baseFlat = Number(worker?.flat_weekly_rate) || 0;

  const summaryForCard = summary
    ? {
        id: summary.id as string,
        total_hours: Number(summary.total_hours) || totals.totalHours,
        regular_hours: Number(summary.regular_hours) || totals.regularHours,
        ot_hours: Number(summary.ot_hours) || totals.otHours,
        total_client_billing: Number(summary.total_client_billing) || totals.clientBilling,
        flat_weekly_rate: summary.flat_weekly_rate != null ? Number(summary.flat_weekly_rate) : baseFlat,
        ot_bonus_amount: Number(summary.ot_bonus_amount) || 0,
        ot_bonus_note: (summary.ot_bonus_note as string) ?? null,
        final_approved_pay: Number(summary.final_approved_pay) || baseFlat,
        margin: Number(summary.margin) || 0,
        status: (summary.status as string) || "pending",
        approved_at: (summary.approved_at as string) ?? null,
      }
    : {
        total_hours: totals.totalHours,
        regular_hours: totals.regularHours,
        ot_hours: totals.otHours,
        total_client_billing: totals.clientBilling,
        flat_weekly_rate: baseFlat,
        ot_bonus_amount: 0,
        ot_bonus_note: null,
        final_approved_pay: baseFlat,
        margin: totals.clientBilling - baseFlat,
        status: "pending",
        approved_at: null,
      };

  async function onApprove(payload: { otBonus: number; note: string; finalPay: number }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !worker?.company_id || !payPeriodId) return;

    const margin = totals.clientBilling - payload.finalPay;
    const row = {
      company_id: worker.company_id as string,
      worker_id: workerId,
      pay_period_id: payPeriodId,
      total_hours: totals.totalHours,
      regular_hours: totals.regularHours,
      ot_hours: totals.otHours,
      flat_weekly_rate: baseFlat,
      ot_bonus_amount: payload.otBonus,
      ot_bonus_note: payload.note || null,
      final_approved_pay: payload.finalPay,
      total_client_billing: totals.clientBilling,
      margin,
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    await supabase.from("weekly_summaries").upsert(row, { onConflict: "worker_id,pay_period_id" });
    await supabase.from("audit_log").insert({
      company_id: worker.company_id,
      actor_id: user.id,
      action: "timecard_approved",
      target_table: "weekly_summaries",
      target_id: payPeriodId,
      metadata: { worker_id: workerId },
    });
    void load();
  }

  async function onUnlock() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !worker?.company_id || !payPeriodId) return;
    await supabase
      .from("weekly_summaries")
      .update({
        status: "pending",
        approved_by: null,
        approved_at: null,
        ot_bonus_amount: 0,
        ot_bonus_note: null,
        final_approved_pay: baseFlat,
        margin: totals.clientBilling - baseFlat,
      })
      .eq("worker_id", workerId)
      .eq("pay_period_id", payPeriodId);
    await supabase.from("audit_log").insert({
      company_id: worker.company_id,
      actor_id: user.id,
      action: "timecard_unlocked",
      target_table: "weekly_summaries",
      target_id: payPeriodId,
      metadata: { worker_id: workerId },
    });
    void load();
  }

  if (loading && !worker) {
    return <div className="p-8 text-[var(--muted)]">Loading…</div>;
  }

  if (!worker) {
    return <div className="p-8 text-[var(--muted)]">Worker not found.</div>;
  }

  const name = (worker.full_name as string) || "Worker";

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard/workers" className="text-sm text-[var(--muted)] hover:text-[var(--blue-bright)]">
          ← Workers
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-extrabold text-[var(--text)]">{name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--muted)]">
              {(worker.role as string) || "driver"}
            </span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--muted)]">
              {worker.worker_type as string}
            </span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--muted)]">
              {(worker.pay_type as string) === "flat_weekly" ? "Flat weekly" : "Hourly"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)]"
            onClick={() => setWeekAnchor((d) => addDays(d, -7))}
            aria-label="Previous week"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)]"
            onClick={() => setWeekAnchor((d) => addDays(d, 7))}
            aria-label="Next week"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <TimecardApproval
        workerName={name}
        weekLabel={weekLabel}
        billingSubtotal={totals.clientBilling}
        suggestedOtBonus={totals.suggestedOtBonus}
        baseFlat={baseFlat}
        initialSummary={summaryForCard}
        onApprove={onApprove}
        onUnlock={onUnlock}
      />

      <div>
        <h2 className="mb-3 text-sm font-bold text-[var(--text)]">Daily breakdown</h2>
        <WorkerWeeklyView shifts={shifts} clientsById={clientsMap} />
      </div>
    </div>
  );
}
