import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useMe, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — PharmaSense" }] }),
  component: Users,
});

const MATRIX: [string, boolean, boolean, boolean, boolean][] = [
  ["View records", true, true, true, true],
  ["Create / edit deviations & investigations", true, true, true, false],
  ["Generate AI reports, submit for review", true, true, true, false],
  ["Approve / request revision (not own reports)", true, false, true, false],
  ["Verify / close CAPAs", true, false, true, false],
  ["View audit trail & verify integrity", true, false, true, true],
  ["Manage users & roles, demo data", true, false, false, false],
];

function Users() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*")]);
      return (p.data ?? []).map((u) => ({ ...u, role: r.data?.find((x) => x.user_id === u.id)?.role as AppRole | undefined }));
    },
  });
  if (me && !me.isAdmin) return <p className="text-muted-foreground">Administrator access required.</p>;
  async function setRole(id: string, role: AppRole) {
    const { error } = await supabase.rpc("set_user_role", { _user: id, _role: role });
    if (error) return toast.error(error.message);
    toast.success("Role updated"); qc.invalidateQueries();
  }
  return (
    <div className="space-y-6">
      <h1 className="page-title">Users & roles</h1>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2">Role</th></tr></thead>
          <tbody>{data?.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="px-3 py-2">{u.full_name}</td><td className="px-3 py-2">{u.email}</td><td className="px-3 py-2 text-xs">{u.created_at.slice(0, 10)}</td>
              <td className="px-3 py-2"><select aria-label={`Role for ${u.email}`} className="h-8 rounded-md border bg-card px-2" value={u.role ?? ""} onChange={(e) => setRole(u.id, e.target.value as AppRole)}>{(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></td>
            </tr>))}</tbody>
        </table>
      </div>
      <div className="panel overflow-x-auto">
        <h3 className="section-title mb-3">Permission matrix (enforced in the database)</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Capability</th>{Object.values(ROLE_LABEL).map((r) => <th key={r} className="py-1">{r}</th>)}</tr></thead>
          <tbody>{MATRIX.map(([c, ...v]) => <tr key={c} className="border-t"><td className="py-1.5">{c}</td>{v.map((x, i) => <td key={i}>{x ? "✓" : "—"}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
