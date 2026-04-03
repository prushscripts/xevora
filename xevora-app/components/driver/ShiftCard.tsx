"use client";

import { motion } from "framer-motion";
import type { MealBreak } from "@/lib/payroll";
import type { ShiftRow, ShiftStatus } from "@/lib/driver";

function statusStyles(status: ShiftStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "approved":
      return "border-[#3B82F6]/40 bg-[#2563EB]/15 text-[#93C5FD]";
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

function formatMealRange(m: MealBreak) {
  const a = formatTime(m.start);
  const b = m.end ? formatTime(m.end) : "…";
  return `${a}–${b}`;
}

export default function ShiftCard({
  shift,
  index = 0,
  clientAbbrev,
  showDayHeader,
}: {
  shift: ShiftRow;
  index?: number;
  clientAbbrev?: string | null;
  showDayHeader?: boolean;
}) {
  const meals = (shift.meal_breaks as MealBreak[] | null) ?? [];
  const ot = shift.ot_hours != null ? Number(shift.ot_hours) : 0;
  const reg = shift.regular_hours != null ? Number(shift.regular_hours) : null;
  const geofenceOk = shift.within_geofence === true;
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
      className={`group relative overflow-hidden rounded-xl border border-[#0f1729] bg-[#060B14] pl-4 shadow-[inset_3px_0_0_0_rgba(37,99,235,0.65)] transition-[box-shadow] hover:shadow-[inset_3px_0_0_0_rgba(59,130,246,0.9),0_0_24px_rgba(59,130,246,0.08)] ${
        ot > 0 ? "shadow-[inset_3px_0_0_0_rgba(245,158,11,0.55)]" : ""
      }`}
    >
      {showDayHeader ? (
        <p className="border-b border-[#0f1729] py-2 pr-4 font-sans text-[11px] font-extrabold uppercase tracking-wider text-[#4E6D92]">
          {formatDayLabel(shift.clock_in)}
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-3 py-4 pr-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {!showDayHeader ? (
              <p className="font-sans text-sm font-extrabold tracking-wide text-[#F1F5FF]">
                {formatDayLabel(shift.clock_in)}
              </p>
            ) : null}
            {clientAbbrev ? (
              <span className="inline-flex rounded-full border border-[#2563EB]/35 bg-[#2563EB]/10 px-2 py-0.5 font-jb text-[10px] font-semibold uppercase tracking-wider text-[#93C5FD]">
                {clientAbbrev}
              </span>
            ) : null}
            {shift.status === "flagged" ? (
              <span className="text-amber-400" title="Flagged">
                ⚑
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-jb text-xs text-[#4E6D92]">
            <span className="text-[#F1F5FF]/90">{formatTime(shift.clock_in)}</span>
            {" → "}
            <span className="text-[#F1F5FF]/90">{shift.clock_out ? formatTime(shift.clock_out) : "Open"}</span>
          </p>
          {meals.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-[10px] text-[#4E6D92]">
              {meals.map((m, i) => (
                <li key={i} className="font-jb">
                  Meal {i + 1}: {formatMealRange(m)}
                </li>
              ))}
            </ul>
          ) : null}
          {reg != null || ot > 0 ? (
            <p className="mt-2 font-jb text-[10px] text-[#4E6D92]">
              {reg != null ? <span>Reg {reg.toFixed(2)}h</span> : null}
              {reg != null && ot > 0 ? <span className="mx-1">·</span> : null}
              {ot > 0 ? <span className="text-amber-300">OT {ot.toFixed(2)}h</span> : null}
            </p>
          ) : null}
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
      <div className="flex flex-wrap items-center gap-3 border-t border-[#0f1729] px-4 py-2.5">
        {geofenceOk ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#4E6D92]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
            In geofence
          </span>
        ) : shift.gps_verified ? (
          <span className="text-[10px] text-[#4E6D92]">GPS captured</span>
        ) : (
          <span className="text-[10px] text-[#4E6D92]">No GPS on clock-in</span>
        )}
      </div>
    </motion.article>
  );
}
