import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateShiftHours,
  calculateWeeklyTotals,
  prorateShiftFinancials,
  type MealBreak,
  type WorkerClientRates,
  type WorkerPayProfile,
} from "@/lib/payroll";

export type ShiftStatus = "active" | "completed" | "flagged" | "approved";

export interface ShiftRow {
  id: string;
  company_id: string;
  worker_id: string;
  client_id: string | null;
  clock_in: string;
  clock_out: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  gps_verified: boolean | null;
  within_geofence: boolean | null;
  meal_breaks: MealBreak[] | null;
  status: ShiftStatus;
  regular_hours: number | null;
  ot_hours: number | null;
  total_hours: number | null;
  gross_pay: number | null;
  billable_amount: number | null;
  pay_period_id: string | null;
  note: string | null;
  notes: string | null;
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

function startOfWeekMondayLocal(d: Date) {
  const c = new Date(d);
  const day = c.getDay();
  const diff = (day + 6) % 7;
  c.setDate(c.getDate() - diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfWeekSundayLocal(start: Date) {
  const e = new Date(start);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function shiftHoursLive(shift: Pick<ShiftRow, "clock_in" | "clock_out" | "status" | "total_hours" | "meal_breaks">): number {
  if ((shift.status === "completed" || shift.status === "approved") && shift.total_hours != null) {
    return Number(shift.total_hours);
  }
  if (shift.status === "active" && !shift.clock_out) {
    const { totalHours } = calculateShiftHours(
      new Date(shift.clock_in),
      new Date(),
      shift.meal_breaks ?? [],
    );
    return totalHours;
  }
  if (shift.clock_out) {
    const { totalHours } = calculateShiftHours(
      new Date(shift.clock_in),
      new Date(shift.clock_out),
      shift.meal_breaks ?? [],
    );
    return totalHours;
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
    clientId: string | null;
    lat: number;
    lng: number;
    gpsVerified: boolean;
    withinGeofence: boolean | null;
    note?: string | null;
  },
): Promise<{ shift: ShiftRow | null; error: Error | null }> {
  const payPeriodId = await getOpenPayPeriodId(supabase, params.companyId);
  const now = new Date().toISOString();
  const textNote = params.note?.trim() || null;

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      company_id: params.companyId,
      worker_id: params.workerId,
      client_id: params.clientId,
      clock_in: now,
      clock_in_lat: params.lat,
      clock_in_lng: params.lng,
      status: "active",
      pay_period_id: payPeriodId,
      meal_breaks: [],
      gps_verified: params.gpsVerified,
      within_geofence: params.withinGeofence,
      notes: textNote,
      note: textNote,
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
  const clockInD = new Date(row.clock_in);
  const clockOutD = new Date(clockOutIso);
  const meals = (row.meal_breaks as MealBreak[] | null) ?? [];
  const { totalHours } = calculateShiftHours(clockInD, clockOutD, meals);

  const { data: company } = await supabase
    .from("companies")
    .select("ot_weekly_threshold")
    .eq("id", row.company_id)
    .maybeSingle();
  const otThreshold = Number(company?.ot_weekly_threshold) || 40;

  const { data: worker } = await supabase
    .from("workers")
    .select("pay_type, pay_rate, ot_pay_rate, flat_weekly_rate")
    .eq("id", row.worker_id)
    .single();

  const workerPay: WorkerPayProfile = {
    pay_type: (worker?.pay_type as WorkerPayProfile["pay_type"]) ?? "hourly",
    pay_rate: worker?.pay_rate != null ? Number(worker.pay_rate) : null,
    ot_pay_rate: worker?.ot_pay_rate != null ? Number(worker.ot_pay_rate) : null,
    flat_weekly_rate: worker?.flat_weekly_rate != null ? Number(worker.flat_weekly_rate) : null,
  };

  let rates: WorkerClientRates = { billing_rate: 0, ot_billing_rate: 0 };
  if (row.client_id) {
    const { data: wc } = await supabase
      .from("worker_clients")
      .select("billing_rate, ot_billing_rate")
      .eq("worker_id", row.worker_id)
      .eq("client_id", row.client_id)
      .maybeSingle();
    if (wc) {
      rates = {
        billing_rate: Number(wc.billing_rate) || 0,
        ot_billing_rate: Number(wc.ot_billing_rate) || 0,
      };
    }
  }

  const weekStart = startOfWeekMondayLocal(clockInD);
  const weekEnd = endOfWeekSundayLocal(weekStart);

  const { data: priorShifts } = await supabase
    .from("shifts")
    .select("id, total_hours, clock_in")
    .eq("worker_id", row.worker_id)
    .in("status", ["completed", "approved"])
    .lt("clock_in", row.clock_in);

  const ws = weekStart.getTime();
  const we = weekEnd.getTime();
  let hoursBefore = 0;
  for (const s of priorShifts ?? []) {
    if (s.id === row.id) continue;
    const cit = new Date(s.clock_in as string).getTime();
    if (cit >= ws && cit <= we) {
      hoursBefore += Number(s.total_hours) || 0;
    }
  }

  const fin = prorateShiftFinancials(totalHours, otThreshold, hoursBefore, workerPay, rates);

  const { data, error } = await supabase
    .from("shifts")
    .update({
      clock_out: clockOutIso,
      clock_out_lat: params.lat,
      clock_out_lng: params.lng,
      total_hours: fin.total_hours,
      regular_hours: fin.regular_hours,
      ot_hours: fin.ot_hours,
      gross_pay: fin.gross_pay,
      billable_amount: fin.billable_amount,
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

export async function updateShiftMealBreaks(
  supabase: SupabaseClient,
  shiftId: string,
  mealBreaks: MealBreak[],
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("shifts").update({ meal_breaks: mealBreaks }).eq("id", shiftId);
  return { error: error ? new Error(error.message) : null };
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
  options?: {
    otWeeklyThreshold?: number;
    workerPay?: WorkerPayProfile | null;
    billingRates?: WorkerClientRates | null;
  },
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
    .select("clock_in, clock_out, status, total_hours, meal_breaks")
    .eq("worker_id", workerId)
    .gte("clock_in", start)
    .lte("clock_in", end);

  if (error) {
    return {
      summary: { totalHours: 0, regularHours: 0, overtimeHours: 0, estimatedGross: 0, hourlyRate },
      error: new Error(error.message),
    };
  }

  const shiftList = (shifts ?? []).map((s) => ({ totalHours: shiftHoursLive(s as ShiftRow) }));

  const otTh = options?.otWeeklyThreshold ?? 40;
  const wp: WorkerPayProfile =
    options?.workerPay ??
    ({
      pay_type: "hourly",
      pay_rate: hourlyRate,
      ot_pay_rate: null,
      flat_weekly_rate: null,
    } as WorkerPayProfile);
  const br = options?.billingRates ?? { billing_rate: hourlyRate, ot_billing_rate: hourlyRate * 1.5 };

  const t = calculateWeeklyTotals({
    shifts: shiftList,
    worker: wp,
    workerClient: br,
    otWeeklyThreshold: otTh,
  });

  return {
    summary: {
      totalHours: t.totalHours,
      regularHours: t.regularHours,
      overtimeHours: t.otHours,
      estimatedGross: t.grossPay,
      hourlyRate,
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

export function activeMealBreak(meals: MealBreak[] | null | undefined): MealBreak | null {
  if (!meals?.length) return null;
  const last = meals[meals.length - 1];
  if (last && !last.end) return last;
  return null;
}
