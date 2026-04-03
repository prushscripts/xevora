"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type GpsEnforcement = "off" | "warn" | "block";

interface Client {
  id: string;
  name: string;
  abbreviation: string;
  gps_enforcement: GpsEnforcement;
  geofence_radius: number;
}

export default function GpsPage() {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return;

    setCompanyId(profile.company_id);

    const { data: company } = await supabase
      .from("companies")
      .select("gps_enabled")
      .eq("id", profile.company_id)
      .single();

    if (company) {
      setGpsEnabled(company.gps_enabled || false);
    }

    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, abbreviation, gps_enforcement, geofence_radius")
      .eq("company_id", profile.company_id)
      .order("name");

    setClients(clientsData || []);
    setLoading(false);
  }

  async function handleToggleGps() {
    if (!companyId) return;
    setSaving(true);

    const newValue = !gpsEnabled;
    await supabase
      .from("companies")
      .update({ gps_enabled: newValue })
      .eq("id", companyId);

    setGpsEnabled(newValue);
    setSaving(false);
  }

  function getEnforcementBadge(enforcement: GpsEnforcement) {
    const styles = {
      off: "bg-[rgba(78,109,146,0.1)] text-[#4E6D92] border-[rgba(78,109,146,0.2)]",
      warn: "bg-[rgba(251,191,36,0.1)] text-[#FBB724] border-[rgba(251,191,36,0.25)]",
      block: "bg-[rgba(239,68,68,0.1)] text-[#EF4444] border-[rgba(239,68,68,0.25)]",
    };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${styles[enforcement]}`}>
        {enforcement}
      </span>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-extrabold text-[#F1F5FF]">GPS & Geofencing</h1>
        <p className="mt-1 text-sm text-[#4E6D92]">Configure location verification and client geofences</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-[#060B14]" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Master GPS Toggle Card */}
          <div className="rounded-2xl border border-[rgba(37,99,235,0.12)] bg-[#060B14] p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h2 className="mb-2 font-sans text-lg font-bold text-[#F1F5FF]">
                  Require location verification on clock in
                </h2>
                <p className="text-sm leading-relaxed text-[#8BA4C0]">
                  When enabled, workers must be within the client geofence to punch in. Individual client enforcement
                  settings determine whether violations are blocked or just warned.
                </p>
              </div>
              <button
                onClick={handleToggleGps}
                disabled={saving}
                className={`relative h-10 w-20 flex-shrink-0 rounded-full transition ${
                  gpsEnabled ? "bg-[#2563EB]" : "bg-[#1E3050]"
                } ${saving ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-lg transition ${
                    gpsEnabled ? "left-11" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Per-Client Enforcement Table */}
          <div className="rounded-2xl border border-[rgba(37,99,235,0.12)] bg-[#060B14] p-6">
            <h2 className="mb-4 font-sans text-lg font-bold text-[#F1F5FF]">Client Enforcement Settings</h2>

            {clients.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[rgba(37,99,235,0.2)] bg-[rgba(3,6,13,0.5)] p-8 text-center">
                <p className="text-sm text-[#4E6D92]">
                  No clients configured yet.{" "}
                  <Link href="/dashboard/settings/clients" className="text-[#3B82F6] hover:text-[#60A5FA]">
                    Add a client
                  </Link>{" "}
                  to configure GPS enforcement.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-[rgba(37,99,235,0.12)]">
                <table className="w-full">
                  <thead className="border-b border-[rgba(37,99,235,0.12)] bg-[rgba(3,6,13,0.5)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">
                        Abbreviation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">
                        Enforcement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">
                        Radius
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#4E6D92]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(37,99,235,0.08)]">
                    {clients.map((client) => (
                      <tr key={client.id} className="transition hover:bg-[rgba(37,99,235,0.02)]">
                        <td className="px-6 py-4 text-sm font-medium text-[#F1F5FF]">{client.name}</td>
                        <td className="px-6 py-4">
                          <span className="font-jb inline-block rounded-md bg-[rgba(37,99,235,0.1)] px-2 py-1 text-xs font-medium uppercase tracking-wider text-[#3B82F6]">
                            {client.abbreviation}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getEnforcementBadge(client.gps_enforcement)}</td>
                        <td className="px-6 py-4 text-sm text-[#8BA4C0]">{client.geofence_radius}m</td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href="/dashboard/settings/clients"
                            className="text-sm font-medium text-[#3B82F6] hover:text-[#60A5FA]"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-[rgba(37,99,235,0.15)] bg-[rgba(37,99,235,0.04)] p-4">
              <p className="text-xs text-[#8BA4C0]">
                ℹ️ Individual client enforcement settings are managed in the{" "}
                <Link href="/dashboard/settings/clients" className="font-medium text-[#3B82F6] hover:text-[#60A5FA]">
                  Clients
                </Link>{" "}
                section.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
