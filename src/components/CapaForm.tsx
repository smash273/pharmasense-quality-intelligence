import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProfiles } from "@/lib/auth";

export function CapaForm({ deviationId, onCreated }: { deviationId: string; onCreated: () => void }) {
  const { data: profiles } = useProfiles();
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (f.problem.trim().length < 5 || f.action.trim().length < 5) { toast.error("Problem and action are required."); return; }
    setBusy(true);
    const { error } = await supabase.from("capas").insert({
      deviation_id: deviationId, kind: f.kind as "corrective" | "preventive", problem: f.problem, action: f.action, rationale: f.rationale || null,
      owner_id: f.owner_id || null, department: f.department || null, priority: f.priority as "low" | "medium" | "high", due_date: f.due_date,
      effectiveness_criteria: f.effectiveness_criteria || null, status: f.owner_id ? "assigned" : "proposed",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("CAPA created"); form.reset(); onCreated();
  }
  const sel = "h-9 w-full rounded-md border bg-card px-2 text-sm";
  return (
    <form onSubmit={submit} className="panel grid gap-3 md:grid-cols-3">
      <h3 className="section-title md:col-span-3">New CAPA</h3>
      <label className="space-y-1"><span className="field-label">Type</span><select name="kind" className={sel}><option value="corrective">Corrective</option><option value="preventive">Preventive</option></select></label>
      <label className="space-y-1"><span className="field-label">Owner</span><select name="owner_id" className={sel}><option value="">Unassigned</option>{profiles?.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}</select></label>
      <label className="space-y-1"><span className="field-label">Due date *</span><Input name="due_date" type="date" required /></label>
      <label className="space-y-1"><span className="field-label">Priority</span><select name="priority" defaultValue="medium" className={sel}><option>low</option><option>medium</option><option>high</option></select></label>
      <label className="space-y-1 md:col-span-2"><span className="field-label">Department</span><Input name="department" /></label>
      <label className="space-y-1 md:col-span-3"><span className="field-label">Problem statement *</span><Textarea name="problem" rows={2} /></label>
      <label className="space-y-1 md:col-span-3"><span className="field-label">Proposed action *</span><Textarea name="action" rows={2} /></label>
      <label className="space-y-1 md:col-span-3"><span className="field-label">Rationale</span><Textarea name="rationale" rows={2} /></label>
      <label className="space-y-1 md:col-span-3"><span className="field-label">Effectiveness criteria</span><Textarea name="effectiveness_criteria" rows={2} /></label>
      <div className="md:col-span-3 flex justify-end"><Button disabled={busy}>{busy ? "Saving…" : "Create CAPA"}</Button></div>
    </form>
  );
}
