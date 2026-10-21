import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — PharmaSense" }, { name: "description", content: "Create a PharmaSense account." }, { property: "og:title", content: "Register — PharmaSense" }, { property: "og:description", content: "Create a PharmaSense account." }] }),
  component: Register,
});

function Register() {
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.pw.length < 8) return toast.error("Password must be at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email: f.email, password: f.pw, options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: f.name } } });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }
  if (sent) return <AuthCard title="Check your email"><p className="text-sm text-muted-foreground">We sent a confirmation link to {f.email}. Confirm it, then sign in.</p></AuthCard>;
  return (
    <AuthCard title="Create account" footer={<>Have an account? <Link to="/login" className="text-primary">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="n">Full name</Label><Input id="n" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="p">Password</Label><Input id="p" type="password" required value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">The first account becomes Administrator; later accounts start as Investigator.</p>
        <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
    </AuthCard>
  );
}
