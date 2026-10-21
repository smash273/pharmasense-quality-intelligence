import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — PharmaSense" }, { name: "description", content: "Choose a new password." }, { property: "og:title", content: "Set new password" }, { property: "og:description", content: "Choose a new password." }] }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav({ to: "/dashboard" });
  }
  return (
    <AuthCard title="Set a new password">
      <form onSubmit={submit} className="space-y-4">
        <Input type="password" minLength={8} required aria-label="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button className="w-full">Update password</Button>
      </form>
    </AuthCard>
  );
}
