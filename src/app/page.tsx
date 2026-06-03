import { redirect } from "next/navigation";

// Root redirects to /dashboard — avoids conflict with (dashboard)/page.tsx route group
export default function RootPage() {
  redirect("/dashboard");
}
