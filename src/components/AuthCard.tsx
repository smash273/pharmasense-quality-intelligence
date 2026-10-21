import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-navy font-bold text-navy-foreground">P</div>
          <span className="text-lg font-semibold">PharmaSense</span>
        </Link>
        <div className="panel">
          <h1 className="mb-5 text-lg font-semibold">{title}</h1>
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
