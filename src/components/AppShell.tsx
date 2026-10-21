import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ClipboardList, FileText, LayoutDashboard, LogOut, Settings, ShieldCheck, Users, Wrench, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useMe } from "@/lib/auth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/deviations", label: "Deviations", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/capa", label: "CAPA", icon: Wrench },
  { to: "/audit-trail", label: "Audit Trail", icon: ShieldCheck, audit: true },
  { to: "/users", label: "Users", icon: Users, admin: true },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: unread } = useQuery({
    queryKey: ["unread"],
    queryFn: async () => (await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false)).count ?? 0,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const items = nav.filter((n) => (!("admin" in n) || me?.isAdmin) && (!("audit" in n) || me?.canAudit));

  return (
    <div className="min-h-screen md:flex">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-60 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen", open ? "flex" : "hidden")}>
        <Link to="/dashboard" className="flex items-center gap-2 px-5 py-5 text-sidebar-accent-foreground">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground">P</div>
          <span className="text-lg font-semibold">PharmaSense</span>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
          {items.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <n.icon className="h-4 w-4" />
              <span className="flex-1">{n.label}</span>
              {n.to === "/notifications" && !!unread && (
                <span className="rounded-full bg-sidebar-primary px-1.5 text-xs text-sidebar-primary-foreground">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <div className="truncate font-medium text-sidebar-accent-foreground">{me?.profile?.full_name ?? me?.email}</div>
          <div className="mb-3">{me?.roles.map((r) => ROLE_LABEL[r]).join(", ")}</div>
          <button onClick={signOut} className="flex items-center gap-2 hover:text-sidebar-accent-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></button>
          <span className="font-semibold">PharmaSense</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
