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
  const [codeConfigured, setCodeConfigured] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
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
      const { data: row } = await supabase.from("companies").select("name").eq("id", cid).maybeSingle();
      setCompanyName((row?.name as string) ?? null);
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

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!companyId) return;

    if (newCode.trim() === "" && confirmCode.trim() === "") {
      if (!codeConfigured) {
        setError("Enter a new access code, or nothing to change.");
        return;
      }
    } else if (newCode !== confirmCode) {
      setError("Codes do not match.");
      return;
    }

    setSaving(true);

    if (newCode.trim() === "" && confirmCode.trim() === "" && codeConfigured) {
      const { data, error: rpcErr } = await supabase.rpc("set_driver_signup_code", {
        p_company_id: companyId,
        p_plaincode: "",
      });
      setSaving(false);
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      const r = data as RpcOk;
      if (!r?.ok) {
        setError(r?.error === "forbidden" ? "You can’t change this setting." : "Could not clear code.");
        return;
      }
      setCodeConfigured(false);
      setSuccess("Driver access code removed.");
      return;
    }

    const { data, error: rpcErr } = await supabase.rpc("set_driver_signup_code", {
      p_company_id: companyId,
      p_plaincode: newCode.trim(),
    });
    setSaving(false);
    if (rpcErr) {
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
      return;
    }
    setCodeConfigured(true);
    setNewCode("");
    setConfirmCode("");
    setSuccess("Driver access code saved. Share it only with your drivers.");
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
          Drivers use this code on the <span className="font-jb text-[#F1F5FF]">Join your fleet</span> page to create an
          account linked to your company. The code is stored securely (hashed); you can rotate it anytime.
        </p>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${codeConfigured ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-[#4E6D92]"}`}
          />
          <span className="text-[#4E6D92]">
            {codeConfigured ? "A code is active" : "No code set — drivers cannot self-register yet"}
          </span>
        </div>

        <form onSubmit={(e) => void onSave(e)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#4E6D92]">New code</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="block w-full rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-3 font-jb text-sm text-[#F1F5FF] outline-none focus:border-[#2563EB]"
              placeholder="e.g. plg2026!"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#4E6D92]">Confirm code</label>
            <input
              type="text"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              className="block w-full rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-3 font-jb text-sm text-[#F1F5FF] outline-none focus:border-[#2563EB]"
              autoComplete="new-password"
            />
          </div>

          {error ? (
            <p className="flex items-start gap-2 text-sm text-red-300">
              <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
              {error}
            </p>
          ) : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] transition hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {saving ? "Saving…" : codeConfigured ? "Update code" : "Save code"}
            </button>
          </div>
        </form>

        {codeConfigured ? (
          <p className="mt-4 text-xs text-[#4E6D92]">
            To disable driver self-registration, clear both fields above and click{" "}
            <span className="text-[#F1F5FF]">Update code</span>.
          </p>
        ) : null}
      </section>
    </div>
  );
}
