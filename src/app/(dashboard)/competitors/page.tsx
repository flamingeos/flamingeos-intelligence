import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCompetitors } from "@/server/actions/competitors";
import { CompetitorsPanel } from "@/components/dashboard/competitors-panel";

export default async function CompetitorsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const competitors = await getCompetitors();

  return <CompetitorsPanel competitors={competitors} />;
}
