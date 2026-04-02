"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import DashboardTransition from "@/components/dashboard/DashboardTransition";

export default function DashboardShellMotion({
  children,
  userName,
}: {
  children: ReactNode;
  userName: string;
}) {
  return (
    <div className="flex min-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Sidebar />
      </motion.div>

      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0"
      >
        <TopBar userName={userName} />
        <main className="flex-1">
          <DashboardTransition>{children}</DashboardTransition>
        </main>
      </motion.div>
    </div>
  );
}
