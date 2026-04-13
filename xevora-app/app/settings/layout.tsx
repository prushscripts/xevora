"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
  { label: "Company", path: "/settings/company" },
  { label: "Clients", path: "/settings/clients" },
  { label: "Workers", path: "/settings/workers" },
  { label: "Pay Rules", path: "/settings/pay-rules" },
  { label: "GPS", path: "/settings/gps" },
  { label: "Billing", path: "/settings/billing" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100dvh", background: "#03060D", color: "#F1F5FF" }}>
      <div style={{ padding: "20px 16px 0" }}>
        <p
          style={{
            fontSize: 11,
            color: "#4E6D92",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Settings
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Workforce</h1>

        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: 8,
            paddingBottom: 12,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            marginLeft: -16,
            marginRight: -16,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {SETTINGS_TABS.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                style={{
                  flexShrink: 0,
                  padding: "7px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "#2563EB" : "rgba(255,255,255,0.05)",
                  color: isActive ? "#fff" : "#8BA3C4",
                  textDecoration: "none",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.08)",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginLeft: -16, marginRight: -16 }} />
      </div>

      <div style={{ padding: "20px 16px", paddingBottom: 100 }}>{children}</div>
    </div>
  );
}
