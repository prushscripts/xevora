"use client";

import { useMemo, useState } from "react";
import { calculateMargin } from "@/lib/payroll";

type SummaryRow = {
  id?: string;
  total_hours: number;
  regular_hours: number;
  ot_hours: number;
  total_client_billing: number;
  flat_weekly_rate: number | null;
  ot_bonus_amount: number;
  ot_bonus_note: string | null;
  final_approved_pay: number;
  margin: number;
  status: string;
  approved_at: string | null;
};

export default function TimecardApproval({
  workerName,
  weekLabel,
  billingSubtotal,
  suggestedOtBonus,
  baseFlat,
  initialSummary,
  onApprove,
  onUnlock,
}: {
  workerName: string;
  weekLabel: string;
  billingSubtotal: number;
  suggestedOtBonus: number;
  baseFlat: number;
  initialSummary: SummaryRow | null;
  onApprove: (payload: { otBonus: number; note: string; finalPay: number }) => Promise<void>;
  onUnlock: () => Promise<void>;
}) {
  const [otBonus, setOtBonus] = useState(initialSummary?.ot_bonus_amount ?? suggestedOtBonus);
  const [note, setNote] = useState(initialSummary?.ot_bonus_note ?? "");
  const locked = initialSummary?.status === "approved" || initialSummary?.status === "locked";

  const finalPay = useMemo(() => Math.round((baseFlat + otBonus) * 100) / 100, [baseFlat, otBonus]);
  const { margin, marginPercent } = useMemo(
    () => calculateMargin(billingSubtotal, finalPay),
    [billingSubtotal, finalPay],
  );

  const [loading, setLoading] = useState(false);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Timecard review</h2>
      <p className="mt-1 font-[family-name:var(--font-syne)] text-xl font-extrabold text-[var(--text)]">{workerName}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">Week of {weekLabel}</p>

      <div className="mt-6 grid gap-2 font-jb text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Total hours</span>
          <span>{initialSummary?.total_hours?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Regular hours</span>
          <span>{initialSummary?.regular_hours?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="flex justify-between text-amber-200">
          <span>OT hours</span>
          <span>{initialSummary?.ot_hours?.toFixed(2) ?? "—"}</span>
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Client billing</p>
        <p className="mt-2 font-jb text-lg text-[var(--text)]">${billingSubtotal.toFixed(2)}</p>
      </div>

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Worker pay</p>
        <div className="mt-2 flex justify-between font-jb text-sm">
          <span className="text-[var(--muted)]">Base contract</span>
          <span>${baseFlat.toFixed(2)}</span>
        </div>
        <label className="mt-3 block text-[10px] uppercase tracking-wider text-[var(--muted)]">OT bonus</label>
        <input
          type="number"
          step="0.01"
          disabled={locked}
          value={otBonus}
          onChange={(e) => setOtBonus(Number(e.target.value) || 0)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#03060D] px-3 py-2 font-jb text-[var(--text)] disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Suggested: ${suggestedOtBonus.toFixed(2)} (reference only)
        </p>
        <label className="mt-3 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Note</label>
        <input
          type="text"
          disabled={locked}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#03060D] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-60"
        />
        <div className="mt-3 flex justify-between font-jb text-base font-semibold text-[var(--text)]">
          <span>Final approved pay</span>
          <span>${finalPay.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-[rgba(37,99,235,0.08)] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Your margin</p>
        <p className="font-jb text-xl text-[var(--blue-bright)]">
          ${margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
        </p>
      </div>

      {locked ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-emerald-300">
            Approved ✓ {initialSummary?.approved_at ? new Date(initialSummary.approved_at).toLocaleString() : ""}
          </p>
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              await onUnlock();
              setLoading(false);
            }}
            disabled={loading}
            className="text-sm text-amber-300 hover:underline disabled:opacity-50"
          >
            Unlock
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await onApprove({ otBonus, note, finalPay });
            setLoading(false);
          }}
          className="mt-6 w-full rounded-xl bg-[#2563EB] py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] disabled:opacity-50"
        >
          {loading ? "Saving…" : "Approve timecard ✓"}
        </button>
      )}
    </section>
  );
}
