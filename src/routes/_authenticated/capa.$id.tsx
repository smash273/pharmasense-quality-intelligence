import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { AuditList } from "@/components/AuditList";
import { nameOf, useMe, useProfiles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/capa/$id")({
  head: () => ({ meta: [{ title: "CAPA — PharmaSense" }] }),
  component: CapaDetail,
});

function CapaDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const { data: c, isLoading, error } = useQuery({
    queryKey: ["capa", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("capas").select("*, deviations(id, code, title)").eq("id", id).single();
      if (error) throw new Error("CAPA not found or access denied.");
      return data;
    },
  });
  const [evidence, setEvidence] = useState("");
  useEffect(() => { if (c) setEvidence(c.evidence ?? ""); }, [c]);
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !c) return <p className="text-destructive">{(error as Error)?.message}</p>;
  const overdue = c.due_date < new Date().toISOString().slice(0, 10) && ["proposed", "assigned", "in_progress"].includes(c.status);

  async function update(patch: Record<string, unknown>, ok: string) {
    const { error } = await supabase.from("capas").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(ok);
    qc.invalidateQueries({ queryKey: ["capa", id] }); qc.invalidateQueries({ queryKey: ["audit"] });
  }
  const isOwnerOrWriter = me?.canWrite;
  const next: Record<string, [string, string][]> = {
    proposed: [["assigned", "Mark assigned"]],
    assigned: [["in_progress", "Start work"]],
    in_progress: [["pending_verification", "Submit for verification"]],
    ineffective: [["in_progress", "Rework action"]],
  };
  const qa: Record<string, [string, string][]> = {
    pending_verification: [["effective", "Verify effective"], ["ineffective", "Mark ineffective"]],
    effective: [["closed", "Close CAPA"]],
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs text-muted-foreground">{c.deviations && <Link to="/deviations/$id" params={{ id: c.deviations.id }} className="text-primary">{c.deviations.code}</Link>}</div>
        <h1 className="page-title">{c.code} · <span className="capitalize">{c.kind}</span> action</h1>
        <div className="mt-2 flex gap-2"><StatusBadge value={c.status} />{overdue && <StatusBadge value="overdue" />}</div>
      </div>
      <div className="panel grid gap-4 text-sm md:grid-cols-3">
        {([["Owner", nameOf(profiles, c.owner_id)], ["Department", c.department], ["Priority", c.priority], ["Due date", c.due_date], ["Completed", c.completed_at && new Date(c.completed_at).toLocaleString()], ["Verified by", c.verified_by && nameOf(profiles, c.verified_by)]] as const).map(([k, v]) => <div key={k}><div className="field-label">{k}</div>{v || "—"}</div>)}
        {([["Problem", c.problem], ["Action", c.action], ["Rationale", c.rationale], ["Effectiveness criteria", c.effectiveness_criteria]] as const).map(([k, v]) => <div key={k} className="md:col-span-3"><div className="field-label">{k}</div><p className="whitespace-pre-wrap">{v || "—"}</p></div>)}
      </div>
      <div className="panel space-y-3">
        <h3 className="section-title">Completion evidence</h3>
        <Textarea rows={4} disabled={!isOwnerOrWriter || ["effective", "closed"].includes(c.status)} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Describe evidence and document references (required before verification)" />
        <div className="flex flex-wrap gap-2">
          {isOwnerOrWriter && !["effective", "closed"].includes(c.status) && <Button variant="secondary" onClick={() => update({ evidence }, "Evidence saved")}>Save evidence</Button>}
          {isOwnerOrWriter && next[c.status]?.map(([s, l]) => <Button key={s} onClick={() => update({ status: s, evidence }, "Status updated")}>{l}</Button>)}
          {me?.isReviewer && qa[c.status]?.map(([s, l]) => <Button key={s} variant={s === "ineffective" ? "destructive" : "default"} onClick={() => update({ status: s }, "Status updated")}>{l}</Button>)}
        </div>
        <p className="text-xs text-muted-foreground">Effectiveness verification and closure require a QA Reviewer. Passing the due date never closes a CAPA.</p>
      </div>
      <AuditList resourceIds={[id]} />
    </div>
  );
}
