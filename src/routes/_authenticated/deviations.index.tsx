import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { nameOf, useMe, useProfiles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/deviations/")({
  head: () => ({ meta: [{ title: "Deviations — PharmaSense" }] }),
  component: List,
});

const PAGE = 15;

function List() {
  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const [q, setQ] = useState("");
  const [sev, setSev] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["deviations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deviations").select("*, capas(id)").order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const rows = useMemo(() => (data ?? []).filter((d) =>
    (!sev || d.severity === sev) && (!status || d.status === status) &&
    (!q || [d.code, d.title, d.product, d.batch, d.equipment, d.category].join(" ").toLowerCase().includes(q.toLowerCase()))), [data, q, sev, status]);
  const sel = "h-9 rounded-md border bg-card px-2 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Deviation register</h1>
        {me?.canWrite && <Button asChild><Link to="/deviations/new">New deviation</Link></Button>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search ID, title, product, batch…" aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select aria-label="Severity" className={sel} value={sev} onChange={(e) => setSev(e.target.value)}><option value="">All severities</option>{["low", "medium", "high", "critical"].map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Status" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{["open", "under_investigation", "draft_report", "pending_review", "revision_requested", "approved", "closed"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>{["ID", "Title", "Product / Batch", "Equipment", "Category", "Severity", "Detected", "Owner", "Status", "CAPAs"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {error && <tr><td colSpan={10} className="p-6 text-center text-destructive">{(error as Error).message}</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No deviations match.</td></tr>}
            {rows.slice(page * PAGE, page * PAGE + PAGE).map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs"><Link to="/deviations/$id" params={{ id: d.id }} className="text-primary hover:underline">{d.code}</Link>{d.is_demo && <span className="ml-1 rounded bg-warning/15 px-1 text-[10px] text-warning">DEMO</span>}</td>
                <td className="px-3 py-2 max-w-64 truncate">{d.title}</td>
                <td className="px-3 py-2">{d.product}<div className="text-xs text-muted-foreground">{d.batch}</div></td>
                <td className="px-3 py-2">{d.equipment ?? "—"}</td>
                <td className="px-3 py-2">{d.category}</td>
                <td className="px-3 py-2"><StatusBadge value={d.severity} /></td>
                <td className="px-3 py-2 whitespace-nowrap">{d.detected_at.slice(0, 10)}</td>
                <td className="px-3 py-2">{nameOf(profiles, d.owner_id)}</td>
                <td className="px-3 py-2"><StatusBadge value={d.status} /></td>
                <td className="px-3 py-2">{d.capas.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > PAGE && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page + 1} / {Math.ceil(rows.length / PAGE)}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
