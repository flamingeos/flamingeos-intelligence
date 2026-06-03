import { db } from "@/lib/db";
import { generateWithClaude } from "@/lib/anthropic";

export async function runWeeklyAgent(userId: string) {
  const startedAt = Date.now();
  const run = await db.agentRun.create({
    data: { userId, agentType: "weekly", status: "running" },
  });

  let totalTokens = 0;

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Gather weekly data
    const [channel, recentTrends, competitorVideos, recentSnapshots] = await Promise.all([
      db.youtubeChannel.findFirst({ where: { userId } }),
      db.trendReport.findMany({
        where: { userId, createdAt: { gte: oneWeekAgo } },
        orderBy: { overallScore: "desc" },
        take: 20,
      }),
      db.competitorVideo.findMany({
        where: {
          competitor: { userId },
          publishedAt: { gte: oneWeekAgo },
        },
        include: { competitor: { select: { title: true } } },
        orderBy: { viewCount: "desc" },
        take: 20,
      }),
      db.dailySnapshot.findMany({
        where: { channel: { userId }, date: { gte: oneWeekAgo } },
        orderBy: { date: "asc" },
      }),
    ]);

    const channelContext = channel
      ? `Channel: ${channel.title} | Subs: ${channel.subscriberCount} | Views: ${channel.viewCount}`
      : "Channel data not available";

    const topTrends = recentTrends
      .slice(0, 5)
      .map((t) => `- ${t.topic} (score: ${t.overallScore})`)
      .join("\n");

    const topCompVideos = competitorVideos
      .slice(0, 5)
      .map((v) => `- "${v.title}" by ${v.competitor.title} (${v.viewCount} views)`)
      .join("\n");

    const snapshotSummary = recentSnapshots.length > 0
      ? `${recentSnapshots.length} days tracked. Last subs: ${recentSnapshots[recentSnapshots.length - 1]?.subscriberCount ?? "N/A"}`
      : "No snapshots this week";

    const { content, tokensUsed } = await generateWithClaude(
      `You are a YouTube growth strategist for @flamingeos. Generate a comprehensive weekly content strategy. Return detailed JSON.`,
      `Weekly data summary:
${channelContext}
Snapshots: ${snapshotSummary}

Top trending topics this week:
${topTrends || "No trend data yet"}

Top competitor videos this week:
${topCompVideos || "No competitor data yet"}

Generate a weekly content strategy with:
{
  "weeklyTheme": "...",
  "priorityTopics": [{"topic":"...","reason":"...","suggestedTitle":"..."}],
  "contentSchedule": [{"day":"Monday","type":"...","topic":"...","format":"short_form/long_form"}],
  "keyOpportunities": ["..."],
  "avoidTopics": ["..."],
  "growthFocus": "...",
  "confidenceScore": 0-10,
  "summary": "2-paragraph strategic summary"
}`,
      { maxTokens: 3000 }
    );

    totalTokens += tokensUsed;

    let strategy: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/s);
      if (jsonMatch) strategy = JSON.parse(jsonMatch[0]);
    } catch {}

    // Store as knowledge base entry
    await db.knowledgeBase.create({
      data: {
        userId,
        type: "strategy",
        title: `Weekly Strategy: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        content: JSON.stringify(strategy, null, 2),
        tags: ["weekly", "strategy"],
        sourceType: "weekly_agent",
        confidenceScore: (strategy.confidenceScore as number) ?? 8,
      },
    });

    // Create content calendar entries
    if (Array.isArray(strategy.contentSchedule)) {
      const baseDate = new Date();
      const dayMap: Record<string, number> = {
        Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
        Friday: 5, Saturday: 6, Sunday: 0,
      };

      for (const entry of strategy.contentSchedule as { day: string; type: string; topic: string; format: string }[]) {
        const dayOffset = ((dayMap[entry.day] ?? 1) - baseDate.getDay() + 7) % 7 || 7;
        const scheduledDate = new Date(baseDate);
        scheduledDate.setDate(baseDate.getDate() + dayOffset);
        scheduledDate.setHours(10, 0, 0, 0);

        await db.contentCalendar.create({
          data: {
            userId,
            scheduledDate,
            title: entry.topic,
            topic: entry.type,
            scriptType: entry.format,
            status: "planned",
            priority: 2,
          },
        });
      }
    }

    await db.notification.create({
      data: {
        userId,
        type: "weekly_strategy",
        title: "Weekly Content Strategy Ready",
        body: (strategy.summary as string) ?? "Weekly strategy generated.",
        data: JSON.parse(JSON.stringify(strategy)),
      },
    });

    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        outputs: JSON.parse(JSON.stringify(strategy)),
        tokensUsed: totalTokens,
        durationMs: Date.now() - startedAt,
        confidenceScore: (strategy.confidenceScore as number) ?? 8,
      },
    });

    return { success: true, strategy };
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
