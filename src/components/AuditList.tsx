import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nameOf, useMe, useProfiles } from "@/lib/auth";

export function AuditList({ resourceIds }: { resourceIds?: string[] }) {
  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const ids = resourceIds?.filter(Boolean);
  const { data, isLoading } = useQuery({
    queryKey: ["audit", ids?.join(",") ?? "all"],
    enabled: !!me?.canAudit,
    queryFn: async () => {
      let q = supabase.from("audit_events").select("*").order("id", { ascending: false }).limit(500);
      if (ids) q = q.in("resource_id", ids);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
  if (me && !me.canAudit) return <p className="panel text-sm text-muted-foreground">Audit history is visible to Administrators, QA Reviewers and Auditors.</p>;
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["#", "Time (UTC)", "Actor", "Action", "Resource", "Details", "Hash"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {data?.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No events.</td></tr>}
          {data?.map((e) => (
            <tr key={e.id} className="border-b last:border-0 align-top">
              <td className="px-3 py-2 text-xs">{e.id}</td>
              <td className="px-3 py-2 whitespace-nowrap text-xs">{new Date(e.at).toISOString().replace("T", " ").slice(0, 19)}</td>
              <td className="px-3 py-2">{e.actor ? nameOf(profiles, e.actor) : "system"}</td>
              <td className="px-3 py-2 font-medium">{e.action}</td>
              <td className="px-3 py-2 text-xs">{e.resource_type}</td>
              <td className="px-3 py-2 max-w-72 truncate font-mono text-xs" title={JSON.stringify(e.summary)}>{e.summary ? JSON.stringify(e.summary) : ""}</td>
              <td className="px-3 py-2 font-mono text-xs" title={e.hash}>{e.hash.slice(0, 12)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
