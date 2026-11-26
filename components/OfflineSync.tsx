"use client";

import { useEffect, useState } from "react";
import { useConvex, useConvexAuth, useConvexConnectionState } from "convex/react";
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

  const conflict = conflicts[0];
  async function resolve(keepLocal: boolean) {
    if (!conflict || offlineOwner() !== owner) return;
    try {
      await resolveRecoveredDraft(conflict.draft, keepLocal ? conflict.remote : null);
      setConflicts((items) => items.slice(1));
      setAttempt((n) => n + 1);
    } catch {
      setFailed(true);
    }
  }
  if (conflict)
    return (
      <section role="alert" className="border-b bg-background p-3 text-sm">
        <strong>{conflict.draft.text.title || "Untitled"}</strong>
        <p>
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
        {conflict.remote && (
          <Button size="sm" onClick={() => void resolve(true)}>
            Keep offline version
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => void resolve(false)}>
          {conflict.remote ? "Use synced version" : "Discard recovered draft"}
        </Button>
      </section>
    );
  if (!isWebSocketConnected && typeof navigator !== "undefined" && !navigator.onLine)
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
