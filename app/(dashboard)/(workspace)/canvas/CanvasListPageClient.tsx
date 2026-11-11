"use client";

import { useRef, useState } from "react";
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
import { useToast } from "@/components/ui/toast-notification";

interface CanvasListPageClientProps {
  preloadedCanvases: Preloaded<typeof api.canvases.listCanvases>;
}

export function CanvasListPageClient({
  preloadedCanvases,
}: CanvasListPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const { error } = useToast();

  const canvases = usePreloadedAuthQuery(preloadedCanvases) ?? [];
  const createCanvas = useMutation(api.canvases.createCanvas);

  const handleCreateCanvas = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const canvasId = await createCanvas({ title: "Untitled Canvas" });
      router.push(`/canvas/${canvasId}`);
    } catch (cause) {
      console.error("Failed CanvasListPageClient action:", cause);
      error(
        "Could not create canvas",
        cause instanceof Error ? cause.message : "Try again.",
      );
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

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
          <Button onClick={handleCreateCanvas} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            {creating ? "Creating..." : "New Canvas"}
          </Button>
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
            creating={creating}
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
  creating,
}: {
  hasCanvases: boolean;
  onCreateCanvas: () => void;
  creating: boolean;
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
        <Button onClick={onCreateCanvas} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          {creating ? "Creating..." : "Create Canvas"}
        </Button>
      )}
    </div>
  );
}
