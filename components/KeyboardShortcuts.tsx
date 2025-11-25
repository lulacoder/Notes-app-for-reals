"use client";

import { useEffect, useCallback } from "react";

interface KeyboardShortcutsProps {
  onNewNote: () => void;
  onDeleteNote?: () => void;
  onTogglePin?: () => void;
  onQuickSwitcher?: () => void;
  onSearch?: () => void;
  onNextNote?: () => void;
  onPrevNote?: () => void;
  onSave?: () => void;
}

export function useKeyboardShortcuts({
  onNewNote,
  onDeleteNote,
  onTogglePin,
  onQuickSwitcher,
  onSearch,
  onNextNote,
  onPrevNote,
  onSave,
}: KeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Cmd/Ctrl + N: New note (always works)
      if (modifier && e.key === "n") {
        e.preventDefault();
        onNewNote();
        return;
      }

      // Cmd/Ctrl + K: Quick search (always works)
      if (modifier && e.key === "k") {
        e.preventDefault();
        onQuickSwitcher?.();
        return;
      }

      // Skip other shortcuts if in input
      if (isInput) return;

      // Cmd/Ctrl + S: Save
      if (modifier && e.key === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Cmd/Ctrl + P: Toggle pin
      if (modifier && e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        onTogglePin?.();
        return;
      }

      // Cmd/Ctrl + F: Focus search
      if (modifier && e.key === "f") {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Cmd/Ctrl + Backspace or Delete: Delete note
      if (modifier && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        onDeleteNote?.();
        return;
      }

      // Cmd/Ctrl + J or Down: Next note
      if (modifier && (e.key === "j" || e.key === "ArrowDown")) {
        e.preventDefault();
        onNextNote?.();
        return;
      }

      // Cmd/Ctrl + K or Up: Prev note (if not searching)
      if (modifier && (e.key === "ArrowUp")) {
        e.preventDefault();
        onPrevNote?.();
        return;
      }

      // Escape: Blur active element
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }
    },
    [onNewNote, onDeleteNote, onTogglePin, onQuickSwitcher, onSearch, onNextNote, onPrevNote, onSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Keyboard shortcut hints component
export function ShortcutHints() {
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const mod = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    { keys: `${mod}+N`, action: "New note" },
    { keys: `${mod}+K`, action: "Quick search" },
    { keys: `${mod}+S`, action: "Save" },
    { keys: `${mod}+P`, action: "Toggle pin" },
    { keys: `${mod}+F`, action: "Search" },
    { keys: `${mod}+⌫`, action: "Delete" },
    { keys: `${mod}+↓`, action: "Next note" },
    { keys: `${mod}+↑`, action: "Previous note" },
    { keys: "Esc", action: "Close/blur" },
  ];

  return (
    <div className="p-4 space-y-2">
      <h3 className="font-semibold text-sm mb-3">Keyboard Shortcuts</h3>
      {shortcuts.map((shortcut) => (
        <div key={shortcut.keys} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{shortcut.action}</span>
          <kbd className="px-2 py-0.5 text-xs bg-muted rounded border">{shortcut.keys}</kbd>
        </div>
      ))}
    </div>
  );
}
