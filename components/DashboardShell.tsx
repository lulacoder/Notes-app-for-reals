"use client";

import { useState, type ReactNode } from "react";
import type { Preloaded } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Header } from "@/components/Header";

interface DashboardShellProps {
  children: ReactNode;
  syncStatus?: ReactNode;
  preloadedCurrentUser: Preloaded<typeof api.auth.getCurrentUser>;
}

export function DashboardShell({ children, preloadedCurrentUser, syncStatus }: DashboardShellProps) {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Header
        preloadedCurrentUser={preloadedCurrentUser}
        signingOut={signingOut}
        setSigningOut={setSigningOut}
      />
      {!signingOut && syncStatus}
      <main
        className="flex-1 flex min-h-0 overflow-hidden"
        style={{ display: signingOut ? "none" : undefined }}
      >
        {children}
      </main>
      {signingOut && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground" role="status">
          Signing out...
        </div>
      )}
    </div>
  );
}
