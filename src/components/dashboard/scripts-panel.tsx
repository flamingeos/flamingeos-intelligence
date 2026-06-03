"use client";

import { useState, useTransition } from "react";
import type { ScriptReport } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { relativeTime } from "@/lib/utils";
import { generateVideoScript } from "@/server/actions/scripts";
import { FileText, Copy } from "lucide-react";

const SCRIPT_TYPES = [
  { value: "long_form", label: "Long Form" },
  { value: "short_form", label: "Short Form" },
  { value: "documentary", label: "Documentary" },
  { value: "storytelling", label: "Storytelling" },
  { value: "educational", label: "Educational" },
  { value: "challenge", label: "Challenge" },
] as const;

const DURATIONS = [5, 8, 10, 15, 20, 30];

export function ScriptsPanel({ scripts: initialScripts }: { scripts: ScriptReport[] }) {
  const [scripts, setScripts] = useState(initialScripts);
  const [topic, setTopic] = useState("");
  const [scriptType, setScriptType] = useState<"long_form" | "short_form" | "documentary" | "storytelling" | "educational" | "challenge">("long_form");
  const [duration, setDuration] = useState(10);
  const [selected, setSelected] = useState<ScriptReport | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!topic.trim()) return;
    startTransition(async () => {
      try {
        setMessage("// generating script with claude opus...");
        const report = await generateVideoScript(topic.trim(), scriptType, duration);
        setMessage("[OK] script generated");
        setTopic("");
        setSelected(report as ScriptReport);
        window.location.reload();
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // script generator --claude-opus
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            Script Studio
          </h1>
        </div>
        {message && (
          <span className={`text-xs font-mono ${message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* Generator */}
      <TerminalCard title="Generate Script" titlePrefix=">">
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
          <TerminalButton
            variant="primary"
            loading={isPending}
            onClick={handleGenerate}
          >
            Generate Full Script
          </TerminalButton>
        </div>
      </TerminalCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Script list */}
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
              <div className="text-sm font-mono text-[var(--fg)] font-bold truncate">
                {script.title}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge-dim text-xs font-mono px-1">
                  {script.scriptType.replace("_", " ").toUpperCase()}
                </span>
                {script.wordCount && (
                  <span className="text-xs text-[var(--fg-muted)] font-mono">
                    {script.wordCount} words
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--fg-muted)] font-mono mt-1">
                {relativeTime(script.createdAt)}
              </div>
            </div>
          ))}
        </div>

        {/* Script viewer */}
        <div className="lg:col-span-2">
          {selected ? (
            <TerminalCard
              title={selected.title}
              titlePrefix=">"
              action={
                <TerminalButton
                  variant="secondary"
                  size="sm"
                  bracket={false}
                  onClick={() => handleCopy(selected.fullScript)}
                >
                  {copied ? "[COPIED]" : <Copy className="h-3 w-3" />}
                </TerminalButton>
              }
            >
              <div className="space-y-4">
                {/* Script metadata */}
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="border border-[var(--border)] p-2 text-center">
                    <div className="text-[var(--fg)] font-bold">{selected.scriptType.replace("_", " ").toUpperCase()}</div>
                    <div className="text-[var(--fg-muted)]">type</div>
                  </div>
                  <div className="border border-[var(--border)] p-2 text-center">
                    <div className="text-[var(--fg)] font-bold">{selected.wordCount ?? "N/A"}</div>
                    <div className="text-[var(--fg-muted)]">words</div>
                  </div>
                  <div className="border border-[var(--border)] p-2 text-center">
                    <div className="text-[var(--fg)] font-bold">
                      {selected.estimatedDuration
                        ? `${Math.round(selected.estimatedDuration / 60)}m`
                        : "N/A"}
                    </div>
                    <div className="text-[var(--fg-muted)]">duration</div>
                  </div>
                </div>

                {/* Hook */}
                {selected.hook && (
                  <div>
                    <div className="text-[var(--amber)] text-xs font-mono uppercase tracking-widest mb-1">
                      ▶ HOOK (0:00-0:30)
                    </div>
                    <div className="text-sm font-mono text-[var(--fg)] whitespace-pre-wrap border border-[var(--amber-dim)] p-3">
                      {selected.hook}
                    </div>
                  </div>
                )}

                {/* Open loops */}
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

                {/* Full script */}
                <div>
                  <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
                    // full script
                  </div>
                  <div className="text-xs font-mono text-[var(--fg)] whitespace-pre-wrap border border-[var(--border)] p-3 max-h-96 overflow-y-auto leading-relaxed">
                    {selected.fullScript}
                  </div>
                </div>
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
