"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import type { Preloaded } from "convex/react";
import { useMutation } from "convex/react";
import {
  Plus,
  Layers,
  Search,
  Pin,
  Trash2,
  ArrowLeft,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CanvasCard } from "@/components/CanvasCard";
import { CreateWorkspaceDialog } from "@/components/CreateWorkspaceDialog";
import { WorkspaceEmptyState } from "@/components/WorkspaceEmptyState";

interface CanvasListPageClientProps {
  preloadedCanvases: Preloaded<typeof api.canvases.listCanvases>;
}

export function CanvasListPageClient({
  preloadedCanvases,
}: CanvasListPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const canvases = usePreloadedAuthQuery(preloadedCanvases) ?? [];
  const createCanvas = useMutation(api.canvases.createCanvas);

  async function handleCreateCanvas(title: string) {
    const canvasId = await createCanvas({ title });
    router.push(`/canvas/${canvasId}`);
  }

  const filteredCanvases = canvases.filter((canvas) =>
    canvas.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const pinnedCanvases = filteredCanvases.filter((c) => c.isPinned);
  const unpinnedCanvases = filteredCanvases.filter((c) => !c.isPinned);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to notes"
              onClick={() => router.push("/notes")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Canvases</h1>
            </div>
          </div>
          <CreateWorkspaceDialog kind="canvas" onCreate={handleCreateCanvas}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Canvas
            </Button>
          </CreateWorkspaceDialog>
        </div>
        <Link
          href="/trash"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash2 size={13} />
          Recently deleted
        </Link>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search canvases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {filteredCanvases.length === 0 ? (
          <EmptyState
            hasCanvases={canvases.length > 0}
            onCreateCanvas={handleCreateCanvas}
          />
        ) : (
          <div className="space-y-6">
            {pinnedCanvases.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Pin className="h-3 w-3" />
                  Pinned
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pinnedCanvases.map((canvas) => (
                    <CanvasCard
                      key={canvas._id}
                      canvas={canvas}
                    />
                  ))}
                </div>
              </div>
            )}

            {unpinnedCanvases.length > 0 && (
              <div className="space-y-3">
                {pinnedCanvases.length > 0 && (
                  <h2 className="text-sm font-medium text-muted-foreground">
                    All Canvases
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unpinnedCanvases.map((canvas) => (
                    <CanvasCard
                      key={canvas._id}
                      canvas={canvas}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}


function EmptyState({
  hasCanvases,
  onCreateCanvas,
}: {
  hasCanvases: boolean;
  onCreateCanvas: (title: string) => Promise<void>;
}) {
  return (
    <WorkspaceEmptyState
      icon={<Layers size={34} />}
      title={hasCanvases ? "No canvases found" : "Make room for ideas."}
      description={hasCanvases
        ? "Try a different search term."
        : "Create a canvas to draw, organize notes, and visualize ideas."}
    >
      {!hasCanvases && (
        <CreateWorkspaceDialog kind="canvas" onCreate={onCreateCanvas}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Canvas
          </Button>
        </CreateWorkspaceDialog>
      )}
    </WorkspaceEmptyState>
  );
}
