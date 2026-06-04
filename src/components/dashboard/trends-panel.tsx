"use client";

import { useState, useTransition } from "react";
import type { TrendReport } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { ScoreBar } from "@/components/ui/progress-bar";
import { relativeTime } from "@/lib/utils";
import { researchTrend, scanYouTubeTrending, deleteTrend, updateTrend, createManualTrend } from "@/server/actions/trends";
import { TrendingUp, Search, Trash2, Pencil, Plus, Check, X } from "lucide-react";

// ── inline single-line edit ───────────────────────────────────────────────────

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function save() {
    if (draft.trim()) { onSave(draft.trim()); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          className="flex-1 bg-transparent border border-[var(--fg)] text-[var(--fg)] font-mono text-base px-2 py-0.5 outline-none"
        />
        <button onClick={save} className="text-[var(--fg)] p-0.5"><Check className="h-3 w-3" /></button>
        <button onClick={() => setEditing(false)} className="text-[var(--fg-muted)] p-0.5"><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group flex-1 min-w-0">
      <span className="font-mono font-bold text-[var(--fg)] text-base truncate">{value}</span>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-opacity p-0.5"
        title="Edit topic"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── editable text area block ──────────────────────────────────────────────────

function EditableTextArea({
  label,
  value,
  onSave,
  rows = 6,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function save() { onSave(draft); setEditing(false); }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest">{label}</div>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={rows}
            autoFocus
            className="w-full bg-transparent border border-[var(--fg)] text-[var(--fg)] font-mono text-xs px-3 py-2 outline-none resize-y leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1 text-xs font-mono text-[var(--fg)] border border-[var(--fg)] px-2 py-1 hover:bg-[rgba(51,255,0,0.05)]"
            >
              <Check className="h-3 w-3" /> save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs font-mono text-[var(--fg-muted)] border border-[var(--border)] px-2 py-1"
            >
              <X className="h-3 w-3" /> cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-mono text-[var(--fg)] whitespace-pre-wrap">
          {value || <span className="text-[var(--fg-dim)] italic">empty — click pencil to add notes</span>}
        </p>
      )}
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function TrendsPanel({ trends: initialTrends }: { trends: TrendReport[] }) {
  const [trends, setTrends] = useState(initialTrends);
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<TrendReport | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Manual add form
  const [showManual, setShowManual] = useState(false);
  const [manualTopic, setManualTopic] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  function handleResearch() {
    if (!topic.trim()) return;
    startTransition(async () => {
      try {
        setMessage("// running deep research...");
        const report = await researchTrend(topic.trim());
        setMessage("[OK] research complete");
        setTopic("");
        const r = report as TrendReport;
        setTrends((prev) => [r, ...prev]);
        setSelected(r);
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

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    startTransition(async () => {
      try {
        await deleteTrend(id);
        setTrends((prev) => prev.filter((t) => t.id !== id));
        if (selected?.id === id) setSelected(null);
        setMessage("[OK] trend deleted");
      } catch {
        setMessage("[ERR] delete failed");
      }
    });
  }

  function patchTrend(id: string, patch: Partial<TrendReport>) {
    setTrends((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelected((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  function handleSaveTopic(id: string, newTopic: string) {
    startTransition(async () => {
      try {
        await updateTrend(id, { topic: newTopic });
        patchTrend(id, { topic: newTopic });
        setMessage("[OK] topic updated");
      } catch { setMessage("[ERR] update failed"); }
    });
  }

  function handleSaveSummary(id: string, summary: string) {
    startTransition(async () => {
      try {
        await updateTrend(id, { summary });
        patchTrend(id, { summary });
        setMessage("[OK] summary updated");
      } catch { setMessage("[ERR] update failed"); }
    });
  }

  function handleSaveReport(id: string, researchReport: string) {
    startTransition(async () => {
      try {
        await updateTrend(id, { researchReport });
        patchTrend(id, { researchReport });
        setMessage("[OK] report updated");
      } catch { setMessage("[ERR] update failed"); }
    });
  }

  function handleCreateManual() {
    if (!manualTopic.trim()) return;
    startTransition(async () => {
      try {
        const report = await createManualTrend(manualTopic.trim(), manualNotes.trim() || undefined);
        const r = report as TrendReport;
        setTrends((prev) => [r, ...prev]);
        setSelected(r);
        setManualTopic("");
        setManualNotes("");
        setShowManual(false);
        setMessage("[OK] trend added manually");
      } catch {
        setMessage("[ERR] create failed");
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
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">Trend Engine</h1>
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
          <TerminalButton variant="primary" loading={isPending} icon={<Search className="h-3 w-3" />} onClick={handleResearch}>
            Research
          </TerminalButton>
        </div>
        <div className="text-[var(--fg-muted)] text-xs font-mono mt-2">
          // uses claude opus for deep analysis + scoring — stored in knowledge base
        </div>
      </TerminalCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Trend list sidebar ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest">
              // detected trends ({trends.length})
            </div>
            <button
              onClick={() => setShowManual((v) => !v)}
              className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              title="Add trend manually"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Manual add form */}
          {showManual && (
            <div className="border border-[var(--fg-dim)] p-2 space-y-2">
              <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest">
                // add trend manually
              </div>
              <TerminalInput
                prompt="topic>"
                placeholder="trend topic..."
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !manualNotes && handleCreateManual()}
              />
              <textarea
                placeholder="notes / summary (optional)"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-[var(--border)] text-[var(--fg)] font-mono text-xs px-2 py-1 outline-none resize-none placeholder:text-[var(--fg-dim)]"
              />
              <div className="flex gap-2">
                <TerminalButton variant="primary" size="sm" loading={isPending} onClick={handleCreateManual}>
                  Add
                </TerminalButton>
                <TerminalButton variant="secondary" size="sm" onClick={() => { setShowManual(false); setManualTopic(""); setManualNotes(""); }}>
                  Cancel
                </TerminalButton>
              </div>
            </div>
          )}

          {trends.length === 0 && !showManual && (
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
                  <div className="text-sm font-mono text-[var(--fg)] font-bold truncate">{trend.topic}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs font-mono px-1 ${trend.status === "analyzed" ? "badge-ok" : "badge-warn"}`}>
                      [{trend.status.toUpperCase()}]
                    </span>
                    <span className="text-xs text-[var(--fg-muted)] font-mono">{trend.source}</span>
                  </div>
                  <div className="text-xs text-[var(--fg-muted)] font-mono mt-1">{relativeTime(trend.createdAt)}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {trend.overallScore !== null && (
                    <span className={`text-sm font-bold font-mono ${
                      trend.overallScore >= 7 ? "text-[var(--fg)] text-glow" :
                      trend.overallScore >= 4 ? "text-[var(--amber)]" : "text-[var(--error)]"
                    }`}>
                      {trend.overallScore.toFixed(1)}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, trend.id)}
                    className="text-[var(--fg-muted)] hover:text-[var(--error)] p-1 transition-colors"
                    title="Delete trend"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Detail / editor panel ── */}
        <div className="lg:col-span-2">
          {selected ? (
            <TerminalCard
              title={selected.topic}
              titlePrefix=">"
              statusBadge={{ label: selected.status.toUpperCase(), variant: selected.status === "analyzed" ? "ok" : "warn" }}
            >
              <div className="space-y-4">
                {/* Editable topic */}
                <div className="border-b border-[var(--border)] pb-3">
                  <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest mb-1">// topic</div>
                  <InlineEdit
                    value={selected.topic}
                    onSave={(v) => handleSaveTopic(selected.id, v)}
                  />
                </div>

                {/* Scores (read-only) */}
                {selected.overallScore !== null && (
                  <div className="space-y-2">
                    <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest">// scores</div>
                    <ScoreBar label="Overall" score={selected.overallScore ?? 0} />
                    <ScoreBar label="Velocity" score={selected.velocityScore ?? 0} />
                    <ScoreBar label="Opportunity" score={selected.opportunityScore ?? 0} />
                    <ScoreBar label="Relevance" score={selected.relevanceScore ?? 0} />
                    <ScoreBar label="Competition" score={10 - (selected.competitionScore ?? 0)} />
                  </div>
                )}

                {/* Editable summary */}
                <EditableTextArea
                  label="// summary"
                  value={selected.summary ?? ""}
                  onSave={(v) => handleSaveSummary(selected.id, v)}
                  rows={4}
                />

                {/* Viral angles (read-only) */}
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

                {/* Related topics (read-only) */}
                {selected.relatedTopics.length > 0 && (
                  <div>
                    <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
                      // related topics
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.relatedTopics.map((t, i) => (
                        <span key={i} className="badge-dim text-xs font-mono px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editable research report */}
                <EditableTextArea
                  label="// full research report"
                  value={selected.researchReport ?? ""}
                  onSave={(v) => handleSaveReport(selected.id, v)}
                  rows={12}
                />
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
