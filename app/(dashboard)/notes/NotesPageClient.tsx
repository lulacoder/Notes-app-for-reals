"use client";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";

import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import dynamic from "next/dynamic";
import { useNotesData } from "@/providers/notes-provider";
import { useNotesViewMode } from "@/lib/use-notes-view-mode";
import { useQuickSwitcherShortcut } from "@/lib/use-quick-switcher-shortcut";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { useKeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { MobileNav, useSwipeGesture } from "@/components/MobileNav";
import { motion, AnimatePresence } from "framer-motion";

const NoteEditor = dynamic(() => import("@/components/NoteEditor").then((module) => module.NoteEditor));
const NotesGrid = dynamic(() => import("@/components/NotesGrid").then((module) => module.NotesGrid));
const QuickSwitcher = dynamic(() => import("@/components/QuickSwitcher").then((module) => module.QuickSwitcher));
const TrashView = dynamic(() => import("@/components/TrashView").then((module) => module.TrashView));

const EMPTY: never[] = [];

interface NotesPageClientProps { initialNote: Doc<"notes"> | null; }

export function NotesPageClient({ initialNote }: NotesPageClientProps) {
  const { preloadedNotes, preloadedCanvases, preloadedTags } = useNotesData();
  const router = useRouter();
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(initialNote?._id ?? null);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  useQuickSwitcherShortcut(setShowQuickSwitcher);
  const [showTrash, setShowTrash] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [viewMode, setViewMode] = useNotesViewMode();

  const notes = usePreloadedAuthQuery(preloadedNotes) ?? EMPTY;
  const canvases = usePreloadedAuthQuery(preloadedCanvases) ?? EMPTY;
  const tags = usePreloadedAuthQuery(preloadedTags) ?? EMPTY;
  const createNote = useMutation(api.notes.createNote);
  const softDeleteNote = useMutation(api.notes.softDeleteNote);
  const togglePin = useMutation(api.notes.togglePin);

  const handleViewModeChange = setViewMode;

  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    if (notes.length > 0 && !selectedNoteId && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      startTransition(() => {
        setSelectedNoteId(notes[0]._id);
      });
      return;
    }

    if (selectedNoteId) {
      const noteExists = notes.some((n) => n._id === selectedNoteId);
      if (!noteExists) {
        startTransition(() => {
          if (notes.length > 0) {
            setSelectedNoteId(notes[0]._id);
          } else {
            setSelectedNoteId(null);
          }
        });
      }
    }
  }, [notes, selectedNoteId]);

  const handleNewNote = useCallback(async () => {
    const noteId = await createNote({});
    setSelectedNoteId(noteId);
    setShowSidebarMobile(false);
  }, [createNote]);

  const handleDeleteNote = useCallback(async () => {
    if (selectedNoteId) {
      await softDeleteNote({ id: selectedNoteId });
    }
  }, [selectedNoteId, softDeleteNote]);

  const handleTogglePin = useCallback(async () => {
    if (selectedNoteId) {
      await togglePin({ id: selectedNoteId });
    }
  }, [selectedNoteId, togglePin]);

  const handleNextNote = useCallback(() => {
    if (notes.length === 0) return;
    const currentIndex = notes.findIndex((n) => n._id === selectedNoteId);
    const nextIndex = (currentIndex + 1) % notes.length;
    setSelectedNoteId(notes[nextIndex]._id);
  }, [notes, selectedNoteId]);

  const handlePrevNote = useCallback(() => {
    if (notes.length === 0) return;
    const currentIndex = notes.findIndex((n) => n._id === selectedNoteId);
    const prevIndex = currentIndex <= 0 ? notes.length - 1 : currentIndex - 1;
    setSelectedNoteId(notes[prevIndex]._id);
  }, [notes, selectedNoteId]);

  useKeyboardShortcuts({
    onNewNote: handleNewNote,
    onDeleteNote: handleDeleteNote,
    onTogglePin: handleTogglePin,
    onSearch: () => {
      const searchInput = document.querySelector('input[placeholder="Search notes..."]') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    },
    onNextNote: handleNextNote,
    onPrevNote: handlePrevNote,
  });

  const { containerRef } = useSwipeGesture({
    onSwipeLeft: () => setShowSidebarMobile(false),
    onSwipeRight: () => setShowSidebarMobile(true),
  });

  const handleSelectNote = (id: Id<"notes">) => {
    setSelectedNoteId(id);
    setShowSidebarMobile(false);
    setShowTrash(false);
  };

  const handleOpenNote = () => {
    setShowSidebarMobile(false);
    setShowTrash(false);

  };

  const handleOpenCanvas = () => {
    setShowSidebarMobile(false);
    setShowTrash(false);

  };

  const handleOpenTrash = () => {
    setShowTrash(true);
  };

  const handleCloseTrash = () => {
    setShowTrash(false);
  };

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden relative min-h-0 h-full">
      <motion.div
        initial={false}
        animate={{ x: showSidebarMobile ? 0 : undefined }}
        className={`
          absolute md:relative inset-y-0 left-0 z-30 h-full min-h-0
          transform transition-transform duration-200 ease-in-out
          ${showSidebarMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <Sidebar
          selectedNoteId={selectedNoteId}
          onSelectNote={handleSelectNote}
          onOpenTrash={handleOpenTrash}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          preloadedNotes={preloadedNotes}
          preloadedTags={preloadedTags}
          preloadedCanvases={preloadedCanvases}
        />
      </motion.div>

      <AnimatePresence>
        {showSidebarMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setShowSidebarMobile(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {showTrash ? (
            <motion.div
              key="trash"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <TrashView onClose={handleCloseTrash} onSelectNote={handleSelectNote} />
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto bg-background px-4 py-4 md:p-6 pb-24 md:pb-6"
            >
              <NotesGrid
                notes={notes}
                canvases={canvases}
                tags={tags}
                selectedNoteId={selectedNoteId}
                onOpenNote={handleOpenNote}
                onOpenCanvas={handleOpenCanvas}
              />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <NoteEditor key={selectedNoteId ?? "empty"} noteId={selectedNoteId} initialNote={initialNote?._id === selectedNoteId ? initialNote : undefined} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <QuickSwitcher
        open={showQuickSwitcher}
        onOpenChange={setShowQuickSwitcher}
        onSelectNote={handleSelectNote}
        onOpenTrash={handleOpenTrash}
        preloadedNotes={preloadedNotes}
        preloadedTags={preloadedTags}
      />

      <MobileNav
        onToggleSidebar={() => setShowSidebarMobile(!showSidebarMobile)}
        onNewNote={handleNewNote}
        onOpenTrash={handleOpenTrash}
        onOpenSearch={() => setShowQuickSwitcher(true)}
        onOpenCanvas={() => router.push("/canvas")}
      />
    </div>
  );
}
