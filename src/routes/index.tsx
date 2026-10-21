import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, ClipboardCheck, FileSearch, Lock, ShieldCheck, Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PharmaSense — AI-assisted pharmaceutical investigations" },
      { name: "description", content: "Deviation management, AI-assisted investigation reports, CAPA tracking and a cryptographic audit trail in one quality workflow." },
      { property: "og:title", content: "PharmaSense — Investigate Smarter" },
      { property: "og:description", content: "AI-assisted investigation reporting, deviation analysis, CAPA tracking and tamper-evident auditability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const caps = [
  { icon: ClipboardCheck, t: "Deviation register", d: "Capture product, batch, equipment, specification and observed results with structured classification." },
  { icon: Bot, t: "AI-assisted reports", d: "Draft 20-section investigation reports from your evidence only. Missing data is flagged, never invented." },
  { icon: FileSearch, t: "Historical similarity", d: "Full-text and metadata matching surfaces related cases with explicit matching reasons." },
  { icon: Wrench, t: "CAPA lifecycle", d: "Assign, evidence, verify effectiveness and close — with overdue detection." },
  { icon: ShieldCheck, t: "Cryptographic audit trail", d: "Every significant action is SHA-256 hash-chained and verifiable on demand." },
  { icon: Lock, t: "Role-based access", d: "Administrator, Investigator, QA Reviewer and Auditor roles enforced in the database." },
];

function Landing() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session)); }, []);
  const steps = ["Record deviation", "Investigate & gather evidence", "Generate AI draft", "QA review & approval", "CAPA & effectiveness check"];
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-navy font-bold text-navy-foreground">P</div>
          <span className="text-lg font-semibold">PharmaSense</span>
        </div>
        <Button asChild variant="outline"><Link to={authed ? "/dashboard" : "/login"}>{authed ? "Open workspace" : "Sign in"}</Link></Button>
      </header>

      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-teal">Investigate Smarter. Document Precisely. Act with Confidence.</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">Turn Pharmaceutical Investigations into Structured, Actionable Intelligence.</h1>
          <p className="mt-6 max-w-2xl text-lg opacity-80">PharmaSense brings AI-assisted investigation reporting, deviation analysis, CAPA tracking, and tamper-evident auditability into one streamlined quality workflow.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to={authed ? "/dashboard" : "/login"}>Access Workspace <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="secondary"><a href="#capabilities">Explore Capabilities</a></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="section-title">The challenge</h2>
        <p className="mt-3 max-w-3xl text-xl">Deviation investigations involve heavy manual documentation, inconsistent report structures and long review cycles — the project brief cites reports taking 12+ days to draft and approve.</p>
      </section>

      <section id="capabilities" className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="section-title mb-6">Core capabilities</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {caps.map((c) => (
            <div key={c.t} className="panel">
              <c.icon className="h-5 w-5 text-teal" />
              <h3 className="mt-3 font-semibold">{c.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="section-title mb-6">How the workflow works</h2>
          <ol className="grid gap-4 md:grid-cols-5">
            {steps.map((s, i) => (
              <li key={s} className="rounded-lg border p-4">
                <div className="text-sm font-semibold text-primary">0{i + 1}</div>
                <div className="mt-1 text-sm font-medium">{s}</div>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm text-muted-foreground">AI output is advisory. Reports start as "Draft — AI Generated", cannot be approved by their author, and approved versions are immutable.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="section-title">Technical overview</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">React + TanStack Start, PostgreSQL with row-level security, server-side Gemini integration, hash-chained SHA-256 audit log (a cryptographic audit trail — not a deployed blockchain), DOCX and PDF export.</p>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        PharmaSense · Prototype — not validated for regulated GxP use · contact@example.com
      </footer>
    </div>
  );
}
