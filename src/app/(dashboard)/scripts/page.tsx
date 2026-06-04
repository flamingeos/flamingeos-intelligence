import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getScripts } from "@/server/actions/scripts";
import { ScriptsPanel } from "@/components/dashboard/scripts-panel";

export const maxDuration = 60;

export default async function ScriptsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scripts = await getScripts();
  return <ScriptsPanel scripts={scripts} />;
}
