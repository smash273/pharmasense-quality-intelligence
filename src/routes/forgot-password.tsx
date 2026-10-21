import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — PharmaSense" }, { name: "description", content: "Recover your PharmaSense password." }, { property: "og:title", content: "Reset password — PharmaSense" }, { property: "og:description", content: "Recover your password." }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return toast.error(error.message);
    setSent(true);
  }
  return (
    <AuthCard title="Reset password" footer={<Link to="/login" className="text-primary">Back to sign in</Link>}>
      {sent ? <p className="text-sm text-muted-foreground">If an account exists, a reset link was sent.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <Input type="email" required placeholder="you@company.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthCard>
  );
}
