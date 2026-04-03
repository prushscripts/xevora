"use client";

import {
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

const desktopNav = [
  { label: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
  { label: "Workers", href: "/dashboard/workers", icon: UserGroupIcon },
  { label: "Time Tracking", href: "/dashboard/time", icon: ClockIcon },
  { label: "Payroll", href: "/dashboard/payroll", icon: CurrencyDollarIcon },
  { label: "Reports", href: "/dashboard/reports", icon: ChartBarIcon },
  { label: "Settings", href: "/settings/clients", icon: Cog6ToothIcon },
];

const mobileNav = [
  { label: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
  { label: "Workers", href: "/dashboard/workers", icon: UserGroupIcon },
  { label: "Time", href: "/dashboard/time", icon: ClockIcon },
  { label: "Payroll", href: "/dashboard/payroll", icon: CurrencyDollarIcon },
  { label: "More", href: "/settings/clients", icon: Cog6ToothIcon },
];

function LogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 88 88" fill="none" aria-hidden="true">
      <polygon points="44,4 76,22 76,66 44,84 12,66 12,22" fill="#060B14" stroke="rgba(37,99,235,0.5)" strokeWidth="1.5" />
      <path d="M28 28L40 44L28 60H35.5L44 49.2L52.5 60H60L48 44L60 28H52.5L44 38.8L35.5 28H28Z" fill="#2563EB" />
      <rect x="41" y="41" width="6" height="6" transform="rotate(45 41 41)" fill="#60A5FA" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden h-screen w-[240px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 lg:flex lg:flex-col">
        <div>
          <div className="mb-4 flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              <span className="text-[10px]">◇</span> Xavorn
            </span>
            <Link href="https://xavorn.com" className="text-[var(--blue-bright)] hover:underline">
              xavorn.com
            </Link>
          </div>
          <div className="mb-4 h-px w-full bg-[var(--border)]" />
          <div className="mb-6 flex items-center gap-2">
            <LogoMark />
            <span className="text-sm font-extrabold tracking-[4px]">XEVORA</span>
          </div>

          <nav className="space-y-1">
            {desktopNav.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition ${
                    isActive
                      ? "border-[var(--blue)] bg-[rgba(37,99,235,0.12)] text-[var(--blue-bright)]"
                      : "border-transparent text-[var(--muted)] hover:bg-[rgba(37,99,235,0.08)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto pt-4">
          <p className="mb-2 text-[10px] uppercase tracking-[1px] text-[var(--muted)]">Powered by Xavorn</p>
          <Link
            href="https://xavorn.com"
            className="inline-flex items-center gap-2 text-xs text-[var(--muted)] transition hover:text-[var(--blue-bright)]"
          >
            <span className="h-2 w-2 rotate-45 bg-[#D4AF37]" />
            xavorn.com
          </Link>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] px-2 py-2 lg:hidden">
        <ul className="grid grid-cols-5 gap-1">
          {mobileNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
    </>
  );
}
