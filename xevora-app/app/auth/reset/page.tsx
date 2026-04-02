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

  const inputClass =
    "w-full min-h-[52px] min-w-0 rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-4 text-base leading-normal text-[var(--text)] outline-none transition focus:border-[rgba(37,99,235,0.7)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] md:min-h-0 md:py-3";

  return (
    <main className="flex min-h-dvh w-full min-w-0 flex-col justify-center bg-[#03060D] px-6 py-10 md:min-h-screen md:bg-[var(--bg)] md:px-5 md:py-8">
      <section className="mx-auto w-full min-w-0 max-w-md rounded-none border-0 bg-transparent p-0 md:rounded-2xl md:border md:border-[var(--border)] md:bg-[var(--surface)] md:p-8">
        <Link
          href="/auth/login"
          className="mb-6 inline-flex min-h-[44px] items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--blue-bright)] md:min-h-0 md:text-xs"
        >
          <ArrowLeftIcon className="h-4 w-4 shrink-0" />
          Back to login
        </Link>

        <div className="mb-4 flex justify-center">
          <XevoraLogo />
        </div>

        <h1 className="text-center text-[28px] font-extrabold leading-snug md:text-2xl">Reset your password</h1>
        <p className="mx-auto mt-2 max-w-md text-center text-[14px] font-light leading-snug text-[var(--muted)] md:max-w-xs md:text-[13px]">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <div className="mt-6 h-px w-full min-w-0 bg-[var(--border)]" />

        {sent ? (
          <div className="mt-6 rounded-xl border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.08)] p-5">
            <CheckCircleIcon className="h-8 w-8 text-[var(--green)]" />
            <h2 className="mt-3 text-lg font-semibold">Reset link sent!</h2>
            <p className="mt-2 text-base leading-snug text-[var(--muted)] md:text-sm">
              Check your email for a password reset link. It expires in 1 hour.
            </p>
            <div className="mt-6 flex justify-center md:justify-start">
              <Link
                href="/auth/login"
                className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center rounded-[10px] border border-[var(--border)] px-4 text-base text-[var(--text)] transition hover:border-[var(--blue)] hover:text-[var(--blue-bright)] md:min-h-0 md:w-auto md:py-2 md:text-sm"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 w-full min-w-0 space-y-4">
            <div className="min-w-0">
              <label className="mb-2 block text-xs uppercase tracking-[1px] text-[var(--muted)] md:text-[11px]">Work Email</label>
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--blue)] px-4 text-base font-medium tracking-[0.5px] text-white transition duration-250 ease-in-out hover:-translate-y-px hover:bg-[#1D4ED8] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] disabled:cursor-not-allowed disabled:opacity-70 md:min-h-0 md:py-[14px] md:text-sm"
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
              <p className="flex min-w-0 items-start gap-1 break-words text-sm text-[var(--red)]">
                <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
