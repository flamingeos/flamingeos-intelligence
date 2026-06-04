"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type IdeaCategory =
  | "video"
  | "title"
  | "script"
  | "thumbnail"
  | "trend"
  | "other";

export type IdeaStatus = "idea" | "in_progress" | "done";

const STATUS_CYCLE: Record<IdeaStatus, IdeaStatus> = {
  idea: "in_progress",
  in_progress: "done",
  done: "idea",
};

export async function createIdea(data: {
  title: string;
  notes?: string;
  category?: IdeaCategory;
  priority?: number;
  tags?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const idea = await db.idea.create({
    data: {
      userId: session.user.id,
      title: data.title,
      notes: data.notes ?? null,
      category: data.category ?? "other",
      status: "idea",
      priority: data.priority ?? 2,
      tags: data.tags ?? [],
    },
  });

  revalidatePath("/ideas");
  return idea;
}

export async function updateIdea(
  id: string,
  data: { title?: string; notes?: string; category?: string; priority?: number; tags?: string[] }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.idea.updateMany({ where: { id, userId: session.user.id }, data });
  revalidatePath("/ideas");
}

export async function cycleIdeaStatus(id: string, currentStatus: IdeaStatus) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const next = STATUS_CYCLE[currentStatus];
  await db.idea.updateMany({
    where: { id, userId: session.user.id },
    data: { status: next },
  });

  revalidatePath("/ideas");
  return next;
}

export async function deleteIdea(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.idea.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/ideas");
}

export async function getIdeas() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.idea.findMany({
    where: { userId: session.user.id },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}
