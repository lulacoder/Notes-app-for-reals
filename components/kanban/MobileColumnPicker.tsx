"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Column = {
  _id: Id<"kanbanColumns">;
  title: string;
};

interface MobileColumnPickerProps {
  open: boolean;
  onClose: () => void;
  columns: Column[];
  currentColumnId: Id<"kanbanColumns">;
  cardId: Id<"kanbanCards">;
  // cardOrder intentionally omitted: order is computed server-side by moveCardToColumnEnd
}

export function MobileColumnPicker({
  open,
  onClose,
  columns,
  currentColumnId,
  cardId,
}: MobileColumnPickerProps) {
  const moveCardToColumnEnd = useMutation(api.kanban.moveCardToColumnEnd);

  const handleMove = async (columnId: Id<"kanbanColumns">) => {
    if (columnId === currentColumnId) {
      onClose();
      return;
    }
    // Server computes correct end-of-column order; no need to pass a stale source order.
    await moveCardToColumnEnd({ id: cardId, columnId });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl border-t shadow-2xl pb-safe"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pb-2">
              <h3 className="text-sm font-semibold text-center mb-4">
                Move to column
              </h3>

              <div className="space-y-1">
                {columns.map((col) => (
                  <button
                    key={col._id}
                    onClick={() => handleMove(col._id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      col._id === currentColumnId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {col.title}
                    {col._id === currentColumnId && (
                      <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Cancel button */}
            <div className="px-4 pt-2 pb-6 border-t mt-2">
              <button
                onClick={onClose}
                className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
