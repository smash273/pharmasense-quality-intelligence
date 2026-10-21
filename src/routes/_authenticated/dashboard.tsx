import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { seedDemo, removeDemo } from "@/lib/demo";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PharmaSense" }] }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [d, c, r] = await Promise.all([
        supabase.from("deviations").select("id, code, title, severity, status, category, detected_at, created_at, updated_at"),
        supabase.from("capas").select("id, status, due_date"),
        supabase.from("reports").select("id, status"),
      ]);
      if (d.error) throw d.error;
      return { devs: d.data, capas: c.data ?? [], reports: r.data ?? [] };
    },
  });
  if (isLoading || !data) return <p className="text-muted-foreground">Loading…</p>;
  const today = new Date().toISOString().slice(0, 10);
  const doneCapa = ["effective", "closed", "ineffective"];
  const overdue = data.capas.filter((c) => c.due_date < today && !doneCapa.includes(c.status) && c.status !== "pending_verification");
  const since = Date.now() - 30 * 864e5;
  const kpis = [
    ["Open deviations", data.devs.filter((d) => d.status !== "closed").length],
    ["In investigation", data.devs.filter((d) => d.status === "under_investigation").length],
    ["Reports awaiting review", data.reports.filter((r) => r.status === "pending_review").length],
    ["Overdue CAPAs", overdue.length],
    ["High / critical open", data.devs.filter((d) => ["high", "critical"].includes(d.severity) && d.status !== "closed").length],
    ["Closed (30 days)", data.devs.filter((d) => d.status === "closed" && new Date(d.updated_at).getTime() > since).length],
  ] as const;
  const group = (arr: string[]) => Object.entries(arr.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {})).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  const months = group(data.devs.map((d) => d.detected_at.slice(0, 7))).sort((a, b) => a.name.localeCompare(b.name));

  async function demo(fn: () => Promise<void>, msg: string) {
    try { await fn(); toast.success(msg); qc.invalidateQueries(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex gap-2">
          {me?.isAdmin && <Button variant="outline" size="sm" onClick={() => demo(seedDemo, "Demo records created")}>Load demo data</Button>}
          {me?.isAdmin && <Button variant="ghost" size="sm" onClick={() => demo(removeDemo, "Demo records removed")}>Remove demo data</Button>}
          {me?.canWrite && <Button asChild size="sm"><Link to="/deviations/new">New deviation</Link></Button>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map(([l, v]) => (
          <div key={l} className="panel !p-4"><div className="field-label">{l}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>
        ))}
      </div>
      {data.devs.length === 0 ? (
        <div className="panel text-center text-muted-foreground">No deviations yet. Create one{me?.isAdmin ? " or load clearly labelled demo data" : ""} to see trends.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Chart title="Deviations by month"><BarChart data={months}><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Deviations" fill="var(--chart-1)" radius={4} /></BarChart></Chart>
          <Chart title="By severity"><PieChart><Pie data={group(data.devs.map((d) => d.severity))} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>{COLORS.map((c, i) => <Cell key={i} fill={c} />)}</Pie><Tooltip /></PieChart></Chart>
          <Chart title="Status breakdown"><BarChart data={group(data.devs.map((d) => d.status))} layout="vertical"><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip /><Bar dataKey="value" fill="var(--chart-2)" radius={4} /></BarChart></Chart>
          <Chart title="Recurring categories"><BarChart data={group(data.devs.map((d) => d.category))}><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" fill="var(--chart-5)" radius={4} /></BarChart></Chart>
          <Chart title="CAPA status"><BarChart data={[{ name: "Completed", value: data.capas.filter((c) => doneCapa.includes(c.status)).length }, { name: "Open", value: data.capas.length - overdue.length - data.capas.filter((c) => doneCapa.includes(c.status)).length }, { name: "Overdue", value: overdue.length }]}><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" radius={4}><Cell fill="var(--chart-2)" /><Cell fill="var(--chart-1)" /><Cell fill="var(--chart-4)" /></Bar></BarChart></Chart>
          <div className="panel">
            <h3 className="section-title mb-3">Recently updated</h3>
            <ul className="space-y-2 text-sm">
              {[...data.devs].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6).map((d) => (
                <li key={d.id}><Link to="/deviations/$id" params={{ id: d.id }} className="text-primary hover:underline">{d.code}</Link> <span className="text-muted-foreground">· {d.status.replace(/_/g, " ")}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="panel">
      <h3 className="section-title mb-3">{title}</h3>
      <div className="h-56"><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
  );
}
