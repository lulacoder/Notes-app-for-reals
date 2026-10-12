import { Suspense } from "react";
import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { NotesSkeleton } from "@/components/DashboardSkeleton";
import { getNotesData } from "@/lib/notes-server";
import { NotesProvider } from "@/providers/notes-provider";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<NotesSkeleton />}><WorkspaceData>{children}</WorkspaceData></Suspense>;
}

async function WorkspaceData({ children }: { children: ReactNode }) {
  const data = await getWorkspaceData();
  return <NotesProvider {...data}><WorkspaceShell>{children}</WorkspaceShell></NotesProvider>;
}

async function getWorkspaceData() {
  "use cache: private";
  cacheLife({ stale: 30 });
  return getNotesData();
}
