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

      <div className="mt-8 overflow-x-auto rounded-xl border border-[#0f1729]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#0f1729] bg-[#03060D] text-[11px] font-bold uppercase tracking-wider text-[#4E6D92]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Abbr</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Geofence</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#4E6D92]">
                  No clients yet. Add your first site.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-[#0f1729] last:border-0">
                  <td className="px-4 py-3 font-medium text-[#F1F5FF]">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-[#2563EB]/35 bg-[#2563EB]/10 px-2.5 py-0.5 font-jb text-xs text-[#93C5FD]">
                      {r.abbreviation}
                    </span>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-[#4E6D92]">{r.address ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#4E6D92]">
                    <span className="font-jb text-[#F1F5FF]">{r.geofence_radius_meters}m</span>
                    <span className="mx-1">·</span>
                    <span className="uppercase">{r.gps_enforcement}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#0f1729] px-3 py-1.5 text-xs font-semibold text-[#93C5FD] transition hover:border-[#2563EB]/40"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
