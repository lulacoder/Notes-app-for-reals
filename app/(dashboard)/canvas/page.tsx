"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Layers,
  Search,
  Pin,
  MoreHorizontal,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CanvasPreview } from "@/components/CanvasEditor";
import { getRelativeTime } from "@/lib/relative-time";

export default function CanvasListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const canvases = useQuery(api.canvases.listCanvases);
  const createCanvas = useMutation(api.canvases.createCanvas);
  const softDeleteCanvas = useMutation(api.canvases.softDeleteCanvas);
  const togglePin = useMutation(api.canvases.togglePin);

  const handleCreateCanvas = async () => {
    const canvasId = await createCanvas({ title: "Untitled Canvas" });
    router.push(`/canvas/${canvasId}`);
  };

  const handleOpenCanvas = (id: Id<"canvases">) => {
    router.push(`/canvas/${id}`);
  };

  const handleDeleteCanvas = async (id: Id<"canvases">) => {
    await softDeleteCanvas({ id });
  };

  const handleTogglePin = async (id: Id<"canvases">) => {
    await togglePin({ id });
  };

  // Filter canvases by search query
  const filteredCanvases =
    canvases?.filter((canvas) =>
      canvas.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // Separate pinned and unpinned
  const pinnedCanvases = filteredCanvases.filter((c) => c.isPinned);
  const unpinnedCanvases = filteredCanvases.filter((c) => !c.isPinned);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/notes")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Canvases</h1>
            </div>
          </div>
          <Button onClick={handleCreateCanvas}>
            <Plus className="h-4 w-4 mr-2" />
            New Canvas
          </Button>
        </div>

        {/* Search */}
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

      {/* Canvas grid */}
      <ScrollArea className="flex-1 p-4">
        {canvases === undefined ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredCanvases.length === 0 ? (
          <EmptyState
            hasCanvases={(canvases?.length || 0) > 0}
            onCreateCanvas={handleCreateCanvas}
          />
        ) : (
          <div className="space-y-6">
            {/* Pinned section */}
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
                      onOpen={handleOpenCanvas}
                      onDelete={handleDeleteCanvas}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All canvases section */}
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
                      onOpen={handleOpenCanvas}
                      onDelete={handleDeleteCanvas}
                      onTogglePin={handleTogglePin}
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

// Canvas card component
function CanvasCard({
  canvas,
  onOpen,
  onDelete,
  onTogglePin,
}: {
  canvas: {
    _id: Id<"canvases">;
    title: string;
    content: string;
    updatedAt: number;
    isPinned?: boolean;
  };
  onOpen: (id: Id<"canvases">) => void;
  onDelete: (id: Id<"canvases">) => void;
  onTogglePin: (id: Id<"canvases">) => void;
}) {
  return (
    <div
      onClick={() => onOpen(canvas._id)}
      className="group cursor-pointer rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-lg overflow-hidden"
    >
      {/* Preview */}
      <div className="aspect-video bg-muted/30 relative">
        <CanvasPreview content={canvas.content} className="w-full h-full" />
        {canvas.isPinned && (
          <div className="absolute top-2 left-2">
            <Pin className="h-4 w-4 text-primary fill-primary" />
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(canvas._id);
                }}
              >
                <Pin className="h-4 w-4 mr-2" />
                {canvas.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(canvas._id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="font-medium truncate">{canvas.title}</h3>
        <p className="text-xs text-muted-foreground">
          {getRelativeTime(canvas.updatedAt)}
        </p>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({
  hasCanvases,
  onCreateCanvas,
}: {
  hasCanvases: boolean;
  onCreateCanvas: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Layers className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium mb-2">
        {hasCanvases ? "No canvases found" : "No canvases yet"}
      </h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">
        {hasCanvases
          ? "Try a different search term"
          : "Create your first canvas to start drawing, organizing notes, and visualizing ideas"}
      </p>
      {!hasCanvases && (
        <Button onClick={onCreateCanvas}>
          <Plus className="h-4 w-4 mr-2" />
          Create Canvas
        </Button>
      )}
    </div>
  );
}
