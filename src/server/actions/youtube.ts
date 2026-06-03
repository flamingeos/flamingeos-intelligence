"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getChannelStats,
  getChannelVideos,
  getChannelAnalytics,
} from "@/lib/youtube";
import { getDateRange } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function syncChannel() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const stats = await getChannelStats(userId);

  const channel = await db.youtubeChannel.upsert({
    where: { channelId: stats.channelId },
    create: { userId, ...stats, lastSynced: new Date() },
    update: { ...stats, lastSynced: new Date() },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.dailySnapshot.upsert({
    where: { channelId_date: { channelId: channel.id, date: today } },
    create: {
      channelId: channel.id,
      date: today,
      subscriberCount: stats.subscriberCount,
      viewCount: stats.viewCount,
      videoCount: stats.videoCount,
    },
    update: {
      subscriberCount: stats.subscriberCount,
      viewCount: stats.viewCount,
      videoCount: stats.videoCount,
    },
  });

  revalidatePath("/");
  return channel;
}

export async function syncVideos(maxResults = 50) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const channel = await db.youtubeChannel.findFirst({ where: { userId } });
  if (!channel) throw new Error("No channel found. Sync channel first.");

  const { videos } = await getChannelVideos(userId, maxResults);

  let upserted = 0;
  for (const v of videos) {
    await db.video.upsert({
      where: { videoId: v.videoId },
      create: { channelId: channel.id, ...v },
      update: {
        title: v.title,
        viewCount: v.viewCount,
        likeCount: v.likeCount,
        commentCount: v.commentCount,
        thumbnailUrl: v.thumbnailUrl,
      },
    });
    upserted++;
  }

  revalidatePath("/analytics");
  return { synced: upserted };
}

export async function syncAnalytics(period: "week" | "month" | "year" = "month") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const channel = await db.youtubeChannel.findFirst({ where: { userId } });
  if (!channel) throw new Error("No channel found.");

  const { startDate, endDate } = getDateRange(period);
  const data = await getChannelAnalytics(userId, startDate, endDate);

  if (!data.rows) return { synced: 0 };

  const headers = data.columnHeaders?.map((h) => h.name!) ?? [];

  for (const row of data.rows) {
    const record: Record<string, number | string> = {};
    headers.forEach((h, i) => { record[h] = row[i] as number | string; });

    const date = new Date(record["day"] as string);

    await db.dailySnapshot.upsert({
      where: { channelId_date: { channelId: channel.id, date } },
      create: {
        channelId: channel.id,
        date,
        subscriberCount: channel.subscriberCount,
        viewCount: BigInt(Math.round((record["views"] as number) || 0)),
        videoCount: channel.videoCount,
        watchTimeMinutes: (record["estimatedMinutesWatched"] as number) || null,
        estimatedRevenue: (record["estimatedRevenue"] as number) || null,
        estimatedRpm: (record["playbackBasedCpm"] as number) || null,
        subscribersGained: Math.round((record["subscribersGained"] as number) || 0),
        subscribersLost: Math.round((record["subscribersLost"] as number) || 0),
      },
      update: {
        watchTimeMinutes: (record["estimatedMinutesWatched"] as number) || null,
        estimatedRevenue: (record["estimatedRevenue"] as number) || null,
        subscribersGained: Math.round((record["subscribersGained"] as number) || 0),
        subscribersLost: Math.round((record["subscribersLost"] as number) || 0),
      },
    });
  }

  revalidatePath("/analytics");
  return { synced: data.rows.length };
}

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const [channel, recentSnapshots, topVideos, worstVideos] = await Promise.all([
    db.youtubeChannel.findFirst({ where: { userId } }),
    db.dailySnapshot.findMany({
      where: { channel: { userId } },
      orderBy: { date: "desc" },
      take: 30,
    }),
    db.video.findMany({
      where: { channel: { userId } },
      orderBy: { viewCount: "desc" },
      take: 5,
    }),
    db.video.findMany({
      where: { channel: { userId } },
      orderBy: { viewCount: "asc" },
      take: 5,
    }),
  ]);

  return { channel, recentSnapshots, topVideos, worstVideos };
}
