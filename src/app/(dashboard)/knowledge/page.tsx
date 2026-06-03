import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { KnowledgePanel } from "@/components/dashboard/knowledge-panel";

export default async function KnowledgePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const items = await db.knowledgeBase.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <KnowledgePanel items={items} />;
}
