"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Layers } from "lucide-react";

interface CanvasEditorProps {
  canvasId: Id<"canvases">;
  onOpenNote?: (noteId: string) => void;
}

export function CanvasEditor({ canvasId, onOpenNote }: CanvasEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const isLoadingRef = useRef(true);
  const [TldrawModule, setTldrawModule] = useState<typeof import("@tldraw/tldraw") | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cssLoaded, setCssLoaded] = useState(false);

  // Convex queries and mutations
  const canvas = useQuery(api.canvases.getCanvas, { id: canvasId });
  const updateCanvas = useMutation(api.canvases.updateCanvas);

  // Load CSS first, then tldraw module
  useEffect(() => {
    let cancelled = false;
    
    const loadTldraw = async () => {
      try {
        // Load CSS dynamically in the browser
        if (typeof window !== "undefined") {
          const existingLink = document.querySelector('link[href*="tldraw"]');
          if (!existingLink) {
            // Load from local public folder to avoid CDN blocking
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "/tldraw.css";
            document.head.appendChild(link);
            
            await new Promise<void>((resolve) => {
              link.onload = () => resolve();
              link.onerror = () => {
                console.warn("Failed to load tldraw CSS");
                resolve();
              };
            });
          }
          setCssLoaded(true);
        }

        // Then load the module
        const mod = await import("@tldraw/tldraw");
        if (!cancelled) {
          setTldrawModule(mod);
        }
      } catch (error) {
        console.error("Failed to load tldraw:", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load canvas editor");
        }
      }
    };
    
    loadTldraw();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced save function
  const saveContent = useCallback(
    (content: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (content !== lastSavedRef.current && !isLoadingRef.current) {
          try {
            await updateCanvas({ id: canvasId, content });
            lastSavedRef.current = content;
          } catch (error) {
            console.error("Failed to save canvas:", error);
          }
        }
      }, 1000);
    },
    [canvasId, updateCanvas]
  );

  // Handle editor mount
  const handleMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;

      // Load existing content if available
      if (canvas?.content && canvas.content !== "{}" && TldrawModule) {
        try {
          const snapshot = JSON.parse(canvas.content);
          TldrawModule.loadSnapshot(editor.store, snapshot);
          lastSavedRef.current = canvas.content;
        } catch (error) {
          console.error("Failed to load canvas content:", error);
        }
      }

      isLoadingRef.current = false;

      // Listen for changes
      const unsubscribe = editor.store.listen(
        () => {
          if (!isLoadingRef.current && TldrawModule) {
            const snapshot = TldrawModule.getSnapshot(editor.store);
            const content = JSON.stringify(snapshot);
            saveContent(content);
          }
        },
        { source: "user", scope: "document" }
      );

      return unsubscribe;
    },
    [canvas?.content, saveContent, TldrawModule]
  );

  // Sync theme with tldraw
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.user.updateUserPreferences({
        colorScheme: resolvedTheme === "dark" ? "dark" : "light",
      });
    }
  }, [resolvedTheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Loading tldraw module
  if (loadError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <Layers className="h-12 w-12" />
          <span>Failed to load canvas editor</span>
          <span className="text-sm text-muted-foreground">{loadError}</span>
        </div>
      </div>
    );
  }

  if (!TldrawModule || !cssLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span>Loading canvas...</span>
        </div>
      </div>
    );
  }

  // Loading canvas data
  if (canvas === undefined) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span>Loading canvas...</span>
        </div>
      </div>
    );
  }

  // Not found state
  if (canvas === null) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Layers className="h-12 w-12" />
          <span>Canvas not found</span>
        </div>
      </div>
    );
  }

  const { Tldraw } = TldrawModule;

  // Use absolute positioning relative to parent container
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Tldraw onMount={handleMount} autoFocus />
    </div>
  );
}

// Export a simple canvas viewer for previews
export function CanvasPreview({
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-muted/50 rounded-lg flex items-center justify-center ${className}`}
    >
      <Layers className="h-8 w-8 text-muted-foreground/40" />
    </div>
  );
}
