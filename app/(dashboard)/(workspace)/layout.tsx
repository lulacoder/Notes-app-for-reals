import { Suspense } from "react";
import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { NotesSkeleton } from "@/components/DashboardSkeleton";
import { requireAppSession } from "@/lib/auth-session";
import { getNotesData } from "@/lib/notes-server";
import { NotesProvider } from "@/providers/notes-provider";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<NotesSkeleton />}><WorkspaceData>{children}</WorkspaceData></Suspense>;
}

async function WorkspaceData({ children }: { children: ReactNode }) {
  const [data, { user }] = await Promise.all([getWorkspaceData(), requireAppSession()]);
  return <NotesProvider {...data}><WorkspaceShell owner={user._id}>{children}</WorkspaceShell></NotesProvider>;
}

async function getWorkspaceData() {
  "use cache: private";
  cacheLife({ stale: 30 });
  return getNotesData();
}
