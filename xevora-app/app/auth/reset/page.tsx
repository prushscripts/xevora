"use client";

import { ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

function XevoraLogo() {
  return (
    <svg width={52} height={52} viewBox="0 0 88 88" fill="none" aria-hidden="true">
      <polygon points="44,4 76,22 76,66 44,84 12,66 12,22" fill="#060B14" stroke="rgba(37,99,235,0.5)" strokeWidth="1.5" />
      <path d="M28 28L40 44L28 60H35.5L44 49.2L52.5 60H60L48 44L60 28H52.5L44 38.8L35.5 28H28Z" fill="#2563EB" />
      <rect x="41" y="41" width="6" height="6" transform="rotate(45 41 41)" fill="#60A5FA" />
    </svg>
  );
}

export default function ResetPage() {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${baseUrl}/auth/update-password`,
    });

    if (resetError) {
      setError("Unable to send reset link. Please try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 py-8">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <Link href="/auth/login" className="mb-6 inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--blue-bright)]">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to login
        </Link>

        <div className="mb-4 flex justify-center">
          <XevoraLogo />
        </div>

        <h1 className="text-center text-2xl font-extrabold">Reset your password</h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-[13px] font-light text-[var(--muted)]">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <div className="mt-6 h-px w-full bg-[var(--border)]" />

        {sent ? (
          <div className="mt-6 rounded-xl border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.08)] p-5">
            <CheckCircleIcon className="h-8 w-8 text-[var(--green)]" />
            <h2 className="mt-3 text-lg font-semibold">Reset link sent!</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Check your email for a password reset link. It expires in 1 hour.
            </p>
            <Link
              href="/auth/login"
              className="mt-4 inline-flex rounded-[10px] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--blue)] hover:text-[var(--blue-bright)]"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-[1px] text-[var(--muted)]">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-[10px] border border-[rgba(37,99,235,0.2)] bg-[#030508] px-4 py-3 text-[14px] text-[var(--text)] outline-none transition focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--blue)] px-4 py-[14px] text-[14px] font-medium tracking-[0.5px] text-white transition duration-250 ease-in-out hover:-translate-y-px hover:bg-[#1D4ED8] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>

            {error ? (
              <p className="flex items-center gap-1 text-[12px] text-[var(--red)]">
                <ExclamationCircleIcon className="h-4 w-4" />
                {error}
              </p>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
