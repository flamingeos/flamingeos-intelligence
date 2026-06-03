"use client";

import { useState } from "react";
import type { YoutubeChannel, DailySnapshot, Video } from "@prisma/client";
import { TerminalCard, StatCard } from "@/components/ui/terminal-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatNumber, formatCurrency, formatDuration, relativeTime } from "@/lib/utils";
import { Eye, TrendingUp, Clock, DollarSign } from "lucide-react";

type Period = "7" | "30" | "90";

export function AnalyticsPanel({
  channel,
  snapshots,
  videos,
}: {
  channel: YoutubeChannel | null;
  snapshots: DailySnapshot[];
  videos: Video[];
}) {
  const [period, setPeriod] = useState<Period>("30");

  const days = parseInt(period);
  const filtered = snapshots.slice(0, days);
  const prev = snapshots.slice(days, days * 2);

  const totalViews = filtered.reduce((s, snap) => s + Number(snap.viewCount || 0), 0);
  const totalWatchHours = filtered.reduce((s, snap) => s + (snap.watchTimeMinutes ?? 0) / 60, 0);
  const totalRevenue = filtered.reduce((s, snap) => s + (snap.estimatedRevenue ?? 0), 0);
  const totalSubsGained = filtered.reduce((s, snap) => s + (snap.subscribersGained ?? 0), 0);

  const prevViews = prev.reduce((s, snap) => s + Number(snap.viewCount || 0), 0);
  const viewsDelta = prevViews > 0 ? ((totalViews - prevViews) / prevViews) * 100 : null;

  const topVideos = [...videos].sort((a, b) => Number(b.viewCount - a.viewCount));
  const maxViews = topVideos[0] ? Number(topVideos[0].viewCount) : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // analytics engine --youtube-analytics-api
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            Channel Analytics
          </h1>
        </div>
        <div className="flex gap-1">
          {(["7", "30", "90"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-mono px-3 py-1 border transition-all ${
                period === p
                  ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                  : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* Channel overview */}
      {channel && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="subscribers"
            value={formatNumber(channel.subscriberCount)}
          />
          <StatCard
            label="total views"
            value={formatNumber(channel.viewCount)}
          />
          <StatCard
            label={`views (${period}d)`}
            value={formatNumber(totalViews)}
            delta={viewsDelta !== null ? {
              value: `${viewsDelta >= 0 ? "+" : ""}${viewsDelta.toFixed(1)}% vs prev`,
              positive: viewsDelta >= 0
            } : undefined}
          />
          <StatCard
            label={`revenue (${period}d)`}
            value={totalRevenue > 0 ? formatCurrency(totalRevenue) : "--"}
          />
        </div>
      )}

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={`watch hours (${period}d)`}
          value={`${totalWatchHours.toFixed(0)}h`}
        />
        <StatCard
          label={`subs gained (${period}d)`}
          value={`+${totalSubsGained}`}
          delta={totalSubsGained > 0 ? { value: `${period}d`, positive: true } : undefined}
        />
        <StatCard
          label="video count"
          value={channel?.videoCount ?? "--"}
        />
        <StatCard
          label="avg rpm"
          value={
            filtered.some((s) => s.estimatedRpm)
              ? formatCurrency(
                  filtered.reduce((s, snap) => s + (snap.estimatedRpm ?? 0), 0) /
                  filtered.filter((s) => s.estimatedRpm).length
                )
              : "--"
          }
        />
      </div>

      {/* ASCII bar chart — daily views */}
      {filtered.length > 1 && (
        <TerminalCard title={`Daily Views — Last ${period} Days`} titlePrefix=">">
          <div>
            <div className="font-mono text-xs flex items-end gap-0.5" style={{ height: 64 }}>
              {filtered.slice().reverse().map((snap, i) => {
                const maxV = Math.max(...filtered.map((s) => Number(s.viewCount || 0)));
                const pct = maxV > 0 ? Number(snap.viewCount || 0) / maxV : 0;
                const height = Math.max(1, Math.round(pct * 8));
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col justify-end"
                    title={`${new Date(snap.date).toLocaleDateString()}: ${snap.viewCount} views`}
                  >
                    {Array.from({ length: height }).map((_, j) => (
                      <div key={j} className="text-[var(--fg)] leading-none text-center">█</div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[var(--fg-muted)] text-xs font-mono mt-1">
              <span>-{period}d</span>
              <span>today</span>
            </div>
          </div>
        </TerminalCard>
      )}

      {/* Video performance table */}
      <TerminalCard title="Video Performance" titlePrefix=">">
        {topVideos.length === 0 ? (
          <div className="text-[var(--fg-muted)] text-xs font-mono py-4 text-center">
            // no videos — sync channel first
          </div>
        ) : (
          <div className="space-y-0">
            <div className="grid grid-cols-12 gap-2 text-xs font-mono text-[var(--fg-muted)] uppercase tracking-widest pb-2 border-b border-[var(--border)]">
              <div className="col-span-1">#</div>
              <div className="col-span-5">title</div>
              <div className="col-span-2 text-right">views</div>
              <div className="col-span-2 text-right">ctr</div>
              <div className="col-span-2 text-right">published</div>
            </div>
            {topVideos.map((video, i) => (
              <div
                key={video.id}
                className="grid grid-cols-12 gap-2 text-xs font-mono py-2 border-b border-[var(--border)] last:border-0 hover:bg-[rgba(51,255,0,0.02)] transition-all"
              >
                <div className="col-span-1 text-[var(--fg-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="col-span-5 text-[var(--fg)] truncate">{video.title}</div>
                <div className="col-span-2 text-right text-[var(--fg)]">
                  {formatNumber(video.viewCount)}
                </div>
                <div className="col-span-2 text-right">
                  {video.ctr ? (
                    <span className={video.ctr >= 4 ? "text-[var(--fg)]" : "text-[var(--fg-dim)]"}>
                      {video.ctr.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[var(--fg-muted)]">--</span>
                  )}
                </div>
                <div className="col-span-2 text-right text-[var(--fg-muted)]">
                  {relativeTime(video.publishedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </TerminalCard>

      {/* Progress bars for video share */}
      {topVideos.length > 0 && (
        <TerminalCard title="View Distribution — Top Videos" titlePrefix=">">
          <div className="space-y-3">
            {topVideos.slice(0, 10).map((video, i) => (
              <div key={video.id}>
                <div className="text-xs font-mono text-[var(--fg-muted)] truncate mb-0.5">
                  {String(i + 1).padStart(2, "0")}. {video.title}
                </div>
                <ProgressBar
                  value={Number(video.viewCount)}
                  max={maxViews}
                  variant={i === 0 ? "green" : "green"}
                />
              </div>
            ))}
          </div>
        </TerminalCard>
      )}
    </div>
  );
}
