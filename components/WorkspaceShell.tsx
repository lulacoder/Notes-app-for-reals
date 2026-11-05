"use client";

import { Activity, useEffect, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

import { useMutation } from "convex/react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";

import { useWorkspaceNavigation } from "@/providers/workspace-navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav, useSwipeGesture } from "@/components/MobileNav";
import { useKeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { useNotesData } from "@/providers/notes-provider";
import { useNoteSummaries } from "@/lib/use-notes-queries";
import { useNotesViewMode } from "@/lib/use-notes-view-mode";
import { useQuickSwitcherShortcut } from "@/lib/use-quick-switcher-shortcut";

const QuickSwitcher = dynamic(() =>
  import("@/components/QuickSwitcher").then((module) => module.QuickSwitcher),
);
const TrashView = dynamic(() =>
  import("@/components/TrashView").then((module) => module.TrashView),
);
const EMPTY: never[] = [];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const data = useNotesData();
  const notes = useNoteSummaries(data.preloadedNotes);
  const canvases = usePreloadedAuthQuery(data.preloadedCanvases) ?? EMPTY;
  const [viewMode, setViewMode] = useNotesViewMode();
  const [sidebarPath, setSidebarPath] = useState<string | null>(null);
  const [trashPath, setTrashPath] = useState<string | null>(null);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const { registerSearch } = useWorkspaceNavigation();
  useEffect(
    () => registerSearch(() => setShowQuickSwitcher(true)),
    [registerSearch],
  );
  useQuickSwitcherShortcut(setShowQuickSwitcher);

  const showSidebarMobile = sidebarPath === pathname;
  useEffect(() => {
    if (!showSidebarMobile) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarPath(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSidebarMobile]);
  const showTrash = trashPath === pathname;
  const selectedNoteId =
    pathname === "/notes" && viewMode === "list"
      ? (notes[0]?._id ?? null)
      : (notes.find((note) => pathname === `/notes/${note._id}`)?._id ?? null);
  const selectedCanvasId =
    canvases.find((canvas) => pathname === `/canvas/${canvas._id}`)?._id ??
    null;
  const createNote = useMutation(api.notes.createNote);
  const togglePin = useMutation(api.notes.togglePin);

  function closePanels() {
    setSidebarPath(null);
    setTrashPath(null);
  }

  function selectNote(id: Id<"notes">) {
    closePanels();
    router.push(`/notes/${id}`, { scroll: false });
  }

  function selectCanvas(id: Id<"canvases">) {
    closePanels();
    router.push(`/canvas/${id}`, { scroll: false });
  }

  async function newNote() {
    const id = await createNote({});
    selectNote(id);
  }

  function openTrash() {
    setTrashPath(pathname);
    setSidebarPath(null);
  }

  function changeViewMode(mode: "list" | "grid") {
    setViewMode(mode);
    closePanels();
    if (mode === "grid" || pathname.startsWith("/canvas"))
      router.push("/notes");
  }

  function adjacentNote(direction: number) {
    if (notes.length === 0) return;
    const index = notes.findIndex((note) => note._id === selectedNoteId);
    const next = (index + direction + notes.length) % notes.length;
    selectNote(notes[next]._id);
  }

  useKeyboardShortcuts({
    onNewNote: newNote,
    onTogglePin: selectedNoteId
      ? () => {
          void togglePin({ id: selectedNoteId });
        }
      : undefined,
    onNextNote: pathname.startsWith("/notes")
      ? () => adjacentNote(1)
      : undefined,
    onPrevNote: pathname.startsWith("/notes")
      ? () => adjacentNote(-1)
      : undefined,
  });

  const { containerRef } = useSwipeGesture({
    isOpen: showSidebarMobile,
    enabled: pathname.startsWith("/notes"),
    onSwipeLeft: () => {
      if (pathname.startsWith("/notes")) setSidebarPath(null);
    },
    onSwipeRight: () => {
      if (pathname.startsWith("/notes")) setSidebarPath(pathname);
    },
  });

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-w-0 min-h-0 overflow-hidden relative h-full"
    >
      <div
        data-mobile-sidebar
        data-open={showSidebarMobile}
        className="mobile-sidebar absolute md:relative inset-y-0 left-0 z-30 h-full min-h-0 shrink-0"
      >
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarPath(null)}
          className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <Sidebar
          {...data}
          selectedNoteId={selectedNoteId}
          selectedCanvasId={selectedCanvasId}
          onSelectNote={selectNote}
          onNavigate={closePanels}
          onOpenTrash={openTrash}
          viewMode={viewMode}
          onViewModeChange={changeViewMode}
        />
      </div>
      <button
        aria-label="Close sidebar"
        tabIndex={showSidebarMobile ? 0 : -1}
        data-mobile-sidebar-backdrop
        data-open={showSidebarMobile}
        className="mobile-sidebar-backdrop fixed inset-0 bg-black/50 z-20 md:hidden"
        onClick={() => setSidebarPath(null)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <Activity mode={showTrash ? "hidden" : "visible"}>{children}</Activity>
        {showTrash && (
          <TrashView
            onClose={() => setTrashPath(null)}
            onSelectNote={selectNote}
          />
        )}
      </div>
      <QuickSwitcher
        open={showQuickSwitcher}
        onOpenChange={setShowQuickSwitcher}
        onSelectNote={selectNote}
        onSelectCanvas={selectCanvas}
        onOpenTrash={openTrash}
        preloadedNotes={data.preloadedNotes}
        preloadedCanvases={data.preloadedCanvases}
        preloadedTags={data.preloadedTags}
      />
      {pathname.startsWith("/notes") && (
        <MobileNav
          onToggleSidebar={() =>
            setSidebarPath(showSidebarMobile ? null : pathname)
          }
          hidden={showSidebarMobile}
          onNewNote={newNote}
          onOpenTrash={openTrash}
          onOpenSearch={() => setShowQuickSwitcher(true)}
          onOpenCanvas={() => {
            closePanels();
            router.push("/canvas");
          }}
        />
      )}
    </div>
  );
}
