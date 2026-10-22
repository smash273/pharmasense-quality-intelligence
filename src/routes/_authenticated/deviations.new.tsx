import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMe, useProfiles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/deviations/new")({
  head: () => ({ meta: [{ title: "New deviation — PharmaSense" }] }),
  component: NewDeviation,
});

const num = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().finite().nullable());
const schema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(200),
  product: z.string().trim().min(1, "Product required"),
  batch: z.string().trim().min(1, "Batch required"),
  department: z.string().trim().min(1, "Department required"),
  stage: z.string().optional(), equipment: z.string().optional(),
  category: z.string().min(1, "Category required"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  severity_rationale: z.string().trim().min(5, "Explain the severity"),
  oos_oot: z.enum(["none", "OOS", "OOT"]),
  expected_condition: z.string().optional(), observed_condition: z.string().optional(), units: z.string().optional(),
  observed_value: num, spec_min: num, spec_max: num,
  detected_at: z.string().min(1),
  description: z.string().trim().min(10, "Describe the event (10+ chars)"),
  containment: z.string().optional(), quality_impact: z.string().optional(), patient_impact: z.string().optional(), data_integrity_impact: z.string().optional(),
  owner_id: z.string().optional(),
}).refine((d) => d.spec_min == null || d.spec_max == null || d.spec_min <= d.spec_max, { message: "Spec min must be ≤ spec max", path: ["spec_max"] });

const CATS = ["Process parameters", "Equipment", "Materials", "Method / procedure", "Personnel / training", "Environment", "Laboratory", "Data integrity", "Other"];

function NewDeviation() {
  const nav = useNavigate();
  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const errRef = useRef(errors);
  errRef.current = errors;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const r = schema.safeParse(raw);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return toast.error("Please fix the highlighted fields.");
    }
    setErrors({});
    setBusy(true);
    const v = r.data;
    const { data, error } = await supabase.from("deviations").insert({ ...v, detected_at: new Date(v.detected_at).toISOString(), owner_id: v.owner_id || me?.id, created_by: me!.id, status: "open" } as never).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Deviation created");
    nav({ to: "/deviations/$id", params: { id: data.id } });
  }

  const F = useMemo(() => ({ n, l, area, ...p }: { n: string; l: string; area?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block space-y-1">
      <span className="field-label">{l}</span>
      {area ? <Textarea name={n} rows={3} aria-invalid={!!errRef.current[n]} /> : <Input name={n} aria-invalid={!!errRef.current[n]} {...p} />}
      {errRef.current[n] && <span className="text-xs text-destructive">{errRef.current[n]}</span>}
    </label>
  ), []);
  const S = useMemo(() => ({ n, l, opts, def }: { n: string; l: string; opts: [string, string][]; def?: string }) => (
    <label className="block space-y-1"><span className="field-label">{l}</span>
      <select name={n} defaultValue={def} className="h-9 w-full rounded-md border bg-card px-2 text-sm">{opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
      {errRef.current[n] && <span className="text-xs text-destructive">{errRef.current[n]}</span>}
    </label>
  ), []);

  if (me && !me.canWrite) return <p className="text-muted-foreground">Your role is read-only.</p>;
  return (
    <form onSubmit={submit} className="space-y-6">
      <h1 className="page-title">New deviation</h1>
      <section className="panel grid gap-4 md:grid-cols-3">
        <h2 className="section-title md:col-span-3">Identification</h2>
        <div className="md:col-span-2"><F n="title" l="Title *" /></div>
        <F n="detected_at" l="Detected at *" type="datetime-local" defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16)} />
        <F n="department" l="Reporting department *" />
        <F n="product" l="Product *" />
        <F n="batch" l="Batch / lot *" />
        <F n="stage" l="Manufacturing stage" />
        <F n="equipment" l="Equipment / process ID" />
        <S n="owner_id" l="Responsible investigator" def={me?.id} opts={(profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? ""])} />
      </section>
      <section className="panel grid gap-4 md:grid-cols-3">
        <h2 className="section-title md:col-span-3">Classification</h2>
        <S n="category" l="Category *" opts={CATS.map((c) => [c, c])} />
        <S n="severity" l="Severity * (human-assigned)" def="medium" opts={[["low", "Low"], ["medium", "Medium"], ["high", "High"], ["critical", "Critical"]]} />
        <S n="oos_oot" l="OOS / OOT" opts={[["none", "Not applicable"], ["OOS", "OOS"], ["OOT", "OOT"]]} />
        <div className="md:col-span-3"><F n="severity_rationale" l="Criticality rationale *" area /></div>
      </section>
      <section className="panel grid gap-4 md:grid-cols-3">
        <h2 className="section-title md:col-span-3">Event details</h2>
        <F n="expected_condition" l="Expected condition / specification" />
        <F n="observed_condition" l="Observed condition" />
        <F n="units" l="Units" />
        <F n="spec_min" l="Spec minimum" type="number" step="any" />
        <F n="spec_max" l="Spec maximum" type="number" step="any" />
        <F n="observed_value" l="Observed value" type="number" step="any" />
        <div className="md:col-span-3"><F n="description" l="Description of the event *" area /></div>
        <div className="md:col-span-3"><F n="containment" l="Immediate containment" area /></div>
      </section>
      <section className="panel grid gap-4 md:grid-cols-3">
        <h2 className="section-title md:col-span-3">Initial assessment</h2>
        <F n="quality_impact" l="Product quality impact" area />
        <F n="patient_impact" l="Patient safety implications" area />
        <F n="data_integrity_impact" l="Data integrity implications" area />
      </section>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => nav({ to: "/deviations" })}>Cancel</Button>
        <Button disabled={busy}>{busy ? "Saving…" : "Create deviation"}</Button>
      </div>
    </form>
  );
}
