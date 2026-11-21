"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { useMutation, type Preloaded } from "convex/react";
import { ArrowLeft, LayoutDashboard, PanelLeftOpen, Plus } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { BoardSidebar } from "@/components/kanban/BoardSidebar";
import { CreateWorkspaceDialog } from "@/components/CreateWorkspaceDialog";
import { Button } from "@/components/ui/button";
import { WorkspaceEmptyState } from "@/components/WorkspaceEmptyState";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface KanbanPageClientProps {
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
}: KanbanPageClientProps) {
  const boards = usePreloadedAuthQuery(preloadedBoards) ?? [];
  const tags = usePreloadedAuthQuery(preloadedTags) ?? [];
  const params = useSearchParams();
  const boardParam = params.get("board");
  const cardParam = params.get("card");
  const selected =
    boards.find((board) => board._id === boardParam) ?? boards[0];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const createBoard = useMutation(api.kanban.createBoard);
  function select(id: Id<"kanbanBoards">) {
    window.history.pushState(null, "", `/kanban?board=${id}`);
    setDrawerOpen(false);
  }
  async function create(title: string) {
    const id = await createBoard({ title });
    select(id);
  }
  const sidebar = (
    <BoardSidebar
      boards={boards}
      selectedBoardId={selected?._id ?? null}
      onSelectBoard={select}
      onCreateBoard={create}
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
            linkedCard={cardParam && selected._id === boardParam ? {
              id: cardParam,
              dismiss: () => window.history.replaceState(null, "", `/kanban?board=${selected._id}`),
            } : undefined}
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
            <WorkspaceEmptyState
              className="flex-1"
              icon={<LayoutDashboard size={34} />}
              headingAs="h1"
              title="Make room for a plan."
              description="Give your tasks a home. Start a board, add a few next steps, and move them forward."
            >
              <CreateWorkspaceDialog kind="board" onCreate={create}>
                <Button>
                  <Plus size={16} />
                  Create your first board
                </Button>
              </CreateWorkspaceDialog>
            </WorkspaceEmptyState>
          </>
        )}
      </div>
    </div>
  );
}
