import type { SupabaseClient } from "@supabase/supabase-js";

/** Company id for the signed-in owner, admin, or manager. */
export async function getStaffCompanyId(
  supabase: SupabaseClient,
): Promise<{ companyId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { companyId: null };

  const { data: owned } = await supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle();
  if (owned?.id) return { companyId: owned.id as string };

  const { data: w } = await supabase
    .from("workers")
    .select("company_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (w && (w.role === "admin" || w.role === "manager")) {
    return { companyId: w.company_id as string };
  }
  return { companyId: null };
}
