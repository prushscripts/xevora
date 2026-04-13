import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DriverBottomNav from "@/components/driver/DriverBottomNav";
import DriverHeader from "@/components/driver/DriverHeader";
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

  // Only check role once at layout level — middleware already protects /driver routes
  // Pass user id to provider so it only fetches worker data ONCE and caches it
  return (
    <DriverProvider userId={user.id}>
      <div className="min-h-dvh bg-[#03060D] text-[#F1F5FF]">
        <div className="mx-auto min-h-dvh w-full max-w-[430px] px-4 pb-28 pt-5">
          <DriverHeader />
          {children}
        </div>
        <DriverBottomNav />
      </div>
    </DriverProvider>
  );
}
