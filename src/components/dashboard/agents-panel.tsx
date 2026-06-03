"use client";

import { useState, useTransition } from "react";
import type { AgentRun } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { relativeTime, getStatusIcon, formatNumber } from "@/lib/utils";
import { runDailyAgent, runWeeklyAgent, runMonthlyAgent } from "@/server/actions/agents";
import { Bot, Play, Zap, Calendar } from "lucide-react";

const AGENTS = [
  {
    key: "daily",
    label: "Daily Agent",
    description: "Analyzes competitors, scans YouTube trending, updates channel stats",
    schedule: "06:00 UTC daily",
    icon: "D",
  },
  {
    key: "weekly",
    label: "Weekly Strategy Agent",
    description: "Generates content strategy, populates calendar, analyzes weekly performance",
    schedule: "07:00 UTC every Monday",
    icon: "W",
  },
  {
    key: "monthly",
    label: "Monthly Report Agent",
    description: "Comprehensive growth report, 30-day strategy, KPI analysis",
    schedule: "08:00 UTC on the 1st",
    icon: "M",
  },
];

export function AgentsPanel({ runs: initialRuns }: { runs: AgentRun[] }) {
  const [runs, setRuns] = useState(initialRuns);
  const [message, setMessage] = useState("");
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentRun | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun(agentKey: string) {
    setRunningAgent(agentKey);
    startTransition(async () => {
      try {
        setMessage(`// running ${agentKey} agent...`);
        if (agentKey === "daily") await runDailyAgent();
        if (agentKey === "weekly") await runWeeklyAgent();
        if (agentKey === "monthly") await runMonthlyAgent();
        setMessage(`[OK] ${agentKey} agent completed`);
        window.location.reload();
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "agent failed"}`);
      } finally {
        setRunningAgent(null);
      }
    });
  }

  const grouped: Record<string, AgentRun[]> = {};
  for (const run of runs) {
    if (!grouped[run.agentType]) grouped[run.agentType] = [];
    grouped[run.agentType].push(run);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-1">
            // ai agent control panel --automated
          </div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-widest text-glow">
            Agent Command
          </h1>
        </div>
        {message && (
          <span className={`text-xs font-mono ${message.includes("[ERR]") ? "text-[var(--error)]" : "text-[var(--fg)]"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="text-[var(--fg-muted)] text-xs font-mono">{"=".repeat(80)}</div>

      {/* Agent control cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {AGENTS.map((agent) => {
          const recentRuns = grouped[agent.key] ?? [];
          const lastRun = recentRuns[0];
          const isRunning = runningAgent === agent.key;

          return (
            <TerminalCard
              key={agent.key}
              title={agent.label}
              titlePrefix={agent.icon}
              statusBadge={
                lastRun
                  ? {
                      label: lastRun.status.toUpperCase(),
                      variant:
                        lastRun.status === "completed" ? "ok" :
                        lastRun.status === "running" ? "warn" : "err",
                    }
                  : { label: "IDLE", variant: "dim" }
              }
            >
              <div className="space-y-3">
                <p className="text-xs font-mono text-[var(--fg-muted)]">
                  {agent.description}
                </p>

                <div className="text-xs font-mono text-[var(--fg-dim)]">
                  <span className="text-[var(--fg-muted)]">schedule: </span>
                  {agent.schedule}
                </div>

                {lastRun && (
                  <div className="text-xs font-mono border-t border-[var(--border)] pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--fg-muted)]">last run:</span>
                      <span className="text-[var(--fg)]">{relativeTime(lastRun.startedAt)}</span>
                    </div>
                    {lastRun.durationMs && (
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--fg-muted)]">duration:</span>
                        <span className="text-[var(--fg)]">{(lastRun.durationMs / 1000).toFixed(1)}s</span>
                      </div>
                    )}
                    {lastRun.tokensUsed && (
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--fg-muted)]">tokens:</span>
                        <span className="text-[var(--fg)]">{formatNumber(lastRun.tokensUsed)}</span>
                      </div>
                    )}
                    {lastRun.error && (
                      <div className="text-[var(--error)] mt-1 truncate">
                        [ERR] {lastRun.error.slice(0, 60)}
                      </div>
                    )}
                  </div>
                )}

                <TerminalButton
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  loading={isRunning && isPending}
                  icon={<Play className="h-3 w-3" />}
                  onClick={() => handleRun(agent.key)}
                >
                  Run Now
                </TerminalButton>
              </div>
            </TerminalCard>
          );
        })}
      </div>

      {/* Run history */}
      <TerminalCard title="Run History" titlePrefix=">">
        <div className="space-y-0">
          {runs.length === 0 ? (
            <div className="text-[var(--fg-muted)] text-xs font-mono text-center py-8">
              // no agent runs yet — click run above
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                onClick={() => setSelected(selected?.id === run.id ? null : run)}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[rgba(51,255,0,0.02)] text-xs font-mono px-1 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={
                    run.status === "completed" ? "text-[var(--fg)]" :
                    run.status === "running" ? "text-[var(--amber)] animate-blink" :
                    "text-[var(--error)]"
                  }>
                    {getStatusIcon(run.status)}
                  </span>
                  <span className="text-[var(--fg)] uppercase">{run.agentType}</span>
                </div>
                <div className="flex items-center gap-4 text-[var(--fg-muted)]">
                  {run.durationMs && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
                  {run.tokensUsed && <span>{formatNumber(run.tokensUsed)} tkns</span>}
                  <span>{relativeTime(run.startedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected run detail */}
        {selected && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest mb-2">
              // run detail
            </div>
            {selected.reasoning && (
              <div className="text-xs font-mono text-[var(--fg)] whitespace-pre-wrap border border-[var(--border)] p-3 max-h-48 overflow-y-auto">
                {selected.reasoning}
              </div>
            )}
            {selected.outputs && (
              <div className="text-xs font-mono text-[var(--fg-dim)] whitespace-pre-wrap border border-[var(--border)] p-3 max-h-48 overflow-y-auto mt-2">
                {JSON.stringify(selected.outputs, null, 2)}
              </div>
            )}
          </div>
        )}
      </TerminalCard>

      {/* Cron config info */}
      <TerminalCard title="Vercel Cron Config" titlePrefix="~" statusBadge={{ label: "CONFIG", variant: "dim" }}>
        <div className="text-xs font-mono space-y-2 text-[var(--fg-muted)]">
          <p className="text-[var(--fg)]">// add to vercel.json for automatic scheduling:</p>
          <pre className="text-[var(--fg)] border border-[var(--border)] p-3 overflow-x-auto">{`{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/weekly",
      "schedule": "0 7 * * 1"
    },
    {
      "path": "/api/cron/monthly",
      "schedule": "0 8 1 * *"
    }
  ]
}`}</pre>
          <p>// cron endpoints are protected by CRON_SECRET header</p>
        </div>
      </TerminalCard>
    </div>
  );
}
