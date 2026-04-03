"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import HexClock from "@/components/driver/HexClock";
import ShiftTimer from "@/components/driver/ShiftTimer";
import { useDriverProfile } from "@/components/driver/DriverProvider";
import { clockIn, clockOut, getCurrentShift, type ShiftRow } from "@/lib/driver";
import { createClient } from "@/lib/supabase";

type GeoState = "idle" | "acquiring" | "confirmed" | "error";

function readCoords(pos: GeolocationPosition): { lat: number; lng: number } {
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export default function DriverClockPage() {
  const { profile, loading: profileLoading, error: profileError } = useDriverProfile();
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [note, setNote] = useState("");
  const [geo, setGeo] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [wallClock, setWallClock] = useState("");

  const refreshShift = useCallback(async () => {
    if (!profile?.id) return;
    setShiftLoading(true);
    const supabase = createClient();
    const { shift: s } = await getCurrentShift(supabase, profile.id);
    setShift(s);
    setShiftLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    void refreshShift();
  }, [refreshShift]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setWallClock(
        now.toLocaleTimeString(undefined, { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const acquireLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo("error");
      return;
    }
    setGeo("acquiring");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(readCoords(pos));
        setGeo("confirmed");
      },
      () => {
        setGeo("error");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  const onClockIn = async () => {
    if (!profile) return;
    setActionError(null);
    setActionLoading(true);
    let lat = coords?.lat;
    let lng = coords?.lng;
    if (lat == null || lng == null) {
      await new Promise<void>((resolve) => {
        if (!navigator.geolocation) {
          resolve();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const c = readCoords(pos);
            lat = c.lat;
            lng = c.lng;
            setCoords(c);
            setGeo("confirmed");
            resolve();
          },
          () => resolve(),
          { enableHighAccuracy: true, timeout: 12_000 },
        );
      });
    }
    if (lat == null || lng == null) {
      setActionError("Location required to clock in.");
      setActionLoading(false);
      return;
    }
    const supabase = createClient();
    const { shift: created, error } = await clockIn(supabase, {
      companyId: profile.company_id,
      workerId: profile.id,
      lat,
      lng,
      note,
    });
    if (error) {
      setActionError(error.message);
    } else {
      setShift(created);
      setNote("");
    }
    setActionLoading(false);
  };

  const onClockOut = async () => {
    if (!shift) return;
    setActionError(null);
    setActionLoading(true);
    let lat = coords?.lat ?? 0;
    let lng = coords?.lng ?? 0;
    if (!coords) {
      await new Promise<void>((resolve) => {
        if (!navigator.geolocation) {
          resolve();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const c = readCoords(pos);
            lat = c.lat;
            lng = c.lng;
            setCoords(c);
            resolve();
          },
          () => resolve(),
          { enableHighAccuracy: true, timeout: 12_000 },
        );
      });
    }
    const supabase = createClient();
    const { error } = await clockOut(supabase, { shiftId: shift.id, lat, lng });
    if (error) {
      setActionError(error.message);
    } else {
      setShift(null);
    }
    setActionLoading(false);
  };

  if (profileLoading || shiftLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-48 w-48 animate-pulse rounded-full bg-[#060B14]" />
        <div className="h-4 w-32 rounded bg-[#060B14]" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {profileError ?? "Unable to load profile."}
      </div>
    );
  }

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const active = Boolean(shift);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-[calc(100dvh-7rem)] flex-col"
    >
      <div className="flex flex-1 flex-col items-center justify-center py-4">
        <HexClock active={active} className="mb-6 w-full">
          {active ? (
            <div className="px-2">
              <p className="font-jb text-[clamp(1.75rem,10vw,2.75rem)] font-medium tabular-nums tracking-tight text-[#F1F5FF]">
                <ShiftTimer startedAtIso={shift!.clock_in} />
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#4E6D92]">Elapsed</p>
            </div>
          ) : (
            <div className="px-2">
              <p className="font-jb text-[clamp(1.75rem,10vw,2.75rem)] font-medium tabular-nums tracking-tight text-[#F1F5FF]">
                {wallClock || "00:00:00"}
              </p>
            </div>
          )}
        </HexClock>

        <p className="text-center text-sm text-[#4E6D92]">{dateLabel}</p>

        {active ? (
          <div className="mt-6 w-full max-w-sm space-y-4 text-center">
            <p className="font-jb text-xs text-[#4E6D92]">
              Clocked in{" "}
              <span className="text-[#F1F5FF]">
                {new Date(shift!.clock_in).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-[#4E6D92]">
              <span className="h-2 w-2 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
              GPS {geo === "confirmed" ? "confirmed" : geo === "acquiring" ? "acquiring…" : "pending"}
            </div>
            <motion.button
              type="button"
              disabled={actionLoading}
              onClick={() => void onClockOut()}
              className="relative w-full overflow-hidden rounded-2xl border-2 border-red-500/50 bg-red-600/20 py-4 text-sm font-bold uppercase tracking-[0.2em] text-red-100 shadow-[0_0_28px_rgba(239,68,68,0.25)] transition enabled:hover:bg-red-600/30 disabled:opacity-50"
              animate={{ boxShadow: ["0 0 28px rgba(239,68,68,0.2)", "0 0 40px rgba(239,68,68,0.45)", "0 0 28px rgba(239,68,68,0.2)"] }}
              transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY }}
            >
              Clock out
            </motion.button>
          </div>
        ) : (
          <div className="mt-8 w-full max-w-sm space-y-5">
            <div className="flex items-center justify-center gap-2 text-xs text-[#4E6D92]">
              <span
                className={`h-2 w-2 rounded-full ${
                  geo === "confirmed" ? "bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" : "bg-[#4E6D92]"
                }`}
              />
              Location:{" "}
              {geo === "acquiring"
                ? "acquiring…"
                : geo === "confirmed"
                  ? "confirmed"
                  : geo === "error"
                    ? "unavailable — tap retry"
                    : "idle"}
            </div>
            {geo === "error" ? (
              <button
                type="button"
                onClick={acquireLocation}
                className="w-full text-center text-xs font-medium text-[#3B82F6]"
              >
                Retry GPS
              </button>
            ) : null}
            <label className="block">
              <span className="sr-only">Shift note</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                className="w-full rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-3 text-sm text-[#F1F5FF] placeholder:text-[#4E6D92] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </label>
            <motion.button
              type="button"
              disabled={actionLoading}
              onClick={() => void onClockIn()}
              className="relative w-full rounded-2xl bg-[#2563EB] py-4 text-sm font-bold uppercase tracking-[0.25em] text-white shadow-[0_0_32px_rgba(37,99,235,0.45)] transition enabled:hover:bg-[#3B82F6] disabled:opacity-50"
              animate={{
                boxShadow: [
                  "0 0 32px rgba(37,99,235,0.35)",
                  "0 0 48px rgba(59,130,246,0.55)",
                  "0 0 32px rgba(37,99,235,0.35)",
                ],
              }}
              transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY }}
            >
              Clock in
            </motion.button>
          </div>
        )}
      </div>

      {actionError ? (
        <p className="mt-2 text-center text-xs text-red-300" role="alert">
          {actionError}
        </p>
      ) : null}
    </motion.div>
  );
}
