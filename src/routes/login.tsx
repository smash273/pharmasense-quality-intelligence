import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — PharmaSense" }, { name: "description", content: "Sign in to your PharmaSense workspace." }, { property: "og:title", content: "Sign in — PharmaSense" }, { property: "og:description", content: "Sign in to PharmaSense." }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) return toast.error("Sign in failed: check your email and password.");
    nav({ to: "/dashboard" });
  }
  return (
    <AuthCard title="Sign in" footer={<>No account? <Link to="/register" className="text-primary">Register</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5">
          <div className="flex justify-between"><Label htmlFor="pw">Password</Label><Link to="/forgot-password" className="text-xs text-primary">Forgot?</Link></div>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-2 top-2 text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </div>
        <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthCard>
  );
}
