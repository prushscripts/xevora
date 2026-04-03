export type MealBreak = { start: string; end: string | null };

export type WorkerPayProfile = {
  pay_type: "hourly" | "flat_weekly";
  pay_rate: number | null;
  ot_pay_rate: number | null;
  flat_weekly_rate: number | null;
};

export type WorkerClientRates = {
  billing_rate: number;
  ot_billing_rate: number;
};

/**
 * Subtract completed meal breaks from elapsed time between clock-in and clock-out.
 */
export function calculateShiftHours(clockIn: Date, clockOut: Date, mealBreaks: MealBreak[] | null | undefined) {
  let ms = clockOut.getTime() - clockIn.getTime();
  const breaks = mealBreaks ?? [];
  for (const m of breaks) {
    if (!m?.end) continue;
    const s = new Date(m.start).getTime();
    const e = new Date(m.end).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
      const overlapStart = Math.max(s, clockIn.getTime());
      const overlapEnd = Math.min(e, clockOut.getTime());
      if (overlapEnd > overlapStart) {
        ms -= overlapEnd - overlapStart;
      }
    }
  }
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  return { totalMinutes, totalHours: totalMinutes / 60 };
}

export type WeeklyTotalsInput = {
  shifts: Array<{ totalHours: number }>;
  worker: WorkerPayProfile;
  workerClient: WorkerClientRates;
  otWeeklyThreshold: number;
};

/**
 * Sum shift hours for the week, split regular/OT, compute worker gross and client billing.
 * For flat_weekly workers, gross pay is the flat rate (hours do not change worker pay).
 */
export function calculateWeeklyTotals(input: WeeklyTotalsInput) {
  const totalHours = input.shifts.reduce((a, s) => a + (Number(s.totalHours) || 0), 0);
  const th = Math.max(0, totalHours);
  const regularHours = Math.min(th, input.otWeeklyThreshold);
  const otHours = Math.max(0, th - input.otWeeklyThreshold);

  let grossPay = 0;
  if (input.worker.pay_type === "flat_weekly") {
    grossPay = Number(input.worker.flat_weekly_rate) || 0;
  } else {
    const pr = Number(input.worker.pay_rate) || 0;
    const otr = input.worker.ot_pay_rate != null ? Number(input.worker.ot_pay_rate) : pr * 1.5;
    grossPay = regularHours * pr + otHours * otr;
  }

  const br = Number(input.workerClient.billing_rate) || 0;
  const obr = Number(input.workerClient.ot_billing_rate) || br;
  const clientBilling = regularHours * br + otHours * obr;

  return {
    regularHours,
    otHours,
    totalHours: th,
    grossPay: Math.round(grossPay * 100) / 100,
    clientBilling: Math.round(clientBilling * 100) / 100,
  };
}

export function calculateMargin(clientBilling: number, finalApprovedPay: number) {
  const margin = Math.round((clientBilling - finalApprovedPay) * 100) / 100;
  const marginPercent =
    clientBilling > 0 ? Math.round((margin / clientBilling) * 10_000) / 100 : 0;
  return { margin, marginPercent };
}

/**
 * Split a single shift's total hours into regular + OT buckets using remaining threshold budget.
 */
export function allocateShiftHoursToRegularOt(
  shiftHours: number,
  regularBudgetRemaining: number,
): { regular: number; ot: number; nextBudgetRemaining: number } {
  const h = Math.max(0, shiftHours);
  const reg = Math.min(h, Math.max(0, regularBudgetRemaining));
  const ot = Math.max(0, h - reg);
  return { regular: reg, ot, nextBudgetRemaining: regularBudgetRemaining - reg };
}

/**
 * Hours already worked earlier in the same OT week (Mon–Sun) before this shift ends.
 */
export function prorateShiftFinancials(
  shiftTotalHours: number,
  otWeeklyThreshold: number,
  hoursBeforeThisShiftInWeek: number,
  worker: WorkerPayProfile,
  rates: WorkerClientRates,
) {
  const { regular, ot } = allocateShiftHoursToRegularOt(
    shiftTotalHours,
    Math.max(0, otWeeklyThreshold - hoursBeforeThisShiftInWeek),
  );
  let grossPay = 0;
  if (worker.pay_type === "hourly") {
    const pr = Number(worker.pay_rate) || 0;
    const otr = worker.ot_pay_rate != null ? Number(worker.ot_pay_rate) : pr * 1.5;
    grossPay = regular * pr + ot * otr;
  }
  const billable =
    regular * (Number(rates.billing_rate) || 0) + ot * (Number(rates.ot_billing_rate) || 0);
  return {
    regular_hours: Math.round(regular * 100) / 100,
    ot_hours: Math.round(ot * 100) / 100,
    total_hours: Math.round(shiftTotalHours * 100) / 100,
    gross_pay: Math.round(grossPay * 100) / 100,
    billable_amount: Math.round(billable * 100) / 100,
  };
}
