"use client";

import { useSession } from "next-auth/react";

export function Topbar({ title }: { title?: string }) {
  const { data: session } = useSession();
  const now = new Date();

  return (
    <header className="h-10 border-b border-[var(--border)] flex items-center px-4 gap-4 bg-[var(--bg)] shrink-0">
      <div className="text-[var(--fg-muted)] text-xs font-mono">
        flamingeos@intelligence:~$
      </div>
      {title && (
        <>
          <span className="text-[var(--fg-muted)]">/</span>
          <span className="text-[var(--fg)] text-xs font-mono uppercase tracking-widest text-glow">
            {title}
          </span>
        </>
      )}

      <div className="ml-auto flex items-center gap-4 text-xs font-mono">
        <span className="text-[var(--fg-muted)]">
          {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <span className="text-[var(--fg-muted)]">
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="text-[var(--fg)] border border-[var(--fg-muted)] px-2 py-0.5">
          {session?.user?.name ?? "USER"}
        </span>
      </div>
    </header>
  );
}
