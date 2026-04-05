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
    <div className="space-y-6 pb-6">
      {toast ? (
        <div className="fixed right-4 top-20 z-50 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] shadow-xl">
          {toast}
        </div>
      ) : null}

      <section>
        <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold">
          {getGreeting()} {metrics.firstName} 👋
        </h2>
        <p className="mt-1 text-sm font-light text-[var(--muted)]">{formatDate()}</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: UserGroupIcon,
            label: "ACTIVE WORKERS",
            value: String(metrics.activeWorkers),
            sub: "↑ 0 this week",
          },
          {
            icon: ClockIcon,
            label: "HOURS THIS WEEK",
            value: String(Number(metrics.hoursThisWeek.toFixed(1))),
            sub: `↑ ${Math.max(0, Number(hoursDelta.toFixed(0)))}% vs last week`,
          },
          {
            icon: BanknotesIcon,
            label: "NEXT PAYROLL",
            value: "—",
            sub: "Set up payroll",
            href: "/settings/pay-rules",
          },
          {
            icon: ChartBarIcon,
            label: "YTD PAID OUT",
            value: "$0",
            sub: "No payrolls run yet",
          },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.1 * (index + 1), ease: "easeOut" }}
              className="relative overflow-hidden rounded-[14px] border border-[rgba(37,99,235,0.1)] bg-[rgba(6,11,20,0.95)] p-6"
            >
              {index === 0 ? (
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.35),transparent_70%)]" />
              ) : null}
              <Icon className="h-5 w-5 text-[var(--blue-bright)]" />
              <p className={`${mono.className} mt-3 text-[9px] uppercase tracking-[2px] text-[var(--muted)]`}>{card.label}</p>
              <p className="mt-2 text-4xl font-extrabold">{card.value}</p>
              {card.href ? (
                <Link href={card.href} className="mt-2 inline-block text-xs text-[var(--blue-bright)] hover:underline">
                  {card.sub}
                </Link>
              ) : (
                <p className={`mt-2 text-xs ${index === 3 ? "text-[var(--muted)]" : "text-[var(--green)]"}`}>{card.sub}</p>
              )}
            </motion.article>
          );
        })}
      </section>

      <section className="rounded-[14px] border border-[var(--border)] bg-[rgba(6,11,20,0.95)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">Workers - Clocked In</h3>
          <span className="rounded-full border border-[rgba(37,99,235,0.25)] bg-[rgba(37,99,235,0.14)] px-3 py-1 text-xs text-[var(--blue-bright)]">
            {metrics.activeClockedIn.length} Active
          </span>
        </div>

        {metrics.activeClockedIn.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClockIcon className="h-12 w-12 text-[var(--muted)]" />
            <p className="mt-3 text-sm">No one clocked in</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Workers can clock in at xevora.io/clock/[slug]</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[1px] text-[var(--muted)]">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Hours Today</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {metrics.activeClockedIn.map((entry) => (
                  <tr key={entry.workerId} className="border-t border-[var(--border)]">
                    <td className="py-3">{entry.name}</td>
                    <td className="py-3">{entry.hoursToday.toFixed(1)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                          entry.status === "On Break"
                            ? "bg-[rgba(245,158,11,0.12)] text-[var(--amber)]"
                            : "bg-[rgba(52,211,153,0.12)] text-[var(--green)]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            entry.status === "On Break" ? "bg-[var(--amber)]" : "bg-[var(--green)]"
                          }`}
                        />
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/workers/${entry.workerId}`)}
                        className="text-xs text-[var(--blue-bright)] hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            title: "Add Worker",
            sub: "Invite a new team member",
            icon: UserPlusIcon,
            action: () => router.push("/dashboard/workers/new"),
            beta: false,
          },
          {
            title: "View Reports",
            sub: "Labor cost and time analytics",
            icon: ChartBarIcon,
            action: () => router.push("/dashboard/reports"),
            beta: false,
          },
          {
            title: "AI Assistant",
            sub: "Ask anything about your workforce",
            icon: SparklesIcon,
            action: () => setToast("Coming soon"),
            beta: true,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className="relative rounded-[14px] border border-[var(--border)] bg-[rgba(6,11,20,0.95)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.55)]"
            >
              {item.beta ? (
                <span className="absolute right-4 top-4 rounded-full bg-[rgba(245,158,11,0.16)] px-2 py-0.5 text-[10px] text-[var(--amber)]">
                  Beta
                </span>
              ) : null}
              <Icon className="h-6 w-6 text-[var(--blue-bright)]" />
              <p className="mt-3 text-[15px] font-medium">{item.title}</p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">{item.sub}</p>
            </button>
          );
        })}
      </section>

      {!dismissed ? (
        <section className="rounded-[14px] border border-[var(--border)] bg-[rgba(6,11,20,0.95)] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold">Get started with Xevora</h3>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("xevora_checklist_dismissed", "true");
                setDismissed(true);
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--blue-bright)]"
            >
              Dismiss
            </button>
          </div>
          <div className="mb-4 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{completed}/5 complete</span>
          </div>
          <div className="mb-4 h-2 w-full rounded-full bg-[rgba(37,99,235,0.16)]">
            <div className="h-full rounded-full bg-[var(--blue)]" style={{ width: `${progress}%` }} />
          </div>
          <ul className="space-y-2">
            {checklistItems.map((item) => (
              <li key={item.label} className="flex items-center justify-between text-sm">
                <span className={item.done ? "text-[var(--text)]" : "text-[var(--muted)]"}>
                  {item.done ? "✅" : "⬜"} {item.label}
                </span>
                {!item.done ? (
                  <Link href={item.href} className="inline-flex items-center gap-1 text-[var(--blue-bright)] hover:underline">
                    <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
