import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — PharmaSense" }] }),
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread"] });
  }
  async function mark(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["unread"] });
  }
  const rows = (data ?? []).filter((n) => !unreadOnly || !n.read);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Notifications</h1>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setUnreadOnly(!unreadOnly)}>{unreadOnly ? "Show all" : "Unread only"}</Button><Button size="sm" variant="secondary" onClick={markAll}>Mark all read</Button></div>
      </div>
      <div className="rounded-lg border bg-card">
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No notifications. They appear when you're assigned work or a report changes status.</p>}
        {rows.map((n) => (
          <div key={n.id} className={`flex items-center gap-3 border-b px-4 py-3 text-sm last:border-0 ${n.read ? "text-muted-foreground" : "font-medium"}`}>
            {!n.read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="unread" />}
            {n.link ? <Link to={n.link} onClick={() => mark(n.id)} className="flex-1 hover:underline">{n.title}</Link> : <span className="flex-1">{n.title}</span>}
            <span className="text-xs">{new Date(n.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Email notifications are not configured; in-app notifications only.</p>
    </div>
  );
}
