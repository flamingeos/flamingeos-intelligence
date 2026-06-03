import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CommandCenter } from "@/components/dashboard/command-center";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [channel, latestSnapshots, topVideos, recentAgentRuns, unreadNotifications] =
    await Promise.all([
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
      db.agentRun.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 5,
      }),
      db.notification.count({
        where: { userId, read: false },
      }),
    ]);

  return (
    <CommandCenter
      channel={channel}
      snapshots={latestSnapshots}
      topVideos={topVideos}
      agentRuns={recentAgentRuns}
      unreadNotifications={unreadNotifications}
    />
  );
}
