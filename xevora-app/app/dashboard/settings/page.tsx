"use client";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type RpcOk = { ok?: boolean; error?: string; configured?: boolean; cleared?: boolean };

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCompanyId(null);
      setLoading(false);
      return;
    }

    const { data: owned } = await supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle<{ id: string }>();

    let cid = owned?.id ?? null;
    if (!cid) {
      const { data: w } = await supabase
        .from("workers")
        .select("company_id, role")
        .eq("user_id", user.id)
        .maybeSingle<{ company_id: string; role: string }>();
      if (w && (w.role === "admin" || w.role === "manager")) {
        cid = w.company_id;
      }
    }

    setCompanyId(cid);

    if (cid) {
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
    return (
      <div className="p-6 lg:p-10">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[rgba(37,99,235,0.08)]" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-[rgba(37,99,235,0.05)]" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-6 lg:p-10">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">Settings</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">No company workspace found for this account.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="font-sans text-2xl font-extrabold text-[var(--text)]">Settings</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Company and driver self-registration</p>

      <section className="mt-10 max-w-xl rounded-2xl border border-[rgba(37,99,235,0.15)] bg-[rgba(6,11,20,0.6)] p-6">
        <h2 className="text-lg font-bold text-[var(--text)]">Driver access code</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Drivers use this code on the{" "}
          <span className="font-jb text-[var(--text)]">Join your fleet</span> page to create an account linked to your company. The code is
          stored securely (hashed); you can rotate it anytime.
        </p>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${codeConfigured ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-[var(--muted)]"}`}
          />
          <span className="text-[var(--muted)]">
            {codeConfigured ? "A code is active" : "No code set — drivers cannot self-register yet"}
          </span>
        </div>

        <form onSubmit={(e) => void onSave(e)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--muted)]">New code</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="block w-full rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-3 font-jb text-sm text-[var(--text)] outline-none focus:border-[rgba(37,99,235,0.7)]"
              placeholder="e.g. plg2026!"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--muted)]">Confirm code</label>
            <input
              type="text"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              className="block w-full rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-3 font-jb text-sm text-[var(--text)] outline-none focus:border-[rgba(37,99,235,0.7)]"
              autoComplete="new-password"
            />
          </div>

          {error ? (
            <p className="flex items-start gap-2 text-sm text-[var(--red)]">
              <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
              {error}
            </p>
          ) : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[10px] bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] transition hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {saving ? "Saving…" : codeConfigured ? "Update code" : "Save code"}
            </button>
          </div>
        </form>

        {codeConfigured ? (
          <p className="mt-4 text-xs text-[var(--muted)]">
            To disable driver self-registration, clear both fields above and click{" "}
            <span className="text-[var(--text)]">Update code</span>.
          </p>
        ) : null}
      </section>
    </div>
  );
}
