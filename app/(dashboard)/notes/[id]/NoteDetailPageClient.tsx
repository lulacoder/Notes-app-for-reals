"use client";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useNotesData } from "@/providers/notes-provider";
import { useNotesViewMode } from "@/lib/use-notes-view-mode";
import { useQuickSwitcherShortcut } from "@/lib/use-quick-switcher-shortcut";
import type { Preloaded } from "convex/react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav, useSwipeGesture } from "@/components/MobileNav";
import { NoteEditor } from "@/components/NoteEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const QuickSwitcher = dynamic(() => import("@/components/QuickSwitcher").then((module) => module.QuickSwitcher));
const TrashView = dynamic(() => import("@/components/TrashView").then((module) => module.TrashView));

interface NoteDetailPageClientProps {
  noteId: Id<"notes">;
  preloadedSelectedNote: Preloaded<typeof api.notes.getNote>;
}

export function NoteDetailPageClient({
  noteId,
  preloadedSelectedNote,
}: NoteDetailPageClientProps) {
  const { preloadedNotes, preloadedCanvases, preloadedTags, preloadedTrashCount } = useNotesData();
  const router = useRouter();
  const createNote = useMutation(api.notes.createNote);
  const selectedNote = usePreloadedAuthQuery(preloadedSelectedNote);

  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  useQuickSwitcherShortcut(setShowQuickSwitcher);
  const [showTrash, setShowTrash] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [viewMode, setViewMode] = useNotesViewMode();

  const { containerRef } = useSwipeGesture({
    onSwipeLeft: () => setShowSidebarMobile(false),
    onSwipeRight: () => setShowSidebarMobile(true),
  });

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);

    if (mode === "grid") {
      router.push("/notes");
      return;
    }

    router.push(`/notes/${noteId}`);
  };

  const handleSelectNote = (id: Id<"notes">) => {
    setShowSidebarMobile(false);
    setShowTrash(false);
    router.push(`/notes/${id}`);
  };

  const handleOpenTrash = () => {
    setShowTrash(true);
    setShowSidebarMobile(false);
  };

  const handleNewNote = useCallback(async () => {
    const newNoteId = await createNote({});
    setShowSidebarMobile(false);
    setShowTrash(false);
    router.push(`/notes/${newNoteId}`);
  }, [createNote, router]);

  if (selectedNote === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-medium">Note not found</h2>
        <Button variant="outline" onClick={() => router.push("/notes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Notes
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden relative min-h-0 h-full">
      <motion.div
        initial={false}
        animate={{ x: showSidebarMobile ? 0 : undefined }}
        className={[
          "absolute md:relative inset-y-0 left-0 z-30 h-full",
          "transform transition-transform duration-200 ease-in-out",
          showSidebarMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <Sidebar
          selectedNoteId={noteId}
          routeNavigation
          onSelectNote={handleSelectNote}
          onOpenTrash={handleOpenTrash}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          preloadedNotes={preloadedNotes}
          preloadedTrashCount={preloadedTrashCount}
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {showTrash ? (
            <motion.div
              key="trash"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <TrashView onClose={() => setShowTrash(false)} onSelectNote={handleSelectNote} />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden bg-background"
            >
              <NoteEditor key={noteId} noteId={noteId} initialNote={selectedNote} />
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
