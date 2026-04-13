"use client";

import {
  ClockIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; external?: boolean };

const NAV: NavItem[] = [
  { href: "/settings/company", label: "Company" },
  { href: "/settings/clients", label: "Clients" },
  { href: "/dashboard/workers", label: "Workers", external: true },
  { href: "/settings/pay-rules", label: "Pay rules" },
  { href: "/settings/gps", label: "GPS" },
  { href: "/settings/billing", label: "Billing" },
];

const mobileNav = [
  { label: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
  { label: "Workers", href: "/dashboard/workers", icon: UserGroupIcon },
  { label: "Time", href: "/dashboard/time", icon: ClockIcon },
  { label: "Payroll", href: "/dashboard/payroll", icon: CurrencyDollarIcon },
  { label: "More", href: "/settings/clients", icon: Cog6ToothIcon },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#03060D] text-[#F1F5FF]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 pb-24 md:flex-row md:px-6 lg:py-10 lg:pb-10">
        <aside className="shrink-0 md:w-52">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4E6D92]">Settings</p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#F1F5FF]">Workforce</h1>
          <nav className="mt-6 flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
            {NAV.map((item) => {
              const active = !item.external && pathname.startsWith(item.href);
              const className = `rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[#2563EB]/20 text-[#93C5FD] shadow-[0_0_20px_rgba(37,99,235,0.15)]"
                  : "text-[#4E6D92] hover:bg-[#060B14] hover:text-[#F1F5FF]"
              }`;
              return (
                <Link key={item.href} href={item.href} className={className}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/dashboard"
            className="mt-8 inline-block text-xs font-medium text-[#4E6D92] underline-offset-4 hover:text-[#3B82F6] hover:underline"
          >
            ← Back to dashboard
          </Link>
        </aside>
        <main className="min-w-0 flex-1 rounded-2xl border border-[#0f1729] bg-[#060B14] p-6 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)] md:p-8">
          {children}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] px-2 py-2 lg:hidden">
        <ul className="grid grid-cols-5 gap-1">
          {mobileNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 rounded-md py-1 text-[10px] ${
                    isActive ? "text-[var(--blue-bright)]" : "text-[var(--muted)]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
