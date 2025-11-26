"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { useKeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { TrashView } from "@/components/TrashView";
import { MobileNav, useSwipeGesture } from "@/components/MobileNav";

export default function NotesPage() {
  const router = useRouter();
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(null);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  
  const notes = useQuery(api.notes.listNotes);
  const createNote = useMutation(api.notes.createNote);
  const softDeleteNote = useMutation(api.notes.softDeleteNote);
  const togglePin = useMutation(api.notes.togglePin);

  // Auto-select first note when notes load
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (notes && notes.length > 0 && !selectedNoteId && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
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

  // Keyboard shortcut handlers
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
    if (!notes || notes.length === 0) return;
    const currentIndex = notes.findIndex((n) => n._id === selectedNoteId);
    const nextIndex = (currentIndex + 1) % notes.length;
    setSelectedNoteId(notes[nextIndex]._id);
  }, [notes, selectedNoteId]);

  const handlePrevNote = useCallback(() => {
    if (!notes || notes.length === 0) return;
    const currentIndex = notes.findIndex((n) => n._id === selectedNoteId);
    const prevIndex = currentIndex <= 0 ? notes.length - 1 : currentIndex - 1;
    setSelectedNoteId(notes[prevIndex]._id);
  }, [notes, selectedNoteId]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onNewNote: handleNewNote,
    onDeleteNote: handleDeleteNote,
    onTogglePin: handleTogglePin,
    onQuickSwitcher: () => setShowQuickSwitcher(true),
    onSearch: () => {
      // Focus sidebar search
      const searchInput = document.querySelector('input[placeholder="Search notes..."]') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    },
    onNextNote: handleNextNote,
    onPrevNote: handlePrevNote,
  });

  // Swipe gesture for mobile
  const { containerRef } = useSwipeGesture({
    onSwipeLeft: () => setShowSidebarMobile(false),
    onSwipeRight: () => setShowSidebarMobile(true),
  });

  const handleSelectNote = (id: Id<"notes">) => {
    setSelectedNoteId(id);
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
    <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
      {/* Sidebar - hidden on mobile unless toggled */}
      <div
        className={`
          absolute md:relative inset-y-0 left-0 z-30
          transform transition-transform duration-200 ease-in-out
          ${showSidebarMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <Sidebar
          selectedNoteId={selectedNoteId}
          onSelectNote={handleSelectNote}
          onOpenTrash={handleOpenTrash}
        />
      </div>

      {/* Mobile overlay */}
      {showSidebarMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setShowSidebarMobile(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showTrash ? (
          <TrashView onClose={handleCloseTrash} onSelectNote={handleSelectNote} />
        ) : (
          <NoteEditor noteId={selectedNoteId} />
        )}
      </div>

      {/* Quick Switcher */}
      <QuickSwitcher
        open={showQuickSwitcher}
        onOpenChange={setShowQuickSwitcher}
        onSelectNote={handleSelectNote}
        onOpenTrash={handleOpenTrash}
      />

      {/* Mobile Navigation */}
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
