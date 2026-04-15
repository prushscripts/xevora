"use client";

import {
  ArrowRightIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ClockIcon,
  SparklesIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
});

interface DashboardMetrics {
  firstName: string;
  companyId: string | null;
  inviteCode: string;
  activeWorkers: number;
  hoursThisWeek: number;
  hoursLastWeek: number;
  activeClockedIn: Array<{
    workerId: string;
    name: string;
    hoursToday: number;
    status: "Clocked In" | "On Break";
  }>;
  checklist: {
    hasWorkers: boolean;
    gpsEnabled: boolean;
    hasPayrollRun: boolean;
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = (currentDay + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - mondayOffset + offsetWeeks * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function toDisplayName(firstNameRaw: unknown, emailRaw: string | undefined) {
  const firstName =
    typeof firstNameRaw === "string" && firstNameRaw.trim()
      ? firstNameRaw.trim()
      : "";
  const emailName = emailRaw?.split("@")[0]?.split(".")[0] || "there";
  const base = firstName || emailName;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[14px] bg-[rgba(37,99,235,0.05)] ${className}`} />;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("xevora_checklist_dismissed") === "true";
  });
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    firstName: "there",
    companyId: null,
    inviteCode: "------",
    activeWorkers: 0,
    hoursThisWeek: 0,
    hoursLastWeek: 0,
    activeClockedIn: [],
    checklist: {
      hasWorkers: false,
      gpsEnabled: false,
      hasPayrollRun: false,
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Unable to load your dashboard right now.");
        setLoading(false);
        return;
      }

      const firstName = toDisplayName(user.user_metadata?.first_name, user.email);

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle<{ id: string }>();

      if (companyError) {
        setError("Unable to load your company data.");
        setLoading(false);
        return;
      }

      if (!company) {
        setMetrics((previous) => ({ ...previous, firstName, companyId: null }));
        setLoading(false);
        return;
      }

      const companyId = company.id;
      const { data: companyDetails } = await supabase
        .from("companies")
        .select("driver_invite_code")
        .eq("id", companyId)
        .maybeSingle();
      const thisWeek = getWeekRange(0);
      const lastWeek = getWeekRange(-1);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [workersRes, timeThisWeekRes, timeLastWeekRes, activeEntriesRes, gpsRes, payrollRes] = await Promise.all([
        supabase.from("workers").select("id,status").eq("company_id", companyId),
        supabase
          .from("time_entries")
          .select("total_hours")
          .eq("company_id", companyId)
          .gte("created_at", thisWeek.start.toISOString())
          .lte("created_at", thisWeek.end.toISOString()),
        supabase
          .from("time_entries")
          .select("total_hours")
          .eq("company_id", companyId)
          .gte("created_at", lastWeek.start.toISOString())
          .lte("created_at", lastWeek.end.toISOString()),
        supabase
          .from("time_entries")
          .select("worker_id,total_hours,status")
          .eq("company_id", companyId)
          .in("status", ["clocked_in", "on_break"])
          .gte("created_at", todayStart.toISOString()),
        supabase
          .from("company_settings")
          .select("require_gps_clockin")
          .eq("company_id", companyId)
          .maybeSingle<{ require_gps_clockin: boolean }>(),
        supabase.from("payroll_runs").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);

      if (
        workersRes.error ||
        timeThisWeekRes.error ||
        timeLastWeekRes.error ||
        activeEntriesRes.error ||
        gpsRes.error ||
        payrollRes.error
      ) {
        setError("Unable to load all dashboard metrics.");
        setLoading(false);
        return;
      }

      const workers = (workersRes.data ?? []) as Array<{ id: string; status: string }>;
      const activeWorkers = workers.filter((worker) => worker.status?.toLowerCase() === "active").length;

      const thisWeekHours = (timeThisWeekRes.data ?? []).reduce((sum, entry) => sum + Number(entry.total_hours ?? 0), 0);
      const lastWeekHours = (timeLastWeekRes.data ?? []).reduce((sum, entry) => sum + Number(entry.total_hours ?? 0), 0);

      const activeEntries = (activeEntriesRes.data ?? []) as Array<{
        worker_id: string;
        total_hours: number | null;
        status: string;
      }>;

      const uniqueWorkerIds = Array.from(new Set(activeEntries.map((entry) => entry.worker_id).filter(Boolean)));
      let workerNames = new Map<string, string>();

      if (uniqueWorkerIds.length > 0) {
        const { data: workerRows } = await supabase
          .from("workers")
          .select("id,first_name,last_name")
          .in("id", uniqueWorkerIds);
        workerNames = new Map(
          ((workerRows ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>).map(
            (worker) => [worker.id, `${worker.first_name ?? ""} ${worker.last_name ?? ""}`.trim() || "Unnamed Worker"],
          ),
        );
      }

      const activeClockedIn = activeEntries.map((entry) => ({
        workerId: entry.worker_id,
        name: workerNames.get(entry.worker_id) ?? "Unnamed Worker",
        hoursToday: Number(entry.total_hours ?? 0),
        status: entry.status === "on_break" ? ("On Break" as const) : ("Clocked In" as const),
      }));

      setMetrics({
        firstName,
        companyId,
        inviteCode: (companyDetails?.driver_invite_code as string | null) ?? "------",
        activeWorkers,
        hoursThisWeek: thisWeekHours,
        hoursLastWeek: lastWeekHours,
        activeClockedIn,
        checklist: {
          hasWorkers: workers.length > 0,
          gpsEnabled: Boolean(gpsRes.data?.require_gps_clockin),
          hasPayrollRun: (payrollRes.count ?? 0) > 0,
        },
      });
      setLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  const checklistItems = [
    { label: "Create your account", done: true, href: "/dashboard" },
    { label: "Add your first worker", done: metrics.checklist.hasWorkers, href: "/dashboard/workers/new" },
    { label: "Set up GPS time tracking", done: metrics.checklist.gpsEnabled, href: "/settings/gps" },
    { label: "Run your first payroll", done: metrics.checklist.hasPayrollRun, href: "/settings/pay-rules" },
    { label: "Invite your team", done: false, href: "/dashboard/workers" },
  ];

  const completed = checklistItems.filter((item) => item.done).length;
  const progress = (completed / checklistItems.length) * 100;
  const hoursDelta = metrics.hoursLastWeek > 0 ? ((metrics.hoursThisWeek - metrics.hoursLastWeek) / metrics.hoursLastWeek) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-16 w-72" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="h-40 w-full" />
          ))}
        </div>
        <SkeletonBlock className="h-72 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <SkeletonBlock key={item} className="h-28 w-full" />
          ))}
        </div>
        <SkeletonBlock className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[14px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-6 text-sm text-[var(--red)]">
        {error}
      </div>
    );
  }

  if (!metrics.companyId) {
    return (
      <div className="rounded-[14px] border border-[var(--border)] bg-[rgba(6,11,20,0.95)] p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          <svg width="64" height="64" viewBox="0 0 88 88" fill="none" aria-hidden="true">
            <polygon points="44,4 76,22 76,66 44,84 12,66 12,22" fill="#060B14" stroke="rgba(37,99,235,0.5)" strokeWidth="1.5" />
            <path d="M28 28L40 44L28 60H35.5L44 49.2L52.5 60H60L48 44L60 28H52.5L44 38.8L35.5 28H28Z" fill="#2563EB" />
            <rect x="41" y="41" width="6" height="6" transform="rotate(45 41 41)" fill="#60A5FA" />
          </svg>
          <h2 className="mx-auto mt-4 max-w-[640px] text-center text-[clamp(24px,3vw,36px)] leading-[1.2] font-extrabold">
            Welcome to Xevora, {metrics.firstName}.
          </h2>
          <p className="mt-2 text-base font-light text-[var(--muted)]">Let&apos;s get your operation set up.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              step: "01 -",
              title: "Set up your company",
              sub: "Add your company details, industry, and payroll preferences.",
              meta: "Takes 2 minutes",
              icon: BuildingOffice2Icon,
              onClick: () => router.push("/dashboard/onboarding"),
            },
            {
              step: "02 -",
              title: "Add your workers",
              sub: "Add your W2 employees and 1099 contractors. We handle both.",
              meta: "2 minutes per worker",
              icon: UserGroupIcon,
            },
            {
              step: "03 -",
              title: "Start tracking time",
              sub: "Workers clock in from their phone with one tap. GPS verified.",
              meta: "Works immediately",
              icon: ClockIcon,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                onClick={card.onClick}
                className="cursor-pointer rounded-xl border border-[var(--border)] bg-[#070e1b] p-7 transition-[border-color] duration-200 ease-in-out hover:border-[rgba(37,99,235,0.25)]"
              >
                <Icon className="h-6 w-6 text-[var(--blue-bright)]" />
                <span className={`${mono.className} mt-4 block text-[10px] uppercase tracking-[2px] text-[var(--blue)]`}>
                  {card.step}
                </span>
                <h3
                  className="mt-1 text-[15px] font-medium leading-[1.3] tracking-[0.2px] text-[#F1F5FF]"
                  style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                >
                  {card.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)]">{card.sub}</p>
                <p className="mt-3 text-xs text-[var(--blue-bright)]">{card.meta}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/dashboard/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--blue)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
          >
            Get Started
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 h-px w-full bg-[var(--border)]" />
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium">Need help getting started?</h4>
            <p className="mt-1 text-sm text-[var(--muted)]">Our team is here to help operators get up and running fast.</p>
            <a href="mailto:james@xevora.io" className="mt-2 inline-flex text-sm text-[var(--blue-bright)] hover:underline">
              james@xevora.io
            </a>
          </div>
          <div>
            <h4 className="text-sm font-medium">Already using ADP or Gusto?</h4>
            <p className="mt-1 text-sm text-[var(--muted)]">We can help you migrate your workers and payroll history.</p>
            <a href="mailto:james@xevora.io" className="mt-2 inline-flex text-sm text-[var(--blue-bright)] hover:underline">
              Contact us to migrate →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 16,
            top: 72,
            zIndex: 50,
            background: "#0A1020",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            color: "#F1F5FF",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ padding: "20px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 12, color: "#4E6D92", margin: "0 0 2px", letterSpacing: "0.04em" }}>{getGreeting()}</p>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#F1F5FF" }}>{metrics.firstName} 👋</p>
        </div>
      </div>

      {metrics.activeClockedIn.length > 0 && (
        <div
          onClick={() => router.push("/dashboard/time")}
          style={{
            margin: "0 16px 14px",
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.18)",
            borderRadius: 12,
            padding: "11px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 6px #10B981",
                flexShrink: 0,
              }}
            />
            <div>
              <p style={{ fontSize: 12, color: "#10B981", margin: 0, fontWeight: 500 }}>
                {metrics.activeClockedIn.length} worker{metrics.activeClockedIn.length !== 1 ? "s" : ""} clocked in
              </p>
              <p style={{ fontSize: 11, color: "#4E6D92", margin: 0 }}>
                {metrics.activeClockedIn.map((w) => w.name.split(" ")[0]).join(" · ")}
              </p>
            </div>
          </div>
          <span style={{ fontSize: 11, color: "#3B82F6", whiteSpace: "nowrap" }}>View →</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 16px 10px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <p style={{ fontSize: 10, color: "#4E6D92", margin: "0 0 6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Workers</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1, color: "#F1F5FF" }}>{metrics.activeWorkers}</p>
          <p style={{ fontSize: 11, color: "#4E6D92", margin: "6px 0 0" }}>on your team</p>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <p style={{ fontSize: 10, color: "#4E6D92", margin: "0 0 6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Hours this week</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1, color: "#F1F5FF" }}>{Number(metrics.hoursThisWeek.toFixed(1))}</p>
          <p style={{ fontSize: 11, color: "#4E6D92", margin: "6px 0 0" }}>
            {hoursDelta >= 0 ? "↑" : "↓"} {Math.abs(Number(hoursDelta.toFixed(0)))}% vs last week
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 16px 16px" }}>
        <div
          onClick={() => router.push("/settings/pay-rules")}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: 14,
            cursor: "pointer",
          }}
        >
          <p style={{ fontSize: 10, color: "#4E6D92", margin: "0 0 6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Next payroll</p>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1, color: "#F1F5FF" }}>—</p>
          <p style={{ fontSize: 11, color: "#3B82F6", margin: "6px 0 0" }}>Set up →</p>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <p style={{ fontSize: 10, color: "#4E6D92", margin: "0 0 6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>YTD paid out</p>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1, color: "#F1F5FF" }}>$0</p>
          <p style={{ fontSize: 11, color: "#4E6D92", margin: "6px 0 0" }}>no runs yet</p>
        </div>
      </div>

      <div style={{ margin: "0 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#F1F5FF" }}>Live — clocked in</p>
          <p style={{ fontSize: 11, color: "#4E6D92", margin: 0 }}>
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}
          </p>
        </div>

        {metrics.activeClockedIn.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: "24px 16px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, color: "#4E6D92", margin: 0 }}>No one clocked in right now</p>
          </div>
        ) : (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {metrics.activeClockedIn.map((entry, i) => (
              <div
                key={entry.workerId}
                onClick={() => router.push(`/dashboard/workers/${entry.workerId}`)}
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(37,99,235,0.15)",
                      border: "1px solid rgba(37,99,235,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#60A5FA",
                      flexShrink: 0,
                    }}
                  >
                    {entry.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{entry.name}</p>
                    <p style={{ fontSize: 11, color: "#4E6D92", margin: 0 }}>
                      {entry.status === "On Break" ? "On break · " : ""}
                      {entry.hoursToday.toFixed(1)}h on clock
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: entry.status === "On Break" ? "#F59E0B" : "#10B981",
                    }}
                  />
                  <span style={{ fontSize: 11, color: entry.status === "On Break" ? "#F59E0B" : "#10B981" }}>
                    {entry.status === "On Break" ? "Break" : "Active"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ margin: "0 16px 16px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px", color: "#F1F5FF" }}>Quick actions</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { emoji: "👤", label: "Add worker", action: () => router.push("/dashboard/workers/new") },
            { emoji: "📊", label: "Reports", action: () => router.push("/dashboard/reports") },
            { emoji: "✨", label: "AI assist", action: () => setToast("Coming soon"), soon: true },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "12px 8px",
                textAlign: "center",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {item.soon && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    color: "#F59E0B",
                    fontSize: 8,
                    padding: "1px 5px",
                    borderRadius: 4,
                  }}
                >
                  Soon
                </div>
              )}
              <div style={{ fontSize: 18, marginBottom: 6 }}>{item.emoji}</div>
              <p style={{ fontSize: 11, color: "#8BA3C4", margin: 0, lineHeight: 1.3 }}>{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div style={{ margin: "0 16px 16px" }}>
        <div
          style={{
            background: "rgba(37,99,235,0.05)",
            border: "1px solid rgba(37,99,235,0.15)",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontSize: 11, color: "#4E6D92", margin: "0 0 4px" }}>Driver invite code</p>
            <p
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                fontFamily: "monospace",
                letterSpacing: "0.15em",
                color: "#3B82F6",
              }}
            >
              {metrics.inviteCode}
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(metrics.inviteCode);
              setToast("Copied!");
            }}
            style={{
              background: "rgba(37,99,235,0.15)",
              border: "1px solid rgba(37,99,235,0.25)",
              color: "#60A5FA",
              fontSize: 12,
              fontWeight: 500,
              padding: "7px 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Copy
          </button>
        </div>
      </div>

      {!dismissed && (
        <div style={{ margin: "0 16px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: "#F1F5FF" }}>Setup checklist</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 11, color: "#3B82F6", margin: 0 }}>{completed}/5 done</p>
                <button
                  onClick={() => {
                    localStorage.setItem("xevora_checklist_dismissed", "true");
                    setDismissed(true);
                  }}
                  style={{ background: "none", border: "none", color: "#4E6D92", fontSize: 11, cursor: "pointer", padding: 0 }}
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div style={{ height: 3, background: "rgba(37,99,235,0.12)", borderRadius: 2, marginBottom: 10 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#2563EB", borderRadius: 2 }} />
            </div>
            <p style={{ fontSize: 12, color: "#4E6D92", margin: 0 }}>
              Next: {checklistItems.find((i) => !i.done)?.label ?? "All done!"} →
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
