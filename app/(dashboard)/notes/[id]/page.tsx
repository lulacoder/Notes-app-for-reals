"use client";

import { useParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { NoteEditor } from "@/components/NoteEditor";

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = params.id as Id<"notes">;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <NoteEditor noteId={noteId} />
    </div>
  );
}
