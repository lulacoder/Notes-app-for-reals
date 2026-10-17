import { Suspense } from "react";
import { Header } from "@/components/Header";
import { requireAppSession } from "@/lib/auth-session";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { ToastProvider } from "@/components/ui/toast-notification";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<DashboardSkeleton />}><AuthenticatedDashboard>{children}</AuthenticatedDashboard></Suspense>;
}

async function AuthenticatedDashboard({ children }: { children: React.ReactNode }) {
  const { token, preloadedCurrentUser } = await requireAppSession();

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
