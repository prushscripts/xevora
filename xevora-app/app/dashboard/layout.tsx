import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardShellMotion from "@/components/dashboard/DashboardShellMotion";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { createClient } from "@/lib/supabase-server";

function getUserDisplayName(email: string | undefined, firstName: unknown) {
  if (typeof firstName === "string" && firstName.trim()) {
    return firstName.trim();
  }

  if (!email) return "Admin";
  const prefix = email.split("@")[0];
  return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "Admin";
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: workerRow } = await supabase.from("workers").select("role").eq("user_id", user.id).maybeSingle();

  if (workerRow?.role === "driver") {
    redirect("/driver");
  }

  const userName = getUserDisplayName(user?.email, user?.user_metadata?.first_name);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <DashboardShellMotion userName={userName}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </DashboardShellMotion>
    </div>
  );
}
