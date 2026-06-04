"use client";

import { useState, useTransition } from "react";
import type { AgentRun } from "@prisma/client";
import { TerminalCard } from "@/components/ui/terminal-card";
import { TerminalButton } from "@/components/ui/terminal-button";
import { relativeTime, getStatusIcon, formatNumber } from "@/lib/utils";
import { runDailyAgent, runWeeklyAgent, runMonthlyAgent } from "@/server/actions/agents";
import { Play } from "lucide-react";

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
    description: "Analyzes competitor channels and generates 3–5 high-quality long-form video concepts",
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

// ── helpers ──────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="text-[var(--fg-muted)] uppercase tracking-widest text-[10px] mb-1">
        // {label}
      </div>
      {children}
    </div>
  );
}

function Bullets({ items }: { items: unknown[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-[var(--fg-muted)] shrink-0">&gt;</span>
          <span className="text-[var(--fg)]">{typeof item === "object" ? JSON.stringify(item) : String(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function DailyOutput({ out }: { out: Record<string, unknown> }) {
  const details = (out.competitorDetails ?? []) as Array<{ competitor: string; video: string; opportunity?: string }>;
  return (
    <>
      <div className="flex flex-wrap gap-4 text-xs font-mono">
        <span>
          <span className="text-[var(--fg-muted)]">channel synced: </span>
          <span className={out.channelSynced ? "text-[var(--fg)]" : "text-[var(--error)]"}>
            {out.channelSynced ? "[OK]" : "—"}
          </span>
        </span>
        <span>
          <span className="text-[var(--fg-muted)]">competitor videos: </span>
          <span className="text-[var(--fg)]">{String(out.newCompetitorVideos ?? 0)}</span>
        </span>
        <span>
          <span className="text-[var(--fg-muted)]">trends identified: </span>
          <span className="text-[var(--fg)]">{String(out.trendsIdentified ?? 0)}</span>
        </span>
      </div>

      {out.trendsError && (
        <div className="mt-2 text-[var(--error)] text-xs font-mono">
          [WARN] trending step failed: {String(out.trendsError)}
        </div>
      )}

      {details.length > 0 && (
        <Section label="new competitor videos">
          <div className="space-y-2">
            {details.map((v, i) => (
              <div key={i} className="border-l-2 border-[var(--border)] pl-3">
                <div className="text-[var(--fg)] font-mono text-xs">{v.video}</div>
                <div className="text-[var(--fg-muted)] text-[10px]">by {v.competitor}</div>
                {v.opportunity && (
                  <div className="text-[var(--amber)] text-[10px] mt-0.5">{v.opportunity}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function WeeklyOutput({ out }: { out: Record<string, unknown> }) {
  const concepts = (out.videoConcepts ?? []) as Array<{
    title: string;
    inspiredBy?: string;
    whyItPerforms?: string;
    openingHook?: string;
    thumbnailConcept?: string;
    improvementOverCompetitor?: string;
    performancePotential?: string;
  }>;
  const gaps = (out.contentGapsFound ?? []) as string[];
  const titlePatterns = (out.titlePatternsWorking ?? []) as string[];

  return (
    <>
      {out.weeklyFocus && (
        <div className="text-xs font-mono mb-1">
          <span className="text-[var(--fg-muted)]">this week: </span>
          <span className="text-[var(--fg)] font-bold">{String(out.weeklyFocus)}</span>
        </div>
      )}

      {concepts.length > 0 && (
        <Section label={`video concepts (${concepts.length})`}>
          <div className="space-y-4">
            {concepts.map((c, i) => (
              <div key={i} className="border border-[var(--border)] p-3 space-y-2">
                <div className="text-[var(--fg)] text-xs font-mono font-bold leading-tight">
                  [{i + 1}] {c.title}
                </div>
                {c.performancePotential && (
                  <div className={`text-[10px] font-mono uppercase tracking-widest ${
                    c.performancePotential.toLowerCase().includes("high")
                      ? "text-[var(--fg)]"
                      : c.performancePotential.toLowerCase().includes("medium")
                      ? "text-[var(--amber)]"
                      : "text-[var(--fg-muted)]"
                  }`}>
                    potential: {c.performancePotential}
                  </div>
                )}
                {c.inspiredBy && (
                  <div className="text-[10px] font-mono text-[var(--fg-muted)]">
                    inspired by: {c.inspiredBy}
                  </div>
                )}
                {c.whyItPerforms && (
                  <div>
                    <div className="text-[10px] text-[var(--fg-muted)] uppercase tracking-widest mb-0.5">why it performs</div>
                    <div className="text-xs font-mono text-[var(--fg)] leading-relaxed">{c.whyItPerforms}</div>
                  </div>
                )}
                {c.openingHook && (
                  <div>
                    <div className="text-[10px] text-[var(--fg-muted)] uppercase tracking-widest mb-0.5">opening hook</div>
                    <div className="text-xs font-mono text-[var(--amber)] leading-relaxed italic">"{c.openingHook}"</div>
                  </div>
                )}
                {c.thumbnailConcept && (
                  <div>
                    <div className="text-[10px] text-[var(--fg-muted)] uppercase tracking-widest mb-0.5">thumbnail</div>
                    <div className="text-xs font-mono text-[var(--fg)] leading-relaxed">{c.thumbnailConcept}</div>
                  </div>
                )}
                {c.improvementOverCompetitor && (
                  <div>
                    <div className="text-[10px] text-[var(--fg-muted)] uppercase tracking-widest mb-0.5">improvement over competitor</div>
                    <div className="text-xs font-mono text-[var(--fg)] leading-relaxed">{c.improvementOverCompetitor}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {titlePatterns.length > 0 && (
        <Section label="title patterns working in this space">
          <Bullets items={titlePatterns} />
        </Section>
      )}

      {gaps.length > 0 && (
        <Section label="content gaps found">
          <Bullets items={gaps} />
        </Section>
      )}
    </>
  );
}

function MonthlyOutput({ out }: { out: Record<string, unknown> }) {
  const insights = (out.topInsights ?? []) as string[];
  const opportunities = (out.growthOpportunities ?? []) as string[];
  const kpis = (out.kpisToTrack ?? []) as string[];
  const strategy = (out.contentStrategy30Days ?? []) as Array<{ week: string; theme: string; priority?: string }>;
  const metrics = out.keyMetrics as Record<string, unknown> | undefined;

  return (
    <>
      {metrics && (
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          {Object.entries(metrics).map(([k, v]) => (
            <span key={k}>
              <span className="text-[var(--fg-muted)]">{k.replace(/([A-Z])/g, " $1").toLowerCase()}: </span>
              <span className="text-[var(--fg)] font-bold">{String(v)}</span>
            </span>
          ))}
        </div>
      )}
      {out.executiveSummary && (
        <Section label="executive summary">
          <p className="text-xs font-mono text-[var(--fg)] whitespace-pre-wrap leading-relaxed">
            {String(out.executiveSummary)}
          </p>
        </Section>
      )}
      {insights.length > 0 && (
        <Section label="top insights">
          <Bullets items={insights} />
        </Section>
      )}
      {opportunities.length > 0 && (
        <Section label="growth opportunities">
          <Bullets items={opportunities} />
        </Section>
      )}
      {strategy.length > 0 && (
        <Section label="30-day content strategy">
          <div className="space-y-1">
            {strategy.map((s, i) => (
              <div key={i} className="flex gap-3 text-xs font-mono border-l-2 border-[var(--border)] pl-3">
                <span className="text-[var(--fg-muted)] w-16 shrink-0">{s.week}</span>
                <span className="text-[var(--fg)]">{s.theme}</span>
                {s.priority && <span className="text-[var(--amber)] text-[10px] self-center">[{s.priority}]</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {out.competitorInsights && (
        <Section label="competitor insights">
          <p className="text-xs font-mono text-[var(--fg)] whitespace-pre-wrap">{String(out.competitorInsights)}</p>
        </Section>
      )}
      {out.trendForecast && (
        <Section label="trend forecast">
          <p className="text-xs font-mono text-[var(--amber)] whitespace-pre-wrap">{String(out.trendForecast)}</p>
        </Section>
      )}
      {kpis.length > 0 && (
        <Section label="kpis to track">
          <Bullets items={kpis} />
        </Section>
      )}
    </>
  );
}

function RunOutputPanel({ run }: { run: AgentRun }) {
  if (run.status === "failed") {
    return (
      <div className="space-y-2">
        <div className="text-[var(--error)] text-xs font-mono border border-[var(--error)] p-3 whitespace-pre-wrap max-h-64 overflow-y-auto">
          [ERR] {run.error ?? "Unknown error — check server logs"}
        </div>
        {run.outputs && (
          <details className="text-xs font-mono">
            <summary className="text-[var(--fg-muted)] cursor-pointer hover:text-[var(--fg)]">
              // partial output (if any)
            </summary>
            <pre className="text-[var(--fg-dim)] border border-[var(--border)] p-3 max-h-48 overflow-y-auto mt-1 whitespace-pre-wrap">
              {JSON.stringify(run.outputs, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (!run.outputs) {
    return (
      <div className="text-[var(--fg-muted)] text-xs font-mono">
        // no output captured
      </div>
    );
  }

  const out = run.outputs as Record<string, unknown>;

  return (
    <div className="space-y-1">
      {run.agentType === "daily" && <DailyOutput out={out} />}
      {run.agentType === "weekly" && <WeeklyOutput out={out} />}
      {run.agentType === "monthly" && <MonthlyOutput out={out} />}
      {!["daily", "weekly", "monthly"].includes(run.agentType) && (
        <pre className="text-xs font-mono text-[var(--fg)] border border-[var(--border)] p-3 max-h-96 overflow-y-auto whitespace-pre-wrap">
          {JSON.stringify(out, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function AgentsPanel({ runs: initialRuns }: { runs: AgentRun[] }) {
  const [runs] = useState(initialRuns);
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
      } catch (e) {
        setMessage(`[ERR] ${e instanceof Error ? e.message : "agent failed"}`);
      } finally {
        setRunningAgent(null);
        window.location.reload();
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
                  {run.error && (
                    <span className="text-[var(--error)] truncate max-w-48">
                      {run.error.slice(0, 50)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[var(--fg-muted)]">
                  {run.durationMs && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
                  {run.tokensUsed && <span>{formatNumber(run.tokensUsed)} tkns</span>}
                  <span>{relativeTime(run.startedAt)}</span>
                  <span className="text-[10px] opacity-50">{selected?.id === run.id ? "▲" : "▼"}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected run detail */}
        {selected && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest">
                // run detail — {selected.agentType}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--fg-muted)]">
                <span className={
                  selected.status === "completed" ? "text-[var(--fg)]" :
                  selected.status === "failed" ? "text-[var(--error)]" :
                  "text-[var(--amber)]"
                }>
                  [{selected.status.toUpperCase()}]
                </span>
                {selected.durationMs && <span>{(selected.durationMs / 1000).toFixed(1)}s</span>}
                {selected.tokensUsed && <span>{formatNumber(selected.tokensUsed)} tokens</span>}
                {selected.confidenceScore && <span>confidence: {selected.confidenceScore}/10</span>}
              </div>
            </div>

            <div className="border border-[var(--border)] p-3 max-h-[600px] overflow-y-auto">
              <RunOutputPanel run={selected} />
            </div>
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
