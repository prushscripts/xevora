"use client";

import { motion } from "framer-motion";

export type WeeklySummaryLite = {
  status: "pending" | "approved" | "locked";
  flat_weekly_rate: number | null;
  ot_bonus_amount: number;
  ot_bonus_note: string | null;
  final_approved_pay: number;
};

type PayPeriodCardProps = {
  hoursWorked: number;
  payPeriodStatus: "open" | "processing" | "paid";
  title?: string;
  subtitle?: string;
  mode: "hourly" | "flat_weekly";
  hourlyRate?: number;
  estimatedGross?: number;
  weeklySummary?: WeeklySummaryLite | null;
};

function statusChip(status: PayPeriodCardProps["payPeriodStatus"]) {
  const map = {
    open: "bg-[#3B82F6]/15 text-[#93C5FD] border-[#3B82F6]/35",
    processing: "bg-amber-500/10 text-amber-200 border-amber-500/30",
    paid: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
  };
  return map[status];
}

export default function PayPeriodCard({
  hoursWorked,
  payPeriodStatus,
  title = "Current pay period",
  subtitle,
  mode,
  hourlyRate = 0,
  estimatedGross = 0,
  weeklySummary,
}: PayPeriodCardProps) {
  const base = weeklySummary?.flat_weekly_rate ?? estimatedGross;
  const approved =
    weeklySummary && (weeklySummary.status === "approved" || weeklySummary.status === "locked");

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-[#0f1729] bg-gradient-to-br from-[#060B14] via-[#060B14] to-[#0a1424] p-6 shadow-[0_0_0_1px_rgba(37,99,235,0.12),0_24px_48px_rgba(0,0,0,0.45)]"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#2563EB]/20 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-lg font-extrabold text-[#F1F5FF]">{title}</p>
            {subtitle ? <p className="mt-1 text-xs text-[#4E6D92]">{subtitle}</p> : null}
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusChip(payPeriodStatus)}`}
          >
            {payPeriodStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Hours worked</p>
            <p className="font-jb mt-1 text-xl tabular-nums text-[#F1F5FF]">{hoursWorked.toFixed(2)}</p>
          </div>
          {mode === "hourly" ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Pay rate</p>
              <p className="font-jb mt-1 text-xl tabular-nums text-[#F1F5FF]">${hourlyRate.toFixed(2)}/hr</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Contract</p>
              <p className="font-jb mt-1 text-xl tabular-nums text-[#F1F5FF]">Flat weekly</p>
            </div>
          )}
        </div>

        <div className="border-t border-[#0f1729] pt-4">
          {mode === "flat_weekly" ? (
            <>
              {approved ? (
                <>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Approved pay</p>
                  <p className="font-jb mt-2 text-lg leading-relaxed text-[#F1F5FF]">
                    Base{" "}
                    <span className="tabular-nums text-[#3B82F6]">${(weeklySummary?.flat_weekly_rate ?? 0).toFixed(2)}</span>
                    {Number(weeklySummary?.ot_bonus_amount) > 0 ? (
                      <>
                        {" "}
                        + OT bonus{" "}
                        <span className="tabular-nums text-amber-300">
                          ${Number(weeklySummary?.ot_bonus_amount).toFixed(2)}
                        </span>
                      </>
                    ) : null}{" "}
                    ={" "}
                    <span className="tabular-nums text-[#3B82F6]">
                      ${Number(weeklySummary?.final_approved_pay).toFixed(2)}
                    </span>
                  </p>
                  <p className="mt-2 text-xs font-semibold text-emerald-400">Approved ✓</p>
                  {weeklySummary?.ot_bonus_note ? (
                    <p className="mt-2 text-xs text-[#4E6D92]">{weeklySummary.ot_bonus_note}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Estimated pay</p>
                  <p className="font-jb mt-2 text-2xl font-medium tabular-nums tracking-tight text-[#3B82F6]">
                    ${base.toFixed(2)}{" "}
                    <span className="text-sm font-normal text-[#4E6D92]">base — pending approval</span>
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Gross pay (est.)</p>
              <p className="font-jb mt-1 text-3xl font-medium tabular-nums tracking-tight text-[#3B82F6]">
                ${estimatedGross.toFixed(2)}
              </p>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
