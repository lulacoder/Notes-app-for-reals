import type { Metadata } from "next";
import { AuthPage, type AuthRouteProps } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Sign up | Noteworthy" };

export default function RegisterPage({ searchParams }: AuthRouteProps) {
  return <AuthPage mode="register" searchParams={searchParams} />;
}
