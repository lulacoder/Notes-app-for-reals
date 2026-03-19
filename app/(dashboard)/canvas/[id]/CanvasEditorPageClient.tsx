"use client";

import { useState, useEffect } from "react";
import type { Preloaded } from "convex/react";
import { useMutation, usePreloadedQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CanvasEditor } from "@/components/CanvasEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Layers,
  Pin,
  MoreHorizontal,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagAssigner } from "@/components/TagManager";

interface CanvasEditorPageClientProps {
  canvasId: Id<"canvases">;
  preloadedCanvas: Preloaded<typeof api.canvases.getCanvas>;
}

export function CanvasEditorPageClient({
  canvasId,
  preloadedCanvas,
}: CanvasEditorPageClientProps) {
  const router = useRouter();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  const canvas = usePreloadedQuery(preloadedCanvas);
  const updateCanvas = useMutation(api.canvases.updateCanvas);
  const softDeleteCanvas = useMutation(api.canvases.softDeleteCanvas);
  const togglePin = useMutation(api.canvases.togglePin);
  const updateCanvasTags = useMutation(api.canvases.updateCanvasTags);

  useEffect(() => {
    if (canvas?.title && !isEditingTitle) {
      queueMicrotask(() => {
        setEditedTitle(canvas.title);
      });
    }
  }, [canvas?.title, isEditingTitle]);

  const handleBack = () => {
    router.push("/canvas");
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== canvas?.title) {
      await updateCanvas({ id: canvasId, title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(canvas?.title || "");
    setIsEditingTitle(false);
  };

  const handleDelete = async () => {
    await softDeleteCanvas({ id: canvasId });
    router.push("/canvas");
  };

  const handleTogglePin = async () => {
    await togglePin({ id: canvasId });
  };

  const handleUpdateTags = async (tagIds: Id<"tags">[]) => {
    await updateCanvasTags({ id: canvasId, tagIds });
  };

  if (canvas === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Layers className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-medium">Canvas not found</h2>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Canvases
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 flex items-center gap-3 shrink-0 z-20">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Layers className="h-5 w-5 text-primary shrink-0" />

          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="h-8 max-w-xs"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="font-medium truncate hover:text-primary transition-colors flex items-center gap-2 group"
            >
              {canvas.title}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
            </button>
          )}

          {canvas.isPinned && (
            <Pin className="h-4 w-4 text-primary fill-primary shrink-0" />
          )}
        </div>

        <TagAssigner
          selectedTagIds={canvas.tagIds || []}
          onUpdateTags={handleUpdateTags}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleTogglePin}>
              <Pin className="h-4 w-4 mr-2" />
              {canvas.isPinned ? "Unpin" : "Pin"} Canvas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Canvas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <CanvasEditor canvasId={canvasId} />
      </div>
    </div>
  );
}
