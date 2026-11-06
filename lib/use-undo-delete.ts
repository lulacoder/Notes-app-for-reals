"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/ui/toast-notification";

export function useUndoDelete() {
  const restoreNote = useMutation(api.notes.restoreNote);
  const restoreCanvas = useMutation(api.canvases.restoreCanvas);
  const { toast, error, success } = useToast();

  function notifyDeleted(kind: "note", id: Id<"notes">): void;
  function notifyDeleted(kind: "canvas", id: Id<"canvases">): void;
  function notifyDeleted(kind: "note" | "canvas", id: Id<"notes"> | Id<"canvases">) {
    const label = kind === "note" ? "Note" : "Canvas";
    toast({
      type: "success",
      title: `${label} moved to recently deleted`,
      action: {
        label: "Undo",
        onClick: () => {
          void (async () => {
            try {
              if (kind === "note") await restoreNote({ id: id as Id<"notes"> });
              else await restoreCanvas({ id: id as Id<"canvases"> });
              success(`${label} restored`);
            } catch (cause) {
              console.error(`Failed to restore ${kind}:`, cause);
              error(`Could not restore ${kind}`, "Try restoring it from Recently deleted.");
            }
          })();
        },
      },
    });
  }

  return notifyDeleted;
}
