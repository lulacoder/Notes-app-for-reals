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
      className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t mobile-nav z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around pt-2 pb-1 px-2">
        {/* Notes */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2 min-w-0 flex-1"
          onClick={onToggleSidebar}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px]">Notes</span>
        </Button>

        {/* Canvas */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2 min-w-0 flex-1"
          onClick={onOpenCanvas}
        >
          <Layers className="h-5 w-5" />
          <span className="text-[10px]">Canvas</span>
        </Button>

        {/* New — primary action, inline with an accent background */}
        <div className="flex-1 flex items-center justify-center">
          <Button
            variant="default"
            size="sm"
            className="h-10 w-10 rounded-full p-0 shadow-sm"
            onClick={onNewNote}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Boards */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2 min-w-0 flex-1"
          onClick={onOpenBoards ?? (() => router.push("/kanban"))}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px]">Boards</span>
        </Button>

        {/* Search */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2 min-w-0 flex-1"
          onClick={onOpenSearch}
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px]">Search</span>
        </Button>

        {/* More — contains Trash so it is never inaccessible on mobile */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex-col gap-0.5 h-auto py-2 min-w-0 flex-1"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px]">More</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-40 p-1"
            sideOffset={8}
          >
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
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
