import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/layout/dashboard-client";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient />;
}
