import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [channel, snapshots, videos] = await Promise.all([
    db.youtubeChannel.findFirst({ where: { userId } }),
    db.dailySnapshot.findMany({
      where: { channel: { userId } },
      orderBy: { date: "desc" },
      take: 90,
    }),
    db.video.findMany({
      where: { channel: { userId } },
      orderBy: { viewCount: "desc" },
      take: 20,
    }),
  ]);

  return (
    <AnalyticsPanel
      channel={channel}
      snapshots={snapshots}
      videos={videos}
    />
  );
}
