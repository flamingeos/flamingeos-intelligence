"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCalendarEntry(data: {
  title: string;
  scheduledDate: string;
  scriptType?: string;
  status?: string;
  priority?: number;
  notes?: string;
  topic?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const entry = await db.contentCalendar.create({
    data: {
      userId: session.user.id,
      title: data.title,
      scheduledDate: new Date(data.scheduledDate),
      scriptType: data.scriptType ?? "long_form",
      status: data.status ?? "planned",
      priority: data.priority ?? 2,
      notes: data.notes ?? null,
      topic: data.topic ?? null,
    },
  });

  revalidatePath("/calendar");
  return entry;
}

export async function updateCalendarEntry(
  id: string,
  data: {
    title?: string;
    scheduledDate?: string;
    scriptType?: string;
    status?: string;
    priority?: number;
    notes?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.contentCalendar.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...data,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
    },
  });

  revalidatePath("/calendar");
}

export async function deleteCalendarEntry(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.contentCalendar.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/calendar");
}
