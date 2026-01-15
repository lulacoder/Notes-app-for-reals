"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { NoteCard } from "./NoteCard";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Layers } from "lucide-react";
import { CanvasPreview } from "@/components/CanvasEditor";
import { getRelativeTime } from "@/lib/relative-time";

interface Note {
  _id: Id<"notes">;
  title: string;
  content: string;
  updatedAt: number;
  isPinned?: boolean;
  tagIds?: Id<"tags">[];
}

interface Canvas {
  _id: Id<"canvases">;
  title: string;
  content: string;
  updatedAt: number;
  isPinned?: boolean;
}

interface Tag {
  _id: Id<"tags">;
  name: string;
  color: string;
}

interface NotesGridProps {
  notes: Note[];
  canvases: Canvas[];
  tags: Tag[];
  selectedNoteId: Id<"notes"> | null;
  onOpenNote: (id: Id<"notes">) => void;
  onOpenCanvas: (id: Id<"canvases">) => void;
}

export function NotesGrid({
  notes,
  canvases,
  tags,
  selectedNoteId,
  onOpenNote,
  onOpenCanvas,
}: NotesGridProps) {
  if (notes.length === 0 && canvases.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
      >
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No notes or canvases yet</p>
      </motion.div>
    );
  }

  // Separate pinned and regular notes
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);

  // Separate pinned and regular canvases
  const pinnedCanvases = canvases.filter((c) => c.isPinned);
  const regularCanvases = canvases.filter((c) => !c.isPinned);

  return (
    <div className="space-y-6">
      {/* Notes Section */}
      {notes.length > 0 && (
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-semibold text-foreground mb-3"
          >
            Notes
          </motion.h2>

          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="mb-6">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1"
              >
                Pinned
              </motion.h3>
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      tags={tags}
                      isSelected={selectedNoteId === note._id}
                      onClick={() => onOpenNote(note._id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {/* Regular Notes */}
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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {regularNotes.map((note) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      tags={tags}
                      isSelected={selectedNoteId === note._id}
                      onClick={() => onOpenNote(note._id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Canvases Section */}
      {canvases.length > 0 && (
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-semibold text-foreground mb-3"
          >
            Canvases
          </motion.h2>

          {pinnedCanvases.length > 0 && (
            <div className="mb-6">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1"
              >
                Pinned
              </motion.h3>
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {pinnedCanvases.map((canvas) => (
                    <CanvasCard
                      key={canvas._id}
                      canvas={canvas}
                      onOpen={() => onOpenCanvas(canvas._id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {regularCanvases.length > 0 && (
            <div>
              {pinnedCanvases.length > 0 && (
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3"
                >
                  Canvases
                </motion.h3>
              )}
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {regularCanvases.map((canvas) => (
                    <CanvasCard
                      key={canvas._id}
                      canvas={canvas}
                      onOpen={() => onOpenCanvas(canvas._id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CanvasCard({
  canvas,
  onOpen,
}: {
  canvas: Canvas;
  onOpen: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="group cursor-pointer rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-lg overflow-hidden"
    >
      <div className="aspect-video bg-muted/30 relative">
        <CanvasPreview content={canvas.content} className="w-full h-full" />
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium truncate">{canvas.title || "Untitled"}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {getRelativeTime(canvas.updatedAt)}
        </p>
      </div>
    </motion.div>
  );
}
