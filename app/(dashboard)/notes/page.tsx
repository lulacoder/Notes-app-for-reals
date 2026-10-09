import { Suspense } from "react";
import { preloadedQueryResult } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery } from "@/lib/auth-server";
import { getNotesData } from "@/lib/notes-server";
import { NotesSkeleton } from "@/components/DashboardSkeleton";
import { NotesPageClient } from "./NotesPageClient";

export default function NotesPage() {
  return <Suspense fallback={<NotesSkeleton />}><NotesContent /></Suspense>;
}

async function NotesContent() {
  const { preloadedNotes } = await getNotesData();
  const firstNote = preloadedQueryResult(preloadedNotes)[0];
  const initialNote = firstNote ? await fetchAuthQuery(api.notes.getNote, { id: firstNote._id }) : null;
  return <NotesPageClient initialNote={initialNote} />;
}
