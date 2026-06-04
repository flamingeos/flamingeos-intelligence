import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTitleReports } from "@/server/actions/titles";
import { TitlesPanel } from "@/components/dashboard/titles-panel";

export const maxDuration = 60;

export default async function TitlesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const reports = await getTitleReports();
  return <TitlesPanel reports={reports} />;
}
