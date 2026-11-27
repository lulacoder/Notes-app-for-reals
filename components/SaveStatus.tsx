"use client";

import { Check, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import type { SaveState } from "@/lib/use-autosave";

const SLOW_SAVE_DELAY = 3000;

export function SaveStatus({
  status,
  retry,
  quiet = false,
  savedLabel = "Saved",
}: {
  status: SaveState;
  retry: () => void;
  quiet?: boolean;
  savedLabel?: string;
}) {
  const slowSave = useSlowSave(quiet && status === "saving");

  if (status === "error")
    return (
      <button
        type="button"
        onClick={retry}
        className="inline-flex items-center gap-1.5 text-xs text-destructive"
        aria-label="Could not save. Retry saving"
      >
        <RotateCcw size={13} /> Couldn&apos;t save. Retry
      </button>
    );
  if (quiet && !slowSave) {
    // Keep one element mounted and fade it, so typing never makes the label blink or shift the toolbar.
    const saved = status === "saved";
    return (
      <span
        role={saved ? "status" : undefined}
        aria-hidden={saved ? undefined : true}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}
      >
        <Check size={13} />
        {savedLabel}
      </span>
    );
  }
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"
    >
      {status === "saved" ? (
        <Check size={13} />
      ) : (
        <Loader2
          size={13}
          className="animate-spin motion-reduce:animate-none"
        />
      )}
      {status === "saved"
        ? savedLabel
        : status === "saving"
          ? "Saving..."
          : "Unsaved changes"}
    </span>
  );
}

// True once a save has been running for SLOW_SAVE_DELAY, so quick saves stay silent.
function useSlowSave(saving: boolean) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => setSlow(true), SLOW_SAVE_DELAY);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [saving]);

  return saving && slow;
}
