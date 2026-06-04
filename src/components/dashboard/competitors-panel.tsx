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
  deleteCompetitorVideo,
  updateCompetitorVideo,
  addManualCompetitorVideo,
} from "@/server/actions/competitors";
import { Users, RefreshCw, Trash2, Eye, Zap, Pencil, Plus, Check, X } from "lucide-react";

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

// ── inline video title edit ───────────────────────────────────────────────────

function InlineVideoTitle({
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
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          className="flex-1 bg-transparent border border-[var(--fg)] text-[var(--fg)] font-mono text-sm px-2 py-0.5 outline-none min-w-0"
        />
        <button onClick={save} className="text-[var(--fg)] p-0.5 shrink-0"><Check className="h-3 w-3" /></button>
        <button onClick={() => setEditing(false)} className="text-[var(--fg-muted)] p-0.5 shrink-0"><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-1 group min-w-0">
      <span className="text-sm font-mono text-[var(--fg)] truncate flex-1">{value}</span>
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

export function CompetitorsPanel({ competitors: initialCompetitors }: {
  competitors: CompetitorWithVideos[];
}) {
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [newChannel, setNewChannel] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Manual video add form
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [manualVideoTitle, setManualVideoTitle] = useState("");
  const [manualVideoUrl, setManualVideoUrl] = useState("");
  const [manualVideoViews, setManualVideoViews] = useState("");

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
        window.location.reload();
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

  function handleDeleteVideo(videoId: string, competitorId: string) {
    startTransition(async () => {
      try {
        await deleteCompetitorVideo(videoId);
        patchVideos(competitorId, (prev) => prev.filter((v) => v.id !== videoId));
        setMessage("[OK] video removed");
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "delete failed"}`);
      }
    });
  }

  function handleEditVideoTitle(videoId: string, competitorId: string, title: string) {
    startTransition(async () => {
      try {
        await updateCompetitorVideo(videoId, { title });
        patchVideos(competitorId, (prev) =>
          prev.map((v) => (v.id === videoId ? { ...v, title } : v))
        );
        setMessage("[OK] title updated");
      } catch {
        setMessage("[ERR] update failed");
      }
    });
  }

  function handleAddManualVideo(competitorId: string) {
    if (!manualVideoTitle.trim()) return;
    startTransition(async () => {
      try {
        const result = await addManualCompetitorVideo(competitorId, {
          title: manualVideoTitle.trim(),
          youtubeUrl: manualVideoUrl.trim() || undefined,
          viewCount: manualVideoViews ? parseInt(manualVideoViews) : 0,
        });
        const newVideo = {
          id: result.id,
          videoId: result.videoId,
          title: result.title,
          publishedAt: result.publishedAt,
          viewCount: result.viewCount,
          viewVelocity: null,
          analyzed: false,
        };
        patchVideos(competitorId, (prev) => [newVideo, ...prev]);
        setManualVideoTitle("");
        setManualVideoUrl("");
        setManualVideoViews("");
        setShowAddVideo(false);
        setMessage("[OK] video added manually");
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "add failed"}`);
      }
    });
  }

  function patchVideos(
    competitorId: string,
    fn: (prev: CompetitorWithVideos["videos"]) => CompetitorWithVideos["videos"]
  ) {
    setCompetitors((prev) =>
      prev.map((c) =>
        c.id === competitorId ? { ...c, videos: fn(c.videos) } : c
      )
    );
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
              placeholder="UCxxxxxxx or @handle"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <TerminalButton variant="primary" loading={isPending} onClick={handleAdd}>
            Track
          </TerminalButton>
        </div>
        <div className="text-[var(--fg-muted)] text-xs font-mono mt-2">
          // enter youtube channel ID (UCxxxxx) or handle (@name)
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
              onClick={() => { setSelectedId(comp.id === selectedId ? null : comp.id); setShowAddVideo(false); }}
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
                    title="Remove competitor"
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

              <div className="flex items-center justify-between mb-2">
                <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest">
                  // videos ({selected.videos.length})
                </div>
                <button
                  onClick={() => setShowAddVideo((v) => !v)}
                  className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                  title="Add video manually"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Manual add video form */}
              {showAddVideo && (
                <div className="border border-[var(--fg-dim)] p-3 mb-3 space-y-2">
                  <div className="text-[var(--fg-muted)] text-[10px] font-mono uppercase tracking-widest">
                    // add video manually
                  </div>
                  <TerminalInput
                    prompt="title>"
                    placeholder="video title..."
                    value={manualVideoTitle}
                    onChange={(e) => setManualVideoTitle(e.target.value)}
                  />
                  <TerminalInput
                    prompt="url>"
                    placeholder="youtube.com/watch?v=... (optional)"
                    value={manualVideoUrl}
                    onChange={(e) => setManualVideoUrl(e.target.value)}
                  />
                  <TerminalInput
                    prompt="views>"
                    placeholder="view count (optional)"
                    value={manualVideoViews}
                    onChange={(e) => setManualVideoViews(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleAddManualVideo(selected.id)}
                  />
                  <div className="flex gap-2">
                    <TerminalButton variant="primary" size="sm" loading={isPending} onClick={() => handleAddManualVideo(selected.id)}>
                      Add Video
                    </TerminalButton>
                    <TerminalButton variant="secondary" size="sm" onClick={() => { setShowAddVideo(false); setManualVideoTitle(""); setManualVideoUrl(""); setManualVideoViews(""); }}>
                      Cancel
                    </TerminalButton>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {selected.videos.length === 0 && !showAddVideo ? (
                  <div className="text-[var(--fg-muted)] text-xs font-mono py-4 text-center border border-[var(--border)]">
                    no videos synced — click refresh or add manually with +
                  </div>
                ) : (
                  selected.videos.map((v) => (
                    <div key={v.id} className="border border-[var(--border)] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <InlineVideoTitle
                            value={v.title}
                            onSave={(title) => handleEditVideoTitle(v.id, selected.id, title)}
                          />
                          <div className="flex gap-3 text-xs text-[var(--fg-muted)] font-mono mt-1 flex-wrap">
                            <span><Eye className="h-3 w-3 inline mr-1" />{formatNumber(v.viewCount)}</span>
                            <span>{relativeTime(v.publishedAt)}</span>
                            {v.viewVelocity && (
                              <span className="text-[var(--amber)]">{v.viewVelocity.toFixed(0)} v/day</span>
                            )}
                            {v.videoId.startsWith("manual-") && (
                              <span className="text-[var(--fg-dim)]">[manual]</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 items-center">
                          {!v.analyzed && !v.videoId.startsWith("manual-") && (
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
                            <span className="text-xs text-[var(--fg)] font-mono badge-ok px-1">[AI]</span>
                          )}
                          <button
                            onClick={() => handleDeleteVideo(v.id, selected.id)}
                            className="text-[var(--fg-muted)] hover:text-[var(--error)] p-1 transition-colors"
                            title="Remove video"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
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
