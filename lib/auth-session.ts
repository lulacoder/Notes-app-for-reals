import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { preloadedQueryResult } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getToken, preloadAuthQuery } from "@/lib/auth-server";
import { getAuthHref } from "@/lib/auth-redirects";

// Deduplicate within this request only. A token can outlive a revoked session.
export const getAuthSession = cache(async () => {
  const token = await getToken();
  if (!token) return null;
  const preloadedCurrentUser = await preloadAuthQuery(api.auth.getCurrentUser);
  const user = preloadedQueryResult(preloadedCurrentUser);
  return user ? { token, user, preloadedCurrentUser } : null;
});

export async function requireAppSession() {
  const session = await getAuthSession();
  const returnTo = (await headers()).get("x-noteworthy-path");
  if (!session) redirect(getAuthHref("login", returnTo));
  if (session.user.banned) redirect(getAuthHref("login", returnTo, "banned"));
  return session;
}
