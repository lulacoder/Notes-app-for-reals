"use client";

import { useSyncExternalStore } from "react";

type ViewMode = "list" | "grid";
const STORAGE_KEY = "notes-view-mode";
const CHANGE_EVENT = "notes-view-mode-change";
let fallbackMode: ViewMode = "list";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): ViewMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "grid" ? "grid" : value === "list" ? "list" : fallbackMode;
  } catch {
    return fallbackMode;
  }
}

function getServerSnapshot(): ViewMode {
  return "list";
}

function setViewMode(mode: ViewMode) {
  fallbackMode = mode;
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* The preference still works when storage is blocked. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useNotesViewMode() {
  return [useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot), setViewMode] as const;
}
