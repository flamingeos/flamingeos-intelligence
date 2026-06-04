import { db } from "@/lib/db";
import { generateWithClaude } from "@/lib/anthropic";

export async function runWeeklyAgent(userId: string) {
  const startedAt = Date.now();
  const run = await db.agentRun.create({
    data: { userId, agentType: "weekly", status: "running" },
  });

  let totalTokens = 0;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [channel, competitors, allTimeTopVideos, recentCompetitorVideos] = await Promise.all([
      db.youtubeChannel.findFirst({ where: { userId } }),

      db.competitor.findMany({
        where: { userId, isActive: true },
        select: {
          title: true,
          subscriberCount: true,
          description: true,
          handle: true,
        },
        orderBy: { subscriberCount: "desc" },
      }),

      // All-time top-performing competitor videos by view velocity
      db.competitorVideo.findMany({
        where: { competitor: { userId } },
        include: { competitor: { select: { title: true, handle: true } } },
        orderBy: { viewCount: "desc" },
        take: 30,
      }),

      // Recent uploads (past 30 days) to catch new trends
      db.competitorVideo.findMany({
        where: {
          competitor: { userId },
          publishedAt: { gte: thirtyDaysAgo },
        },
        include: { competitor: { select: { title: true, handle: true } } },
        orderBy: { viewVelocity: "desc" },
        take: 20,
      }),
    ]);

    if (!competitors.length) {
      throw new Error("No competitors added yet. Add competitor channels first so the agent can analyze them.");
    }

    const channelContext = channel
      ? `Channel: ${channel.title} | Subscribers: ${Number(channel.subscriberCount).toLocaleString()} | Total Views: ${Number(channel.viewCount).toLocaleString()}`
      : "Channel data not available";

    const competitorList = competitors
      .map((c) => `- ${c.title} (${Number(c.subscriberCount).toLocaleString()} subs)${c.description ? ` — "${c.description.slice(0, 120)}"` : ""}`)
      .join("\n");

    const topPerformers = allTimeTopVideos
      .slice(0, 15)
      .map((v) => {
        const views = Number(v.viewCount).toLocaleString();
        const velocity = v.viewVelocity ? `${Math.round(v.viewVelocity).toLocaleString()} views/day` : "";
        const analyzed = v.analyzed
          ? `\n    WHY IT WORKS: ${v.whyItPerforms ?? "N/A"}\n    OPPORTUNITY: ${v.opportunityForUs ?? "N/A"}`
          : "";
        return `- "${v.title}" by ${v.competitor.title}\n  Views: ${views}${velocity ? ` | Velocity: ${velocity}` : ""}${v.thumbnailUrl ? `\n  Thumbnail: ${v.thumbnailUrl}` : ""}${analyzed}`;
      })
      .join("\n\n");

    const recentUploads = recentCompetitorVideos
      .slice(0, 10)
      .map((v) => {
        const views = Number(v.viewCount).toLocaleString();
        const velocity = v.viewVelocity ? `${Math.round(v.viewVelocity).toLocaleString()} views/day` : "";
        const daysAgo = Math.round((Date.now() - v.publishedAt.getTime()) / (1000 * 60 * 60 * 24));
        return `- "${v.title}" by ${v.competitor.title} (${daysAgo}d ago | ${views} views${velocity ? ` | ${velocity}` : ""})`;
      })
      .join("\n");

    const { content, tokensUsed } = await generateWithClaude(
      `You are a YouTube growth strategist for the channel @flamingeos. Your job is to generate a small number of high-quality long-form YouTube video concepts that have a realistic chance of outperforming competitor content.

RULES — follow these strictly:
- ONLY generate long-form YouTube video concepts (8–30 minute videos).
- DO NOT suggest TikToks, Shorts, Reels, or any short-form content.
- Base every concept on real analysis of the competitor data provided.
- Quality over quantity — generate 3 to 5 concepts maximum.
- Each concept must directly reference which competitor video(s) inspired it and how it improves on them.
- Think like a top YouTube strategist: look for content gaps, underserved angles, better hooks, and stronger titles.

Return ONLY valid JSON. No markdown, no commentary outside the JSON.`,

      `MY CHANNEL:
${channelContext}

MY COMPETITORS:
${competitorList}

ALL-TIME TOP-PERFORMING COMPETITOR VIDEOS (ranked by views):
${topPerformers || "No competitor video data available yet — please sync competitors first."}

RECENT COMPETITOR UPLOADS (past 30 days, ranked by view velocity):
${recentUploads || "No recent uploads found."}

TASK:
Analyze the competitor data above. Identify the highest-opportunity long-form video concepts I should make. For each concept, look for:
- Videos that already performed well where I can make a better version
- Title patterns that drive clicks in this space
- Content gaps competitors have missed
- Formats and hooks that are proven to retain viewers

Generate 3–5 long-form video concepts in this exact JSON format:
{
  "videoConcepts": [
    {
      "title": "Exact video title I should use",
      "inspiredBy": "Competitor video title and channel name that inspired this",
      "whyItPerforms": "Specific reason this will get clicks and views based on the competitor data",
      "openingHook": "Word-for-word script for the first 15–30 seconds — must be strong enough to stop the scroll",
      "thumbnailConcept": "Detailed description: background color, main visual element, text overlay, facial expression or subject if applicable",
      "improvementOverCompetitor": "Exactly how this is better than the competitor version — title, angle, depth, hook, or framing",
      "performancePotential": "Realistic estimate: low / medium / high — with 1–2 sentence justification"
    }
  ],
  "contentGapsFound": ["..."],
  "titlePatternsWorking": ["..."],
  "weeklyFocus": "One sentence on the single biggest opportunity this week",
  "confidenceScore": 0-10
}`,
      { maxTokens: 4000 }
    );

    totalTokens += tokensUsed;

    let strategy: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/s);
      if (jsonMatch) strategy = JSON.parse(jsonMatch[0]);
    } catch {}

    // Save to knowledge base
    try {
      await db.knowledgeBase.create({
        data: {
          userId,
          type: "strategy",
          title: `Weekly Video Concepts: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          content: JSON.stringify(strategy, null, 2),
          tags: ["weekly", "strategy", "long-form", "competitor-analysis"],
          sourceType: "weekly_agent",
          confidenceScore: (strategy.confidenceScore as number) ?? 8,
        },
      });
    } catch (e) {
      console.error("Failed to save weekly strategy to knowledge base:", e);
    }

    // Add top concepts to content calendar as long-form planned videos
    const concepts = strategy.videoConcepts as Array<{
      title: string;
      whyItPerforms: string;
      performancePotential: string;
    }> | undefined;

    if (Array.isArray(concepts)) {
      const baseDate = new Date();
      for (let i = 0; i < Math.min(concepts.length, 5); i++) {
        const concept = concepts[i];
        try {
          const scheduledDate = new Date(baseDate);
          // Space them out across the next 2 weeks
          scheduledDate.setDate(baseDate.getDate() + (i + 1) * 3);
          scheduledDate.setHours(10, 0, 0, 0);

          await db.contentCalendar.create({
            data: {
              userId,
              scheduledDate,
              title: concept.title,
              topic: concept.whyItPerforms?.slice(0, 200) ?? "Long-form video",
              scriptType: "long_form",
              status: "planned",
              priority: concept.performancePotential?.toLowerCase().includes("high") ? 1 : 2,
            },
          });
        } catch {}
      }
    }

    try {
      const weeklyFocus = (strategy.weeklyFocus as string) ?? "Weekly video concepts generated.";
      await db.notification.create({
        data: {
          userId,
          type: "weekly_strategy",
          title: "Weekly Video Concepts Ready",
          body: weeklyFocus,
          data: JSON.parse(JSON.stringify(strategy)),
        },
      });
    } catch {}

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
