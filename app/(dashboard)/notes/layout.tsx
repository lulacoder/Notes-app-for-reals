import { Suspense } from "react";
import { getNotesData } from "@/lib/notes-server";
import { NotesProvider } from "@/providers/notes-provider";
import { NotesSkeleton } from "@/components/DashboardSkeleton";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<NotesSkeleton />}><NotesDataLayout>{children}</NotesDataLayout></Suspense>;
}

async function NotesDataLayout({ children }: { children: React.ReactNode }) {
  const data = await getNotesData();
  return <NotesProvider {...data}>{children}</NotesProvider>;
}
