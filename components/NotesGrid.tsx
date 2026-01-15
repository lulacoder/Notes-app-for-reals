"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { NoteCard } from "./NoteCard";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";

interface Note {
  _id: Id<"notes">;
  title: string;
  content: string;
  updatedAt: number;
  isPinned?: boolean;
  tagIds?: Id<"tags">[];
}

interface Tag {
  _id: Id<"tags">;
  name: string;
  color: string;
}

interface NotesGridProps {
  notes: Note[];
  tags: Tag[];
  selectedNoteId: Id<"notes"> | null;
  onSelectNote: (id: Id<"notes">) => void;
}

export function NotesGrid({ notes, tags, selectedNoteId, onSelectNote }: NotesGridProps) {
  if (notes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No notes yet</p>
      </motion.div>
    );
  }

  // Separate pinned and regular notes
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);

  return (
    <div className="space-y-6">
      {/* Pinned Section */}
      {pinnedNotes.length > 0 && (
        <div>
          <motion.h3
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1"
          >
            Pinned
          </motion.h3>
          <motion.div
            layout
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  tags={tags}
                  isSelected={selectedNoteId === note._id}
                  onClick={() => onSelectNote(note._id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Regular Notes Section */}
      {regularNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && (
            <motion.h3
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3"
            >
              Notes
            </motion.h3>
          )}
          <motion.div
            layout
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {regularNotes.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  tags={tags}
                  isSelected={selectedNoteId === note._id}
                  onClick={() => onSelectNote(note._id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
}
