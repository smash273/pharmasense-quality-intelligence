import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { nameOf, useProfiles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/capa/")({
  head: () => ({ meta: [{ title: "CAPA — PharmaSense" }] }),
  component: CapaList,
});

const isOverdue = (c: { due_date: string; status: string }) =>
  c.due_date < new Date().toISOString().slice(0, 10) && ["proposed", "assigned", "in_progress"].includes(c.status);

function CapaList() {
  const { data: profiles } = useProfiles();
  const [f, setF] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["capas"],
    queryFn: async () => (await supabase.from("capas").select("*, deviations(code)").order("due_date")).data ?? [],
  });
  const all = data ?? [];
  const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const done = all.filter((c) => ["effective", "closed"].includes(c.status)).length;
  const kpis: [string, number | string, string][] = [
    ["Open", all.filter((c) => !["effective", "ineffective", "closed"].includes(c.status)).length, "open"],
    ["Overdue", all.filter(isOverdue).length, "overdue"],
    ["Due in 14 days", all.filter((c) => !isOverdue(c) && c.due_date <= soon && ["proposed", "assigned", "in_progress"].includes(c.status)).length, "soon"],
    ["Pending verification", all.filter((c) => c.status === "pending_verification").length, "pending_verification"],
    ["Completion rate", all.length ? `${Math.round((done / all.length) * 100)}%` : "—", ""],
  ];
  const rows = all.filter((c) => !f || (f === "overdue" ? isOverdue(c) : f === "soon" ? !isOverdue(c) && c.due_date <= soon && ["proposed", "assigned", "in_progress"].includes(c.status) : f === "open" ? !["effective", "ineffective", "closed"].includes(c.status) : c.status === f));
  return (
    <div className="space-y-4">
      <h1 className="page-title">CAPA register</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map(([l, v, k]) => (
          <button key={l} onClick={() => setF(f === k ? "" : k)} className={`panel !p-4 text-left ${f === k && k ? "ring-2 ring-ring" : ""}`}><div className="field-label">{l}</div><div className="text-2xl font-semibold">{v}</div></button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Create CAPAs from a deviation's CAPA tab so they stay linked to the investigation.</p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><tr>{["CAPA", "Deviation", "Type", "Action", "Owner", "Priority", "Due", "Status"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No CAPAs.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs"><Link to="/capa/$id" params={{ id: c.id }} className="text-primary">{c.code}</Link></td>
                <td className="px-3 py-2 font-mono text-xs">{c.deviations?.code ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{c.kind}</td>
                <td className="px-3 py-2 max-w-72 truncate">{c.action}</td>
                <td className="px-3 py-2">{nameOf(profiles, c.owner_id)}</td>
                <td className="px-3 py-2 capitalize">{c.priority}</td>
                <td className="px-3 py-2 whitespace-nowrap">{c.due_date}</td>
                <td className="px-3 py-2 space-x-1"><StatusBadge value={c.status} />{isOverdue(c) && <StatusBadge value="overdue" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
