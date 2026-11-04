"use client";

import { Check, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import type { SaveState } from "@/lib/use-autosave";

export function SaveStatus({
  status,
  retry,
  quiet = false,
}: {
  status: SaveState;
  retry: () => void;
  quiet?: boolean;
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
  if (quiet && status === "pending") return null;
  if (quiet && status === "saving") return <DelayedSaving />;
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

function DelayedSaving() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <span role="status" className="whitespace-nowrap text-xs text-muted-foreground">
      Saving...
    </span>
  );
}
