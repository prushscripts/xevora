"use client";

import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

interface TopBarProps {
  userName: string;
}

function getTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/workers/new")) return "Add Worker";
  if (pathname.startsWith("/dashboard/workers/")) return "Worker Profile";
  if (pathname.startsWith("/dashboard/workers")) return "Workers";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  return "Xevora";
}

export default function TopBar({ userName }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[rgba(3,6,13,0.88)] px-4 backdrop-blur md:px-6">
      <h1 className="text-lg font-extrabold md:text-2xl">{getTitle(pathname)}</h1>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted)] transition hover:text-[var(--text)]"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--blue)] px-1 text-[10px] text-white">
            3
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 transition-all duration-200 ease-in-out hover:border-[rgba(37,99,235,0.3)] hover:bg-[rgba(37,99,235,0.08)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(37,99,235,0.2)] text-xs font-medium text-[var(--blue-bright)]">
              {userName.slice(0, 2).toUpperCase()}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-[var(--muted)]" />
          </button>

          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-full mt-2 min-w-[180px] rounded-xl border border-[rgba(37,99,235,0.15)] bg-[rgba(6,11,20,0.85)] p-[6px] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(37,99,235,0.05)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)]"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/settings/clients");
                  }}
                  className="flex w-full cursor-pointer items-center gap-[10px] rounded-lg px-[14px] py-[10px] text-left text-[14px] text-[var(--text)] transition-colors duration-150 ease-in-out hover:bg-[rgba(37,99,235,0.1)] hover:text-[#60A5FA]"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Settings
                </button>

                <div className="my-1 h-px bg-[rgba(37,99,235,0.12)]" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full cursor-pointer items-center gap-[10px] rounded-lg px-[14px] py-[10px] text-left text-[14px] text-[var(--text)] transition-colors duration-150 ease-in-out hover:bg-[rgba(37,99,235,0.1)] hover:text-[#60A5FA] disabled:opacity-60"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
