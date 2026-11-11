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
  hidden?: boolean;
  onToggleSidebar: () => void;
  onNewNote: () => void;
  onOpenTrash: () => void;
  onOpenSearch?: () => void;
  onOpenCanvas?: () => void;
  onOpenBoards?: () => void;
}

export function MobileNav({
  hidden = false,
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
      className={`${hidden ? "hidden" : ""} md:hidden fixed bottom-4 left-4 right-4 z-50 pointer-events-none`}
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
          <span className="text-[10px] font-medium tracking-tight">Browse</span>
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
            className="w-56 p-1 rounded-xl shadow-xl border border-border/60 bg-card/95 backdrop-blur-md"
            sideOffset={12}
          >
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 text-xs h-9 font-medium"
              onClick={onOpenSearch}
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              Search notes and canvases
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


// Track the drawer directly during touch movement to keep the gesture responsive.
interface SwipeGestureOptions {
  isOpen: boolean;
  enabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let gesture: { x: number; y: number; lastX: number; startTime: number; width: number; open: boolean; dragging: boolean; editable: boolean } | null = null;
    let resetFrame = 0;

    function resetVisuals() {
      container!.removeAttribute("data-sidebar-dragging");
      container!.style.removeProperty("--sidebar-drag-x");
      container!.style.removeProperty("--sidebar-drag-opacity");
    }

    function handleTouchStart(event: TouchEvent) {
      const { isOpen, enabled = true } = optionsRef.current;
      if (event.touches.length !== 1) {
        finish(true);
        return;
      }
      if (!enabled || window.innerWidth >= 768) return;
      const touch = event.touches[0];
      // Leave form controls and horizontally scrollable content to their native gestures.
      const target = event.target instanceof Element ? event.target : null;
      if (!isOpen && (touch.clientX > Math.min(120, window.innerWidth * 0.3) ||
        target?.closest('input, textarea, select, button, a'))) return;
      const editable = !!target?.closest('[contenteditable]:not([contenteditable="false"]), [role="textbox"]');
      const selection = window.getSelection();
      if (!isOpen && editable && selection && !selection.isCollapsed) return;
      for (let element = target; element && element !== container; element = element.parentElement) {
        const overflow = window.getComputedStyle(element).overflowX;
        if (!isOpen && /(auto|scroll)/.test(overflow) && element.scrollWidth > element.clientWidth) return;
      }
      const drawer = container!.querySelector<HTMLElement>("[data-mobile-sidebar]");
      if (!drawer) return;
      cancelAnimationFrame(resetFrame);
      resetVisuals();
      gesture = { x: touch.clientX, y: touch.clientY, lastX: touch.clientX, startTime: Date.now(), width: drawer.offsetWidth, open: isOpen, dragging: false, editable };
    }

    function handleTouchMove(event: TouchEvent) {
      if (!gesture || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if ((gesture.editable && Date.now() - gesture.startTime > 250) ||
          Math.abs(dy) >= Math.abs(dx) || (gesture.open ? dx >= 0 : dx <= 0)) {
          gesture = null;
          return;
        }
        gesture.dragging = true;
        container!.setAttribute("data-sidebar-dragging", "");
      }
      if (event.cancelable) event.preventDefault();
      gesture.lastX = touch.clientX;
      const x = Math.max(-gesture.width, Math.min(0, (gesture.open ? 0 : -gesture.width) + dx));
      container!.style.setProperty("--sidebar-drag-x", `${x}px`);
      container!.style.setProperty("--sidebar-drag-opacity", String(gesture.width ? (gesture.width + x) / gesture.width : 0));
    }

    function finish(cancelled = false) {
      if (!gesture) return;
      const { x, lastX, startTime, open, dragging } = gesture;
      gesture = null;
      if (!dragging) return;
      const distance = lastX - x;
      const fastSwipe = Math.abs(distance) >= 15 && Math.abs(distance) / Math.max(1, Date.now() - startTime) > 0.4;
      if (!cancelled && (Math.abs(distance) >= 40 || fastSwipe)) {
        if (open && distance < 0) optionsRef.current.onSwipeLeft?.();
        if (!open && distance > 0) optionsRef.current.onSwipeRight?.();
      }
      // Let React commit the final open state before the drawer settles into place.
      resetFrame = requestAnimationFrame(resetVisuals);
    }

    const handleTouchEnd = () => finish();
    const handleTouchCancel = () => finish(true);
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchCancel);
    return () => {
      cancelAnimationFrame(resetFrame);
      resetVisuals();
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, []);

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
