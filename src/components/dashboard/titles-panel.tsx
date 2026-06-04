"use client";

import { useState, useTransition, useRef } from "react";
import type { TitleReport } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { ScoreBar } from "@/components/ui/progress-bar";
import { relativeTime } from "@/lib/utils";
import {
  generateVideoTitles,
  deleteTitleReport,
  deleteTitleFromReport,
  updateTitleInReport,
  addTitleToReport,
  createManualTitleSession,
} from "@/server/actions/titles";
import type { TitleOption } from "@/types";
import { Type, Copy, Star, Trash2, Pencil, Plus, Check, X } from "lucide-react";

// ── inline text edit ──────────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  inputClassName,
}: {
  value: string;
  onSave: (v: string) => void;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  function start() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => ref.current?.focus(), 0);
  }

  function save() {
    if (draft.trim()) onSave(draft.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className={`flex-1 bg-transparent border border-[var(--fg)] text-[var(--fg)] font-mono text-sm px-2 py-0.5 outline-none ${inputClassName ?? ""}`}
        />
        <button onClick={save} className="text-[var(--fg)] hover:text-glow p-0.5">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={() => setEditing(false)} className="text-[var(--fg-muted)] hover:text-[var(--error)] p-0.5">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-1 group min-w-0">
      <span className="text-sm font-mono text-[var(--fg)] flex-1 min-w-0">{value}</span>
      <button
        onClick={start}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-opacity p-0.5"
        title="Edit title"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function TitlesPanel({ reports: initialReports }: { reports: TitleReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<TitleReport | null>(null);
  const [message, setMessage] = useState("");
  const [copiedTitle, setCopiedTitle] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Manual session creation
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionTopic, setNewSessionTopic] = useState("");

  // Manual title add (within selected session)
  const [showAddTitle, setShowAddTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function handleGenerate() {
    if (!topic.trim()) return;
    startTransition(async () => {
      try {
        setMessage("// generating 20 titles with gpt-4o...");
        const report = await generateVideoTitles(topic.trim());
        setMessage("[OK] titles generated");
        setTopic("");
        const r = report as TitleReport;
        setReports((prev) => [r, ...prev]);
        setSelected(r);
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
        setMessage("[OK] session deleted");
      } catch {
        setMessage("[ERR] delete failed");
      }
    });
  }

  function handleDeleteTitle(reportId: string, titleIndex: number) {
    startTransition(async () => {
      try {
        await deleteTitleFromReport(reportId, titleIndex);
        patchTitles(reportId, (prev) => prev.filter((_, i) => i !== titleIndex));
        setMessage("[OK] title removed");
      } catch {
        setMessage("[ERR] delete failed");
      }
    });
  }

  function handleEditTitle(reportId: string, titleIndex: number, newValue: string) {
    startTransition(async () => {
      try {
        await updateTitleInReport(reportId, titleIndex, newValue);
        patchTitles(reportId, (prev) =>
          prev.map((t, i) => (i === titleIndex ? { ...t, title: newValue } : t))
        );
        setMessage("[OK] title updated");
      } catch {
        setMessage("[ERR] update failed");
      }
    });
  }

  function handleAddTitle() {
    if (!newTitle.trim() || !selected) return;
    startTransition(async () => {
      try {
        await addTitleToReport(selected.id, newTitle.trim());
        const entry: TitleOption = {
          title: newTitle.trim(),
          overallScore: 0,
          ctrPrediction: 0,
          curiosityScore: 0,
          emotionScore: 0,
          searchabilityScore: 0,
          clarityScore: 0,
          reasoning: "Manually added",
        };
        patchTitles(selected.id, (prev) => [...prev, entry]);
        setNewTitle("");
        setShowAddTitle(false);
        setMessage("[OK] title added");
      } catch {
        setMessage("[ERR] add failed");
      }
    });
  }

  function handleCreateManualSession() {
    if (!newSessionTopic.trim()) return;
    startTransition(async () => {
      try {
        const report = await createManualTitleSession(newSessionTopic.trim());
        const r = report as TitleReport;
        setReports((prev) => [r, ...prev]);
        setSelected(r);
        setNewSessionTopic("");
        setShowNewSession(false);
        setMessage("[OK] manual session created");
      } catch {
        setMessage("[ERR] create failed");
      }
    });
  }

  // Patch titles in both `reports` and `selected`
  function patchTitles(reportId: string, fn: (prev: TitleOption[]) => TitleOption[]) {
    const patch = (r: TitleReport) => {
      const updated = fn(r.titles as unknown as TitleOption[]);
      return { ...r, titles: updated as unknown, topTitle: updated[0]?.title ?? "" } as TitleReport;
    };
    setReports((prev) => prev.map((r) => (r.id === reportId ? patch(r) : r)));
    setSelected((prev) => (prev?.id === reportId ? patch(prev) : prev));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // title generator --gpt4o --20-options
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">Title Engine</h1>
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
          <TerminalButton variant="primary" loading={isPending} onClick={handleGenerate}>
            Generate 20 Titles
          </TerminalButton>
        </div>
        <div className="text-[var(--fg-muted)] text-xs font-mono mt-2">
          // each title scored on: curiosity, emotion, clarity, searchability, ctr prediction
        </div>
      </TerminalCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── History sidebar ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest">
              // history ({reports.length})
            </div>
            <button
              onClick={() => setShowNewSession((v) => !v)}
              className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              title="Create session manually"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Manual session form */}
          {showNewSession && (
            <div className="border border-[var(--fg-dim)] p-2 space-y-2">
              <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest">
                // new manual session
              </div>
              <TerminalInput
                prompt="topic>"
                placeholder="session topic..."
                value={newSessionTopic}
                onChange={(e) => setNewSessionTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateManualSession()}
              />
              <div className="flex gap-2">
                <TerminalButton variant="primary" size="sm" loading={isPending} onClick={handleCreateManualSession}>
                  Create
                </TerminalButton>
                <TerminalButton variant="secondary" size="sm" onClick={() => setShowNewSession(false)}>
                  Cancel
                </TerminalButton>
              </div>
            </div>
          )}

          {reports.length === 0 && !showNewSession && (
            <div className="text-[var(--fg-muted)] text-xs font-mono text-center py-8 border border-[var(--border)]">
              no titles generated yet
            </div>
          )}

          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => { setSelected(report); setShowAddTitle(false); }}
              className={`terminal-window p-3 cursor-pointer transition-all ${
                selected?.id === report.id
                  ? "border-[var(--fg)] bg-[rgba(51,255,0,0.05)]"
                  : "hover:border-[var(--fg-dim)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-[var(--fg)] font-bold truncate">{report.topic}</div>
                  {report.topTitle && (
                    <div className="text-xs text-[var(--fg-muted)] font-mono mt-1 truncate">
                      &gt; {report.topTitle}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--fg-muted)] font-mono">{relativeTime(report.createdAt)}</span>
                    {report.aiModel === "manual" && (
                      <span className="text-[10px] font-mono text-[var(--fg-dim)] badge-dim px-1">manual</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteReport(e, report.id)}
                  className="text-[var(--fg-muted)] hover:text-[var(--error)] p-1 shrink-0 transition-colors"
                  title="Delete session"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Title list ── */}
        <div className="lg:col-span-2">
          {selected ? (() => {
            const titles = selected.titles as unknown as TitleOption[];
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {i === 0 && <Star className="h-3 w-3 text-[var(--amber)] shrink-0" fill="currentColor" />}
                            <span className="text-[var(--fg-muted)] text-xs font-mono shrink-0">
                              #{String(i + 1).padStart(2, "0")}
                            </span>
                            {t.overallScore > 0 && (
                              <span className={`text-xs font-mono font-bold shrink-0 ${
                                t.overallScore >= 8 ? "text-[var(--fg)] text-glow" :
                                t.overallScore >= 6 ? "text-[var(--amber)]" : "text-[var(--fg-dim)]"
                              }`}>
                                {t.overallScore.toFixed(1)}/10
                              </span>
                            )}
                          </div>
                          <div className="mb-2">
                            <InlineEdit
                              value={t.title}
                              onSave={(v) => handleEditTitle(selected.id, i, v)}
                            />
                          </div>
                          {t.overallScore > 0 && (
                            <div className="grid grid-cols-2 gap-1">
                              <ScoreBar label="CTR" score={t.ctrPrediction} />
                              <ScoreBar label="Curiosity" score={t.curiosityScore} />
                              <ScoreBar label="Emotion" score={t.emotionScore} />
                              <ScoreBar label="Search" score={t.searchabilityScore} />
                            </div>
                          )}
                          {t.reasoning === "Manually added" && (
                            <div className="text-[10px] font-mono text-[var(--fg-dim)] mt-1">manually added</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(t.title)}
                            className="text-[var(--fg-muted)] hover:text-[var(--fg)] p-1 transition-colors"
                            title="Copy"
                          >
                            {copiedTitle === t.title ? (
                              <span className="text-xs text-[var(--fg)]">[✓]</span>
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteTitle(selected.id, i)}
                            className="text-[var(--fg-muted)] hover:text-[var(--error)] p-1 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add title form */}
                  {showAddTitle ? (
                    <div className="border border-[var(--fg-dim)] p-3 space-y-2">
                      <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest">
                        // add title manually
                      </div>
                      <TerminalInput
                        prompt="title>"
                        placeholder="your title..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTitle()}
                      />
                      <div className="flex gap-2">
                        <TerminalButton variant="primary" size="sm" loading={isPending} onClick={handleAddTitle}>
                          Add
                        </TerminalButton>
                        <TerminalButton variant="secondary" size="sm" onClick={() => { setShowAddTitle(false); setNewTitle(""); }}>
                          Cancel
                        </TerminalButton>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddTitle(true)}
                      className="w-full border border-dashed border-[var(--border)] p-2 text-xs font-mono text-[var(--fg-muted)] hover:border-[var(--fg-dim)] hover:text-[var(--fg)] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      add title manually
                    </button>
                  )}
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
