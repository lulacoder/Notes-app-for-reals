"use client";

import { Check, Loader2, RotateCcw } from "lucide-react";

import type { SaveState } from "@/lib/use-autosave";

export function SaveStatus({
  status,
  retry,
}: {
  status: SaveState;
  retry: () => void;
}) {
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
        ? "Saved"
        : status === "saving"
          ? "Saving..."
          : "Unsaved changes"}
    </span>
  );
}
