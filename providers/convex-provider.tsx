"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";

// Bridge 0.12.5 incorrectly infers useSession().data as never with patched Better Auth.
// Remove this when https://github.com/get-convex/better-auth/issues/420 is fixed.
// @ts-expect-error The bridge's client generic is incompatible with Better Auth >= 1.6.22.
const providerAuthClient: AuthClient = authClient;

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  verbose: process.env.NODE_ENV !== "production",
});

export function ConvexClientProvider({ children, initialToken }: { children: ReactNode; initialToken?: string | null }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={providerAuthClient} initialToken={initialToken}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
