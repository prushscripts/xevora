"use client";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStaffCompanyId } from "@/lib/staffCompany";
import { createClient } from "@/lib/supabase";

type RpcOk = { ok?: boolean; error?: string; configured?: boolean; cleared?: boolean };

export default function SettingsCompanyPage() {
  const supabase = useMemo(() => createClient(), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [codeConfigured, setCodeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { companyId: cid } = await getStaffCompanyId(supabase);
    setCompanyId(cid);
    if (cid) {
      const { data: row } = await supabase
        .from("companies")
        .select("name, driver_invite_code")
        .eq("id", cid)
        .maybeSingle();
      setCompanyName((row?.name as string) ?? null);
      setInviteCode((row?.driver_invite_code as string | null) ?? "");
      const { data: status, error: rpcErr } = await supabase.rpc("get_driver_signup_status", {
        p_company_id: cid,
      });
      if (rpcErr) {
        setError(rpcErr.message);
      } else {
        const s = status as RpcOk;
        if (s?.ok) {
          setCodeConfigured(!!s.configured);
        } else {
          setError("You don’t have permission to view driver signup settings.");
        }
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onGenerateCode() {
    setError(null);
    setSuccess(null);

    if (!companyId) return;
    setSaving(true);
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error: updateErr } = await supabase
      .from("companies")
      .update({ driver_invite_code: generatedCode })
      .eq("id", companyId);
    if (updateErr) {
      setSaving(false);
      setError(updateErr.message);
      return;
    }

    const { data, error: rpcErr } = await supabase.rpc("set_driver_signup_code", {
      p_company_id: companyId,
      p_plaincode: generatedCode,
    });
    if (rpcErr) {
      setSaving(false);
      setError(rpcErr.message);
      return;
    }
    const r = data as RpcOk;
    if (!r?.ok) {
      if (r?.error === "code_too_short") {
        setError("Use at least 6 characters.");
      } else if (r?.error === "forbidden") {
        setError("You can’t change this setting.");
      } else {
        setError("Could not save code.");
      }
      setSaving(false);
      return;
    }
    setInviteCode(generatedCode);
    setCodeConfigured(true);
    setSuccess("New driver invite code generated and activated.");
    setSaving(false);
  }

  async function onCopyCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setSuccess("Code copied to clipboard.");
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-[#03060D]" />;
  }

  if (!companyId) {
    return <p className="text-sm text-[#4E6D92]">No company workspace found for this account.</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#F1F5FF]">Company</h2>
      {companyName ? <p className="mt-1 text-sm text-[#4E6D92]">{companyName}</p> : null}

      <section className="mt-8 max-w-xl rounded-xl border border-[#0f1729] bg-[#03060D] p-6">
        <h3 className="text-lg font-bold text-[#F1F5FF]">Driver access code</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#4E6D92]">
          Share this code with your drivers. They enter it when signing up to join your company automatically.
        </p>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${codeConfigured ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-[#4E6D92]"}`}
          />
          <span className="text-[#4E6D92]">
            {codeConfigured ? "A code is active" : "No code set — drivers cannot self-register yet"}
          </span>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "20px 24px",
            marginTop: 24,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Driver Invite Code</h3>
          <p style={{ fontSize: 12, color: "#4E6D92", marginBottom: 16 }}>
            Share this code with your drivers. They enter it when creating their account to join your company
            automatically.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#3B82F6",
                background: "rgba(37,99,235,0.08)",
                border: "1px solid rgba(37,99,235,0.2)",
                borderRadius: 10,
                padding: "12px 20px",
              }}
            >
              {inviteCode || "------"}
            </div>
            <button
              type="button"
              onClick={() => void onCopyCode()}
              disabled={!inviteCode}
              className="rounded-xl border border-[#1f3f7d] bg-[#0B1328] px-4 py-2 text-sm text-[#C8D8F0] transition hover:bg-[#111c35] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#4E6D92", marginTop: 10 }}>
            Regenerate anytime — existing drivers keep access until you change it.
          </p>
        </div>

        <div className="mt-6 space-y-4">

          {error ? (
            <p className="flex items-start gap-2 text-sm text-red-300">
              <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
              {error}
            </p>
          ) : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void onGenerateCode()}
              disabled={saving}
              className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] transition hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {saving ? "Generating…" : "Generate new code"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
