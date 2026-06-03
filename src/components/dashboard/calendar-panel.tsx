"use client";

import { useState } from "react";
import type { ContentCalendar } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { Calendar } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  planned: "badge-dim",
  scripted: "badge-warn",
  recorded: "text-[var(--fg)] border border-[var(--fg-muted)]",
  edited: "text-[var(--amber)] border border-[var(--amber-dim)]",
  published: "badge-ok",
};

export function CalendarPanel({ entries }: { entries: ContentCalendar[] }) {
  const [selected, setSelected] = useState<ContentCalendar | null>(null);

  const byDate: Record<string, ContentCalendar[]> = {};
  for (const entry of entries) {
    const key = entry.scheduledDate.toISOString().split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(entry);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
          // content calendar --ai-generated
        </div>
        <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
          Content Calendar
        </h1>
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">
        // calendar entries are auto-populated by the weekly AI agent
      </div>

      {Object.keys(byDate).length === 0 ? (
        <div className="terminal-window p-8 text-center">
          <Calendar className="h-8 w-8 mx-auto mb-3 opacity-30 text-[var(--fg-muted)]" />
          <div className="text-[var(--fg-muted)] text-sm font-mono">
            // no calendar entries yet
          </div>
          <div className="text-[var(--fg-muted)] text-xs font-mono mt-2">
            run the weekly agent to auto-populate your content schedule
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, dayEntries]) => (
            <div key={date}>
              <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-2">
                // {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric"
                })}
              </div>
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
                    className={`terminal-window p-3 cursor-pointer transition-all ${
                      selected?.id === entry.id
                        ? "border-[var(--fg)] bg-[rgba(51,255,0,0.05)]"
                        : "hover:border-[var(--fg-dim)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--fg-muted)] text-xs font-mono">
                          P{entry.priority}
                        </span>
                        <span className="text-sm font-mono text-[var(--fg)] font-bold">
                          {entry.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.scriptType && (
                          <span className="badge-dim text-xs font-mono px-1 uppercase">
                            {entry.scriptType.replace("_", "/")}
                          </span>
                        )}
                        <span className={`text-xs font-mono px-1.5 py-0.5 uppercase ${STATUS_COLORS[entry.status] ?? "badge-dim"}`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                    {selected?.id === entry.id && entry.notes && (
                      <div className="mt-2 text-xs font-mono text-[var(--fg-muted)] border-t border-[var(--border)] pt-2">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
