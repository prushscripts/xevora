"use client";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [signupType, setSignupType] = useState<"owner" | "driver">("owner");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needEmailVerify, setNeedEmailVerify] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!agree) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (signupType === "driver" && !inviteCode.trim()) {
      setError("Company invite code is required for driver signup.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          registration_intent: signupType === "driver" ? "driver" : "owner",
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message.includes("already registered") ? "An account with this email already exists." : signUpError.message);
      setLoading(false);
      return;
    }

    if (signupType === "driver" && data.user && data.session) {
      const { data: rpcResult, error: rpcError } = await supabase.rpc("join_company_with_invite_code", {
        p_code: inviteCode.trim(),
        p_user_id: data.user.id,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
      });
      const ok = !!rpcResult && typeof rpcResult === "object" && "success" in rpcResult && rpcResult.success === true;
      if (rpcError || !ok) {
        setError("Invalid invite code. Please check with your manager and try again.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      router.replace("/driver");
      router.refresh();
      setLoading(false);
      return;
    }

    if (signupType === "driver") {
      if (data.session) {
        router.replace("/auth/join-driver");
        router.refresh();
      } else {
        setNeedEmailVerify(true);
      }
      setLoading(false);
      return;
    }

    setNeedEmailVerify(true);
    setLoading(false);
  }

  return (
    <div className="min-h-dvh bg-[#03060D] px-6 py-10 text-[var(--text)]">
      <Link href="/auth/login" className="mb-8 inline-flex text-sm text-[var(--muted)] transition hover:text-[var(--blue-bright)]">
        ← Back to sign in
      </Link>
      <div className="mx-auto w-full max-w-[460px] rounded-[20px] border border-[rgba(37,99,235,0.15)] bg-[rgba(6,11,20,0.85)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.4)] backdrop-blur-[20px]">
        <h1 className="font-sans text-2xl font-extrabold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Choose your role and complete signup.</p>

        {needEmailVerify ? (
          <div className="mt-8 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 text-sm text-[var(--muted)]">
            <p className="font-medium text-emerald-200">Check your email</p>
            <p className="mt-2">
              Verify your email first, then sign in. Drivers can finish linking from the join page if needed.
            </p>
            <Link href="/auth/login" className="mt-4 inline-block text-[var(--blue-bright)] hover:underline">
              Go to sign in →
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              <button
                type="button"
                onClick={() => setSignupType("owner")}
                style={{
                  padding: "14px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${signupType === "owner" ? "#2563EB" : "rgba(255,255,255,0.08)"}`,
                  background: signupType === "owner" ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)",
                  color: "#F1F5FF",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>🏢</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>I run a business</div>
                <div style={{ fontSize: 11, color: "#4E6D92", marginTop: 3 }}>Owner / Manager</div>
              </button>
              <button
                type="button"
                onClick={() => setSignupType("driver")}
                style={{
                  padding: "14px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${signupType === "driver" ? "#2563EB" : "rgba(255,255,255,0.08)"}`,
                  background: signupType === "driver" ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)",
                  color: "#F1F5FF",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>🚛</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>I&apos;m joining a team</div>
                <div style={{ fontSize: 11, color: "#4E6D92", marginTop: 3 }}>Driver / Field worker</div>
              </button>
            </div>

            {signupType === "driver" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "#4E6D92", marginBottom: 6, display: "block" }}>Company Invite Code</label>
                <input
                  type="text"
                  placeholder="Enter your 6-character code (e.g. PLG-2026)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#F1F5FF",
                    fontSize: 14,
                    fontFamily: "monospace",
                    letterSpacing: "0.15em",
                  }}
                />
                <p style={{ fontSize: 11, color: "#4E6D92", marginTop: 6 }}>
                  Ask your manager for this code. Find it in Xevora Settings → Company.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className="block min-h-[48px] w-full rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(37,99,235,0.7)]"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="First name"
                autoComplete="given-name"
              />
              <input
                className="block min-h-[48px] w-full rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(37,99,235,0.7)]"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Last name"
                autoComplete="family-name"
              />
            </div>
            <input
              type="email"
              className="block min-h-[48px] w-full rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(37,99,235,0.7)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Work email"
              autoComplete="email"
            />
            <input
              type="password"
              className="block min-h-[48px] w-full rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(37,99,235,0.7)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Password"
              autoComplete="new-password"
            />

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
              {loading ? "Working…" : signupType === "driver" ? "Create driver account" : "Create owner account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
