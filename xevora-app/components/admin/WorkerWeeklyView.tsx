"use client";

import type { ShiftRow } from "@/lib/driver";

type ClientLite = { id: string; abbreviation: string };

export default function WorkerWeeklyView({
  shifts,
  clientsById,
}: {
  shifts: ShiftRow[];
  clientsById: Record<string, ClientLite>;
}) {
  if (!shifts.length) {
    return <p className="text-sm text-[var(--muted)]">No shifts this week.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[rgba(37,99,235,0.06)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2">Day</th>
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">In</th>
            <th className="px-3 py-2">Out</th>
            <th className="px-3 py-2">Reg</th>
            <th className="px-3 py-2">OT</th>
            <th className="px-3 py-2">Billable</th>
            <th className="px-3 py-2">GPS</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((s) => {
            const d = new Date(s.clock_in);
            const abbr = s.client_id ? clientsById[s.client_id]?.abbreviation ?? "—" : "—";
            return (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2 font-jb text-[var(--text)]">
                  {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-[rgba(37,99,235,0.12)] px-2 py-0.5 font-jb text-[10px] uppercase text-[var(--blue-bright)]">
                    {abbr}
                  </span>
                </td>
                <td className="px-3 py-2 font-jb text-[var(--muted)]">
                  {new Date(s.clock_in).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </td>
                <td className="px-3 py-2 font-jb text-[var(--muted)]">
                  {s.clock_out
                    ? new Date(s.clock_out).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                    : "—"}
                </td>
                <td className="px-3 py-2 font-jb">{s.regular_hours ?? "—"}</td>
                <td className="px-3 py-2 font-jb text-amber-300">{s.ot_hours ?? "—"}</td>
                <td className="px-3 py-2 font-jb">${Number(s.billable_amount ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2">
                  {s.within_geofence ? (
                    <span className="text-[10px] text-[var(--blue-bright)]">✓</span>
                  ) : (
                    <span className="text-[10px] text-[var(--muted)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
