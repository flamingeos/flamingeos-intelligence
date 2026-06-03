"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  width?: number;
  label?: string;
  showPercent?: boolean;
  variant?: "green" | "amber" | "red";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  width = 20,
  label,
  showPercent = true,
  variant = "green",
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;

  const colors = {
    green: "text-[var(--fg)]",
    amber: "text-[var(--amber)]",
    red: "text-[var(--error)]",
  };

  return (
    <div className={cn("font-mono text-sm", className)}>
      {label && (
        <div className="text-[var(--fg-muted)] text-xs uppercase tracking-widest mb-0.5">
          {label}
        </div>
      )}
      <span className="text-[var(--fg-muted)]">[</span>
      <span className={colors[variant]}>{"█".repeat(filled)}</span>
      <span className="text-[var(--fg-muted)]">{"░".repeat(empty)}</span>
      <span className="text-[var(--fg-muted)]">]</span>
      {showPercent && (
        <span className={cn("ml-2 text-xs", colors[variant])}>
          {pct.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
}

export function ScoreBar({ label, score, maxScore = 10 }: ScoreBarProps) {
  const pct = (score / maxScore) * 100;
  const variant =
    pct >= 70 ? "green" : pct >= 40 ? "amber" : "red";

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className="text-[var(--fg-muted)] w-28 shrink-0 uppercase tracking-wider">
        {label}
      </span>
      <ProgressBar
        value={score}
        max={maxScore}
        width={15}
        showPercent={false}
        variant={variant}
        className="flex-1"
      />
      <span
        className={cn(
          "w-8 text-right shrink-0",
          variant === "green" && "text-[var(--fg)]",
          variant === "amber" && "text-[var(--amber)]",
          variant === "red" && "text-[var(--error)]"
        )}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}
