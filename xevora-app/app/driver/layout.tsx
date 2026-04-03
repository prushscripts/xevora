import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DriverBottomNav from "@/components/driver/DriverBottomNav";
import DriverProvider from "@/components/driver/DriverProvider";
import { createClient } from "@/lib/supabase-server";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: worker } = await supabase.from("workers").select("role").eq("user_id", user.id).maybeSingle();

  if (worker?.role !== "driver") {
    redirect("/dashboard");
  }

  return (
    <DriverProvider>
      <div className="min-h-dvh bg-[#03060D] text-[#F1F5FF]">
        <div className="mx-auto min-h-dvh w-full max-w-[430px] px-4 pb-28 pt-5">{children}</div>
        <DriverBottomNav />
      </div>
    </DriverProvider>
  );
}
