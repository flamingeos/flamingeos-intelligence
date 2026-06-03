"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TerminalCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  titlePrefix?: string;
  statusBadge?: { label: string; variant: "ok" | "warn" | "err" | "dim" };
  action?: ReactNode;
  noPadding?: boolean;
}

export function TerminalCard({
  title,
  children,
  className,
  titlePrefix = ">",
  statusBadge,
  action,
  noPadding,
}: TerminalCardProps) {
  return (
    <div
      className={cn(
        "terminal-window animate-fade-in",
        className
      )}
    >
      {title && (
        <div className="terminal-window-title">
          <span className="text-[var(--fg-muted)]">{titlePrefix}</span>
          <span className="text-glow">{title.toUpperCase()}</span>
          {statusBadge && (
            <span
              className={cn(
                "ml-2 px-1.5 py-0 text-xs",
                statusBadge.variant === "ok" && "badge-ok",
                statusBadge.variant === "warn" && "badge-warn",
                statusBadge.variant === "err" && "badge-err",
                statusBadge.variant === "dim" && "badge-dim"
              )}
            >
              [{statusBadge.label}]
            </span>
          )}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-4")}>{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; positive: boolean };
  subtext?: string;
  className?: string;
}

export function StatCard({ label, value, delta, subtext, className }: StatCardProps) {
  return (
    <div className={cn("terminal-window p-4", className)}>
      <div className="text-[var(--fg-muted)] text-xs uppercase tracking-widest mb-1">
        // {label}
      </div>
      <div className="text-2xl font-bold text-glow mb-1">{value}</div>
      {delta && (
        <div
          className={cn(
            "text-xs font-mono",
            delta.positive ? "text-[var(--fg)]" : "text-[var(--error)]"
          )}
        >
          {delta.positive ? "▲" : "▼"} {delta.value}
        </div>
      )}
      {subtext && (
        <div className="text-[var(--fg-muted)] text-xs mt-1">{subtext}</div>
      )}
    </div>
  );
}
