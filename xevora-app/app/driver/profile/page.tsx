"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDriverProfile } from "@/components/driver/DriverProvider";
import { createClient } from "@/lib/supabase";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DriverProfilePage() {
  const router = useRouter();
  const { profile, loading, error } = useDriverProfile();

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const onResetPassword = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/login`,
    });
    alert("Check your email for a password reset link.");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-[#060B14]" />
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-[#060B14]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {error ?? "Unable to load profile."}
      </div>
    );
  }

  const name = profile.full_name?.trim() || "Driver";
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 pb-4"
    >
      <h1 className="font-sans text-xl font-extrabold text-[#F1F5FF]">Profile</h1>

      <section className="rounded-2xl border border-[#0f1729] bg-[#060B14] p-6 text-center shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] text-2xl font-extrabold text-white shadow-[0_0_32px_rgba(37,99,235,0.35)]">
          {initials(name)}
        </div>
        <h2 className="font-sans mt-5 text-2xl font-extrabold text-[#F1F5FF]">{name}</h2>
        <span className="mt-3 inline-block rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#93C5FD]">
          Driver
        </span>
        <div className="mt-6 space-y-2 border-t border-[#0f1729] pt-6 text-left text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[#4E6D92]">Company</span>
            <span className="font-medium text-[#F1F5FF]">{profile.company_name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#4E6D92]">Truck</span>
            <span className="font-jb text-[#F1F5FF]">{profile.truck_label ?? "Unassigned"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#4E6D92]">Member since</span>
            <span className="font-jb text-[#F1F5FF]">{memberSince}</span>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4E6D92]">Settings</h3>
        <button
          type="button"
          onClick={() => void onResetPassword()}
          className="flex w-full items-center justify-between rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-4 text-left text-sm font-medium text-[#F1F5FF] transition hover:border-[#2563EB]/35"
        >
          Change password
          <span className="text-[#4E6D92]">→</span>
        </button>
        <a
          href="mailto:james@xevora.io"
          className="flex w-full items-center justify-between rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-4 text-sm font-medium text-[#F1F5FF] transition hover:border-[#2563EB]/35"
        >
          Contact support
          <span className="text-[#4E6D92]">→</span>
        </a>
      </section>

      <button
        type="button"
        onClick={() => void onSignOut()}
        className="w-full rounded-xl border border-[#0f1729] bg-[#060B14] py-4 text-sm font-semibold text-[#F1F5FF] transition hover:border-red-500/40 hover:text-red-400"
      >
        Sign out
      </button>
    </motion.div>
  );
}
