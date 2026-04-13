"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getStaffCompanyId } from "@/lib/staffCompany";
import { createClient } from "@/lib/supabase";

type Worker = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  pay_type: string;
  user_id: string | null;
  worker_clients: Array<{ clients: { name: string; abbreviation: string } | { name: string; abbreviation: string }[] | null }>;
};

export default function WorkersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<{ id: string; driver_invite_code: string | null } | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { companyId } = await getStaffCompanyId(supabase);
      if (!companyId) {
        setCompany(null);
        setWorkers([]);
        setLoading(false);
        return;
      }

      const { data: companyData } = await supabase
        .from("companies")
        .select("id, driver_invite_code")
        .eq("id", companyId)
        .maybeSingle();
      setCompany((companyData as { id: string; driver_invite_code: string | null } | null) ?? null);

      const { data } = await supabase
        .from("workers")
        .select("id, first_name, last_name, role, pay_type, user_id, worker_clients(clients(name, abbreviation))")
        .eq("company_id", companyId);
      setWorkers(((data as unknown as Worker[]) ?? []));
      setLoading(false);
    }
    void load();
  }, [supabase]);

  if (loading) {
    return <div style={{ padding: 20, color: "#4E6D92", fontSize: 14 }}>Loading workers...</div>;
  }

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Workers</h1>
        <Link
          href="/dashboard/workers/new"
          style={{
            background: "#2563EB",
            color: "white",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          + Add worker
        </Link>
      </div>

      <p style={{ fontSize: 12, color: "#4E6D92", marginBottom: 16 }}>
        {workers.length} worker{workers.length !== 1 ? "s" : ""} on your team
      </p>

      {workers.length === 0 ? (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No workers yet</div>
          <div style={{ fontSize: 13, color: "#4E6D92", marginBottom: 20 }}>
            Add workers manually or share your invite code so they can sign up themselves.
          </div>
          <div
            style={{
              background: "rgba(37,99,235,0.1)",
              border: "1px solid rgba(37,99,235,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 11, color: "#4E6D92", marginBottom: 4 }}>Your invite code</div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "#3B82F6",
                letterSpacing: "0.2em",
              }}
            >
              {company?.driver_invite_code ?? "------"}
            </div>
          </div>
          <Link
            href="/dashboard/workers/new"
            style={{
              background: "#2563EB",
              color: "white",
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Add first worker
          </Link>
        </div>
      ) : (
        workers.map((worker) => (
          <div
            key={worker.id}
            onClick={() => router.push(`/dashboard/workers/${worker.id}`)}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 10,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "rgba(37,99,235,0.15)",
                    border: "1px solid rgba(37,99,235,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#3B82F6",
                  }}
                >
                  {(worker.first_name?.[0] ?? "?").toUpperCase()}
                  {(worker.last_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {worker.first_name} {worker.last_name}
                  </div>
                  <div style={{ fontSize: 12, color: "#4E6D92", marginTop: 2 }}>
                    {worker.role} · {worker.pay_type === "1099" ? "1099" : "W-2"}
                  </div>
                </div>
              </div>

              {worker.worker_clients?.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, marginLeft: 50, flexWrap: "wrap" }}>
                  {worker.worker_clients.map((wc, i) => (
                    <span
                      key={`${worker.id}-${i}`}
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        color: "#34D399",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontFamily: "monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {(Array.isArray(wc.clients) ? wc.clients[0]?.abbreviation : wc.clients?.abbreviation) ?? "—"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0, marginLeft: 12 }}>
              {worker.user_id ? (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981" }} />
              ) : (
                <div
                  style={{
                    fontSize: 10,
                    color: "#F59E0B",
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  No account
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
