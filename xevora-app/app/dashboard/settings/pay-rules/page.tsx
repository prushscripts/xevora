"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface CompanySettings {
  id: string;
  ot_threshold: number;
  ot_multiplier: number;
  enable_1099: boolean;
  enable_vault: boolean;
}

export default function PayRulesPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otThreshold, setOtThreshold] = useState(40);
  const [otMultiplier, setOtMultiplier] = useState(1.5);
  const [enable1099, setEnable1099] = useState(false);
  const [enableVault, setEnableVault] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return;

    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();

    if (data) {
      setSettings(data);
      setOtThreshold(data.ot_threshold || 40);
      setOtMultiplier(data.ot_multiplier || 1.5);
      setEnable1099(data.enable_1099 || false);
      setEnableVault(data.enable_vault || false);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);

    await supabase
      .from("companies")
      .update({
        ot_threshold: otThreshold,
        ot_multiplier: otMultiplier,
        enable_1099: enable1099,
        enable_vault: enableVault,
      })
      .eq("id", settings.id);

    setSaving(false);
  }

  const exampleRate = 40;
  const exampleOtRate = exampleRate * otMultiplier;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-extrabold text-[#F1F5FF]">Pay Rules</h1>
        <p className="mt-1 text-sm text-[#4E6D92]">Configure overtime and worker type settings</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-[#060B14]" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pay Period Card */}
          <div className="rounded-2xl border border-[rgba(37,99,235,0.12)] bg-[#060B14] p-6">
            <h2 className="mb-4 font-sans text-lg font-bold text-[#F1F5FF]">Pay Period</h2>
            <div className="mb-3 rounded-lg border border-[rgba(37,99,235,0.15)] bg-[rgba(37,99,235,0.05)] p-4">
              <p className="text-sm font-medium text-[#F1F5FF]">Weekly (Monday – Sunday)</p>
            </div>
            <p className="text-xs text-[#4E6D92]">
              ℹ️ Pay period cannot be changed after the first pay period is created.
            </p>
          </div>

          {/* Overtime Rules Card */}
          <div className="rounded-2xl border border-[rgba(37,99,235,0.12)] bg-[#060B14] p-6">
            <h2 className="mb-4 font-sans text-lg font-bold text-[#F1F5FF]">Overtime Rules</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#F1F5FF]">
                  Weekly OT Threshold
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={otThreshold}
                    onChange={(e) => setOtThreshold(parseFloat(e.target.value) || 0)}
                    className="w-32 rounded-lg border border-[rgba(37,99,235,0.2)] bg-[#03060D] px-4 py-2.5 text-sm text-[#F1F5FF] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    min="0"
                    step="0.5"
                  />
                  <span className="text-sm text-[#4E6D92]">hours</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F1F5FF]">
                  OT Rate Multiplier
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={otMultiplier}
                    onChange={(e) => setOtMultiplier(parseFloat(e.target.value) || 0)}
                    className="w-32 rounded-lg border border-[rgba(37,99,235,0.2)] bg-[#03060D] px-4 py-2.5 text-sm text-[#F1F5FF] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    min="1"
                    step="0.1"
                  />
                  <span className="text-sm text-[#4E6D92]">×</span>
                </div>
              </div>

              <div className="rounded-lg border border-[rgba(37,99,235,0.15)] bg-[rgba(37,99,235,0.04)] p-4">
                <p className="text-sm text-[#8BA4C0]">
                  Hours over <span className="font-jb font-medium text-[#3B82F6]">{otThreshold}</span> billed at{" "}
                  <span className="font-jb font-medium text-[#3B82F6]">{otMultiplier}×</span> — e.g.{" "}
                  <span className="font-jb">${exampleRate}/hr</span> becomes{" "}
                  <span className="font-jb font-medium text-[#34D399]">${exampleOtRate.toFixed(2)}/hr</span>
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Worker Types Card */}
          <div className="rounded-2xl border border-[rgba(37,99,235,0.12)] bg-[#060B14] p-6">
            <h2 className="mb-4 font-sans text-lg font-bold text-[#F1F5FF]">Worker Types</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-[rgba(37,99,235,0.1)] bg-[rgba(3,6,13,0.5)] p-4">
                <div>
                  <p className="text-sm font-medium text-[#F1F5FF]">Enable 1099 contractor support</p>
                  <p className="mt-1 text-xs text-[#4E6D92]">Allow adding independent contractors to your workforce</p>
                </div>
                <button
                  onClick={() => setEnable1099(!enable1099)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    enable1099 ? "bg-[#2563EB]" : "bg-[#1E3050]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      enable1099 ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[rgba(37,99,235,0.1)] bg-[rgba(3,6,13,0.5)] p-4">
                <div>
                  <p className="text-sm font-medium text-[#F1F5FF]">Enable Xevora Vault for 1099 workers</p>
                  <p className="mt-1 text-xs text-[#4E6D92]">Vault allows workers to set aside a % of gross pay for tax savings</p>
                </div>
                <button
                  onClick={() => setEnableVault(!enableVault)}
                  disabled={!enable1099}
                  className={`relative h-6 w-11 rounded-full transition ${
                    enableVault && enable1099 ? "bg-[#2563EB]" : "bg-[#1E3050]"
                  } ${!enable1099 ? "opacity-50" : ""}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      enableVault && enable1099 ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
