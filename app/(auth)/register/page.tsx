import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Sign up | Noteworthy" };

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return <AuthPage mode="register" searchParams={searchParams} />;
}
