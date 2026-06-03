"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicChannelInfo, getPublicChannelVideos } from "@/lib/youtube";
import { analyzeCompetitorVideo } from "@/lib/anthropic";
import { revalidatePath } from "next/cache";

export async function addCompetitor(channelIdOrHandle: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Look up channel by ID
  const info = await getPublicChannelInfo(channelIdOrHandle);
  if (!info) throw new Error("Channel not found on YouTube.");

  const existing = await db.competitor.findFirst({
    where: { userId, channelId: info.channelId },
  });
  if (existing) throw new Error("Competitor already added.");

  const competitor = await db.competitor.create({
    data: { userId, ...info },
  });

  revalidatePath("/competitors");
  return competitor;
}

export async function removeCompetitor(competitorId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.competitor.deleteMany({
    where: { id: competitorId, userId: session.user.id },
  });

  revalidatePath("/competitors");
}

export async function syncCompetitorVideos(competitorId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const competitor = await db.competitor.findFirst({
    where: { id: competitorId, userId: session.user.id },
  });
  if (!competitor) throw new Error("Competitor not found.");

  const videos = await getPublicChannelVideos(competitor.channelId, 15);
  let newVideos = 0;

  for (const v of videos) {
    const exists = await db.competitorVideo.findUnique({
      where: { videoId: v.videoId },
    });
    if (!exists) {
      const daysSincePublish = Math.max(
        1,
        (Date.now() - v.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      await db.competitorVideo.create({
        data: {
          competitorId,
          ...v,
          viewsPerDay: Number(v.viewCount) / daysSincePublish,
          viewVelocity: Number(v.viewCount) / daysSincePublish,
        },
      });
      newVideos++;
    }
  }

  await db.competitor.update({
    where: { id: competitorId },
    data: {
      lastChecked: new Date(),
      subscriberCount: (await getPublicChannelInfo(competitor.channelId))?.subscriberCount ?? competitor.subscriberCount,
    },
  });

  revalidatePath("/competitors");
  return { newVideos };
}

export async function analyzeCompetitorVideoById(videoId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const video = await db.competitorVideo.findUnique({
    where: { id: videoId },
    include: { competitor: true },
  });
  if (!video) throw new Error("Video not found.");

  const channelCtx = `Channel @flamingeos creates YouTube content`;
  const analysis = await analyzeCompetitorVideo(
    video.title,
    video.description ?? "",
    video.viewCount,
    channelCtx
  );

  await db.competitorVideo.update({
    where: { id: videoId },
    data: {
      aiSummary: analysis.summary,
      whyItPerforms: analysis.whyItPerforms,
      opportunityForUs: analysis.opportunityForUs,
      titleVariations: analysis.titleVariations,
      confidenceScore: analysis.confidenceScore,
      analyzed: true,
      analyzedAt: new Date(),
    },
  });

  revalidatePath("/competitors");
  return analysis;
}

export async function getCompetitors() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.competitor.findMany({
    where: { userId: session.user.id, isActive: true },
    include: {
      videos: {
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: {
          id: true,
          videoId: true,
          title: true,
          publishedAt: true,
          viewCount: true,
          viewVelocity: true,
          analyzed: true,
        },
      },
      _count: { select: { videos: true } },
    },
    orderBy: { subscriberCount: "desc" },
  });
}
