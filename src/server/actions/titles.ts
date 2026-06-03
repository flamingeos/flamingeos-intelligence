"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTitles } from "@/lib/openai";
import { revalidatePath } from "next/cache";

const CHANNEL_CONTEXT =
  "YouTube channel @flamingeos — tech, AI, software, and digital growth. Audience: tech-savvy millennials and Gen-Z.";

export async function generateVideoTitles(topic: string, keywords?: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const { titles, tokensUsed } = await generateTitles(topic, CHANNEL_CONTEXT);

  const sorted = [...titles].sort((a, b) => b.overallScore - a.overallScore);
  const topTitle = sorted[0]?.title ?? "";

  const report = await db.titleReport.create({
    data: {
      userId,
      topic,
      targetKeywords: keywords ?? [],
      titles: sorted,
      topTitle,
      aiModel: "gpt-4o",
      tokensUsed,
    },
  });

  await db.knowledgeBase.create({
    data: {
      userId,
      type: "title",
      title: `Titles for: ${topic}`,
      content: sorted.map((t) => `• ${t.title} (${t.overallScore.toFixed(1)}/10)`).join("\n"),
      tags: keywords ?? [],
      sourceType: "title_generation",
      sourceId: report.id,
    },
  });

  revalidatePath("/titles");
  return report;
}

export async function getTitleReports() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.titleReport.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
