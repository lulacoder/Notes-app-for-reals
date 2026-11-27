"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useConvex, useConvexAuth, useConvexConnectionState } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveRecoveredDraft, offlineOwner, setOfflineOwner } from "@/lib/offline-notes";
import { syncOfflineNotes, type DraftConflict } from "@/lib/offline-sync";
import { stripHtmlToText } from "@/lib/html-utils";

export function OfflineSync({ owner }: { owner: string }) {
  const client = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const { isWebSocketConnected } = useConvexConnectionState();
  const [attempt, setAttempt] = useState(0);
  const [conflicts, setConflicts] = useState<DraftConflict[]>([]);
  const [failed, setFailed] = useState(false);
  const [conflictIndex, setConflictIndex] = useState(0);
  const browserOnline = useBrowserOnline();
  const stalled = useStalledConnection(isWebSocketConnected);

  useEffect(() => {
    setOfflineOwner(owner);
    function checkAccount() {
      if (offlineOwner() !== owner) window.location.reload();
    }
    window.addEventListener("storage", checkAccount);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const build = process.env.NEXT_PUBLIC_OFFLINE_BUILD ?? "local";
      void navigator.serviceWorker
        .register(`/sw.js?build=${encodeURIComponent(build)}`)
        .catch(console.error);
    }
    return () => window.removeEventListener("storage", checkAccount);
  }, [owner]);

  useEffect(() => {
    function retryReleased() {
      setAttempt((n) => n + 1);
    }
    window.addEventListener("noteworthy:draft-released", retryReleased);
    return () => window.removeEventListener("noteworthy:draft-released", retryReleased);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isWebSocketConnected || !window.indexedDB || offlineOwner() !== owner)
      return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    void syncOfflineNotes(client, owner)
      .then((result) => {
        if (cancelled) return;
        setConflicts(result.conflicts);
        setFailed(result.failed);
        if (result.failed || result.busy) timer = setTimeout(() => setAttempt((n) => n + 1), 15000);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isAuthenticated, isWebSocketConnected, owner, client, attempt]);

  const current = Math.min(conflictIndex, conflicts.length - 1);
  const conflict = conflicts[current];
  async function resolve(keepLocal: boolean) {
    if (!conflict || offlineOwner() !== owner) return;
    try {
      await resolveRecoveredDraft(conflict.draft, keepLocal ? conflict.remote : null);
      setConflicts((items) => items.filter((item) => item !== conflict));
      setAttempt((n) => n + 1);
    } catch {
      setFailed(true);
    }
  }
  if (conflict)
    return (
      <section role="alert" className="border-b bg-background p-3 text-sm">
        <div className="flex items-center gap-2">
          <strong className="min-w-0 flex-1 truncate">{conflict.draft.text.title || "Untitled"}</strong>
          {conflicts.length > 1 && (
            <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <span aria-live="polite">
                {current + 1} of {conflicts.length}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Previous note to review"
                disabled={current === 0}
                onClick={() => setConflictIndex(current - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Next note to review"
                disabled={current === conflicts.length - 1}
                onClick={() => setConflictIndex(current + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-muted-foreground">
          {conflict.remote
            ? "This note also changed on another device."
            : "This note is no longer available. You can copy your offline writing here."}
        </p>
        <details>
          <summary>Review offline writing</summary>
          <p className="max-h-48 overflow-auto whitespace-pre-wrap">
            {stripHtmlToText(conflict.draft.text.content)}
          </p>
        </details>
        {conflict.remote && (
          <details>
            <summary>Review synced writing</summary>
            <strong>{conflict.remote.title}</strong>
            <p className="max-h-48 overflow-auto whitespace-pre-wrap">
              {stripHtmlToText(conflict.remote.content)}
            </p>
          </details>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {conflict.remote && (
            <Button size="sm" onClick={() => void resolve(true)}>
              Keep offline version
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => void resolve(false)}>
            {conflict.remote ? "Use synced version" : "Discard recovered draft"}
          </Button>
        </div>
      </section>
    );
  // Show right away when the browser reports offline, or once the sync connection has been down a while
  // (the browser can claim to be online on Wi-Fi with no internet).
  if (!browserOnline || (!isWebSocketConnected && stalled))
    return (
      <a className="block bg-muted p-2 text-center text-sm underline" href="/offline">
        Open offline notes
      </a>
    );
  if (failed)
    return (
      <button className="p-2 text-sm" onClick={() => setAttempt((n) => n + 1)}>
        Offline sync failed. Retry
      </button>
    );
  return null;
}

const STALLED_CONNECTION_DELAY = 5000;

function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// Re-renders as soon as the browser goes offline or comes back.
function useBrowserOnline() {
  return useSyncExternalStore(subscribeToNetwork, () => navigator.onLine, () => true);
}

// True once the sync connection has stayed down for STALLED_CONNECTION_DELAY.
function useStalledConnection(connected: boolean) {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (connected) return;
    const timer = setTimeout(() => setStalled(true), STALLED_CONNECTION_DELAY);
    return () => {
      clearTimeout(timer);
      setStalled(false);
    };
  }, [connected]);
  return !connected && stalled;
}
