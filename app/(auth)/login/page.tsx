import type { Metadata } from "next";
import { AuthPage, type AuthRouteProps } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Sign in | Noteworthy" };

export default function LoginPage({ searchParams }: AuthRouteProps) {
  return <AuthPage mode="login" searchParams={searchParams} />;
}
