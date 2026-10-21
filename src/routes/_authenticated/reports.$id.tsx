import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { nameOf, useMe, useProfiles } from "@/lib/auth";
import { generateReport } from "@/lib/report.functions";
import { exportDocx, exportPdf } from "@/lib/export";
import type { ReportContent } from "@/lib/report-schema";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  head: () => ({ meta: [{ title: "Report — PharmaSense" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const regen = useServerFn(generateReport);
  const { data, isLoading, error } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*, deviations(id, code, title, product, batch)").eq("id", id).single();
      if (error) throw new Error("Report not found or access denied.");
      const { data: versions } = await supabase.from("reports").select("id, version, content, status").eq("deviation_id", data.deviation_id).order("version");
      return { r: data, versions: versions ?? [] };
    },
  });
  const [content, setContent] = useState<ReportContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [cmp, setCmp] = useState<string>("");
  useEffect(() => { if (data) { setContent(data.r.content as ReportContent); setDirty(false); } }, [data]);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !data || !content) return <p className="text-destructive">{(error as Error)?.message}</p>;
  const { r } = data;
  const dev = r.deviations!;
  const editable = !!me?.canWrite && ["draft_ai", "draft", "revision_requested"].includes(r.status);
  const canReview = !!me?.isReviewer && r.status === "pending_review" && r.created_by !== me.id;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["report", id] }); qc.invalidateQueries({ queryKey: ["reports"] }); };

  async function act(label: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(label);
    const { error } = await fn();
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(ok); refresh();
  }
  const save = () => act("save", () => supabase.from("reports").update({ content }).eq("id", id), "Draft saved");
  const submit = async () => {
    if (dirty) { const { error } = await supabase.from("reports").update({ content }).eq("id", id); if (error) return toast.error(error.message); }
    act("submit", () => supabase.from("reports").update({ status: "pending_review" }).eq("id", id), "Submitted for QA review");
  };
  const review = (status: "approved" | "revision_requested") => {
    if (status === "revision_requested" && !comment.trim()) return toast.error("A comment is required to request revision.");
    act(status, () => supabase.from("reports").update({ status, reviewer_comment: comment || null }).eq("id", id), status === "approved" ? "Report approved" : "Revision requested");
  };
  async function newVersion() {
    const max = Math.max(...data!.versions.map((v) => v.version));
    const { data: n, error } = await supabase.from("reports").insert({ deviation_id: r.deviation_id, version: max + 1, content: r.content, status: "draft", model: r.model, template_version: r.template_version, created_by: me!.id }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success(`Version ${max + 1} created`); nav({ to: "/reports/$id", params: { id: n.id } });
  }
  async function regenSection(key: string) {
    setBusy("regen-" + key);
    try {
      const res = await regen({ data: { deviationId: r.deviation_id, sectionKey: key } });
      if ("error" in res && res.error) return toast.error(res.error);
      if ("section" in res && res.section) {
        setContent({ sections: content!.sections.map((s) => (s.key === key ? { ...s, body: res.section!.body } : s)) });
        setDirty(true); toast.success("Section regenerated — review and save");
      }
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function doExport(kind: "docx" | "pdf") {
    if (dirty) return toast.error("Save your changes first — exports use saved content only.");
    try {
      const payload = { code: r.code, version: r.version, status: r.status, created_at: r.created_at, model: r.model, content_hash: r.content_hash, reviewed_at: r.reviewed_at, reviewer: r.reviewer_id ? nameOf(profiles, r.reviewer_id) : "Pending", author: nameOf(profiles, r.created_by), deviation: dev, content: r.content as ReportContent };
      await (kind === "docx" ? exportDocx(payload) : exportPdf(payload));
      await supabase.rpc("log_client_event", { _action: "report.exported", _rtype: "report", _rid: id, _summary: { format: kind, version: r.version, status: r.status } });
      toast.success(`${kind.toUpperCase()} downloaded`);
    } catch (e) { toast.error("Export failed: " + (e as Error).message); }
  }
  const other = data.versions.find((v) => v.id === cmp)?.content as ReportContent | undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground"><Link to="/deviations/$id" params={{ id: dev.id }} className="text-primary">{dev.code}</Link> · {dev.title}</div>
          <h1 className="page-title">{r.code} · Version {r.version}</h1>
          <div className="mt-2"><StatusBadge value={r.status} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => doExport("docx")}><Download className="mr-1 h-4 w-4" />Word</Button>
          <Button variant="outline" size="sm" onClick={() => doExport("pdf")}><Download className="mr-1 h-4 w-4" />PDF</Button>
          {editable && <Button size="sm" variant="secondary" disabled={!dirty || !!busy} onClick={save}>Save draft</Button>}
          {editable && <Button size="sm" disabled={!!busy} onClick={submit}>Submit for QA review</Button>}
          {me?.canWrite && ["approved", "revision_requested"].includes(r.status) && <Button size="sm" variant="secondary" onClick={newVersion}>Create new version</Button>}
        </div>
      </div>

      <div className="panel grid gap-3 text-xs md:grid-cols-4">
        <div><div className="field-label">Prepared by</div>{nameOf(profiles, r.created_by)}</div>
        <div><div className="field-label">Generated</div>{new Date(r.created_at).toLocaleString()}</div>
        <div><div className="field-label">Model / template</div>{r.model ?? "—"} · {r.template_version ?? "—"}</div>
        <div><div className="field-label">Content SHA-256</div><span className="break-all font-mono">{r.content_hash}</span></div>
        {r.reviewer_id && <div className="md:col-span-4"><div className="field-label">QA review</div>{nameOf(profiles, r.reviewer_id)} · {r.reviewed_at && new Date(r.reviewed_at).toLocaleString()} {r.reviewer_comment && `· “${r.reviewer_comment}”`}</div>}
      </div>

      {canReview && (
        <div className="panel space-y-3 border-warning/40">
          <h3 className="section-title">QA review</h3>
          <Textarea placeholder="Reviewer comment (required for revision request)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-2"><Button onClick={() => review("approved")} disabled={!!busy}>Approve report</Button><Button variant="destructive" onClick={() => review("revision_requested")} disabled={!!busy}>Request revision</Button></div>
        </div>
      )}
      {me?.isReviewer && r.status === "pending_review" && r.created_by === me.id && <p className="text-sm text-warning">You authored this report and cannot review it.</p>}

      {data.versions.length > 1 && (
        <div className="flex items-center gap-2 text-sm"><span className="field-label">Compare with</span>
          <select className="h-8 rounded-md border bg-card px-2" value={cmp} onChange={(e) => setCmp(e.target.value)}><option value="">—</option>{data.versions.filter((v) => v.id !== id).map((v) => <option key={v.id} value={v.id}>v{v.version} ({v.status})</option>)}</select>
        </div>
      )}

      <div className="space-y-4">
        {content.sections.map((s, i) => {
          const prev = other?.sections.find((x) => x.key === s.key)?.body;
          const changed = other && prev !== s.body;
          return (
            <section key={s.key} className={`panel ${changed ? "border-warning/50" : ""}`}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{i + 1}. {s.title} {changed && <span className="ml-2 text-xs text-warning">changed</span>}</h3>
                {editable && <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => regenSection(s.key)}><RefreshCw className={`mr-1 h-3.5 w-3.5 ${busy === "regen-" + s.key ? "animate-spin" : ""}`} />Regenerate</Button>}
              </div>
              {editable ? (
                <Textarea rows={Math.min(14, Math.max(3, s.body.split("\n").length + 1))} value={s.body} onChange={(e) => { setContent({ sections: content.sections.map((x) => (x.key === s.key ? { ...x, body: e.target.value } : x)) }); setDirty(true); }} />
              ) : <p className="whitespace-pre-wrap text-sm">{s.body}</p>}
              {changed && <details className="mt-2 text-xs text-muted-foreground"><summary>Show compared version</summary><p className="mt-1 whitespace-pre-wrap">{prev ?? "(absent)"}</p></details>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
