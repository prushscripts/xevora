"use client";

import {
  ClockIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";

const TABS = [
  { key: "dashboard", path: "/dashboard", label: "Dashboard", icon: Squares2X2Icon },
  { key: "workers", path: "/dashboard/workers", label: "Workers", icon: UserGroupIcon },
  { key: "time", path: "/dashboard/time", label: "Time", icon: ClockIcon },
  { key: "payroll", path: "/dashboard/payroll", label: "Payroll", icon: CurrencyDollarIcon },
  { key: "more", path: "/dashboard/settings", label: "More", icon: Cog6ToothIcon },
] as const;

export default function DashboardShell({ children, userName }: { children: ReactNode; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab =
    TABS.find((t) =>
      t.key === "dashboard" ? pathname === "/dashboard" : pathname.startsWith(t.path),
    )?.key ?? "dashboard";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div style={{ minHeight: "100dvh", background: "#03060D", color: "#F1F5FF" }} className="flex min-w-0 flex-1 flex-col">
        <TopBar userName={userName} />
        <main className="flex-1">
          <div style={{ paddingBottom: 80 }}>{children}</div>
        </main>

        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "rgba(3,6,13,0.95)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
            paddingTop: "0.5rem",
          }}
          className="lg:hidden"
        >
          <div style={{ display: "flex", justifyContent: "space-around", maxWidth: 430, margin: "0 auto", padding: "0 8px" }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => router.push(tab.path)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isActive ? "#3B82F6" : "#4E6D92",
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.03em",
                    WebkitTapHighlightColor: "transparent",
                    minWidth: 44,
                    minHeight: 44,
                  }}
                >
                  <Icon style={{ width: 20, height: 20 }} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
