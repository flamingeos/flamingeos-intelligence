import { LoginTerminal } from "@/components/auth/login-terminal";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <LoginTerminal />
    </div>
  );
}
