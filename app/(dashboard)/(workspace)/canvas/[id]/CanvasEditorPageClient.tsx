"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import type { Preloaded } from "convex/react";
import { useConvexAuth, useMutation } from "convex/react";
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

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagAssigner } from "@/components/TagManager";
import { ContentSkeleton } from "@/components/DashboardSkeleton";
import { useToast } from "@/components/ui/toast-notification";

const CanvasEditor = dynamic(
  () =>
    import("@/components/CanvasEditor").then((module) => module.CanvasEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full bg-muted/30 animate-pulse"
        aria-label="Loading canvas"
      />
    ),
  },
);

interface CanvasEditorPageClientProps {
  canvasId: Id<"canvases">;
  preloadedCanvas: Preloaded<typeof api.canvases.getCanvas>;
}

export function CanvasEditorPageClient({
  canvasId,
  preloadedCanvas,
}: CanvasEditorPageClientProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const pending = pendingCount > 0;
  const metadataQueue = useRef(Promise.resolve());
  const { error, success } = useToast();
  async function saveMetadata(
    action: () => Promise<unknown>,
    done?: () => void,
  ) {
    setPendingCount((count) => count + 1);
    const request = metadataQueue.current.then(async () => {
      try {
        await action();
        done?.();
      } catch (cause) {
        console.error("Failed to update canvas metadata:", cause);
        error(
          "Could not update canvas",
          cause instanceof Error
            ? cause.message
            : "Try again. Your changes are still here.",
        );
      } finally {
        setPendingCount((count) => count - 1);
      }
    });
    metadataQueue.current = request;
    await request;
  }

  const canvas = usePreloadedAuthQuery(preloadedCanvas);
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
      await saveMetadata(
        () => updateCanvas({ id: canvasId, title: editedTitle.trim() }),
        () => setIsEditingTitle(false),
      );
      return;
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(canvas?.title || "");
    setIsEditingTitle(false);
  };

  const handleDelete = async () => {
    await saveMetadata(
      () => softDeleteCanvas({ id: canvasId }),
      () => {
        success("Canvas moved to recently deleted");
        router.push("/canvas");
      },
    );
  };

  const handleTogglePin = async () => {
    await saveMetadata(() => togglePin({ id: canvasId }));
  };

  const handleUpdateTags = async (tagIds: Id<"tags">[]) => {
    await saveMetadata(() => updateCanvasTags({ id: canvasId, tagIds }));
  };

  if (canvas === undefined || (!isLoading && !isAuthenticated))
    return <ContentSkeleton />;

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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to canvases"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Layers className="h-5 w-5 text-primary shrink-0" />

          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                disabled={pending}
                aria-label="Canvas title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="h-8 max-w-xs"
                autoFocus
              />
              <Button
                disabled={pending}
                size="icon"
                variant="ghost"
                aria-label="Save canvas title"
                onClick={handleSaveTitle}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Cancel title edit"
                disabled={pending}
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              disabled={pending}
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
          disabled={pending}
          selectedTagIds={canvas.tagIds || []}
          onUpdateTags={handleUpdateTags}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Canvas options"
              disabled={pending}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleTogglePin} disabled={pending}>
              <Pin className="h-4 w-4 mr-2" />
              {canvas.isPinned ? "Unpin" : "Pin"} Canvas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={pending}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Canvas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <CanvasEditor
          key={canvasId}
          canvasId={canvasId}
          initialCanvas={canvas}
        />
      </div>
    </div>
  );
}
