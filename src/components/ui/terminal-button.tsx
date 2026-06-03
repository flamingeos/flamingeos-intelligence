"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface TerminalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "amber";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  bracket?: boolean;
}

export function TerminalButton({
  children,
  variant = "primary",
  size = "md",
  loading,
  icon,
  bracket = true,
  className,
  disabled,
  ...props
}: TerminalButtonProps) {
  const base =
    "font-mono uppercase tracking-widest transition-all duration-150 border cursor-pointer inline-flex items-center gap-2 select-none active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "border-[var(--fg)] text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] hover:text-shadow-none",
    secondary:
      "border-[var(--fg-muted)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]",
    danger:
      "border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)] hover:text-[var(--bg)]",
    ghost:
      "border-transparent text-[var(--fg-dim)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)]",
    amber:
      "border-[var(--amber)] text-[var(--amber)] hover:bg-[var(--amber)] hover:text-[var(--bg)]",
  };

  const sizes = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {bracket ? `[ ${children} ]` : children}
    </button>
  );
}
