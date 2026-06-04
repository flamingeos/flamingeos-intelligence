import { db } from "@/lib/db";
import { generateWithClaude } from "@/lib/anthropic";
import { getTrendingVideos, getPublicChannelVideos } from "@/lib/youtube";
import { sendTrendAlert, sendCompetitorAlert } from "@/lib/resend";

export async function runDailyAgent(userId: string) {
  const startedAt = Date.now();
  const run = await db.agentRun.create({
    data: { userId, agentType: "daily", status: "running" },
  });

  const outputs: Record<string, unknown> = {};
  let totalTokens = 0;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    // 1. Sync channel stats (no token needed — just snapshot)
    const channel = await db.youtubeChannel.findFirst({ where: { userId } });
    if (channel) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await db.dailySnapshot.upsert({
        where: { channelId_date: { channelId: channel.id, date: today } },
        create: {
          channelId: channel.id,
          date: today,
          subscriberCount: channel.subscriberCount,
          viewCount: channel.viewCount,
          videoCount: channel.videoCount,
        },
        update: {
          subscriberCount: channel.subscriberCount,
          viewCount: channel.viewCount,
          videoCount: channel.videoCount,
        },
      });
      outputs.channelSynced = true;
    }

    // 2. Check competitors for new uploads
    const competitors = await db.competitor.findMany({
      where: { userId, isActive: true },
    });

    const newCompetitorVideos: { competitor: string; video: string; opportunity?: string }[] = [];

    for (const comp of competitors) {
      try {
        const videos = await getPublicChannelVideos(comp.channelId, 5);
        for (const v of videos) {
          const exists = await db.competitorVideo.findUnique({
            where: { videoId: v.videoId },
          });
          if (!exists) {
            const daysSince = Math.max(
              1,
              (Date.now() - v.publishedAt.getTime()) / 86400000
            );

            const created = await db.competitorVideo.create({
              data: {
                competitorId: comp.id,
                ...v,
                viewsPerDay: Number(v.viewCount) / daysSince,
                viewVelocity: Number(v.viewCount) / daysSince,
              },
            });

            // Quick AI analysis
            const { content, tokensUsed } = await generateWithClaude(
              `You analyze YouTube competitor videos for @flamingeos. Be concise. Return JSON only.`,
              `Analyze: "${v.title}"\nViews: ${v.viewCount}\nReturn: {"summary":"...","opportunity":"...","titleVariation":"...","confidence":0-10}`,
              { maxTokens: 500, model: "claude-sonnet-4-6" }
            );
            totalTokens += tokensUsed;

            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                await db.competitorVideo.update({
                  where: { id: created.id },
                  data: {
                    aiSummary: analysis.summary,
                    opportunityForUs: analysis.opportunity,
                    titleVariations: analysis.titleVariation ? [analysis.titleVariation] : [],
                    confidenceScore: analysis.confidence,
                    analyzed: true,
                    analyzedAt: new Date(),
                  },
                });

                newCompetitorVideos.push({
                  competitor: comp.title,
                  video: v.title,
                  opportunity: analysis.opportunity,
                });

                // Send email alert
                if (user?.email && analysis.opportunity) {
                  await sendCompetitorAlert(
                    user.email,
                    comp.title,
                    v.title,
                    analysis.opportunity
                  ).catch(() => {});
                }
              }
            } catch {}
          }
        }
      } catch (e) {
        console.error(`Failed to check competitor ${comp.title}:`, e);
      }
    }

    outputs.newCompetitorVideos = newCompetitorVideos.length;
    outputs.competitorDetails = newCompetitorVideos;

    // 3. Scan YouTube trending and identify opportunities
    try {
      const trending = await getTrendingVideos("US", 20).catch(() => []);
      const trendingTitles = trending.slice(0, 10).map((v) => v.title).join("\n");

      if (trendingTitles) {
        const { content: trendContent, tokensUsed } = await generateWithClaude(
          `You are a trend analyst for @flamingeos YouTube channel. Identify relevant opportunities. Return JSON only.`,
          `Today's trending YouTube videos:\n${trendingTitles}\n\nIdentify the top 3 trending topics relevant to tech/AI/software/growth content.\nReturn: {"trends":[{"topic":"...","why":"...","angle":"...","score":0-10}]}`,
          { maxTokens: 800, model: "claude-sonnet-4-6" }
        );
        totalTokens += tokensUsed;

        try {
          const jsonMatch = trendContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const { trends } = JSON.parse(jsonMatch[0]) as {
              trends: { topic: string; why: string; angle: string; score: number }[];
            };

            for (const trend of trends) {
              await db.trendReport.create({
                data: {
                  userId,
                  topic: trend.topic,
                  source: "youtube_trending",
                  summary: trend.why,
                  viralAngles: [trend.angle],
                  velocityScore: trend.score,
                  opportunityScore: trend.score,
                  overallScore: trend.score,
                  status: "analyzed",
                  aiModel: "claude-sonnet-4-6",
                  tokensUsed,
                },
              });

              if (trend.score >= 8 && user?.email) {
                await sendTrendAlert(
                  user.email,
                  trend.topic,
                  trend.score,
                  trend.why
                ).catch(() => {});
              }
            }

            outputs.trendsIdentified = trends.length;
          }
        } catch {}
      }
    } catch (e) {
      console.error("Trending analysis failed (non-fatal):", e);
      outputs.trendsError = e instanceof Error ? e.message : String(e);
    }

    // 4. Generate daily insight notification
    try {
      await db.notification.create({
        data: {
          userId,
          type: "daily_report",
          title: "Daily Intelligence Report",
          body: `Agent completed: ${newCompetitorVideos.length} new competitor videos detected, trends analyzed.`,
          data: JSON.parse(JSON.stringify(outputs)),
        },
      });
    } catch {}

    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        outputs: JSON.parse(JSON.stringify(outputs)),
        tokensUsed: totalTokens,
        durationMs: Date.now() - startedAt,
        confidenceScore: 8,
      },
    });

    return { success: true, outputs };
  } catch (error) {
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
        tokensUsed: totalTokens,
      },
    });
    throw error;
  }
}
