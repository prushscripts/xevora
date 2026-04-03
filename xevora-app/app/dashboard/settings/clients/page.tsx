"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const GeofenceMap = dynamic(() => import("@/components/settings/GeofenceMap"), { ssr: false });

type GpsEnforcement = "off" | "warn" | "block";

interface Client {
  id: string;
  name: string;
  abbreviation: string;
  address: string;
  gps_enforcement: GpsEnforcement;
  geofence_radius: number;
  geofence_lat: number | null;
  geofence_lng: number | null;
  company_id: string;
}

interface ClientFormData {
  name: string;
  abbreviation: string;
  address: string;
  gps_enforcement: GpsEnforcement;
  geofence_radius: number;
  geofence_lat: number;
  geofence_lng: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    abbreviation: "",
    address: "",
    gps_enforcement: "off",
    geofence_radius: 500,
    geofence_lat: 41.4048,
    geofence_lng: -74.3279,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchClients();
    subscribeToClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return;

    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("name");

    setClients(data || []);
    setLoading(false);
  }

  function subscribeToClients() {
    const channel = supabase
      .channel("clients-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  function openAddPanel() {
    setEditingClient(null);
    setFormData({
      name: "",
      abbreviation: "",
      address: "",
      gps_enforcement: "off",
      geofence_radius: 500,
      geofence_lat: 41.4048,
      geofence_lng: -74.3279,
    });
    setPanelOpen(true);
  }

  function openEditPanel(client: Client) {
    setEditingClient(client);
    setFormData({
      name: client.name,
      abbreviation: client.abbreviation,
      address: client.address,
      gps_enforcement: client.gps_enforcement,
      geofence_radius: client.geofence_radius,
      geofence_lat: client.geofence_lat || 41.4048,
      geofence_lng: client.geofence_lng || -74.3279,
    });
    setPanelOpen(true);
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) return;

    const payload = {
      ...formData,
      company_id: profile.company_id,
    };

    if (editingClient) {
      await supabase.from("clients").update(payload).eq("id", editingClient.id);
    } else {
      await supabase.from("clients").insert(payload);
    }

    setPanelOpen(false);
    fetchClients();
  }

  async function handleDelete(id: string) {
    await supabase.from("clients").delete().eq("id", id);
    setDeleteConfirm(null);
    fetchClients();
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-extrabold text-[#F1F5FF]">Clients</h1>
          <p className="mt-1 text-sm text-[#4E6D92]">Manage client locations and GPS enforcement</p>
        </div>
        <button
          onClick={openAddPanel}
          className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
        >
          + Add Client
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[#060B14]" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(37,99,235,0.2)] bg-[#060B14] p-12 text-center">
          <p className="text-sm text-[#4E6D92]">No clients yet. Add your first client to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[rgba(37,99,235,0.12)] bg-[#060B14]">
          <table className="w-full">
            <thead className="border-b border-[rgba(37,99,235,0.12)] bg-[rgba(3,6,13,0.5)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">Abbreviation</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">Radius</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4E6D92]">Enforcement</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#4E6D92]">Actions</th>
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
                  <td className="px-6 py-4 text-sm text-[#8BA4C0]">{client.address || "—"}</td>
                  <td className="px-6 py-4 text-sm text-[#8BA4C0]">{client.geofence_radius}m</td>
                  <td className="px-6 py-4">{getEnforcementBadge(client.gps_enforcement)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditPanel(client)}
                      className="mr-3 text-sm font-medium text-[#3B82F6] hover:text-[#60A5FA]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(client.id)}
                      className="text-sm font-medium text-[#EF4444] hover:text-[#F87171]"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-in Panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setPanelOpen(false)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-[#03060D] p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-sans text-xl font-extrabold text-[#F1F5FF]">
                {editingClient ? "Edit Client" : "Add Client"}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="text-2xl text-[#4E6D92] hover:text-[#F1F5FF]">
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#F1F5FF]">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-[rgba(37,99,235,0.2)] bg-[#060B14] px-4 py-2.5 text-sm text-[#F1F5FF] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Acme Corporation"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F1F5FF]">
                  Abbreviation <span className="font-jb text-xs text-[#4E6D92]">({formData.abbreviation.length}/8)</span>
                </label>
                <input
                  type="text"
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase().slice(0, 8) })}
                  className="font-jb w-full rounded-lg border border-[rgba(37,99,235,0.2)] bg-[#060B14] px-4 py-2.5 text-sm uppercase text-[#F1F5FF] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="ACME"
                  maxLength={8}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F1F5FF]">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-[rgba(37,99,235,0.2)] bg-[#060B14] px-4 py-2.5 text-sm text-[#F1F5FF] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F1F5FF]">GPS Enforcement</label>
                <div className="flex gap-2">
                  {(["off", "warn", "block"] as GpsEnforcement[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFormData({ ...formData, gps_enforcement: mode })}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium uppercase transition ${
                        formData.gps_enforcement === mode
                          ? mode === "off"
                            ? "border-[#4E6D92] bg-[rgba(78,109,146,0.15)] text-[#F1F5FF]"
                            : mode === "warn"
                            ? "border-[#FBB724] bg-[rgba(251,191,36,0.15)] text-[#FBB724]"
                            : "border-[#EF4444] bg-[rgba(239,68,68,0.15)] text-[#EF4444]"
                          : "border-[rgba(37,99,235,0.2)] bg-[#060B14] text-[#4E6D92] hover:border-[rgba(37,99,235,0.3)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F1F5FF]">
                  Geofence Radius: <span className="font-jb text-[#3B82F6]">{formData.geofence_radius}m</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={formData.geofence_radius}
                  onChange={(e) => setFormData({ ...formData, geofence_radius: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F1F5FF]">Map Preview</label>
                <GeofenceMap
                  lat={formData.geofence_lat}
                  lng={formData.geofence_lng}
                  radius={formData.geofence_radius}
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full rounded-lg bg-[#2563EB] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
              >
                Save Client
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[rgba(37,99,235,0.2)] bg-[#060B14] p-6 shadow-2xl">
            <h3 className="mb-2 font-sans text-lg font-bold text-[#F1F5FF]">Delete Client</h3>
            <p className="mb-6 text-sm text-[#8BA4C0]">Are you sure you want to delete this client? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-[rgba(37,99,235,0.3)] bg-transparent px-4 py-2 text-sm font-medium text-[#F1F5FF] transition hover:bg-[rgba(37,99,235,0.05)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#DC2626]"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
