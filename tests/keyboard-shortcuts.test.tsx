// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import { ShortcutHints, useKeyboardShortcuts } from "../components/KeyboardShortcuts";
import { modifierLabel, optionLabel, useKeyboardPlatform } from "../lib/use-keyboard-platform";
import { useQuickSwitcherShortcut } from "../lib/use-quick-switcher-shortcut";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

it.each([
  ["MacIntel", "⌘", "Option"],
  ["Win32", "Ctrl", "Alt"],
  ["Linux x86_64", "Ctrl", "Alt"],
])("displays keyboard labels appropriate for %s", async (platform, modifier, option) => {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
  const container = document.createElement("div");
  const root = createRoot(container);
  function Labels() {
    const detected = useKeyboardPlatform();
    return <><span>{modifierLabel(detected)}+K</span><span>{optionLabel(detected)}+Shift+N</span><ShortcutHints /></>;
  }
  try {
    await act(async () => root.render(<Labels />));
    expect(container.textContent).toContain(`${modifier}+K`);
    expect(container.textContent).toContain(`${option}+Shift+N`);
    expect(container.textContent).not.toContain("Save");
  } finally { await act(async () => root.unmount()); }
});

it("runs the listed note shortcuts without blocking browser commands or editing", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const create = vi.fn(), pin = vi.fn(), next = vi.fn(), previous = vi.fn();
  const setSearch = vi.fn();
  function Shortcuts() {
    useKeyboardShortcuts({ onNewNote: create, onTogglePin: pin, onNextNote: next, onPrevNote: previous });
    useQuickSwitcherShortcut(setSearch);
    return <input aria-label="Editor" />;
  }
  function key(target: EventTarget, init: KeyboardEventInit) {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  }
  try {
    await act(async () => root.render(<Shortcuts />));
    for (const letter of ["n", "p", "s", "f"]) {
      expect(key(document, { key: letter, code: `Key${letter.toUpperCase()}`, ctrlKey: true }).defaultPrevented).toBe(false);
    }
    expect(key(document, { key: "k", code: "KeyK", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(setSearch).toHaveBeenCalledOnce();
    key(document, { key: "N", code: "KeyN", altKey: true, shiftKey: true });
    key(document, { key: "P", code: "KeyP", altKey: true, shiftKey: true });
    key(document, { key: "ArrowDown", code: "ArrowDown", altKey: true, shiftKey: true });
    key(document, { key: "ArrowUp", code: "ArrowUp", altKey: true, shiftKey: true });
    expect(create).toHaveBeenCalledOnce();
    expect(pin).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
    expect(previous).toHaveBeenCalledOnce();
    const input = container.querySelector("input")!;
    expect(key(input, { key: "ArrowUp", code: "ArrowUp", altKey: true, shiftKey: true }).defaultPrevented).toBe(false);
    expect(previous).toHaveBeenCalledOnce();
    key(input, { key: "N", code: "KeyN", altKey: true, shiftKey: true });
    expect(create).toHaveBeenCalledTimes(2);
  } finally { await act(async () => root.unmount()); container.remove(); }
});
