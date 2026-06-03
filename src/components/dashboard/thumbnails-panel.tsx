"use client";

import { useState, useTransition } from "react";
import type { ThumbnailReport } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { relativeTime } from "@/lib/utils";
import { generateThumbnails } from "@/server/actions/thumbnails";
import type { ThumbnailConcept } from "@/types";
import { ImageIcon, Star } from "lucide-react";

export function ThumbnailsPanel({ reports: initialReports }: { reports: ThumbnailReport[] }) {
  const [reports] = useState(initialReports);
  const [topic, setTopic] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [selected, setSelected] = useState<ThumbnailReport | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!topic.trim()) return;
    startTransition(async () => {
      try {
        setMessage("// generating thumbnail concepts...");
        const report = await generateThumbnails(topic.trim(), videoTitle.trim() || topic.trim());
        setMessage("[OK] concepts generated");
        setTopic("");
        setVideoTitle("");
        setSelected(report as ThumbnailReport);
        window.location.reload();
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "generation failed"}`);
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // thumbnail concepts --gpt4o --5-concepts
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            Thumbnail Lab
          </h1>
        </div>
        {message && (
          <span className={`text-xs font-mono ${message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      <TerminalCard title="Generate Concepts" titlePrefix=">">
        <div className="space-y-3">
          <TerminalInput
            prompt="topic>"
            placeholder="video topic..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <TerminalInput
            prompt="title>"
            placeholder="video title (optional)..."
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <TerminalButton
            variant="primary"
            loading={isPending}
            onClick={handleGenerate}
          >
            Generate 5 Concepts
          </TerminalButton>
        </div>
        <div className="text-[var(--fg-muted)] text-xs font-mono mt-2">
          // includes: visual description, color psychology, emotional trigger, ctr prediction + dalle prompt
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
              no concepts yet
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
              <div className="text-sm font-mono text-[var(--fg)] font-bold truncate">
                {report.topic}
              </div>
              {report.videoTitle && (
                <div className="text-xs text-[var(--fg-muted)] font-mono mt-1 truncate">
                  &gt; {report.videoTitle}
                </div>
              )}
              <div className="text-xs text-[var(--fg-muted)] font-mono mt-1">
                {relativeTime(report.createdAt)}
              </div>
            </div>
          ))}
        </div>

        {/* Concepts */}
        <div className="lg:col-span-2">
          {selected ? (() => {
            const concepts = (selected.concepts as unknown as ThumbnailConcept[]);
            return (
              <TerminalCard title={selected.topic} titlePrefix=">">
                <div className="space-y-4">
                  {concepts.map((c, i) => (
                    <div
                      key={i}
                      className={`border p-4 transition-all ${
                        i === selected.topConceptIdx ? "border-[var(--fg)]" : "border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {i === selected.topConceptIdx && (
                          <Star className="h-3 w-3 text-[var(--amber)]" fill="currentColor" />
                        )}
                        <span className="text-xs font-mono text-[var(--fg-muted)]">
                          CONCEPT #{String(i + 1).padStart(2, "0")}
                        </span>
                        <span className={`text-xs font-bold font-mono ml-auto ${
                          c.predictedCtr >= 7 ? "text-[var(--fg)] text-glow" :
                          c.predictedCtr >= 5 ? "text-[var(--amber)]" : "text-[var(--fg-dim)]"
                        }`}>
                          CTR: {c.predictedCtr.toFixed(1)}/10
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-xs font-mono">
                        <div>
                          <span className="text-[var(--fg-muted)]">visual: </span>
                          <span className="text-[var(--fg)]">{c.visualDescription}</span>
                        </div>
                        <div>
                          <span className="text-[var(--fg-muted)]">subject: </span>
                          <span className="text-[var(--fg)]">{c.subjectPlacement}</span>
                        </div>
                        <div>
                          <span className="text-[var(--fg-muted)]">text: </span>
                          <span className="text-[var(--fg)]">{c.textPlacement}</span>
                        </div>
                        <div>
                          <span className="text-[var(--amber)]">emotion: </span>
                          <span className="text-[var(--fg)]">{c.emotionalTrigger}</span>
                        </div>
                        <div>
                          <span className="text-[var(--fg-muted)]">colors: </span>
                          <span className="text-[var(--fg)]">{c.colorPsychology}</span>
                        </div>
                      </div>

                      {c.dallePrompt && (
                        <div className="mt-3 border-t border-[var(--border)] pt-3">
                          <div className="text-[var(--fg-muted)] text-xs font-mono mb-1">
                            // dalle prompt
                          </div>
                          <div className="text-xs font-mono text-[var(--fg-dim)] italic">
                            {c.dallePrompt}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TerminalCard>
            );
          })() : (
            <div className="terminal-window h-full flex items-center justify-center text-[var(--fg-muted)] text-sm font-mono p-8 min-h-64">
              <div className="text-center">
                <ImageIcon className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>// select a session or generate concepts above</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
