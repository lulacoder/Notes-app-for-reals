"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Sidebar } from "@/components/Sidebar";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { TrashView } from "@/components/TrashView";
import { MobileNav, useSwipeGesture } from "@/components/MobileNav";
import { NoteEditor } from "@/components/NoteEditor";
import { AnimatePresence, motion } from "framer-motion";

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as Id<"notes">;
  const createNote = useMutation(api.notes.createNote);

  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("notes-view-mode") as "list" | "grid") || "list";
    }
    return "list";
  });

  const { containerRef } = useSwipeGesture({
    onSwipeLeft: () => setShowSidebarMobile(false),
    onSwipeRight: () => setShowSidebarMobile(true),
  });

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("notes-view-mode", mode);
    }

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
          onSelectNote={handleSelectNote}
          onOpenTrash={handleOpenTrash}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
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
              <NoteEditor noteId={noteId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <QuickSwitcher
        open={showQuickSwitcher}
        onOpenChange={setShowQuickSwitcher}
        onSelectNote={handleSelectNote}
        onOpenTrash={handleOpenTrash}
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
