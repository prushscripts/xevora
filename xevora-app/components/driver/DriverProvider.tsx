"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { WorkerClientRates, WorkerPayProfile } from "@/lib/payroll";

export type AssignedClient = {
  client_id: string;
  name: string;
  abbreviation: string;
  billing_rate: number;
  ot_billing_rate: number;
  gps_enforcement: "warn" | "block" | "off";
  geofence_radius_meters: number;
  lat: number | null;
  lng: number | null;
  is_primary: boolean;
};

export type DriverProfile = {
  id: string;
  company_id: string;
  full_name: string | null;
  hourly_rate: number | null;
  truck_label: string | null;
  company_name: string | null;
  created_at: string | null;
  worker_type: "1099" | "w2";
  pay_type: "hourly" | "flat_weekly";
  pay_rate: number | null;
  ot_pay_rate: number | null;
  flat_weekly_rate: number | null;
  default_client_id: string | null;
  vault_enabled: boolean;
  vault_percentage: number;
  company: {
    ot_weekly_threshold: number;
    gps_enabled: boolean;
    vault_enabled: boolean;
  };
  assignedClients: AssignedClient[];
  primaryRates: WorkerClientRates | null;
  workerPay: WorkerPayProfile;
};

type DriverContextValue = {
  profile: DriverProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DriverCtx = createContext<DriverContextValue | null>(null);

export function useDriverProfile() {
  const v = useContext(DriverCtx);
  if (!v) {
    throw new Error("useDriverProfile must be used within DriverProvider");
  }
  return v;
}

export default function DriverProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setError("Not signed in");
      setLoading(false);
      return;
    }

    const { data: w, error: we } = await supabase
      .from("workers")
      .select(
        "id, company_id, full_name, hourly_rate, created_at, truck_id, worker_type, pay_type, pay_rate, ot_pay_rate, flat_weekly_rate, default_client_id, vault_enabled, vault_percentage",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (we || !w) {
      setError(we?.message ?? "No worker profile");
      setProfile(null);
      setLoading(false);
      return;
    }

    let truck_label: string | null = null;
    if (w.truck_id) {
      const { data: t } = await supabase.from("trucks").select("label").eq("id", w.truck_id).maybeSingle();
      truck_label = t?.label ?? null;
    }

    const { data: c } = await supabase
      .from("companies")
      .select("name, ot_weekly_threshold, gps_enabled, vault_enabled")
      .eq("id", w.company_id)
      .maybeSingle();

    const { data: wcRows } = await supabase
      .from("worker_clients")
      .select(
        `
        client_id,
        billing_rate,
        ot_billing_rate,
        is_primary,
        clients (
          name,
          abbreviation,
          gps_enforcement,
          geofence_radius_meters,
          lat,
          lng
        )
      `,
      )
      .eq("worker_id", w.id);

    const assignedClients: AssignedClient[] = [];
    for (const row of wcRows ?? []) {
      const raw = row.clients as unknown;
      const cl0 = Array.isArray(raw) ? raw[0] : raw;
      const cl = cl0 as {
        name: string;
        abbreviation: string;
        gps_enforcement: string;
        geofence_radius_meters: number;
        lat: number | null;
        lng: number | null;
      } | null;
      if (!cl || typeof cl !== "object") continue;
      assignedClients.push({
        client_id: row.client_id as string,
        name: cl.name,
        abbreviation: cl.abbreviation,
        billing_rate: Number(row.billing_rate) || 0,
        ot_billing_rate: Number(row.ot_billing_rate) || 0,
        gps_enforcement: (cl.gps_enforcement as AssignedClient["gps_enforcement"]) || "warn",
        geofence_radius_meters: Number(cl.geofence_radius_meters) || 300,
        lat: cl.lat != null ? Number(cl.lat) : null,
        lng: cl.lng != null ? Number(cl.lng) : null,
        is_primary: !!row.is_primary,
      });
    }

    const primary =
      assignedClients.find((x) => x.is_primary) ?? assignedClients[0] ?? null;
    const primaryRates = primary
      ? { billing_rate: primary.billing_rate, ot_billing_rate: primary.ot_billing_rate }
      : null;

    const workerPay: WorkerPayProfile = {
      pay_type: (w.pay_type as WorkerPayProfile["pay_type"]) ?? "hourly",
      pay_rate: w.pay_rate != null ? Number(w.pay_rate) : w.hourly_rate != null ? Number(w.hourly_rate) : null,
      ot_pay_rate: w.ot_pay_rate != null ? Number(w.ot_pay_rate) : null,
      flat_weekly_rate: w.flat_weekly_rate != null ? Number(w.flat_weekly_rate) : null,
    };

    setProfile({
      id: w.id as string,
      company_id: w.company_id as string,
      full_name: (w.full_name as string | null) ?? null,
      hourly_rate: w.hourly_rate != null ? Number(w.hourly_rate) : null,
      truck_label,
      company_name: (c?.name as string | undefined) ?? null,
      created_at: (w.created_at as string | null) ?? null,
      worker_type: (w.worker_type as DriverProfile["worker_type"]) ?? "1099",
      pay_type: workerPay.pay_type,
      pay_rate: workerPay.pay_rate,
      ot_pay_rate: workerPay.ot_pay_rate,
      flat_weekly_rate: workerPay.flat_weekly_rate,
      default_client_id: (w.default_client_id as string | null) ?? null,
      vault_enabled: !!w.vault_enabled,
      vault_percentage: w.vault_percentage != null ? Number(w.vault_percentage) : 20,
      company: {
        ot_weekly_threshold: c?.ot_weekly_threshold != null ? Number(c.ot_weekly_threshold) : 40,
        gps_enabled: !!c?.gps_enabled,
        vault_enabled: c?.vault_enabled !== false,
      },
      assignedClients,
      primaryRates,
      workerPay,
    });
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(
    () => ({ profile, loading, error, refresh: load }),
    [profile, loading, error, load],
  );

  return <DriverCtx.Provider value={value}>{children}</DriverCtx.Provider>;
}
