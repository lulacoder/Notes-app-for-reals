import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { LandingPage } from "@/components/marketing/LandingPage";

export default function Home() {
  return <Suspense fallback={<LandingPage />}><HomeContent /></Suspense>;
}

async function HomeContent() {
  const session = await getAuthSession();
  if (session && !session.user.banned) redirect("/notes");
  return <LandingPage />;
}
