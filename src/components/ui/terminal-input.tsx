"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface TerminalInputProps extends InputHTMLAttributes<HTMLInputElement> {
  prompt?: string;
  label?: string;
  error?: string;
}

export function TerminalInput({
  prompt = "$",
  label,
  error,
  className,
  ...props
}: TerminalInputProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="text-[var(--fg-muted)] text-xs uppercase tracking-widest mb-1">
          // {label}
        </div>
      )}
      <div
        className={cn(
          "flex items-center gap-2 border border-[var(--border)] bg-[var(--bg)] px-3 py-2 focus-within:border-[var(--fg)]",
          error && "border-[var(--error)]"
        )}
      >
        <span className="text-[var(--fg-dim)] text-sm font-mono shrink-0">
          {prompt}
        </span>
        <input
          className={cn(
            "flex-1 bg-transparent text-[var(--fg)] font-mono text-sm outline-none placeholder:text-[var(--fg-muted)] w-full",
            className
          )}
          {...props}
        />
        <span className="animate-blink text-[var(--fg)] text-sm leading-none">█</span>
      </div>
      {error && (
        <div className="text-[var(--error)] text-xs mt-1 font-mono">
          [ERR] {error}
        </div>
      )}
    </div>
  );
}

interface TerminalTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  prompt?: string;
  label?: string;
  error?: string;
}

export function TerminalTextarea({
  prompt = "$",
  label,
  error,
  className,
  ...props
}: TerminalTextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="text-[var(--fg-muted)] text-xs uppercase tracking-widest mb-1">
          // {label}
        </div>
      )}
      <div
        className={cn(
          "border border-[var(--border)] bg-[var(--bg)] focus-within:border-[var(--fg)]",
          error && "border-[var(--error)]"
        )}
      >
        <div className="flex items-start gap-2 px-3 pt-2">
          <span className="text-[var(--fg-dim)] text-sm font-mono shrink-0 mt-0.5">
            {prompt}
          </span>
          <textarea
            className={cn(
              "flex-1 bg-transparent text-[var(--fg)] font-mono text-sm outline-none placeholder:text-[var(--fg-muted)] resize-none w-full",
              className
            )}
            {...props}
          />
        </div>
      </div>
      {error && (
        <div className="text-[var(--error)] text-xs mt-1 font-mono">
          [ERR] {error}
        </div>
      )}
    </div>
  );
}
