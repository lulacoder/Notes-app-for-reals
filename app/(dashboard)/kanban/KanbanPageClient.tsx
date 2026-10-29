"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { useMutation, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { BoardSidebar } from "@/components/kanban/BoardSidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-notification";
import { ArrowLeft, LayoutDashboard, PanelLeftOpen, Plus } from "lucide-react";

interface Props {
  preloadedBoards: Preloaded<typeof api.kanban.listBoards>;
  preloadedTags: Preloaded<typeof api.tags.listTags>;
  initialBoardData: {
    boardId: Id<"kanbanBoards">;
    columns: Doc<"kanbanColumns">[];
    cards: Doc<"kanbanCards">[];
  } | null;
}

export function KanbanPageClient({
  preloadedBoards,
  preloadedTags,
  initialBoardData,
}: Props) {
  const boards = usePreloadedAuthQuery(preloadedBoards) ?? [];
  const tags = usePreloadedAuthQuery(preloadedTags) ?? [];
  const params = useSearchParams();
  const selected =
    boards.find((board) => board._id === params.get("board")) ?? boards[0];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const { error } = useToast();
  const createBoard = useMutation(api.kanban.createBoard);
  function select(id: Id<"kanbanBoards">) {
    window.history.pushState(null, "", `/kanban?board=${id}`);
    setDrawerOpen(false);
  }
  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createBoard({ title: "New board" });
      select(id);
    } catch (cause) {
      error(
        "Could not create board",
        cause instanceof Error ? cause.message : "Try again.",
      );
    } finally {
      setCreating(false);
    }
  }
  const sidebar = (
    <BoardSidebar
      boards={boards}
      selectedBoardId={selected?._id ?? null}
      onSelectBoard={select}
      onCreateBoard={() => void create()}
      creating={creating}
    />
  );
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      {!collapsed && (
        <div className="hidden shrink-0 border-r md:flex">{sidebar}</div>
      )}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="left-0 top-0 h-dvh w-[280px] max-w-[85vw] translate-x-0 translate-y-0 gap-0 rounded-none p-0 md:hidden">
          <DialogTitle className="sr-only">Your boards</DialogTitle>
          <DialogDescription className="sr-only">
            Choose or create a board.
          </DialogDescription>
          {sidebar}
        </DialogContent>
      </Dialog>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected ? (
          <KanbanBoard
            key={selected._id}
            board={selected}
            tags={tags}
            initialColumns={
              initialBoardData?.boardId === selected._id
                ? initialBoardData.columns
                : undefined
            }
            initialCards={
              initialBoardData?.boardId === selected._id
                ? initialBoardData.cards
                : undefined
            }
            onToggleSidebar={() => {
              if (window.matchMedia("(max-width: 767px)").matches)
                setDrawerOpen(true);
              else setCollapsed((value) => !value);
            }}
            sidebarOpen={!collapsed}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b p-3">
              <Button asChild variant="ghost" size="sm">
                <Link href="/notes">
                  <ArrowLeft size={15} />
                  Back to notes
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setDrawerOpen(true)}
              >
                <PanelLeftOpen size={15} />
                Boards
              </Button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="rounded-2xl bg-primary/10 p-5">
                <LayoutDashboard size={34} className="text-primary" />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                  From idea to next step
                </p>
                <h1 className="text-2xl font-semibold">
                  Make room for a plan.
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Give your tasks a home. Start a board, add a few next steps,
                  and move them forward.
                </p>
              </div>
              <Button disabled={creating} onClick={() => void create()}>
                <Plus size={16} />
                {creating ? "Creating..." : "Create your first board"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
