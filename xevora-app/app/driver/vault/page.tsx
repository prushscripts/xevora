"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import VaultSlider from "@/components/driver/VaultSlider";
import { useDriverProfile } from "@/components/driver/DriverProvider";
import { createClient } from "@/lib/supabase";

export default function DriverVaultPage() {
  const { profile, loading, error, refresh } = useDriverProfile();
  const [pct, setPct] = useState(20);
  const [saving, setSaving] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [periodGross, setPeriodGross] = useState(0);

  useEffect(() => {
    if (profile?.vault_percentage != null) setPct(profile.vault_percentage);
  }, [profile?.vault_percentage]);

  const loadGross = useCallback(async () => {
    if (!profile?.id) return;
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: pp } = await supabase
      .from("pay_periods")
      .select("id, start_date, end_date")
      .eq("company_id", profile.company_id)
      .lte("start_date", today)
      .gte("end_date", today)
      .maybeSingle();
    if (!pp) return;
    const start = `${pp.start_date}T00:00:00.000Z`;
    const end = `${pp.end_date}T23:59:59.999Z`;
    const { data: shifts } = await supabase
      .from("shifts")
      .select("gross_pay, total_hours")
      .eq("worker_id", profile.id)
      .gte("clock_in", start)
      .lte("clock_in", end);
    let g = 0;
    for (const s of shifts ?? []) {
      g += Number(s.gross_pay) || 0;
    }
    if (profile.pay_type === "flat_weekly" && g === 0) {
      g = Number(profile.flat_weekly_rate) || 0;
    }
    setPeriodGross(g);
  }, [profile]);

  useEffect(() => {
    void loadGross();
  }, [loadGross]);

  const estWeek = useMemo(() => Math.round(periodGross * (pct / 100) * 100) / 100, [periodGross, pct]);
  const estQuarter = useMemo(() => Math.round(estWeek * 13 * 100) / 100, [estWeek]);

  async function activateVault() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("workers").update({ vault_enabled: true, vault_percentage: pct }).eq("id", profile.id);
    setSaving(false);
    void refresh();
  }

  async function fetchTip() {
    setTipLoading(true);
    try {
      const res = await fetch("/api/vault-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gross: periodGross,
          ytd: periodGross * 4,
          percentage: pct,
          amount: estWeek,
          state: "",
        }),
      });
      const j = (await res.json()) as { tip?: string };
      setTip(j.tip ?? null);
    } finally {
      setTipLoading(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[#060B14]" />;
  }

  if (error || !profile) {
    return <div className="text-sm text-red-300">{error ?? "No profile"}</div>;
  }

  const companyVaultOff = !profile.company.vault_enabled;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="space-y-8 pb-6"
    >
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="5" y="9" width="14" height="11" rx="2" stroke="#F59E0B" strokeWidth="1.5" />
            <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-extrabold text-[#F1F5FF]">Xevora Vault</h1>
          <p className="text-sm text-[#4E6D92]">Your 1099 tax savings, automated.</p>
        </div>
      </header>

      {companyVaultOff ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-100">
          Vault is disabled for your company. Ask an admin to enable it in Settings → Pay rules.
        </div>
      ) : null}

      {!profile.vault_enabled ? (
        <section className="rounded-2xl border border-[#F59E0B]/20 bg-[#0c0a08] p-6">
          <p className="text-sm text-[#4E6D92]">Recommended set-aside for independent contractors</p>
          <VaultSlider value={pct} onChange={setPct} />
          <div className="mt-6 grid grid-cols-2 gap-4 font-jb text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#4E6D92]">Est. this period</p>
              <p className="mt-1 text-lg text-[#F59E0B]">${estWeek.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#4E6D92]">Est. quarterly</p>
              <p className="mt-1 text-lg text-[#F59E0B]">${estQuarter.toFixed(2)}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving || companyVaultOff}
            onClick={() => void activateVault()}
            className="mt-6 w-full rounded-xl bg-[#F59E0B] py-3 text-sm font-bold text-[#03060D] transition hover:bg-[#fbbf24] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Activate Vault"}
          </button>
          <p className="mt-4 text-[11px] leading-relaxed text-[#4E6D92]">
            Xevora Vault is a budgeting tool. It does not hold regulated funds or file taxes. Consult a tax professional.
          </p>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="rounded-2xl border border-[#F59E0B]/25 bg-gradient-to-br from-[#0c0a08] to-[#060B14] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4E6D92]">Set aside this period</p>
            <p className="font-jb mt-2 text-4xl text-[#F59E0B]">${estWeek.toFixed(2)}</p>
            <p className="mt-2 text-xs text-[#4E6D92]">Based on estimated gross ${periodGross.toFixed(2)} × {pct}%</p>
          </div>
          <VaultSlider value={pct} onChange={setPct} />
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const supabase = createClient();
              await supabase.from("workers").update({ vault_percentage: pct }).eq("id", profile.id);
              setSaving(false);
              void refresh();
            }}
            className="w-full rounded-xl border border-[#F59E0B]/40 py-3 text-sm font-semibold text-[#F59E0B]"
          >
            {saving ? "Saving…" : "Update percentage"}
          </button>
          <div className="rounded-xl border border-[#0f1729] bg-[#060B14] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">AI tip</span>
              {tipLoading ? <span className="text-xs text-[#4E6D92]">Loading…</span> : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#F1F5FF]">{tip ?? "Tap refresh after your pay updates."}</p>
            <button
              type="button"
              onClick={() => void fetchTip()}
              className="mt-3 text-xs text-[#F59E0B] hover:underline"
            >
              Refresh tip
            </button>
          </div>
        </section>
      )}

      <p className="text-center text-xs text-[#4E6D92]">
        <Link href="/driver/profile" className="text-[#3B82F6] hover:underline">
          Account settings
        </Link>
      </p>
    </motion.div>
  );
}
