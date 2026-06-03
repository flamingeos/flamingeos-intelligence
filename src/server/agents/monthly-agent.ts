import { db } from "@/lib/db";
import { generateWithClaude } from "@/lib/anthropic";

export async function runMonthlyAgent(userId: string) {
  const startedAt = Date.now();
  const run = await db.agentRun.create({
    data: { userId, agentType: "monthly", status: "running" },
  });

  let totalTokens = 0;

  try {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [channel, snapshots, videos, trends, agentRuns, competitorVideos] = await Promise.all([
      db.youtubeChannel.findFirst({ where: { userId } }),
      db.dailySnapshot.findMany({
        where: { channel: { userId }, date: { gte: oneMonthAgo } },
        orderBy: { date: "asc" },
      }),
      db.video.findMany({
        where: { channel: { userId } },
        orderBy: { viewCount: "desc" },
        take: 20,
      }),
      db.trendReport.findMany({
        where: { userId, createdAt: { gte: oneMonthAgo } },
        orderBy: { overallScore: "desc" },
        take: 20,
      }),
      db.agentRun.findMany({
        where: { userId, createdAt: { gte: oneMonthAgo } },
      }),
      db.competitorVideo.findMany({
        where: {
          competitor: { userId },
          publishedAt: { gte: oneMonthAgo },
        },
        include: { competitor: { select: { title: true } } },
        orderBy: { viewCount: "desc" },
        take: 30,
      }),
    ]);

    const firstSnap = snapshots[0];
    const lastSnap = snapshots[snapshots.length - 1];
    const subGrowth = lastSnap && firstSnap
      ? Number(lastSnap.subscriberCount) - Number(firstSnap.subscriberCount)
      : 0;
    const totalRevenue = snapshots.reduce((s, snap) => s + (snap.estimatedRevenue ?? 0), 0);
    const totalWatchTime = snapshots.reduce((s, snap) => s + (snap.watchTimeMinutes ?? 0), 0);

    const topVideosList = videos
      .slice(0, 5)
      .map((v) => `"${v.title}" — ${v.viewCount} views`)
      .join("\n");

    const topTrendsList = trends
      .slice(0, 5)
      .map((t) => `${t.topic} (${t.overallScore ?? "N/A"})`)
      .join(", ");

    const { content, tokensUsed } = await generateWithClaude(
      `You are a senior YouTube growth strategist generating a monthly performance report and growth strategy for @flamingeos. Be comprehensive, data-driven, and actionable. Return JSON.`,
      `Monthly data for @flamingeos:

CHANNEL STATS:
- Channel: ${channel?.title ?? "Unknown"}
- Subscriber growth: +${subGrowth} this month
- Current subscribers: ${channel?.subscriberCount ?? "N/A"}
- Estimated revenue: $${totalRevenue.toFixed(2)}
- Total watch time: ${(totalWatchTime / 60).toFixed(0)} hours

TOP PERFORMING VIDEOS:
${topVideosList || "No video data"}

TOP TRENDS IDENTIFIED:
${topTrendsList || "No trend data"}

AI AGENT RUNS: ${agentRuns.length} runs this month
COMPETITOR VIDEOS TRACKED: ${competitorVideos.length}

Generate comprehensive monthly report with:
{
  "executiveSummary": "3-paragraph executive summary",
  "keyMetrics": {"subscriberGrowth": ${subGrowth}, "estimatedRevenue": ${totalRevenue}, "watchHours": ${(totalWatchTime / 60).toFixed(0)}},
  "topInsights": ["insight 1", "insight 2", "insight 3"],
  "growthOpportunities": ["opportunity with action"],
  "contentStrategy30Days": [{"week":"Week 1","theme":"...","priority":"..."}],
  "competitorInsights": "...",
  "trendForecast": "...",
  "kpisToTrack": ["kpi 1"],
  "confidenceScore": 0-10
}`,
      { maxTokens: 5000 }
    );

    totalTokens += tokensUsed;

    let report: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/s);
      if (jsonMatch) report = JSON.parse(jsonMatch[0]);
    } catch {}

    await db.knowledgeBase.create({
      data: {
        userId,
        type: "strategy",
        title: `Monthly Growth Report: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
        content: JSON.stringify(report, null, 2),
        tags: ["monthly", "growth", "report"],
        sourceType: "monthly_agent",
        confidenceScore: (report.confidenceScore as number) ?? 8,
      },
    });

    await db.notification.create({
      data: {
        userId,
        type: "monthly_report",
        title: "Monthly Growth Report Ready",
        body: (report.executiveSummary as string)?.slice(0, 200) ?? "Monthly report generated.",
        data: JSON.parse(JSON.stringify(report)),
      },
    });

    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        outputs: JSON.parse(JSON.stringify(report)),
        tokensUsed: totalTokens,
        durationMs: Date.now() - startedAt,
        confidenceScore: (report.confidenceScore as number) ?? 8,
      },
    });

    return { success: true, report };
  } catch (error) {
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      },
    });
    throw error;
  }
}
