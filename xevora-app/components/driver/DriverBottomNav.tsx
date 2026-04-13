"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/driver", label: "Home", key: "home" },
  { href: "/driver/clock", label: "Clock", key: "clock" },
  { href: "/driver/timecard", label: "Timecard", key: "timecard" },
  { href: "/driver/pay", label: "Pay", key: "pay" },
  { href: "/driver/vault", label: "Vault", key: "vault" },
] as const;

function IconHome({ active }: { active: boolean }) {
  const stroke = active ? "#3B82F6" : "#4E6D92";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {active ? <circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeOpacity="0.25" strokeWidth="1" /> : null}
    </svg>
  );
}

function IconClockTab({ active }: { active: boolean }) {
  const c = active ? "#3B82F6" : "#4E6D92";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      {active ? (
        <path
          d="M12 3v2M12 19v2M3 12h2M19 12h2"
          stroke="#3B82F6"
          strokeOpacity="0.35"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function IconTimecard({ active }: { active: boolean }) {
  const c = active ? "#3B82F6" : "#4E6D92";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M8 2v4M16 2v4M5 9h14" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 13h6M9 16h4" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconPay({ active }: { active: boolean }) {
  const c = active ? "#3B82F6" : "#4E6D92";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M3 10h18" stroke={c} strokeWidth="1.6" />
      <circle cx="8" cy="14" r="1.2" fill={c} />
    </svg>
  );
}

function IconVault({ active }: { active: boolean }) {
  const c = active ? "#F59E0B" : "#4E6D92";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="9" width="14" height="11" rx="2" stroke={c} strokeWidth="1.6" />
      <path
        d="M8 9V7a4 4 0 0 1 8 0v2"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14" r="1.5" fill={c} />
    </svg>
  );
}

const icons = {
  home: IconHome,
  clock: IconClockTab,
  timecard: IconTimecard,
  pay: IconPay,
  vault: IconVault,
} as const;

export default function DriverBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#0f1729] bg-[#03060D]/95 backdrop-blur-md"
      aria-label="Driver navigation"
    >
      <div className="mx-auto flex max-w-[430px] items-stretch justify-between px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {tabs.map((tab) => {
          const active =
            tab.href === "/driver" ? pathname === "/driver" : pathname.startsWith(tab.href);
          const Icon = icons[tab.key];
          const vault = tab.key === "vault";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors"
            >
              <span
                className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-[box-shadow,background-color]"
                style={
                  active
                    ? vault
                      ? {
                          boxShadow: "0 0 20px rgba(245,158,11,0.45), 0 0 2px rgba(245,158,11,0.8)",
                          backgroundColor: "rgba(245,158,11,0.1)",
                        }
                      : {
                          boxShadow: "0 0 20px rgba(59,130,246,0.45), 0 0 2px rgba(59,130,246,0.8)",
                          backgroundColor: "rgba(59,130,246,0.08)",
                        }
                    : undefined
                }
              >
                <Icon active={active} />
              </span>
              <span
                className={`max-w-full truncate px-0.5 text-[10px] font-medium tracking-wide ${
                  active ? (vault ? "text-[#F59E0B]" : "text-[#3B82F6]") : "text-[#4E6D92]"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
