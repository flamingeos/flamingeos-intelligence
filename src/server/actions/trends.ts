"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTrendResearch } from "@/lib/anthropic";
import { getTrendingVideos } from "@/lib/youtube";
import { revalidatePath } from "next/cache";

export async function researchTrend(topic: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const agentRun = await db.agentRun.create({
    data: { userId, agentType: "trend_research", status: "running" },
  });

  try {
    const channelCtx = "YouTube channel @flamingeos — creating content on tech, AI, and emerging trends";
    const research = await generateTrendResearch(topic, channelCtx);

    const report = await db.trendReport.create({
      data: {
        userId,
        topic,
        source: "ai_research",
        summary: research.researchReport.slice(0, 500),
        researchReport: research.researchReport,
        topicBreakdown: research.topicBreakdown,
        historicalContext: research.historicalContext,
        audienceInterest: research.audienceInterest,
        relatedTopics: research.relatedTopics,
        viralAngles: research.viralAngles,
        contrarianAngles: research.contrarianAngles,
        velocityScore: research.velocityScore,
        competitionScore: research.competitionScore,
        opportunityScore: research.opportunityScore,
        relevanceScore: research.relevanceScore,
        overallScore: research.overallScore,
        status: "analyzed",
        aiModel: "claude-opus-4-8",
        tokensUsed: research.tokensUsed,
      },
    });

    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        outputs: { reportId: report.id, topic },
        tokensUsed: research.tokensUsed,
        confidenceScore: research.overallScore,
      },
    });

    // Save to knowledge base
    await db.knowledgeBase.create({
      data: {
        userId,
        type: "trend",
        title: `Trend Research: ${topic}`,
        content: research.researchReport,
        tags: research.relatedTopics.slice(0, 5),
        sourceType: "trend_research",
        sourceId: report.id,
        confidenceScore: research.overallScore,
      },
    });

    revalidatePath("/trends");
    return report;
  } catch (error) {
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export async function scanYouTubeTrending(regionCode = "US") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const videos = await getTrendingVideos(regionCode, 50);

  // Group by common themes (simplified — use top tags/categories)
  const topTopics = new Map<string, number>();
  for (const v of videos) {
    for (const tag of v.tags.slice(0, 3)) {
      topTopics.set(tag, (topTopics.get(tag) ?? 0) + 1);
    }
  }

  const sorted = [...topTopics.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const reports: { topic: string; count: number }[] = [];
  for (const [topic, count] of sorted) {
    if (topic.length < 3) continue;
    const existing = await db.trendReport.findFirst({
      where: {
        userId,
        topic: { contains: topic, mode: "insensitive" },
        source: "youtube_trending",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!existing) {
      await db.trendReport.create({
        data: {
          userId,
          topic,
          source: "youtube_trending",
          summary: `Trending on YouTube with ${count} videos in top 50`,
          velocityScore: Math.min(10, count),
          status: "pending",
        },
      });
      reports.push({ topic, count });
    }
  }

  revalidatePath("/trends");
  return reports;
}

export async function updateTrend(
  id: string,
  data: { topic?: string; summary?: string; researchReport?: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.trendReport.updateMany({ where: { id, userId: session.user.id }, data });
  revalidatePath("/trends");
}

export async function createManualTrend(topic: string, notes?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await db.trendReport.create({
    data: {
      userId: session.user.id,
      topic,
      source: "manual",
      summary: notes ?? null,
      status: "analyzed",
      viralAngles: [],
      relatedTopics: [],
      contrarianAngles: [],
    },
  });

  revalidatePath("/trends");
  return report;
}

export async function deleteTrend(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.trendReport.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/trends");
}

export async function getTrends(status?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.trendReport.findMany({
    where: {
      userId: session.user.id,
      ...(status ? { status } : {}),
    },
    orderBy: [{ overallScore: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
}
