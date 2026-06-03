"use client";

import { useState, useTransition } from "react";
import type { YoutubeChannel, Video, AgentRun, DailySnapshot } from "@prisma/client";
import { TerminalCard, StatCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatNumber, formatCurrency, relativeTime, getStatusIcon, asciiProgressBar } from "@/lib/utils";
import { syncChannel, syncVideos } from "@/server/actions/youtube";
import { runDailyAgent } from "@/server/actions/agents";
import {
  RefreshCw,
  Bot,
  TrendingUp,
  Play,
  Eye,
  Clock,
  DollarSign,
  Users,
} from "lucide-react";

interface CommandCenterProps {
  channel: YoutubeChannel | null;
  snapshots: DailySnapshot[];
  topVideos: Video[];
  agentRuns: AgentRun[];
  unreadNotifications: number;
}

export function CommandCenter({
  channel,
  snapshots,
  topVideos,
  agentRuns,
  unreadNotifications,
}: CommandCenterProps) {
  const [isPending, startTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState("");

  const latest = snapshots[0];
  const prev = snapshots[7];

  const subsDelta = latest && prev
    ? Number(latest.subscriberCount) - Number(prev.subscriberCount)
    : null;

  const totalRevenue = snapshots.reduce((s, snap) => s + (snap.estimatedRevenue ?? 0), 0);
  const totalWatchHours = snapshots.reduce((s, snap) => s + ((snap.watchTimeMinutes ?? 0) / 60), 0);

  function handleSync() {
    setSyncMessage("syncing...");
    startTransition(async () => {
      try {
        await syncChannel();
        await syncVideos();
        setSyncMessage("[OK] synced");
      } catch (e) {
        setSyncMessage(`[ERR] ${e instanceof Error ? e.message : "sync failed"}`);
      }
    });
  }

  function handleRunAgent() {
    setSyncMessage("running daily agent...");
    startTransition(async () => {
      try {
        await runDailyAgent();
        setSyncMessage("[OK] agent completed");
      } catch (e) {
        setSyncMessage(`[ERR] ${e instanceof Error ? e.message : "agent failed"}`);
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // command center --channel @flamingeos
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            {channel ? channel.title : "Channel Not Connected"}
          </h1>
          {channel?.lastSynced && (
            <div className="text-[var(--fg-muted)] text-xs mt-1">
              last sync: {relativeTime(channel.lastSynced)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {syncMessage && (
            <span className={`text-xs font-mono ${syncMessage.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
              {syncMessage}
            </span>
          )}
          <TerminalButton
            variant="secondary"
            size="sm"
            loading={isPending}
            icon={<RefreshCw className="h-3 w-3" />}
            onClick={handleSync}
          >
            Sync
          </TerminalButton>
          <TerminalButton
            variant="primary"
            size="sm"
            loading={isPending}
            icon={<Bot className="h-3 w-3" />}
            onClick={handleRunAgent}
          >
            Run Agent
          </TerminalButton>
        </div>
      </div>

      {/* ASCII separator */}
      <div className="text-[var(--fg-muted)] text-xs font-mono">
        {"=".repeat(80)}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="subscribers"
          value={channel ? formatNumber(channel.subscriberCount) : "--"}
          delta={subsDelta !== null ? {
            value: `${subsDelta >= 0 ? "+" : ""}${subsDelta} (7d)`,
            positive: subsDelta >= 0
          } : undefined}
        />
        <StatCard
          label="total views"
          value={channel ? formatNumber(channel.viewCount) : "--"}
        />
        <StatCard
          label="watch hours (30d)"
          value={totalWatchHours > 0 ? `${totalWatchHours.toFixed(0)}h` : "--"}
        />
        <StatCard
          label="est. revenue (30d)"
          value={totalRevenue > 0 ? formatCurrency(totalRevenue) : "--"}
          delta={totalRevenue > 0 ? { value: "30 days", positive: true } : undefined}
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Videos */}
        <TerminalCard title="Top Videos" titlePrefix=">" statusBadge={{ label: "LIVE", variant: "ok" }}>
          {topVideos.length === 0 ? (
            <div className="text-[var(--fg-muted)] text-xs font-mono py-4 text-center">
              // no video data — run sync first
            </div>
          ) : (
            <div className="space-y-3">
              {topVideos.map((video, i) => (
                <div
                  key={video.id}
                  className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--fg-muted)] text-xs font-mono shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, "0")}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-[var(--fg)] truncate">
                        {video.title}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--fg-muted)] font-mono">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(video.viewCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {relativeTime(video.publishedAt)}
                        </span>
                        {video.ctr && (
                          <span>CTR: {video.ctr.toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TerminalCard>

        {/* Agent Status */}
        <TerminalCard title="Agent Status" titlePrefix=">" statusBadge={{ label: "SYS", variant: "dim" }}>
          <div className="space-y-2">
            {/* Notification count */}
            <div className="flex items-center justify-between text-xs font-mono border-b border-[var(--border)] pb-2 mb-3">
              <span className="text-[var(--fg-muted)]">unread alerts</span>
              <span className={unreadNotifications > 0 ? "text-[var(--amber)]" : "text-[var(--fg-muted)]"}>
                {unreadNotifications > 0 ? `[${unreadNotifications} PENDING]` : "[NONE]"}
              </span>
            </div>

            {agentRuns.length === 0 ? (
              <div className="text-[var(--fg-muted)] text-xs font-mono py-2">
                // no agent runs yet — click "Run Agent" above
              </div>
            ) : (
              agentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between text-xs font-mono py-1 border-b border-[var(--border)] last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className={
                      run.status === "completed" ? "text-[var(--fg)]" :
                      run.status === "running" ? "text-[var(--amber)]" :
                      "text-[var(--error)]"
                    }>
                      {getStatusIcon(run.status)}
                    </span>
                    <span className="text-[var(--fg-muted)] uppercase">
                      {run.agentType}
                    </span>
                  </div>
                  <div className="text-right text-[var(--fg-muted)]">
                    {relativeTime(run.startedAt)}
                    {run.tokensUsed && (
                      <span className="ml-2">{formatNumber(run.tokensUsed)} tkns</span>
                    )}
                  </div>
                </div>
              ))
            )}

            <div className="pt-2 text-xs text-[var(--fg-muted)] font-mono">
              // agents: daily @ 06:00 UTC | weekly @ MON 07:00 | monthly @ 1ST 08:00
            </div>
          </div>
        </TerminalCard>
      </div>

      {/* 30-day growth chart (ASCII sparkline) */}
      {snapshots.length > 1 && (
        <TerminalCard title="30-Day Growth Trend" titlePrefix=">">
          <div className="space-y-4">
            {/* ASCII bar chart */}
            <div>
              <div className="text-[var(--fg-muted)] text-xs font-mono mb-2">
                // subscriber count — last 30 days
              </div>
              <div className="font-mono text-xs flex items-end gap-0.5 h-12">
                {snapshots.slice().reverse().map((snap, i) => {
                  const maxSubs = Math.max(...snapshots.map((s) => Number(s.subscriberCount)));
                  const minSubs = Math.min(...snapshots.map((s) => Number(s.subscriberCount)));
                  const range = maxSubs - minSubs || 1;
                  const pct = ((Number(snap.subscriberCount) - minSubs) / range);
                  const height = Math.max(1, Math.round(pct * 8));
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col justify-end"
                      title={`${snap.date.toLocaleDateString()}: ${snap.subscriberCount}`}
                    >
                      {"█".repeat(height).split("").map((_, j) => (
                        <div key={j} className="text-[var(--fg)] leading-none">█</div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[var(--fg-muted)] text-xs font-mono mt-1">
                <span>-30d</span>
                <span>today</span>
              </div>
            </div>

            {/* Revenue trend */}
            {snapshots.some((s) => s.estimatedRevenue) && (
              <div>
                <div className="text-[var(--fg-muted)] text-xs font-mono mb-1">
                  // estimated revenue — 30 days
                </div>
                <ProgressBar
                  value={totalRevenue}
                  max={Math.max(totalRevenue * 1.2, 100)}
                  label="Revenue"
                  variant="amber"
                />
              </div>
            )}
          </div>
        </TerminalCard>
      )}

      {!channel && (
        <TerminalCard
          title="Setup Required"
          titlePrefix="!"
          statusBadge={{ label: "ACTION", variant: "warn" }}
        >
          <div className="space-y-3 text-sm font-mono">
            <div className="text-[var(--amber)]">
              // no youtube channel connected
            </div>
            <div className="text-[var(--fg-muted)] space-y-1">
              <p>1. ensure your google account has access to @flamingeos</p>
              <p>2. click [ SYNC ] to connect your channel</p>
              <p>3. the system will pull all stats automatically</p>
            </div>
            <TerminalButton
              variant="amber"
              size="sm"
              loading={isPending}
              onClick={handleSync}
            >
              Connect Channel Now
            </TerminalButton>
          </div>
        </TerminalCard>
      )}
    </div>
  );
}
