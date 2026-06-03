import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgentRuns } from "@/server/actions/agents";
import { AgentsPanel } from "@/components/dashboard/agents-panel";

export default async function AgentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const runs = await getAgentRuns();
  return <AgentsPanel runs={runs} />;
}
