"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SAVE_DELAY = 2000;
const MAX_SAVE_DELAY = 10000;
export type SaveState = "saved" | "pending" | "saving" | "error";

// Serialize writes, retain a failed snapshot, and flush the document being left.
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  enabled = true,
) {
  const [status, setStatus] = useState<SaveState>("saved");
  const pendingRef = useRef<{
    value: T;
    save: (value: T) => Promise<void>;
    revision: number;
    generation: number;
  } | null>(null);
  const revision = useRef(0);
  const generation = useRef(0);
  const mounted = useRef(false);
  const queue = useRef(Promise.resolve());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
    if (maxTimerRef.current !== null) clearTimeout(maxTimerRef.current);
    idleTimerRef.current = null;
    maxTimerRef.current = null;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    if (mounted.current) setStatus("saving");
    queue.current = queue.current.then(async () => {
      if (pending.generation !== generation.current) return;
      try {
        await pending.save(pending.value);
        if (
          mounted.current &&
          pending.generation === generation.current &&
          revision.current === pending.revision
        )
          setStatus("saved");
      } catch (error: unknown) {
        // Never replace an edit made while this request was in flight.
        if (
          pending.generation === generation.current &&
          revision.current === pending.revision
        ) {
          pendingRef.current = pending;
          if (mounted.current) setStatus("error");
        }
        console.error("Failed to autosave document:", error);
      }
    });
  }, []);

  // Skip queued drafts and let an already submitted request settle before a replacement write.
  const discardPending = useCallback(() => {
    generation.current++;
    revision.current++;
    pendingRef.current = null;
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
    if (maxTimerRef.current !== null) clearTimeout(maxTimerRef.current);
    idleTimerRef.current = null;
    maxTimerRef.current = null;
    return queue.current;
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
      if (maxTimerRef.current !== null) clearTimeout(maxTimerRef.current);
      idleTimerRef.current = null;
      maxTimerRef.current = null;
      return;
    }
    const current = ++revision.current;
    pendingRef.current = {
      value,
      save,
      revision: current,
      generation: generation.current,
    };
    queueMicrotask(() => {
      if (mounted.current && revision.current === current) setStatus("pending");
    });
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(flush, SAVE_DELAY);
    if (maxTimerRef.current === null)
      maxTimerRef.current = setTimeout(flush, MAX_SAVE_DELAY);
  }, [value, save, enabled, flush]);

  useEffect(() => {
    mounted.current = true;
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", flush);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", flush);
      flush();
    };
  }, [flush]);

  return { status, retry: flush, flush, discardPending };
}
