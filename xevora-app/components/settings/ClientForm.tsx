"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { geocodeAddress } from "@/lib/geocode";
import { createClient } from "@/lib/supabase";

const GeofenceMap = dynamic(() => import("@/components/settings/GeofenceMap"), {
  ssr: false,
  loading: () => <div className="h-52 w-full animate-pulse rounded-xl border border-[#0f1729] bg-[#060B14]" />,
});

export type ClientRow = {
  id: string;
  company_id: string;
  name: string;
  abbreviation: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  geofence_radius_meters: number;
  gps_enforcement: "warn" | "block" | "off";
  active: boolean;
};

const DEFAULT_LAT = 41.4021;
const DEFAULT_LNG = -74.3243;

type Props = {
  open: boolean;
  companyId: string;
  client: ClientRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ClientForm({ open, companyId, client, onClose, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [address, setAddress] = useState("");
  const [gpsEnforcement, setGpsEnforcement] = useState<ClientRow["gps_enforcement"]>("warn");
  const [radius, setRadius] = useState(300);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (client) {
      setName(client.name);
      setAbbreviation(client.abbreviation);
      setAddress(client.address ?? "");
      setGpsEnforcement(client.gps_enforcement);
      setRadius(client.geofence_radius_meters);
      setLat(client.lat != null ? Number(client.lat) : null);
      setLng(client.lng != null ? Number(client.lng) : null);
    } else {
      setName("");
      setAbbreviation("");
      setAddress("");
      setGpsEnforcement("warn");
      setRadius(300);
      setLat(null);
      setLng(null);
    }
  }, [open, client]);

  const mapLat = lat ?? DEFAULT_LAT;
  const mapLng = lng ?? DEFAULT_LNG;

  const onGeocode = useCallback(async () => {
    setGeocodeBusy(true);
    setError(null);
    try {
      const hit = await geocodeAddress(address || name);
      if (!hit) {
        setError("Could not find that address. Try a fuller street + city + state.");
        return;
      }
      setLat(hit.lat);
      setLng(hit.lng);
      if (!address.trim()) setAddress(hit.displayName);
    } finally {
      setGeocodeBusy(false);
    }
  }, [address, name]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const abbr = abbreviation.trim().toUpperCase().slice(0, 8);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!abbr) {
      setError("Abbreviation is required (max 8 characters).");
      return;
    }

    setSaving(true);
    const payload = {
      company_id: companyId,
      name: name.trim(),
      abbreviation: abbr,
      address: address.trim() || null,
      lat: lat,
      lng: lng,
      geofence_radius_meters: Math.round(radius),
      gps_enforcement: gpsEnforcement,
      active: true,
    };

    if (client) {
      const { error: up } = await supabase.from("clients").update(payload).eq("id", client.id);
      setSaving(false);
      if (up) {
        setError(up.message);
        return;
      }
    } else {
      const { error: ins } = await supabase.from("clients").insert(payload);
      setSaving(false);
      if (ins) {
        setError(ins.message);
        return;
      }
    }
    onSaved();
    onClose();
  };

  const onDelete = async () => {
    if (!client) return;
    if (!confirm("Delete this client? Worker assignments may need to be updated.")) return;
    setSaving(true);
    const { error: del } = await supabase.from("clients").delete().eq("id", client.id);
    setSaving(false);
    if (del) {
      setError(del.message);
      return;
    }
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
      />
      <aside className="relative z-20 flex h-full w-full max-w-md flex-col border-l border-[#0f1729] bg-[#060B14] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#0f1729] px-5 py-4">
          <h2 className="text-lg font-extrabold text-[#F1F5FF]">{client ? "Edit client" : "Add client"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#4E6D92] transition hover:bg-[#03060D] hover:text-[#F1F5FF]"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#4E6D92]">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-3 text-sm text-[#F1F5FF] outline-none focus:border-[#2563EB]"
          />

          <label className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#4E6D92]">
            Abbreviation (auto-uppercase, max 8)
          </label>
          <input
            value={abbreviation}
            onChange={(e) => setAbbreviation(e.target.value.toUpperCase().slice(0, 8))}
            className="mt-1.5 rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-3 font-jb text-sm text-[#F1F5FF] outline-none focus:border-[#2563EB]"
            maxLength={8}
          />

          <label className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#4E6D92]">Address</label>
          <div className="mt-1.5 flex gap-2">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-[#0f1729] bg-[#03060D] px-4 py-3 text-sm text-[#F1F5FF] outline-none focus:border-[#2563EB]"
              placeholder="Street, city, state"
            />
            <button
              type="button"
              onClick={() => void onGeocode()}
              disabled={geocodeBusy}
              className="shrink-0 rounded-xl border border-[#2563EB]/40 bg-[#2563EB]/15 px-3 py-3 text-xs font-semibold text-[#93C5FD] disabled:opacity-50"
            >
              {geocodeBusy ? "…" : "Locate"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-[#4E6D92]">Map uses OpenStreetMap; pin position comes from address lookup.</p>

          <label className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#4E6D92]">
            GPS enforcement
          </label>
          <div className="mt-2 flex gap-2">
            {(["off", "warn", "block"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setGpsEnforcement(v)}
                className={`flex-1 rounded-xl border px-2 py-2.5 text-[11px] font-bold uppercase tracking-wide ${
                  gpsEnforcement === v
                    ? "border-[#2563EB] bg-[#2563EB]/20 text-[#93C5FD]"
                    : "border-[#0f1729] bg-[#03060D] text-[#4E6D92]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <label className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#4E6D92]">
            Geofence radius: <span className="font-jb text-[#F1F5FF]">{radius}m</span>
          </label>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-2 w-full accent-[#2563EB]"
          />

          <div className="mt-5">
            <GeofenceMap lat={mapLat} lng={mapLng} radiusMeters={radius} />
          </div>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-[#0f1729] pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] disabled:opacity-50"
            >
              {saving ? "Saving…" : client ? "Save changes" : "Create client"}
            </button>
            {client ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void onDelete()}
                className="rounded-xl border border-red-500/40 px-5 py-3 text-sm font-semibold text-red-300 disabled:opacity-50"
              >
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </aside>
    </div>
  );
}
