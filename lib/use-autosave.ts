"use client";

import { useCallback, useEffect, useRef } from "react";

const SAVE_DELAY = 2000;
const MAX_SAVE_DELAY = 10000;

// Each editor keeps one pending snapshot. Convex orders submitted mutations.
export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, enabled = true) {
  const pendingRef = useRef<{ value: T; save: (value: T) => Promise<void> } | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
    if (maxTimerRef.current !== null) clearTimeout(maxTimerRef.current);
    idleTimerRef.current = null;
    maxTimerRef.current = null;

    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      void pending.save(pending.value).catch((error: unknown) => {
        console.error("Failed to autosave document:", error);
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    pendingRef.current = { value, save };
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(flush, SAVE_DELAY);
    // Keep the first deadline while edits reset the idle timer.
    if (maxTimerRef.current === null) {
      maxTimerRef.current = setTimeout(flush, MAX_SAVE_DELAY);
    }
  }, [value, save, enabled, flush]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);
}
