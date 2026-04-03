"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/settings/company", label: "Company" },
  { href: "/settings/clients", label: "Clients" },
  { href: "/dashboard/workers", label: "Workers", external: true },
  { href: "/settings/pay-rules", label: "Pay rules" },
  { href: "/settings/gps", label: "GPS" },
  { href: "/settings/billing", label: "Billing" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#03060D] text-[#F1F5FF]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:px-6 lg:py-10">
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
              return item.external ? (
                <Link key={item.href} href={item.href} className={className}>
                  {item.label}
                </Link>
              ) : (
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
    </div>
  );
}
