"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import HexClock from "@/components/driver/HexClock";
import ShiftTimer from "@/components/driver/ShiftTimer";
import { useDriverProfile } from "@/components/driver/DriverProvider";
import {
  activeMealBreak,
  clockIn,
  clockOut,
  getCurrentShift,
  updateShiftMealBreaks,
  type ShiftRow,
} from "@/lib/driver";
import type { MealBreak } from "@/lib/payroll";
import { checkGeofenceEnforcement } from "@/lib/gps";
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
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [geoWarn, setGeoWarn] = useState(false);

  const clients = useMemo(() => profile?.assignedClients ?? [], [profile?.assignedClients]);

  useEffect(() => {
    if (!selectedClientId && clients.length) {
      const def = profile?.default_client_id;
      const pick = clients.find((c) => c.client_id === def) ?? clients[0];
      setSelectedClientId(pick.client_id);
    }
  }, [clients, profile?.default_client_id, selectedClientId]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.client_id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

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
      () => setGeo("error"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  const meals = (shift?.meal_breaks as MealBreak[] | null) ?? [];
  const openMeal = activeMealBreak(meals);

  const geofenceEval = useMemo(() => {
    if (!profile?.company.gps_enabled || !selectedClient || selectedClient.gps_enforcement === "off") {
      return { allowed: true, warning: false, within: null as boolean | null };
    }
    return checkGeofenceEnforcement(
      {
        gps_enforcement: selectedClient.gps_enforcement,
        geofence_radius_meters: selectedClient.geofence_radius_meters,
        lat: selectedClient.lat,
        lng: selectedClient.lng,
      },
      coords,
    );
  }, [profile?.company.gps_enabled, selectedClient, coords]);

  useEffect(() => {
    setGeoWarn(!!geofenceEval.warning);
  }, [geofenceEval.warning]);

  const punchBlocked =
    profile?.company.gps_enabled &&
    selectedClient &&
    selectedClient.gps_enforcement === "block" &&
    !geofenceEval.allowed;

  async function ensureCoords(): Promise<{ lat: number; lng: number } | null> {
    if (coords) return coords;
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = readCoords(pos);
          setCoords(c);
          setGeo("confirmed");
          resolve(c);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12_000 },
      );
    });
  }

  async function onClockIn() {
    if (!profile || !selectedClientId) {
      setActionError("Select a client.");
      return;
    }
    setActionError(null);
    setActionLoading(true);
    const c = await ensureCoords();
    const client = clients.find((x) => x.client_id === selectedClientId);
    if (!client) {
      setActionLoading(false);
      return;
    }
    const gf = checkGeofenceEnforcement(
      {
        gps_enforcement: client.gps_enforcement,
        geofence_radius_meters: client.geofence_radius_meters,
        lat: client.lat,
        lng: client.lng,
      },
      c,
    );
    if (!gf.allowed) {
      setActionError("You are outside the allowed zone.");
      setActionLoading(false);
      return;
    }
    if (c == null) {
      setActionError("Location required to clock in.");
      setActionLoading(false);
      return;
    }
    const supabase = createClient();
    const { shift: created, error } = await clockIn(supabase, {
      companyId: profile.company_id,
      workerId: profile.id,
      clientId: selectedClientId,
      lat: c.lat,
      lng: c.lng,
      gpsVerified: true,
      withinGeofence: gf.within ?? null,
      note,
    });
    if (error) setActionError(error.message);
    else setShift(created);
    setActionLoading(false);
  }

  async function onClockOut() {
    if (!shift) return;
    setActionError(null);
    setActionLoading(true);
    const c = (await ensureCoords()) ?? { lat: 0, lng: 0 };
    const supabase = createClient();
    const { error } = await clockOut(supabase, { shiftId: shift.id, lat: c.lat, lng: c.lng });
    if (error) setActionError(error.message);
    else setShift(null);
    setActionLoading(false);
    void refreshShift();
  }

  async function onStartMeal() {
    if (!shift) return;
    const next: MealBreak[] = [...meals, { start: new Date().toISOString(), end: null }];
    const supabase = createClient();
    const { error } = await updateShiftMealBreaks(supabase, shift.id, next);
    if (error) setActionError(error.message);
    else setShift({ ...shift, meal_breaks: next });
  }

  async function onEndMeal() {
    if (!shift || !openMeal) return;
    const next = meals.map((m, i) =>
      i === meals.length - 1 && !m.end ? { ...m, end: new Date().toISOString() } : m,
    );
    const supabase = createClient();
    const { error } = await updateShiftMealBreaks(supabase, shift.id, next);
    if (error) setActionError(error.message);
    else setShift({ ...shift, meal_breaks: next });
  }

  if (profileLoading || shiftLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-48 w-48 animate-pulse rounded-full bg-[#060B14]" />
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
  const mealActive = Boolean(openMeal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[calc(100dvh-7rem)] flex-col"
    >
      <div className="flex flex-1 flex-col items-center justify-center py-4">
        <HexClock active={active && !mealActive} className="mb-6 w-full">
          {active ? (
            <div className="px-2">
              <p
                className={`font-jb text-[clamp(1.75rem,10vw,2.75rem)] font-medium tabular-nums tracking-tight text-[#F1F5FF] ${
                  mealActive ? "text-amber-200" : ""
                }`}
              >
                {mealActive && openMeal ? (
                  <ShiftTimer startedAtIso={openMeal.start} />
                ) : (
                  <ShiftTimer startedAtIso={shift!.clock_in} />
                )}
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#4E6D92]">
                {mealActive ? "Meal break" : "Elapsed"}
              </p>
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

        {geoWarn && selectedClient ? (
          <p className="mt-4 max-w-sm rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100">
            You appear outside {selectedClient.abbreviation}&apos;s geofence. You can still punch (warn mode).
          </p>
        ) : null}

        {punchBlocked ? (
          <p className="mt-4 max-w-sm text-center text-sm text-red-300">You are outside the allowed zone.</p>
        ) : null}

        {!active ? (
          <div className="mt-8 w-full max-w-sm space-y-5">
            {clients.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#4E6D92]">Client</p>
                <div className="flex flex-wrap gap-2">
                  {clients.map((cl) => (
                    <button
                      key={cl.client_id}
                      type="button"
                      onClick={() => setSelectedClientId(cl.client_id)}
                      className={`rounded-full border px-3 py-1.5 font-jb text-xs uppercase ${
                        selectedClientId === cl.client_id
                          ? "border-[#3B82F6] bg-[#3B82F6]/15 text-[#93C5FD]"
                          : "border-[#0f1729] bg-[#060B14] text-[#4E6D92]"
                      }`}
                    >
                      {cl.abbreviation}
                    </button>
                  ))}
                </div>
                {selectedClient ? (
                  <p className="mt-2 text-xs text-[#4E6D92]">{selectedClient.name}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-center text-sm text-[#4E6D92]">No clients assigned. Contact your admin.</p>
            )}

            {profile.company.gps_enabled && selectedClient && selectedClient.gps_enforcement !== "off" ? (
              <div className="flex items-center justify-center gap-2 text-xs text-[#4E6D92]">
                <span
                  className={`h-2 w-2 rounded-full ${geo === "confirmed" ? "bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" : "bg-[#4E6D92]"}`}
                />
                {geo === "acquiring" ? "Acquiring location…" : geo === "confirmed" ? "Location confirmed" : "Location unavailable"}
              </div>
            ) : null}

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              className="w-full rounded-xl border border-[#0f1729] bg-[#060B14] px-4 py-3 text-sm text-[#F1F5FF] placeholder:text-[#4E6D92]"
            />

            <motion.button
              type="button"
              disabled={actionLoading || !selectedClientId || punchBlocked || clients.length === 0}
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
        ) : (
          <div className="mt-8 w-full max-w-sm space-y-4 text-center">
            <p className="font-jb text-xs text-[#4E6D92]">
              Clocked in{" "}
              {new Date(shift!.clock_in).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
            {!mealActive ? (
              <motion.button
                type="button"
                disabled={actionLoading}
                onClick={() => void onStartMeal()}
                className="w-full rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 py-3 text-sm font-bold uppercase tracking-wider text-amber-100"
              >
                Meal break
              </motion.button>
            ) : (
              <motion.button
                type="button"
                disabled={actionLoading}
                onClick={() => void onEndMeal()}
                className="w-full rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 py-3 text-sm font-bold uppercase tracking-wider text-emerald-100"
              >
                End meal
              </motion.button>
            )}
            <motion.button
              type="button"
              disabled={actionLoading}
              onClick={() => void onClockOut()}
              className="w-full rounded-2xl border-2 border-red-500/50 bg-red-600/20 py-4 text-sm font-bold uppercase tracking-[0.2em] text-red-100"
            >
              Clock out
            </motion.button>
            <Link href="/driver/profile" className="inline-block text-xs text-[#4E6D92] hover:text-[#3B82F6]">
              Account & sign out
            </Link>
          </div>
        )}
      </div>
      {actionError ? (
        <p className="text-center text-xs text-red-300" role="alert">
          {actionError}
        </p>
      ) : null}
    </motion.div>
  );
}
