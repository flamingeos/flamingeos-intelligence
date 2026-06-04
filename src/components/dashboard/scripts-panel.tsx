"use client";

import { useState, useTransition } from "react";
import type { ScriptReport } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { relativeTime } from "@/lib/utils";
import { generateVideoScript, deleteScript, updateScript, createManualScript } from "@/server/actions/scripts";
import { FileText, Copy, Trash2, Pencil, Plus, Check, X } from "lucide-react";

const SCRIPT_TYPES = [
  { value: "long_form", label: "Long Form" },
  { value: "short_form", label: "Short Form" },
  { value: "documentary", label: "Documentary" },
  { value: "storytelling", label: "Storytelling" },
  { value: "educational", label: "Educational" },
  { value: "challenge", label: "Challenge" },
] as const;

const DURATIONS = [5, 8, 10, 15, 20, 30];

// ── editable text block ───────────────────────────────────────────────────────

function EditableBlock({
  label,
  value,
  onSave,
  rows = 8,
  highlightColor,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  rows?: number;
  highlightColor?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function save() {
    onSave(draft);
    setEditing(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className={`text-xs font-mono uppercase tracking-widest ${highlightColor ?? "text-[var(--fg-muted)]"}`}>
          {label}
        </div>
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
              className="flex items-center gap-1 text-xs font-mono text-[var(--fg)] border border-[var(--fg)] px-2 py-1 hover:bg-[rgba(51,255,0,0.05)] transition-colors"
            >
              <Check className="h-3 w-3" /> save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs font-mono text-[var(--fg-muted)] border border-[var(--border)] px-2 py-1 hover:border-[var(--fg-dim)] transition-colors"
            >
              <X className="h-3 w-3" /> cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={`text-xs font-mono text-[var(--fg)] whitespace-pre-wrap border p-3 leading-relaxed ${
          highlightColor ? "border-[var(--amber-dim)]" : "border-[var(--border)]"
        } max-h-96 overflow-y-auto`}>
          {value || <span className="text-[var(--fg-dim)] italic">empty — click pencil to write</span>}
        </div>
      )}
    </div>
  );
}

function InlineEditTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
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
          className="flex-1 bg-transparent border border-[var(--fg)] text-[var(--fg)] font-mono text-sm px-2 py-0.5 outline-none"
        />
        <button onClick={save} className="text-[var(--fg)] p-0.5"><Check className="h-3 w-3" /></button>
        <button onClick={() => setEditing(false)} className="text-[var(--fg-muted)] p-0.5"><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group flex-1 min-w-0">
      <span className="font-mono text-sm font-bold truncate text-[var(--fg)]">{value}</span>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-opacity p-0.5"
        title="Edit title"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function ScriptsPanel({ scripts: initialScripts }: { scripts: ScriptReport[] }) {
  const [scripts, setScripts] = useState(initialScripts);
  const [topic, setTopic] = useState("");
  const [scriptType, setScriptType] = useState<"long_form" | "short_form" | "documentary" | "storytelling" | "educational" | "challenge">("long_form");
  const [duration, setDuration] = useState(10);
  const [selected, setSelected] = useState<ScriptReport | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Manual create form
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualType, setManualType] = useState("long_form");

  function handleGenerate() {
    if (!topic.trim()) return;
    startTransition(async () => {
      try {
        setMessage("// generating script with claude opus...");
        const report = await generateVideoScript(topic.trim(), scriptType, duration);
        setMessage("[OK] script generated");
        setTopic("");
        const s = report as ScriptReport;
        setScripts((prev) => [s, ...prev]);
        setSelected(s);
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "generation failed"}`);
      }
    });
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    startTransition(async () => {
      try {
        await deleteScript(id);
        setScripts((prev) => prev.filter((s) => s.id !== id));
        if (selected?.id === id) setSelected(null);
        setMessage("[OK] script deleted");
      } catch {
        setMessage("[ERR] delete failed");
      }
    });
  }

  function patchScript(id: string, patch: Partial<ScriptReport>) {
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setSelected((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  function handleSaveTitle(id: string, title: string) {
    startTransition(async () => {
      try {
        await updateScript(id, { title });
        patchScript(id, { title });
        setMessage("[OK] title updated");
      } catch { setMessage("[ERR] update failed"); }
    });
  }

  function handleSaveHook(id: string, hook: string) {
    startTransition(async () => {
      try {
        await updateScript(id, { hook });
        patchScript(id, { hook });
        setMessage("[OK] hook updated");
      } catch { setMessage("[ERR] update failed"); }
    });
  }

  function handleSaveScript(id: string, fullScript: string) {
    startTransition(async () => {
      try {
        await updateScript(id, { fullScript });
        const wordCount = fullScript.trim().split(/\s+/).filter(Boolean).length;
        patchScript(id, { fullScript, wordCount });
        setMessage("[OK] script updated");
      } catch { setMessage("[ERR] update failed"); }
    });
  }

  function handleCreateManual() {
    if (!manualTitle.trim()) return;
    startTransition(async () => {
      try {
        const report = await createManualScript(manualTitle.trim(), manualType);
        const s = report as ScriptReport;
        setScripts((prev) => [s, ...prev]);
        setSelected(s);
        setManualTitle("");
        setShowManual(false);
        setMessage("[OK] manual script created");
      } catch {
        setMessage("[ERR] create failed");
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // script generator --claude-opus
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">Script Studio</h1>
        </div>
        {message && (
          <span className={`text-xs font-mono ${message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* ── Mode tabs ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowManual(false)}
          className={`text-xs font-mono px-3 py-1.5 border transition-all ${
            !showManual
              ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
          }`}
        >
          Generate with AI
        </button>
        <button
          onClick={() => setShowManual(true)}
          className={`text-xs font-mono px-3 py-1.5 border transition-all ${
            showManual
              ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
          }`}
        >
          Write Script Manually
        </button>
      </div>

      {!showManual ? (
        <TerminalCard title="Generate Script — AI" titlePrefix=">">
          <div className="space-y-3">
            <TerminalInput
              prompt="topic>"
              placeholder="video topic or concept..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <div className="flex gap-3 flex-wrap">
              <div>
                <div className="text-[var(--fg-muted)] text-xs font-mono mb-1">// type</div>
                <div className="flex gap-1 flex-wrap">
                  {SCRIPT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setScriptType(t.value)}
                      className={`text-xs font-mono px-2 py-1 border transition-all ${
                        scriptType === t.value
                          ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                          : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[var(--fg-muted)] text-xs font-mono mb-1">// duration (min)</div>
                <div className="flex gap-1">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`text-xs font-mono px-2 py-1 border transition-all ${
                        duration === d
                          ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                          : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <TerminalButton variant="primary" loading={isPending} onClick={handleGenerate}>
              Generate Full Script
            </TerminalButton>
          </div>
        </TerminalCard>
      ) : (
        <TerminalCard title="Write Script Manually" titlePrefix="+">
          <div className="space-y-3">
            <div className="text-[var(--fg-muted)] text-xs font-mono">
              // create a blank script entry — write the hook and full script yourself in the editor
            </div>
            <TerminalInput
              prompt="title>"
              placeholder="script title or video concept..."
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateManual()}
            />
            <div>
              <div className="text-[var(--fg-muted)] text-xs font-mono mb-1">// type</div>
              <div className="flex gap-1 flex-wrap">
                {SCRIPT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setManualType(t.value)}
                    className={`text-xs font-mono px-2 py-1 border transition-all ${
                      manualType === t.value
                        ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                        : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <TerminalButton variant="primary" loading={isPending} onClick={handleCreateManual}>
              Create Blank Script
            </TerminalButton>
          </div>
        </TerminalCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Script list sidebar ── */}
        <div className="space-y-2">
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-2">
            // saved scripts ({scripts.length})
          </div>

          {scripts.length === 0 && (
            <div className="text-[var(--fg-muted)] text-xs font-mono text-center py-8 border border-[var(--border)]">
              no scripts yet
            </div>
          )}

          {scripts.map((script) => (
            <div
              key={script.id}
              onClick={() => setSelected(script)}
              className={`terminal-window p-3 cursor-pointer transition-all ${
                selected?.id === script.id
                  ? "border-[var(--fg)] bg-[rgba(51,255,0,0.05)]"
                  : "hover:border-[var(--fg-dim)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-[var(--fg)] font-bold truncate">{script.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge-dim text-xs font-mono px-1">
                      {script.scriptType.replace("_", " ").toUpperCase()}
                    </span>
                    {script.wordCount != null && script.wordCount > 0 && (
                      <span className="text-xs text-[var(--fg-muted)] font-mono">{script.wordCount} words</span>
                    )}
                    {script.aiModel === "manual" && (
                      <span className="text-[10px] font-mono text-[var(--fg-dim)] badge-dim px-1">manual</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--fg-muted)] font-mono mt-1">{relativeTime(script.createdAt)}</div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, script.id)}
                  className="text-[var(--fg-muted)] hover:text-[var(--error)] p-1 shrink-0 transition-colors"
                  title="Delete script"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Script viewer / editor ── */}
        <div className="lg:col-span-2">
          {selected ? (
            <TerminalCard
              title={selected.title}
              titlePrefix=">"
              action={
                <TerminalButton variant="secondary" size="sm" bracket={false} onClick={() => handleCopy(selected.fullScript)}>
                  {copied ? "[COPIED]" : <Copy className="h-3 w-3" />}
                </TerminalButton>
              }
            >
              <div className="space-y-4">
                {/* Editable title */}
                <div className="border-b border-[var(--border)] pb-3">
                  <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest mb-1">// title</div>
                  <InlineEditTitle
                    value={selected.title}
                    onSave={(v) => handleSaveTitle(selected.id, v)}
                  />
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="border border-[var(--border)] p-2 text-center">
                    <div className="text-[var(--fg)] font-bold">{selected.scriptType.replace("_", " ").toUpperCase()}</div>
                    <div className="text-[var(--fg-muted)]">type</div>
                  </div>
                  <div className="border border-[var(--border)] p-2 text-center">
                    <div className="text-[var(--fg)] font-bold">{selected.wordCount ?? 0}</div>
                    <div className="text-[var(--fg-muted)]">words</div>
                  </div>
                  <div className="border border-[var(--border)] p-2 text-center">
                    <div className="text-[var(--fg)] font-bold">
                      {selected.estimatedDuration ? `${Math.round(selected.estimatedDuration / 60)}m` : "N/A"}
                    </div>
                    <div className="text-[var(--fg-muted)]">duration</div>
                  </div>
                </div>

                {/* Editable hook */}
                <EditableBlock
                  label="▶ HOOK (0:00-0:30)"
                  value={selected.hook ?? ""}
                  onSave={(v) => handleSaveHook(selected.id, v)}
                  rows={6}
                  highlightColor="text-[var(--amber)]"
                />

                {/* Open loops (read-only) */}
                {selected.openLoops.length > 0 && (
                  <div>
                    <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
                      // open loops ({selected.openLoops.length})
                    </div>
                    <ul className="space-y-1">
                      {selected.openLoops.map((loop, i) => (
                        <li key={i} className="text-xs font-mono text-[var(--fg)] flex gap-2">
                          <span className="text-[var(--fg-muted)]">&gt;</span>
                          {loop}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Editable full script */}
                <EditableBlock
                  label="// full script"
                  value={selected.fullScript}
                  onSave={(v) => handleSaveScript(selected.id, v)}
                  rows={20}
                />
              </div>
            </TerminalCard>
          ) : (
            <div className="terminal-window h-full flex items-center justify-center text-[var(--fg-muted)] text-sm font-mono p-8 min-h-64">
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>// select a script to view or generate a new one above</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
