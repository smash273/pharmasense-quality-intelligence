import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABEL, useMe } from "@/lib/auth";
import { TEMPLATE_VERSION } from "@/lib/report-schema";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — PharmaSense" }] }),
  component: Settings,
});

function Settings() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [pw, setPw] = useState({ cur: "", next: "" });
  useEffect(() => { setName(me?.profile?.full_name ?? ""); setDept(me?.profile?.department ?? ""); }, [me]);
  async function saveProfile() {
    const { error } = await supabase.from("profiles").update({ full_name: name, department: dept }).eq("id", me!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved"); qc.invalidateQueries();
  }
  async function changePw() {
    if (pw.next.length < 8) return toast.error("New password must be at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw.next, current_password: pw.cur } as { password: string });
    if (error) return toast.error(error.message);
    setPw({ cur: "", next: "" }); toast.success("Password changed");
  }
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="page-title">Settings</h1>
      <section className="panel space-y-3">
        <h2 className="section-title">Profile</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1"><span className="field-label">Name</span><Input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="space-y-1"><span className="field-label">Department</span><Input value={dept} onChange={(e) => setDept(e.target.value)} /></label>
          <div><div className="field-label">Email</div><div className="text-sm">{me?.email}</div></div>
          <div><div className="field-label">Role</div><div className="text-sm">{me?.roles.map((r) => ROLE_LABEL[r]).join(", ")}</div></div>
        </div>
        <Button onClick={saveProfile}>Save profile</Button>
      </section>
      <section className="panel space-y-3">
        <h2 className="section-title">Password</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input type="password" placeholder="Current password" aria-label="Current password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} />
          <Input type="password" placeholder="New password" aria-label="New password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        </div>
        <Button variant="secondary" onClick={changePw}>Change password</Button>
        <p className="text-xs text-muted-foreground">Image-pattern second step: not enabled (planned extension; would require secure enrollment, rate limiting and recovery).</p>
      </section>
      <section className="panel space-y-2 text-sm">
        <h2 className="section-title">AI configuration</h2>
        <div>Provider: Google Gemini via Lovable AI Gateway (server-side; no key in browser)</div>
        <div>Model: <span className="font-mono">google/gemini-3.8-flash</span> · Template: <span className="font-mono">{TEMPLATE_VERSION}</span></div>
        <p className="text-muted-foreground">Disclosure: report generation sends the deviation and investigation text to an external AI service only after explicit confirmation. Output is advisory and requires QA approval.</p>
      </section>
      <section className="panel space-y-1 text-sm">
        <h2 className="section-title">Compliance notice</h2>
        <p className="text-muted-foreground">This prototype is not validated or certified for 21 CFR Part 11, GDPR, HIPAA or GxP use. Regulated deployment requires formal risk assessment, computer system validation and electronic signature controls.</p>
      </section>
    </div>
  );
}
