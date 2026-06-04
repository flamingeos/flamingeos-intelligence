"use client";

import { useState, useTransition } from "react";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { TerminalInput } from "@/components/ui/terminal-input";
import { formatNumber, relativeTime } from "@/lib/utils";
import {
  addCompetitor,
  removeCompetitor,
  syncCompetitorVideos,
  analyzeCompetitorVideoById,
} from "@/server/actions/competitors";
import { Users, RefreshCw, Trash2, Eye, Zap } from "lucide-react";

type CompetitorWithVideos = {
  id: string;
  channelId: string;
  title: string;
  handle: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  lastChecked: Date | null;
  videos: {
    id: string;
    videoId: string;
    title: string;
    publishedAt: Date;
    viewCount: number;
    viewVelocity: number | null;
    analyzed: boolean;
  }[];
  _count: { videos: number };
};

export function CompetitorsPanel({ competitors: initialCompetitors }: {
  competitors: CompetitorWithVideos[];
}) {
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [newChannel, setNewChannel] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!newChannel.trim()) return;
    startTransition(async () => {
      try {
        await addCompetitor(newChannel.trim());
        setMessage("[OK] competitor added");
        setNewChannel("");
        window.location.reload();
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "failed"}`);
      }
    });
  }

  function handleSync(competitorId: string) {
    startTransition(async () => {
      try {
        const result = await syncCompetitorVideos(competitorId);
        setMessage(`[OK] synced — ${result.newVideos} new videos`);
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "sync failed"}`);
      }
    });
  }

  function handleRemove(competitorId: string) {
    if (!confirm("Remove this competitor?")) return;
    startTransition(async () => {
      try {
        await removeCompetitor(competitorId);
        setMessage("[OK] removed");
        window.location.reload();
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "remove failed"}`);
      }
    });
  }

  function handleAnalyzeVideo(videoId: string) {
    startTransition(async () => {
      try {
        await analyzeCompetitorVideoById(videoId);
        setMessage("[OK] video analyzed");
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "analysis failed"}`);
      }
    });
  }

  const selected = competitors.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // competitor tracking --unlimited
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            Competitor Intelligence
          </h1>
        </div>
        {message && (
          <span className={`text-xs font-mono ${message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* Add competitor */}
      <TerminalCard title="Add Competitor" titlePrefix="+">
        <div className="flex gap-3">
          <div className="flex-1">
            <TerminalInput
              prompt="channel-id>"
              placeholder="UCxxxxxxx or channel ID"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <TerminalButton
            variant="primary"
            loading={isPending}
            onClick={handleAdd}
          >
            Track
          </TerminalButton>
        </div>
        <div className="text-[var(--fg-muted)] text-xs font-mono mt-2">
          // enter youtube channel ID (UCxxxxx) — find in channel URL
        </div>
      </TerminalCard>

      {/* Competitor list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="space-y-2">
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-2">
            // tracked channels ({competitors.length})
          </div>
          {competitors.length === 0 && (
            <div className="text-[var(--fg-muted)] text-xs font-mono text-center py-8 border border-[var(--border)]">
              no competitors tracked yet
            </div>
          )}
          {competitors.map((comp) => (
            <div
              key={comp.id}
              onClick={() => setSelectedId(comp.id === selectedId ? null : comp.id)}
              className={`terminal-window p-3 cursor-pointer transition-all ${
                selectedId === comp.id
                  ? "border-[var(--fg)] bg-[rgba(51,255,0,0.05)]"
                  : "hover:border-[var(--fg-dim)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-[var(--fg)] font-bold truncate">
                    {comp.handle ?? comp.title}
                  </div>
                  <div className="text-xs text-[var(--fg-muted)] font-mono mt-1">
                    {formatNumber(comp.subscriberCount)} subs · {comp._count.videos} videos
                  </div>
                  {comp.lastChecked && (
                    <div className="text-xs text-[var(--fg-muted)] font-mono">
                      checked {relativeTime(comp.lastChecked)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSync(comp.id); }}
                    className="text-[var(--fg-muted)] hover:text-[var(--fg)] p-1"
                    title="Sync videos"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(comp.id); }}
                    className="text-[var(--fg-muted)] hover:text-[var(--error)] p-1"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <TerminalCard
              title={selected.handle ?? selected.title}
              titlePrefix=">"
              statusBadge={{ label: "TRACKING", variant: "ok" }}
            >
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center py-2 border border-[var(--border)]">
                  <div className="text-lg font-bold text-glow">{formatNumber(selected.subscriberCount)}</div>
                  <div className="text-[var(--fg-muted)] text-xs uppercase">subs</div>
                </div>
                <div className="text-center py-2 border border-[var(--border)]">
                  <div className="text-lg font-bold text-glow">{formatNumber(selected.viewCount)}</div>
                  <div className="text-[var(--fg-muted)] text-xs uppercase">views</div>
                </div>
                <div className="text-center py-2 border border-[var(--border)]">
                  <div className="text-lg font-bold text-glow">{selected.videoCount}</div>
                  <div className="text-[var(--fg-muted)] text-xs uppercase">videos</div>
                </div>
              </div>

              <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-2">
                // recent uploads
              </div>

              <div className="space-y-2">
                {selected.videos.length === 0 ? (
                  <div className="text-[var(--fg-muted)] text-xs font-mono py-4 text-center border border-[var(--border)]">
                    no videos synced — click refresh icon
                  </div>
                ) : (
                  selected.videos.map((v) => (
                    <div key={v.id} className="border border-[var(--border)] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono text-[var(--fg)] truncate">{v.title}</div>
                          <div className="flex gap-3 text-xs text-[var(--fg-muted)] font-mono mt-1">
                            <span><Eye className="h-3 w-3 inline mr-1" />{formatNumber(v.viewCount)}</span>
                            <span>{relativeTime(v.publishedAt)}</span>
                            {v.viewVelocity && (
                              <span className="text-[var(--amber)]">
                                {v.viewVelocity.toFixed(0)} v/day
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!v.analyzed && (
                            <TerminalButton
                              variant="secondary"
                              size="sm"
                              bracket={false}
                              loading={isPending}
                              onClick={() => handleAnalyzeVideo(v.id)}
                            >
                              <Zap className="h-3 w-3" />
                            </TerminalButton>
                          )}
                          {v.analyzed && (
                            <span className="text-xs text-[var(--fg)] font-mono badge-ok px-1">
                              [AI]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TerminalCard>
          ) : (
            <div className="terminal-window h-full flex items-center justify-center text-[var(--fg-muted)] text-sm font-mono p-8">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>// select a competitor to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
