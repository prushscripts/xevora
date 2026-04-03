"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStaffCompanyId } from "@/lib/staffCompany";
import { createClient } from "@/lib/supabase";

type ClientLite = {
  id: string;
  name: string;
  abbreviation: string;
  gps_enforcement: string;
  geofence_radius_meters: number;
};

export default function SettingsGpsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { companyId: cid } = await getStaffCompanyId(supabase);
    setCompanyId(cid);
    if (!cid) {
      setLoading(false);
      return;
    }
    const { data: c } = await supabase.from("companies").select("gps_enabled").eq("id", cid).maybeSingle();
    setGpsEnabled(!!c?.gps_enabled);
    const { data: cl } = await supabase
      .from("clients")
      .select("id, name, abbreviation, gps_enforcement, geofence_radius_meters")
      .eq("company_id", cid)
      .order("name");
    setClients((cl as ClientLite[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleMaster = async () => {
    if (!companyId) return;
    setSaving(true);
    setMsg(null);
    const next = !gpsEnabled;
    const { error } = await supabase.from("companies").update({ gps_enabled: next }).eq("id", companyId);
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setGpsEnabled(next);
    setMsg(next ? "GPS punch verification enabled for your company." : "Master GPS disabled.");
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-[#03060D]" />;
  }

  if (!companyId) {
    return <p className="text-sm text-[#4E6D92]">No company workspace found.</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#F1F5FF]">GPS</h2>
      <p className="mt-1 text-sm text-[#4E6D92]">
        When enabled, workers punch against client locations; each client can warn or block outside the radius.
      </p>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-[#0f1729] bg-[#03060D] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#F1F5FF]">Master GPS</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#4E6D92]">
            Turn on to require location capture on clock-in/out (subject to each client&apos;s enforcement: off, warn, or
            block).
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void toggleMaster()}
          className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold ${
            gpsEnabled
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border border-[#0f1729] bg-[#060B14] text-[#4E6D92]"
          }`}
        >
          {gpsEnabled ? "ON" : "OFF"}
        </button>
      </div>

      {msg ? <p className="mt-4 text-sm text-[#93C5FD]">{msg}</p> : null}

      <div className="mt-10 overflow-x-auto rounded-xl border border-[#0f1729]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-[#0f1729] bg-[#03060D] text-[11px] font-bold uppercase tracking-wider text-[#4E6D92]">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Enforcement</th>
              <th className="px-4 py-3">Radius</th>
              <th className="px-4 py-3 text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#4E6D92]">
                  No clients yet.{" "}
                  <Link href="/settings/clients" className="text-[#3B82F6] underline-offset-2 hover:underline">
                    Add a client
                  </Link>
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-b border-[#0f1729] last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#F1F5FF]">{c.name}</span>
                    <span className="ml-2 font-jb text-xs text-[#4E6D92]">{c.abbreviation}</span>
                  </td>
                  <td className="px-4 py-3 font-jb text-xs uppercase text-[#93C5FD]">{c.gps_enforcement}</td>
                  <td className="px-4 py-3 font-jb text-xs text-[#4E6D92]">{c.geofence_radius_meters}m</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href="/settings/clients"
                      className="text-xs font-semibold text-[#3B82F6] hover:underline"
                    >
                      Clients →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
