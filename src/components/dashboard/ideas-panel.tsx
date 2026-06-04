"use client";

import { useState, useTransition, useRef } from "react";
import { relativeTime } from "@/lib/utils";
import { createIdea, updateIdea, cycleIdeaStatus, deleteIdea } from "@/server/actions/ideas";
import type { IdeaCategory, IdeaStatus } from "@/server/actions/ideas";
import { Trash2, Pencil, Check, X, ChevronDown, ChevronUp, Plus } from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: IdeaCategory; label: string; color: string }[] = [
  { value: "video",     label: "Video Concept", color: "text-[var(--fg)] border-[var(--fg)]" },
  { value: "title",     label: "Title Idea",    color: "text-[var(--amber)] border-[var(--amber-dim)]" },
  { value: "script",    label: "Script Idea",   color: "text-[var(--fg-muted)] border-[var(--border)]" },
  { value: "thumbnail", label: "Thumbnail",     color: "text-[var(--fg-dim)] border-[var(--border)]" },
  { value: "trend",     label: "Trend Note",    color: "text-[var(--amber)] border-[var(--amber-dim)]" },
  { value: "other",     label: "Other",         color: "text-[var(--fg-dim)] border-[var(--border)]" },
];

const STATUS_LABELS: Record<IdeaStatus, { label: string; next: string; class: string }> = {
  idea:        { label: "IDEA",        next: "→ IN PROGRESS", class: "badge-dim" },
  in_progress: { label: "IN PROGRESS", next: "→ DONE",        class: "badge-warn" },
  done:        { label: "DONE",        next: "→ IDEA",        class: "badge-ok" },
};

const PRIORITY_LABELS: Record<number, { label: string; class: string }> = {
  1: { label: "LOW",  class: "text-[var(--fg-dim)]" },
  2: { label: "MED",  class: "text-[var(--amber)]" },
  3: { label: "HIGH", class: "text-[var(--fg)] text-glow" },
};

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[5];
}

// ── idea type ─────────────────────────────────────────────────────────────────

type Idea = {
  id: string;
  title: string;
  notes: string | null;
  category: string;
  status: string;
  priority: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

// ── idea card ─────────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  onUpdate,
  onDelete,
  onStatusCycle,
}: {
  idea: Idea;
  onUpdate: (id: string, patch: Partial<Idea>) => void;
  onDelete: (id: string) => void;
  onStatusCycle: (id: string, current: IdeaStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(idea.title);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(idea.notes ?? "");
  const [, startTransition] = useTransition();

  const catMeta = getCategoryMeta(idea.category);
  const statusMeta = STATUS_LABELS[idea.status as IdeaStatus] ?? STATUS_LABELS.idea;
  const priorityMeta = PRIORITY_LABELS[idea.priority] ?? PRIORITY_LABELS[2];

  function saveTitle() {
    if (titleDraft.trim() && titleDraft !== idea.title) {
      startTransition(async () => {
        await updateIdea(idea.id, { title: titleDraft.trim() });
        onUpdate(idea.id, { title: titleDraft.trim() });
      });
    }
    setEditingTitle(false);
  }

  function saveNotes() {
    startTransition(async () => {
      await updateIdea(idea.id, { notes: notesDraft });
      onUpdate(idea.id, { notes: notesDraft });
    });
    setEditingNotes(false);
  }

  function cyclePriority() {
    const next = idea.priority >= 3 ? 1 : idea.priority + 1;
    startTransition(async () => {
      await updateIdea(idea.id, { priority: next });
      onUpdate(idea.id, { priority: next });
    });
  }

  function cycleCategory() {
    const idx = CATEGORIES.findIndex((c) => c.value === idea.category);
    const next = CATEGORIES[(idx + 1) % CATEGORIES.length].value;
    startTransition(async () => {
      await updateIdea(idea.id, { category: next });
      onUpdate(idea.id, { category: next });
    });
  }

  return (
    <div className={`border p-3 transition-all ${
      idea.status === "done" ? "border-[var(--border)] opacity-60" : "border-[var(--border)] hover:border-[var(--fg-dim)]"
    }`}>
      {/* Top row */}
      <div className="flex items-start gap-2">
        {/* Priority indicator */}
        <button
          onClick={cyclePriority}
          className={`text-[10px] font-mono font-bold shrink-0 mt-0.5 ${priorityMeta.class} hover:opacity-70 transition-opacity`}
          title="Click to change priority"
        >
          P{idea.priority}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                autoFocus
                className="flex-1 bg-transparent border border-[var(--fg)] text-[var(--fg)] font-mono text-sm px-2 py-0.5 outline-none"
              />
              <button onClick={saveTitle} className="text-[var(--fg)] p-0.5 shrink-0"><Check className="h-3 w-3" /></button>
              <button onClick={() => setEditingTitle(false)} className="text-[var(--fg-muted)] p-0.5 shrink-0"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <span className={`text-sm font-mono font-bold ${idea.status === "done" ? "line-through text-[var(--fg-dim)]" : "text-[var(--fg)]"}`}>
                {idea.title}
              </span>
              <button
                onClick={() => { setTitleDraft(idea.title); setEditingTitle(true); }}
                className="opacity-0 group-hover:opacity-100 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-opacity p-0.5 shrink-0"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[var(--fg-muted)] hover:text-[var(--fg)] p-0.5 transition-colors"
            title="Expand notes"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={() => onDelete(idea.id)}
            className="text-[var(--fg-muted)] hover:text-[var(--error)] p-0.5 transition-colors"
            title="Delete idea"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {/* Category — click to cycle */}
        <button
          onClick={cycleCategory}
          className={`text-[10px] font-mono px-1.5 py-0.5 border uppercase tracking-widest hover:opacity-70 transition-opacity ${catMeta.color}`}
          title="Click to change category"
        >
          {catMeta.label}
        </button>

        {/* Status — click to cycle */}
        <button
          onClick={() => onStatusCycle(idea.id, idea.status as IdeaStatus)}
          className={`text-[10px] font-mono px-1.5 py-0.5 uppercase tracking-widest hover:opacity-70 transition-opacity ${statusMeta.class}`}
          title={statusMeta.next}
        >
          {statusMeta.label}
        </button>

        <span className="text-[10px] font-mono text-[var(--fg-dim)]">{relativeTime(idea.createdAt)}</span>
      </div>

      {/* Expanded notes */}
      {expanded && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                autoFocus
                placeholder="Add notes, details, references..."
                className="w-full bg-transparent border border-[var(--fg)] text-[var(--fg)] font-mono text-xs px-2 py-1 outline-none resize-y placeholder:text-[var(--fg-dim)] leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNotes}
                  className="flex items-center gap-1 text-xs font-mono text-[var(--fg)] border border-[var(--fg)] px-2 py-0.5 hover:bg-[rgba(51,255,0,0.05)]"
                >
                  <Check className="h-3 w-3" /> save
                </button>
                <button
                  onClick={() => setEditingNotes(false)}
                  className="flex items-center gap-1 text-xs font-mono text-[var(--fg-muted)] border border-[var(--border)] px-2 py-0.5"
                >
                  <X className="h-3 w-3" /> cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => { setNotesDraft(idea.notes ?? ""); setEditingNotes(true); }}
              className="text-xs font-mono text-[var(--fg-muted)] cursor-text hover:text-[var(--fg)] transition-colors whitespace-pre-wrap min-h-[2rem]"
            >
              {idea.notes || <span className="italic text-[var(--fg-dim)]">click to add notes...</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

const ALL = "all";

export function IdeasPanel({ ideas: initialIdeas }: { ideas: Idea[] }) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  // Quick-add
  const [quickAdd, setQuickAdd] = useState("");
  const [quickCategory, setQuickCategory] = useState<IdeaCategory>("video");
  const quickRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterCat, setFilterCat] = useState<string>(ALL);
  const [filterStatus, setFilterStatus] = useState<string>(ALL);

  function handleQuickAdd() {
    if (!quickAdd.trim()) return;
    startTransition(async () => {
      try {
        const idea = await createIdea({ title: quickAdd.trim(), category: quickCategory });
        setIdeas((prev) => [idea, ...prev]);
        setQuickAdd("");
        setMessage("[OK] idea added");
        setTimeout(() => setMessage(""), 2000);
      } catch {
        setMessage("[ERR] add failed");
      }
    });
    quickRef.current?.focus();
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteIdea(id);
        setIdeas((prev) => prev.filter((i) => i.id !== id));
      } catch {
        setMessage("[ERR] delete failed");
      }
    });
  }

  function handleUpdate(id: string, patch: Partial<Idea>) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function handleStatusCycle(id: string, current: IdeaStatus) {
    startTransition(async () => {
      try {
        const next = await cycleIdeaStatus(id, current);
        setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status: next } : i)));
      } catch {
        setMessage("[ERR] update failed");
      }
    });
  }

  const filtered = ideas.filter((i) => {
    if (filterCat !== ALL && i.category !== filterCat) return false;
    if (filterStatus !== ALL && i.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    total: ideas.length,
    idea: ideas.filter((i) => i.status === "idea").length,
    in_progress: ideas.filter((i) => i.status === "in_progress").length,
    done: ideas.filter((i) => i.status === "done").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // brainstorm board --manual
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">Ideas Board</h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span><span className="text-[var(--fg-muted)]">total: </span><span className="text-[var(--fg)]">{counts.total}</span></span>
          <span><span className="text-[var(--fg-muted)]">ideas: </span><span className="text-[var(--fg)]">{counts.idea}</span></span>
          <span><span className="text-[var(--fg-muted)]">active: </span><span className="text-[var(--amber)]">{counts.in_progress}</span></span>
          <span><span className="text-[var(--fg-muted)]">done: </span><span className="text-[var(--fg)] text-glow">{counts.done}</span></span>
          {message && <span className={message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}>{message}</span>}
        </div>
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* Quick-add bar */}
      <div className="border border-[var(--border)] p-3 space-y-3">
        <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest">
          // quick add — press enter
        </div>
        <div className="flex gap-2">
          <span className="text-[var(--fg-muted)] font-mono text-sm self-center shrink-0">idea&gt;</span>
          <input
            ref={quickRef}
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            placeholder="type your idea and hit enter..."
            className="flex-1 bg-transparent text-[var(--fg)] font-mono text-sm outline-none placeholder:text-[var(--fg-dim)]"
          />
          <button
            onClick={handleQuickAdd}
            disabled={isPending || !quickAdd.trim()}
            className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Category selector for quick-add */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setQuickCategory(c.value)}
              className={`text-[10px] font-mono px-1.5 py-0.5 border uppercase tracking-widest transition-all ${
                quickCategory === c.value
                  ? `${c.color} bg-[rgba(51,255,0,0.05)]`
                  : "border-[var(--border)] text-[var(--fg-dim)] hover:border-[var(--fg-dim)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap text-xs font-mono">
        <div className="flex items-center gap-1">
          <span className="text-[var(--fg-muted)]">category:</span>
          <button
            onClick={() => setFilterCat(ALL)}
            className={`px-1.5 py-0.5 border transition-all ${filterCat === ALL ? "border-[var(--fg)] text-[var(--fg)]" : "border-transparent text-[var(--fg-dim)] hover:text-[var(--fg)]"}`}
          >
            all
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={`px-1.5 py-0.5 border transition-all ${filterCat === c.value ? "border-[var(--fg)] text-[var(--fg)]" : "border-transparent text-[var(--fg-dim)] hover:text-[var(--fg)]"}`}
            >
              {c.label.toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[var(--fg-muted)]">status:</span>
          {([ALL, "idea", "in_progress", "done"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-1.5 py-0.5 border transition-all ${filterStatus === s ? "border-[var(--fg)] text-[var(--fg)]" : "border-transparent text-[var(--fg-dim)] hover:text-[var(--fg)]"}`}
            >
              {s === ALL ? "all" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas grid */}
      {filtered.length === 0 ? (
        <div className="terminal-window p-12 text-center">
          <div className="text-[var(--fg-muted)] text-sm font-mono">// no ideas yet</div>
          <div className="text-[var(--fg-dim)] text-xs font-mono mt-2">
            type something above and hit enter to capture your first idea
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onStatusCycle={handleStatusCycle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
