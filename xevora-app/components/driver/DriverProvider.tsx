"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

export type DriverProfile = {
  id: string;
  company_id: string;
  full_name: string | null;
  hourly_rate: number | null;
  truck_label: string | null;
  company_name: string | null;
  created_at: string | null;
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
      .select("id, company_id, full_name, hourly_rate, created_at, truck_id")
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

    const { data: c } = await supabase.from("companies").select("name").eq("id", w.company_id).maybeSingle();

    setProfile({
      id: w.id as string,
      company_id: w.company_id as string,
      full_name: (w.full_name as string | null) ?? null,
      hourly_rate: w.hourly_rate != null ? Number(w.hourly_rate) : null,
      truck_label,
      company_name: (c?.name as string | undefined) ?? null,
      created_at: (w.created_at as string | null) ?? null,
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
