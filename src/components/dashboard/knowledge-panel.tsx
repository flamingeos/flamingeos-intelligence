"use client";

import { useState, useMemo } from "react";
import type { KnowledgeBase } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalInput } from "@/components/ui/terminal-input";
import { relativeTime } from "@/lib/utils";
import { BookOpen, Search } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  trend: "text-[var(--amber)]",
  script: "text-[var(--fg)]",
  title: "text-[var(--fg)]",
  strategy: "text-[var(--fg)] text-glow",
  insight: "text-[var(--fg)]",
  competitor: "text-[var(--fg-dim)]",
};

export function KnowledgePanel({ items: initialItems }: { items: KnowledgeBase[] }) {
  const [items] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<KnowledgeBase | null>(null);

  const types = ["all", ...Array.from(new Set(items.map((i) => i.type)))];

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchType = typeFilter === "all" || item.type === typeFilter;
      const matchQuery =
        !query ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.content.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      return matchType && matchQuery;
    });
  }, [items, query, typeFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
          // knowledge base --searchable --all-ai-outputs
        </div>
        <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
          Knowledge Base
        </h1>
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* Search + filters */}
      <TerminalCard title="Search" titlePrefix=">">
        <div className="space-y-3">
          <TerminalInput
            prompt="search>"
            placeholder="search all AI outputs, scripts, trends..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`text-xs font-mono px-2 py-1 border uppercase transition-all ${
                  typeFilter === t
                    ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                    : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="text-[var(--fg-muted)] text-xs font-mono">
            // {filtered.length} entries found
          </div>
        </div>
      </TerminalCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Items list */}
        <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <div className="text-[var(--fg-muted)] text-xs font-mono text-center py-8 border border-[var(--border)]">
              no entries found
            </div>
          )}
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelected(item)}
              className={`terminal-window p-3 cursor-pointer transition-all ${
                selected?.id === item.id
                  ? "border-[var(--fg)] bg-[rgba(51,255,0,0.05)]"
                  : "hover:border-[var(--fg-dim)]"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`text-xs font-mono shrink-0 uppercase mt-0.5 ${TYPE_COLORS[item.type] ?? "text-[var(--fg-muted)]"}`}>
                  [{item.type}]
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-[var(--fg)] truncate">{item.title}</div>
                  <div className="text-xs text-[var(--fg-muted)] font-mono mt-0.5">
                    {relativeTime(item.createdAt)}
                  </div>
                </div>
              </div>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-xs font-mono text-[var(--fg-muted)] badge-dim px-1">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Content viewer */}
        <div className="lg:col-span-2">
          {selected ? (
            <TerminalCard title={selected.title} titlePrefix=">">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className={`uppercase ${TYPE_COLORS[selected.type] ?? "text-[var(--fg-muted)]"}`}>
                    [{selected.type}]
                  </span>
                  {selected.confidenceScore && (
                    <span className="text-[var(--fg-muted)]">
                      confidence: {selected.confidenceScore.toFixed(1)}/10
                    </span>
                  )}
                  <span className="text-[var(--fg-muted)] ml-auto">
                    {relativeTime(selected.createdAt)}
                  </span>
                </div>
                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map((tag, i) => (
                      <span key={i} className="badge-dim text-xs font-mono px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="border-t border-[var(--border)] pt-3">
                  <div className="text-xs font-mono text-[var(--fg)] whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">
                    {selected.content}
                  </div>
                </div>
              </div>
            </TerminalCard>
          ) : (
            <div className="terminal-window h-full flex items-center justify-center text-[var(--fg-muted)] text-sm font-mono p-8 min-h-64">
              <div className="text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>// select an entry to read</p>
                <p className="text-xs mt-2">// {items.length} total entries</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
