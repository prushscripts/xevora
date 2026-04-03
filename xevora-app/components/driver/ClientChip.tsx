"use client";

import { motion } from "framer-motion";

export default function ClientChip({
  abbreviation,
  pulse = false,
  className = "",
}: {
  abbreviation: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <motion.span
      layout
      className={`inline-flex items-center gap-2 rounded-full border border-[#0f1729] bg-[#060B14] px-3 py-1 font-jb text-[11px] font-semibold uppercase tracking-wider text-[#F1F5FF] ${className}`}
    >
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3B82F6] opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3B82F6]" />
        </span>
      ) : null}
      {abbreviation}
    </motion.span>
  );
}
