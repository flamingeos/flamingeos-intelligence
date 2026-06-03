import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runDailyAgent } from "@/server/agents/daily-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await db.user.findMany({
    where: { accounts: { some: { provider: "google" } } },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    users.map((u: { id: string }) => runDailyAgent(u.id))
  );

  return NextResponse.json({
    ran: users.length,
    results: results.map((r, i) => ({
      userId: users[i].id,
      status: r.status,
      error: r.status === "rejected" ? String((r as PromiseRejectedResult).reason) : undefined,
    })),
  });
}
