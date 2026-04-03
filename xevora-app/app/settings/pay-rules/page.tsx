"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStaffCompanyId } from "@/lib/staffCompany";
import { createClient } from "@/lib/supabase";

export default function SettingsPayRulesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [periodCount, setPeriodCount] = useState(0);
  const [payPeriod, setPayPeriod] = useState("weekly");
  const [payPeriodStart, setPayPeriodStart] = useState("monday");
  const [otThreshold, setOtThreshold] = useState(40);
  const [otMult, setOtMult] = useState(1.5);
  const [vaultEnabled, setVaultEnabled] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { companyId: cid } = await getStaffCompanyId(supabase);
    setCompanyId(cid);
    if (!cid) {
      setLoading(false);
      return;
    }
    const { data: c } = await supabase
      .from("companies")
      .select("pay_period, pay_period_start, ot_weekly_threshold, ot_rate_multiplier, vault_enabled")
      .eq("id", cid)
      .maybeSingle();
    if (c) {
      setPayPeriod((c.pay_period as string) ?? "weekly");
      setPayPeriodStart((c.pay_period_start as string) ?? "monday");
      setOtThreshold(Number(c.ot_weekly_threshold) || 40);
      setOtMult(Number(c.ot_rate_multiplier) || 1.5);
      setVaultEnabled(c.vault_enabled !== false);
    }
    const { count } = await supabase
      .from("pay_periods")
      .select("id", { count: "exact", head: true })
      .eq("company_id", cid);
    setPeriodCount(count ?? 0);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase
      .from("companies")
      .update({
        pay_period: payPeriod,
        pay_period_start: payPeriodStart,
        ot_weekly_threshold: otThreshold,
        ot_rate_multiplier: otMult,
        vault_enabled: vaultEnabled,
      })
      .eq("id", companyId);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Saved.");
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-[#03060D]" />;
  }

  if (!companyId) {
    return <p className="text-sm text-[#4E6D92]">No company workspace found.</p>;
  }

  const periodLocked = periodCount > 0;

  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#F1F5FF]">Pay rules</h2>
      <p className="mt-1 text-sm text-[#4E6D92]">Company defaults for overtime and Vault visibility.</p>

      <form onSubmit={(e) => void onSave(e)} className="mt-8 max-w-lg space-y-6">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#4E6D92]">Pay period</label>
          {periodLocked ? (
            <p className="mt-2 rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-3 text-sm text-[#F1F5FF]">
              Weekly (Mon–Sun) — locked after your first pay period was created.
            </p>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <select
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                className="rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-3 text-sm text-[#F1F5FF]"
              >
                <option value="weekly">Weekly</option>
              </select>
              <select
                value={payPeriodStart}
                onChange={(e) => setPayPeriodStart(e.target.value)}
                className="rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-3 text-sm text-[#F1F5FF]"
              >
                <option value="monday">Starts Monday</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#4E6D92]">
            OT weekly threshold (hours)
          </label>
          <input
            type="number"
            min={1}
            max={168}
            step={0.5}
            value={otThreshold}
            onChange={(e) => setOtThreshold(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-3 font-jb text-sm text-[#F1F5FF]"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#4E6D92]">OT rate multiplier</label>
          <input
            type="number"
            min={1}
            max={3}
            step={0.1}
            value={otMult}
            onChange={(e) => setOtMult(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-3 font-jb text-sm text-[#F1F5FF]"
          />
          <p className="mt-2 text-xs text-[#4E6D92]">
            Preview: after {otThreshold}h, client billing uses OT rates ({otMult}× on billed OT hours where configured).
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-[#F1F5FF]">Vault feature</p>
            <p className="mt-0.5 text-xs text-[#4E6D92]">Show tax set-aside tools to eligible workers.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={vaultEnabled}
            onClick={() => setVaultEnabled((v) => !v)}
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${
              vaultEnabled ? "bg-[#2563EB]" : "bg-[#1e293b]"
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white transition ${
                vaultEnabled ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {err ? <p className="text-sm text-red-300">{err}</p> : null}
        {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save pay rules"}
        </button>
      </form>
    </div>
  );
}
