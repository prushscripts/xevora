"use client";

import { motion } from "framer-motion";

type PayPeriodCardProps = {
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
  status: "open" | "processing" | "paid";
  title?: string;
  subtitle?: string;
};

function statusChip(status: PayPeriodCardProps["status"]) {
  const map = {
    open: "bg-[#3B82F6]/15 text-[#93C5FD] border-[#3B82F6]/35",
    processing: "bg-amber-500/10 text-amber-200 border-amber-500/30",
    paid: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
  };
  return map[status];
}

export default function PayPeriodCard({
  hoursWorked,
  hourlyRate,
  grossPay,
  status,
  title = "Current pay period",
  subtitle,
}: PayPeriodCardProps) {
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
            className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusChip(status)}`}
          >
            {status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Hours worked</p>
            <p className="font-jb mt-1 text-xl tabular-nums text-[#F1F5FF]">{hoursWorked.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Hourly rate</p>
            <p className="font-jb mt-1 text-xl tabular-nums text-[#F1F5FF]">${hourlyRate.toFixed(2)}</p>
          </div>
        </div>
        <div className="border-t border-[#0f1729] pt-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">Gross pay (est.)</p>
          <p className="font-jb mt-1 text-3xl font-medium tabular-nums tracking-tight text-[#3B82F6]">
            ${grossPay.toFixed(2)}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
