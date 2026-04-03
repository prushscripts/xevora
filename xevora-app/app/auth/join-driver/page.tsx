"use client";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type RpcResult = { ok?: boolean; error?: string };

function mapRpcError(code: string | undefined) {
  switch (code) {
    case "invalid_code":
      return "That access code doesn’t match any active company. Check with your dispatcher.";
    case "already_registered":
      return "This account is already linked. Sign in from the main login page.";
    case "use_admin_portal":
      return "This account is a fleet owner. Use the standard sign-in for the admin dashboard.";
    case "not_authenticated":
      return "Please sign in again, then retry.";
    case "duplicate":
      return "Could not complete registration. Contact support if this persists.";
    default:
      return "Something went wrong. Try again.";
  }
}

export default function JoinDriverPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [needEmailVerify, setNeedEmailVerify] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      const fn = user.user_metadata?.first_name;
      const ln = user.user_metadata?.last_name;
      if (typeof fn === "string") setFirstName(fn);
      if (typeof ln === "string") setLastName(ln);
    });
  }, [supabase]);

  async function runRegisterRpc(fullName: string, accessCode: string): Promise<boolean> {
    const { data, error: rpcError } = await supabase.rpc("register_driver_with_code", {
      p_full_name: fullName,
      p_code: accessCode,
    });
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    const res = data as RpcResult;
    if (!res?.ok) {
      setError(mapRpcError(res?.error));
      return false;
    }
    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!agree) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) {
      setError("Enter your name.");
      return;
    }
    if (!code.trim()) {
      setError("Enter your company access code.");
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const ok = await runRegisterRpc(fullName, code);
      setLoading(false);
      if (ok) {
        router.replace("/driver");
        router.refresh();
      }
      return;
    }

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          registration_intent: "driver",
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message.includes("already registered") ? "An account with this email already exists." : signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.session) {
      const ok = await runRegisterRpc(fullName, code);
      setLoading(false);
      if (ok) {
        router.replace("/driver");
        router.refresh();
      }
      return;
    }

    setNeedEmailVerify(true);
    setLoading(false);
  }

  const inputClasses =
    "block min-h-[48px] w-full rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(37,99,235,0.7)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]";

  return (
    <div className="min-h-dvh bg-[#03060D] px-6 py-10 text-[var(--text)]">
      <Link
        href="/auth/login"
        className="mb-8 inline-flex text-sm text-[var(--muted)] transition hover:text-[var(--blue-bright)]"
      >
        ← Back to sign in
      </Link>

      <div className="mx-auto w-full max-w-[420px] rounded-[20px] border border-[rgba(37,99,235,0.15)] bg-[rgba(6,11,20,0.85)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.4)] backdrop-blur-[20px]">
        <h1 className="font-sans text-2xl font-extrabold tracking-tight">Join your fleet</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Drivers use the access code from their company (e.g. from dispatch). Fleet admins and owners sign up from the main login page — no code needed.
        </p>

        {needEmailVerify ? (
          <div className="mt-8 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 text-sm text-[var(--muted)]">
            <p className="font-medium text-emerald-200">Check your email</p>
            <p className="mt-2">
              After you verify your address, sign in once. We&apos;ll take you back here to enter your access code and finish linking your
              account.
            </p>
            <Link href="/auth/login" className="mt-4 inline-block text-[var(--blue-bright)] hover:underline">
              Go to sign in →
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--muted)]">First name</label>
                <input
                  className={inputClasses}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--muted)]">Last name</label>
                <input
                  className={inputClasses}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            {!hasSession ? (
              <>
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--muted)]">Email</label>
                  <input
                    type="email"
                    className={inputClasses}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--muted)]">Password</label>
                  <input
                    type="password"
                    className={inputClasses}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-[rgba(37,99,235,0.2)] bg-[#03060D] px-3 py-2 text-xs text-[var(--muted)]">
                Signed in as <span className="font-jb text-[var(--text)]">{email}</span>
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--muted)]">Company access code</label>
              <input
                className={`${inputClasses} font-jb tracking-wide`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoComplete="off"
                placeholder="e.g. plg2026!"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--blue)]" />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>

            {error ? (
              <p className="flex items-start gap-2 text-sm text-[var(--red)]">
                <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full min-h-[52px] items-center justify-center rounded-[10px] bg-[#2563EB] text-base font-medium text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {loading ? "Working…" : hasSession ? "Link my account" : "Create driver account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
