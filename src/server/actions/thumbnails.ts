"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateThumbnailConcepts } from "@/lib/openai";
import { revalidatePath } from "next/cache";

export async function generateThumbnails(topic: string, videoTitle: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const { concepts, tokensUsed } = await generateThumbnailConcepts(topic, videoTitle);
  const sorted = [...concepts].sort((a, b) => b.predictedCtr - a.predictedCtr);
  const topConceptIdx = 0;

  const report = await db.thumbnailReport.create({
    data: {
      userId,
      topic,
      videoTitle,
      concepts: sorted,
      topConceptIdx,
      aiModel: "gpt-4o",
      tokensUsed,
    },
  });

  revalidatePath("/thumbnails");
  return report;
}

export async function getThumbnailReports() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.thumbnailReport.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
