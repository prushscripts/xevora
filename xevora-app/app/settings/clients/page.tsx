"use client";

import { PlusIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientForm, { type ClientRow } from "@/components/settings/ClientForm";
import { getStaffCompanyId } from "@/lib/staffCompany";
import { createClient } from "@/lib/supabase";

export default function SettingsClientsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { companyId: cid } = await getStaffCompanyId(supabase);
    setCompanyId(cid);
    if (!cid) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", cid)
      .order("name");
    if (!error && data) {
      setRows(data as ClientRow[]);
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setPanelOpen(true);
  };

  const openEdit = (c: ClientRow) => {
    setEditing(c);
    setPanelOpen(true);
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-[#03060D]" />;
  }

  if (!companyId) {
    return <p className="text-sm text-[#4E6D92]">No company workspace found for this account.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#F1F5FF]">Clients</h2>
          <p className="mt-1 text-sm text-[#4E6D92]">Sites where your workforce clocks in. Geofence per client.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
        >
          <PlusIcon className="h-5 w-5" />
          Add client
        </button>
      </div>

      <div className="mt-8">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#0f1729] bg-[#03060D] px-4 py-10 text-center text-[#4E6D92]">
            No clients yet. Add your first site.
          </div>
        ) : (
          rows.map((client) => (
            <div
              key={client.id}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{client.name}</div>
                  <div style={{ fontSize: 12, color: "#4E6D92", marginTop: 2, wordBreak: "break-word" }}>
                    {client.address ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#4E6D92", marginTop: 6 }}>
                    {client.geofence_radius_meters}m · {String(client.gps_enforcement).toUpperCase()}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div
                    style={{
                      background: "rgba(37,99,235,0.15)",
                      border: "1px solid rgba(37,99,235,0.3)",
                      color: "#60A5FA",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 6,
                      letterSpacing: "0.06em",
                      fontFamily: "monospace",
                    }}
                  >
                    {client.abbreviation}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(client)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#0f1729] px-2.5 py-1.5 text-xs font-semibold text-[#93C5FD] transition hover:border-[#2563EB]/40"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ClientForm
        open={panelOpen}
        companyId={companyId}
        client={editing}
        onClose={() => setPanelOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
