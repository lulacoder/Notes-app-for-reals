"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Plus,
  Pin,
  MoreHorizontal,
  Trash2,
  Search,
} from "lucide-react";
import { getRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Board = {
  _id: Id<"kanbanBoards">;
  title: string;
  updatedAt: number;
  isPinned?: boolean;
};

interface BoardSidebarProps {
  boards: Board[];
  selectedBoardId: Id<"kanbanBoards"> | null;
  onSelectBoard: (id: Id<"kanbanBoards">) => void;
  onCreateBoard: () => void;
}

export function BoardSidebar({
  boards,
  selectedBoardId,
  onSelectBoard,
  onCreateBoard,
}: BoardSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const softDeleteBoard = useMutation(api.kanban.softDeleteBoard);
  const togglePin = useMutation(api.kanban.togglePinBoard);

  const filtered = boards.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinned = filtered.filter((b) => b.isPinned);
  const regular = filtered.filter((b) => !b.isPinned);

  const renderBoardItem = (board: Board, index: number) => (
    <motion.div
      key={board._id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "group flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden",
        selectedBoardId === board._id
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
      onClick={() => onSelectBoard(board._id)}
    >
      <AnimatePresence>
        {selectedBoardId === board._id && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full origin-center"
          />
        )}
      </AnimatePresence>

      <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs truncate">{board.title}</div>
        <div className="text-[10px] text-muted-foreground">
          {getRelativeTime(board.updatedAt)}
        </div>
      </div>

      {board.isPinned && (
        <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
      )}

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onClick={() => togglePin({ id: board._id })}>
              <Pin className="h-4 w-4 mr-2" />
              {board.isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => softDeleteBoard({ id: board._id })}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );

  return (
    <div className="w-[260px] flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Boards</span>
          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
            {boards.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Board list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground p-2 text-center"
            >
              {searchQuery ? "No boards found" : "No boards yet"}
            </motion.p>
          ) : (
            <>
              <AnimatePresence>
                {pinned.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Pin className="h-2.5 w-2.5" />
                      Pinned
                    </div>
                    {pinned.map((b, i) => renderBoardItem(b, i))}
                    {regular.length > 0 && (
                      <div className="px-2 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        Boards
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {regular.map((b, i) => renderBoardItem(b, i + pinned.length))}
              </AnimatePresence>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t shrink-0">
        <Button
          onClick={onCreateBoard}
          className="w-full h-8 text-xs"
          variant="default"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Board
        </Button>
      </div>
    </div>
  );
}
