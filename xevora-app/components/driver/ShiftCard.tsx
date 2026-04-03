"use client";

import { motion } from "framer-motion";
import type { ShiftRow, ShiftStatus } from "@/lib/driver";

function statusStyles(status: ShiftStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "active":
      return "border-[#3B82F6]/50 bg-[#3B82F6]/10 text-[#93C5FD]";
    case "flagged":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    default:
      return "border-[#4E6D92]/40 bg-[#060B14] text-[#4E6D92]";
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const date = d.getDate();
  return `${day} ${date}`;
}

export default function ShiftCard({
  shift,
  index = 0,
}: {
  shift: ShiftRow;
  index?: number;
}) {
  const gpsOk = shift.clock_in_lat != null && shift.clock_in_lng != null;
  const duration =
    shift.total_hours != null
      ? `${Number(shift.total_hours).toFixed(2)}h`
      : shift.clock_out
        ? `${(Math.max(0, (new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / 3_600_000)).toFixed(2)}h`
        : "—";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-xl border border-[#0f1729] bg-[#060B14] pl-4 shadow-[inset_3px_0_0_0_rgba(37,99,235,0.65)] transition-[box-shadow] hover:shadow-[inset_3px_0_0_0_rgba(59,130,246,0.9),0_0_24px_rgba(59,130,246,0.08)]"
    >
      <div className="flex items-start justify-between gap-3 py-4 pr-4">
        <div>
          <p className="font-[family-name:var(--font-syne)] text-sm font-extrabold tracking-wide text-[#F1F5FF]">
            {formatDayLabel(shift.clock_in)}
          </p>
          <p className="mt-1 font-jb text-xs text-[#4E6D92]">
            <span className="text-[#F1F5FF]/90">{formatTime(shift.clock_in)}</span>
            {" → "}
            <span className="text-[#F1F5FF]/90">
              {shift.clock_out ? formatTime(shift.clock_out) : "Open"}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusStyles(shift.status)}`}
          >
            {shift.status === "active" ? (
              <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[#3B82F6]" />
            ) : null}
            {shift.status}
          </span>
          <span className="font-jb text-sm tabular-nums text-[#F1F5FF]">{duration}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-[#0f1729] px-4 py-2.5">
        {gpsOk ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
            GPS verified
          </span>
        ) : (
          <span className="text-[10px] text-[#4E6D92]">No GPS on clock-in</span>
        )}
      </div>
    </motion.article>
  );
}
