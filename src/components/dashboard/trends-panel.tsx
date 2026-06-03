"use client";

import { useState, useTransition } from "react";
import type { TrendReport } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { ScoreBar } from "@/components/ui/progress-bar";
import { relativeTime } from "@/lib/utils";
import { researchTrend, scanYouTubeTrending } from "@/server/actions/trends";
import { TrendingUp, Search } from "lucide-react";

export function TrendsPanel({ trends: initialTrends }: { trends: TrendReport[] }) {
  const [trends] = useState(initialTrends);
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<TrendReport | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleResearch() {
    if (!topic.trim()) return;
    startTransition(async () => {
      try {
        setMessage("// running deep research...");
        const report = await researchTrend(topic.trim());
        setMessage("[OK] research complete");
        setTopic("");
        setSelected(report as TrendReport);
        window.location.reload();
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "research failed"}`);
      }
    });
  }

  function handleScan() {
    startTransition(async () => {
      try {
        setMessage("// scanning youtube trending...");
        await scanYouTubeTrending();
        setMessage("[OK] trending scan complete");
        window.location.reload();
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "scan failed"}`);
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // trend intelligence --realtime
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            Trend Engine
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {message && (
            <span className={`text-xs font-mono ${message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
              {message}
            </span>
          )}
          <TerminalButton
            variant="secondary"
            size="sm"
            loading={isPending}
            icon={<TrendingUp className="h-3 w-3" />}
            onClick={handleScan}
          >
            Scan Trending
          </TerminalButton>
        </div>
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* Research input */}
      <TerminalCard title="Deep Research" titlePrefix=">">
        <div className="flex gap-3">
          <div className="flex-1">
            <TerminalInput
              prompt="research>"
              placeholder="enter any topic to research..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
          </div>
          <TerminalButton
            variant="primary"
            loading={isPending}
            icon={<Search className="h-3 w-3" />}
            onClick={handleResearch}
          >
            Research
          </TerminalButton>
        </div>
        <div className="text-[var(--fg-muted)] text-xs font-mono mt-2">
          // uses claude opus for deep analysis + scoring — stored in knowledge base
        </div>
      </TerminalCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend list */}
        <div className="space-y-2">
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-2">
            // detected trends ({trends.length})
          </div>
          {trends.length === 0 && (
            <div className="text-[var(--fg-muted)] text-xs font-mono text-center py-8 border border-[var(--border)]">
              no trends yet — scan or research above
            </div>
          )}
          {trends.map((trend) => (
            <div
              key={trend.id}
              onClick={() => setSelected(trend)}
              className={`terminal-window p-3 cursor-pointer transition-all ${
                selected?.id === trend.id
                  ? "border-[var(--fg)] bg-[rgba(51,255,0,0.05)]"
                  : "hover:border-[var(--fg-dim)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-[var(--fg)] font-bold truncate">
                    {trend.topic}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-mono px-1 ${
                      trend.status === "analyzed" ? "badge-ok" : "badge-warn"
                    }`}>
                      [{trend.status.toUpperCase()}]
                    </span>
                    <span className="text-xs text-[var(--fg-muted)] font-mono">
                      {trend.source}
                    </span>
                  </div>
                </div>
                {trend.overallScore !== null && (
                  <div className={`text-sm font-bold font-mono shrink-0 ${
                    trend.overallScore >= 7 ? "text-[var(--fg)] text-glow" :
                    trend.overallScore >= 4 ? "text-[var(--amber)]" :
                    "text-[var(--error)]"
                  }`}>
                    {trend.overallScore.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="text-xs text-[var(--fg-muted)] font-mono mt-1">
                {relativeTime(trend.createdAt)}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <TerminalCard
              title={selected.topic}
              titlePrefix=">"
              statusBadge={{
                label: selected.status.toUpperCase(),
                variant: selected.status === "analyzed" ? "ok" : "warn"
              }}
            >
              <div className="space-y-4">
                {/* Scores */}
                {selected.overallScore !== null && (
                  <div className="space-y-2">
                    <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest">
                      // scores
                    </div>
                    <ScoreBar label="Overall" score={selected.overallScore ?? 0} />
                    <ScoreBar label="Velocity" score={selected.velocityScore ?? 0} />
                    <ScoreBar label="Opportunity" score={selected.opportunityScore ?? 0} />
                    <ScoreBar label="Relevance" score={selected.relevanceScore ?? 0} />
                    <ScoreBar label="Competition" score={10 - (selected.competitionScore ?? 0)} />
                  </div>
                )}

                {/* Summary */}
                {selected.summary && (
                  <div>
                    <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
                      // summary
                    </div>
                    <p className="text-sm font-mono text-[var(--fg)]">{selected.summary}</p>
                  </div>
                )}

                {/* Viral angles */}
                {selected.viralAngles.length > 0 && (
                  <div>
                    <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
                      // viral angles
                    </div>
                    <ul className="space-y-1">
                      {selected.viralAngles.map((angle, i) => (
                        <li key={i} className="text-sm font-mono text-[var(--fg)] flex gap-2">
                          <span className="text-[var(--fg-muted)]">&gt;</span>
                          {angle}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Related topics */}
                {selected.relatedTopics.length > 0 && (
                  <div>
                    <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
                      // related topics
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.relatedTopics.map((t, i) => (
                        <span key={i} className="badge-dim text-xs font-mono px-2 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full research report */}
                {selected.researchReport && (
                  <div>
                    <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
                      // full research report
                    </div>
                    <div className="text-xs font-mono text-[var(--fg)] whitespace-pre-wrap border border-[var(--border)] p-3 max-h-64 overflow-y-auto">
                      {selected.researchReport}
                    </div>
                  </div>
                )}
              </div>
            </TerminalCard>
          ) : (
            <div className="terminal-window h-full flex items-center justify-center text-[var(--fg-muted)] text-sm font-mono p-8 min-h-64">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>// select a trend to view research report</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
