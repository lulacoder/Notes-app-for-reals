"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";

export default function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(null);
  const notes = useQuery(api.notes.listNotes);

  // Auto-select first note when notes load
  useEffect(() => {
    if (notes && notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0]._id);
    }
  }, [notes, selectedNoteId]);

  // If selected note is deleted, select another
  useEffect(() => {
    if (notes && selectedNoteId) {
      const noteExists = notes.some((n) => n._id === selectedNoteId);
      if (!noteExists && notes.length > 0) {
        setSelectedNoteId(notes[0]._id);
      } else if (!noteExists) {
        setSelectedNoteId(null);
      }
    }
  }, [notes, selectedNoteId]);

  return (
    <>
      <Sidebar
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
      />
      <NoteEditor noteId={selectedNoteId} />
    </>
  );
}
