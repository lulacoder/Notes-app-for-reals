"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  FileText,
  Trash2,
  Search,
  Layers,
  LayoutDashboard,
  MoreHorizontal,
} from "lucide-react";

interface MobileNavProps {
  onToggleSidebar: () => void;
  onNewNote: () => void;
  onOpenTrash: () => void;
  onOpenSearch?: () => void;
  onOpenCanvas?: () => void;
  onOpenBoards?: () => void;
}

export function MobileNav({
  onToggleSidebar,
  onNewNote,
  onOpenTrash,
  onOpenSearch,
  onOpenCanvas,
  onOpenBoards,
}: MobileNavProps) {
  const router = useRouter();
  return (
    <div
      className="md:hidden fixed bottom-4 left-4 right-4 z-50 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="pointer-events-auto max-w-sm mx-auto bg-card/85 backdrop-blur-xl border border-border/60 shadow-2xl rounded-full p-1.5 px-2 flex items-center justify-around">
        {/* Notes */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-1.5 px-2 min-w-0 flex-1 rounded-full hover:bg-accent/60"
          onClick={onToggleSidebar}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight">Notes</span>
        </Button>

        {/* Canvas */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-1.5 px-2 min-w-0 flex-1 rounded-full hover:bg-accent/60"
          onClick={onOpenCanvas}
        >
          <Layers className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight">Canvas</span>
        </Button>

        {/* New Note — Seamless transparent glass style */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-1.5 px-2 min-w-0 flex-1 rounded-full text-primary hover:bg-primary/10"
          onClick={onNewNote}
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
          <span className="text-[10px] font-semibold tracking-tight">New</span>
        </Button>

        {/* Boards */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-1.5 px-2 min-w-0 flex-1 rounded-full hover:bg-accent/60"
          onClick={onOpenBoards ?? (() => router.push("/kanban"))}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight">Boards</span>
        </Button>

        {/* More — Popover containing Search and Trash */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex-col gap-0.5 h-auto py-1.5 px-2 min-w-0 flex-1 rounded-full hover:bg-accent/60"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-tight">More</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-44 p-1 rounded-xl shadow-xl border border-border/60 bg-card/95 backdrop-blur-md"
            sideOffset={12}
          >
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 text-xs h-9 font-medium"
              onClick={onOpenSearch}
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              Search Notes
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 text-xs h-9 font-medium text-destructive focus:text-destructive"
              onClick={onOpenTrash}
            >
              <Trash2 className="h-4 w-4" />
              Trash
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}


// Swipe gesture hook for mobile
interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeGestureOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchEndX.current = null;
      touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
      if (!touchStartX.current || !touchEndX.current) return;

      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > threshold;
      const isRightSwipe = distance < -threshold;

      if (isLeftSwipe) {
        onSwipeLeft?.();
      }
      if (isRightSwipe) {
        onSwipeRight?.();
      }

      touchStartX.current = null;
      touchEndX.current = null;
    };

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchmove", handleTouchMove);
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { containerRef };
}

// PWA install prompt hook
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    // Check if already installed during initialization
    if (typeof window !== "undefined") {
      return window.matchMedia("(display-mode: standalone)").matches;
    }
    return false;
  });

  useEffect(() => {
    // Skip if already installed
    if (isInstalled) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [isInstalled]);

  const install = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }

    setDeferredPrompt(null);
    return outcome === "accepted";
  };

  return { isInstallable, isInstalled, install };
}
