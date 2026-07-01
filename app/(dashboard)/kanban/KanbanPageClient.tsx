"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { BoardSidebar } from "@/components/kanban/BoardSidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface KanbanPageClientProps {
  preloadedBoards: Preloaded<typeof api.kanban.listBoards>;
  preloadedTags: Preloaded<typeof api.tags.listTags>;
}

export function KanbanPageClient({
  preloadedBoards,
  preloadedTags,
}: KanbanPageClientProps) {
  const boards = usePreloadedQuery(preloadedBoards);
  const tags = usePreloadedQuery(preloadedTags);
  const createBoard = useMutation(api.kanban.createBoard);

  const [selectedBoardId, setSelectedBoardId] =
    useState<Id<"kanbanBoards"> | null>(boards[0]?._id ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleCreateBoard = async () => {
    const id = await createBoard({ title: "New Board" });
    setSelectedBoardId(id);
  };

  // Keep selected board valid if it gets deleted
  const selectedBoard = boards.find((b) => b._id === selectedBoardId);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-background">
      {/* Board sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r flex flex-col min-h-0 overflow-hidden shrink-0"
          >
            <BoardSidebar
              boards={boards}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoardId}
              onCreateBoard={handleCreateBoard}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main board area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {selectedBoard ? (
          <KanbanBoard
            board={selectedBoard}
            tags={tags}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        ) : (
          <EmptyBoardState onCreateBoard={handleCreateBoard} />
        )}
      </div>
    </div>
  );
}

function EmptyBoardState({ onCreateBoard }: { onCreateBoard: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <LayoutDashboard className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">No boards yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Create your first Kanban board to start organizing your tasks and
          projects.
        </p>
      </div>
      <Button size="lg" onClick={onCreateBoard}>
        <Plus className="h-5 w-5 mr-2" />
        Create Board
      </Button>
    </div>
  );
}
