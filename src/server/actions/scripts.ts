"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateScript } from "@/lib/anthropic";
import { revalidatePath } from "next/cache";

const CHANNEL_CONTEXT =
  "YouTube channel @flamingeos — creates content about technology, AI, software, and digital growth. Audience is tech-savvy millennials and Gen-Z interested in leveling up their skills and income.";

type ScriptType =
  | "long_form"
  | "short_form"
  | "documentary"
  | "storytelling"
  | "challenge"
  | "educational"
  | "lifestyle"
  | "comeback";

export async function generateVideoScript(
  topic: string,
  scriptType: ScriptType,
  targetDurationMinutes: number,
  style?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const agentRun = await db.agentRun.create({
    data: { userId, agentType: "script_generation", status: "running" },
  });

  try {
    const script = await generateScript(
      topic,
      scriptType,
      CHANNEL_CONTEXT,
      targetDurationMinutes
    );

    const report = await db.scriptReport.create({
      data: {
        userId,
        title: topic,
        topic,
        scriptType,
        style: style ?? null,
        targetDuration: targetDurationMinutes * 60,
        hook: script.hook,
        intro: script.intro,
        body: script.body,
        fullScript: script.fullScript,
        openLoops: script.openLoops,
        retentionPoints: script.retentionPoints,
        ctaPlacements: script.ctaPlacements,
        outro: script.outro,
        estimatedDuration: script.estimatedDuration,
        wordCount: script.wordCount,
        aiModel: "claude-opus-4-8",
        tokensUsed: script.tokensUsed,
      },
    });

    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        outputs: { reportId: report.id },
        tokensUsed: script.tokensUsed,
      },
    });

    await db.knowledgeBase.create({
      data: {
        userId,
        type: "script",
        title: `Script: ${topic}`,
        content: script.fullScript,
        tags: [scriptType, topic.split(" ").slice(0, 3).join("-")],
        sourceType: "script_generation",
        sourceId: report.id,
      },
    });

    revalidatePath("/scripts");
    return report;
  } catch (error) {
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export async function getScripts() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.scriptReport.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getScript(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.scriptReport.findFirst({
    where: { id, userId: session.user.id },
  });
}

export async function deleteScript(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.scriptReport.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/scripts");
}
