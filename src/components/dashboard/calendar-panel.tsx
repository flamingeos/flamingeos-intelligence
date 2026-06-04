"use client";

import { useState, useTransition } from "react";
import type { ContentCalendar } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { Calendar, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { createCalendarEntry, updateCalendarEntry, deleteCalendarEntry } from "@/server/actions/calendar";

const STATUS_COLORS: Record<string, string> = {
  planned:  "badge-dim",
  scripted: "badge-warn",
  recorded: "text-[var(--fg)] border border-[var(--fg-muted)] px-1",
  edited:   "text-[var(--amber)] border border-[var(--amber-dim)] px-1",
  published:"badge-ok",
};

const STATUSES = ["planned", "scripted", "recorded", "edited", "published"];
const TYPES    = ["long_form", "short_form", "documentary", "storytelling", "educational", "challenge"];

// ── inline title edit ─────────────────────────────────────────────────────────

function InlineTitle({ value, onSave }: { value: string; onSave: (v: string) => void }) {
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
        <button onClick={save} className="text-[var(--fg)] p-0.5 shrink-0"><Check className="h-3 w-3" /></button>
        <button onClick={() => setEditing(false)} className="text-[var(--fg-muted)] p-0.5 shrink-0"><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group flex-1 min-w-0">
      <span className="text-sm font-mono text-[var(--fg)] font-bold truncate">{value}</span>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-opacity p-0.5"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function CalendarPanel({ entries: initialEntries }: { entries: ContentCalendar[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  // New entry form state
  const today = new Date().toISOString().split("T")[0];
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(today);
  const [formType, setFormType] = useState("long_form");
  const [formStatus, setFormStatus] = useState("planned");
  const [formPriority, setFormPriority] = useState("2");
  const [formNotes, setFormNotes] = useState("");

  function handleCreate() {
    if (!formTitle.trim() || !formDate) return;
    startTransition(async () => {
      try {
        const entry = await createCalendarEntry({
          title: formTitle.trim(),
          scheduledDate: formDate,
          scriptType: formType,
          status: formStatus,
          priority: parseInt(formPriority),
          notes: formNotes.trim() || undefined,
        });
        setEntries((prev) => [...prev, entry].sort(
          (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        ));
        setFormTitle("");
        setFormDate(today);
        setFormNotes("");
        setShowForm(false);
        setMessage("[OK] entry added");
        setTimeout(() => setMessage(""), 2000);
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "failed"}`);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCalendarEntry(id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setMessage("[OK] entry removed");
        setTimeout(() => setMessage(""), 2000);
      } catch {
        setMessage("[ERR] delete failed");
      }
    });
  }

  function handleSaveTitle(id: string, title: string) {
    startTransition(async () => {
      try {
        await updateCalendarEntry(id, { title });
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, title } : e)));
      } catch {
        setMessage("[ERR] update failed");
      }
    });
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      try {
        await updateCalendarEntry(id, { status });
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      } catch {
        setMessage("[ERR] update failed");
      }
    });
  }

  // Group by date
  const byDate: Record<string, ContentCalendar[]> = {};
  for (const entry of entries) {
    const key = new Date(entry.scheduledDate).toISOString().split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(entry);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // content calendar --ai + manual
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            Content Calendar
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-xs font-mono ${message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
              {message}
            </span>
          )}
          <TerminalButton
            variant="primary"
            size="sm"
            icon={<Plus className="h-3 w-3" />}
            onClick={() => setShowForm((v) => !v)}
          >
            Add Entry
          </TerminalButton>
        </div>
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* Manual entry form */}
      {showForm && (
        <TerminalCard title="New Calendar Entry" titlePrefix="+">
          <div className="space-y-3">
            <TerminalInput
              prompt="title>"
              placeholder="video title..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest mb-1">// date</div>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-transparent border border-[var(--border)] text-[var(--fg)] font-mono text-xs px-2 py-1 outline-none focus:border-[var(--fg)] [color-scheme:dark]"
                />
              </div>
              <div>
                <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest mb-1">// priority</div>
                <div className="flex gap-1">
                  {[["1","LOW"],["2","MED"],["3","HIGH"]].map(([v, l]) => (
                    <button key={v} onClick={() => setFormPriority(v)}
                      className={`text-xs font-mono px-2 py-1 border transition-all ${formPriority === v ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]" : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)]"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest mb-1">// type</div>
              <div className="flex gap-1 flex-wrap">
                {TYPES.map((t) => (
                  <button key={t} onClick={() => setFormType(t)}
                    className={`text-xs font-mono px-2 py-0.5 border transition-all ${formType === t ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]" : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)]"}`}>
                    {t.replace("_", "/")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest mb-1">// status</div>
              <div className="flex gap-1 flex-wrap">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => setFormStatus(s)}
                    className={`text-xs font-mono px-2 py-0.5 border transition-all ${formStatus === s ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]" : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="notes (optional)..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              className="w-full bg-transparent border border-[var(--border)] text-[var(--fg)] font-mono text-xs px-2 py-1 outline-none resize-none placeholder:text-[var(--fg-dim)] focus:border-[var(--fg-dim)]"
            />
            <div className="flex gap-2">
              <TerminalButton variant="primary" size="sm" loading={isPending} onClick={handleCreate}>
                Add to Calendar
              </TerminalButton>
              <TerminalButton variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </TerminalButton>
            </div>
          </div>
        </TerminalCard>
      )}

      {/* Calendar entries */}
      {Object.keys(byDate).length === 0 ? (
        <div className="terminal-window p-8 text-center">
          <Calendar className="h-8 w-8 mx-auto mb-3 opacity-30 text-[var(--fg-muted)]" />
          <div className="text-[var(--fg-muted)] text-sm font-mono">// no calendar entries yet</div>
          <div className="text-[var(--fg-dim)] text-xs font-mono mt-2">
            click "Add Entry" above or run the weekly agent to auto-populate
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, dayEntries]) => (
            <div key={date}>
              <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-2">
                // {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </div>
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="terminal-window p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-[var(--fg-muted)] text-xs font-mono shrink-0">P{entry.priority}</span>
                        <InlineTitle
                          value={entry.title}
                          onSave={(v) => handleSaveTitle(entry.id, v)}
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {entry.scriptType && (
                          <span className="badge-dim text-xs font-mono px-1 uppercase">
                            {entry.scriptType.replace("_", "/")}
                          </span>
                        )}
                        {/* Status — click to cycle through */}
                        <select
                          value={entry.status}
                          onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs font-mono bg-transparent border-none outline-none cursor-pointer uppercase ${STATUS_COLORS[entry.status] ?? "badge-dim"}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-[var(--bg)] text-[var(--fg)] normal-case">
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-[var(--fg-muted)] hover:text-[var(--error)] p-0.5 transition-colors"
                          title="Remove entry"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {entry.notes && (
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
