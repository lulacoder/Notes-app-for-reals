import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { api } from "@/convex/_generated/api";
import { isAuthenticated, preloadAuthQuery } from "@/lib/auth-server";
import { ConvexClientProvider } from "@/providers/convex-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  const preloadedCurrentUser = await preloadAuthQuery(api.auth.getCurrentUser);

  return (
    <ConvexClientProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header preloadedCurrentUser={preloadedCurrentUser} />
        <main className="flex-1 flex min-h-0 overflow-hidden">{children}</main>
      </div>
    </ConvexClientProvider>
  );
}
