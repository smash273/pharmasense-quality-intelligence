import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "investigator" | "qa_reviewer" | "auditor";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  investigator: "Investigator",
  qa_reviewer: "QA Reviewer",
  auditor: "Read-Only Auditor",
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      ]);
      const r = (roles ?? []).map((x) => x.role as AppRole);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        profile,
        roles: r,
        isAdmin: r.includes("admin"),
        canWrite: r.some((x) => x !== "auditor"),
        isReviewer: r.includes("qa_reviewer") || r.includes("admin"),
        canAudit: r.some((x) => x === "admin" || x === "auditor" || x === "qa_reviewer"),
      };
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email, department");
      if (error) throw error;
      return data;
    },
  });
}

export function nameOf(profiles: { id: string; full_name: string | null; email: string | null }[] | undefined, id?: string | null) {
  if (!id) return "—";
  const p = profiles?.find((x) => x.id === id);
  return p?.full_name || p?.email || id.slice(0, 8);
}
