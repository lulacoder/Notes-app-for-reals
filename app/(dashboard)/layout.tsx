import { Suspense } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { requireAppSession } from "@/lib/auth-session";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { ToastProvider } from "@/components/ui/toast-notification";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { WorkspaceNavigationProvider } from "@/providers/workspace-navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}

async function AuthenticatedDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, preloadedCurrentUser } = await requireAppSession();

  return (
    <ConvexClientProvider initialToken={token}>
      <ToastProvider>
        <WorkspaceNavigationProvider>
          <DashboardShell preloadedCurrentUser={preloadedCurrentUser}>
            {children}
          </DashboardShell>
        </WorkspaceNavigationProvider>
      </ToastProvider>
    </ConvexClientProvider>
  );
}
