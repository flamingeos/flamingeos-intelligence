"use client";

import { useState, useTransition } from "react";
import type { TitleReport } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { ScoreBar } from "@/components/ui/progress-bar";
import { relativeTime } from "@/lib/utils";
import { generateVideoTitles, deleteTitleReport, deleteTitleFromReport } from "@/server/actions/titles";
import type { TitleOption } from "@/types";
import { Type, Copy, Star, Trash2 } from "lucide-react";

export function TitlesPanel({ reports: initialReports }: { reports: TitleReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<TitleReport | null>(null);
  const [message, setMessage] = useState("");
  const [copiedTitle, setCopiedTitle] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!topic.trim()) return;
    startTransition(async () => {
      try {
        setMessage("// generating 20 titles with gpt-4o...");
        const report = await generateVideoTitles(topic.trim());
        setMessage("[OK] titles generated");
        setTopic("");
        const newReport = report as TitleReport;
        setReports((prev) => [newReport, ...prev]);
        setSelected(newReport);
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "generation failed"}`);
      }
    });
  }

  function handleCopy(title: string) {
    navigator.clipboard.writeText(title);
    setCopiedTitle(title);
    setTimeout(() => setCopiedTitle(null), 1500);
  }

  function handleDeleteReport(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    startTransition(async () => {
      try {
        await deleteTitleReport(id);
        setReports((prev) => prev.filter((r) => r.id !== id));
        if (selected?.id === id) setSelected(null);
        setMessage("[OK] report deleted");
      } catch {
        setMessage("[ERR] delete failed");
      }
    });
  }

  function handleDeleteTitle(reportId: string, titleIndex: number, titleText: string) {
    startTransition(async () => {
      try {
        await deleteTitleFromReport(reportId, titleIndex);
        // Optimistically update selected report's titles
        setSelected((prev) => {
          if (!prev || prev.id !== reportId) return prev;
          const titles = (prev.titles as unknown as TitleOption[]).filter((_, i) => i !== titleIndex);
          return { ...prev, titles: titles as unknown, topTitle: titles[0]?.title ?? "" } as TitleReport;
        });
        setReports((prev) =>
          prev.map((r) => {
            if (r.id !== reportId) return r;
            const titles = (r.titles as unknown as TitleOption[]).filter((_, i) => i !== titleIndex);
            return { ...r, titles: titles as unknown, topTitle: titles[0]?.title ?? "" } as TitleReport;
          })
        );
        setMessage(`[OK] removed "${titleText.slice(0, 40)}..."`);
      } catch {
        setMessage("[ERR] delete failed");
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // title generator --gpt4o --20-options
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            Title Engine
          </h1>
        </div>
        {message && (
          <span className={`text-xs font-mono ${message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      <TerminalCard title="Generate Titles" titlePrefix=">">
        <div className="flex gap-3">
          <div className="flex-1">
            <TerminalInput
              prompt="topic>"
              placeholder="video topic..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
          </div>
          <TerminalButton
            variant="primary"
            loading={isPending}
            onClick={handleGenerate}
          >
            Generate 20 Titles
          </TerminalButton>
        </div>
        <div className="text-[var(--fg-muted)] text-xs font-mono mt-2">
          // each title scored on: curiosity, emotion, clarity, searchability, ctr prediction
        </div>
      </TerminalCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* History */}
        <div className="space-y-2">
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-2">
            // history ({reports.length})
          </div>
          {reports.length === 0 && (
            <div className="text-[var(--fg-muted)] text-xs font-mono text-center py-8 border border-[var(--border)]">
              no titles generated yet
            </div>
          )}
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelected(report)}
              className={`terminal-window p-3 cursor-pointer transition-all ${
                selected?.id === report.id
                  ? "border-[var(--fg)] bg-[rgba(51,255,0,0.05)]"
                  : "hover:border-[var(--fg-dim)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-[var(--fg)] font-bold truncate">
                    {report.topic}
                  </div>
                  {report.topTitle && (
                    <div className="text-xs text-[var(--fg-muted)] font-mono mt-1 truncate">
                      &gt; {report.topTitle}
                    </div>
                  )}
                  <div className="text-xs text-[var(--fg-muted)] font-mono mt-1">
                    {relativeTime(report.createdAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteReport(e, report.id)}
                  className="text-[var(--fg-muted)] hover:text-[var(--error)] p-1 shrink-0 transition-colors"
                  title="Delete report"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Titles list */}
        <div className="lg:col-span-2">
          {selected ? (() => {
            const titles = (selected.titles as unknown as TitleOption[]);
            return (
              <TerminalCard title={selected.topic} titlePrefix=">">
                <div className="space-y-3">
                  {titles.map((t, i) => (
                    <div
                      key={i}
                      className={`border p-3 transition-all ${
                        i === 0 ? "border-[var(--fg)]" : "border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {i === 0 && (
                              <Star className="h-3 w-3 text-[var(--amber)]" fill="currentColor" />
                            )}
                            <span className="text-[var(--fg-muted)] text-xs font-mono">
                              #{String(i + 1).padStart(2, "0")}
                            </span>
                            <span className={`text-xs font-mono font-bold ${
                              t.overallScore >= 8 ? "text-[var(--fg)] text-glow" :
                              t.overallScore >= 6 ? "text-[var(--amber)]" : "text-[var(--fg-dim)]"
                            }`}>
                              {t.overallScore.toFixed(1)}/10
                            </span>
                          </div>
                          <div className="text-sm font-mono text-[var(--fg)] mb-2">{t.title}</div>
                          <div className="grid grid-cols-2 gap-1">
                            <ScoreBar label="CTR" score={t.ctrPrediction} />
                            <ScoreBar label="Curiosity" score={t.curiosityScore} />
                            <ScoreBar label="Emotion" score={t.emotionScore} />
                            <ScoreBar label="Search" score={t.searchabilityScore} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(t.title)}
                            className="text-[var(--fg-muted)] hover:text-[var(--fg)] p-1 transition-colors"
                            title="Copy title"
                          >
                            {copiedTitle === t.title ? (
                              <span className="text-xs text-[var(--fg)]">[✓]</span>
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteTitle(selected.id, i, t.title)}
                            className="text-[var(--fg-muted)] hover:text-[var(--error)] p-1 transition-colors"
                            title="Remove title"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TerminalCard>
            );
          })() : (
            <div className="terminal-window h-full flex items-center justify-center text-[var(--fg-muted)] text-sm font-mono p-8 min-h-64">
              <div className="text-center">
                <Type className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>// select a session or generate new titles above</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
