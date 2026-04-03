"use client";

import { useEffect, useState } from "react";
import { formatHhMmSsFromMs } from "@/lib/driver";

export default function ShiftTimer({ startedAtIso }: { startedAtIso: string }) {
  const [text, setText] = useState("00:00:00");

  useEffect(() => {
    const tick = () => {
      const ms = Date.now() - new Date(startedAtIso).getTime();
      setText(formatHhMmSsFromMs(ms));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAtIso]);

  return <span className="font-jb tabular-nums tracking-tight">{text}</span>;
}
