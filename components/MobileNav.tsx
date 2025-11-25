"use client";

import { useState, useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, Search, Settings } from "lucide-react";

interface MobileNavProps {
  onToggleSidebar: () => void;
  onNewNote: () => void;
  onOpenTrash: () => void;
  onOpenSearch?: () => void;
}

export function MobileNav({
  onToggleSidebar,
  onNewNote,
  onOpenTrash,
  onOpenSearch,
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
          onClick={onOpenSearch}
        >
          <Search className="h-5 w-5" />
          <span className="text-xs">Search</span>
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
          onClick={onOpenTrash}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs">Trash</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={() => {}}
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs">More</span>
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
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

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
