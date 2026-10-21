import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuditList } from "@/components/AuditList";

export const Route = createFileRoute("/_authenticated/audit-trail")({
  head: () => ({ meta: [{ title: "Audit trail — PharmaSense" }] }),
  component: Audit,
});

function Audit() {
  const qc = useQueryClient();
  const [res, setRes] = useState<{ total: number; broken_id: number | null; ok: boolean; at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function verify() {
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_audit_chain");
    setBusy(false);
    if (error) return toast.error(error.message);
    const r = data[0];
    setRes({ total: Number(r.total), broken_id: r.broken_id ? Number(r.broken_id) : null, ok: r.ok, at: new Date().toLocaleString() });
    await supabase.rpc("log_client_event", { _action: "integrity.verified", _rtype: "audit_chain", _rid: "global", _summary: { ok: r.ok, total: r.total, broken_id: r.broken_id } });
    qc.invalidateQueries({ queryKey: ["audit"] });
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Cryptographic audit trail</h1>
          <p className="text-sm text-muted-foreground">Append-only, SHA-256 hash-chained events. Not a deployed blockchain.</p>
        </div>
        <Button onClick={verify} disabled={busy}>{busy ? "Verifying…" : "Verify integrity"}</Button>
      </div>
      {res && (
        <div className={`panel flex gap-3 text-sm ${res.ok ? "border-success/40" : "border-destructive/40"}`}>
          {res.ok ? <ShieldCheck className="h-5 w-5 text-success" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
          <div>
            <div className="font-medium">{res.ok ? `Chain intact — ${res.total} events verified` : `Chain broken at event #${res.broken_id} (after ${res.total - 1} valid events)`}</div>
            <div className="text-muted-foreground">Checked {res.at}: each event's SHA-256 was recomputed from its canonical fields (timestamp, actor, action, resource, details) plus the previous event's hash. Limitation: hashes live in the same database; an attacker with full database-owner access could rewrite the whole chain. Anchor the latest hash externally for stronger guarantees.</div>
          </div>
        </div>
      )}
      <AuditList />
    </div>
  );
}
