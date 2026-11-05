"use client";

import { useCallback, useEffect } from "react";

import { modifierLabel, optionLabel, useKeyboardPlatform } from "@/lib/use-keyboard-platform";

interface KeyboardShortcutsProps {
  onNewNote: () => void;
  onTogglePin?: () => void;
  onNextNote?: () => void;
  onPrevNote?: () => void;
}

export function useKeyboardShortcuts({
  onNewNote,
  onTogglePin,
  onNextNote,
  onPrevNote,
}: KeyboardShortcutsProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const target = event.target;
    const isInput = target instanceof HTMLElement &&
      (target.isContentEditable || !!target.closest('input, textarea, select, [contenteditable="true"]'));

    if (event.code === "KeyN") {
      event.preventDefault();
      onNewNote();
      return;
    }
    if (isInput) return;

    const action = event.code === "KeyP" ? onTogglePin
      : event.code === "ArrowDown" ? onNextNote
        : event.code === "ArrowUp" ? onPrevNote
          : undefined;
    if (action) {
      event.preventDefault();
      action();
    }
  }, [onNewNote, onTogglePin, onNextNote, onPrevNote]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function ShortcutHints() {
  const platform = useKeyboardPlatform();
  const mod = modifierLabel(platform);
  const option = optionLabel(platform);
  const shortcuts = [
    { keys: `${mod}+K`, action: "Quick search" },
    { keys: `${option}+Shift+N`, action: "New note" },
    { keys: `${option}+Shift+P`, action: "Toggle selected note pin" },
    { keys: `${option}+Shift+↓`, action: "Next note" },
    { keys: `${option}+Shift+↑`, action: "Previous note" },
    { keys: "Esc", action: "Close dialogs" },
  ];

  return (
    <div className="space-y-2 p-4">
      <h3 className="mb-3 text-sm font-semibold">Keyboard Shortcuts</h3>
      {shortcuts.map((shortcut) => (
        <div key={shortcut.keys} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{shortcut.action}</span>
          <kbd className="whitespace-nowrap rounded border bg-muted px-2 py-0.5 text-xs">{shortcut.keys}</kbd>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">Pin and navigation shortcuts work in notes, outside text fields.</p>
    </div>
  );
}
