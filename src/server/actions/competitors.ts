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

  // Normalise: strip @, extract channel ID from a YouTube URL, or use as-is
  let lookup = channelIdOrHandle.trim();
  const urlMatch = lookup.match(/youtube\.com\/(?:channel\/|@)([\w-]+)/);
  if (urlMatch) lookup = urlMatch[1];

  let info = await getPublicChannelInfo(lookup);

  // If not found by ID, try as a handle (UCxxx IDs start with UC; anything else is a handle)
  if (!info && !lookup.startsWith("UC")) {
    info = await getPublicChannelInfo("@" + lookup.replace(/^@/, ""));
  }

  if (!info) throw new Error("Channel not found. Make sure you enter a valid channel ID (UCxxxxxx) or handle (@name).");

  const existing = await db.competitor.findFirst({
    where: { userId, channelId: info.channelId },
  });
  if (existing) throw new Error("Competitor already added.");

  await db.competitor.create({
    data: { userId, ...info },
  });

  revalidatePath("/competitors");
  return { ok: true };
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

  const rows = await db.competitor.findMany({
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

  // Prisma returns BigInt for subscriber/view counts; convert to Number for
  // JSON serialization when passing from Server Component to Client Component.
  return rows.map((c) => ({
    ...c,
    subscriberCount: Number(c.subscriberCount),
    viewCount: Number(c.viewCount),
    videos: c.videos.map((v) => ({
      ...v,
      viewCount: Number(v.viewCount),
    })),
  }));
}
