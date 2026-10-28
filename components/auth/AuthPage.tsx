import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { getReturnPath } from "@/lib/auth-redirects";
import { LandingPage } from "@/components/marketing/LandingPage";
import { AuthDialog } from "./AuthDialog";
import { AuthDialogLoading } from "./AuthDialogLoading";

export interface AuthRouteProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface AuthPageProps extends AuthRouteProps {
  mode: "login" | "register";
}

export function AuthPage(props: AuthPageProps) {
  return <Suspense key={props.mode} fallback={<><LandingPage /><AuthDialogLoading mode={props.mode} /></>}><AuthPageContent {...props} /></Suspense>;
}

async function AuthPageContent({ mode, searchParams }: AuthPageProps) {
  const [session, params] = await Promise.all([getAuthSession(), searchParams]);
  const returnTo = getReturnPath(params.next);
  if (session && !session.user.banned) redirect(returnTo);
  const notice = session?.user.banned || params.banned === "true" ? "banned" : params.reason === "expired" ? "expired" : undefined;
  return <><LandingPage /><AuthDialog key={mode} mode={mode} returnTo={returnTo} notice={notice} /></>;
}
