import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CalendarPanel } from "@/components/dashboard/calendar-panel";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const entries = await db.contentCalendar.findMany({
    where: {
      userId: session.user.id,
      scheduledDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { scheduledDate: "asc" },
    take: 60,
  });

  return <CalendarPanel entries={entries} />;
}
