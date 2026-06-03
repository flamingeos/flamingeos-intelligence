"use server";

import { auth } from "@/lib/auth";
import { runDailyAgent as _runDailyAgent } from "@/server/agents/daily-agent";
import { runWeeklyAgent as _runWeeklyAgent } from "@/server/agents/weekly-agent";
import { runMonthlyAgent as _runMonthlyAgent } from "@/server/agents/monthly-agent";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function runDailyAgent() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const result = await _runDailyAgent(session.user.id);
  revalidatePath("/");
  revalidatePath("/agents");
  return result;
}

export async function runWeeklyAgent() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const result = await _runWeeklyAgent(session.user.id);
  revalidatePath("/");
  revalidatePath("/agents");
  return result;
}

export async function runMonthlyAgent() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const result = await _runMonthlyAgent(session.user.id);
  revalidatePath("/");
  revalidatePath("/agents");
  return result;
}

export async function getAgentRuns() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.agentRun.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
}
