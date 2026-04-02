"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function DashboardTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="mx-auto w-full max-w-[1400px] px-4 py-4 md:px-6 md:py-6"
    >
      {children}
    </motion.div>
  );
}
