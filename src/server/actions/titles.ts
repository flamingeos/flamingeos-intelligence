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

export async function deleteTitleReport(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.titleReport.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/titles");
}

export async function updateTitleInReport(reportId: string, titleIndex: number, newTitle: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await db.titleReport.findFirst({
    where: { id: reportId, userId: session.user.id },
  });
  if (!report) throw new Error("Not found");

  const titles = report.titles as { title: string; [key: string]: unknown }[];
  if (titleIndex < 0 || titleIndex >= titles.length) throw new Error("Invalid index");
  titles[titleIndex] = { ...titles[titleIndex], title: newTitle };

  await db.titleReport.update({
    where: { id: reportId },
    data: {
      titles: titles as object[],
      topTitle: titleIndex === 0 ? newTitle : (report.topTitle ?? ""),
    },
  });

  revalidatePath("/titles");
}

export async function addTitleToReport(reportId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await db.titleReport.findFirst({
    where: { id: reportId, userId: session.user.id },
  });
  if (!report) throw new Error("Not found");

  const newEntry = {
    title,
    overallScore: 0,
    ctrPrediction: 0,
    curiosityScore: 0,
    emotionScore: 0,
    searchabilityScore: 0,
    clarityScore: 0,
    reasoning: "Manually added",
  };

  const titles = [...(report.titles as object[]), newEntry];

  await db.titleReport.update({
    where: { id: reportId },
    data: {
      titles,
      topTitle: report.topTitle || title,
    },
  });

  revalidatePath("/titles");
}

export async function createManualTitleSession(topic: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await db.titleReport.create({
    data: {
      userId: session.user.id,
      topic,
      targetKeywords: [],
      titles: [],
      topTitle: "",
      aiModel: "manual",
    },
  });

  revalidatePath("/titles");
  return report;
}

export async function deleteTitleFromReport(reportId: string, titleIndex: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await db.titleReport.findFirst({
    where: { id: reportId, userId: session.user.id },
  });
  if (!report) throw new Error("Not found");

  const titles = report.titles as { title: string }[];
  const updated = titles.filter((_, i) => i !== titleIndex);

  await db.titleReport.update({
    where: { id: reportId },
    data: {
      titles: updated as object[],
      topTitle: updated[0]?.title ?? "",
    },
  });

  revalidatePath("/titles");
}
