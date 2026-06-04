import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { IdeasPanel } from "@/components/dashboard/ideas-panel";

export default async function IdeasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const ideas = await db.idea.findMany({
    where: { userId: session.user.id },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return <IdeasPanel ideas={ideas} />;
}
