"use client";

import { useState } from "react";
import Link from "next/link";

import { useMutation } from "convex/react";
import {
  ArrowLeft,
  LayoutDashboard,
  Loader2,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast-notification";
import { cn } from "@/lib/utils";

interface BoardSidebarProps {
  boards: Doc<"kanbanBoards">[];
  selectedBoardId: Id<"kanbanBoards"> | null;
  onSelectBoard: (id: Id<"kanbanBoards">) => void;
  onCreateBoard: () => void;
  creating: boolean;
}

export function BoardSidebar({
  boards,
  selectedBoardId,
  onSelectBoard,
  onCreateBoard,
  creating,
}: BoardSidebarProps) {
  const [query, setQuery] = useState("");
  const pin = useMutation(api.kanban.togglePinBoard);
  const remove = useMutation(api.kanban.softDeleteBoard);
  const { error, success } = useToast();
  async function action(run: () => Promise<unknown>, message?: string) {
    try {
      await run();
      if (message) success(message);
    } catch (cause) {
      console.error("Failed BoardSidebar action:", cause);
      error(
        "Could not update board",
        cause instanceof Error ? cause.message : "Try again.",
      );
    }
  }
  const filtered = boards.filter((board) =>
    board.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <aside className="flex h-full w-[260px] flex-col bg-sidebar">
      <div className="space-y-4 border-b p-4">
        <Link
          href="/notes"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back to notes
        </Link>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <LayoutDashboard size={17} className="text-primary" /> Your boards
          </h2>
          <span className="text-xs text-muted-foreground">{boards.length}</span>
        </div>
        <label className="relative block">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            aria-label="Search boards"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a board..."
            className="h-9 pl-8 text-xs"
          />
        </label>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {filtered.map((board) => (
          <div
            key={board._id}
            className={cn(
              "group flex items-center gap-1 rounded-lg pr-1",
              selectedBoardId === board._id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted/60",
            )}
          >
            <a
              href={`/kanban?board=${board._id}`}
              aria-current={selectedBoardId === board._id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onSelectBoard(board._id);
              }}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-3 text-sm"
            >
              <LayoutDashboard size={14} className="shrink-0" />
              <span className="truncate">{board.title}</span>
              {board.isPinned && <Pin size={12} className="ml-auto shrink-0" />}
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Options for ${board.title}`}
                >
                  <MoreHorizontal size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => void action(() => pin({ id: board._id }))}
                >
                  <Pin size={14} />
                  {board.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                    void action(
                      () => remove({ id: board._id }),
                      "Board moved to recently deleted",
                    )
                  }
                >
                  <Trash2 size={14} />
                  Delete board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {query ? "No matching boards." : "Your first board starts here."}
          </p>
        )}
      </div>
      <div className="space-y-2 border-t p-3">
        <Button className="w-full" onClick={onCreateBoard} disabled={creating}>
          {creating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}
          New board
        </Button>
        <Link
          href="/trash"
          className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash2 size={13} />
          Recently deleted
        </Link>
      </div>
    </aside>
  );
}
