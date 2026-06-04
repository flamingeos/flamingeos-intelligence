import { google } from "googleapis";
import { db } from "./db";

const youtube = google.youtube("v3");
const youtubeAnalytics = google.youtubeAnalytics("v2");

export async function getOAuthClient(userId: string) {
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    throw new Error("No Google OAuth token found. Please reconnect your account.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Auto-refresh token if expired
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db.account.updateMany({
        where: { userId, provider: "google" },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : null,
        },
      });
    }
  });

  return oauth2Client;
}

export async function getChannelStats(userId: string) {
  const auth = await getOAuthClient(userId);

  const response = await youtube.channels.list({
    auth,
    part: ["snippet", "statistics", "contentDetails", "brandingSettings"],
    mine: true,
  });

  const channel = response.data.items?.[0];
  if (!channel) throw new Error("No channel found for this account.");

  return {
    channelId: channel.id!,
    title: channel.snippet?.title ?? "",
    description: channel.snippet?.description ?? "",
    thumbnailUrl: channel.snippet?.thumbnails?.high?.url ?? "",
    customUrl: channel.snippet?.customUrl ?? "",
    country: channel.snippet?.country ?? "",
    subscriberCount: BigInt(channel.statistics?.subscriberCount ?? "0"),
    viewCount: BigInt(channel.statistics?.viewCount ?? "0"),
    videoCount: parseInt(channel.statistics?.videoCount ?? "0"),
  };
}

export async function getChannelVideos(
  userId: string,
  maxResults = 50,
  pageToken?: string
) {
  const auth = await getOAuthClient(userId);

  const searchResponse = await youtube.search.list({
    auth,
    part: ["id", "snippet"],
    forMine: true,
    type: ["video"],
    order: "date",
    maxResults,
    pageToken,
  });

  const videoIds = searchResponse.data.items
    ?.map((item) => item.id?.videoId)
    .filter(Boolean) as string[];

  if (!videoIds.length) return { videos: [], nextPageToken: null };

  const videosResponse = await youtube.videos.list({
    auth,
    part: ["snippet", "statistics", "contentDetails", "status"],
    id: videoIds,
  });

  const videos = videosResponse.data.items?.map((v) => ({
    videoId: v.id!,
    title: v.snippet?.title ?? "",
    description: v.snippet?.description ?? "",
    thumbnailUrl: v.snippet?.thumbnails?.maxres?.url ?? v.snippet?.thumbnails?.high?.url ?? "",
    publishedAt: new Date(v.snippet?.publishedAt ?? Date.now()),
    duration: v.contentDetails?.duration ?? "",
    viewCount: BigInt(v.statistics?.viewCount ?? "0"),
    likeCount: BigInt(v.statistics?.likeCount ?? "0"),
    commentCount: BigInt(v.statistics?.commentCount ?? "0"),
    tags: v.snippet?.tags ?? [],
    categoryId: v.snippet?.categoryId ?? "",
  })) ?? [];

  return {
    videos,
    nextPageToken: searchResponse.data.nextPageToken ?? null,
  };
}

export async function getVideoAnalytics(
  userId: string,
  videoId: string,
  startDate: string,
  endDate: string
) {
  const auth = await getOAuthClient(userId);

  const response = await youtubeAnalytics.reports.query({
    auth,
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: [
      "views",
      "estimatedMinutesWatched",
      "averageViewDuration",
      "averageViewPercentage",
      "subscribersGained",
      "subscribersLost",
      "likes",
      "comments",
      "shares",
      "annotationClickThroughRate",
      "cardClickRate",
    ].join(","),
    filters: `video==${videoId}`,
    dimensions: "day",
  });

  return response.data;
}

export async function getChannelAnalytics(
  userId: string,
  startDate: string,
  endDate: string
) {
  const auth = await getOAuthClient(userId);

  const response = await youtubeAnalytics.reports.query({
    auth,
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: [
      "views",
      "estimatedMinutesWatched",
      "averageViewDuration",
      "subscribersGained",
      "subscribersLost",
      "estimatedRevenue",
      "estimatedAdRevenue",
      "grossRevenue",
      "cpm",
      "playbackBasedCpm",
      "adImpressions",
    ].join(","),
    dimensions: "day",
  });

  return response.data;
}

export async function getChannelTrafficSources(
  userId: string,
  startDate: string,
  endDate: string
) {
  const auth = await getOAuthClient(userId);

  const response = await youtubeAnalytics.reports.query({
    auth,
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "insightTrafficSourceType",
    sort: "-views",
    maxResults: 25,
  });

  return response.data;
}

export async function getTopVideos(
  userId: string,
  startDate: string,
  endDate: string,
  maxResults = 10
) {
  const auth = await getOAuthClient(userId);

  const response = await youtubeAnalytics.reports.query({
    auth,
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained",
    dimensions: "video",
    sort: "-views",
    maxResults,
  });

  return response.data;
}

export async function getPublicChannelInfo(channelIdOrHandle: string) {
  const isHandle = channelIdOrHandle.startsWith("@");

  const response = await youtube.channels.list({
    key: process.env.YOUTUBE_API_KEY,
    part: ["snippet", "statistics", "contentDetails"],
    ...(isHandle
      ? { forHandle: channelIdOrHandle.slice(1) }
      : { id: [channelIdOrHandle] }),
  });

  const channel = response.data.items?.[0];
  if (!channel) return null;

  return {
    channelId: channel.id!,
    title: channel.snippet?.title ?? "",
    description: channel.snippet?.description ?? "",
    thumbnailUrl: channel.snippet?.thumbnails?.high?.url ?? "",
    customUrl: channel.snippet?.customUrl ?? "",
    country: channel.snippet?.country ?? "",
    subscriberCount: BigInt(channel.statistics?.subscriberCount ?? "0"),
    viewCount: BigInt(channel.statistics?.viewCount ?? "0"),
    videoCount: parseInt(channel.statistics?.videoCount ?? "0"),
  };
}

export async function getPublicChannelVideos(
  channelId: string,
  maxResults = 10
) {
  const response = await youtube.search.list({
    key: process.env.YOUTUBE_API_KEY,
    part: ["id", "snippet"],
    channelId,
    type: ["video"],
    order: "date",
    maxResults,
  });

  const videoIds = response.data.items
    ?.map((item) => item.id?.videoId)
    .filter(Boolean) as string[];

  if (!videoIds.length) return [];

  const videosResponse = await youtube.videos.list({
    key: process.env.YOUTUBE_API_KEY,
    part: ["snippet", "statistics", "contentDetails"],
    id: videoIds,
  });

  return videosResponse.data.items?.map((v) => ({
    videoId: v.id!,
    title: v.snippet?.title ?? "",
    description: v.snippet?.description ?? "",
    thumbnailUrl: v.snippet?.thumbnails?.maxres?.url ?? v.snippet?.thumbnails?.high?.url ?? "",
    publishedAt: new Date(v.snippet?.publishedAt ?? Date.now()),
    duration: v.contentDetails?.duration ?? "",
    viewCount: BigInt(v.statistics?.viewCount ?? "0"),
    likeCount: BigInt(v.statistics?.likeCount ?? "0"),
    commentCount: BigInt(v.statistics?.commentCount ?? "0"),
    tags: v.snippet?.tags ?? [],
  })) ?? [];
}

export async function getTrendingVideos(regionCode = "US", maxResults = 50) {
  const response = await youtube.videos.list({
    key: process.env.YOUTUBE_API_KEY,
    part: ["snippet", "statistics", "contentDetails"],
    chart: "mostPopular",
    regionCode,
    maxResults,
  });

  return response.data.items?.map((v) => ({
    videoId: v.id!,
    title: v.snippet?.title ?? "",
    channelTitle: v.snippet?.channelTitle ?? "",
    thumbnailUrl: v.snippet?.thumbnails?.high?.url ?? "",
    publishedAt: new Date(v.snippet?.publishedAt ?? Date.now()),
    viewCount: BigInt(v.statistics?.viewCount ?? "0"),
    likeCount: BigInt(v.statistics?.likeCount ?? "0"),
    tags: v.snippet?.tags ?? [],
    categoryId: v.snippet?.categoryId ?? "",
  })) ?? [];
}
