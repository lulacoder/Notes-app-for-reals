import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { api } from "@/convex/_generated/api";
import { getToken, preloadAuthQuery } from "@/lib/auth-server";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { ToastProvider } from "@/components/ui/toast-notification";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { preloadedQueryResult } from "convex/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<DashboardSkeleton />}><AuthenticatedDashboard>{children}</AuthenticatedDashboard></Suspense>;
}

async function getDashboardSession() {
  "use cache: private";
  cacheLife({ stale: 30 });
  const token = await getToken();
  if (!token) redirect("/login");
  const preloadedCurrentUser = await preloadAuthQuery(api.auth.getCurrentUser);
  const currentUser = preloadedQueryResult(preloadedCurrentUser);
  if (!currentUser) redirect("/login");
  if (currentUser.banned) redirect("/login?banned=true");
  return { token, preloadedCurrentUser };
}

async function AuthenticatedDashboard({ children }: { children: React.ReactNode }) {
  const { token, preloadedCurrentUser } = await getDashboardSession();

  return (
    <ConvexClientProvider initialToken={token}>
      <ToastProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <Header preloadedCurrentUser={preloadedCurrentUser} />
          <main className="flex-1 flex min-h-0 overflow-hidden">{children}</main>
        </div>
      </ToastProvider>
    </ConvexClientProvider>
  );
}
