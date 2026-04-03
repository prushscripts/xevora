import type { SupabaseClient } from "@supabase/supabase-js";

export type ShiftStatus = "active" | "completed" | "flagged";

export interface ShiftRow {
  id: string;
  company_id: string;
  worker_id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  status: ShiftStatus;
  total_hours: number | null;
  pay_period_id: string | null;
  note: string | null;
  created_at: string;
}

export interface PayPeriodRow {
  id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  status: "open" | "processing" | "paid";
}

function hoursBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  return Math.max(0, (b - a) / 3_600_000);
}

export function shiftHoursLive(shift: Pick<ShiftRow, "clock_in" | "clock_out" | "status" | "total_hours">): number {
  if (shift.status === "completed" && shift.total_hours != null) {
    return Number(shift.total_hours);
  }
  if (shift.status === "active" && !shift.clock_out) {
    return hoursBetween(shift.clock_in, new Date().toISOString());
  }
  if (shift.clock_out) {
    return hoursBetween(shift.clock_in, shift.clock_out);
  }
  return 0;
}

export async function getCurrentShift(
  supabase: SupabaseClient,
  workerId: string,
): Promise<{ shift: ShiftRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("worker_id", workerId)
    .eq("status", "active")
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { shift: null, error: new Error(error.message) };
  }
  return { shift: data as ShiftRow | null, error: null };
}

export async function getOpenPayPeriodId(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("pay_periods")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "open")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

/** Pay period that contains today, else most recent open period for the company. */
export async function resolvePayPeriodForSummary(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: byRange } = await supabase
    .from("pay_periods")
    .select("id")
    .eq("company_id", companyId)
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (byRange?.id) {
    return byRange.id as string;
  }

  return getOpenPayPeriodId(supabase, companyId);
}

export async function clockIn(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    workerId: string;
    lat: number;
    lng: number;
    note?: string | null;
  },
): Promise<{ shift: ShiftRow | null; error: Error | null }> {
  const payPeriodId = await getOpenPayPeriodId(supabase, params.companyId);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      company_id: params.companyId,
      worker_id: params.workerId,
      clock_in: now,
      clock_in_lat: params.lat,
      clock_in_lng: params.lng,
      status: "active",
      pay_period_id: payPeriodId,
      note: params.note?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return { shift: null, error: new Error(error.message) };
  }
  return { shift: data as ShiftRow, error: null };
}

export async function clockOut(
  supabase: SupabaseClient,
  params: {
    shiftId: string;
    lat: number;
    lng: number;
  },
): Promise<{ shift: ShiftRow | null; error: Error | null }> {
  const { data: existing, error: fetchErr } = await supabase
    .from("shifts")
    .select("*")
    .eq("id", params.shiftId)
    .single();

  if (fetchErr || !existing) {
    return { shift: null, error: new Error(fetchErr?.message ?? "Shift not found") };
  }

  const row = existing as ShiftRow;
  const clockOutIso = new Date().toISOString();
  const totalHours = hoursBetween(row.clock_in, clockOutIso);

  const { data, error } = await supabase
    .from("shifts")
    .update({
      clock_out: clockOutIso,
      clock_out_lat: params.lat,
      clock_out_lng: params.lng,
      total_hours: Math.round(totalHours * 100) / 100,
      status: "completed",
    })
    .eq("id", params.shiftId)
    .select("*")
    .single();

  if (error) {
    return { shift: null, error: new Error(error.message) };
  }
  return { shift: data as ShiftRow, error: null };
}

export interface PayPeriodSummary {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  estimatedGross: number;
  hourlyRate: number;
}

export async function getPayPeriodSummary(
  supabase: SupabaseClient,
  workerId: string,
  hourlyRate: number,
  payPeriodId: string,
): Promise<{ summary: PayPeriodSummary; error: Error | null }> {
  const { data: period, error: pe } = await supabase
    .from("pay_periods")
    .select("start_date, end_date")
    .eq("id", payPeriodId)
    .maybeSingle();

  if (pe || !period) {
    return {
      summary: { totalHours: 0, regularHours: 0, overtimeHours: 0, estimatedGross: 0, hourlyRate },
      error: new Error(pe?.message ?? "Pay period not found"),
    };
  }

  const start = `${period.start_date as string}T00:00:00.000Z`;
  const end = `${period.end_date as string}T23:59:59.999Z`;

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("clock_in, clock_out, status, total_hours")
    .eq("worker_id", workerId)
    .gte("clock_in", start)
    .lte("clock_in", end);

  if (error) {
    return {
      summary: { totalHours: 0, regularHours: 0, overtimeHours: 0, estimatedGross: 0, hourlyRate },
      error: new Error(error.message),
    };
  }

  let totalHours = 0;
  for (const s of shifts ?? []) {
    totalHours += shiftHoursLive(s as ShiftRow);
  }

  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);
  const rate = hourlyRate || 0;
  const estimatedGross = Math.round((regularHours * rate + overtimeHours * rate * 1.5) * 100) / 100;

  return {
    summary: {
      totalHours: Math.round(totalHours * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      estimatedGross,
      hourlyRate: rate,
    },
    error: null,
  };
}

export async function listPayPeriods(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{ periods: PayPeriodRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("pay_periods")
    .select("id, company_id, start_date, end_date, status")
    .eq("company_id", companyId)
    .order("start_date", { ascending: false });

  if (error) {
    return { periods: [], error: new Error(error.message) };
  }
  return { periods: (data ?? []) as PayPeriodRow[], error: null };
}

export function formatHhMmSsFromMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
