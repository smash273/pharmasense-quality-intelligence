import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { nameOf, useProfiles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports — PharmaSense" }] }),
  component: Reports,
});

function Reports() {
  const { data: profiles } = useProfiles();
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => (await supabase.from("reports").select("id, code, version, status, created_by, created_at, reviewed_at, deviations(code, title)").order("created_at", { ascending: false })).data ?? [],
  });
  const rows = (data ?? []).filter((r) => (!st || r.status === st) && (!q || `${r.code} ${r.deviations?.code} ${r.deviations?.title}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      <h1 className="page-title">Report library</h1>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search…" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Status" className="h-9 rounded-md border bg-card px-2 text-sm" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All statuses</option>{["draft_ai", "draft", "pending_review", "revision_requested", "approved", "superseded"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["Report", "Deviation", "Version", "Created by", "Created", "Status", "Approved"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No reports. Generate one from a deviation's Reports tab.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs"><Link to="/reports/$id" params={{ id: r.id }} className="text-primary">{r.code}</Link></td>
                <td className="px-3 py-2">{r.deviations?.code} · {r.deviations?.title}</td>
                <td className="px-3 py-2">v{r.version}</td>
                <td className="px-3 py-2">{nameOf(profiles, r.created_by)}</td>
                <td className="px-3 py-2 text-xs">{r.created_at.slice(0, 10)}</td>
                <td className="px-3 py-2"><StatusBadge value={r.status} /></td>
                <td className="px-3 py-2 text-xs">{r.status === "approved" && r.reviewed_at ? r.reviewed_at.slice(0, 10) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
