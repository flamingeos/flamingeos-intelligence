import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTrends } from "@/server/actions/trends";
import { TrendsPanel } from "@/components/dashboard/trends-panel";

export default async function TrendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const trends = await getTrends();

  return <TrendsPanel trends={trends} />;
}
