"use client";

import { useSyncExternalStore } from "react";

export type KeyboardPlatform = "mac" | "other" | "unknown";

function subscribe() {
  return () => {};
}

function getPlatform(): KeyboardPlatform {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
    ? "mac"
    : "other";
}

export function useKeyboardPlatform(): KeyboardPlatform {
  return useSyncExternalStore(subscribe, getPlatform, () => "unknown");
}

export function modifierLabel(platform: KeyboardPlatform) {
  return platform === "mac" ? "⌘" : platform === "other" ? "Ctrl" : "Ctrl / ⌘";
}

export function optionLabel(platform: KeyboardPlatform) {
  return platform === "mac" ? "Option" : platform === "other" ? "Alt" : "Alt / Option";
}
