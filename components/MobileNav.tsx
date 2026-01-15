"use client";

import { useState, useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, Search, Layers } from "lucide-react";

interface MobileNavProps {
  onToggleSidebar: () => void;
  onNewNote: () => void;
  onOpenTrash: () => void;
  onOpenSearch?: () => void;
  onOpenCanvas?: () => void;
}

export function MobileNav({
  onToggleSidebar,
  onNewNote,
  onOpenTrash,
  onOpenSearch,
  onOpenCanvas,
}: MobileNavProps) {
  const { isAuthenticated } = useConvexAuth();

  if (!isAuthenticated) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t mobile-nav z-50">
      <div className="flex items-center justify-around py-2 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={onToggleSidebar}
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Notes</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={onOpenCanvas}
        >
          <Layers className="h-5 w-5" />
          <span className="text-xs">Canvas</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2 rounded-full w-14"
          onClick={onNewNote}
        >
          <Plus className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={onOpenSearch}
        >
          <Search className="h-5 w-5" />
          <span className="text-xs">Search</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={onOpenTrash}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs">Trash</span>
        </Button>
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
