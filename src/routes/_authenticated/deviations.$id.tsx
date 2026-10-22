import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bot, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { CapaForm } from "@/components/CapaForm";
import { AuditList } from "@/components/AuditList";
import { nameOf, useMe, useProfiles } from "@/lib/auth";
import { generateReport } from "@/lib/report.functions";
import { REQUIRED_FIELDS } from "@/lib/report-schema";

export const Route = createFileRoute("/_authenticated/deviations/$id")({
  head: () => ({ meta: [{ title: "Deviation — PharmaSense" }] }),
  component: Detail,
});

const INV_FIELDS: [string, string][] = [
  ["chronology", "Event chronology *"], ["process_context", "Batch & process context"], ["equipment_history", "Equipment history"],
  ["materials_environment", "Materials & environmental factors"], ["personnel_factors", "Operator / procedural factors"],
  ["evidence", "Evidence reviewed *"], ["findings", "Preliminary findings (observed facts) *"], ["hypotheses", "Root-cause hypotheses, evidence for/against *"],
  ["impact_assessment", "Product & quality impact assessment"], ["corrective_actions", "Proposed corrective actions"],
  ["preventive_actions", "Proposed preventive actions"], ["conclusion", "Investigator conclusion"],
];

function Detail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const { data, isLoading, error } = useQuery({
    queryKey: ["deviation", id],
    queryFn: async () => {
      const [d, i, r, c, s] = await Promise.all([
        supabase.from("deviations").select("*").eq("id", id).single(),
        supabase.from("investigations").select("*").eq("deviation_id", id).single(),
        supabase.from("reports").select("id, code, version, status, created_at, model").eq("deviation_id", id).order("version", { ascending: false }),
        supabase.from("capas").select("*").eq("deviation_id", id).order("created_at"),
        supabase.rpc("similar_deviations", { _id: id }),
      ]);
      if (d.error) throw new Error("Deviation not found or you do not have access.");
      return { dev: d.data, inv: i.data, reports: r.data ?? [], capas: c.data ?? [], similar: s.data ?? [] };
    },
  });
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-destructive">{(error as Error)?.message}</p>;
  const { dev } = data;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["deviation", id] }); qc.invalidateQueries({ queryKey: ["audit"] }); };

  async function setStatus(status: string) {
    const { error } = await supabase.from("deviations").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated"); refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{dev.code} {dev.is_demo && <span className="text-warning">· DEMO DATA</span>}</div>
          <h1 className="page-title">{dev.title}</h1>
          <div className="mt-2 flex gap-2"><StatusBadge value={dev.severity} /><StatusBadge value={dev.status} /></div>
        </div>
        <div className="flex gap-2">
          {me?.canWrite && dev.status === "open" && <Button onClick={() => setStatus("under_investigation")}>Start investigation</Button>}
          {me?.isReviewer && dev.status === "approved" && <Button onClick={() => setStatus("closed")}>Close deviation</Button>}
        </div>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          {["overview", "investigation", "analysis", "reports", "capas", "audit"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t === "capas" ? "CAPAs" : t === "analysis" ? "Analysis & history" : t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview" className="panel grid gap-4 md:grid-cols-3">
          {([["Product", dev.product], ["Batch", dev.batch], ["Department", dev.department], ["Stage", dev.stage], ["Equipment", dev.equipment], ["Category", dev.category], ["OOS/OOT", dev.oos_oot], ["Detected", new Date(dev.detected_at).toLocaleString()], ["Owner", nameOf(profiles, dev.owner_id)], ["Expected", dev.expected_condition], ["Observed", dev.observed_condition], ["Value", dev.observed_value != null ? `${dev.observed_value} ${dev.units ?? ""}` : null]] as const).map(([k, v]) => (
            <div key={k}><div className="field-label">{k}</div><div className="text-sm">{v || "—"}</div></div>
          ))}
          {([["Description", dev.description], ["Severity rationale", dev.severity_rationale], ["Containment", dev.containment], ["Quality impact", dev.quality_impact], ["Patient safety", dev.patient_impact], ["Data integrity", dev.data_integrity_impact]] as const).map(([k, v]) => (
            <div key={k} className="md:col-span-3"><div className="field-label">{k}</div><p className="whitespace-pre-wrap text-sm">{v || "—"}</p></div>
          ))}
        </TabsContent>
        <TabsContent value="investigation"><Investigation inv={data.inv} canWrite={!!me?.canWrite && !["approved", "closed", "pending_review"].includes(dev.status)} onSaved={refresh} /></TabsContent>
        <TabsContent value="analysis" className="space-y-4">
          <Threshold dev={dev} />
          <div className="panel">
            <h3 className="section-title mb-1">Similar historical cases</h3>
            <p className="mb-3 text-xs text-muted-foreground">Ranked by full-text and metadata similarity. Similarity is not causal evidence.</p>
            {data.similar.length === 0 ? <p className="text-sm text-muted-foreground">No related records found.</p> : (
              <ul className="divide-y text-sm">{data.similar.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Link to="/deviations/$id" params={{ id: s.id }} className="font-mono text-xs text-primary">{s.code}</Link>
                  <span className="flex-1">{s.title}</span>
                  {s.reasons?.map((r) => <span key={r} className="rounded bg-accent px-1.5 text-xs text-accent-foreground">{r}</span>)}
                </li>))}</ul>
            )}
          </div>
        </TabsContent>
        <TabsContent value="reports"><Reports devId={id} inv={data.inv} reports={data.reports} canWrite={!!me?.canWrite && !["approved", "closed", "pending_review"].includes(dev.status)} /></TabsContent>
        <TabsContent value="capas" className="space-y-4">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm"><tbody>
              {data.capas.length === 0 && <tr><td className="p-4 text-muted-foreground">No CAPAs linked.</td></tr>}
              {data.capas.map((c) => <tr key={c.id} className="border-b last:border-0"><td className="px-3 py-2 font-mono text-xs"><Link to="/capa/$id" params={{ id: c.id }} className="text-primary">{c.code}</Link></td><td className="px-3 py-2 capitalize">{c.kind}</td><td className="px-3 py-2">{c.action}</td><td className="px-3 py-2">{nameOf(profiles, c.owner_id)}</td><td className="px-3 py-2">{c.due_date}</td><td className="px-3 py-2"><StatusBadge value={c.status} /></td></tr>)}
            </tbody></table>
          </div>
          {me?.canWrite && <CapaForm deviationId={id} onCreated={refresh} />}
        </TabsContent>
        <TabsContent value="audit"><AuditList resourceIds={[id, data.inv?.id ?? "", ...data.reports.map((r) => r.id), ...data.capas.map((c) => c.id)]} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Threshold({ dev }: { dev: { observed_value: number | null; spec_min: number | null; spec_max: number | null; units: string | null; detected_at: string } }) {
  const { observed_value: v, spec_min: lo, spec_max: hi } = dev;
  if (v == null || (lo == null && hi == null)) return <div className="panel text-sm text-muted-foreground">Rule check: no observed value and specification limits recorded for this deviation.</div>;
  const below = lo != null && v < lo, above = hi != null && v > hi;
  const mag = below ? lo! - v : above ? v - hi! : 0;
  return (
    <div className="panel">
      <h3 className="section-title mb-2">Deterministic threshold check</h3>
      <div className={`flex items-start gap-3 rounded-md border p-3 text-sm ${below || above ? "border-destructive/30 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
        {below || above ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-success" />}
        <div>
          <div className="font-medium">{below || above ? "Specification breach" : "Within specification"}</div>
          <div>Observed {v} {dev.units} · expected range {lo ?? "−∞"} – {hi ?? "+∞"} {dev.units}{mag ? ` · magnitude ${mag.toFixed(3)} (${((mag / Math.abs((below ? lo : hi) || 1)) * 100).toFixed(1)}%)` : ""}</div>
          <div className="text-xs text-muted-foreground">Rule: recorded spec limits on this deviation · observed {new Date(dev.detected_at).toLocaleString()} · rule-based, not a machine-learning prediction.</div>
        </div>
      </div>
    </div>
  );
}

type Inv = Record<string, string | null> & { id: string };

function Investigation({ inv, canWrite, onSaved }: { inv: Inv | null; canWrite: boolean; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (inv) setForm(Object.fromEntries(INV_FIELDS.map(([k]) => [k, (inv[k] as string) ?? ""]))); }, [inv]);
  if (!inv) return null;
  async function save() {
    setSaving(true);
    const { error } = await supabase.from("investigations").update(form as never).eq("id", inv!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDirty(false); toast.success("Investigation saved"); onSaved();
  }
  return (
    <div className="panel space-y-4">
      <p className="text-xs text-muted-foreground">Record observed facts separately from hypotheses. Fields marked * are required before AI report generation.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {INV_FIELDS.map(([k, l]) => (
          <label key={k} className="block space-y-1"><span className="field-label">{l}</span>
            <Textarea rows={4} disabled={!canWrite} value={form[k] ?? ""} onChange={(e) => { setForm({ ...form, [k]: e.target.value }); setDirty(true); }} />
          </label>
        ))}
      </div>
      {canWrite && <div className="flex items-center justify-end gap-3"><span className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : `Last saved ${new Date(inv.updated_at as string).toLocaleString()}`}</span><Button disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save investigation"}</Button></div>}
    </div>
  );
}

function Reports({ devId, inv, reports, canWrite }: { devId: string; inv: Inv | null; reports: { id: string; code: string; version: number; status: string; created_at: string; model: string | null }[]; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generateReport);
  const nav = useNavigate();
  const missing = REQUIRED_FIELDS.filter((f) => !inv?.[f]?.trim());
  async function run() {
    setBusy(true);
    try {
      const res = await gen({ data: { deviationId: devId } });
      if ("error" in res && res.error) { toast.error(res.error); return; }
      if ("reportId" in res && res.reportId) { toast.success("Draft report generated"); nav({ to: "/reports/$id", params: { id: res.reportId } }); }
    } catch (e) { toast.error("Request failed: " + (e as Error).message); }
    finally { setBusy(false); setOpen(false); }
  }
  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="panel flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">AI-assisted investigation report</div>
            {missing.length ? <div className="text-warning">Missing required fields: {missing.join(", ")}</div> : <div className="text-muted-foreground">All required investigation fields present.</div>}
          </div>
          <Button disabled={missing.length > 0} onClick={() => setOpen(true)}><Bot className="mr-1 h-4 w-4" /> Generate Investigation Report</Button>
        </div>
      )}
      <div className="rounded-lg border bg-card">
        {reports.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No reports yet.</p> : reports.map((r) => (
          <Link key={r.id} to="/reports/$id" params={{ id: r.id }} className="flex items-center gap-3 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/30">
            <span className="font-mono text-xs">{r.code}</span><span>v{r.version}</span><StatusBadge value={r.status} /><span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
          </Link>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send data to external AI?</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>The deviation record and investigation fields will be sent to a Google Gemini model via the Lovable AI Gateway to draft a report.</p>
            <p className="text-warning">Review for sensitive information (personal names, patient data, confidential formulas) before continuing. Personnel IDs are not sent.</p>
            <p className="text-muted-foreground">The result will be saved as "Draft — AI Generated" and requires human review and QA approval.</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={run}>{busy ? "Generating… (up to a minute)" : "Confirm and generate"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
