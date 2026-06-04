import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getThumbnailReports } from "@/server/actions/thumbnails";
import { ThumbnailsPanel } from "@/components/dashboard/thumbnails-panel";

export const maxDuration = 60;

export default async function ThumbnailsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const reports = await getThumbnailReports();
  return <ThumbnailsPanel reports={reports} />;
}
