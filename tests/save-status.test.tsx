// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SaveStatus } from "../components/SaveStatus";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
});

describe("quiet save status", () => {
  it("stays quiet for pending and quick saves, and reports a slow save", async () => {
    const retry = vi.fn();
    await act(async () => root.render(<SaveStatus status="pending" retry={retry} quiet />));
    expect(container.textContent).toBe("");
    await act(async () => root.render(<SaveStatus status="saving" retry={retry} quiet />));
    await act(async () => vi.advanceTimersByTime(2999));
    expect(container.textContent).toBe("");
    await act(async () => vi.advanceTimersByTime(1));
    expect(container.textContent).toBe("Saving...");
    await act(async () => root.render(<SaveStatus status="saved" retry={retry} quiet />));
    expect(container.textContent).toBe("Saved");
  });

  it("shows failures immediately and allows retry", async () => {
    const retry = vi.fn();
    await act(async () => root.render(<SaveStatus status="saving" retry={retry} quiet />));
    await act(async () => root.render(<SaveStatus status="error" retry={retry} quiet />));
    expect(container.textContent).toContain("Couldn't save. Retry");
    await act(async () => container.querySelector("button")?.click());
    expect(retry).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(container.textContent).not.toContain("Saving...");
  });
});
