import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
  open: "bg-primary/10 text-primary border-primary/30",
  under_investigation: "bg-teal/10 text-teal border-teal/30",
  draft_report: "bg-muted text-foreground border-border",
  draft_ai: "bg-accent text-accent-foreground border-teal/30",
  draft: "bg-muted text-foreground border-border",
  pending_review: "bg-warning/10 text-warning border-warning/30",
  revision_requested: "bg-destructive/10 text-destructive border-destructive/30",
  approved: "bg-success/10 text-success border-success/30",
  closed: "bg-success/10 text-success border-success/30",
  superseded: "bg-muted text-muted-foreground border-border line-through",
  proposed: "bg-muted text-foreground border-border",
  assigned: "bg-primary/10 text-primary border-primary/30",
  in_progress: "bg-teal/10 text-teal border-teal/30",
  pending_verification: "bg-warning/10 text-warning border-warning/30",
  effective: "bg-success/10 text-success border-success/30",
  ineffective: "bg-destructive/10 text-destructive border-destructive/30",
  overdue: "bg-destructive text-destructive-foreground border-destructive",
};

const label: Record<string, string> = { draft_ai: "Draft — AI Generated" };

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium capitalize", tone[value] ?? tone.low, className)}>
      {label[value] ?? value.replace(/_/g, " ")}
    </span>
  );
}
