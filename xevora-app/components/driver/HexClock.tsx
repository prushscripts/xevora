"use client";

import { motion } from "framer-motion";

type HexClockProps = {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
};

export default function HexClock({ active = false, children, className = "" }: HexClockProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {active ? (
        <>
          <motion.span
            className="pointer-events-none absolute inset-0 m-auto aspect-square w-[min(92vw,380px)] rounded-full bg-[#22C55E]/5"
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.12, 0.35] }}
            transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <motion.span
            className="pointer-events-none absolute inset-0 m-auto aspect-square w-[min(78vw,320px)] rounded-full border border-[#22C55E]/20"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
          />
        </>
      ) : (
        <motion.span
          className="pointer-events-none absolute inset-0 m-auto aspect-square w-[min(88vw,360px)] rounded-full bg-[#2563EB]/5"
          animate={{ scale: [1, 1.06, 1], opacity: [0.25, 0.08, 0.25] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      )}

      <motion.div
        className="relative z-10 flex h-[min(72vw,300px)] w-[min(72vw,300px)] items-center justify-center"
        animate={
          active
            ? { filter: ["drop-shadow(0 0 12px rgba(34,197,94,0.35))", "drop-shadow(0 0 22px rgba(34,197,94,0.5))"] }
            : { filter: ["drop-shadow(0 0 8px rgba(37,99,235,0.25))", "drop-shadow(0 0 18px rgba(59,130,246,0.45))"] }
        }
        transition={{ duration: active ? 1.8 : 2.2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      >
        <svg viewBox="0 0 88 88" className="absolute h-full w-full" fill="none" aria-hidden="true">
          <motion.polygon
            points="44,4 76,22 76,66 44,84 12,66 12,22"
            fill="#060B14"
            stroke={active ? "rgba(34,197,94,0.45)" : "rgba(59,130,246,0.45)"}
            strokeWidth="1.5"
            animate={{
              strokeWidth: [1.5, 2, 1.5],
            }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <motion.path
            d="M28 28L40 44L28 60H35.5L44 49.2L52.5 60H60L48 44L60 28H52.5L44 38.8L35.5 28H28Z"
            fill="#2563EB"
            fillOpacity={active ? 0.35 : 0.85}
          />
          <motion.rect
            x="41"
            y="41"
            width="6"
            height="6"
            transform="rotate(45 41 41)"
            fill={active ? "#22C55E" : "#3B82F6"}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
          />
        </svg>
        <div className="relative z-20 flex max-w-[78%] flex-col items-center justify-center text-center">{children}</div>
      </motion.div>
    </div>
  );
}
